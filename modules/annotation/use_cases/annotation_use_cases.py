from dataclasses import dataclass
from typing import Any

from loguru import logger

from core.config import settings
from core.exceptions import NotFoundException
from core.utils.id_generator import generate_ulid
from modules.annotation.domain.entities import (
    AnnotationEntity,
    AnnotationResultEntity,
    AnnotationRevisionEntity,
)
from modules.annotation.domain.interfaces import IAnnotationRepository
from modules.annotation.dtos.annotation_dtos import (
    AnnotationCreateDTO,
    AnnotationResponseDTO,
    AnnotationRevisionResponseDTO,
    RevisionCreateDTO,
)
from modules.annotation.integrations.label_studio_adapter import (
    LabelStudioAdapter,
)
from modules.annotation.integrations.label_studio_client import (
    LabelStudioClient,
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

        annotation = await self.anno_repo.get_annotation_by_asset_and_ontology(
            payload.asset_id, payload.ontology_version_id
        )
        if not annotation:
            annotation = AnnotationEntity(
                id=generate_ulid(),
                asset_id=payload.asset_id,
                project_id=payload.project_id,
                ontology_version_id=payload.ontology_version_id,
                created_by=created_by,
            )
            annotation = await self.anno_repo.save_annotation(annotation)

        results = [
            AnnotationResultEntity(
                id=generate_ulid(),
                revision_id="",
                category_id=r.category_id,
                result_type=r.result_type,
                geometry=r.geometry,
                payload=r.payload,
                attributes=r.attributes,
            )
            for r in payload.results
        ]

        AnnotationValidator.validate_results(results, ontology_ver)

        revision = AnnotationRevisionEntity(
            id=generate_ulid(),
            annotation_id=annotation.id,
            revision_number=1,
            created_by=created_by,
            source=payload.source,
            results=results,
        )
        created_rev = await self.anno_repo.create_revision(revision)

        full_anno = await self.anno_repo.get_annotation_by_id(annotation.id)
        resp = AnnotationResponseDTO.model_validate(full_anno)
        resp.latest_revision = AnnotationRevisionResponseDTO.model_validate(created_rev)
        return resp


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

        ontology_ver = await self.onto_repo.get_version_by_id(
            annotation.ontology_version_id
        )
        if not ontology_ver:
            raise NotFoundException(
                f"Ontology Version '{annotation.ontology_version_id}' not found."
            )

        results = [
            AnnotationResultEntity(
                id=generate_ulid(),
                revision_id="",
                category_id=r.category_id,
                result_type=r.result_type,
                geometry=r.geometry,
                payload=r.payload,
                attributes=r.attributes,
            )
            for r in payload.results
        ]

        AnnotationValidator.validate_results(results, ontology_ver)

        revision = AnnotationRevisionEntity(
            id=generate_ulid(),
            annotation_id=annotation_id,
            revision_number=0,
            created_by=created_by,
            source=payload.source,
            results=results,
        )
        created = await self.anno_repo.create_revision(revision)
        return AnnotationRevisionResponseDTO.model_validate(created)


class GetAnnotationDetailUseCase:
    def __init__(self, anno_repo: IAnnotationRepository) -> None:
        self.anno_repo = anno_repo

    async def execute(self, annotation_id: str) -> AnnotationResponseDTO:
        annotation = await self.anno_repo.get_annotation_by_id(annotation_id)
        if not annotation:
            raise NotFoundException(f"Annotation '{annotation_id}' not found.")

        resp = AnnotationResponseDTO.model_validate(annotation)
        if annotation.revisions:
            resp.latest_revision = AnnotationRevisionResponseDTO.model_validate(
                annotation.revisions[-1]
            )
        return resp


class GetRevisionDetailUseCase:
    def __init__(self, anno_repo: IAnnotationRepository) -> None:
        self.anno_repo = anno_repo

    async def execute(self, revision_id: str) -> AnnotationRevisionResponseDTO:
        revision = await self.anno_repo.get_revision_by_id(revision_id)
        if not revision:
            raise NotFoundException(f"Revision '{revision_id}' not found.")
        return AnnotationRevisionResponseDTO.model_validate(revision)


class ListAnnotationRevisionsUseCase:
    def __init__(self, anno_repo: IAnnotationRepository) -> None:
        self.anno_repo = anno_repo

    async def execute(self, annotation_id: str) -> list[AnnotationRevisionResponseDTO]:
        revs = await self.anno_repo.list_revisions_by_annotation(annotation_id)
        return [AnnotationRevisionResponseDTO.model_validate(r) for r in revs]


class ListAssetAnnotationsUseCase:
    def __init__(self, anno_repo: IAnnotationRepository) -> None:
        self.anno_repo = anno_repo

    async def execute(self, asset_id: str) -> list[AnnotationResponseDTO]:
        annotations = await self.anno_repo.list_annotations_by_asset(asset_id)
        res = []
        for a in annotations:
            dto = AnnotationResponseDTO.model_validate(a)
            if a.revisions:
                dto.latest_revision = AnnotationRevisionResponseDTO.model_validate(
                    a.revisions[-1]
                )
            res.append(dto)
        return res


@dataclass
class OpenInLabelStudioResult:
    task_url: str
    ls_project_id: int
    ls_task_id: int


class OpenAssetInLabelStudioUseCase:
    def __init__(
        self,
        anno_repo: IAnnotationRepository,
        onto_repo: IOntologyRepository,
        ls_adapter: LabelStudioAdapter,
    ) -> None:
        self.anno_repo = anno_repo
        self.onto_repo = onto_repo
        self.ls_adapter = ls_adapter
        self.ls_client = LabelStudioClient(
            base_url=settings.label_studio_internal_url,
            api_key=settings.label_studio_api_key,
        )

    async def execute(
        self,
        asset_id: str,
        project_id: str,
        ontology_version_id: str,
        presigned_url: str,
        dataset_version_id: str | None = None,
    ) -> OpenInLabelStudioResult:
        ontology_ver = await self.onto_repo.get_version_by_id(ontology_version_id)
        if ontology_ver and ontology_ver.raw_label_config:
            label_config = ontology_ver.raw_label_config
        elif ontology_ver and ontology_ver.categories:
            label_config = self.ls_adapter.convert_ontology_to_label_config(
                ontology_ver.categories
            )
        else:
            label_config = '<View><Image name="image" value="$image"/></View>'

        ls_project_title = f"DUT-AI Platform :: {ontology_version_id[:12]}"
        ls_project_id = await self.ls_client.get_or_create_project(
            title=ls_project_title,
            label_config=label_config,
            webhook_url=settings.platform_webhook_url,
        )
        logger.info(f"[OpenInLS] ls_project_id={ls_project_id} asset_id={asset_id}")

        existing = await self.anno_repo.get_annotation_by_asset_and_ontology(
            asset_id, ontology_version_id
        )
        if existing and existing.label_studio_task_id:
            task_id = existing.label_studio_task_id
        else:
            task_data = {
                "image": presigned_url,
                "asset_id": asset_id,
                "project_id": project_id,
                "ontology_version_id": ontology_version_id,
            }
            task_id = await self.ls_client.create_task(ls_project_id, task_data)
            if existing:
                existing.label_studio_task_id = task_id
                await self.anno_repo.save_annotation(existing)

        base = settings.label_studio_url.rstrip("/")
        browser_task_url = f"{base}/projects/{ls_project_id}/data?task={task_id}"

        return OpenInLabelStudioResult(
            task_url=browser_task_url,
            ls_project_id=ls_project_id,
            ls_task_id=task_id,
        )


class SyncLabelStudioWebhookUseCase:
    def __init__(
        self,
        anno_repo: IAnnotationRepository,
        onto_repo: IOntologyRepository,
        ls_adapter: LabelStudioAdapter,
    ) -> None:
        self.anno_repo = anno_repo
        self.onto_repo = onto_repo
        self.ls_adapter = ls_adapter

    async def execute(
        self, payload: dict[str, Any]
    ) -> AnnotationRevisionResponseDTO | None:
        task = payload.get("task", {})
        task_data = task.get("data", {})

        asset_id: str | None = task_data.get("asset_id")
        project_id: str | None = task_data.get("project_id")
        ontology_version_id: str | None = task_data.get("ontology_version_id")
        ls_task_id: int | None = task.get("id")

        if not asset_id or not project_id or not ontology_version_id:
            logger.warning(
                f"[LS Webhook] Missing essential task metadata in payload: {task_data}"
            )
            return None

        annotation = await self.anno_repo.get_annotation_by_asset_and_ontology(
            asset_id, ontology_version_id
        )
        if not annotation:
            annotation = AnnotationEntity(
                id=generate_ulid(),
                asset_id=asset_id,
                project_id=project_id,
                ontology_version_id=ontology_version_id,
                created_by="label_studio_user",
                label_studio_task_id=ls_task_id,
            )
            annotation = await self.anno_repo.save_annotation(annotation)
        elif ls_task_id and annotation.label_studio_task_id != ls_task_id:
            annotation.label_studio_task_id = ls_task_id
            await self.anno_repo.save_annotation(annotation)

        results = self.ls_adapter.convert_external_annotation_to_internal(payload)

        ontology_ver = await self.onto_repo.get_version_by_id(ontology_version_id)
        if ontology_ver and ontology_ver.categories:
            cat_name_to_id = {c.name: c.id for c in ontology_ver.categories}
            cat_display_to_id = {
                c.display_name: c.id for c in ontology_ver.categories if c.display_name
            }

            for res in results:
                if res.category_id:
                    if res.category_id in cat_name_to_id:
                        res.category_id = cat_name_to_id[res.category_id]
                    elif res.category_id in cat_display_to_id:
                        res.category_id = cat_display_to_id[res.category_id]

        anno_obj = payload.get("annotation", {})
        created_by = (
            str(
                anno_obj.get("created_username")
                or anno_obj.get("completed_by")
                or "label_studio"
            )
            if isinstance(anno_obj, dict)
            else "label_studio"
        )

        revision = AnnotationRevisionEntity(
            id=generate_ulid(),
            annotation_id=annotation.id,
            revision_number=0,
            created_by=created_by,
            source="human",
            results=results,
        )
        saved_rev = await self.anno_repo.create_revision(revision)
        logger.info(
            f"[LS Webhook] Successfully created revision #{saved_rev.revision_number} "
            f"for annotation={annotation.id} with {len(results)} results"
        )
        return AnnotationRevisionResponseDTO.model_validate(saved_rev)
