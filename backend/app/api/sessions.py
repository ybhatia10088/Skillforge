from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session as DbSession
from sqlmodel import select

from app.db.models import CodeEvent, CodeSnapshot, Evaluation
from app.db.models import Session as InterviewSession
from app.db.session import get_session
from app.problems.rate_limiter import PROBLEM_ID, STARTER_CODE, STATEMENT
from app.services import judge0
from app.services.evaluation import evaluate_session
from app.services.metrics import compute_metrics
from app.services.timeline import build_timeline

router = APIRouter(prefix="/sessions", tags=["sessions"])


# ---------- schemas ----------

class EventIn(BaseModel):
    type: str
    payload: dict = {}
    ts: Optional[datetime] = None


class SnapshotIn(BaseModel):
    source_code: str
    reason: str
    ts: Optional[datetime] = None


class EventsBatchIn(BaseModel):
    events: list[EventIn] = []
    snapshots: list[SnapshotIn] = []


class RunIn(BaseModel):
    source_code: str


class EndIn(BaseModel):
    final_code: str


# ---------- helpers (shared with the WS handler) ----------

def next_snapshot_version(db: DbSession, session_id: UUID) -> int:
    count = db.exec(
        select(CodeSnapshot).where(CodeSnapshot.session_id == session_id)
    ).all()
    return len(count) + 1


def ingest_batch(db: DbSession, session_id: UUID, batch: EventsBatchIn) -> None:
    for e in batch.events:
        db.add(CodeEvent(
            session_id=session_id,
            type=e.type,
            payload=e.payload,
            ts=e.ts or datetime.now(timezone.utc),
        ))
    for s in batch.snapshots:
        db.add(CodeSnapshot(
            session_id=session_id,
            source_code=s.source_code,
            reason=s.reason,
            snapshot_version=next_snapshot_version(db, session_id),
            ts=s.ts or datetime.now(timezone.utc),
        ))
    db.commit()


def get_session_or_404(db: DbSession, session_id: UUID) -> InterviewSession:
    session = db.get(InterviewSession, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="session not found")
    return session


# ---------- routes ----------

@router.post("")
def create_session(db: DbSession = Depends(get_session)):
    session = InterviewSession(problem_id=PROBLEM_ID, language="python")
    db.add(session)
    db.commit()
    db.refresh(session)

    db.add_all([
        CodeEvent(session_id=session.id, type="session_started"),
        CodeEvent(session_id=session.id, type="problem_viewed"),
        CodeEvent(session_id=session.id, type="starter_code_loaded"),
    ])
    db.add(CodeSnapshot(
        session_id=session.id, source_code=STARTER_CODE,
        reason="periodic", snapshot_version=1,
    ))
    db.commit()

    return {
        "id": session.id,
        "problem_id": session.problem_id,
        "statement": STATEMENT,
        "starter_code": STARTER_CODE,
        "language": session.language,
    }


@router.get("/{session_id}")
def get_session_state(session_id: UUID, db: DbSession = Depends(get_session)):
    session = get_session_or_404(db, session_id)
    latest_snapshot = db.exec(
        select(CodeSnapshot)
        .where(CodeSnapshot.session_id == session_id)
        .order_by(CodeSnapshot.snapshot_version.desc())
    ).first()

    return {
        "id": session.id,
        "problem_id": session.problem_id,
        "statement": STATEMENT,
        "starter_code": STARTER_CODE,
        "status": session.status,
        "language": session.language,
        "latest_code": latest_snapshot.source_code if latest_snapshot else STARTER_CODE,
        "latest_snapshot_version": latest_snapshot.snapshot_version if latest_snapshot else 1,
    }


@router.post("/{session_id}/events")
def post_events(session_id: UUID, batch: EventsBatchIn, db: DbSession = Depends(get_session)):
    get_session_or_404(db, session_id)
    ingest_batch(db, session_id, batch)
    return {"ok": True}


@router.post("/{session_id}/run")
async def run_code(session_id: UUID, body: RunIn, db: DbSession = Depends(get_session)):
    get_session_or_404(db, session_id)

    result = await judge0.run_tests(body.source_code)

    # store a compact version (no per-call detail) for downstream metrics/timeline
    compact_tests = [{"name": t["name"], "passed": t["passed"]} for t in result["tests"]]
    db.add(CodeEvent(
        session_id=session_id,
        type="run_attempt",
        payload={
            "status": result["status"],
            "tests_passed": result["tests_passed"],
            "tests_total": result["tests_total"],
            "all_passed": result["all_passed"],
            "tests": compact_tests,
        },
    ))
    db.add(CodeSnapshot(
        session_id=session_id, source_code=body.source_code,
        reason="run", snapshot_version=next_snapshot_version(db, session_id),
    ))
    db.commit()

    return result


@router.post("/{session_id}/end")
async def end_session(session_id: UUID, body: EndIn, db: DbSession = Depends(get_session)):
    session = get_session_or_404(db, session_id)
    if session.status == "ended":
        raise HTTPException(status_code=400, detail="session already ended")

    db.add(CodeSnapshot(
        session_id=session_id, source_code=body.final_code,
        reason="end", snapshot_version=next_snapshot_version(db, session_id),
    ))
    db.commit()

    now = datetime.now(timezone.utc)
    events = db.exec(select(CodeEvent).where(CodeEvent.session_id == session_id)).all()
    snapshots = db.exec(select(CodeSnapshot).where(CodeSnapshot.session_id == session_id)).all()

    metrics = compute_metrics(session, events, snapshots, now)
    timeline_lines = build_timeline(session, events)
    eval_result = await evaluate_session(session, metrics, timeline_lines, body.final_code)

    evaluation = Evaluation(
        session_id=session_id,
        scores=eval_result["scores"],
        computed_metrics=eval_result["computed_metrics"],
        evidence=eval_result["evidence"],
        summary=eval_result["summary"],
        limitations=eval_result["limitations"],
        confidence=eval_result["confidence"],
    )
    db.add(evaluation)

    session.status = "ended"
    session.ended_at = now
    session.final_code = body.final_code
    db.add(session)
    db.commit()

    return {"ok": True}


@router.get("/{session_id}/report")
def get_report(session_id: UUID, db: DbSession = Depends(get_session)):
    session = get_session_or_404(db, session_id)
    evaluation = db.exec(
        select(Evaluation).where(Evaluation.session_id == session_id)
    ).first()
    if not evaluation:
        raise HTTPException(status_code=404, detail="session has not been evaluated yet")

    events = db.exec(select(CodeEvent).where(CodeEvent.session_id == session_id)).all()
    timeline_lines = build_timeline(session, events)

    return {
        "session_id": session.id,
        "status": session.status,
        "final_code": session.final_code,
        "scores": evaluation.scores,
        "computed_metrics": evaluation.computed_metrics,
        "evidence": evaluation.evidence,
        "summary": evaluation.summary,
        "limitations": evaluation.limitations,
        "confidence": evaluation.confidence,
        "timeline": timeline_lines,
    }
