import logging
import re

from core.exceptions import ConflictException, NotFoundException
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
    IOntologyRepository,
    IOntologyVersionRepository,
    IOutputDefinitionRepository,
)
from modules.ontology.dtos import (
    OntologyCreateDTO,
    OntologyResponseDTO,
    OntologyUpdateDTO,
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


async def seed_ontology_from_template(
    project_id: str,
    ontology: OntologyEntity,
    draft: OntologyVersionEntity,
    project_repo: IProjectRepository | None,
    catalog_repo: IProjectCatalogRepository | None,
    input_def_repo: IInputDefinitionRepository | None,
    output_def_repo: IOutputDefinitionRepository | None,
    input_repo: IOntologyInputRepository | None,
    output_repo: IOntologyOutputRepository | None,
    category_repo: ICategoryRepository | None,
    version_repo: IOntologyVersionRepository,
) -> None:
    if (
        not project_repo
        or not catalog_repo
        or not input_def_repo
        or not output_def_repo
        or not input_repo
        or not output_repo
        or not category_repo
    ):
        return

    try:
        project = await project_repo.get_by_id(project_id)
        if not project or not project.template_id:
            return

        template = await catalog_repo.get_template(project.template_id)
        if not template:
            template = await catalog_repo.get_template_by_key(project.template_id)
        if not template:
            return

        modality = template.get("modality", "image")
        input_defs = await input_def_repo.list()
        matched_input_def = next(
            (d for d in input_defs if d.code == modality),
            next((d for d in input_defs if d.code == "image"), None),
        )
        if not matched_input_def:
            return

        existing_inputs = await input_repo.list_by_ontology(ontology.id)
        onto_input = next(
            (i for i in existing_inputs if i.definition_id == matched_input_def.id),
            None,
        )
        if not onto_input:
            onto_input = await input_repo.add(
                OntologyInputEntity(
                    ontology_id=ontology.id,
                    definition_id=matched_input_def.id,
                    name=f"{matched_input_def.name} ({template.get('title', 'Project')})",
                    scope="ONE_ITEM",
                    input_schema={"type": matched_input_def.code},
                )
            )

        output_defs = await output_def_repo.list()
        created_categories: list[CategoryEntity] = []
        raw_labels = template.get("labels", [])
        for idx, label in enumerate(raw_labels):
            label_name = label.get("name", f"Class {idx + 1}")
            clean_key = re.sub(r"[^a-zA-Z0-9_]", "_", label_name.lower().strip()).strip("_")
            clean_key = clean_key or f"label_{idx + 1}"
            cat_entity = await category_repo.get_by_key(ontology.id, clean_key)
            if not cat_entity:
                cat_entity = await category_repo.add(
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

        existing_outputs = await output_repo.list_by_ontology(ontology.id)
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
                onto_output = await output_repo.add(
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
            OntologyVersionInputEntity(draft.id, onto_input.id, 0)
        ]
        version_outputs = []
        for order, out_entity in enumerate(output_entities):
            cats = category_links_by_output.get(out_entity.id, [])
            cat_links = [
                OntologyVersionOutputCategoryEntity(
                    ontology_version_id=draft.id,
                    ontology_output_id=out_entity.id,
                    category_id=cat.id,
                    sort_order=c_idx,
                )
                for c_idx, cat in enumerate(cats)
            ]
            version_outputs.append(
                OntologyVersionOutputEntity(
                    ontology_version_id=draft.id,
                    ontology_output_id=out_entity.id,
                    ontology_input_id=onto_input.id,
                    sort_order=order,
                    categories=cat_links,
                )
            )

        if version_outputs:
            await version_repo.replace_composition(
                draft.id, version_inputs, version_outputs
            )
    except Exception as exc:
        logger.warning("Failed to auto-seed ontology from project template: %s", exc)


class CreateOntologyUseCase:
    def __init__(
        self,
        repo: IOntologyRepository,
        versions: IOntologyVersionRepository,
        project_repo: IProjectRepository,
        catalog_repo: IProjectCatalogRepository,
        input_def_repo: IInputDefinitionRepository,
        output_def_repo: IOutputDefinitionRepository,
        input_repo: IOntologyInputRepository,
        output_repo: IOntologyOutputRepository,
        category_repo: ICategoryRepository,
    ) -> None:
        self.repo = repo
        self.versions = versions
        self.project_repo = project_repo
        self.catalog_repo = catalog_repo
        self.input_def_repo = input_def_repo
        self.output_def_repo = output_def_repo
        self.input_repo = input_repo
        self.output_repo = output_repo
        self.category_repo = category_repo

    async def execute(
        self, project_id: str, data: OntologyCreateDTO
    ) -> OntologyResponseDTO:
        existing = await self.repo.get_by_project(project_id)
        if existing is not None:
            raise ConflictException("Project đã có Ontology; mỗi Project chỉ sở hữu duy nhất 1 Ontology.")
        ontology = await self.repo.add(
            OntologyEntity(project_id=project_id, **data.model_dump())
        )
        draft = await self.versions.add(
            OntologyVersionEntity(
                ontology_id=ontology.id, version_no=1, name="Version 1"
            )
        )
        ontology.versions = [draft]
        await seed_ontology_from_template(
            project_id=project_id,
            ontology=ontology,
            draft=draft,
            project_repo=self.project_repo,
            catalog_repo=self.catalog_repo,
            input_def_repo=self.input_def_repo,
            output_def_repo=self.output_def_repo,
            input_repo=self.input_repo,
            output_repo=self.output_repo,
            category_repo=self.category_repo,
            version_repo=self.versions,
        )
        updated = await self.repo.get_by_project(project_id)
        if updated:
            ontology = updated
        return OntologyResponseDTO.model_validate(ontology)


class GetProjectOntologyUseCase:
    def __init__(
        self,
        repo: IOntologyRepository,
        versions: IOntologyVersionRepository,
        project_repo: IProjectRepository,
        catalog_repo: IProjectCatalogRepository,
        input_def_repo: IInputDefinitionRepository,
        output_def_repo: IOutputDefinitionRepository,
        input_repo: IOntologyInputRepository,
        output_repo: IOntologyOutputRepository,
        category_repo: ICategoryRepository,
    ) -> None:
        self.repo = repo
        self.versions = versions
        self.project_repo = project_repo
        self.catalog_repo = catalog_repo
        self.input_def_repo = input_def_repo
        self.output_def_repo = output_def_repo
        self.input_repo = input_repo
        self.output_repo = output_repo
        self.category_repo = category_repo

    async def execute(self, project_id: str) -> OntologyResponseDTO:
        ontology = await self.repo.get_by_project(project_id)
        if ontology is None:
            # Auto-create default ontology for projects that don't have one
            ontology = await self.repo.add(
                OntologyEntity(project_id=project_id, name="Project Ontology")
            )
            draft = await self.versions.add(
                OntologyVersionEntity(
                    ontology_id=ontology.id, version_no=1, name="Version 1"
                )
            )
            ontology.versions = [draft]

        # If draft has no outputs, auto-seed from project template if available
        draft = next((v for v in ontology.versions if v.status == "draft"), None)
        if draft and not draft.outputs:
            await seed_ontology_from_template(
                project_id=project_id,
                ontology=ontology,
                draft=draft,
                project_repo=self.project_repo,
                catalog_repo=self.catalog_repo,
                input_def_repo=self.input_def_repo,
                output_def_repo=self.output_def_repo,
                input_repo=self.input_repo,
                output_repo=self.output_repo,
                category_repo=self.category_repo,
                version_repo=self.versions,
            )
            updated = await self.repo.get_by_project(project_id)
            if updated:
                ontology = updated

        return OntologyResponseDTO.model_validate(ontology)


class ListProjectOntologiesUseCase:
    def __init__(self, repo: IOntologyRepository) -> None:
        self.repo = repo

    async def execute(self, project_id: str) -> list[OntologyResponseDTO]:
        return [
            OntologyResponseDTO.model_validate(item)
            for item in await self.repo.list_by_project(project_id)
        ]


class GetOntologyUseCase:
    def __init__(self, repo: IOntologyRepository) -> None:
        self.repo = repo

    async def execute(self, project_id: str, ontology_id: str) -> OntologyResponseDTO:
        item = await self.repo.get(ontology_id)
        if item is None or item.project_id != project_id:
            raise NotFoundException("Ontology không tồn tại trong Project này.")
        return OntologyResponseDTO.model_validate(item)


class UpdateOntologyUseCase:
    def __init__(self, repo: IOntologyRepository) -> None:
        self.repo = repo

    async def execute(
        self, project_id: str, ontology_id: str, data: OntologyUpdateDTO
    ) -> OntologyResponseDTO:
        item = await self.repo.get(ontology_id)
        if item is None or item.project_id != project_id:
            raise NotFoundException("Ontology không tồn tại trong Project này.")
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(item, key, value)
        return OntologyResponseDTO.model_validate(await self.repo.update(item))


class DeleteOntologyUseCase:
    def __init__(self, repo: IOntologyRepository) -> None:
        self.repo = repo

    async def execute(self, project_id: str, ontology_id: str) -> None:
        item = await self.repo.get(ontology_id)
        if item is None or item.project_id != project_id:
            raise NotFoundException("Ontology không tồn tại trong Project này.")
        if await self.repo.has_published_version(ontology_id):
            raise ConflictException("Ontology có Published Version nên không thể xóa.")
        await self.repo.delete(ontology_id)
