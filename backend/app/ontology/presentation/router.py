from app.common.deps import CurrentUser
from app.ontology.application.dtos import (
    AttributeCreateDTO,
    AttributeResponseDTO,
    AttributeUpdateDTO,
    CategoryCreateDTO,
    CategoryResponseDTO,
    CategoryUpdateDTO,
    OntologyCreateDTO,
    OntologyResponseDTO,
    OntologyVersionCreateDTO,
    OntologyVersionResponseDTO,
)
from app.ontology.application.dtos.ontology import OntologyVersionUpdateDTO
from app.ontology.application.use_cases import (
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
    UpdateAttributeUseCase,
    UpdateCategoryUseCase,
    UpdateOntologyVersionUseCase,
)
from app.project.presentation.deps import require_project_role
from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter, Depends, status

router = APIRouter(tags=["ontologies"])


# 1. Project Ontologies
@router.post(
    "/api/v1/projects/{project_id}/ontologies",
    response_model=OntologyResponseDTO,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_project_role("admin"))],
)
@inject
async def create_ontology(
    project_id: str,
    data: OntologyCreateDTO,
    use_case: FromDishka[CreateOntologyUseCase],
):
    """Create a new Ontology and default v1.0.0 draft version."""
    return await use_case.execute(project_id, data)


@router.get(
    "/api/v1/projects/{project_id}/ontologies",
    response_model=list[OntologyResponseDTO],
    dependencies=[Depends(require_project_role("admin", "annotator", "reviewer"))],
)
@inject
async def list_project_ontologies(
    project_id: str,
    use_case: FromDishka[ListProjectOntologiesUseCase],
):
    """List all ontologies for a given project."""
    return await use_case.execute(project_id)


# 2. Ontology Versions
@router.post(
    "/api/v1/ontologies/{ontology_id}/versions",
    response_model=OntologyVersionResponseDTO,
    status_code=status.HTTP_201_CREATED,
)
@inject
async def create_ontology_version(
    ontology_id: str,
    data: OntologyVersionCreateDTO,
    use_case: FromDishka[CreateOntologyVersionUseCase],
    current_user: CurrentUser,
):
    """Create a new draft version for an ontology."""
    return await use_case.execute(ontology_id, data)


@router.get(
    "/api/v1/ontology-versions/{version_id}",
    response_model=OntologyVersionResponseDTO,
)
@inject
async def get_ontology_version_detail(
    version_id: str,
    use_case: FromDishka[GetOntologyVersionDetailUseCase],
    current_user: CurrentUser,
):
    """Get full details of a version including tree of categories and attributes."""
    return await use_case.execute(version_id)


@router.put(
    "/api/v1/ontology-versions/{version_id}/publish",
    response_model=OntologyVersionResponseDTO,
)
@inject
async def publish_ontology_version(
    version_id: str,
    use_case: FromDishka[PublishOntologyVersionUseCase],
    current_user: CurrentUser,
):
    """Publish a draft version (locks modifications completely)."""
    return await use_case.execute(version_id)


@router.post(
    "/api/v1/ontology-versions/{version_id}/clone",
    response_model=OntologyVersionResponseDTO,
    status_code=status.HTTP_201_CREATED,
)
@inject
async def clone_ontology_version(
    version_id: str,
    data: OntologyVersionCreateDTO,
    use_case: FromDishka[CloneOntologyVersionUseCase],
    current_user: CurrentUser,
):
    """Clone a published version into a new draft version with all categories & attributes copied."""
    return await use_case.execute(version_id, data.version)


# 3. Categories Management
@router.post(
    "/api/v1/ontology-versions/{version_id}/categories",
    response_model=CategoryResponseDTO,
    status_code=status.HTTP_201_CREATED,
)
@inject
async def create_category(
    version_id: str,
    data: CategoryCreateDTO,
    use_case: FromDishka[CreateCategoryUseCase],
    current_user: CurrentUser,
):
    """Add a category to a draft version."""
    return await use_case.execute(version_id, data)


@router.put(
    "/api/v1/categories/{category_id}",
    response_model=CategoryResponseDTO,
)
@inject
async def update_category(
    category_id: str,
    data: CategoryUpdateDTO,
    use_case: FromDishka[UpdateCategoryUseCase],
    current_user: CurrentUser,
):
    """Update a category in a draft version."""
    return await use_case.execute(category_id, data)


@router.delete(
    "/api/v1/categories/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
@inject
async def delete_category(
    category_id: str,
    use_case: FromDishka[DeleteCategoryUseCase],
    current_user: CurrentUser,
):
    """Delete a category from a draft version."""
    await use_case.execute(category_id)


# 4. Attributes Management
@router.post(
    "/api/v1/categories/{category_id}/attributes",
    response_model=AttributeResponseDTO,
    status_code=status.HTTP_201_CREATED,
)
@inject
async def create_attribute(
    category_id: str,
    data: AttributeCreateDTO,
    use_case: FromDishka[CreateAttributeUseCase],
    current_user: CurrentUser,
):
    """Add an attribute specification to a category."""
    return await use_case.execute(category_id, data)


@router.put(
    "/api/v1/attributes/{attribute_id}",
    response_model=AttributeResponseDTO,
)
@inject
async def update_attribute(
    attribute_id: str,
    data: AttributeUpdateDTO,
    use_case: FromDishka[UpdateAttributeUseCase],
    current_user: CurrentUser,
):
    """Update an attribute specification."""
    return await use_case.execute(attribute_id, data)


@router.delete(
    "/api/v1/attributes/{attribute_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
@inject
async def delete_attribute(
    attribute_id: str,
    use_case: FromDishka[DeleteAttributeUseCase],
    current_user: CurrentUser,
):
    """Delete an attribute specification."""
    await use_case.execute(attribute_id)


@router.put(
    "/api/v1/ontologies/versions/{version_id}",
    response_model=OntologyVersionResponseDTO,
)
@inject
async def update_ontology_version(
    version_id: str,
    data: OntologyVersionUpdateDTO,
    use_case: FromDishka[UpdateOntologyVersionUseCase],
    current_user: CurrentUser,
):
    """Update custom Label Studio config/setup for an ontology version."""
    return await use_case.execute(version_id, data.raw_label_config)
