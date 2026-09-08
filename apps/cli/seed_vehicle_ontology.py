"""Seed one complete vehicle-detection Ontology inside an existing Project."""

import argparse
import asyncio
from dataclasses import asdict, dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database.session import AsyncSessionLocal
from core.utils.datetime_utils import now_utc
from core.utils.id_generator import generate_ulid
from modules.ontology.domain.validators import calculate_schema_hash
from modules.ontology.models import (
    CategoryModel,
    InputDefinitionModel,
    OntologyInputModel,
    OntologyModel,
    OntologyOutputModel,
    OntologyVersionInputModel,
    OntologyVersionModel,
    OntologyVersionOutputCategoryModel,
    OntologyVersionOutputModel,
    OutputDefinitionModel,
)
from modules.ontology.repository import SqlOntologyVersionRepository
from modules.project.models import ProjectModel

ONTOLOGY_NAME = "Xe cộ - Phát hiện phương tiện"


@dataclass(frozen=True)
class SeedResult:
    ontology_id: str
    version_id: str
    created: bool


async def seed_vehicle_ontology(session: AsyncSession, project_id: str) -> SeedResult:
    project_exists = await session.scalar(
        select(ProjectModel.id).where(ProjectModel.id == project_id)
    )
    if project_exists is None:
        raise ValueError(f"Project không tồn tại: {project_id}")

    existing = (
        await session.execute(
            select(OntologyModel).where(
                OntologyModel.project_id == project_id,
                OntologyModel.name == ONTOLOGY_NAME,
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        version_id = existing.current_version_id
        if version_id is None:
            version_id = await session.scalar(
                select(OntologyVersionModel.id)
                .where(OntologyVersionModel.ontology_id == existing.id)
                .order_by(OntologyVersionModel.version_no.desc())
            )
        if version_id is None:
            raise RuntimeError("Ontology mẫu đã tồn tại nhưng chưa có Version.")
        version_repository = SqlOntologyVersionRepository(session)
        version_entity = await version_repository.get(version_id)
        if (
            version_entity is not None
            and version_entity.status == "published"
            and version_entity.schema_hash is None
        ):
            version_entity.schema_hash = calculate_schema_hash(version_entity)
            await version_repository.update(version_entity)
        return SeedResult(existing.id, version_id, False)

    image_definition = (
        await session.execute(
            select(InputDefinitionModel).where(InputDefinitionModel.code == "image")
        )
    ).scalar_one_or_none()
    bbox_definition = (
        await session.execute(
            select(OutputDefinitionModel).where(
                OutputDefinitionModel.code == "bounding_box"
            )
        )
    ).scalar_one_or_none()
    if image_definition is None or bbox_definition is None:
        raise RuntimeError(
            "Thiếu catalog image/bounding_box. Hãy chạy migration trước khi seed."
        )

    ontology = OntologyModel(
        id=generate_ulid(),
        project_id=project_id,
        name=ONTOLOGY_NAME,
        description=(
            "Mẫu hoàn chỉnh: một ảnh giao thông tạo nhiều bounding box và nhãn "
            "phương tiện."
        ),
    )
    session.add(ontology)
    await session.flush()

    input_node = OntologyInputModel(
        id=generate_ulid(),
        ontology_id=ontology.id,
        definition_id=image_definition.id,
        name="Ảnh giao thông",
        description="Một Asset ảnh được xử lý như một item.",
        scope="ONE_ITEM",
        input_schema={
            "type": "image",
            "allowed_extensions": ["png", "jpg", "jpeg", "webp"],
            "item": None,
        },
    )
    output_node = OntologyOutputModel(
        id=generate_ulid(),
        ontology_id=ontology.id,
        definition_id=bbox_definition.id,
        name="Phương tiện được phát hiện",
        description="Danh sách vùng bao và loại phương tiện trong ảnh.",
        multiple=True,
        required=True,
    )
    categories = [
        CategoryModel(
            id=generate_ulid(),
            ontology_id=ontology.id,
            key=key,
            name=name,
            color=color,
            description=description,
        )
        for key, name, color, description in (
            ("car", "Ô tô", "#2563EB", "Xe con và xe gia đình."),
            ("motorcycle", "Xe máy", "#F97316", "Xe mô tô hai bánh."),
            ("bus", "Xe buýt", "#8B5CF6", "Xe chở khách cỡ lớn."),
            ("truck", "Xe tải", "#EF4444", "Xe vận chuyển hàng hóa."),
            ("bicycle", "Xe đạp", "#10B981", "Xe đạp không động cơ."),
        )
    ]
    version = OntologyVersionModel(
        id=generate_ulid(),
        ontology_id=ontology.id,
        version_no=1,
        name="Bản mẫu xe cộ v1",
        status="published",
        published_at=now_utc(),
    )
    session.add_all([input_node, output_node, *categories, version])
    await session.flush()

    session.add(
        OntologyVersionInputModel(
            ontology_version_id=version.id,
            ontology_input_id=input_node.id,
            sort_order=0,
        )
    )
    version_output = OntologyVersionOutputModel(
        ontology_version_id=version.id,
        ontology_output_id=output_node.id,
        ontology_input_id=input_node.id,
        sort_order=0,
    )
    session.add(version_output)
    await session.flush()
    session.add_all(
        [
            OntologyVersionOutputCategoryModel(
                ontology_version_id=version.id,
                ontology_output_id=output_node.id,
                category_id=category.id,
                sort_order=index,
            )
            for index, category in enumerate(categories)
        ]
    )
    await session.flush()
    version_repository = SqlOntologyVersionRepository(session)
    version_entity = await version_repository.get(version.id)
    if version_entity is None:
        raise RuntimeError("Không thể đọc lại Ontology Version vừa seed.")
    version_entity.schema_hash = calculate_schema_hash(version_entity)
    await version_repository.update(version_entity)
    ontology.current_version_id = version.id
    await session.flush()
    return SeedResult(ontology.id, version.id, True)


async def main(project_id: str) -> None:
    async with AsyncSessionLocal() as session, session.begin():
        result = await seed_vehicle_ontology(session, project_id)
    print(asdict(result))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project-id", required=True)
    args = parser.parse_args()
    asyncio.run(main(args.project_id))
