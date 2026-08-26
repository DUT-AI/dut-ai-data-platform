from core.config.app import AppSettings
from core.config.database import DatabaseSettings
from core.config.redis import RedisSettings
from core.config.s3 import S3Settings

settings = AppSettings()
app_settings = settings
db_settings = DatabaseSettings()
redis_settings = RedisSettings()
s3_settings = S3Settings()

__all__ = [
    "AppSettings",
    "DatabaseSettings",
    "RedisSettings",
    "S3Settings",
    "app_settings",
    "db_settings",
    "redis_settings",
    "s3_settings",
    "settings",
]
