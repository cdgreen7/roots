"""
Errors the service layer raises. The API layer turns each one into an HTTP status code (see app/main.py).
"""


class ServiceError(Exception):
    """
    ServiceError is the base class for every service-layer error. The message is safe to show to the user.
    """


class Invalid(ServiceError):
    """
    Invalid means the request is well formed but can't be done as asked (HTTP 422).
    """


class Unauthorized(ServiceError):
    """
    Unauthorized means the login is missing, wrong, or expired (HTTP 401).
    """


class NotFound(ServiceError):
    """
    NotFound means the thing doesn't exist, or the user isn't allowed to see it (HTTP 404).
    """


class Conflict(ServiceError):
    """
    Conflict means the request clashes with the current state, such as a taken email or an offline board (HTTP 409).
    """


class Unavailable(ServiceError):
    """
    Unavailable means a service the request needs, such as the MQTT broker, is down (HTTP 503).
    """
