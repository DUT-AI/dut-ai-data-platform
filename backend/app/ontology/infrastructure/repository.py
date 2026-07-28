from collections.abc import Sequence

from database.models import (
    AttributeModel,
    CategoryModel,
    OntologyModel,
    OntologyVersionModel,
)
from domain.entities import (
    AttributeEntity,
    CategoryEntity,
    OntologyEntity,
    OntologyVersionEntity,
)
from domain.interfaces import IOntologyRepository
from shared.utils.id_generator import generate_ulid
from sqlalchemy import delete, inspect, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload


def _map_attribute_to_entity(model: AttributeModel) -> AttributeEntity:
    return AttributeEntity(
        id=model.id,
        category_id=model.category_id,
        name=model.name,
        display_name=model.display_name,
        type=model.type,
        required=model.required,
        default_value=model.default_value,
        allowed_values=model.allowed_values,
        description=model.description,
    )


def _map_category_to_entity(model: CategoryModel) -> CategoryEntity:
    unloaded = inspect(model).unloaded
    attrs = (
        [_map_attribute_to_entity(a) for a in model.attributes]
        if "attributes" not in unloaded and model.attributes
        else []
    )
    return CategoryEntity(
        id=model.id,
        ontology_version_id=model.ontology_version_id,
        name=model.name,
        display_name=model.display_name,
        description=model.description,
        color=model.color,
        parent_category_id=model.parent_category_id,
        sort_order=model.sort_order,
        attributes=attrs,
    )


def _map_version_to_entity(model: OntologyVersionModel) -> OntologyVersionEntity:
    unloaded = inspect(model).unloaded
    cats = (
        [_map_category_to_entity(c) for c in model.categories]
        if "categories" not in unloaded and model.categories
        else []
    )
    return OntologyVersionEntity(
        id=model.id,
        ontology_id=model.ontology_id,
        version=model.version,
        status=model.status,
        created_at=model.created_at,
        published_at=model.published_at,
        categories=cats,
    )


def _map_ontology_to_entity(model: OntologyModel) -> OntologyEntity:
    unloaded = inspect(model).unloaded
    vers = (
        [_map_version_to_entity(v) for v in model.versions]
        if "versions" not in unloaded and model.versions
        else []
    )
    return OntologyEntity(
        id=model.id,
        project_id=model.project_id,
        name=model.name,
        description=model.description,
        status=model.status,
        created_at=model.created_at,
        updated_at=model.updated_at,
        versions=vers,
    )


