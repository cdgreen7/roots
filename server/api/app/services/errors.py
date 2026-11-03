"""
Errors the service layer raises. The API layer turns each one into an HTTP status code (see app/main.py).
"""


class ServiceError(Exception):
    """Base class; the message is safe to show to the user."""


class Invalid(ServiceError):
    """The request is well formed but can't be done as asked (HTTP 422)."""


class Unauthorized(ServiceError):
    """Missing, wrong, or expired login (HTTP 401)."""


class NotFound(ServiceError):
    """The thing doesn't exist, or the user isn't allowed to see it (HTTP 404)."""


class Conflict(ServiceError):
    """The request clashes with the current state, such as a taken email or an offline board (HTTP 409)."""


class Unavailable(ServiceError):
    """A service the request needs, such as the MQTT broker, is down (HTTP 503)."""
