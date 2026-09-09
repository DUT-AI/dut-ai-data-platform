"""Fixed Ontology node types shared by seeds and tests."""

INPUT_DEFINITIONS = (
    (
        "image",
        "Image",
        "Một ảnh là dữ liệu đầu vào.",
        ["png", "jpg", "jpeg", "webp", "bmp"],
    ),
    (
        "tabular",
        "Tabular",
        "Một file chứa nhiều bản ghi.",
        ["csv", "xlsx", "jsonl", "parquet"],
    ),
    ("video", "Video", "Dữ liệu video.", ["mp4", "webm", "mov", "avi"]),
    ("audio", "Audio", "Dữ liệu âm thanh.", ["wav", "mp3", "flac", "ogg"]),
    ("document", "Document", "Văn bản hoặc tài liệu.", ["txt", "pdf", "docx", "md"]),
    ("object", "Object", "Object JSON tự định nghĩa.", ["json", "jsonl"]),
    ("link", "Link", "Đường dẫn tới dữ liệu.", ["url"]),
)

OUTPUT_DEFINITIONS = (
    (
        "classification",
        "Classification",
        "Chọn nhãn cho item.",
        True,
        {"type": "string"},
    ),
    (
        "bounding_box",
        "Bounding Box",
        "Hình chữ nhật trên ảnh.",
        True,
        {"type": "object"},
    ),
    ("polygon", "Polygon", "Vùng đa giác.", True, {"type": "object"}),
    ("text", "Text", "Kết quả văn bản.", False, {"type": "string"}),
    (
        "named_entity",
        "Named Entity",
        "Thực thể trong văn bản.",
        True,
        {"type": "object"},
    ),
    ("relation", "Relation", "Quan hệ giữa kết quả.", False, {"type": "object"}),
    ("number", "Number", "Kết quả dạng số.", False, {"type": "number"}),
    (
        "custom_object",
        "Custom Object",
        "Object do người dùng định nghĩa.",
        False,
        {"type": "object"},
    ),
)

__all__ = ["INPUT_DEFINITIONS", "OUTPUT_DEFINITIONS"]
