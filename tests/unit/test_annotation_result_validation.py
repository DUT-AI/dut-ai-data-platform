"""Rules of annotation results vs. an Ontology Version (spec 002)."""

from dataclasses import dataclass, field
from typing import Any

import pytest

from core.exceptions import NotFoundException
from modules.annotation.domain.exceptions import AnnotationValidationError
from modules.annotation.domain.result_validation import validate_annotation_results
from modules.annotation.services.annotation_validator import load_annotatable_version
from modules.ontology.domain.catalog import OUTPUT_DEFINITIONS
from modules.ontology.domain.entities import (
    CategoryEntity,
    OntologyEntity,
    OntologyOutputEntity,
    OntologyVersionEntity,
    OntologyVersionOutputCategoryEntity,
    OntologyVersionOutputEntity,
    OutputDefinitionEntity,
)

ONTOLOGY_ID = "onto_1"
_CATALOG = {
    code: (supports, schema) for code, _, _, supports, schema in OUTPUT_DEFINITIONS
}


@dataclass
class OutputSpec:
    id: str
    code: str
    input_id: str = "in_image"
    multiple: bool = True
    required: bool = False
    categories: list[str] = field(default_factory=list)
    value_schema: dict[str, Any] | None = None


def _version(*specs: OutputSpec, status: str = "published") -> OntologyVersionEntity:
    version = OntologyVersionEntity(
        id="ver_1", ontology_id=ONTOLOGY_ID, version_no=1, name="v1", status=status
    )
    for spec in specs:
        supports, default_schema = _CATALOG.get(spec.code, (False, {}))
        output = OntologyOutputEntity(
            id=spec.id,
            ontology_id=ONTOLOGY_ID,
            definition_id=f"def_{spec.code}",
            name=spec.id,
            multiple=spec.multiple,
            required=spec.required,
            value_schema=spec.value_schema,
            definition=OutputDefinitionEntity(
                id=f"def_{spec.code}",
                code=spec.code,
                name=spec.code,
                supports_categories=supports,
                default_schema=default_schema,
            ),
        )
        version.outputs.append(
            OntologyVersionOutputEntity(
                ontology_version_id=version.id,
                ontology_output_id=output.id,
                ontology_input_id=spec.input_id,
                output=output,
                categories=[
                    OntologyVersionOutputCategoryEntity(
                        ontology_version_id=version.id,
                        ontology_output_id=output.id,
                        category_id=category_id,
                        category=CategoryEntity(
                            id=category_id,
                            ontology_id=ONTOLOGY_ID,
                            key=category_id,
                            name=category_id,
                        ),
                    )
                    for category_id in spec.categories
                ],
            )
        )
    return version


BOX = {"x": 0.1, "y": 0.2, "width": 0.3, "height": 0.4}


def _codes(results: list[Any], version: OntologyVersionEntity) -> list[str]:
    return [
        issue.code for issue in validate_annotation_results(results, version).issues
    ]


# --- Output resolution -------------------------------------------------------


def test_editor_bbox_alias_resolves_to_bounding_box_output() -> None:
    version = _version(OutputSpec("out_box", "bounding_box", categories=["car"]))
    report = validate_annotation_results(
        [{"result_type": "bbox", "category_id": "car", "geometry": BOX}], version
    )
    assert report.is_valid
    assert report.category_ids == ["car"]


def test_result_type_without_matching_output_is_rejected_instead_of_fallback() -> None:
    version = _version(OutputSpec("out_box", "bounding_box", categories=["car"]))
    points = [[0.1, 0.1], [0.2, 0.1], [0.2, 0.2]]
    results = [
        {"result_type": "polygon", "category_id": "car", "geometry": {"points": points}}
    ]
    assert _codes(results, version) == ["unknown_output"]


def test_unknown_output_id_is_rejected() -> None:
    version = _version(OutputSpec("out_box", "bounding_box", categories=["car"]))
    results = [{"output_id": "out_other", "category_id": "car", "geometry": BOX}]
    assert _codes(results, version) == ["unknown_output"]


def test_two_outputs_of_same_type_need_output_id() -> None:
    version = _version(
        OutputSpec("out_a", "bounding_box", categories=["car"]),
        OutputSpec("out_b", "bounding_box", categories=["car"]),
    )
    result = {"result_type": "bbox", "category_id": "car", "geometry": BOX}
    assert _codes([result], version) == ["ambiguous_output"]
    assert _codes([{**result, "output_id": "out_b"}], version) == []


def test_result_without_output_id_or_type_is_rejected() -> None:
    version = _version(OutputSpec("out_text", "text", input_id="in_doc"))
    assert _codes([{"value": "hello"}], version) == ["output_required"]


