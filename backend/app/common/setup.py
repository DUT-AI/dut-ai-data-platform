from dishka import make_async_container
from dishka.integrations.fastapi import setup_dishka

from app.auth.infrastructure.di import AuthProvider
from app.common.database import DatabaseProvider
from app.ontology.infrastructure.di import OntologyProvider
from app.project.infrastructure.di import ProjectProvider


def setup_di(app):
    """Sets up Dishka dependency injection container and binds it to the FastAPI app."""
    container = make_async_container(
        DatabaseProvider(),
        AuthProvider(),
        ProjectProvider(),
        OntologyProvider(),
    )

    app.state.dishka_container = container
    setup_dishka(container, app)
