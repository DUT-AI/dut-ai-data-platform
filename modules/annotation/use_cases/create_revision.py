from core.exceptions import NotFoundException
from core.utils.id_generator import generate_ulid
from modules.annotation.domain.entities import (
    AnnotationRevisionEntity,
)
from modules.annotation.domain.interfaces import IAnnotationRepository
from modules.annotation.dtos.annotation_dtos import (
    AnnotationRevisionResponseDTO,
    RevisionCreateDTO,
)
from modules.annotation.services.annotation_validator import (
    AnnotationValidator,
)
from modules.ontology.domain.interfaces import IOntologyRepository


class CreateRevisionUseCase:
    def __init__(
        self, anno_repo: IAnnotationRepository, onto_repo: IOntologyRepository
    ) -> None:
        self.anno_repo = anno_repo
        self.onto_repo = onto_repo

    async def execute(
        self, annotation_id: str, payload: RevisionCreateDTO, created_by: str
    ) -> AnnotationRevisionResponseDTO:
        annotation = await self.anno_repo.get_annotation_by_id(annotation_id)
        if not annotation:
            raise NotFoundException(f"Annotation '{annotation_id}' not found.")

        ontology_version_id = (
            payload.ontology_version_id
            or (annotation.ontology_version_id if annotation else None)
            or (
                annotation.revisions[-1].ontology_version_id
                if annotation and annotation.revisions
                else None
            )
        )
        if not ontology_version_id:
            raise NotFoundException(
                "No ontology_version_id provided or found on annotation."
            )

        ontology_ver = await self.onto_repo.get_version_by_id(ontology_version_id)
        if not ontology_ver:
            raise NotFoundException(
                f"Ontology Version '{ontology_version_id}' not found."
            )

        extracted_cat_ids = AnnotationValidator.validate_results(
            payload.results, ontology_ver
        )

        revision = AnnotationRevisionEntity(
            id=generate_ulid(),
            annotation_id=annotation_id,
            revision_number=0,
            ontology_version_id=ontology_version_id,
            created_by=created_by,
            source=payload.source,
            results=payload.results,
            category_ids=extracted_cat_ids,
        )
        created = await self.anno_repo.create_revision(revision)
        return AnnotationRevisionResponseDTO.model_validate(created)
