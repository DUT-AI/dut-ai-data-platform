class AppException(Exception):
    """Base Application & Domain Exception."""

    status_code: int = 500
    message: str = "An unexpected error occurred"

    def __init__(
        self, message: str | None = None, status_code: int | None = None
    ) -> None:
        super().__init__(message or self.message)
        if message is not None:
            self.message = message
        if status_code is not None:
            self.status_code = status_code


class NotFoundException(AppException):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, 404)


class UnauthorizedException(AppException):
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(message, 401)


class ForbiddenException(AppException):
    def __init__(self, message: str = "Forbidden"):
        super().__init__(message, 403)


class ConflictException(AppException):
    def __init__(self, message: str = "Resource conflict occurred"):
        super().__init__(message, 409)


class BadRequestException(AppException):
    def __init__(self, message: str = "Bad request"):
        super().__init__(message, 400)
