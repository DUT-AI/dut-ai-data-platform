from typing import Any

from core.exceptions import NotFoundException
from modules.annotation.domain.exceptions import AnnotationValidationError
from modules.annotation.domain.result_validation import (
    AnnotationIssue,
    validate_annotation_results,
)
from modules.ontology.domain.entities import OntologyVersionEntity
from modules.ontology.domain.interfaces import IOntologyRepository


class AnnotationValidator:
    """Validate annotation results against an Ontology Version contract."""

    @staticmethod
    def validate_results(
        results: list[dict[str, Any]],
        ontology_version: OntologyVersionEntity,
    ) -> list[str]:
        """Raise ``AnnotationValidationError`` listing every violation.

        Returns:
            list[str]: Sorted unique category ids used by the (valid) results.
        """
        report = validate_annotation_results(results, ontology_version)
        if not report.is_valid:
            raise AnnotationValidationError(report.issues)
        return report.category_ids


async def load_annotatable_version(
    onto_repo: IOntologyRepository, version_id: str, project_id: str
) -> OntologyVersionEntity:
    """Load an Ontology Version that annotations of ``project_id`` may target.

    A version of another project is reported as not found so its existence is
    not disclosed across projects.
    """
    not_found = NotFoundException(f"Ontology Version '{version_id}' not found.")
    version = await onto_repo.get_version_by_id(version_id)
    if version is None:
        raise not_found
    ontology = await onto_repo.get(version.ontology_id)
    if ontology is None or ontology.project_id != project_id:
        raise not_found
    if version.status != "published":
        raise AnnotationValidationError(
            [
                AnnotationIssue(
                    "ontology_version_id",
                    "version_not_published",
                    "Ontology Version chưa publish; chỉ được gán nhãn trên "
                    "version đã publish.",
                )
            ]
        )
    return version
