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
    # The worker's AMQP consumer only logs messages for now; turn it off when
    # no broker runs (e.g. local development) instead of retrying forever.
    rabbitmq_enabled: bool = True

    @property
    def safe_url(self) -> str:
        """URL without credentials, safe to log."""
        scheme, _, rest = self.rabbitmq_url.partition("://")
        return f"{scheme}://{rest.rpartition('@')[2]}"

    @property
    def url(self) -> str:
        return self.rabbitmq_url
