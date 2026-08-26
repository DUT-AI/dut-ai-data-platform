from datetime import datetime
from typing import Optional, Self

from sqlalchemy import (
    DateTime,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database.base import Base, TimestampMixin, ULIDPrimaryKeyMixin
from modules.project.domain.entities import ProjectEntity, ProjectMemberEntity


class ProjectModel(Base, ULIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "projects"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    project_type: Mapped[str] = mapped_column(String(50), nullable=False)
    owner_id: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)

    members: Mapped[list["ProjectMemberModel"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
    configuration: Mapped[Optional["ProjectConfigurationModel"]] = relationship(
        back_populates="project", uselist=False, cascade="all, delete-orphan"
    )

    def to_entity(self) -> ProjectEntity:
        return ProjectEntity(
            id=self.id,
            name=self.name,
            description=self.description,
            project_type=self.project_type,
            owner_id=self.owner_id,
            status=self.status,
            created_at=self.created_at,
            updated_at=self.updated_at,
        )

    @classmethod
    def from_entity(cls, entity: ProjectEntity) -> Self:
        return cls(
            id=entity.id,
            name=entity.name,
            description=entity.description,
            project_type=entity.project_type,
            owner_id=entity.owner_id,
            status=entity.status,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )


class ProjectMemberModel(Base, ULIDPrimaryKeyMixin):
    __tablename__ = "project_members"
    __table_args__ = (
        UniqueConstraint("project_id", "user_id", name="uq_project_user"),
    )

    project_id: Mapped[str] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    project: Mapped["ProjectModel"] = relationship(back_populates="members")

    def to_entity(self) -> ProjectMemberEntity:
        return ProjectMemberEntity(
            id=self.id,
            project_id=self.project_id,
            user_id=self.user_id,
            role=self.role,
            status=self.status,
            joined_at=self.joined_at,
        )

    @classmethod
    def from_entity(cls, entity: ProjectMemberEntity) -> Self:
        return cls(
            id=entity.id,
            project_id=entity.project_id,
            user_id=entity.user_id,
            role=entity.role,
            status=entity.status,
            joined_at=entity.joined_at,
        )


class ProjectConfigurationModel(Base, ULIDPrimaryKeyMixin):
    __tablename__ = "project_configurations"

    project_id: Mapped[str] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    settings: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)

    project: Mapped["ProjectModel"] = relationship(back_populates="configuration")
