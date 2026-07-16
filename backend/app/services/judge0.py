"""
Wraps candidate code in a server-side test harness and submits it to Judge0
(hosted, via RapidAPI). Hidden tests live only here / in problems/rate_limiter.py
and are never sent to the client.
"""
import base64
import json

import httpx

from app.core.config import settings
from app.problems.rate_limiter import HIDDEN_TESTS

PYTHON3_LANGUAGE_ID = 71
RESULTS_START = "###RESULTS_START###"
RESULTS_END = "###RESULTS_END###"


def _build_harness(candidate_code: str) -> str:
    tests_json = json.dumps(HIDDEN_TESTS)
    return f"""\
{candidate_code}

import json as _json

_tests = _json.loads({tests_json!r})
_results = []
for _t in _tests:
    try:
        _rl = RateLimiter()
    except Exception as _e:
        _results.append({{"name": _t["name"], "passed": False, "error": f"construction failed: {{_e}}", "calls": []}})
        continue
    _passed = True
    _detail = []
    for _user_id, _ts, _expected in _t["calls"]:
        try:
            _actual = _rl.allow(_user_id, _ts)
            _ok = isinstance(_actual, bool) and _actual == _expected
        except Exception as _e:
            _actual = f"ERROR: {{_e}}"
            _ok = False
        _passed = _passed and _ok
        _detail.append({{"user_id": _user_id, "timestamp": _ts, "expected": _expected, "actual": _actual, "ok": _ok}})
    _results.append({{"name": _t["name"], "passed": _passed, "calls": _detail}})

print("{RESULTS_START}")
print(_json.dumps(_results))
print("{RESULTS_END}")
"""


async def _submit(source_code: str) -> dict:
    payload = {
        "source_code": base64.b64encode(source_code.encode()).decode(),
        "language_id": PYTHON3_LANGUAGE_ID,
        "stdin": "",
    }
    headers = {
        "X-RapidAPI-Key": settings.judge0_rapidapi_key,
        "X-RapidAPI-Host": settings.judge0_rapidapi_host,
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{settings.judge0_base_url}/submissions",
            params={"base64_encoded": "true", "wait": "true"},
            headers=headers,
            json=payload,
        )
        resp.raise_for_status()
        return resp.json()


def _decode(field: str | None) -> str:
    if not field:
        return ""
    return base64.b64decode(field).decode(errors="replace")


async def run_tests(candidate_code: str) -> dict:
    """
    Returns:
      {
        "status": "ok" | "compile_error" | "runtime_error" | "harness_error",
        "stdout": str, "stderr": str, "compile_output": str,
        "tests": [{"name": ..., "passed": bool, "calls": [...]}],
        "tests_passed": int, "tests_total": int, "all_passed": bool,
      }
    """
    harness_source = _build_harness(candidate_code)
    submission = await _submit(harness_source)

    stdout = _decode(submission.get("stdout"))
    stderr = _decode(submission.get("stderr"))
    compile_output = _decode(submission.get("compile_output"))
    status_desc = (submission.get("status") or {}).get("description", "Unknown")

    base = {
        "stdout": stdout,
        "stderr": stderr,
        "compile_output": compile_output,
        "tests": [],
        "tests_passed": 0,
        "tests_total": len(HIDDEN_TESTS),
        "all_passed": False,
    }

    if status_desc == "Compilation Error":
        return {**base, "status": "compile_error"}
    if status_desc != "Accepted" and RESULTS_START not in stdout:
        return {**base, "status": "runtime_error"}

    try:
        start = stdout.index(RESULTS_START) + len(RESULTS_START)
        end = stdout.index(RESULTS_END)
        tests = json.loads(stdout[start:end].strip())
    except (ValueError, json.JSONDecodeError):
        return {**base, "status": "harness_error"}

    tests_passed = sum(1 for t in tests if t["passed"])
    return {
        **base,
        "status": "ok",
        "tests": tests,
        "tests_passed": tests_passed,
        "all_passed": tests_passed == len(HIDDEN_TESTS),
    }
