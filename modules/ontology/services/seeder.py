"""Service for seeding ontology structure from project templates."""

import logging
import re

from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import OntologySeedingError
from modules.ontology.domain.entities import (
    CategoryEntity,
    OntologyEntity,
    OntologyInputEntity,
    OntologyOutputEntity,
    OntologyVersionEntity,
    OntologyVersionInputEntity,
    OntologyVersionOutputCategoryEntity,
    OntologyVersionOutputEntity,
)
from modules.ontology.domain.interfaces import (
    ICategoryRepository,
    IInputDefinitionRepository,
    IOntologyInputRepository,
    IOntologyOutputRepository,
    IOntologyTemplateSeederService,
    IOntologyVersionRepository,
    IOutputDefinitionRepository,
)
from modules.project.domain.catalog_interfaces import IProjectCatalogRepository
from modules.project.domain.interfaces import IProjectRepository

logger = logging.getLogger(__name__)

TOOL_TYPE_MAP = {
    "bounding_box": "bounding_box",
    "polygon": "polygon",
    "classification": "classification",
    "keypoint": "keypoint",
    "audio_waveform": "audio_segment",
    "text_span": "named_entity",
    "text_input": "text",
    "video_timeline": "video_segment",
}


class OntologyTemplateSeederService(IOntologyTemplateSeederService):
    """Encapsulates auto-seeding of inputs, outputs, and categories from project catalog templates."""

    def __init__(
        self,
        session: AsyncSession,
        project_repo: IProjectRepository,
        catalog_repo: IProjectCatalogRepository,
        input_def_repo: IInputDefinitionRepository,
        output_def_repo: IOutputDefinitionRepository,
        input_repo: IOntologyInputRepository,
        output_repo: IOntologyOutputRepository,
        category_repo: ICategoryRepository,
        version_repo: IOntologyVersionRepository,
    ) -> None:
        self.session = session
        self.project_repo = project_repo
        self.catalog_repo = catalog_repo
        self.input_def_repo = input_def_repo
        self.output_def_repo = output_def_repo
        self.input_repo = input_repo
        self.output_repo = output_repo
        self.category_repo = category_repo
        self.version_repo = version_repo

    async def seed_from_project_template(
        self,
        project_id: str,
        ontology: OntologyEntity,
        draft_version: OntologyVersionEntity,
    ) -> None:
        if self.session is not None and hasattr(self.session, "begin_nested"):
            try:
                async with self.session.begin_nested():
                    await self._execute_seeding(project_id, ontology, draft_version)
            except Exception as exc:
                logger.error(
                    "Failed to auto-seed ontology from project template: %s", exc
                )
                raise OntologySeedingError(
                    f"Failed to auto-seed ontology from project template: {exc}"
                ) from exc
        else:
            try:
                await self._execute_seeding(project_id, ontology, draft_version)
            except Exception as exc:
                logger.error(
                    "Failed to auto-seed ontology from project template: %s", exc
                )
                raise OntologySeedingError(
                    f"Failed to auto-seed ontology from project template: {exc}"
                ) from exc

    async def _execute_seeding(
        self,
        project_id: str,
        ontology: OntologyEntity,
        draft_version: OntologyVersionEntity,
    ) -> None:
        project = await self.project_repo.get_by_id(project_id)
        if not project or not project.template_id:
            return

        template = await self.catalog_repo.get_template(project.template_id)
        if not template:
            template = await self.catalog_repo.get_template_by_key(project.template_id)
        if not template:
            return

        modality = template.get("modality", "image")
        input_defs = await self.input_def_repo.list()
        matched_input_def = next(
            (d for d in input_defs if d.code == modality),
            next((d for d in input_defs if d.code == "image"), None),
        )
        if not matched_input_def:
            return

        existing_inputs = await self.input_repo.list_by_ontology(ontology.id)
        onto_input = next(
            (i for i in existing_inputs if i.definition_id == matched_input_def.id),
            None,
        )
        if not onto_input:
            onto_input = await self.input_repo.add(
                OntologyInputEntity(
                    ontology_id=ontology.id,
                    definition_id=matched_input_def.id,
                    name=f"{matched_input_def.name} ({template.get('title', 'Project')})",
                    scope="ONE_ITEM",
                    input_schema={"type": matched_input_def.code},
                )
            )

        output_defs = await self.output_def_repo.list()
        created_categories: list[CategoryEntity] = []
        raw_labels = template.get("labels", [])
        for idx, label in enumerate(raw_labels):
            label_name = label.get("name", f"Class {idx + 1}")
            clean_key = re.sub(r"[^a-zA-Z0-9_]", "_", label_name.lower().strip()).strip(
                "_"
            )
            clean_key = clean_key or f"label_{idx + 1}"
            cat_entity = await self.category_repo.get_by_key(ontology.id, clean_key)
            if not cat_entity:
                cat_entity = await self.category_repo.add(
                    CategoryEntity(
                        ontology_id=ontology.id,
                        key=clean_key,
                        name=label_name,
                        color=label.get("color", "#2563eb"),
                    )
                )
            created_categories.append(cat_entity)

        tools = template.get("tools", [])
        if not tools and modality == "image":
            tools = [{"type": "bounding_box", "name": "Bounding Box"}]

        existing_outputs = await self.output_repo.list_by_ontology(ontology.id)
        output_entities: list[OntologyOutputEntity] = []
        category_links_by_output: dict[str, list[CategoryEntity]] = {}

        for tool in tools:
            raw_type = tool.get("type", "bounding_box")
            mapped_code = TOOL_TYPE_MAP.get(raw_type, raw_type)
            out_def = next((d for d in output_defs if d.code == mapped_code), None)
            if not out_def:
                continue

            onto_output = next(
                (o for o in existing_outputs if o.definition_id == out_def.id),
                None,
            )
            if not onto_output:
                onto_output = await self.output_repo.add(
                    OntologyOutputEntity(
                        ontology_id=ontology.id,
                        definition_id=out_def.id,
                        name=tool.get("name", out_def.name),
                        multiple=True,
                        required=False,
                        value_schema=out_def.default_schema,
                    )
                )
            output_entities.append(onto_output)
            if out_def.supports_categories and created_categories:
                category_links_by_output[onto_output.id] = created_categories

        version_inputs = [
            OntologyVersionInputEntity(draft_version.id, onto_input.id, 0)
        ]
        version_outputs = []
        for order, out_entity in enumerate(output_entities):
            cats = category_links_by_output.get(out_entity.id, [])
            cat_links = [
                OntologyVersionOutputCategoryEntity(
                    ontology_version_id=draft_version.id,
                    ontology_output_id=out_entity.id,
                    category_id=cat.id,
                    sort_order=c_idx,
                )
                for c_idx, cat in enumerate(cats)
            ]
            version_outputs.append(
                OntologyVersionOutputEntity(
                    ontology_version_id=draft_version.id,
                    ontology_output_id=out_entity.id,
                    ontology_input_id=onto_input.id,
                    sort_order=order,
                    categories=cat_links,
                )
            )

        if version_outputs:
            await self.version_repo.replace_composition(
                draft_version.id, version_inputs, version_outputs
            )
