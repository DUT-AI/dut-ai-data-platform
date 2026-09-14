from dataclasses import dataclass
from typing import Any

from loguru import logger

from core.config import settings
from core.utils.id_generator import generate_ulid
from modules.annotation.domain.entities import (
    AnnotationEntity,
    AnnotationRevisionEntity,
)
from modules.annotation.domain.interfaces import IAnnotationRepository
from modules.annotation.dtos.annotation_dtos import (
    AnnotationRevisionResponseDTO,
)
from modules.annotation.integrations.label_studio_adapter import (
    LabelStudioAdapter,
)
from modules.annotation.integrations.label_studio_client import (
    LabelStudioClient,
)
from modules.ontology.domain.interfaces import IOntologyRepository


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

        task_data = {
            "image": presigned_url,
            "asset_id": asset_id,
            "project_id": project_id,
            "ontology_version_id": ontology_version_id,
        }
        task_id = await self.ls_client.create_task(ls_project_id, task_data)

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

        if not asset_id or not project_id or not ontology_version_id:
            logger.warning(
                f"[LS Webhook] Missing essential task metadata in payload: {task_data}"
            )
            return None

        annotation = await self.anno_repo.get_annotation_by_target(
            asset_id, "FULL_ASSET", {}
        )
        if not annotation:
            annotation = AnnotationEntity(
                id=generate_ulid(),
                asset_id=asset_id,
                project_id=project_id,
                target_type="FULL_ASSET",
                target_selector={},
                ontology_version_id=ontology_version_id,
                created_by="label_studio_user",
            )
            annotation = await self.anno_repo.save_annotation(annotation)

        results = self.ls_adapter.convert_external_annotation_to_internal(payload)

        ontology_ver = await self.onto_repo.get_version_by_id(ontology_version_id)
        if ontology_ver and ontology_ver.categories:
            cat_name_to_id = {c.name: c.id for c in ontology_ver.categories}
            cat_display_to_id = {
                c.display_name: c.id for c in ontology_ver.categories if c.display_name
            }

            for res in results:
                cid = res.get("category_id")
                if cid:
                    if cid in cat_name_to_id:
                        res["category_id"] = cat_name_to_id[cid]
                    elif cid in cat_display_to_id:
                        res["category_id"] = cat_display_to_id[cid]

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

        extracted_cat_ids = [
            r["category_id"] for r in results if r.get("category_id")
        ]

        revision = AnnotationRevisionEntity(
            id=generate_ulid(),
            annotation_id=annotation.id,
            revision_number=0,
            ontology_version_id=ontology_version_id,
            created_by=created_by,
            source="human",
            results=results,
            category_ids=extracted_cat_ids,
        )
        saved_rev = await self.anno_repo.create_revision(revision)
        logger.info(
            f"[LS Webhook] Successfully created revision #{saved_rev.revision_number} "
            f"for annotation={annotation.id} with {len(results)} results"
        )
        return AnnotationRevisionResponseDTO.model_validate(saved_rev)
