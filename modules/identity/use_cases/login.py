from datetime import UTC, datetime

from loguru import logger

from modules.identity.client.auth_client import AuthClient
from modules.identity.domain.interfaces import IUserLoginRepository
from modules.identity.dtos.auth_dtos import LoginRequestDTO, TokenResponseDTO


class LoginUseCase:
    """Authenticate user with external auth server and record last login timestamp."""

    def __init__(
        self,
        auth_client: AuthClient,
        login_repo: IUserLoginRepository,
    ) -> None:
        self.auth_client = auth_client
        self.login_repo = login_repo

    async def execute(self, data: LoginRequestDTO) -> TokenResponseDTO:
        # 1. Authenticate against External Auth Server
        token_res = await self.auth_client.login(
            email=data.email, password=data.password
        )

        # 2. Resolve User Identity and record last_login (Best-Effort)
        try:
            user = await self.auth_client.get_me(token_res.access_token)
            user_id = str(user.id)
            now = datetime.now(UTC)
            await self.login_repo.upsert_last_login(user_id=user_id, last_login_at=now)
            logger.info(f"Updated last_login_at for user_id={user_id}")
        except Exception as e:
            # Best-effort tracking: do not fail login if metadata logging fails
            logger.warning(
                f"Failed to record last_login_at for user after successful authentication: {e}"
            )

        return TokenResponseDTO(
            access_token=token_res.access_token,
            refresh_token=token_res.refresh_token,
            token_type=token_res.token_type,
        )
