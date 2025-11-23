import { ComplianceCase } from "../types";
import { RiskBadge } from "./RiskBadge";

interface Props {
  cases: ComplianceCase[];
  onSelect: (caseId: number) => void;
  selectedId?: number;
}

export function CaseList({ cases, onSelect, selectedId }: Props) {
  return (
    <div className="space-y-3">
      {cases.map((caseItem) => (
        <button
          key={caseItem.transferId}
          onClick={() => onSelect(caseItem.transferId)}
          className={`w-full rounded-xl border border-slate-700 bg-slate-800/60 p-4 text-left transition hover:border-primary ${
            selectedId === caseItem.transferId ? "border-primary" : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Case #{caseItem.transferId}</p>
              <h3 className="text-lg font-semibold capitalize">{caseItem.status}</h3>
            </div>
            <RiskBadge verdict={caseItem.verdict} />
          </div>
          <p className="mt-2 text-sm text-slate-300">{caseItem.notes || "Awaiting review"}</p>
          <div className="mt-2 text-xs text-slate-500">
            Risk score • <span className="font-semibold">{caseItem.riskScore}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

