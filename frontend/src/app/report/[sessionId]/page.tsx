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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive">{error}</p>
          {error.includes("not been evaluated") && (
            <p className="text-muted-foreground text-sm">
              The session may still be processing. Refresh in a moment.
            </p>
          )}
          <Link
            href="/"
            className="text-accent hover:text-accent-hover hover:underline text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            Start a new interview
          </Link>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground animate-pulse">
        Generating evaluation report…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-surface border-b border-border px-6 py-4 flex items-center justify-between">
        <span className="text-foreground font-semibold">SkillForge</span>
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          ← New interview
        </Link>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-12">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Interview Report</h1>

        {/* Scores + evidence */}
        <ReportCharts report={report} />

        {/* Final code */}
        {report.final_code && (
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">Final Code</h2>
            <pre className="bg-surface border border-border rounded-lg p-4 text-sm font-mono text-muted-foreground overflow-auto whitespace-pre-wrap shadow-sm">
              {report.final_code}
            </pre>
          </section>
        )}

        {/* Timeline */}
        {report.timeline?.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">Session Timeline</h2>
            <div className="bg-surface border border-border rounded-lg overflow-hidden shadow-sm">
              <Timeline lines={report.timeline} />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
