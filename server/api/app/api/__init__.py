"""
API layer: the REST endpoints the app calls, one router per area. Routers check the shape of each request
(with Pydantic models), call the service layer, and return its result as JSON. Endpoints follow the
API design table in the architecture document; every endpoint except /register, /login, and /health
needs an "Authorization: Bearer <token>" header from /register or /login.
"""
