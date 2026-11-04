from core.exceptions import DomainException, EntityNotFoundError, NotFoundException
from core.exceptions.handlers import get_status_code_for_exception
from core.utils.id_generator import generate_ulid


def test_ulid_generator():
    ulid1 = generate_ulid()
    ulid2 = generate_ulid()
    assert isinstance(ulid1, str)
    assert len(ulid1) == 26
    assert ulid1 != ulid2


def test_domain_exceptions():
    exc = NotFoundException("Project with id '01HXXXXX' was not found.")
    assert "Project" in str(exc)
    assert not hasattr(exc, "status_code")
    assert isinstance(exc, DomainException)
    assert isinstance(exc, EntityNotFoundError)
    assert get_status_code_for_exception(exc) == 404
