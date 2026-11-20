"""Shared httpx client factory for calls to DUT AI Manage.

The client is app-scoped and shared by every request. It must never store
cookies, otherwise a `Set-Cookie` from one user's Manage login would be replayed
on later service calls (Manage reads the cookie before the Bearer header).
"""

from http.cookiejar import CookieJar, DefaultCookiePolicy

import httpx

POOL_LIMITS = httpx.Limits(
    max_keepalive_connections=20,
    max_connections=100,
    keepalive_expiry=30.0,
)


def cookieless_jar() -> CookieJar:
    """Return a cookie jar that refuses every cookie."""
    return CookieJar(policy=DefaultCookiePolicy(allowed_domains=[]))


def build_manage_http_client(timeout: float = 10.0) -> httpx.AsyncClient:
    return httpx.AsyncClient(
        limits=POOL_LIMITS,
        timeout=timeout,
        cookies=cookieless_jar(),
    )
