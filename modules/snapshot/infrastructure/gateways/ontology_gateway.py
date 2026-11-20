from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from modules.annotation.models.annotation import AnnotationRevisionModel
from modules.ontology.models.ontology import CategoryModel, OntologyVersionModel
from modules.snapshot.domain.interfaces import OntologyGateway


class SqlOntologyGateway(OntologyGateway):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def validate_revisions(
        self,
        ontology_version_id: str,
        revision_ids: Sequence[str],
    ) -> tuple[bool, list[str]]:
        # 1. Verify ontology version exists
        stmt_ont = select(OntologyVersionModel).where(
            OntologyVersionModel.id == ontology_version_id
        )
        result_ont = await self._session.execute(stmt_ont)
        ont_version = result_ont.scalar_one_or_none()

        if not ont_version:
            return False, [f"Ontology version '{ontology_version_id}' does not exist."]

        if not revision_ids:
            return True, []

        # 2. Check if any revision references a conflicting ontology version
        stmt_revs = select(
            AnnotationRevisionModel.id,
            AnnotationRevisionModel.ontology_version_id,
            AnnotationRevisionModel.category_ids,
        ).where(AnnotationRevisionModel.id.in_(revision_ids))

        result_revs = await self._session.execute(stmt_revs)
        revs = result_revs.all()

        errors: list[str] = []
        for r in revs:
            if r.ontology_version_id and r.ontology_version_id != ontology_version_id:
                # Incompatible ontology version
                errors.append(
                    f"Revision '{r.id}' uses ontology version '{r.ontology_version_id}', "
                    f"incompatible with snapshot ontology version '{ontology_version_id}'."
                )

        return (len(errors) == 0, errors)
