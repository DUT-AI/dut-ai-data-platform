import os
import sys

from fastapi import FastAPI
from loguru import logger
from opentelemetry import trace
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter


def setup_telemetry(app: FastAPI, service_name: str = "dut-ai-data-platform") -> None:
    """Initialize OpenTelemetry tracer provider and instrument FastAPI."""
    try:
        # Skip telemetry during unit/integration test runs to avoid I/O error on closed stdout
        if "pytest" in sys.modules or os.getenv("TESTING") == "true":
            logger.info("Skipping OpenTelemetry export during test runs")
            return

        resource = Resource.create(
            attributes={
                "service.name": service_name,
                "service.version": "0.1.0",
                "environment": os.getenv("ENVIRONMENT", "development"),
            }
        )

        provider = TracerProvider(resource=resource)

        # Attempt to load OTLP Exporter if configured, otherwise use ConsoleSpanExporter in dev if enabled
        otlp_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
        if otlp_endpoint:
            try:
                from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import (
                    OTLPSpanExporter,
                )

                exporter = OTLPSpanExporter(endpoint=otlp_endpoint, insecure=True)
                provider.add_span_processor(BatchSpanProcessor(exporter))
                logger.info(f"OpenTelemetry OTLP Exporter enabled -> {otlp_endpoint}")
            except Exception as e:
                logger.warning(f"Failed to initialize OTLPSpanExporter: {e}")
                if os.getenv("ENABLE_OTEL_CONSOLE", "false").lower() == "true":
                    provider.add_span_processor(
                        BatchSpanProcessor(ConsoleSpanExporter())
                    )
        else:
            # Console Exporter for local debugging (disabled by default to avoid console pollution)
            if os.getenv("ENABLE_OTEL_CONSOLE", "false").lower() == "true":
                provider.add_span_processor(BatchSpanProcessor(ConsoleSpanExporter()))
                logger.info("OpenTelemetry Console Span Exporter enabled for local dev")
            else:
                logger.debug(
                    "OpenTelemetry Console Span Exporter is disabled (set ENABLE_OTEL_CONSOLE=true to enable)"
                )

        trace.set_tracer_provider(provider)

        # Auto-instrument FastAPI
        FastAPIInstrumentor.instrument_app(
            app,
            tracer_provider=provider,
            excluded_urls="health,ready,metrics",
        )
        logger.info("FastAPI OpenTelemetry instrumentation initialized successfully")

    except Exception as exc:
        logger.warning(f"Skipping OpenTelemetry initialization: {exc}")
