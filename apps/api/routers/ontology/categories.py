from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter, Depends, status

from apps.api.deps.auth import CurrentUser
from apps.api.deps.ontology import require_ontology_read, require_ontology_write
from modules.ontology.dtos import (
    CategoryCreateDTO,
    CategoryResponseDTO,
    CategoryUpdateDTO,
)
from modules.ontology.use_cases import (
    CreateCategoryUseCase,
    DeleteCategoryUseCase,
    GetCategoryUseCase,
    ListCategoriesUseCase,
    UpdateCategoryUseCase,
)

router = APIRouter(
    prefix="/projects/{project_id}/ontologies/{ontology_id}/categories",
    tags=["Ontology Categories"],
)


@router.get("", response_model=list[CategoryResponseDTO])
@inject
async def list_categories(
    project_id: str,
    ontology_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[ListCategoriesUseCase],
    role: str = Depends(require_ontology_read),
):
    return await use_case.execute(project_id, ontology_id)


@router.post(
    "", response_model=CategoryResponseDTO, status_code=status.HTTP_201_CREATED
)
@inject
async def create_category(
    project_id: str,
    ontology_id: str,
    data: CategoryCreateDTO,
    current_user: CurrentUser,
    use_case: FromDishka[CreateCategoryUseCase],
    role: str = Depends(require_ontology_write),
):
    return await use_case.execute(project_id, ontology_id, data)


@router.get("/{category_id}", response_model=CategoryResponseDTO)
@inject
async def get_category(
    project_id: str,
    ontology_id: str,
    category_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[GetCategoryUseCase],
    role: str = Depends(require_ontology_read),
):
    return await use_case.execute(project_id, ontology_id, category_id)


@router.patch("/{category_id}", response_model=CategoryResponseDTO)
@inject
async def update_category(
    project_id: str,
    ontology_id: str,
    category_id: str,
    data: CategoryUpdateDTO,
    current_user: CurrentUser,
    use_case: FromDishka[UpdateCategoryUseCase],
    role: str = Depends(require_ontology_write),
):
    return await use_case.execute(project_id, ontology_id, category_id, data)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
@inject
async def delete_category(
    project_id: str,
    ontology_id: str,
    category_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[DeleteCategoryUseCase],
    role: str = Depends(require_ontology_write),
):
    await use_case.execute(project_id, ontology_id, category_id)
