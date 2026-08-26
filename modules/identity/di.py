from dishka import Provider, Scope, provide

from core.config import settings
from modules.identity.client.auth_client import AuthClient
from modules.identity.use_cases import GetMeUseCase, LoginUseCase


class IdentityProvider(Provider):
    """Dishka DI Provider for Identity & Auth feature module."""

    scope = Scope.REQUEST

    @provide(scope=Scope.APP)
    def get_auth_client(self) -> AuthClient:
        return AuthClient(auth_server_url=settings.auth_server_url)

    login_uc = provide(LoginUseCase)
    get_me_uc = provide(GetMeUseCase)
