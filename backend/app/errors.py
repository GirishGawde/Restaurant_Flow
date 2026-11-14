"""
app/errors.py
Owner: Girish (Module 1 - Admin & Auth)

Custom API exception class, helper factory functions for standard HTTP error statuses,
and Flask error handlers returning uniform JSON error responses:
{"error": {"code": "...", "message": "...", ...extra}}
"""

from flask import jsonify
from werkzeug.exceptions import HTTPException


class ApiError(Exception):
    """
    Standard exception for REST API errors.

    :param code: Machine-readable error code string (e.g. 'UNAUTHORIZED', 'VERSION_CONFLICT')
    :param message: Human-readable message explaining the problem
    :param status_code: HTTP response status code (e.g. 400, 401, 403, 404, 409, 422, 500)
    :param extra: Optional dictionary of additional fields (e.g. current_version, locked_by)
    """

    def __init__(self, code, message, status_code=400, extra=None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.extra = extra or {}

    def to_dict(self):
        payload = {
            "code": self.code,
            "message": self.message,
        }
        if self.extra:
            payload.update(self.extra)
        return {"error": payload}


# =====================================================================
# Helper constructors for standard errors
# =====================================================================

def bad_request(message="Bad request", code="BAD_REQUEST", extra=None):
    """400 Bad Request."""
    return ApiError(code=code, message=message, status_code=400, extra=extra)


def unauthorized(message="Authentication required", code="UNAUTHORIZED", extra=None):
    """401 Unauthorized - not logged in or invalid token."""
    return ApiError(code=code, message=message, status_code=401, extra=extra)


def forbidden(message="Access denied for your role", code="FORBIDDEN", extra=None):
    """403 Forbidden - logged in but insufficient role/permissions."""
    return ApiError(code=code, message=message, status_code=403, extra=extra)


def not_found(message="Resource not found", code="NOT_FOUND", extra=None):
    """404 Not Found."""
    return ApiError(code=code, message=message, status_code=404, extra=extra)


def conflict(message="Conflict occurred", code="CONFLICT", extra=None):
    """409 General Conflict."""
    return ApiError(code=code, message=message, status_code=409, extra=extra)


def version_conflict(current_version, message="Order was changed by another user"):
    """409 Conflict: Optimistic concurrency check failed."""
    return ApiError(
        code="VERSION_CONFLICT",
        message=message,
        status_code=409,
        extra={"current_version": current_version},
    )


def lock_timeout(locked_by, locked_at, message="Order is currently locked by another user"):
    """409 Conflict: Row is locked by another transaction."""
    return ApiError(
        code="LOCK_TIMEOUT",
        message=message,
        status_code=409,
        extra={"locked_by": locked_by, "locked_at": locked_at},
    )


def already_paid(closed_by=None, closed_at=None, message="Bill has already been paid and closed"):
    """409 Conflict: Bill already paid."""
    extra = {}
    if closed_by:
        extra["closed_by"] = closed_by
    if closed_at:
        extra["closed_at"] = closed_at
    return ApiError(
        code="ALREADY_PAID",
        message=message,
        status_code=409,
        extra=extra,
    )


def validation_error(message="Validation failed", code="VALIDATION_ERROR", extra=None):
    """422 Unprocessable Entity - validation error (e.g. split amounts don't match total)."""
    return ApiError(code=code, message=message, status_code=422, extra=extra)


# =====================================================================
# Flask error handler registration
# =====================================================================

def register_error_handlers(app):
    """Register uniform JSON error handlers on the Flask application."""

    @app.errorhandler(ApiError)
    def handle_api_error(err):
        return jsonify(err.to_dict()), err.status_code

    @app.errorhandler(HTTPException)
    def handle_http_exception(err):
        code_name = err.name.upper().replace(" ", "_")
        return (
            jsonify({"error": {"code": code_name, "message": err.description}}),
            err.code,
        )

    @app.errorhandler(Exception)
    def handle_unexpected_exception(err):
        # 500 Unexpected Server Error
        app.logger.exception("Unexpected server error: %s", err)
        return (
            jsonify(
                {
                    "error": {
                        "code": "INTERNAL_SERVER_ERROR",
                        "message": "An unexpected server error occurred.",
                    }
                }
            ),
            500,
        )
