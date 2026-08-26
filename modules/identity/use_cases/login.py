from modules.identity.client.auth_client import AuthClient
from modules.identity.dtos.auth_dtos import LoginRequestDTO, TokenResponseDTO


class LoginUseCase:
    """Authenticate user with external auth server."""

    def __init__(self, auth_client: AuthClient) -> None:
        self.auth_client = auth_client

    async def execute(self, data: LoginRequestDTO) -> TokenResponseDTO:
        res = await self.auth_client.login(email=data.email, password=data.password)
        return TokenResponseDTO(
            access_token=res.access_token,
            refresh_token=res.refresh_token,
            token_type=res.token_type,
        )
