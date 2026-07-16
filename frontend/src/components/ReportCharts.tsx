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
  technical_score: "#60a5fa",
  debugging_score: "#a78bfa",
  time_management_score: "#34d399",
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
        <h2 className="text-lg font-semibold text-white mb-2">Summary</h2>
        <p className="text-zinc-300 text-sm leading-relaxed">{summary}</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-zinc-500">Confidence:</span>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded ${
              confidence === "high"
                ? "bg-green-900/40 text-green-300"
                : confidence === "medium"
                ? "bg-amber-900/40 text-amber-300"
                : "bg-zinc-700 text-zinc-300"
            }`}
          >
            {confidence}
          </span>
        </div>
      </section>

      {/* Scores chart */}
      {!isInsufficient && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-4">Scores</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
              <XAxis type="number" domain={[0, 10]} tick={{ fill: "#a1a1aa", fontSize: 12 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 12 }} width={80} />
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", color: "#fff" }}
                formatter={(v) => [typeof v === "number" ? `${v.toFixed(1)} / 10` : v, ""]}
              />
              <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={
                      Object.values(COLORS)[
                        ["Technical", "Debugging", "Time Mgmt"].indexOf(entry.name)
                      ] ?? "#60a5fa"
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
            <h3 className="text-sm font-semibold text-green-400 mb-2">Strengths</h3>
            <ul className="space-y-1">
              {(scores.strengths ?? []).map((s, i) => (
                <li key={i} className="text-sm text-zinc-300 flex gap-2">
                  <span className="text-green-400 shrink-0">+</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-red-400 mb-2">Areas to Improve</h3>
            <ul className="space-y-1">
              {(scores.weaknesses ?? []).map((w, i) => (
                <li key={i} className="text-sm text-zinc-300 flex gap-2">
                  <span className="text-red-400 shrink-0">−</span>
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
          <h2 className="text-lg font-semibold text-white mb-3">Evidence</h2>
          <div className="space-y-2">
            {evidence.map((e, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <span className="text-zinc-500 font-mono shrink-0">{e.timestamp}</span>
                <span className="text-zinc-300">{e.claim}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Limitations */}
      <section className="border-t border-zinc-800 pt-4">
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
          Evaluation Scope &amp; Limitations
        </h3>
        <ul className="space-y-1">
          {limitations.map((l, i) => (
            <li key={i} className="text-xs text-zinc-500">
              {l}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
