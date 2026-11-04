from collections.abc import AsyncIterable

import httpx
from dishka import Provider, Scope, provide
from sqlalchemy.ext.asyncio import AsyncSession

from modules.identity.client.auth_client import AuthClient
from modules.identity.client.manage_client import ManageClient
from modules.identity.domain.interfaces import IAuthClient, IUserLoginRepository
from modules.identity.repository.user_login_repository import SqlUserLoginRepository
from modules.identity.use_cases import GetMeUseCase, ListUsersUseCase, LoginUseCase


class IdentityProvider(Provider):
    """Dishka DI Provider for Identity & Auth feature module."""

    scope = Scope.REQUEST

    @provide(scope=Scope.APP)
    async def get_pooled_client(self) -> AsyncIterable[httpx.AsyncClient]:
        limits = httpx.Limits(
            max_keepalive_connections=20,
            max_connections=100,
            keepalive_expiry=30.0,
        )
        async with httpx.AsyncClient(limits=limits, timeout=10.0) as client:
            yield client

    @provide(scope=Scope.APP)
    def get_auth_client(self, client: httpx.AsyncClient) -> AuthClient:
        return AuthClient(client=client)

    @provide(scope=Scope.APP)
    def get_iauth_client(self, client: AuthClient) -> IAuthClient:
        return client

    @provide(scope=Scope.APP)
    def get_manage_client(self, client: httpx.AsyncClient) -> ManageClient:
        return ManageClient(client=client)

    @provide
    def get_user_login_repository(self, session: AsyncSession) -> IUserLoginRepository:
        return SqlUserLoginRepository(session)

    login_uc = provide(LoginUseCase)
    get_me_uc = provide(GetMeUseCase)
    list_users_uc = provide(ListUsersUseCase)
