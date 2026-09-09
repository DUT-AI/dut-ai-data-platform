from core.config.app import AppSettings
from core.config.database import DatabaseSettings
from core.config.inference import InferenceSettings
from core.config.rabbitmq import RabbitMQSettings
from core.config.redis import RedisSettings
from core.config.s3 import S3Settings

settings = AppSettings()
app_settings = settings
db_settings = DatabaseSettings()
redis_settings = RedisSettings()
rabbitmq_settings = RabbitMQSettings()
inference_settings = InferenceSettings()
s3_settings = S3Settings()

__all__ = [
    "AppSettings",
    "DatabaseSettings",
    "InferenceSettings",
    "RabbitMQSettings",
    "RedisSettings",
    "S3Settings",
    "app_settings",
    "db_settings",
    "inference_settings",
    "rabbitmq_settings",
    "redis_settings",
    "s3_settings",
    "settings",
]
