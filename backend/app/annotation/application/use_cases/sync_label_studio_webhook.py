from datetime import UTC, datetime
from typing import Any

from domain.entities import (
    AnnotationEntity,
    AnnotationRevisionEntity,
)
from domain.interfaces import (
    IAnnotationRepository,
    IOntologyRepository,
    IToolAdapter,
)
from shared.utils.id_generator import generate_ulid


class SyncLabelStudioWebhookUseCase:
    def __init__(
        self,
        anno_repo: IAnnotationRepository,
        onto_repo: IOntologyRepository,
        tool_adapter: IToolAdapter,
    ):
        self.anno_repo = anno_repo
        self.onto_repo = onto_repo
        self.tool_adapter = tool_adapter

    async def execute(self, payload: dict[str, Any]) -> AnnotationRevisionEntity | None:
        # Convert external LS payload to internal AnnotationResultEntity list
        converted_results = self.tool_adapter.convert_external_annotation_to_internal(
            payload
        )

        task_data = payload.get("task", {}).get("data", {})
        asset_id = task_data.get("asset_id") or payload.get("asset_id")
        project_id = task_data.get("project_id") or payload.get("project_id")
        ontology_version_id = task_data.get("ontology_version_id") or payload.get(
            "ontology_version_id"
        )
        created_by = (
            payload.get("annotation", {}).get("created_username")
            or payload.get("user", {}).get("email")
            or "label_studio_webhook"
        )

        if not asset_id or not project_id or not ontology_version_id:
            return None

        # Resolve category name -> category_id if needed
        ontology_ver = await self.onto_repo.get_version_by_id(ontology_version_id)
        if ontology_ver:
            name_to_id = {c.name: c.id for c in ontology_ver.categories}
            for res in converted_results:
                if res.category_id and res.category_id in name_to_id:
                    res.category_id = name_to_id[res.category_id]

        # Check existing Annotation
        annotation = await self.anno_repo.get_annotation_by_asset_and_ontology(
            asset_id, ontology_version_id
        )

        if not annotation:
            annotation = AnnotationEntity(
                id=generate_ulid(),
                asset_id=asset_id,
                project_id=project_id,
                ontology_version_id=ontology_version_id,
                created_by=created_by,
                created_at=datetime.now(UTC),
            )
            annotation = await self.anno_repo.save_annotation(annotation)

        # Append new revision
        new_rev = AnnotationRevisionEntity(
            id=generate_ulid(),
            annotation_id=annotation.id,
            revision_number=0,
            created_by=created_by,
            source="human",
            created_at=datetime.now(UTC),
            results=converted_results,
        )

        return await self.anno_repo.create_revision(new_rev)