def test_result_type_wins_over_primary_output_id_stamped_by_editor() -> None:
    """Audio editor stamps the segment output id on transcripts too."""
    version = _version(
        OutputSpec(
            "out_seg", "audio_segment", input_id="in_audio", categories=["speech"]
        ),
        OutputSpec("out_asr", "text", input_id="in_audio"),
    )
    results = [
        {
            "output_id": "out_seg",
            "result_type": "audio_segment",
            "category_id": "speech",
            "value": "",
            "geometry": {"start": 0.0, "end": 1.5},
        },
        {"output_id": "out_seg", "result_type": "text", "value": "xin chào"},
    ]
    assert _codes(results, version) == []


def test_legacy_result_type_falls_back_to_output_id() -> None:
    version = _version(OutputSpec("out_cls", "classification", categories=["a"]))
    results = [
        {"output_id": "out_cls", "result_type": "table_cell", "category_id": "a"}
    ]
    assert _codes(results, version) == []


def test_non_object_result_is_rejected() -> None:
    version = _version(OutputSpec("out_text", "text"))
    assert _codes(["oops"], version) == ["invalid_result"]


# --- Categories --------------------------------------------------------------


def test_category_required_for_labelled_outputs() -> None:
    version = _version(OutputSpec("out_box", "bounding_box", categories=["car"]))
    results = [{"result_type": "bbox", "category_id": None, "geometry": BOX}]
    assert _codes(results, version) == ["category_required"]


def test_category_must_be_linked_to_that_output() -> None:
    version = _version(
        OutputSpec("out_box", "bounding_box", categories=["car"]),
        OutputSpec("out_cls", "classification", categories=["day"]),
    )
    results = [{"result_type": "bbox", "category_id": "day", "geometry": BOX}]
    assert _codes(results, version) == ["category_not_allowed"]


def test_outputs_without_category_support_reject_category() -> None:
    version = _version(OutputSpec("out_text", "text"))
    results = [{"result_type": "text", "category_id": "car", "value": "x"}]
    assert _codes(results, version) == ["categories_not_supported"]


def test_tabular_multi_label_checks_every_category_in_value() -> None:
    version = _version(OutputSpec("out_cls", "classification", categories=["a", "b"]))
    geometry = {"record_key": "r1", "key_field": "id"}
    ok = [
        {
            "output_id": "out_cls",
            "result_type": "classification",
            "category_id": "a",
            "value": ["a", "b"],
            "geometry": geometry,
        }
    ]
    report = validate_annotation_results(ok, version)
    assert report.is_valid and report.category_ids == ["a", "b"]

    bad = [{**ok[0], "value": ["a", "zzz"]}]
    assert _codes(bad, version) == ["category_not_allowed"]


# --- Value schema ------------------------------------------------------------


def test_custom_value_schema_is_enforced() -> None:
    schema = {
        "type": "object",
        "required": ["score"],
        "properties": {"score": {"type": "number"}},
    }
    version = _version(OutputSpec("out_obj", "custom_object", value_schema=schema))
    assert _codes([{"output_id": "out_obj", "value": {"score": 1}}], version) == []
    assert _codes([{"output_id": "out_obj", "value": {}}], version) == [
        "value_schema_violation"
    ]


def test_broken_value_schema_is_reported_not_raised() -> None:
    version = _version(
        OutputSpec("out_obj", "custom_object", value_schema={"type": "nope"})
    )
    assert _codes([{"output_id": "out_obj", "value": {}}], version) == [
        "invalid_value_schema"
    ]


def test_seeded_default_schema_copy_is_not_a_constraint() -> None:
    """Template seeder copies default_schema into value_schema (audio sends value "")."""
    _, default_schema = _CATALOG["audio_segment"]
    version = _version(
        OutputSpec(
            "out_seg",
            "audio_segment",
            categories=["speech"],
            value_schema=default_schema,
        )
    )
    results = [
        {
            "output_id": "out_seg",
            "result_type": "audio_segment",
            "category_id": "speech",
            "value": "",
            "geometry": {"start": 0, "end": 1},
        }
    ]
    assert _codes(results, version) == []


# --- Geometry ----------------------------------------------------------------


