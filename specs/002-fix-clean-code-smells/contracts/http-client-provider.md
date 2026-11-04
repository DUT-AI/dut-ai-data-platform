# HTTP Client Provider & Lifecycle Contract

## Connection Pooling Provider Contract (`modules/identity/di.py` / `core/di`)

```python
from collections.abc import AsyncIterable
import httpx
from dishka import Provider, Scope, provide

class HTTPClientProvider(Provider):
    """Provides a shared connection-pooled httpx.AsyncClient at Scope.APP."""

    @provide(scope=Scope.APP)
    async def get_pooled_client(self) -> AsyncIterable[httpx.AsyncClient]:
        limits = httpx.Limits(
            max_keepalive_connections=20,
            max_connections=100,
            keepalive_expiry=30.0,
        )
        async with httpx.AsyncClient(limits=limits, timeout=10.0) as client:
            yield client
```

## Client Constructor Contract

`AuthClient` and `ManageClient` must receive this pooled client via constructor injection:

```python
class AuthClient:
    def __init__(self, client: httpx.AsyncClient) -> None:
        self._client = client

    async def get_me(self, token: str) -> AuthUser:
        response = await self._client.get(auth_settings.me_url, headers={"Authorization": f"Bearer {token}"})
        ...
```
