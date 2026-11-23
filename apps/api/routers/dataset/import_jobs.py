from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter

from apps.api.deps.auth import CurrentUser
from apps.api.deps.roles import PROJECT_READ_ROLES, authorize
from modules.dataset.dtos.dataset_dtos import AssetImportJobDTO
from modules.dataset.use_cases import GetAssetImportJobUseCase
from modules.project.services import ProjectAuthorizer

router = APIRouter(prefix="/asset-import-jobs", tags=["Asset Import Jobs"])


@router.get(
    "/{job_id}",
    response_model=AssetImportJobDTO,
    summary="Status of an asynchronous asset import (poll until succeeded/failed)",
)
@inject
async def get_asset_import_job(
    job_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[GetAssetImportJobUseCase],
    authorizer: FromDishka[ProjectAuthorizer],
):
    # The job lives in Redis, not in the project-scoped tables, so it is
    # authorized here from the project recorded on the job.
    job = await use_case.load(job_id)
    await authorize(
        authorizer.require_role(job.project_id, current_user.id, PROJECT_READ_ROLES)
    )
    return await use_case.describe(job)
