import traceback

from domain.exceptions import AppException
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from loguru import logger
from starlette.status import HTTP_500_INTERNAL_SERVER_ERROR


def setup_exception_handlers(app: FastAPI):
    """Configures global exception handlers for the FastAPI application."""

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        logger.warning(
            f"AppException: {exc.status_code} {exc.message} | "
            f"Path: {request.url.path} | Method: {request.method}"
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "is_success": False,
                "status_code": exc.status_code,
                "detail": exc.message,
            },
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        logger.warning(
            f"HTTPException: {exc.status_code} {exc.detail} | "
            f"Path: {request.url.path} | Method: {request.method}"
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "is_success": False,
                "status_code": exc.status_code,
                "detail": exc.detail,
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ):
        logger.error(f"Validation Error: {exc.errors()} | Path: {request.url.path}")
        return JSONResponse(
            status_code=400,
            content={
                "is_success": False,
                "status_code": 400,
                "detail": "Dữ liệu không hợp lệ",
                "errors": exc.errors(),
            },
        )

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error(
            f"Unhandled exception: {exc!s}\n{traceback.format_exc()} | "
            f"Path: {request.url.path}"
        )
        return JSONResponse(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "is_success": False,
                "status_code": HTTP_500_INTERNAL_SERVER_ERROR,
                "detail": "Đã xảy ra lỗi hệ thống nghiêm trọng.",
            },
        )
