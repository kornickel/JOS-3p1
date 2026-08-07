# -*- coding: utf-8 -*-
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import export, meta, model, scenarios, simulate


@asynccontextmanager
async def lifespan(app: FastAPI):
    scenarios.seed_example_scenarios()
    yield


app = FastAPI(title="JOS-3 Web GUI API", lifespan=lifespan)

# Local single-user app: the frontend dev server (Vite, default port 5173)
# and the backend (uvicorn, default port 8000) run as separate localhost
# processes, so CORS must be opened between them explicitly.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(meta.router)
app.include_router(model.router)
app.include_router(simulate.router)
app.include_router(export.router)
app.include_router(scenarios.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
