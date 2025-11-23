import { clsx } from "clsx";
import { Verdict } from "../types";

export function RiskBadge({ verdict, compact }: { verdict: Verdict; compact?: boolean }) {
  const colorMap: Record<Verdict, string> = {
    pass: "bg-success/10 text-success border-success/40",
    review: "bg-warning/10 text-warning border-warning/40",
    fail: "bg-danger/10 text-danger border-danger/40",
  };
  const labelMap: Record<Verdict, string> = {
    pass: "Pass",
    review: "Review",
    fail: "Fail",
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full border px-3 py-0.5 text-sm font-semibold uppercase tracking-wide",
        colorMap[verdict],
        compact && "px-2 text-xs"
      )}
    >
      {labelMap[verdict]}
    </span>
  );
}

