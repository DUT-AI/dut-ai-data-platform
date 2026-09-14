from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter, Depends, status

from apps.api.deps.auth import CurrentUser
from apps.api.deps.ontology import require_ontology_read, require_ontology_write
from modules.ontology.dtos import (
    OntologyCreateDTO,
    OntologyResponseDTO,
    OntologyUpdateDTO,
)
from modules.ontology.use_cases import (
    CreateOntologyUseCase,
    DeleteOntologyUseCase,
    GetOntologyUseCase,
    GetProjectOntologyUseCase,
    ListProjectOntologiesUseCase,
    UpdateOntologyUseCase,
)

router = APIRouter(prefix="/projects/{project_id}", tags=["Ontology"])


@router.get("/ontology", response_model=OntologyResponseDTO)
@inject
async def get_project_ontology(
    project_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[GetProjectOntologyUseCase],
    role: str = Depends(require_ontology_read),
):
    """Retrieve the single official ontology for this project."""
    return await use_case.execute(project_id)


@router.get("/ontologies", response_model=list[OntologyResponseDTO])
@inject
async def list_ontologies(
    project_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[ListProjectOntologiesUseCase],
    role: str = Depends(require_ontology_read),
):
    return await use_case.execute(project_id)


@router.post(
    "/ontologies", response_model=OntologyResponseDTO, status_code=status.HTTP_201_CREATED
)
@inject
async def create_ontology(
    project_id: str,
    data: OntologyCreateDTO,
    current_user: CurrentUser,
    use_case: FromDishka[CreateOntologyUseCase],
    role: str = Depends(require_ontology_write),
):
    return await use_case.execute(project_id, data)


@router.get("/ontologies/{ontology_id}", response_model=OntologyResponseDTO)
@inject
async def get_ontology(
    project_id: str,
    ontology_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[GetOntologyUseCase],
    role: str = Depends(require_ontology_read),
):
    return await use_case.execute(project_id, ontology_id)


@router.patch("/ontologies/{ontology_id}", response_model=OntologyResponseDTO)
@inject
async def update_ontology(
    project_id: str,
    ontology_id: str,
    data: OntologyUpdateDTO,
    current_user: CurrentUser,
    use_case: FromDishka[UpdateOntologyUseCase],
    role: str = Depends(require_ontology_write),
):
    return await use_case.execute(project_id, ontology_id, data)


@router.delete("/ontologies/{ontology_id}", status_code=status.HTTP_204_NO_CONTENT)
@inject
async def delete_ontology(
    project_id: str,
    ontology_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[DeleteOntologyUseCase],
    role: str = Depends(require_ontology_write),
):
    await use_case.execute(project_id, ontology_id)
