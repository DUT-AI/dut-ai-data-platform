from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter, Depends, status

from apps.api.deps.auth import CurrentUser
from apps.api.deps.ontology import require_ontology_read, require_ontology_write
from modules.ontology.dtos import (
    OntologyInputCreateDTO,
    OntologyInputResponseDTO,
    OntologyInputUpdateDTO,
)
from modules.ontology.use_cases import (
    CreateOntologyInputUseCase,
    DeleteOntologyInputUseCase,
    GetOntologyInputUseCase,
    ListOntologyInputsUseCase,
    UpdateOntologyInputUseCase,
)

router = APIRouter(
    prefix="/projects/{project_id}/ontologies/{ontology_id}/inputs",
    tags=["Ontology Inputs"],
)


@router.get("", response_model=list[OntologyInputResponseDTO])
@inject
async def list_inputs(
    project_id: str,
    ontology_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[ListOntologyInputsUseCase],
    role: str = Depends(require_ontology_read),
):
    return await use_case.execute(project_id, ontology_id)


@router.post(
    "", response_model=OntologyInputResponseDTO, status_code=status.HTTP_201_CREATED
)
@inject
async def create_input(
    project_id: str,
    ontology_id: str,
    data: OntologyInputCreateDTO,
    current_user: CurrentUser,
    use_case: FromDishka[CreateOntologyInputUseCase],
    role: str = Depends(require_ontology_write),
):
    return await use_case.execute(project_id, ontology_id, data)


@router.get("/{input_id}", response_model=OntologyInputResponseDTO)
@inject
async def get_input(
    project_id: str,
    ontology_id: str,
    input_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[GetOntologyInputUseCase],
    role: str = Depends(require_ontology_read),
):
    return await use_case.execute(project_id, ontology_id, input_id)


@router.patch("/{input_id}", response_model=OntologyInputResponseDTO)
@inject
async def update_input(
    project_id: str,
    ontology_id: str,
    input_id: str,
    data: OntologyInputUpdateDTO,
    current_user: CurrentUser,
    use_case: FromDishka[UpdateOntologyInputUseCase],
    role: str = Depends(require_ontology_write),
):
    return await use_case.execute(project_id, ontology_id, input_id, data)


@router.delete("/{input_id}", status_code=status.HTTP_204_NO_CONTENT)
@inject
async def delete_input(
    project_id: str,
    ontology_id: str,
    input_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[DeleteOntologyInputUseCase],
    role: str = Depends(require_ontology_write),
):
    await use_case.execute(project_id, ontology_id, input_id)
