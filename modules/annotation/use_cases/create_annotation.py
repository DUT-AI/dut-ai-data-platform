from core.exceptions import NotFoundException
from core.utils.id_generator import generate_ulid
from modules.annotation.domain.entities import (
    AnnotationEntity,
    AnnotationRevisionEntity,
)
from modules.annotation.domain.interfaces import IAnnotationRepository
from modules.annotation.dtos.annotation_dtos import (
    AnnotationCreateDTO,
    AnnotationResponseDTO,
    AnnotationRevisionResponseDTO,
)
from modules.annotation.services.annotation_validator import (
    AnnotationValidator,
)
from modules.ontology.domain.interfaces import IOntologyRepository


class CreateAnnotationUseCase:
    def __init__(
        self, anno_repo: IAnnotationRepository, onto_repo: IOntologyRepository
    ) -> None:
        self.anno_repo = anno_repo
        self.onto_repo = onto_repo

    async def execute(
        self, payload: AnnotationCreateDTO, created_by: str
    ) -> AnnotationResponseDTO:
        ontology_ver = await self.onto_repo.get_version_by_id(
            payload.ontology_version_id
        )
        if not ontology_ver:
            raise NotFoundException(
                f"Ontology Version '{payload.ontology_version_id}' not found."
            )

        # Dynamic schema validation against OntologyVersion outputs & categories
        extracted_cat_ids = AnnotationValidator.validate_results(
            payload.results, ontology_ver
        )

        annotation = await self.anno_repo.get_annotation_by_target(
            payload.asset_id, payload.target_type, payload.target_selector
        )
        if not annotation:
            annotation = AnnotationEntity(
                id=generate_ulid(),
                asset_id=payload.asset_id,
                project_id=payload.project_id,
                target_type=payload.target_type,
                target_selector=payload.target_selector,
                ontology_version_id=payload.ontology_version_id,
                created_by=created_by,
            )
            annotation = await self.anno_repo.save_annotation(annotation)

        revision = AnnotationRevisionEntity(
            id=generate_ulid(),
            annotation_id=annotation.id,
            revision_number=1,
            ontology_version_id=payload.ontology_version_id,
            created_by=created_by,
            source=payload.source,
            results=payload.results,
            category_ids=extracted_cat_ids,
        )
        created_rev = await self.anno_repo.create_revision(revision)

        full_anno = await self.anno_repo.get_annotation_by_id(annotation.id)
        resp = AnnotationResponseDTO.model_validate(full_anno)
        resp.latest_revision = AnnotationRevisionResponseDTO.model_validate(created_rev)
        return resp
