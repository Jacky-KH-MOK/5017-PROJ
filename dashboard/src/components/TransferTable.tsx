import { TransferRecord } from "../types";
import { RiskBadge } from "./RiskBadge";

interface Props {
  transfers: TransferRecord[];
  activeCaseVerdict?: Record<number, { verdict: string; status: string }>;
}

export function TransferTable({ transfers, activeCaseVerdict = {} }: Props) {
  const formatAmount = (raw: string) => {
    try {
      const value = Number(BigInt(raw)) / 1_000_000;
      return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    } catch {
      return raw;
    }
  };

  return (
    <div className="rounded-xl bg-slate-800/60 p-4 shadow-lg backdrop-blur">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-slate-400">Transfers</p>
          <h2 className="text-2xl font-semibold">Live Feed</h2>
        </div>
        <span className="text-sm text-slate-400">Latest {transfers.length} events</span>
      </div>
      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-700">
        <table className="min-w-full divide-y divide-slate-700 text-sm">
          <thead className="bg-slate-800 text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">Actor</th>
              <th className="px-4 py-3 text-left">Counterparty</th>
              <th className="px-4 py-3 text-left">Amount</th>
              <th className="px-4 py-3 text-left">Country</th>
              <th className="px-4 py-3 text-left">Memo</th>
              <th className="px-4 py-3 text-left">Case</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-100">
            {transfers.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-slate-400" colSpan={8}>
                  No transfers yet. Use the demo wallet to submit a mock transfer.
                </td>
              </tr>
            )}
            {transfers.map((transfer) => {
              const verdictInfo = activeCaseVerdict[transfer.id];
              return (
                <tr key={transfer.id} className="hover:bg-slate-800/80">
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">#{transfer.id}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{shorten(transfer.actor)}</p>
                    <p className="text-xs text-slate-400">{transfer.countryCode}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-300">
                    {shorten(transfer.counterparty)}
                  </td>
                  <td className="px-4 py-3 font-semibold">{formatAmount(transfer.amount)}</td>
                  <td className="px-4 py-3">{transfer.countryCode}</td>
                  <td className="px-4 py-3 text-slate-300">{transfer.memo || "—"}</td>
                  <td className="px-4 py-3">
                    {verdictInfo ? (
                      <RiskBadge verdict={verdictInfo.verdict as any} compact />
                    ) : (
                      <span className="text-xs text-slate-500">Pending</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-slate-500">Auto review queued</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function shorten(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}


