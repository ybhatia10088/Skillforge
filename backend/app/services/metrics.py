"""
Deterministic rubric signals computed directly from stored events/snapshots,
*before* Claude ever sees the session. evaluation.py passes these computed
metrics to Claude as the primary input — Claude explains and cites evidence
for them, it does not invent them from raw transcript alone.
"""
from datetime import datetime, timezone
from typing import Any

from app.db.models import CodeEvent, CodeSnapshot, Session
from app.problems.rate_limiter import STARTER_CODE

EDGE_CASE_TEST_NAMES = {
    "window_boundary_exact",
    "window_boundary_just_inside",
    "independent_users",
    "burst_then_cooldown",
}


def _utc(dt: datetime) -> datetime:
    """Normalise DB-returned naive datetimes (which are UTC) to aware."""
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt


def _seconds_between(a: datetime, b: datetime) -> float:
    return (_utc(b) - _utc(a)).total_seconds()


def _is_trivial_diff(final_code: str) -> bool:
    normalize = lambda s: "".join(s.split())
    return normalize(final_code) == normalize(STARTER_CODE) or len(final_code.strip()) < 40


def compute_metrics(
    session: Session,
    events: list[CodeEvent],
    snapshots: list[CodeSnapshot],
    session_end_ts: datetime,
) -> dict[str, Any]:
    events = sorted(events, key=lambda e: e.ts)
    snapshots = sorted(snapshots, key=lambda s: s.ts)

    run_events = [e for e in events if e.type == "run_attempt"]
    idle_starts = [e for e in events if e.type == "idle_start"]
    idle_ends = [e for e in events if e.type == "idle_end"]
    edit_events = [e for e in events if e.type == "edit"]

    final_code = snapshots[-1].source_code if snapshots else STARTER_CODE

    if not run_events and _is_trivial_diff(final_code):
        return {
            "insufficient_evidence": True,
            "reason": "No run attempts and the code is effectively unchanged from the starter template.",
        }

    # --- technical ---
    last_run = run_events[-1].payload if run_events else None
    hidden_tests_passed = last_run["tests_passed"] if last_run else 0
    hidden_tests_total = last_run["tests_total"] if last_run else 0
    edge_case_results = []
    if last_run:
        edge_case_results = [
            t for t in last_run.get("tests", []) if t["name"] in EDGE_CASE_TEST_NAMES
        ]
    edge_cases_passed = sum(1 for t in edge_case_results if t["passed"])
    edge_cases_total = len(edge_case_results)

    likely_o1_amortized = None
    lowered = final_code.lower()
    if "deque" in lowered or ("while" in lowered and "pop" in lowered):
        likely_o1_amortized = True
    elif "for" in lowered and "for" in lowered.replace("for", "", 1):
        # heuristic only: nested loop pattern present
        likely_o1_amortized = False

    technical = {
        "hidden_tests_passed": hidden_tests_passed,
        "hidden_tests_total": hidden_tests_total,
        "all_hidden_tests_passed": bool(last_run and last_run.get("all_passed")),
        "edge_cases_passed": edge_cases_passed,
        "edge_cases_total": edge_cases_total,
        "likely_o1_amortized": likely_o1_amortized,
        "likely_o1_amortized_note": "heuristic from static code scan, not a verified complexity proof",
    }

    # --- debugging ---
    failed_runs = [r for r in run_events if not r.payload.get("all_passed")]
    passed_runs = [r for r in run_events if r.payload.get("all_passed")]
    recovered_from_failure = bool(failed_runs and passed_runs and passed_runs[-1].ts > failed_runs[0].ts)

    regression_after_pass = False
    seen_pass = False
    for r in run_events:
        if r.payload.get("all_passed"):
            seen_pass = True
        elif seen_pass:
            regression_after_pass = True

    debugging = {
        "total_run_attempts": len(run_events),
        "failed_run_attempts": len(failed_runs),
        "recovered_from_failure": recovered_from_failure,
        "regression_after_pass": regression_after_pass,
    }

    # --- time management ---
    session_duration = max(_seconds_between(session.started_at, session_end_ts), 0.001)

    time_to_first_run = (
        _seconds_between(session.started_at, run_events[0].ts) if run_events else None
    )
    first_pass_event = next((r for r in run_events if r.payload.get("all_passed")), None)
    time_to_first_pass = (
        _seconds_between(session.started_at, first_pass_event.ts) if first_pass_event else None
    )

    idle_seconds_total = 0.0
    for start_evt in idle_starts:
        end_evt = next((e for e in idle_ends if e.ts > start_evt.ts), None)
        if end_evt:
            idle_seconds_total += _seconds_between(start_evt.ts, end_evt.ts)

    net_deletion_edits = sum(
        1 for e in edit_events
        if e.payload.get("chars_removed", 0) > e.payload.get("chars_added", 0)
    )
    edit_churn_fraction = (net_deletion_edits / len(edit_events)) if edit_events else 0.0

    time_management = {
        "session_duration_seconds": round(session_duration, 1),
        "time_to_first_run_seconds": round(time_to_first_run, 1) if time_to_first_run is not None else None,
        "time_to_first_pass_seconds": round(time_to_first_pass, 1) if time_to_first_pass is not None else None,
        "idle_seconds_total": round(idle_seconds_total, 1),
        "idle_fraction": round(idle_seconds_total / session_duration, 3),
        "total_edit_events": len(edit_events),
        "edit_churn_fraction": round(edit_churn_fraction, 3),
    }

    return {
        "insufficient_evidence": False,
        "technical": technical,
        "debugging": debugging,
        "time_management": time_management,
    }
