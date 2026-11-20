from datetime import UTC, datetime, timedelta

from core.config.auth import auth_settings
from modules.identity.domain.interfaces import IUserLoginRepository
from modules.identity.dtos.auth_dtos import AuthUser


class GetMeUseCase:
    """Return the SSO user and record platform activity (throttled).

    Users sign in on the workspace, never on this platform, so the session
    bootstrap (/auth/me) is the first moment the platform sees them.
    """

    def __init__(self, login_repo: IUserLoginRepository) -> None:
        self.login_repo = login_repo

    async def execute(self, user: AuthUser) -> AuthUser:
        now = datetime.now(UTC)
        interval = timedelta(minutes=auth_settings.activity_record_interval_minutes)
        await self.login_repo.record_activity(
            user_id=user.id, seen_at=now, not_before=now - interval
        )
        return user
