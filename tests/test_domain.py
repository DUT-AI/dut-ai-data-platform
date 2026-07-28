from domain.exceptions import AppException, NotFoundException
from domain.value_objects.pagination import PaginatedResult, PaginationParams
from shared.utils.id_generator import generate_ulid


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
    assert isinstance(exc, AppException)


def test_pagination_params():
    params = PaginationParams(page=2, page_size=15)
    assert params.offset == 15


def test_paginated_result():
    res = PaginatedResult[str](items=["a", "b"], total=25, page=2, page_size=10)
    assert res.total_pages == 3
    assert res.has_next is True
    assert res.has_prev is True
