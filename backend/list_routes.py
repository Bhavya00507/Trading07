from app.main import app
from fastapi.routing import APIRoute
for route in app.routes:
    if isinstance(route, APIRoute):
        methods = ','.join(route.methods)
        print(f"{route.path} [{methods}]")