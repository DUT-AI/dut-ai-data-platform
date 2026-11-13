from modules.identity.domain.entities import AuthUser
from modules.identity.domain.interfaces import IAuthClient


class GetMeUseCase:
    """Fetch current user profile via auth client."""

    def __init__(self, auth_client: IAuthClient) -> None:
        self.auth_client = auth_client

    async def execute(self, token: str) -> AuthUser:
        return await self.auth_client.get_me(token)
