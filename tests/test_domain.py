from core.exceptions import DomainException, NotFoundException
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
    assert exc.status_code == 404
    assert isinstance(exc, DomainException)
