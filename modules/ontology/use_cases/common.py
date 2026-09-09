from core.exceptions import ConflictException, NotFoundException
from modules.ontology.domain.entities import OntologyEntity
from modules.ontology.domain.interfaces import IOntologyRepository


async def require_ontology(
    repo: IOntologyRepository, project_id: str, ontology_id: str
) -> OntologyEntity:
    entity = await repo.get(ontology_id)
    if entity is None or entity.project_id != project_id:
        raise NotFoundException("Ontology không tồn tại trong Project này.")
    return entity


def require_unlocked(locked: bool, kind: str) -> None:
    if locked:
        raise ConflictException(
            f"{kind} đã được dùng trong Published Version; hãy tạo node mới để thay đổi."
        )
