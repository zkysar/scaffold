from fastapi import FastAPI
from app.routers import health
from app.config import settings

app = FastAPI(title="{{API_TITLE}}", version="{{API_VERSION}}")

app.include_router(health.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int("{{PORT}}"))