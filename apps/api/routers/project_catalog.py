from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter

from modules.project.use_cases import (
    GetProjectTemplateUseCase,
    ListProjectTemplatesUseCase,
    ListTemplateGroupsUseCase,
)

router = APIRouter(prefix="/api/v1", tags=["Project Catalog"])


@router.get("/project-template-groups")
@inject
async def list_template_groups(
    use_case: FromDishka[ListTemplateGroupsUseCase],
) -> list[str]:
    return await use_case.execute()


@router.get("/project-templates")
@inject
async def list_project_templates(
    use_case: FromDishka[ListProjectTemplatesUseCase],
    group: str | None = None,
    modality: str | None = None,
    search: str | None = None,
):
    return await use_case.execute(group=group, modality=modality, search=search)


@router.get("/project-templates/{template_id}")
@inject
async def get_project_template(
    template_id: str, use_case: FromDishka[GetProjectTemplateUseCase]
):
    return await use_case.execute(template_id)


