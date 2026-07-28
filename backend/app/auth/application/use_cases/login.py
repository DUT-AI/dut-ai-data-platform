from shared.auth.client import AuthClient, TokenResponse

from app.auth.application.dtos import LoginRequestDTO


class LoginUseCase:
    def __init__(self, auth_client: AuthClient):
        self.auth_client = auth_client

    async def execute(self, dto: LoginRequestDTO) -> TokenResponse:
        return await self.auth_client.login(dto.email, dto.password)
