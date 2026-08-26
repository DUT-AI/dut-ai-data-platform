from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter, Depends, status

from apps.api.deps.auth import CurrentUser
from apps.api.deps.roles import require_project_role
from modules.ontology.dtos import (
    AttributeCreateDTO,
    AttributeResponseDTO,
    CategoryCreateDTO,
    CategoryResponseDTO,
    CategoryUpdateDTO,
    CloneVersionDTO,
    OntologyCreateDTO,
    OntologyResponseDTO,
    OntologyVersionCreateDTO,
    OntologyVersionDetailResponseDTO,
    OntologyVersionResponseDTO,
)
from modules.ontology.use_cases import (
    CloneOntologyVersionUseCase,
    CreateAttributeUseCase,
    CreateCategoryUseCase,
    CreateOntologyUseCase,
    CreateOntologyVersionUseCase,
    DeleteAttributeUseCase,
    DeleteCategoryUseCase,
    GetOntologyVersionDetailUseCase,
    ListProjectOntologiesUseCase,
    PublishOntologyVersionUseCase,
    UpdateCategoryUseCase,
)

router = APIRouter(tags=["Ontology"])


# ---------------------------------------------------------------------------
# Ontology Level
# ---------------------------------------------------------------------------


@router.post(
    "/api/v1/projects/{project_id}/ontologies",
    response_model=OntologyResponseDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new ontology schema for a project",
)
@inject
async def create_ontology(
    project_id: str,
    data: OntologyCreateDTO,
    current_user: CurrentUser,
    use_case: FromDishka[CreateOntologyUseCase],
    role: str = Depends(require_project_role("owner", "admin")),
):
    return await use_case.execute(project_id, data)


@router.get(
    "/api/v1/projects/{project_id}/ontologies",
    response_model=list[OntologyResponseDTO],
    summary="List all ontologies of a project",
)
@inject
async def list_project_ontologies(
    project_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[ListProjectOntologiesUseCase],
    role: str = Depends(
        require_project_role("owner", "admin", "annotator", "reviewer")
    ),
):
    return await use_case.execute(project_id)


# ---------------------------------------------------------------------------
# Version Level
# ---------------------------------------------------------------------------


@router.post(
    "/api/v1/ontologies/{ontology_id}/versions",
    response_model=OntologyVersionResponseDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new draft version for an ontology",
)
@inject
async def create_version(
    ontology_id: str,
    data: OntologyVersionCreateDTO,
    current_user: CurrentUser,
    use_case: FromDishka[CreateOntologyVersionUseCase],
):
    return await use_case.execute(ontology_id, data)


@router.get(
    "/api/v1/ontology-versions/{version_id}",
    response_model=OntologyVersionDetailResponseDTO,
    summary="Get full details of an ontology version with categories and attributes",
)
@inject
async def get_version_detail(
    version_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[GetOntologyVersionDetailUseCase],
):
    return await use_case.execute(version_id)


@router.put(
    "/api/v1/ontology-versions/{version_id}/publish",
    response_model=OntologyVersionResponseDTO,
    summary="Publish a draft version (becomes immutable)",
)
@inject
async def publish_version(
    version_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[PublishOntologyVersionUseCase],
):
    return await use_case.execute(version_id)


@router.post(
    "/api/v1/ontology-versions/{version_id}/clone",
    response_model=OntologyVersionDetailResponseDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Clone a published version into a new draft version",
)
@inject
async def clone_version(
    version_id: str,
    data: CloneVersionDTO,
    current_user: CurrentUser,
    use_case: FromDishka[CloneOntologyVersionUseCase],
):
    return await use_case.execute(version_id, data.version)


# ---------------------------------------------------------------------------
# Category Level
# ---------------------------------------------------------------------------


@router.post(
    "/api/v1/ontology-versions/{version_id}/categories",
    response_model=CategoryResponseDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Add a category (label) to a draft ontology version",
)
@inject
async def add_category(
    version_id: str,
    data: CategoryCreateDTO,
    current_user: CurrentUser,
    use_case: FromDishka[CreateCategoryUseCase],
):
    return await use_case.execute(version_id, data)


@router.put(
    "/api/v1/categories/{category_id}",
    response_model=CategoryResponseDTO,
    summary="Update category in a draft version",
)
@inject
async def update_category(
    category_id: str,
    data: CategoryUpdateDTO,
    current_user: CurrentUser,
    use_case: FromDishka[UpdateCategoryUseCase],
):
    return await use_case.execute(category_id, data)


@router.delete(
    "/api/v1/categories/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a category from a draft version",
)
@inject
async def delete_category(
    category_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[DeleteCategoryUseCase],
):
    await use_case.execute(category_id)


# ---------------------------------------------------------------------------
# Attribute Level
# ---------------------------------------------------------------------------


@router.post(
    "/api/v1/categories/{category_id}/attributes",
    response_model=AttributeResponseDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Add an attribute schema to a category",
)
@inject
async def add_attribute(
    category_id: str,
    data: AttributeCreateDTO,
    current_user: CurrentUser,
    use_case: FromDishka[CreateAttributeUseCase],
):
    return await use_case.execute(category_id, data)


@router.delete(
    "/api/v1/attributes/{attribute_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an attribute schema from a category",
)
@inject
async def delete_attribute(
    attribute_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[DeleteAttributeUseCase],
):
    await use_case.execute(attribute_id)
