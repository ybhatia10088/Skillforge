"use client";

import { RunResult } from "../lib/api";

interface Props {
  result: RunResult | null;
  isRunning: boolean;
}

export default function RunPanel({ result, isRunning }: Props) {
  if (isRunning) {
    return (
      <div className="p-4 text-sm text-zinc-400 animate-pulse">Running tests…</div>
    );
  }
  if (!result) {
    return (
      <div className="p-4 text-sm text-zinc-500">
        Click <strong className="text-zinc-300">Run</strong> to execute your code against the hidden tests.
      </div>
    );
  }

  const statusLabel: Record<string, string> = {
    ok: "",
    compile_error: "Compilation error",
    runtime_error: "Runtime error",
    harness_error: "Test harness error",
  };

  if (result.status !== "ok") {
    const output = result.compile_output || result.stderr || "No output";
    return (
      <div className="p-4 space-y-2">
        <p className="text-red-400 text-sm font-semibold">{statusLabel[result.status] ?? result.status}</p>
        <pre className="text-xs bg-zinc-900 p-3 rounded overflow-auto whitespace-pre-wrap text-zinc-300">
          {output}
        </pre>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-3">
        <span
          className={`text-sm font-semibold ${result.all_passed ? "text-green-400" : "text-amber-400"}`}
        >
          {result.tests_passed}/{result.tests_total} tests passed
        </span>
        {result.all_passed && (
          <span className="text-xs bg-green-900/40 text-green-300 px-2 py-0.5 rounded">All passing</span>
        )}
      </div>
      <div className="space-y-1">
        {result.tests.map((t) => (
          <div key={t.name} className="flex items-center gap-2 text-xs font-mono">
            <span className={t.passed ? "text-green-400" : "text-red-400"}>
              {t.passed ? "✓" : "✗"}
            </span>
            <span className="text-zinc-300">{t.name.replace(/_/g, " ")}</span>
          </div>
        ))}
      </div>
      {result.stderr && (
        <pre className="text-xs bg-zinc-900 p-2 rounded text-zinc-400 whitespace-pre-wrap overflow-auto">
          {result.stderr}
        </pre>
      )}
    </div>
  );
}
