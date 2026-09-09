from unittest.mock import AsyncMock, patch

import pytest

from apps.api.health import check_rabbitmq


@pytest.mark.asyncio
@patch("aio_pika.connect_robust", new_callable=AsyncMock)
async def test_check_rabbitmq_success(mock_connect):
    mock_connection = AsyncMock()
    mock_connect.return_value = mock_connection

    ok, msg = await check_rabbitmq()
    assert ok is True
    assert msg == "ok"
    mock_connection.close.assert_called_once()


@pytest.mark.asyncio
@patch("aio_pika.connect_robust", side_effect=Exception("Connection refused"))
async def test_check_rabbitmq_failure(mock_connect):
    ok, msg = await check_rabbitmq()
    assert ok is False
    assert "Connection refused" in msg
