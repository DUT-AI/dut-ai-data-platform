# Ontology Rules

## Actual system model

A project has one official Ontology. It contains reusable Input, Output, and Category catalog entities. An Ontology Version composes them into an ordered contract:

`Input (image/tabular/video/audio/document/object/link) → Output (classification/bounding_box/polygon/keypoint/video_segment/audio_segment/text/named_entity/relation/number/custom_object) → optional Categories`

Input defines scope (`ONE_ITEM` or `MANY_ITEMS`) and allowed extensions/item schema. The global `InputDefinition.allowed_formats` is the supported-format ceiling; the Input node's `input_schema.allowed_extensions` is the selected subset for that ontology contract. Output defines required/multiple/value schema and links to exactly one input. Categories are allowed only when the output definition supports them.

## Lifecycle and UI

- Preserve the production connected-canvas editor as the primary editing surface. Its node creation/editing, drag behavior, visible links, connect/disconnect controls, presets, validation, version actions, and schema export are product capabilities.

- Only one Draft version may exist. A Draft may be created from a Published version.
- Draft is editable. Published is immutable.
- Validation requires at least one input and output, valid same-ontology links, supported formats, and categories where required.
- Publish is a deliberate confirmation step. Successful publish creates the canonical export and `schema_hash`; show its time and immutable state.
- Annotation and export screens must display the bound ontology version/hash so users know which contract produced the data.
- Render only the selected version's composition. Layout order: version selector and lifecycle → validation status → connected Input → Output → Category graph → schema metadata and export.
- Show accepted file extensions on the Input node and in its Draft editor. Do not confuse input formats with export formats such as COCO, YOLO, Pascal VOC, CSV, or JSONL; export format belongs to the export workflow.
- “Create version” opens an in-app dialog. Explain whether it starts empty or derives from a Published version. If a Draft already exists, disable creation and explain that only one Draft is allowed.
- Category color is stable metadata, not status. Never let color alone carry meaning.
