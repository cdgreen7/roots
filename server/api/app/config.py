"""
Server settings read from environment variables (see server/.env.example).
"""
import logging
import os
import secrets
from pathlib import Path

log = logging.getLogger("roots.config")

# Secret used to sign login tokens. Without one, a random secret is used, so every token
# stops working when the server restarts; set JWT_SECRET in .env for anything but local testing.
JWT_SECRET = os.getenv("JWT_SECRET") or ""
if not JWT_SECRET:
    log.warning("JWT_SECRET is not set; using a random secret, so logins end when the server restarts")
    JWT_SECRET = secrets.token_urlsafe(32)

TOKEN_LIFETIME_HOURS = int(os.getenv("TOKEN_LIFETIME_HOURS", "168"))  # one week

# Post images are saved here and served at UPLOAD_URL_PREFIX (a Docker volume in docker-compose.yml).
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", Path(__file__).resolve().parent.parent / "uploads"))
UPLOAD_URL_PREFIX = "/uploads"
MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB
