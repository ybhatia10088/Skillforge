"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Editor, { EditorHandle } from "../../../components/Editor";
import RunPanel from "../../../components/RunPanel";
import { api, RunResult, SessionState } from "../../../lib/api";
import { SessionSocket } from "../../../lib/ws";

export default function InterviewPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();

  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [socket, setSocket] = useState<SessionSocket | null>(null);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [statementOpen, setStatementOpen] = useState(true);

  const editorRef = useRef<EditorHandle>(null);
  const startRef = useRef<number>(Date.now());

  // Load session state and init socket
  useEffect(() => {
    api.getSession(sessionId).then((s) => {
      setSessionState(s);
    }).catch((e) => setError(e.message));

    const sock = new SessionSocket(sessionId);
    setSocket(sock);
    return () => sock.destroy();
  }, [sessionId]);

  // Elapsed timer
  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  function fmtElapsed(s: number) {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  }

  async function handleRun() {
    if (!editorRef.current) return;
    const code = editorRef.current.getCurrentCode();
    setIsRunning(true);
    setError("");
    try {
      const result = await api.runCode(sessionId, code);
      setRunResult(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Run failed");
    } finally {
      setIsRunning(false);
    }
  }

  async function handleEnd() {
    if (!editorRef.current || isEnding) return;
    const code = editorRef.current.getCurrentCode();
    setIsEnding(true);
    setError("");
    try {
      await api.endSession(sessionId, code);
      router.push(`/report/${sessionId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to end session");
      setIsEnding(false);
    }
  }

  if (!sessionState || !socket) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        {error ? <p className="text-destructive">{error}</p> : <p>Loading session…</p>}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="h-12 bg-surface border-b border-border flex items-center justify-between px-4 shrink-0">
        <span className="text-sm font-semibold text-foreground">SkillForge</span>
        <div className="flex items-center gap-4">
          <span className="text-sm font-mono text-muted-foreground tabular-nums">{fmtElapsed(elapsed)}</span>
          <button
            onClick={handleRun}
            disabled={isRunning || isEnding}
            className="cursor-pointer px-4 py-1.5 text-sm font-medium bg-muted hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed text-foreground border border-border hover:border-border-hover rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            {isRunning ? "Running…" : "Run"}
          </button>
          <button
            onClick={handleEnd}
            disabled={isEnding || isRunning}
            className="cursor-pointer px-4 py-1.5 text-sm font-medium bg-destructive hover:bg-destructive-hover disabled:opacity-40 disabled:cursor-not-allowed text-on-primary rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            {isEnding ? "Submitting…" : "End Interview"}
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-destructive/10 border-b border-destructive/30 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Left: problem + run output */}
        <div className="w-80 shrink-0 border-r border-border flex flex-col overflow-y-auto">
          {/* Problem statement */}
          <div className="border-b border-border">
            <button
              onClick={() => setStatementOpen((o) => !o)}
              className="cursor-pointer w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors duration-200"
            >
              <span>Problem</span>
              <span>{statementOpen ? "−" : "+"}</span>
            </button>
            {statementOpen && (
              <div className="px-4 pb-4">
                <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap leading-relaxed">
                  {sessionState.statement}
                </pre>
              </div>
            )}
          </div>

          {/* Run output */}
          <div className="flex-1">
            <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-border">
              Test Results
            </div>
            <RunPanel result={runResult} isRunning={isRunning} />
          </div>
        </div>

        {/* Right: editor */}
        <div className="flex-1 overflow-hidden">
          <Editor
            ref={editorRef}
            starterCode={sessionState.starter_code}
            initialCode={sessionState.latest_code}
            socket={socket}
          />
        </div>
      </div>
    </div>
  );
}
