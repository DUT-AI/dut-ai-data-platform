from domain.interfaces.base_repository import BaseRepository
from domain.interfaces.ontology_repository import IOntologyRepository
from domain.interfaces.project_repository import IProjectRepository
from domain.interfaces.storage import IStorageProvider

__all__ = [
    "BaseRepository",
    "IOntologyRepository",
    "IProjectRepository",
    "IStorageProvider",
]
