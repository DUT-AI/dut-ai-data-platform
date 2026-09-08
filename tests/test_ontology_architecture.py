from pathlib import Path

ONTOLOGY_ROOT = Path(__file__).parents[1] / "modules" / "ontology"
API_ROOT = Path(__file__).parents[1] / "apps" / "api"


def _python_sources(folder: str) -> list[Path]:
    return list((ONTOLOGY_ROOT / folder).glob("*.py"))


def test_use_cases_depend_on_domain_interfaces_not_infrastructure() -> None:
    forbidden_imports = (
        "modules.ontology.models",
        "modules.ontology.repository",
        "sqlalchemy",
    )

    for source in _python_sources("use_cases"):
        content = source.read_text(encoding="utf-8")
        for forbidden in forbidden_imports:
            assert forbidden not in content, f"{source.name} imports {forbidden}"


def test_repositories_do_not_depend_on_dtos_or_use_cases() -> None:
    forbidden_imports = (
        "modules.ontology.dtos",
        "modules.ontology.use_cases",
        "apps.api",
    )

    for source in _python_sources("repository"):
        content = source.read_text(encoding="utf-8")
        for forbidden in forbidden_imports:
            assert forbidden not in content, f"{source.name} imports {forbidden}"


def test_primary_repository_implementations_are_split_by_aggregate() -> None:
    expected = {
        "ontology_repository.py": "class SqlOntologyRepository",
        "ontology_version_repository.py": "class SqlOntologyVersionRepository",
        "input_definition_repository.py": "class SqlInputDefinitionRepository",
        "output_definition_repository.py": "class SqlOutputDefinitionRepository",
        "ontology_input_repository.py": "class SqlOntologyInputRepository",
        "ontology_output_repository.py": "class SqlOntologyOutputRepository",
        "category_repository.py": "class SqlCategoryRepository",
    }

    for filename, class_declaration in expected.items():
        content = (ONTOLOGY_ROOT / "repository" / filename).read_text(encoding="utf-8")
        assert content.count("class Sql") == 1
        assert class_declaration in content


def test_ontology_routes_and_access_policy_have_clear_ownership() -> None:
    route_package = API_ROOT / "routers" / "ontology"
    assert {source.name for source in route_package.glob("*.py")} == {
        "__init__.py",
        "categories.py",
        "definitions.py",
        "inputs.py",
        "ontologies.py",
        "outputs.py",
        "versions.py",
    }
    assert not (API_ROOT / "routers" / "_ontology_access.py").exists()

    policy = (API_ROOT / "deps" / "ontology.py").read_text(encoding="utf-8")
    assert "require_ontology_read" in policy
    assert "require_ontology_write" in policy
    assert "require_ontology_catalog_write" in policy
    assert '"viewer"' not in policy
