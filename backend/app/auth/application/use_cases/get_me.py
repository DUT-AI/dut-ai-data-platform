from shared.auth.client import AuthClient, AuthUser


class GetMeUseCase:
    def __init__(self, auth_client: AuthClient):
        self.auth_client = auth_client

    async def execute(self, token: str) -> AuthUser:
        return await self.auth_client.get_me(token)
