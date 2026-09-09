from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parent.parent.parent


class RabbitMQSettings(BaseSettings):
    """RabbitMQ AMQP Message Broker Configuration."""

    model_config = SettingsConfigDict(
        env_file=(ROOT_DIR / ".env",),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    rabbitmq_url: str = "amqp://guest:guest@localhost:5672/"

    @property
    def url(self) -> str:
        return self.rabbitmq_url