class OntologyRepository(IOntologyRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def save_ontology(self, ontology: OntologyEntity) -> OntologyEntity:
        stmt = select(OntologyModel).where(OntologyModel.id == ontology.id)
        res = await self.session.execute(stmt)
        existing = res.scalar_one_or_none()
        if existing:
            existing.name = ontology.name
            existing.description = ontology.description
            existing.status = ontology.status
            await self.session.flush()
            await self.session.refresh(existing)
            return _map_ontology_to_entity(existing)

        model = OntologyModel(
            id=ontology.id,
            project_id=ontology.project_id,
            name=ontology.name,
            description=ontology.description,
            status=ontology.status,
        )
        self.session.add(model)
        await self.session.flush()
        await self.session.refresh(model)
        return _map_ontology_to_entity(model)

    async def get_ontology_by_id(self, ontology_id: str) -> OntologyEntity | None:
        stmt = (
            select(OntologyModel)
            .options(
                selectinload(OntologyModel.versions)
                .selectinload(OntologyVersionModel.categories)
                .selectinload(CategoryModel.attributes)
            )
            .where(OntologyModel.id == ontology_id)
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        return _map_ontology_to_entity(model) if model else None

    async def list_ontologies_by_project(
        self, project_id: str
    ) -> Sequence[OntologyEntity]:
        stmt = (
            select(OntologyModel)
            .options(selectinload(OntologyModel.versions))
            .where(OntologyModel.project_id == project_id)
            .order_by(OntologyModel.created_at.desc())
        )
        res = await self.session.execute(stmt)
        models = res.scalars().all()
        return [_map_ontology_to_entity(m) for m in models]

    async def save_version(
        self, version: OntologyVersionEntity
    ) -> OntologyVersionEntity:
        stmt = select(OntologyVersionModel).where(OntologyVersionModel.id == version.id)
        res = await self.session.execute(stmt)
        existing = res.scalar_one_or_none()
        if existing:
            existing.status = version.status
            existing.published_at = version.published_at
            await self.session.flush()
            await self.session.refresh(existing)
            return _map_version_to_entity(existing)

        model = OntologyVersionModel(
            id=version.id,
            ontology_id=version.ontology_id,
            version=version.version,
            status=version.status,
            published_at=version.published_at,
        )
        self.session.add(model)
        await self.session.flush()
        await self.session.refresh(model)
        return _map_version_to_entity(model)

    async def get_version_by_id(self, version_id: str) -> OntologyVersionEntity | None:
        stmt = (
            select(OntologyVersionModel)
            .options(
                selectinload(OntologyVersionModel.categories).selectinload(
                    CategoryModel.attributes
                )
            )
            .where(OntologyVersionModel.id == version_id)
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        return _map_version_to_entity(model) if model else None

    async def list_versions_by_ontology(
        self, ontology_id: str
    ) -> Sequence[OntologyVersionEntity]:
        stmt = (
            select(OntologyVersionModel)
            .where(OntologyVersionModel.ontology_id == ontology_id)
            .order_by(OntologyVersionModel.created_at.desc())
        )
        res = await self.session.execute(stmt)
        models = res.scalars().all()
        return [_map_version_to_entity(m) for m in models]

    async def save_category(self, category: CategoryEntity) -> CategoryEntity:
        stmt = select(CategoryModel).where(CategoryModel.id == category.id)
        res = await self.session.execute(stmt)
        existing = res.scalar_one_or_none()
        if existing:
            existing.name = category.name
            existing.display_name = category.display_name
            existing.description = category.description
            existing.color = category.color
            existing.parent_category_id = category.parent_category_id
            existing.sort_order = category.sort_order
            await self.session.flush()
            await self.session.refresh(existing)
            return _map_category_to_entity(existing)

        model = CategoryModel(
            id=category.id,
            ontology_version_id=category.ontology_version_id,
            name=category.name,
            display_name=category.display_name,
            description=category.description,
            color=category.color,
            parent_category_id=category.parent_category_id,
            sort_order=category.sort_order,
        )
        self.session.add(model)
        await self.session.flush()
        await self.session.refresh(model)
        return _map_category_to_entity(model)

    async def get_category_by_id(self, category_id: str) -> CategoryEntity | None:
        stmt = (
            select(CategoryModel)
            .options(selectinload(CategoryModel.attributes))
            .where(CategoryModel.id == category_id)
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        return _map_category_to_entity(model) if model else None

    async def get_category_by_name(
        self, version_id: str, name: str
    ) -> CategoryEntity | None:
        stmt = (
            select(CategoryModel)
            .options(selectinload(CategoryModel.attributes))
            .where(
                CategoryModel.ontology_version_id == version_id,
                CategoryModel.name == name,
            )
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        return _map_category_to_entity(model) if model else None

    async def delete_category(self, category_id: str) -> bool:
        stmt = delete(CategoryModel).where(CategoryModel.id == category_id)
        res = await self.session.execute(stmt)
        await self.session.flush()
        return int(getattr(res, "rowcount", 0) or 0) > 0

    async def save_attribute(self, attribute: AttributeEntity) -> AttributeEntity:
        stmt = select(AttributeModel).where(AttributeModel.id == attribute.id)
        res = await self.session.execute(stmt)
        existing = res.scalar_one_or_none()
        if existing:
            existing.name = attribute.name
            existing.display_name = attribute.display_name
            existing.type = attribute.type
            existing.required = attribute.required
            existing.default_value = attribute.default_value
            existing.allowed_values = attribute.allowed_values
            existing.description = attribute.description
            await self.session.flush()
            await self.session.refresh(existing)
            return _map_attribute_to_entity(existing)

        model = AttributeModel(
            id=attribute.id,
            category_id=attribute.category_id,
            name=attribute.name,
            display_name=attribute.display_name,
            type=attribute.type,
            required=attribute.required,
            default_value=attribute.default_value,
            allowed_values=attribute.allowed_values,
            description=attribute.description,
        )
        self.session.add(model)
        await self.session.flush()
        await self.session.refresh(model)
        return _map_attribute_to_entity(model)

    async def get_attribute_by_id(self, attribute_id: str) -> AttributeEntity | None:
        stmt = select(AttributeModel).where(AttributeModel.id == attribute_id)
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        return _map_attribute_to_entity(model) if model else None

    async def get_attribute_by_name(
        self, category_id: str, name: str
    ) -> AttributeEntity | None:
        stmt = select(AttributeModel).where(
            AttributeModel.category_id == category_id,
            AttributeModel.name == name,
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        return _map_attribute_to_entity(model) if model else None

    async def delete_attribute(self, attribute_id: str) -> bool:
        stmt = delete(AttributeModel).where(AttributeModel.id == attribute_id)
        res = await self.session.execute(stmt)
        await self.session.flush()
        return int(getattr(res, "rowcount", 0) or 0) > 0

    async def clone_version(
        self, source_version_id: str, new_version_name: str
    ) -> OntologyVersionEntity:
        source_stmt = (
            select(OntologyVersionModel)
            .options(
                selectinload(OntologyVersionModel.categories).selectinload(
                    CategoryModel.attributes
                )
            )
            .where(OntologyVersionModel.id == source_version_id)
        )
        res = await self.session.execute(source_stmt)
        source_ver = res.scalar_one_or_none()
        if not source_ver:
            raise ValueError(f"Source version '{source_version_id}' not found.")

        # Create new version model
        new_version_id = generate_ulid()
        new_ver_model = OntologyVersionModel(
            id=new_version_id,
            ontology_id=source_ver.ontology_id,
            version=new_version_name,
            status="draft",
        )
        self.session.add(new_ver_model)
        await self.session.flush()

        # Map old category ID -> new category ID
        cat_id_map: dict[str, str] = {}
        new_categories: list[CategoryModel] = []

        for old_cat in source_ver.categories:
            new_cat_id = generate_ulid()
            cat_id_map[old_cat.id] = new_cat_id

            new_cat = CategoryModel(
                id=new_cat_id,
                ontology_version_id=new_version_id,
                name=old_cat.name,
                display_name=old_cat.display_name,
                description=old_cat.description,
                color=old_cat.color,
                parent_category_id=None,  # Updated in pass 2
                sort_order=old_cat.sort_order,
            )
            self.session.add(new_cat)
            new_categories.append(new_cat)

            # Deep copy attributes
            for old_attr in old_cat.attributes:
                new_attr = AttributeModel(
                    id=generate_ulid(),
                    category_id=new_cat_id,
                    name=old_attr.name,
                    display_name=old_attr.display_name,
                    type=old_attr.type,
                    required=old_attr.required,
                    default_value=old_attr.default_value,
                    allowed_values=old_attr.allowed_values,
                    description=old_attr.description,
                )
                self.session.add(new_attr)

        await self.session.flush()

        # Pass 2: Update parent_category_id mapping
        for old_cat in source_ver.categories:
            if old_cat.parent_category_id and old_cat.parent_category_id in cat_id_map:
                new_cat_id = cat_id_map[old_cat.id]
                new_parent_id = cat_id_map[old_cat.parent_category_id]
                stmt = select(CategoryModel).where(CategoryModel.id == new_cat_id)
                r = await self.session.execute(stmt)
                cat_to_update = r.scalar_one()
                cat_to_update.parent_category_id = new_parent_id

        await self.session.flush()
        return await self.get_version_by_id(new_version_id)  # type: ignore
