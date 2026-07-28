from datetime import datetime

from shared.utils.id_generator import generate_ulid
from sqlalchemy import DateTime, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """SQLAlchemy Declarative Base."""


class BaseModel(Base):
    """Abstract Base Model with primary key ULID and timestamps."""

    __abstract__ = True

    id: Mapped[str] = mapped_column(primary_key=True, default=generate_ulid)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
