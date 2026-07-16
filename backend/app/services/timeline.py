"""
Compacts raw events into a short, human-readable timeline string for the
evaluation prompt. Idle periods are framed neutrally — silence is not
evidence of struggle on its own, only repeated failures are.
"""
from datetime import datetime, timezone

from app.db.models import CodeEvent, Session


def _utc(dt: datetime) -> datetime:
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt


def _fmt_ts(session: Session, ts) -> str:
    elapsed = (_utc(ts) - _utc(session.started_at)).total_seconds()
    minutes, seconds = divmod(int(max(elapsed, 0)), 60)
    return f"{minutes:02d}:{seconds:02d}"


def _idle_label(duration_seconds: float) -> str:
    if duration_seconds < 30:
        return "brief reflection interval"
    if duration_seconds < 90:
        return "planning pause"
    return "extended inactivity"


def build_timeline(session: Session, events: list[CodeEvent]) -> list[str]:
    events = sorted(events, key=lambda e: e.ts)
    lines: list[str] = [f"00:00 session started (problem: {session.problem_id})"]

    pending_idle_start = None
    for e in events:
        t = _fmt_ts(session, e.ts)
        if e.type == "session_started":
            continue
        elif e.type == "problem_viewed":
            lines.append(f"{t} candidate viewed the problem statement")
        elif e.type == "starter_code_loaded":
            lines.append(f"{t} starter code loaded")
        elif e.type == "idle_start":
            pending_idle_start = e.ts
        elif e.type == "idle_end":
            if pending_idle_start is not None:
                duration = (e.ts - pending_idle_start).total_seconds()
                lines.append(f"{t} {_idle_label(duration)} ({int(duration)}s, ended without explicit framing of cause)")
                pending_idle_start = None
        elif e.type == "run_attempt":
            payload = e.payload
            passed = payload.get("tests_passed", 0)
            total = payload.get("tests_total", 0)
            status = payload.get("status", "unknown")
            if status != "ok":
                lines.append(f"{t} run attempt — execution issue ({status})")
            elif payload.get("all_passed"):
                lines.append(f"{t} run — all {total} tests passed")
            else:
                lines.append(f"{t} run — {passed}/{total} tests passed")
        elif e.type == "reset":
            lines.append(f"{t} candidate reset code to starter template")
        elif e.type == "edit":
            continue  # too granular for the prompt timeline; metrics.py already summarizes edit behavior

    return lines
