"""OpenAPI document used as the frontend API contract (specs/004-api-contract-typegen).

FastAPI marks every field that has a default as optional, in response schemas too.
This API always serializes every field of a response model (no
``response_model_exclude_*`` is used), so a field with a default is still always
present in the JSON. For schemas reachable only from responses, every property is
therefore marked required. The generated frontend types then match what the
client actually receives, instead of forcing ``?? fallback`` on data that is
always there. Schemas also used by request bodies or parameters keep FastAPI's
default, because there a default really means "may be omitted".
"""

from typing import Any

from fastapi import FastAPI


def _collect_refs(node: Any, schemas: dict[str, Any], acc: set[str]) -> None:
    if isinstance(node, dict):
        ref = node.get("$ref")
        if isinstance(ref, str) and ref.startswith("#/components/schemas/"):
            name = ref.rsplit("/", 1)[-1]
            if name not in acc:
                acc.add(name)
                _collect_refs(schemas.get(name, {}), schemas, acc)
        for value in node.values():
            _collect_refs(value, schemas, acc)
    elif isinstance(node, list):
        for item in node:
            _collect_refs(item, schemas, acc)


def mark_response_fields_required(spec: dict[str, Any]) -> dict[str, Any]:
    schemas: dict[str, Any] = spec.get("components", {}).get("schemas", {})
    response_refs: set[str] = set()
    request_refs: set[str] = set()

    for operations in spec.get("paths", {}).values():
        for operation in operations.values():
            for code, response in operation.get("responses", {}).items():
                if code.startswith("2"):
                    _collect_refs(response, schemas, response_refs)
            _collect_refs(operation.get("requestBody", {}), schemas, request_refs)
            _collect_refs(operation.get("parameters", []), schemas, request_refs)

    for name in sorted(response_refs - request_refs):
        properties = schemas[name].get("properties")
        if properties:
            schemas[name]["required"] = list(properties)
    return spec


def install_contract_openapi(app: FastAPI) -> None:
    """Wrap ``app.openapi`` so /openapi.json and the exported file are identical."""
    default_openapi = app.openapi

    def contract_openapi() -> dict[str, Any]:
        if app.openapi_schema:
            return app.openapi_schema
        app.openapi_schema = mark_response_fields_required(default_openapi())
        return app.openapi_schema

    app.openapi = contract_openapi  # type: ignore[method-assign]
