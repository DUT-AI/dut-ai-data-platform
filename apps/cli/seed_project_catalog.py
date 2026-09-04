import asyncio

from sqlalchemy import select

from core.database.session import AsyncSessionLocal
from core.utils.datetime_utils import now_utc
from core.utils.id_generator import generate_ulid
from modules.project.models.catalog import (
    ProjectTemplateModel,
    ProjectTemplateVersionModel,
    TaskDefinitionModel,
    TaskDefinitionVersionModel,
    TemplateProviderCompatibilityModel,
)

TASKS = [
    (
        "cv.image_classification",
        "Image Classification",
        "computer_vision",
        "image",
        ["single_choice", "multiple_choice"],
        ["label_studio", "cvat"],
    ),
    (
        "cv.object_detection",
        "Object Detection",
        "computer_vision",
        "image",
        ["bounding_box"],
        ["label_studio", "cvat"],
    ),
    (
        "cv.semantic_segmentation",
        "Semantic Segmentation",
        "computer_vision",
        "image",
        ["polygon", "mask"],
        ["label_studio", "cvat"],
    ),
    (
        "cv.ocr",
        "OCR",
        "computer_vision",
        "image",
        ["region", "text"],
        ["label_studio", "cvat"],
    ),
    (
        "nlp.text_classification",
        "Text Classification",
        "natural_language_processing",
        "text",
        ["single_choice", "multiple_choice"],
        ["label_studio", "doccano"],
    ),
    (
        "nlp.named_entity_recognition",
        "Named Entity Recognition",
        "natural_language_processing",
        "text",
        ["text_span"],
        ["label_studio", "doccano"],
    ),
]


async def seed() -> None:
    async with AsyncSessionLocal() as session, session.begin():
        for key, name, category, modality, capabilities, providers in TASKS:
            task = (
                await session.execute(
                    select(TaskDefinitionModel).where(TaskDefinitionModel.key == key)
                )
            ).scalar_one_or_none()
            if not task:
                task = TaskDefinitionModel(
                    id=generate_ulid(),
                    key=key,
                    name=name,
                    category=category,
                    modality=modality,
                    status="active",
                )
                session.add(task)
                await session.flush()
            version = (
                await session.execute(
                    select(TaskDefinitionVersionModel).where(
                        TaskDefinitionVersionModel.task_definition_id == task.id,
                        TaskDefinitionVersionModel.version == "1.0",
                    )
                )
            ).scalar_one_or_none()
            if not version:
                version = TaskDefinitionVersionModel(
                    id=generate_ulid(),
                    task_definition_id=task.id,
                    version="1.0",
                    input_schema={"modality": modality},
                    capability_schema={"primitives": capabilities},
                    constraints_payload={},
                    status="published",
                    published_at=now_utc(),
                )
                session.add(version)
            template_key = f"{key}.blank"
            template = (
                await session.execute(
                    select(ProjectTemplateModel).where(
                        ProjectTemplateModel.key == template_key
                    )
                )
            ).scalar_one_or_none()
            if not template:
                template = ProjectTemplateModel(
                    id=generate_ulid(),
                    key=template_key,
                    name=f"Blank {name}",
                    task_definition_id=task.id,
                    status="active",
                )
                session.add(template)
                await session.flush()
            tv = (
                await session.execute(
                    select(ProjectTemplateVersionModel).where(
                        ProjectTemplateVersionModel.project_template_id == template.id,
                        ProjectTemplateVersionModel.version == "1.0",
                    )
                )
            ).scalar_one_or_none()
            if not tv:
                tv = ProjectTemplateVersionModel(
                    id=generate_ulid(),
                    project_template_id=template.id,
                    version="1.0",
                    default_project_configuration={},
                    status="published",
                    published_at=now_utc(),
                )
                session.add(tv)
                await session.flush()
            for provider in providers:
                existing = (
                    await session.execute(
                        select(TemplateProviderCompatibilityModel.id).where(
                            TemplateProviderCompatibilityModel.project_template_version_id
                            == tv.id,
                            TemplateProviderCompatibilityModel.provider_key == provider,
                        )
                    )
                ).scalar_one_or_none()
                if not existing:
                    session.add(
                        TemplateProviderCompatibilityModel(
                            id=generate_ulid(),
                            project_template_version_id=tv.id,
                            provider_key=provider,
                            status="active",
                            constraints_payload={},
                        )
                    )


if __name__ == "__main__":
    asyncio.run(seed())
