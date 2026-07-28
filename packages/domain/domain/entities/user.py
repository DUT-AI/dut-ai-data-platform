from dataclasses import dataclass
from datetime import datetime


@dataclass
class UserEntity:
    email: str
    role: str
    password_hash: str
    id: int | None = None
    name: str | None = None
    avatar_url: str | None = None
    created_at: datetime | None = None
