"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import ReportCharts from "../../../components/ReportCharts";
import Timeline from "../../../components/Timeline";
import { api, ReportData } from "../../../lib/api";

export default function ReportPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getReport(sessionId).then(setReport).catch((e) => setError(e.message));
  }, [sessionId]);

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-400">{error}</p>
          {error.includes("not been evaluated") && (
            <p className="text-zinc-500 text-sm">
              The session may still be processing. Refresh in a moment.
            </p>
          )}
          <Link href="/" className="text-blue-400 hover:underline text-sm">
            Start a new interview
          </Link>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400 animate-pulse">
        Generating evaluation report…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <span className="text-white font-semibold">SkillForge</span>
        <Link
          href="/"
          className="text-sm text-zinc-400 hover:text-white transition-colors"
        >
          ← New interview
        </Link>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-12">
        <h1 className="text-2xl font-bold text-white">Interview Report</h1>

        {/* Scores + evidence */}
        <ReportCharts report={report} />

        {/* Final code */}
        {report.final_code && (
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Final Code</h2>
            <pre className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-sm font-mono text-zinc-300 overflow-auto whitespace-pre-wrap">
              {report.final_code}
            </pre>
          </section>
        )}

        {/* Timeline */}
        {report.timeline?.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Session Timeline</h2>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
              <Timeline lines={report.timeline} />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
