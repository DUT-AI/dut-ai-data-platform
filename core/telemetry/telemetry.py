import logging
import os
import sys

from fastapi import FastAPI
from loguru import logger
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import (
    OTLPSpanExporter,
)
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor


class InterceptHandler(logging.Handler):
    def emit(self, record: logging.LogRecord) -> None:
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno

        frame, depth = logging.currentframe(), 2
        while frame.f_back and frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back
            depth += 1

        logger.opt(depth=depth, exception=record.exc_info).log(
            level, record.getMessage()
        )


def setup_telemetry(app: FastAPI, service_name: str = "dut-ai-data-platform") -> None:
    # 1. Setup Loguru & Intercept standard logging
    logging.root.handlers = [InterceptHandler()]
    logging.root.setLevel(logging.INFO)

    for _log in ["uvicorn", "uvicorn.error", "fastapi"]:
        _logger = logging.getLogger(_log)
        _logger.handlers = [InterceptHandler()]
        _logger.propagate = False

    logger.configure(
        handlers=[
            {
                "sink": sys.stdout,
                "format": "<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
            }
        ]
    )

    # 2. Setup OpenTelemetry Tracing
    from core.config import app_settings

    otlp_endpoint = app_settings.otel_exporter_otlp_endpoint or os.getenv(
        "OTEL_EXPORTER_OTLP_ENDPOINT"
    )
    if otlp_endpoint:
        resource = Resource.create({"service.name": service_name})
        provider = TracerProvider(resource=resource)
        processor = BatchSpanProcessor(
            OTLPSpanExporter(endpoint=otlp_endpoint, insecure=True)
        )
        provider.add_span_processor(processor)
        trace.set_tracer_provider(provider)

        FastAPIInstrumentor.instrument_app(app, tracer_provider=provider)
        logger.info(f"OpenTelemetry Tracing enabled -> {otlp_endpoint}")
    else:
        logger.info(
            "OTEL_EXPORTER_OTLP_ENDPOINT not set. OpenTelemetry Tracing is disabled."
        )
