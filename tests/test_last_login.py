from datetime import UTC, datetime
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from modules.identity.client.auth_client import AuthClient
from modules.identity.domain.entities import (
    AuthUser,
    TokenResponse,
    UserLoginMetadataEntity,
)
from modules.identity.domain.interfaces import IUserLoginRepository
from modules.identity.dtos.auth_dtos import LoginRequestDTO
from modules.identity.models.user_login import UserLoginMetadataModel
from modules.identity.use_cases.login import LoginUseCase


class InMemoryUserLoginRepository(IUserLoginRepository):
    """In-memory mock repository for isolated Use Case testing."""

    def __init__(self):
        self.records: dict[str, UserLoginMetadataEntity] = {}

    async def upsert_last_login(
        self, user_id: str, last_login_at: datetime
    ) -> UserLoginMetadataEntity:
        now = datetime.now(UTC)
        existing = self.records.get(user_id)
        created_at = existing.created_at if existing else now
        entity = UserLoginMetadataEntity(
            user_id=user_id,
            last_login_at=last_login_at,
            created_at=created_at,
            updated_at=now,
        )
        self.records[user_id] = entity
        return entity

    async def get_by_user_id(self, user_id: str) -> UserLoginMetadataEntity | None:
        return self.records.get(user_id)

    async def get_by_user_ids(self, user_ids: list[str]) -> dict[str, datetime]:
        return {
            uid: rec.last_login_at
            for uid, rec in self.records.items()
            if uid in user_ids
        }


@pytest.mark.asyncio
async def test_first_login_creates_last_login_record():
    """Test 1: First login creates a new record in user_login_metadata."""
    auth_client = AsyncMock(spec=AuthClient)
    auth_client.login.return_value = TokenResponse(
        access_token="acc_tok_1",
        refresh_token="ref_tok_1",
        token_type="bearer",
    )
    auth_client.get_me.return_value = AuthUser(
        id=101,
        name="Test User",
        email="test@dutai.io.vn",
        status="ACTIVE",
        role_names=["ADMIN"],
    )

    repo = InMemoryUserLoginRepository()
    use_case = LoginUseCase(auth_client=auth_client, login_repo=repo)

    res = await use_case.execute(
        LoginRequestDTO(email="test@dutai.io.vn", password="pass")
    )

    assert res.access_token == "acc_tok_1"
    auth_client.login.assert_awaited_once_with(
        email="test@dutai.io.vn", password="pass"
    )
    auth_client.get_me.assert_awaited_once_with("acc_tok_1")

    record = await repo.get_by_user_id("101")
    assert record is not None
    assert record.user_id == "101"
    assert record.last_login_at is not None
    assert record.last_login_at.tzinfo is not None


@pytest.mark.asyncio
async def test_second_login_updates_existing_record():
    """Test 2: Second login updates last_login_at without creating duplicate rows."""
    auth_client = AsyncMock(spec=AuthClient)
    auth_client.login.return_value = TokenResponse(
        access_token="acc_tok_2",
        refresh_token="ref_tok_2",
        token_type="bearer",
    )
    auth_client.get_me.return_value = AuthUser(
        id=101,
        name="Test User",
        email="test@dutai.io.vn",
        status="ACTIVE",
        role_names=["ADMIN"],
    )

    repo = InMemoryUserLoginRepository()
    # Pre-seed existing record
    initial_time = datetime(2026, 1, 1, 12, 0, 0, tzinfo=UTC)
    await repo.upsert_last_login("101", initial_time)

    use_case = LoginUseCase(auth_client=auth_client, login_repo=repo)
    await use_case.execute(LoginRequestDTO(email="test@dutai.io.vn", password="pass"))

    record = await repo.get_by_user_id("101")
    assert record is not None
    assert len(repo.records) == 1
    assert record.last_login_at > initial_time


@pytest.mark.asyncio
async def test_failed_login_does_not_update_last_login():
    """Test 3: Failed login (401) does not touch last_login_metadata."""
    auth_client = AsyncMock(spec=AuthClient)
    auth_client.login.side_effect = HTTPException(
        status_code=401, detail="Email hoặc mật khẩu không chính xác."
    )

    repo = InMemoryUserLoginRepository()
    use_case = LoginUseCase(auth_client=auth_client, login_repo=repo)

    with pytest.raises(HTTPException) as exc_info:
        await use_case.execute(
            LoginRequestDTO(email="wrong@dutai.io.vn", password="wrong")
        )

    assert exc_info.value.status_code == 401
    assert len(repo.records) == 0
    auth_client.get_me.assert_not_called()


@pytest.mark.asyncio
async def test_db_failure_does_not_break_login():
    """Test 4: Best-effort strategy ensures DB failure logs warning but login succeeds."""
    auth_client = AsyncMock(spec=AuthClient)
    auth_client.login.return_value = TokenResponse(
        access_token="acc_tok_ok",
        refresh_token="ref_tok_ok",
        token_type="bearer",
    )
    auth_client.get_me.return_value = AuthUser(
        id=202,
        name="User DB Error",
        email="dberr@dutai.io.vn",
        status="ACTIVE",
    )

    failing_repo = AsyncMock(spec=IUserLoginRepository)
    failing_repo.upsert_last_login.side_effect = RuntimeError(
        "PostgreSQL connection lost"
    )

    use_case = LoginUseCase(auth_client=auth_client, login_repo=failing_repo)
    res = await use_case.execute(
        LoginRequestDTO(email="dberr@dutai.io.vn", password="pass")
    )

    # Login must still succeed
    assert res.access_token == "acc_tok_ok"
    assert res.token_type == "bearer"


@pytest.mark.asyncio
async def test_repository_model_conversion_and_batch_query():
    """Test 5 & 6: ORM Model entity conversion and batch query mapping."""
    now = datetime.now(UTC)
    model = UserLoginMetadataModel(
        user_id="user_999",
        last_login_at=now,
        created_at=now,
        updated_at=now,
    )
    entity = model.to_entity()
    assert entity.user_id == "user_999"
    assert entity.last_login_at == now

    # Test batch query logic
    repo = InMemoryUserLoginRepository()
    t1 = datetime(2026, 8, 1, 10, 0, 0, tzinfo=UTC)
    t2 = datetime(2026, 8, 2, 10, 0, 0, tzinfo=UTC)
    await repo.upsert_last_login("user_a", t1)
    await repo.upsert_last_login("user_b", t2)

    batch_res = await repo.get_by_user_ids(["user_a", "user_b", "user_c"])
    assert batch_res == {"user_a": t1, "user_b": t2}