@pytest.mark.parametrize(
    ("code", "result", "expected"),
    [
        ("bounding_box", {"result_type": "bbox"}, "geometry_required"),
        (
            "bounding_box",
            {"result_type": "bbox", "geometry": {"x": 1, "y": 1, "width": 1}},
            "geometry_invalid",
        ),
        (
            "polygon",
            {"result_type": "polygon", "geometry": {"points": [[0, 0], [1, 1]]}},
            "geometry_invalid",
        ),
        (
            "keypoint",
            {"result_type": "keypoint", "geometry": {"x": "1", "y": 2}},
            "geometry_invalid",
        ),
        (
            "video_segment",
            {"result_type": "video_segment", "geometry": {"start": 2, "end": 2}},
            "geometry_invalid",
        ),
        (
            "named_entity",
            {"result_type": "ner", "geometry": {"start": 5, "end": 1, "text": "x"}},
            "geometry_invalid",
        ),
    ],
)
def test_geometry_rules(code: str, result: dict[str, Any], expected: str) -> None:
    version = _version(OutputSpec("out", code, categories=["c"]))
    assert _codes([{**result, "category_id": "c"}], version) == [expected]


def test_polygon_points_in_value_are_accepted() -> None:
    version = _version(OutputSpec("out_poly", "polygon", categories=["c"]))
    results = [
        {
            "result_type": "polygon",
            "category_id": "c",
            "value": {"type": "polygon", "points": [[0, 0], [1, 0], [1, 1]]},
        }
    ]
    assert _codes(results, version) == []


# --- multiple / required ------------------------------------------------------


def test_single_output_allows_one_result_per_item() -> None:
    version = _version(
        OutputSpec("out_cls", "classification", multiple=False, categories=["a", "b"])
    )
    two_on_asset = [
        {"output_id": "out_cls", "result_type": "classification", "category_id": "a"},
        {"output_id": "out_cls", "result_type": "classification", "category_id": "b"},
    ]
    report = validate_annotation_results(two_on_asset, version)
    assert [issue.code for issue in report.issues] == ["multiple_not_allowed"]
    assert report.issues[0].path == "outputs.out_cls"

    one_per_record = [
        {**two_on_asset[0], "geometry": {"record_key": "r1"}},
        {**two_on_asset[1], "geometry": {"record_key": "r2"}},
    ]
    assert _codes(one_per_record, version) == []


def test_required_output_missing_for_labelled_input() -> None:
    version = _version(
        OutputSpec("out_box", "bounding_box", categories=["car"]),
        OutputSpec("out_scene", "classification", required=True, categories=["day"]),
        OutputSpec(
            "out_row",
            "classification",
            input_id="in_table",
            required=True,
            categories=["x"],
        ),
    )
    results = [{"result_type": "bbox", "category_id": "car", "geometry": BOX}]
    # out_scene reads the same input -> required; out_row reads another input -> not.
    assert _codes(results, version) == ["required_output_missing"]
    assert _codes([], version) == []


def test_all_issues_are_collected() -> None:
    version = _version(OutputSpec("out_box", "bounding_box", categories=["car"]))
    results = [
        {"result_type": "bbox", "category_id": "nope", "geometry": BOX},
        {"result_type": "bbox", "category_id": "car"},
        {"result_type": "polygon"},
    ]
    report = validate_annotation_results(results, version)
    assert [(issue.path, issue.code) for issue in report.issues] == [
        ("results.0.category_id", "category_not_allowed"),
        ("results.1.geometry", "geometry_required"),
        ("results.2.result_type", "unknown_output"),
    ]


# --- Version guard ------------------------------------------------------------


class FakeOntologyRepo:
    def __init__(self, version: OntologyVersionEntity | None, project_id: str) -> None:
        self.version = version
        self.ontology = OntologyEntity(id=ONTOLOGY_ID, project_id=project_id, name="o")

    async def get_version_by_id(self, version_id: str) -> OntologyVersionEntity | None:
        return self.version

    async def get(self, entity_id: str) -> OntologyEntity | None:
        return self.ontology


@pytest.mark.asyncio
async def test_published_version_of_same_project_is_loaded() -> None:
    version = _version(OutputSpec("out_text", "text"))
    loaded = await load_annotatable_version(
        FakeOntologyRepo(version, "prj_1"), "ver_1", "prj_1"
    )
    assert loaded is version


@pytest.mark.asyncio
async def test_draft_version_is_rejected() -> None:
    repo = FakeOntologyRepo(
        _version(OutputSpec("out_text", "text"), status="draft"), "prj_1"
    )
    with pytest.raises(AnnotationValidationError) as exc_info:
        await load_annotatable_version(repo, "ver_1", "prj_1")
    assert exc_info.value.issues[0].code == "version_not_published"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "repo",
    [
        FakeOntologyRepo(None, "prj_1"),
        FakeOntologyRepo(_version(OutputSpec("out_text", "text")), "prj_other"),
    ],
)
async def test_missing_or_foreign_version_is_not_found(repo: FakeOntologyRepo) -> None:
    with pytest.raises(NotFoundException):
        await load_annotatable_version(repo, "ver_1", "prj_1")
