import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Session(SQLModel, table=True):
    __tablename__ = "sessions"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    problem_id: str
    language: str = "python"
    status: str = Field(default="active")  # active | ended
    final_code: Optional[str] = None
    started_at: datetime = Field(default_factory=utcnow)
    ended_at: Optional[datetime] = None


class CodeEvent(SQLModel, table=True):
    __tablename__ = "code_events"

    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: uuid.UUID = Field(foreign_key="sessions.id", index=True)
    ts: datetime = Field(default_factory=utcnow)
    type: str  # session_started | problem_viewed | starter_code_loaded | edit | idle_start | idle_end | run_attempt | reset
    payload: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSONB))


class CodeSnapshot(SQLModel, table=True):
    __tablename__ = "code_snapshots"

    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: uuid.UUID = Field(foreign_key="sessions.id", index=True)
    ts: datetime = Field(default_factory=utcnow)
    snapshot_version: int
    source_code: str
    reason: str  # periodic | run | end | reset


class Evaluation(SQLModel, table=True):
    __tablename__ = "evaluations"

    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: uuid.UUID = Field(foreign_key="sessions.id", index=True, unique=True)
    scores: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSONB))
    computed_metrics: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSONB))
    evidence: list[dict[str, Any]] = Field(default_factory=list, sa_column=Column(JSONB))
    summary: str = ""
    limitations: list[str] = Field(default_factory=list, sa_column=Column(JSONB))
    confidence: str = "medium"  # low | medium | high
    created_at: datetime = Field(default_factory=utcnow)
