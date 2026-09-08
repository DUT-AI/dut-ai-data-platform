from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter, Depends, status

from apps.api.deps.auth import CurrentUser
from apps.api.deps.ontology import require_ontology_read, require_ontology_write
from modules.ontology.dtos import (
    OntologyCompositionUpdateDTO,
    OntologyValidationResponseDTO,
    OntologyVersionCreateDTO,
    OntologyVersionResponseDTO,
    OntologyVersionSchemaResponseDTO,
    OntologyVersionUpdateDTO,
)
from modules.ontology.use_cases import (
    CreateOntologyVersionUseCase,
    DeleteOntologyVersionUseCase,
    ExportOntologyVersionSchemaUseCase,
    GetOntologyVersionUseCase,
    ListOntologyVersionsUseCase,
    PublishOntologyVersionUseCase,
    UpdateOntologyCompositionUseCase,
    UpdateOntologyVersionUseCase,
    ValidateOntologyVersionUseCase,
)

router = APIRouter(
    prefix="/projects/{project_id}/ontologies/{ontology_id}/versions",
    tags=["Ontology Versions"],
)


@router.get("", response_model=list[OntologyVersionResponseDTO])
@inject
async def list_versions(
    project_id: str,
    ontology_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[ListOntologyVersionsUseCase],
    role: str = Depends(require_ontology_read),
):
    return await use_case.execute(project_id, ontology_id)


@router.post(
    "", response_model=OntologyVersionResponseDTO, status_code=status.HTTP_201_CREATED
)
@inject
async def create_version(
    project_id: str,
    ontology_id: str,
    data: OntologyVersionCreateDTO,
    current_user: CurrentUser,
    use_case: FromDishka[CreateOntologyVersionUseCase],
    role: str = Depends(require_ontology_write),
):
    return await use_case.execute(project_id, ontology_id, data)


@router.get("/{version_id}", response_model=OntologyVersionResponseDTO)
@inject
async def get_version(
    project_id: str,
    ontology_id: str,
    version_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[GetOntologyVersionUseCase],
    role: str = Depends(require_ontology_read),
):
    return await use_case.execute(project_id, ontology_id, version_id)


@router.patch("/{version_id}", response_model=OntologyVersionResponseDTO)
@inject
async def update_version(
    project_id: str,
    ontology_id: str,
    version_id: str,
    data: OntologyVersionUpdateDTO,
    current_user: CurrentUser,
    use_case: FromDishka[UpdateOntologyVersionUseCase],
    role: str = Depends(require_ontology_write),
):
    return await use_case.execute(project_id, ontology_id, version_id, data)


@router.put("/{version_id}/composition", response_model=OntologyVersionResponseDTO)
@inject
async def update_composition(
    project_id: str,
    ontology_id: str,
    version_id: str,
    data: OntologyCompositionUpdateDTO,
    current_user: CurrentUser,
    use_case: FromDishka[UpdateOntologyCompositionUseCase],
    role: str = Depends(require_ontology_write),
):
    return await use_case.execute(project_id, ontology_id, version_id, data)


@router.post("/{version_id}/validate", response_model=OntologyValidationResponseDTO)
@inject
async def validate_version(
    project_id: str,
    ontology_id: str,
    version_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[ValidateOntologyVersionUseCase],
    role: str = Depends(require_ontology_write),
):
    return await use_case.execute(project_id, ontology_id, version_id)


@router.post("/{version_id}/publish", response_model=OntologyVersionResponseDTO)
@inject
async def publish_version(
    project_id: str,
    ontology_id: str,
    version_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[PublishOntologyVersionUseCase],
    role: str = Depends(require_ontology_write),
):
    return await use_case.execute(project_id, ontology_id, version_id)


@router.get("/{version_id}/schema", response_model=OntologyVersionSchemaResponseDTO)
@inject
async def export_version_schema(
    project_id: str,
    ontology_id: str,
    version_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[ExportOntologyVersionSchemaUseCase],
    role: str = Depends(require_ontology_read),
):
    return await use_case.execute(project_id, ontology_id, version_id)


@router.delete("/{version_id}", status_code=status.HTTP_204_NO_CONTENT)
@inject
async def delete_version(
    project_id: str,
    ontology_id: str,
    version_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[DeleteOntologyVersionUseCase],
    role: str = Depends(require_ontology_write),
):
    await use_case.execute(project_id, ontology_id, version_id)
