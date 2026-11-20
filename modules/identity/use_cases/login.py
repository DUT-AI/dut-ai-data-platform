from datetime import UTC, datetime

from loguru import logger

from core.exceptions import UnauthorizedException
from core.security.jwt import REFRESH_TOKEN_TYPE, decode_access_token, decode_sso_token
from modules.identity.domain.interfaces import IAuthClient, IUserLoginRepository
from modules.identity.dtos.auth_dtos import LoginRequestDTO, SsoSessionDTO
from modules.identity.services.sso_claims import auth_user_from_claims


class LoginUseCase:
    """Local development login: proxy credentials to DUT AI Manage, keep Manage's own tokens."""

    def __init__(
        self, auth_client: IAuthClient, login_repo: IUserLoginRepository
    ) -> None:
        self.auth_client = auth_client
        self.login_repo = login_repo

    async def execute(self, data: LoginRequestDTO) -> SsoSessionDTO:
        tokens = await self.auth_client.login(email=data.email, password=data.password)
        try:
            access_claims = decode_access_token(tokens.access_token)
            refresh_claims = decode_sso_token(tokens.refresh_token, REFRESH_TOKEN_TYPE)
        except UnauthorizedException:
            logger.error(
                "DUT AI Manage accepted the credentials but its tokens failed local "
                "verification: JWT_SECRET_KEY / JWT_ALGORITHM do not match the Manage "
                "instance at AUTH_SERVER_URL."
            )
            raise

        user = auth_user_from_claims(access_claims)
        await self.login_repo.upsert_last_login(
            user_id=user.id, last_login_at=datetime.now(UTC)
        )
        return SsoSessionDTO(
            user=user,
            access_token=tokens.access_token,
            refresh_token=tokens.refresh_token,
            access_expires_at=int(access_claims["exp"]),
            refresh_expires_at=int(refresh_claims["exp"]),
        )
