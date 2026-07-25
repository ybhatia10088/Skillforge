"use client";

import { RunResult } from "../lib/api";

interface Props {
  result: RunResult | null;
  isRunning: boolean;
}

export default function RunPanel({ result, isRunning }: Props) {
  if (isRunning) {
    return (
      <div className="p-4 text-sm text-muted-foreground animate-pulse">Running tests…</div>
    );
  }
  if (!result) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Click <strong className="text-foreground">Run</strong> to execute your code against the hidden tests.
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
        <p className="text-destructive text-sm font-semibold">{statusLabel[result.status] ?? result.status}</p>
        <pre className="text-xs bg-background border border-border p-3 rounded-lg overflow-auto whitespace-pre-wrap text-muted-foreground">
          {output}
        </pre>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-3">
        <span
          className={`text-sm font-semibold ${result.all_passed ? "text-success" : "text-warning"}`}
        >
          {result.tests_passed}/{result.tests_total} tests passed
        </span>
        {result.all_passed && (
          <span className="text-xs bg-success/15 text-success px-2 py-0.5 rounded-md">All passing</span>
        )}
      </div>
      <div className="space-y-1">
        {result.tests.map((t) => (
          <div key={t.name} className="flex items-center gap-2 text-xs font-mono">
            <span className={t.passed ? "text-success" : "text-destructive"}>
              {t.passed ? "✓" : "✗"}
            </span>
            <span className="text-muted-foreground">{t.name.replace(/_/g, " ")}</span>
          </div>
        ))}
      </div>
      {result.stderr && (
        <pre className="text-xs bg-background border border-border p-2 rounded-lg text-muted-foreground whitespace-pre-wrap overflow-auto">
          {result.stderr}
        </pre>
      )}
    </div>
  );
}
