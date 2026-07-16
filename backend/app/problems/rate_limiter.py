"""
Phase 1's single hardcoded problem: a fixed-window-per-user rate limiter.

The statement, starter code, and constraints below are what the candidate sees.
HIDDEN_TESTS are never sent to the client — they're only inserted into the
server-side harness in services/judge0.py.
"""

PROBLEM_ID = "rate_limiter_v1"

STATEMENT = """\
Implement a rate limiter that allows at most 3 requests per user_id in any \
rolling 60-second window.

class RateLimiter:
    def allow(self, user_id: str, timestamp: int) -> bool:
        \"\"\"
        Allow at most 3 requests per user_id in any rolling 60-second window.
        timestamp is in seconds. For a given user_id, calls arrive in
        non-decreasing timestamp order. Different user_ids are independent.
        Return True if the request is allowed (and counts toward the window),
        False if it should be rejected. Aim for O(1) amortized time per call.
        \"\"\"

Constraints:
- Timestamps are integers, in seconds.
- For a given user_id, allow() is called with non-decreasing timestamps.
- Different user_ids do not affect each other.
- No persistence is required across process restarts.
"""

STARTER_CODE = """\
class RateLimiter:
    def allow(self, user_id: str, timestamp: int) -> bool:
        # TODO: implement
        pass
"""

# Each test: (description, calls) where calls is a list of (user_id, timestamp, expected_bool)
HIDDEN_TESTS: list[dict] = [
    {
        "name": "under_limit",
        "calls": [("u1", 0, True), ("u1", 10, True)],
    },
    {
        "name": "at_limit",
        "calls": [("u1", 0, True), ("u1", 1, True), ("u1", 2, True)],
    },
    {
        "name": "over_limit",
        "calls": [("u1", 0, True), ("u1", 1, True), ("u1", 2, True), ("u1", 3, False)],
    },
    {
        "name": "window_boundary_exact",
        # 4th call at t=60 is outside the [1, 61) rolling window relative to t=0's window;
        # window is rolling 60s, so a call at t=60 should NOT count the t=0 call (60-0=60 >= 60).
        "calls": [("u1", 0, True), ("u1", 1, True), ("u1", 2, True), ("u1", 60, True)],
    },
    {
        "name": "window_boundary_just_inside",
        "calls": [("u1", 0, True), ("u1", 1, True), ("u1", 2, True), ("u1", 59, False)],
    },
    {
        "name": "independent_users",
        "calls": [
            ("u1", 0, True), ("u1", 1, True), ("u1", 2, True),
            ("u2", 2, True), ("u2", 3, True), ("u2", 4, True),
        ],
    },
    {
        "name": "burst_then_cooldown",
        "calls": [
            ("u1", 0, True), ("u1", 0, True), ("u1", 0, True), ("u1", 0, False),
            ("u1", 61, True),
        ],
    },
]
