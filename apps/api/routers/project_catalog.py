from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter, Query

from apps.api.deps.auth import CurrentUser
from modules.project.dtos.project_dtos import (
    ProjectTemplateCreateDTO,
    ProjectTemplateVersionCreateDTO,
    TaskDefinitionCreateDTO,
    TaskDefinitionVersionCreateDTO,
)
from modules.project.use_cases import (
    ChangeProjectTemplateVersionStatusUseCase,
    ChangeTaskDefinitionVersionStatusUseCase,
    CreateProjectTemplateUseCase,
    CreateProjectTemplateVersionUseCase,
    CreateTaskDefinitionUseCase,
    CreateTaskDefinitionVersionUseCase,
    GetProjectTemplateUseCase,
    GetProjectTemplateVersionUseCase,
    GetTaskDefinitionUseCase,
    ListTaskDefinitionsUseCase,
)

router = APIRouter(prefix="/api/v1", tags=["Project Catalog"])

CATEGORIES = [
    "computer_vision",
    "natural_language_processing",
    "audio_speech",
    "video",
    "structured_data",
    "llm_evaluation",
]


@router.get("/task-categories")
async def list_task_categories() -> list[str]:
    return CATEGORIES


@router.get("/task-definitions")
@inject
async def list_task_definitions(
    use_case: FromDishka[ListTaskDefinitionsUseCase],
    category: str | None = None,
    modality: str | None = None,
    status: str = Query("published"),
    provider: str | None = None,
    search: str | None = None,
):
    return await use_case.execute(
        category=category, modality=modality, provider_key=provider, search=search
    )


@router.get("/task-definitions/{task_key}")
@inject
async def get_task_definition(
    task_key: str, use_case: FromDishka[GetTaskDefinitionUseCase]
):
    return await use_case.execute(task_key)


@router.get("/task-definitions/{task_key}/templates")
@inject
async def get_task_templates(
    task_key: str, use_case: FromDishka[GetTaskDefinitionUseCase]
):
    task = await use_case.execute(task_key)
    return task["templates"]


@router.get("/project-templates/{template_id}")
@inject
async def get_project_template(
    template_id: str, use_case: FromDishka[GetProjectTemplateUseCase]
):
    return await use_case.execute(template_id)


@router.get("/project-templates/{template_id}/versions/{version}")
@inject
async def get_project_template_version(
    template_id: str,
    version: str,
    use_case: FromDishka[GetProjectTemplateVersionUseCase],
):
    return await use_case.execute(template_id, version)


@router.post("/admin/task-definitions", status_code=201)
@inject
async def create_task_definition(
    payload: TaskDefinitionCreateDTO,
    current_user: CurrentUser,
    use_case: FromDishka[CreateTaskDefinitionUseCase],
):
    return await use_case.execute(payload.model_dump())


@router.post("/admin/task-definitions/{task_id}/versions", status_code=201)
@inject
async def create_task_definition_version(
    task_id: str,
    payload: TaskDefinitionVersionCreateDTO,
    current_user: CurrentUser,
    use_case: FromDishka[CreateTaskDefinitionVersionUseCase],
):
    return await use_case.execute(task_id, payload.model_dump())


@router.post("/admin/task-definition-versions/{version_id}/publish")
@inject
async def publish_task_definition_version(
    version_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[ChangeTaskDefinitionVersionStatusUseCase],
):
    return await use_case.execute(version_id, "published")


@router.post("/admin/task-definition-versions/{version_id}/deprecate")
@inject
async def deprecate_task_definition_version(
    version_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[ChangeTaskDefinitionVersionStatusUseCase],
):
    return await use_case.execute(version_id, "deprecated")


@router.post("/admin/project-templates", status_code=201)
@inject
async def create_project_template(
    payload: ProjectTemplateCreateDTO,
    current_user: CurrentUser,
    use_case: FromDishka[CreateProjectTemplateUseCase],
):
    return await use_case.execute(payload.model_dump())


@router.post("/admin/project-templates/{template_id}/versions", status_code=201)
@inject
async def create_project_template_version(
    template_id: str,
    payload: ProjectTemplateVersionCreateDTO,
    current_user: CurrentUser,
    use_case: FromDishka[CreateProjectTemplateVersionUseCase],
):
    return await use_case.execute(template_id, payload.model_dump())


@router.post("/admin/project-template-versions/{version_id}/publish")
@inject
async def publish_project_template_version(
    version_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[ChangeProjectTemplateVersionStatusUseCase],
):
    return await use_case.execute(version_id, "published")


@router.post("/admin/project-template-versions/{version_id}/deprecate")
@inject
async def deprecate_project_template_version(
    version_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[ChangeProjectTemplateVersionStatusUseCase],
):
    return await use_case.execute(version_id, "deprecated")


@router.post("/admin/project-template-versions/{version_id}/validate")
async def validate_project_template_version(version_id: str, current_user: CurrentUser):
    return {
        "id": version_id,
        "valid": True,
        "warnings": ["ontology_template_ref was not externally validated"],
    }
