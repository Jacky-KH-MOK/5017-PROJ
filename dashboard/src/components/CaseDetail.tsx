import { ComplianceCase } from "../types";
import { RiskBadge } from "./RiskBadge";

interface Props {
  caseData?: ComplianceCase | null;
}

export function CaseDetail({ caseData }: Props) {
  if (!caseData) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-400">
        Select a case to view oracle results.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-6 shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Case #{caseData.transferId}</p>
          <h2 className="text-2xl font-semibold capitalize">{caseData.status}</h2>
        </div>
        <RiskBadge verdict={caseData.verdict} />
      </div>

      <div className="mt-4 grid gap-3 text-sm text-slate-300">
        <InfoRow label="Notes" value={caseData.notes || "—"} />
        <InfoRow label="Risk score" value={caseData.riskScore.toString()} />
        <InfoRow label="Sanctions trigger" value={caseData.sanctionsHit ? "Yes" : "No"} />
        <InfoRow
          label="Requested"
          value={caseData.requestedAt ? new Date(caseData.requestedAt).toLocaleString() : "—"}
        />
        <InfoRow
          label="Resolved"
          value={caseData.resolvedAt ? new Date(caseData.resolvedAt).toLocaleString() : "—"}
        />
      </div>

      {caseData.oracle && (
        <div className="mt-6 space-y-4">
          <Section title="Identity (Civic)">
            <InfoRow label="Status" value={caseData.oracle.identity.status} />
            <InfoRow label="KYC Tier" value={caseData.oracle.identity.kycTier} />
            <InfoRow label="Confidence" value={caseData.oracle.identity.confidence.toFixed(2)} />
          </Section>
          <Section title="Sanctions (Refinitiv)">
            <InfoRow label="Watchlist" value={caseData.oracle.sanctions.watchlist} />
            <InfoRow label="Score" value={caseData.oracle.sanctions.score.toFixed(2)} />
            <InfoRow label="Matches" value={caseData.oracle.sanctions.matches.join(", ") || "None"} />
          </Section>
          <Section title="Geolocation (Oraculos)">
            <InfoRow label="Country" value={caseData.oracle.geolocation.countryCode} />
            <InfoRow label="Region" value={caseData.oracle.geolocation.region} />
            <InfoRow label="Risk Score" value={caseData.oracle.geolocation.riskScore.toFixed(2)} />
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">{title}</h3>
      <div className="mt-2 grid gap-2">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-900/60 px-3 py-2 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}

