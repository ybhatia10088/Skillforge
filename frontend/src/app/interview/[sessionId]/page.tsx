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
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
        {error ? <p className="text-red-400">{error}</p> : <p>Loading session…</p>}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Top bar */}
      <header className="h-12 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4 shrink-0">
        <span className="text-sm font-semibold text-white">SkillForge</span>
        <div className="flex items-center gap-4">
          <span className="text-sm font-mono text-zinc-400">{fmtElapsed(elapsed)}</span>
          <button
            onClick={handleRun}
            disabled={isRunning || isEnding}
            className="px-4 py-1.5 text-sm font-medium bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-white rounded transition-colors"
          >
            {isRunning ? "Running…" : "Run"}
          </button>
          <button
            onClick={handleEnd}
            disabled={isEnding || isRunning}
            className="px-4 py-1.5 text-sm font-medium bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white rounded transition-colors"
          >
            {isEnding ? "Submitting…" : "End Interview"}
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-red-950 border-b border-red-800 px-4 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Left: problem + run output */}
        <div className="w-80 shrink-0 border-r border-zinc-800 flex flex-col overflow-y-auto">
          {/* Problem statement */}
          <div className="border-b border-zinc-800">
            <button
              onClick={() => setStatementOpen((o) => !o)}
              className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wide hover:text-white transition-colors"
            >
              <span>Problem</span>
              <span>{statementOpen ? "−" : "+"}</span>
            </button>
            {statementOpen && (
              <div className="px-4 pb-4">
                <pre className="text-xs text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed">
                  {sessionState.statement}
                </pre>
              </div>
            )}
          </div>

          {/* Run output */}
          <div className="flex-1">
            <div className="px-4 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wide border-b border-zinc-800">
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
