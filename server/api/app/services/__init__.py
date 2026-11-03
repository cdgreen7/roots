"""
Service layer: the server's logic, between the API layer (app/api, app/mqtt_bridge.py) and the
data-access layer (app/data). Services check who may see or change a plant, apply the automation rules,
work out alerts, and turn app requests into board commands. They raise the errors in services/errors.py
instead of HTTP errors, so they don't depend on how they are called.
"""
