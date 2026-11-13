from datetime import UTC, datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from core.database.base import Base


class WorkflowDefinitionModel(Base):
    __tablename__ = "workflow_definitions"

    id = Column(String(36), primary_key=True)
    project_id = Column(String(36), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    config = Column(JSONB, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC))
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    work_items = relationship("WorkItemModel", back_populates="workflow", cascade="all, delete-orphan")


class WorkItemModel(Base):
    __tablename__ = "work_items"

    id = Column(String(36), primary_key=True)
    workflow_id = Column(String(36), ForeignKey("workflow_definitions.id"), nullable=False, index=True)
    project_id = Column(String(36), nullable=False, index=True)
    resource_type = Column(String(64), nullable=False, index=True)
    resource_id = Column(String(255), nullable=False, index=True)
    status = Column(String(32), nullable=False, default="CREATED", index=True)
    priority = Column(String(16), nullable=False, default="MEDIUM")
    metadata_ = Column("metadata", JSONB, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC))
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    workflow = relationship("WorkflowDefinitionModel", back_populates="work_items")
    assignments = relationship("AssignmentModel", back_populates="work_item", cascade="all, delete-orphan")
    history = relationship("WorkflowHistoryModel", back_populates="work_item", cascade="all, delete-orphan")


class AssignmentModel(Base):
    __tablename__ = "workflow_assignments"

    id = Column(String(36), primary_key=True)
    work_item_id = Column(String(36), ForeignKey("work_items.id"), nullable=False, index=True)
    assignee_id = Column(Integer, nullable=False, index=True)
    assigned_by = Column(Integer, nullable=False)
    due_date = Column(DateTime(timezone=True), nullable=True)
    priority = Column(String(16), nullable=False, default="MEDIUM")
    is_active = Column(Boolean, nullable=False, default=True)
    assigned_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC))

    work_item = relationship("WorkItemModel", back_populates="assignments")


class WorkflowHistoryModel(Base):
    __tablename__ = "workflow_history"

    id = Column(String(36), primary_key=True)
    work_item_id = Column(String(36), ForeignKey("work_items.id"), nullable=False, index=True)
    from_state = Column(String(32), nullable=False)
    to_state = Column(String(32), nullable=False)
    changed_by = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)
    metadata_ = Column("metadata", JSONB, nullable=False, default=dict)
    changed_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC), index=True)

    work_item = relationship("WorkItemModel", back_populates="history")
