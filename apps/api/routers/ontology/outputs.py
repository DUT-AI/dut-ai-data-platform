from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter, Depends, status

from apps.api.deps.auth import CurrentUser
from apps.api.deps.ontology import require_ontology_read, require_ontology_write
from modules.ontology.dtos import (
    OntologyOutputCreateDTO,
    OntologyOutputResponseDTO,
    OntologyOutputUpdateDTO,
)
from modules.ontology.use_cases import (
    CreateOntologyOutputUseCase,
    DeleteOntologyOutputUseCase,
    GetOntologyOutputUseCase,
    ListOntologyOutputsUseCase,
    UpdateOntologyOutputUseCase,
)

router = APIRouter(
    prefix="/projects/{project_id}/ontologies/{ontology_id}/outputs",
    tags=["Ontology Outputs"],
)


@router.get("", response_model=list[OntologyOutputResponseDTO])
@inject
async def list_outputs(
    project_id: str,
    ontology_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[ListOntologyOutputsUseCase],
    role: str = Depends(require_ontology_read),
):
    return await use_case.execute(project_id, ontology_id)


@router.post(
    "", response_model=OntologyOutputResponseDTO, status_code=status.HTTP_201_CREATED
)
@inject
async def create_output(
    project_id: str,
    ontology_id: str,
    data: OntologyOutputCreateDTO,
    current_user: CurrentUser,
    use_case: FromDishka[CreateOntologyOutputUseCase],
    role: str = Depends(require_ontology_write),
):
    return await use_case.execute(project_id, ontology_id, data)


@router.get("/{output_id}", response_model=OntologyOutputResponseDTO)
@inject
async def get_output(
    project_id: str,
    ontology_id: str,
    output_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[GetOntologyOutputUseCase],
    role: str = Depends(require_ontology_read),
):
    return await use_case.execute(project_id, ontology_id, output_id)


@router.patch("/{output_id}", response_model=OntologyOutputResponseDTO)
@inject
async def update_output(
    project_id: str,
    ontology_id: str,
    output_id: str,
    data: OntologyOutputUpdateDTO,
    current_user: CurrentUser,
    use_case: FromDishka[UpdateOntologyOutputUseCase],
    role: str = Depends(require_ontology_write),
):
    return await use_case.execute(project_id, ontology_id, output_id, data)


@router.delete("/{output_id}", status_code=status.HTTP_204_NO_CONTENT)
@inject
async def delete_output(
    project_id: str,
    ontology_id: str,
    output_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[DeleteOntologyOutputUseCase],
    role: str = Depends(require_ontology_write),
):
    await use_case.execute(project_id, ontology_id, output_id)
