import io
import pytest
from PIL import Image
from modules.dataset.services.metadata_extractor import AssetMetadataExtractor


def test_extract_metadata_valid_image():
    # Create a simple valid 10x10 PNG image in memory
    img_byte_arr = io.BytesIO()
    image = Image.new("RGB", (10, 10), color="red")
    image.save(img_byte_arr, format="PNG")
    content = img_byte_arr.getvalue()

    mime_type, metadata = AssetMetadataExtractor.extract_metadata(
        "test.png", content, "image/png"
    )

    assert mime_type == "image/png"
    assert metadata["width"] == 10
    assert metadata["height"] == 10
    assert metadata["format"] == "PNG"


def test_extract_metadata_corrupted_image_raises_value_error():
    corrupted_content = b"This is random garbage text and not a real image binary data."

    with pytest.raises(ValueError, match="bị hỏng hoặc không đúng định dạng"):
        AssetMetadataExtractor.extract_metadata(
            "corrupted.jpg", corrupted_content, "image/jpeg"
        )


def test_extract_metadata_corrupted_image_extension_raises_value_error():
    corrupted_content = b"Invalid bytes"

    with pytest.raises(ValueError, match="bị hỏng hoặc không đúng định dạng"):
        AssetMetadataExtractor.extract_metadata(
            "fake_photo.png", corrupted_content, "application/octet-stream"
        )
