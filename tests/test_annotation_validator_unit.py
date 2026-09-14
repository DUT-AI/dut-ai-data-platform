import pytest
from core.exceptions import BadRequestException
from modules.annotation.services.annotation_validator import AnnotationValidator
from modules.ontology.domain.entities import (
    CategoryEntity,
    OntologyEntity,
    OntologyOutputEntity,
    OntologyVersionEntity,
    OntologyVersionOutputCategoryEntity,
    OntologyVersionOutputEntity,
    OutputDefinitionEntity,
)


def _create_test_ontology_version() -> OntologyVersionEntity:
    onto = OntologyEntity(project_id="proj_1", name="Test Ontology")
    cat_car = CategoryEntity(id="cat_car", ontology_id=onto.id, key="car", name="Car")
    cat_person = CategoryEntity(
        id="cat_person", ontology_id=onto.id, key="person", name="Person"
    )

    out_def = OutputDefinitionEntity(
        id="def_bbox",
        code="bbox",
        name="Bounding Box",
        supports_categories=True,
        default_schema={},
    )
    out_entity = OntologyOutputEntity(
        id="out_1",
        ontology_id=onto.id,
        definition_id=out_def.id,
        name="Objects",
        multiple=True,
        required=True,
        definition=out_def,
        value_schema={
            "type": "object",
            "required": ["x", "y", "width", "height"],
            "properties": {
                "x": {"type": "number"},
                "y": {"type": "number"},
                "width": {"type": "number"},
                "height": {"type": "number"},
            },
        },
    )

    onto_ver = OntologyVersionEntity(
        id="ver_1",
        ontology_id=onto.id,
        version_no=1,
        name="v1",
        status="published",
    )

    link = OntologyVersionOutputEntity(
        ontology_version_id=onto_ver.id,
        ontology_output_id=out_entity.id,
        ontology_input_id="in_1",
        output=out_entity,
        categories=[
            OntologyVersionOutputCategoryEntity(
                ontology_version_id=onto_ver.id,
                ontology_output_id=out_entity.id,
                category_id=cat_car.id,
                category=cat_car,
            ),
            OntologyVersionOutputCategoryEntity(
                ontology_version_id=onto_ver.id,
                ontology_output_id=out_entity.id,
                category_id=cat_person.id,
                category=cat_person,
            ),
        ],
    )
    onto_ver.outputs = [link]
    return onto_ver


def test_validator_valid_bbox_results():
    onto_ver = _create_test_ontology_version()
    results = [
        {
            "output_id": "out_1",
            "category_id": "cat_car",
            "value": {"x": 10.0, "y": 20.0, "width": 30.0, "height": 40.0},
        }
    ]
    extracted = AnnotationValidator.validate_results(results, onto_ver)
    assert extracted == ["cat_car"]


def test_validator_invalid_category_raises_bad_request():
    onto_ver = _create_test_ontology_version()
    results = [
        {
            "output_id": "out_1",
            "category_id": "unknown_cat",
            "value": {"x": 10.0, "y": 20.0, "width": 30.0, "height": 40.0},
        }
    ]
    with pytest.raises(BadRequestException) as exc_info:
        AnnotationValidator.validate_results(results, onto_ver)
    assert "not permitted for this Ontology Version" in str(exc_info.value)


def test_validator_invalid_value_schema_raises_bad_request():
    onto_ver = _create_test_ontology_version()
    # Missing required 'height' in value
    results = [
        {
            "output_id": "out_1",
            "category_id": "cat_person",
            "value": {"x": 10.0, "y": 20.0, "width": 30.0},
        }
    ]
    with pytest.raises(BadRequestException) as exc_info:
        AnnotationValidator.validate_results(results, onto_ver)
    assert "Value violates output schema" in str(exc_info.value)
