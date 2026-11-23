"""
Dependencies shared by the routers: the database pool, the MQTT bridge, and the logged-in user.
Use them as parameter types, for example `async def endpoint(pool: Pool, user_id: CurrentUser)`.
"""
from typing import Annotated
from uuid import UUID

import asyncpg
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from ..mqtt_bridge import MqttBridge
from ..services import auth
from ..services.errors import Unauthorized

_bearer = HTTPBearer(auto_error=False)


def _pool(request: Request) -> asyncpg.Pool:
    """
    _pool returns the database pool main.py opened at startup.
    """
    return request.app.state.pool


def _bridge(request: Request) -> MqttBridge:
    """
    _bridge returns the MQTT bridge main.py started at startup.
    """
    return request.app.state.bridge


def _current_user(credentials: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> UUID:
    """
    _current_user returns the id of the user whose token is in the Authorization header.
    Raises Unauthorized if there is no token, or it is invalid or expired.
    """
    if credentials is None:
        raise Unauthorized("Not logged in")
    return auth.user_id_from_token(credentials.credentials)


# Shorthand parameter types. FastAPI fills each one in by calling the function above for every request.
Pool = Annotated[asyncpg.Pool, Depends(_pool)]
Bridge = Annotated[MqttBridge, Depends(_bridge)]
CurrentUser = Annotated[UUID, Depends(_current_user)]
