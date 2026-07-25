"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ReportData } from "../lib/api";

interface Props {
  report: ReportData;
}

const COLORS = {
  technical_score: "#7c3aed",
  debugging_score: "#0891b2",
  time_management_score: "#a78bfa",
};

export default function ReportCharts({ report }: Props) {
  const { scores, evidence, summary, confidence, limitations } = report;

  const chartData = [
    { name: "Technical", score: scores.technical_score ?? null },
    { name: "Debugging", score: scores.debugging_score ?? null },
    { name: "Time Mgmt", score: scores.time_management_score ?? null },
  ].filter((d) => d.score !== null) as { name: string; score: number }[];

  const isInsufficient = chartData.length === 0;

  return (
    <div className="space-y-8">
      {/* Summary */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-2">Summary</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">{summary}</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-muted-foreground/70">Confidence:</span>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-md ${
              confidence === "high"
                ? "bg-success/15 text-success"
                : confidence === "medium"
                ? "bg-warning/15 text-warning"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {confidence}
          </span>
        </div>
      </section>

      {/* Scores chart */}
      {!isInsufficient && (
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">Scores</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262041" />
              <XAxis type="number" domain={[0, 10]} tick={{ fill: "#9a93b8", fontSize: 12 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: "#9a93b8", fontSize: 12 }} width={80} />
              <Tooltip
                contentStyle={{ background: "#130f22", border: "1px solid #262041", borderRadius: 8, color: "#f5f3fb" }}
                formatter={(v) => [typeof v === "number" ? `${v.toFixed(1)} / 10` : v, ""]}
              />
              <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={
                      Object.values(COLORS)[
                        ["Technical", "Debugging", "Time Mgmt"].indexOf(entry.name)
                      ] ?? "#7c3aed"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* Strengths / Weaknesses */}
      {(scores.strengths?.length ?? 0) > 0 || (scores.weaknesses?.length ?? 0) > 0 ? (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-success mb-2">Strengths</h3>
            <ul className="space-y-1">
              {(scores.strengths ?? []).map((s, i) => (
                <li key={i} className="text-sm text-muted-foreground flex gap-2">
                  <span className="text-success shrink-0">+</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-destructive mb-2">Areas to Improve</h3>
            <ul className="space-y-1">
              {(scores.weaknesses ?? []).map((w, i) => (
                <li key={i} className="text-sm text-muted-foreground flex gap-2">
                  <span className="text-destructive shrink-0">−</span>
                  {w}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* Evidence citations */}
      {evidence.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">Evidence</h2>
          <div className="space-y-2">
            {evidence.map((e, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <span className="text-muted-foreground/70 font-mono shrink-0">{e.timestamp}</span>
                <span className="text-muted-foreground">{e.claim}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Limitations */}
      <section className="border-t border-border pt-4">
        <h3 className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wide mb-2">
          Evaluation Scope &amp; Limitations
        </h3>
        <ul className="space-y-1">
          {limitations.map((l, i) => (
            <li key={i} className="text-xs text-muted-foreground/70">
              {l}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
