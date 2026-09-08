from datetime import UTC, datetime

from core.exceptions import BadRequestException, ConflictException, NotFoundException
from modules.ontology.domain.entities import (
    OntologyVersionEntity,
    OntologyVersionInputEntity,
    OntologyVersionOutputCategoryEntity,
    OntologyVersionOutputEntity,
)
from modules.ontology.domain.interfaces import (
    ICategoryRepository,
    IOntologyInputRepository,
    IOntologyOutputRepository,
    IOntologyRepository,
    IOntologyVersionRepository,
)
from modules.ontology.domain.validators import (
    calculate_schema_hash,
    export_schema,
    validate_version,
)
from modules.ontology.dtos import (
    OntologyCompositionUpdateDTO,
    OntologyValidationResponseDTO,
    OntologyVersionCreateDTO,
    OntologyVersionResponseDTO,
    OntologyVersionSchemaResponseDTO,
    OntologyVersionUpdateDTO,
)
from modules.ontology.use_cases.common import require_ontology


class _OntologyVersionUseCaseBase:
    def __init__(
        self,
        repo: IOntologyVersionRepository,
        ontologies: IOntologyRepository,
        inputs: IOntologyInputRepository,
        outputs: IOntologyOutputRepository,
        categories: ICategoryRepository,
    ) -> None:
        self.repo, self.ontologies = repo, ontologies
        self.inputs, self.outputs, self.categories = inputs, outputs, categories

    async def _get(
        self, project_id: str, ontology_id: str, version_id: str
    ) -> OntologyVersionEntity:
        await require_ontology(self.ontologies, project_id, ontology_id)
        version = await self.repo.get(version_id)
        if version is None or version.ontology_id != ontology_id:
            raise NotFoundException("Ontology Version không tồn tại.")
        return version

    async def list(
        self, project_id: str, ontology_id: str
    ) -> list[OntologyVersionResponseDTO]:
        await require_ontology(self.ontologies, project_id, ontology_id)
        return [
            OntologyVersionResponseDTO.model_validate(item)
            for item in await self.repo.list_by_ontology(ontology_id)
        ]

    async def get(
        self, project_id: str, ontology_id: str, version_id: str
    ) -> OntologyVersionResponseDTO:
        return OntologyVersionResponseDTO.model_validate(
            await self._get(project_id, ontology_id, version_id)
        )

    async def create(
        self, project_id: str, ontology_id: str, data: OntologyVersionCreateDTO
    ) -> OntologyVersionResponseDTO:
        await require_ontology(self.ontologies, project_id, ontology_id)
        if await self.repo.get_draft(ontology_id):
            raise ConflictException("Ontology đã có một Draft Version.")
        base = None
        if data.based_on_version_id:
            base = await self._get(project_id, ontology_id, data.based_on_version_id)
            if base.status != "published":
                raise BadRequestException("Chỉ được tạo Draft từ Published Version.")
        number = await self.repo.next_version_no(ontology_id)
        entity = OntologyVersionEntity(
            ontology_id=ontology_id,
            version_no=number,
            name=data.name or f"Version {number}",
            based_on_version_id=base.id if base else None,
            inputs=[
                OntologyVersionInputEntity("", item.ontology_input_id, item.sort_order)
                for item in (base.inputs if base else [])
            ],
            outputs=[
                OntologyVersionOutputEntity(
                    "",
                    item.ontology_output_id,
                    item.ontology_input_id,
                    item.sort_order,
                    categories=[
                        OntologyVersionOutputCategoryEntity(
                            "",
                            item.ontology_output_id,
                            category.category_id,
                            category.sort_order,
                        )
                        for category in item.categories
                    ],
                )
                for item in (base.outputs if base else [])
            ],
        )
        return OntologyVersionResponseDTO.model_validate(await self.repo.add(entity))

    async def update(
        self,
        project_id: str,
        ontology_id: str,
        version_id: str,
        data: OntologyVersionUpdateDTO,
    ) -> OntologyVersionResponseDTO:
        version = await self._get(project_id, ontology_id, version_id)
        if not version.is_editable:
            raise ConflictException("Published Version không thể sửa.")
        version.name = data.name
        return OntologyVersionResponseDTO.model_validate(
            await self.repo.update(version)
        )

    async def compose(
        self,
        project_id: str,
        ontology_id: str,
        version_id: str,
        data: OntologyCompositionUpdateDTO,
    ) -> OntologyVersionResponseDTO:
        version = await self._get(project_id, ontology_id, version_id)
        if not version.is_editable:
            raise ConflictException("Published Version không thể sửa dây nối.")
        input_map = {}
        for item in data.inputs:
            entity = await self.inputs.get(item.input_id)
            if entity is None or entity.ontology_id != ontology_id:
                raise BadRequestException("Có Input không thuộc Ontology.")
            input_map[item.input_id] = entity
        inputs = [
            OntologyVersionInputEntity(
                version_id, item.input_id, item.sort_order, input_map[item.input_id]
            )
            for item in data.inputs
        ]
        outputs = []
        for item in data.outputs:
            output = await self.outputs.get(item.output_id)
            if output is None or output.ontology_id != ontology_id:
                raise BadRequestException("Có Output không thuộc Ontology.")
            if item.input_id not in input_map:
                raise BadRequestException("Input nguồn phải nằm trong Version.")
            category_links = []
            for order, category_id in enumerate(item.category_ids):
                category = await self.categories.get(category_id)
                if category is None or category.ontology_id != ontology_id:
                    raise BadRequestException("Có Category không thuộc Ontology.")
                category_links.append(
                    OntologyVersionOutputCategoryEntity(
                        version_id, item.output_id, category_id, order, category
                    )
                )
            outputs.append(
                OntologyVersionOutputEntity(
                    version_id,
                    item.output_id,
                    item.input_id,
                    item.sort_order,
                    output,
                    input_map[item.input_id],
                    category_links,
                )
            )
        candidate = OntologyVersionEntity(
            ontology_id=ontology_id,
            version_no=version.version_no,
            name=version.name,
            id=version.id,
            status=version.status,
            based_on_version_id=version.based_on_version_id,
            inputs=inputs,
            outputs=outputs,
        )
        issues = validate_version(candidate)
        structural = [
            issue
            for issue in issues
            if issue.code.startswith("foreign_") or issue.code == "input_not_in_version"
        ]
        if structural:
            raise BadRequestException("; ".join(issue.message for issue in structural))
        return OntologyVersionResponseDTO.model_validate(
            await self.repo.replace_composition(version_id, inputs, outputs)
        )

    async def validate(
        self, project_id: str, ontology_id: str, version_id: str
    ) -> OntologyValidationResponseDTO:
        issues = validate_version(await self._get(project_id, ontology_id, version_id))
        return OntologyValidationResponseDTO(valid=not issues, issues=issues)

    async def publish(
        self, project_id: str, ontology_id: str, version_id: str
    ) -> OntologyVersionResponseDTO:
        version = await self._get(project_id, ontology_id, version_id)
        if not version.is_editable:
            raise ConflictException("Version đã Published.")
        issues = validate_version(version)
        if issues:
            raise BadRequestException("; ".join(issue.message for issue in issues))
        version.status, version.published_at = "published", datetime.now(UTC)
        version.schema_hash = calculate_schema_hash(version)
        saved = await self.repo.update(version)
        ontology = await self.ontologies.get(ontology_id)
        assert ontology is not None
        ontology.current_version_id = version.id
        await self.ontologies.update(ontology)
        return OntologyVersionResponseDTO.model_validate(saved)

    async def export(
        self, project_id: str, ontology_id: str, version_id: str
    ) -> OntologyVersionSchemaResponseDTO:
        return OntologyVersionSchemaResponseDTO(
            **export_schema(await self._get(project_id, ontology_id, version_id))
        )

    async def delete(self, project_id: str, ontology_id: str, version_id: str) -> None:
        version = await self._get(project_id, ontology_id, version_id)
        if not version.is_editable:
            raise ConflictException("Published Version không thể xóa.")
        await self.repo.delete(version_id)


