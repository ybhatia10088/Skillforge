"use client";

interface Props {
  lines: string[];
}

export default function Timeline({ lines }: Props) {
  if (!lines.length) return <p className="text-zinc-500 text-sm p-4">No events yet.</p>;

  return (
    <div className="p-4 space-y-1 font-mono text-xs">
      {lines.map((line, i) => {
        const isRun = line.includes("run —");
        const isPass = line.includes("all") && line.includes("passed");
        const isIdle = line.includes("interval") || line.includes("pause") || line.includes("inactivity");
        const isReset = line.includes("reset");

        let color = "text-zinc-400";
        if (isPass) color = "text-green-400";
        else if (isRun && !isPass) color = "text-amber-400";
        else if (isIdle) color = "text-blue-400";
        else if (isReset) color = "text-orange-400";

        return (
          <div key={i} className="flex gap-3">
            <span className={`shrink-0 ${color}`}>{line}</span>
          </div>
        );
      })}
    </div>
  );
}
