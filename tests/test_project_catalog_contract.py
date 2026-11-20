"""Contract tests: the OpenAPI document is the source of the frontend API types."""

import json

import httpx
import pytest

from apps.api.main import app
from apps.api.openapi_export import main as export_openapi

PROBE_PATHS = {"/health", "/ready"}


@pytest.mark.asyncio
async def test_template_catalog_keeps_catalog_fields():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        list_res = await client.get("/api/v1/project-templates")
        assert list_res.status_code == 200
        templates = list_res.json()
        assert templates, "catalog must not be empty"
        first = templates[0]
        for key in (
            "id",
            "title",
            "group",
            "order",
            "type",
            "modality",
            "tools",
            "labels",
        ):
            assert key in first

        detail_res = await client.get(f"/api/v1/project-templates/{first['id']}")
        assert detail_res.status_code == 200
        assert detail_res.json()["order"] == first["order"]

        # A response carries every DTO field, also the ones filled from a default
        # (default_project_configuration is not in templates.json). This is what
        # makes "required" true for response-only schemas in the contract.
        schema = app.openapi()["components"]["schemas"]["ProjectTemplateResponseDTO"]
        assert set(first) == set(schema["properties"])
        assert set(schema["required"]) == set(schema["properties"])


def test_seeded_input_schema_without_extensions_is_still_served():
    """The template seeder stores only {"type": code}; responses must not 500 on it."""
    from modules.ontology.dtos.ontology_dtos import OntologyInputResponseDTO

    dto = OntologyInputResponseDTO.model_validate(
        {
            "id": "in1",
            "ontology_id": "o1",
            "definition_id": "d1",
            "name": "Image",
            "description": None,
            "scope": "ONE_ITEM",
            "input_schema": {"type": "image"},
        }
    )
    assert dto.model_dump()["input_schema"] == {
        "type": "image",
        "allowed_extensions": [],
        "item": None,
    }


def test_mark_response_fields_required_leaves_request_schemas_alone():
    from apps.api.openapi import mark_response_fields_required

    spec = {
        "paths": {
            "/x": {
                "post": {
                    "requestBody": {
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/In"}
                            }
                        }
                    },
                    "responses": {
                        "201": {
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/Out"}
                                }
                            }
                        }
                    },
                }
            }
        },
        "components": {
            "schemas": {
                "In": {"properties": {"a": {}, "b": {"default": 1}}, "required": ["a"]},
                "Out": {
                    "properties": {
                        "a": {},
                        "nested": {"$ref": "#/components/schemas/Nested"},
                    },
                    "required": ["a"],
                },
                "Nested": {"properties": {"c": {"default": None}}},
            }
        },
    }
    schemas = mark_response_fields_required(spec)["components"]["schemas"]
    assert schemas["In"]["required"] == ["a"]
    assert schemas["Out"]["required"] == ["a", "nested"]
    assert schemas["Nested"]["required"] == ["c"]


def test_every_business_endpoint_declares_a_response_schema(tmp_path, monkeypatch):
    out = tmp_path / "openapi.json"
    monkeypatch.setattr("sys.argv", ["openapi_export", str(out)])
    export_openapi()
    spec = json.loads(out.read_text(encoding="utf-8"))

    untyped = []
    for path, ops in spec["paths"].items():
        if path in PROBE_PATHS:
            continue
        for method, op in ops.items():
            responses = op["responses"]
            typed = any(
                code == "204"
                or responses[code]
                .get("content", {})
                .get("application/json", {})
                .get("schema")
                for code in responses
                if code.startswith("2")
            )
            if not typed:
                untyped.append(f"{method.upper()} {path}")
    assert untyped == []
