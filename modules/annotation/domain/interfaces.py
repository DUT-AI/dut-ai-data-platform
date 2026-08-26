from collections.abc import Sequence
from typing import Any, Protocol

from modules.annotation.domain.entities import (
    AnnotationEntity,
    AnnotationResultEntity,
    AnnotationRevisionEntity,
)
from modules.ontology.domain.entities import CategoryEntity


class IAnnotationRepository(Protocol):
    async def save_annotation(
        self, annotation: AnnotationEntity
    ) -> AnnotationEntity: ...

    async def get_annotation_by_id(
        self, annotation_id: str
    ) -> AnnotationEntity | None: ...

    async def get_annotation_by_asset_and_ontology(
        self, asset_id: str, ontology_version_id: str
    ) -> AnnotationEntity | None: ...

    async def list_annotations_by_asset(
        self, asset_id: str
    ) -> Sequence[AnnotationEntity]: ...

    async def create_revision(
        self, revision: AnnotationRevisionEntity
    ) -> AnnotationRevisionEntity: ...

    async def get_revision_by_id(
        self, revision_id: str
    ) -> AnnotationRevisionEntity | None: ...

    async def list_revisions_by_annotation(
        self, annotation_id: str
    ) -> Sequence[AnnotationRevisionEntity]: ...

    async def get_latest_revision(
        self, annotation_id: str
    ) -> AnnotationRevisionEntity | None: ...


class IToolAdapter(Protocol):
    """Abstract Tool Adapter interface for Annotation tools (Label Studio, CVAT, etc.)."""

    def convert_ontology_to_label_config(
        self, categories: Sequence[CategoryEntity]
    ) -> str: ...

    def convert_external_annotation_to_internal(
        self, external_payload: dict[str, Any]
    ) -> list[AnnotationResultEntity]: ...

    def convert_internal_to_external_predictions(
        self, results: Sequence[AnnotationResultEntity]
    ) -> list[dict[str, Any]]: ...
