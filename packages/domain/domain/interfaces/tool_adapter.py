from collections.abc import Sequence
from typing import Any, Protocol

from domain.entities import AnnotationResultEntity, CategoryEntity


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
