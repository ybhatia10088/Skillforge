# SkillForge

**An AI interviewer that reviews your code the way a senior engineer would — not just whether it passes.**

![Status](https://img.shields.io/badge/status-MVP-orange)
![Python](https://img.shields.io/badge/backend-Python%20%2F%20FastAPI-blue)
![Frontend](https://img.shields.io/badge/frontend-React-61DAFB)
![Execution](https://img.shields.io/badge/execution-Judge0-lightgrey)
![License](https://img.shields.io/badge/license-MIT-green)

---

## The problem

Most online judges tell you one thing: did the test cases pass. That's not what a real technical interview evaluates. An interviewer is watching your approach, your complexity tradeoffs, how readable your solution is under time pressure, and whether you'd survive a follow-up question about edge cases.

SkillForge closes that gap. It pairs deterministic code execution with an LLM reviewer that reads your solution the way a human interviewer would, then tells you *why* it's not interview-ready yet, not just that it failed.

## How it works

```
                     Problem
                        |
                        v
                 Write Solution
                        |
                        v
      ┌─────────────────────────────────┐
      │         Judge0 Execution         │
      │  compile → run → measure runtime │
      │      → catch errors / timeouts   │
      └─────────────────────────────────┘
                        |
                        v
      ┌─────────────────────────────────┐
      │          AI Evaluation           │
      │  correctness · complexity        │
      │  readability · maintainability   │
      │  edge cases · interview signal   │
      └─────────────────────────────────┘
                        |
                        v
            Structured Feedback
         (not just a score — the "why")
```

Execution and evaluation are deliberately separate stages. Judge0 gives you ground truth on whether the code runs and how fast. The LLM layer only fires on solutions that already pass, and focuses entirely on the things a compiler can't tell you.

## Core features

**Live coding environment**
Browser-based editor with multi-language support, syntax highlighting, and real-time execution — no local setup required to start solving.

**Judge0-backed execution**
Every submission compiles and runs against test cases through Judge0, returning execution output, runtime, and clear compilation/runtime error detection before anything reaches the AI layer.

**LLM-based interview evaluation**
Once a submission executes successfully, a Claude/OpenAI-backed evaluator reviews it across correctness, algorithmic complexity, code quality, readability, maintainability, and edge-case coverage — and explains *what to fix and why*, the same way feedback would land in a real debrief.

## Architecture

**Backend** — FastAPI orchestrates the whole pipeline: submission endpoints, execution requests to Judge0, evaluation calls to the LLM layer, and result aggregation into a single structured response.

**Frontend** — React with Monaco Editor for the coding surface, plus a results dashboard for reviewing structured feedback after each run.

```
skillforge/
├── backend/
│   ├── api/              # Submission + evaluation endpoints
│   ├── execution/         # Judge0 orchestration
│   ├── evaluation/        # LLM evaluation layer
│   └── main.py            # FastAPI entrypoint
├── frontend/
│   ├── components/        # Editor, results dashboard
│   └── App.tsx
└── README.md
```

## Tech stack

| Layer | Tools |
|---|---|
| Backend | Python, FastAPI |
| Execution | Judge0 API |
| AI evaluation | Claude / OpenAI APIs |
| Frontend | React, Monaco Editor, TypeScript |
| Data | REST APIs, JSON |

## Status

SkillForge is an active MVP. The execution pipeline (Judge0 orchestration, error handling, runtime measurement) and the AI evaluation layer are built and integrated. The frontend results dashboard is still being finalized.

**What's next:**
- [ ] Finalize results dashboard UI
- [ ] Add multi-language evaluator prompts (currently tuned for one language at a time)
- [ ] Difficulty-calibrated feedback depth
- [ ] Session history and progress tracking across attempts

## Why this exists

Practicing on a judge tells you if your code works. It doesn't tell you if you'd get the offer. SkillForge tries to close that gap by giving the same kind of structured, specific feedback a strong interviewer would give — available on demand, for any problem, at 2am before an interview.

---

*Built by [Yugav Bhatia](https://github.com/ybhatia10088)*
