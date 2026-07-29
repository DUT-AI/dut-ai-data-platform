"""Use case: Open an asset in Label Studio for annotation.

Luồng:
1. Lấy Ontology categories → build label config XML
2. get_or_create LS Project cho dataset version (lưu label_studio_project_id)
3. Tạo LS Task với {image: presigned_url, asset_id, project_id, ontology_version_id}
4. Lưu label_studio_task_id vào bản ghi Annotation (nếu đã tồn tại) hoặc ghi nhớ
5. Trả về task_url để frontend redirect
"""

from dataclasses import dataclass

from app.annotation.infrastructure.label_studio_adapter import LabelStudioAdapter
from app.annotation.infrastructure.label_studio_client import LabelStudioClient
from app.config import settings
from domain.interfaces import (
    IAnnotationRepository,
    IOntologyRepository,
)
from loguru import logger


@dataclass
class OpenInLabelStudioResult:
    task_url: str
    ls_project_id: int
    ls_task_id: int


class OpenAssetInLabelStudioUseCase:
    """Tạo LS Project (nếu chưa có) + Task cho asset, trả về URL task."""

    def __init__(
        self,
        anno_repo: IAnnotationRepository,
        onto_repo: IOntologyRepository,
        ls_adapter: LabelStudioAdapter,
    ) -> None:
        self.anno_repo = anno_repo
        self.onto_repo = onto_repo
        self.ls_adapter = ls_adapter
        self.ls_client = LabelStudioClient(
            base_url=settings.label_studio_internal_url,
            api_key=settings.label_studio_api_key,
        )

    async def execute(
        self,
        asset_id: str,
        project_id: str,
        ontology_version_id: str,
        presigned_url: str,
        dataset_version_id: str | None = None,
    ) -> OpenInLabelStudioResult:
        # 1. Lấy Ontology categories để build LS label config hoặc dùng raw_label_config nếu có
        ontology_ver = await self.onto_repo.get_version_by_id(ontology_version_id)
        if ontology_ver and ontology_ver.raw_label_config:
            label_config = ontology_ver.raw_label_config
        elif ontology_ver and ontology_ver.categories:
            label_config = self.ls_adapter.convert_ontology_to_label_config(
                ontology_ver.categories
            )
        else:
            # Fallback config tối giản
            label_config = '<View><Image name="image" value="$image"/></View>'

        # 2. Tên project LS = "DUT-AI :: {ontology_version_id[:8]}"
        #    (dùng ontology version để mỗi schema annotation có project riêng)
        ls_project_title = f"DUT-AI Platform :: {ontology_version_id[:12]}"

        # 3. Tạo / lấy LS Project + đăng ký webhook
        ls_project_id = await self.ls_client.get_or_create_project(
            title=ls_project_title,
            label_config=label_config,
            webhook_url=settings.platform_webhook_url,
        )
        logger.info(
            f"[OpenInLS] ls_project_id={ls_project_id} "
            f"asset_id={asset_id} ont_ver={ontology_version_id[:8]}"
        )

        # 4. Check nếu annotation đã có label_studio_task_id → dùng lại
        existing = await self.anno_repo.get_annotation_by_asset_and_ontology(
            asset_id, ontology_version_id
        )
        if existing and existing.label_studio_task_id:
            task_id = existing.label_studio_task_id
            logger.debug(f"[OpenInLS] Reusing existing task_id={task_id}")
        else:
            # 5. Tạo task mới trong LS với đầy đủ metadata để webhook sync được
            task_data = {
                "image": presigned_url,
                # Metadata Platform gắn vào task.data để webhook đọc lại
                "asset_id": asset_id,
                "project_id": project_id,
                "ontology_version_id": ontology_version_id,
            }
            task_id = await self.ls_client.create_task(ls_project_id, task_data)

            # 6. Lưu label_studio_task_id vào annotation nếu đã tồn tại
            if existing:
                existing.label_studio_task_id = task_id
                await self.anno_repo.save_annotation(existing)

        # URL trả về dùng label_studio_url (URL browser user, không phải internal)
        # LS 1.23 format: /projects/{project_id}/data?task={task_id}
        base = settings.label_studio_url.rstrip("/")
        browser_task_url = f"{base}/projects/{ls_project_id}/data?task={task_id}"

        return OpenInLabelStudioResult(
            task_url=browser_task_url,
            ls_project_id=ls_project_id,
            ls_task_id=task_id,
        )
