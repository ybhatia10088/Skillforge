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
    <main className="relative min-h-screen bg-background flex items-center justify-center overflow-hidden">
      {/* Ambient brand glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, color-mix(in srgb, var(--color-primary) 18%, transparent), transparent 70%), radial-gradient(40% 40% at 85% 90%, color-mix(in srgb, var(--color-accent) 14%, transparent), transparent 70%)",
        }}
      />

      <div className="relative max-w-lg w-full px-6 text-center space-y-8">
        <div className="space-y-3">
          <h1
            className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent"
            style={{
              backgroundImage: "linear-gradient(135deg, var(--color-foreground), var(--color-secondary))",
              textShadow: "0 0 24px color-mix(in srgb, var(--color-primary) 35%, transparent)",
            }}
          >
            SkillForge
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            AI-powered interview simulator that evaluates <em className="text-foreground not-italic font-semibold">how</em> you solve problems,
            not just whether your final code passes.
          </p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-6 text-left space-y-4 shadow-md">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            What gets evaluated
          </h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {[
              "Problem decomposition and first attempt quality",
              "Debugging behaviour across multiple runs",
              "Edge-case test coverage (window boundaries, independent users)",
              "Time management and edit patterns",
              "Final solution correctness",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-accent shrink-0">→</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <button
            onClick={start}
            disabled={loading}
            className="cursor-pointer w-full py-3 px-6 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-on-primary font-semibold rounded-lg shadow-md transition-all duration-200 hover:-translate-y-0.5 text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {loading ? "Starting…" : "Start Mock Interview"}
          </button>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <p className="text-xs text-muted-foreground/70">
            Python · fixed-window rate limiter problem · AI-scored report at the end
          </p>
        </div>
      </div>
    </main>
  );
}
