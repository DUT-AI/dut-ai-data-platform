from dishka import make_async_container
from dishka.integrations.fastapi import setup_dishka

from app.annotation.infrastructure.di import AnnotationProvider
from app.auth.infrastructure.di import AuthProvider
from app.common.clients import StorageClientProvider
from app.common.database import DatabaseProvider
from app.dataset.infrastructure.di import DatasetProvider
from app.ontology.infrastructure.di import OntologyProvider
from app.project.infrastructure.di import ProjectProvider


def setup_di(app):
    """Sets up Dishka dependency injection container and binds it to the FastAPI app."""
    container = make_async_container(
        DatabaseProvider(),
        AuthProvider(),
        ProjectProvider(),
        OntologyProvider(),
        DatasetProvider(),
        AnnotationProvider(),
        StorageClientProvider(),
    )

    app.state.dishka_container = container
    setup_dishka(container, app)
