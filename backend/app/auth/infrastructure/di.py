from app.auth.application.use_cases import GetMeUseCase, LoginUseCase
from app.config import settings
from dishka import Provider, Scope, provide
from shared.auth.client import AuthClient


class AuthProvider(Provider):
    """Dishka DI Provider for Auth feature module."""

    scope = Scope.REQUEST

    @provide(scope=Scope.APP)
    def get_auth_client(self) -> AuthClient:
        return AuthClient(auth_server_url=settings.auth_server_url)

    login_uc = provide(LoginUseCase)
    get_me_uc = provide(GetMeUseCase)
