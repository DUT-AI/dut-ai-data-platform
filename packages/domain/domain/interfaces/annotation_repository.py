from collections.abc import Sequence
from typing import Protocol

from domain.entities import (
    AnnotationEntity,
    AnnotationRevisionEntity,
)


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
