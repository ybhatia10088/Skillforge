"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "../lib/api";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    setLoading(true);
    setError("");
    try {
      const session = await api.createSession();
      router.push(`/interview/${session.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create session");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="max-w-lg w-full px-6 text-center space-y-8">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-white tracking-tight">SkillForge</h1>
          <p className="text-zinc-400 text-lg">
            AI-powered interview simulator that evaluates <em>how</em> you solve problems,
            not just whether your final code passes.
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-left space-y-4">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">
            What gets evaluated
          </h2>
          <ul className="space-y-2 text-sm text-zinc-400">
            {[
              "Problem decomposition and first attempt quality",
              "Debugging behaviour across multiple runs",
              "Edge-case test coverage (window boundaries, independent users)",
              "Time management and edit patterns",
              "Final solution correctness",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-blue-400 shrink-0">→</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <button
            onClick={start}
            disabled={loading}
            className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors text-lg"
          >
            {loading ? "Starting…" : "Start Mock Interview"}
          </button>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <p className="text-xs text-zinc-600">
            Python · fixed-window rate limiter problem · AI-scored report at the end
          </p>
        </div>
      </div>
    </main>
  );
}
