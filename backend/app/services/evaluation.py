"""
Calls Claude with the deterministic metrics (primary input) and compacted
timeline (supporting evidence) to produce a structured, evidence-backed
evaluation. Claude explains and synthesizes computed signals — it does not
invent scores from raw transcript alone, and it never speculates about
personality, anxiety, intelligence, honesty, or employability.
"""
import json

import anthropic

from app.core.config import settings
from app.db.models import Session
from app.problems.rate_limiter import STATEMENT

MODEL = "claude-sonnet-4-6"

SYSTEM_PROMPT = """\
You are scoring a single mock technical interview coding session for an internal \
practice tool. You are given problem-specific deterministic metrics that were \
computed directly from the candidate's recorded session (test results, run \
counts, timing), plus a compacted timeline of what happened.

Rules:
- Base every score strictly on the supplied computed metrics and timeline. Do not \
  invent facts not present in the input.
- Every score must be accompanied by at least one evidence citation referencing a \
  specific timeline timestamp or metric.
- Idle/pause periods are neutral by default — they may reflect productive planning, \
  not difficulty. Only treat them negatively if paired with repeated failures or no \
  subsequent progress; say so explicitly if you do.
- Never infer or comment on personality, anxiety, intelligence, honesty, or \
  employability. Evaluate only the observable coding-session evidence and the \
  supplied rubric.
- If the input indicates insufficient evidence, do not fabricate scores — say so \
  via the insufficient_evidence path instead.
- Be specific and concrete in strengths/weaknesses; avoid generic praise/criticism.
"""

EVALUATION_TOOL = {
    "name": "submit_evaluation",
    "description": "Submit the structured evaluation of the coding session.",
    "input_schema": {
        "type": "object",
        "properties": {
            "insufficient_evidence": {
                "type": "boolean",
                "description": "True if there isn't enough signal to responsibly score this session.",
            },
            "technical_score": {"type": "number", "minimum": 0, "maximum": 10},
            "debugging_score": {"type": "number", "minimum": 0, "maximum": 10},
            "time_management_score": {"type": "number", "minimum": 0, "maximum": 10},
            "strengths": {"type": "array", "items": {"type": "string"}},
            "weaknesses": {"type": "array", "items": {"type": "string"}},
            "evidence": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "claim": {"type": "string"},
                        "timestamp": {"type": "string"},
                    },
                    "required": ["claim", "timestamp"],
                },
            },
            "summary": {"type": "string"},
            "confidence": {"type": "string", "enum": ["low", "medium", "high"]},
            "limitations": {"type": "array", "items": {"type": "string"}},
        },
        "required": [
            "insufficient_evidence", "strengths", "weaknesses", "evidence",
            "summary", "confidence", "limitations",
        ],
    },
}

BASE_LIMITATIONS = [
    "No voice or transcript data was available; communication is not evaluated in this phase.",
    "Complexity assessment (e.g. O(1) amortized) is a static-code heuristic, not a verified proof.",
]


def _build_user_message(metrics: dict, timeline_lines: list[str], final_code: str) -> str:
    return f"""\
PROBLEM STATEMENT:
{STATEMENT}

COMPUTED METRICS (primary input — ground these scores in this data):
{json.dumps(metrics, indent=2)}

TIMELINE (supporting evidence — cite specific timestamps from here):
{chr(10).join(timeline_lines)}

FINAL CODE:
```python
{final_code}
```

Call submit_evaluation with your assessment.
"""


async def evaluate_session(session: Session, metrics: dict, timeline_lines: list[str], final_code: str) -> dict:
    if metrics.get("insufficient_evidence"):
        return {
            "scores": {},
            "computed_metrics": metrics,
            "evidence": [],
            "summary": f"Insufficient evidence to evaluate this session: {metrics.get('reason', 'no meaningful activity recorded')}.",
            "limitations": BASE_LIMITATIONS + ["No code execution or substantive edits were recorded."],
            "confidence": "low",
        }

    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    message = await client.messages.create(
        model=MODEL,
        max_tokens=2000,
        system=SYSTEM_PROMPT,
        tools=[EVALUATION_TOOL],
        tool_choice={"type": "tool", "name": "submit_evaluation"},
        messages=[
            {"role": "user", "content": _build_user_message(metrics, timeline_lines, final_code)}
        ],
    )

    tool_use = next(b for b in message.content if b.type == "tool_use")
    result = tool_use.input

    if result.get("insufficient_evidence"):
        return {
            "scores": {},
            "computed_metrics": metrics,
            "evidence": result.get("evidence", []),
            "summary": result.get("summary", "Insufficient evidence to evaluate this session."),
            "limitations": BASE_LIMITATIONS + result.get("limitations", []),
            "confidence": "low",
        }

    return {
        "scores": {
            "technical_score": result.get("technical_score"),
            "debugging_score": result.get("debugging_score"),
            "time_management_score": result.get("time_management_score"),
            "strengths": result.get("strengths", []),
            "weaknesses": result.get("weaknesses", []),
        },
        "computed_metrics": metrics,
        "evidence": result.get("evidence", []),
        "summary": result.get("summary", ""),
        "limitations": BASE_LIMITATIONS + result.get("limitations", []),
        "confidence": result.get("confidence", "medium"),
    }