class ListOntologyVersionsUseCase(_OntologyVersionUseCaseBase):
    async def execute(self, project_id: str, ontology_id: str):
        return await self.list(project_id, ontology_id)


class GetOntologyVersionUseCase(_OntologyVersionUseCaseBase):
    async def execute(self, project_id: str, ontology_id: str, version_id: str):
        return await self.get(project_id, ontology_id, version_id)


class CreateOntologyVersionUseCase(_OntologyVersionUseCaseBase):
    async def execute(self, project_id: str, ontology_id: str, data):
        return await self.create(project_id, ontology_id, data)


class UpdateOntologyVersionUseCase(_OntologyVersionUseCaseBase):
    async def execute(self, project_id: str, ontology_id: str, version_id: str, data):
        return await self.update(project_id, ontology_id, version_id, data)


class UpdateOntologyCompositionUseCase(_OntologyVersionUseCaseBase):
    async def execute(self, project_id: str, ontology_id: str, version_id: str, data):
        return await self.compose(project_id, ontology_id, version_id, data)


class ValidateOntologyVersionUseCase(_OntologyVersionUseCaseBase):
    async def execute(self, project_id: str, ontology_id: str, version_id: str):
        return await self.validate(project_id, ontology_id, version_id)


class PublishOntologyVersionUseCase(_OntologyVersionUseCaseBase):
    async def execute(self, project_id: str, ontology_id: str, version_id: str):
        return await self.publish(project_id, ontology_id, version_id)


class ExportOntologyVersionSchemaUseCase(_OntologyVersionUseCaseBase):
    async def execute(self, project_id: str, ontology_id: str, version_id: str):
        return await self.export(project_id, ontology_id, version_id)


class DeleteOntologyVersionUseCase(_OntologyVersionUseCaseBase):
    async def execute(self, project_id: str, ontology_id: str, version_id: str):
        await self.delete(project_id, ontology_id, version_id)
