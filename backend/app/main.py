from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import sessions, ws
from app.db.session import init_db

app = FastAPI(title="SkillForge API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


app.include_router(sessions.router)
app.include_router(ws.router)


@app.get("/health")
def health():
    return {"ok": True}
