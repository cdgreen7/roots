"""
Roots API.

The application tier of the architecture: one FastAPI service in three layers.
  API layer         app/api (REST endpoints for the app) and app/mqtt_bridge.py (MQTT for the boards)
  Service layer     app/services (logic: access checks, automation rules, alerts, board commands)
  Data-access layer app/data (SQL against PostgreSQL)
Runs the MQTT bridge in the background alongside the REST endpoints.
"""
import asyncio
import contextlib
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from . import config, data
from .api import auth, control, friends, plants, posts, schedules
from .mqtt_bridge import MqttBridge
from .services import errors

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    pool = await data.create_pool()
    bridge = MqttBridge(pool)
    task = asyncio.create_task(bridge.run())
    app.state.pool = pool
    app.state.bridge = bridge
    yield
    task.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await task
    await pool.close()


app = FastAPI(title="Roots API", lifespan=lifespan)
for module in (auth, plants, control, schedules, friends, posts):
    app.include_router(module.router)

# Post images. File names are random, so an image can only be found through a post that links to it.
config.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount(config.UPLOAD_URL_PREFIX, StaticFiles(directory=config.UPLOAD_DIR), name="uploads")

# HTTP status for each kind of service-layer error.
_STATUS = {
    errors.Invalid: 422,
    errors.Unauthorized: 401,
    errors.NotFound: 404,
    errors.Conflict: 409,
    errors.Unavailable: 503,
}


@app.exception_handler(errors.ServiceError)
async def service_error(request: Request, e: errors.ServiceError):
    code = _STATUS.get(type(e), 400)
    headers = {"WWW-Authenticate": "Bearer"} if code == 401 else None
    return JSONResponse({"detail": str(e)}, status_code=code, headers=headers)


@app.get("/health")
async def health(request: Request):
    return {"mqtt_connected": request.app.state.bridge.client is not None}
