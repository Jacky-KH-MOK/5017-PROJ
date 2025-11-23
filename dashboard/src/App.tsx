import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchAuditConfig,
  fetchAuditEvents,
  fetchCases,
  fetchTransfers,
  requestComplianceCase,
  streamUrl,
  triggerAuditWorkflow,
} from "./api/client";
import { TransferTable } from "./components/TransferTable";
import { CaseList } from "./components/CaseList";
import { CaseDetail } from "./components/CaseDetail";
import { useSse } from "./hooks/useSse";
import {
  AuditAction,
  AuditConfig,
  AuditEventRecord,
  AuditWorkflowSummary,
  ComplianceCase,
  TransferRecord,
} from "./types";
import { NetworkGraph, GraphNode, GraphLink } from "./components/NetworkGraph";

export default function App() {
  const queryClient = useQueryClient();
  const [selectedCaseId, setSelectedCaseId] = useState<number>();
  const [escalations, setEscalations] = useState<Record<number, "escalated" | "dismissed">>({});
  const processedTransfers = useRef<Set<number>>(new Set());
  const [tab, setTab] = useState<"feed" | "alerts" | "network" | "regulator">("feed");
  const [networkCaseId, setNetworkCaseId] = useState<number | null>(null);
  const [auditAction, setAuditAction] = useState<AuditAction>("freeze");
  const [strFiled, setStrFiled] = useState(true);
  const [workflowSummary, setWorkflowSummary] = useState<AuditWorkflowSummary | null>(null);
  const [regulatorUserId, setRegulatorUserId] = useState("");
  const [userIdCopied, setUserIdCopied] = useState(false);
  const copyResetTimer = useRef<number>();

  const { data: transfers = [] } = useQuery({
    queryKey: ["transfers"],
    queryFn: fetchTransfers,
    refetchInterval: 10_000,
  });

  const { data: cases = [] } = useQuery({
    queryKey: ["cases"],
    queryFn: fetchCases,
    refetchInterval: 10_000,
  });

  const { data: auditConfig } = useQuery<AuditConfig>({
    queryKey: ["audit-config"],
    queryFn: fetchAuditConfig,
  });

  const requestMutation = useMutation({
    mutationFn: requestComplianceCase,
    onSuccess: (data) => {
      updateCases(data);
      setSelectedCaseId(data.transferId);
    },
  });

  const auditWorkflowMutation = useMutation({
    mutationFn: triggerAuditWorkflow,
    onSuccess: (data) => {
      setWorkflowSummary(data);
    },
  });

  const auditEventsMutation = useMutation({
    mutationFn: (userId?: string) => fetchAuditEvents(userId),
  });

  const updateCases = (updated: ComplianceCase) => {
    queryClient.setQueryData<ComplianceCase[]>(["cases"], (current = []) => {
      const existingIndex = current.findIndex((item) => item.transferId === updated.transferId);
      if (existingIndex >= 0) {
        const clone = [...current];
        clone[existingIndex] = updated;
        return clone;
      }
      return [updated, ...current];
    });
  };

  const triggerAutoReview = useCallback(
    (transferId: number) => {
      if (processedTransfers.current.has(transferId)) {
        return;
      }
      processedTransfers.current.add(transferId);
      requestMutation.mutate(transferId, {
        onError: () => {
          processedTransfers.current.delete(transferId);
        },
      });
    },
    [requestMutation]
  );

  const handleSse = useCallback(
    (event: string, payload: any) => {
      if (event === "transfer") {
        queryClient.setQueryData(["transfers"], (current: any[] = []) => {
          const exists = current.find((item) => item.id === payload.id);
          if (exists) return current;
          return [payload, ...current].slice(0, 25);
        });
        triggerAutoReview(payload.id);
      }
      if (event === "case") {
        updateCases(payload as ComplianceCase);
      }
      if (event === "audit") {
        setWorkflowSummary(payload as AuditWorkflowSummary);
      }
    },
    [queryClient, triggerAutoReview, updateCases]
  );

  useSse(streamUrl, handleSse);

  useEffect(() => {
    transfers.forEach((transfer) => triggerAutoReview(transfer.id));
  }, [transfers, triggerAutoReview]);

  useEffect(() => {
    setWorkflowSummary(null);
    setUserIdCopied(false);
  }, [selectedCaseId]);

  useEffect(() => {
    return () => {
      if (copyResetTimer.current) {
        window.clearTimeout(copyResetTimer.current);
      }
    };
  }, []);

  const verdictLookup = useMemo(() => {
    return cases.reduce(
      (acc, curr) => {
        acc[curr.transferId] = { verdict: curr.verdict, status: curr.status };
        return acc;
      },
      {} as Record<number, { verdict: string; status: string }>
    );
  }, [cases]);

  const selectedCase = cases.find((c) => c.transferId === selectedCaseId) ?? cases[0];
  const auditDisabledReason = !selectedCase
    ? "Select a case first"
    : !auditConfig?.contractAddress
    ? "Audit trail contract not deployed"
    : !auditConfig?.canTransact
    ? "Backend signer unavailable"
    : undefined;
  const alertedCases = useMemo(
    () =>
      cases.filter((caseItem) => {
        if (escalations[caseItem.transferId]) return false;
        return caseItem.verdict !== "pass" || caseItem.alerts.length > 0;
      }),
    [cases, escalations]
  );
  const stats = buildStats(cases);
  const graphData = useMemo(() => buildGraphData(transfers), [transfers]);
  const networkOptions = useMemo(
    () =>
      Object.entries(escalations)
        .filter(([, status]) => status === "escalated")
        .map(([caseId]) => Number(caseId)),
    [escalations]
  );
  const highlightNodes = useMemo(() => computeHighlightNodes(graphData.links, networkCaseId), [graphData.links, networkCaseId]);
  const regulatorEvents = auditEventsMutation.data ?? [];
  const auditErrorMessage = auditWorkflowMutation.error
    ? (auditWorkflowMutation.error as any)?.response?.data?.error ??
      (auditWorkflowMutation.error as Error)?.message ??
      "Unable to emit audit trail"
    : "";
  const regulatorErrorMessage = auditEventsMutation.error
    ? (auditEventsMutation.error as any)?.response?.data?.error ??
      (auditEventsMutation.error as Error)?.message ??
      "Unable to fetch events"
    : "";
  const handleRegulatorSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    auditEventsMutation.mutate(regulatorUserId.trim() || undefined);
  };

  const handleCopyUserId = useCallback(
    async (value: string) => {
      if (!value) return;
      try {
        await navigator.clipboard.writeText(value);
        setUserIdCopied(true);
        if (copyResetTimer.current) {
          window.clearTimeout(copyResetTimer.current);
        }
        copyResetTimer.current = window.setTimeout(() => setUserIdCopied(false), 2000);
      } catch {
        setUserIdCopied(false);
      }
    },
    []
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 pb-12 text-white">
      <header className="border-b border-slate-800 bg-slate-900/60 p-6 backdrop-blur">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Stablecoin Compliance Lab</p>
        <h1 className="mt-2 text-3xl font-bold">Live Compliance Console</h1>
        <p className="mt-1 text-slate-400">
          Monitor stablecoin transfers, trigger AML workflows, and inspect oracle verdicts in real time.
        </p>
        <div className="mt-6 inline-flex rounded-xl border border-slate-700 bg-slate-800/50 p-1 text-sm font-semibold text-slate-300">
          <button
            className={`rounded-lg px-4 py-1 transition ${tab === "feed" ? "bg-primary text-white" : ""}`}
            onClick={() => setTab("feed")}
          >
            Transfer Live Feed
          </button>
          <button
            className={`rounded-lg px-4 py-1 transition ${tab === "alerts" ? "bg-primary text-white" : ""}`}
            onClick={() => setTab("alerts")}
          >
            Alerted Cases
          </button>
          {/* <button
            className={`rounded-lg px-4 py-1 transition ${tab === "network" ? "bg-primary text-white" : ""}`}
            onClick={() => setTab("network")}
          >
            Analytical Network
          </button> */}
          <button
            className={`rounded-lg px-4 py-1 transition ${tab === "regulator" ? "bg-primary text-white" : ""}`}
            onClick={() => setTab("regulator")}
          >
            Regulator View
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 p-6">
        {tab === "feed" && (
          <section className="space-y-6">
            <StatsRow stats={stats} />
            <TransferTable transfers={transfers} activeCaseVerdict={verdictLookup} />
          </section>
        )}

        {tab === "alerts" && (
          <section className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
            <div className="rounded-xl bg-slate-800/60 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Alerted Cases</p>
                  <h2 className="text-2xl font-semibold">Rule Triggered Reviews</h2>
                </div>
                <span className="text-sm text-slate-400">{alertedCases.length} flagged</span>
              </div>
              <div className="mt-4 max-h-[420px] overflow-y-auto pr-2">
                <CaseList cases={alertedCases} onSelect={setSelectedCaseId} selectedId={selectedCase?.transferId} />
              </div>
            </div>
            <div className="space-y-4">
              {selectedCase ? (
                <>
                  <CaseDetail caseData={selectedCase} />
                  {/* <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Escalation Decision</p>
                    <h3 className="text-lg font-semibold text-white">Second-Line Action</h3>
                    <p className="mt-2 text-sm text-slate-300">
                      Alerts triggered by predefined rules automatically run AML checks. Confirm whether this case needs escalation to policy or can be cleared.
                    </p>
                    <div className="mt-4 flex gap-3">
                      <button
                        onClick={() => {
                          setEscalations((prev) => ({ ...prev, [selectedCase.transferId]: "escalated" }));
                          setSelectedCaseId(undefined);
                        }}
                        className="rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white hover:bg-danger/80"
                      >
                        Escalate
                      </button>
                      <button
                        onClick={() => {
                          setEscalations((prev) => ({ ...prev, [selectedCase.transferId]: "dismissed" }));
                          setSelectedCaseId(undefined);
                        }}
                        className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-400"
                      >
                        Dismiss
                      </button>
                    </div>
                    {escalations[selectedCase.transferId] && (
                      <p className="mt-3 text-sm text-slate-300">
                        Decision recorded:{" "}
                        <span className="font-semibold uppercase">{escalations[selectedCase.transferId]}</span>
                      </p>
                    )}
                  </div> */}
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-600 bg-slate-900/40 p-6 text-center text-sm text-slate-400">
                  Select an alerted case to review its details and record an escalation decision.
                </div>
              )}
              <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Hybrid Audit Trail</p>
                <h3 className="text-lg font-semibold text-white">Push Evidence On-Chain</h3>
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-200">
                  <label className="flex flex-col gap-1">
                    Resolution Action
                    <select
                      className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2"
                      value={auditAction}
                      onChange={(event) => setAuditAction(event.target.value as AuditAction)}
                    >
                      <option value="freeze">Freeze assets</option>
                      <option value="DD">Due diligence</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={strFiled}
                      onChange={(event) => setStrFiled(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-900"
                    />
                    STR Filed
                  </label>
                </div>
                <button
                  onClick={() => {
                    if (!selectedCase) return;
                    auditWorkflowMutation.mutate({
                      transferId: selectedCase.transferId,
                      action: auditAction,
                      strFiled,
                    });
                  }}
                  disabled={Boolean(auditDisabledReason) || auditWorkflowMutation.isPending}
                  className="mt-4 w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-primary/40"
                >
                  {auditWorkflowMutation.isPending ? "Publishing trail…" : "Emit Audit Trail Events"}
                </button>
                {auditDisabledReason && (
                  <p className="mt-2 text-xs text-slate-400">{auditDisabledReason}</p>
                )}
                {auditErrorMessage && !auditDisabledReason && (
                  <p className="mt-2 text-xs text-danger">{auditErrorMessage}</p>
                )}
                {workflowSummary && (
                  <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900/40 p-3 text-xs text-slate-200">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">Latest emission for user</p>
                      <span className="font-mono text-[11px] text-primary break-all">
                        {workflowSummary.userId}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyUserId(workflowSummary.userId)}
                        className="rounded border border-slate-600 px-2 py-1 text-[11px] font-semibold text-white hover:border-slate-400"
                      >
                        {userIdCopied ? "Copied" : "Copy userId"}
                      </button>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Paste this full identifier (without the ellipsis) into the regulator portal input to replay the trail.
                    </p>
                    <ul className="mt-2 space-y-1">
                      {workflowSummary.steps.map((step) => (
                        <li key={step.label} className="flex justify-between gap-4">
                          <span>{step.label}</span>
                          <span className="font-mono text-[11px] text-primary">{shortenHex(step.txHash, 6)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {tab === "network" && (
          <section className="space-y-4">
            <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Trace Scope</p>
                  <h3 className="text-xl_font-semibold text-white">Focus escalated case</h3>
                </div>
                <select
                  className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-1 text-sm text-white"
                  value={networkCaseId ?? ""}
                  onChange={(event) => setNetworkCaseId(event.target.value ? Number(event.target.value) : null)}
                  disabled={networkOptions.length === 0}
                >
                  <option value="">{networkOptions.length ? "All cases" : "No escalated cases"}</option>
                  {networkOptions.map((option) => (
                    <option key={option} value={option}>
                      Case #{option}
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-2 text-sm text-slate-300">
                Visualize how actors and counterparties interconnect around the chosen case to narrate velocity and corridor
                exposure.
              </p>
            </div>
            <NetworkGraph
              nodes={graphData.nodes}
              links={graphData.links}
              highlightCaseId={networkCaseId}
              highlightNodes={highlightNodes}
            />
          </section>
        )}

        {tab === "regulator" && (
          <section className="space-y-6">
            <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Regulator / Auditor Portal</p>
              <h2 className="text-2xl font-semibold text-white">Query the On-Chain Audit Trail</h2>
              <p className="mt-2 text-sm text-slate-300">
                Provide the smart-contract address + user identifier, then reproduce the trail directly from the blockchain. Use the
                <span className="font-semibold"> full wallet address</span> from the case detail (or the copy button above) — do not
                include the ellipsis characters.
                For this demo we map wallet addresses → bytes32 IDs, so you can paste either format.
              </p>
              <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/40 p-3 text-xs text-slate-400">
                <div>Contract: {auditConfig?.contractAddress ?? "Not deployed"}</div>
                <div>Chain ID: {auditConfig?.chainId ?? "unknown"}</div>
              </div>
              <form className="mt-4 flex flex-col gap-3 md:flex-row" onSubmit={handleRegulatorSubmit}>
                <input
                  value={regulatorUserId}
                  onChange={(event) => setRegulatorUserId(event.target.value)}
                  className="flex-1 rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-white"
                  placeholder="Wallet address or userId (bytes32)"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-primary/40"
                  disabled={auditEventsMutation.isPending}
                >
                  {auditEventsMutation.isPending ? "Querying…" : "Query On-Chain Logs"}
                </button>
              </form>
              {regulatorErrorMessage && (
                <p className="mt-2 text-xs text-danger">{regulatorErrorMessage}</p>
              )}
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Audit Events</p>
                  <h3 className="text-xl font-semibold text-white">Chain-of-custody Evidence</h3>
                </div>
                <span className="text-sm text-slate-400">{regulatorEvents.length} records</span>
              </div>
              <div className="mt-4 space-y-3">
                {auditEventsMutation.isPending && <p className="text-sm text-slate-400">Fetching logs…</p>}
                {!auditEventsMutation.isPending && regulatorEvents.length === 0 && (
                  <p className="text-sm text-slate-400">No audit events returned for the supplied identifier.</p>
                )}
                {regulatorEvents.map((event) => (
                  <div key={`${event.type}-${event.eventId}-${event.txHash}`} className="rounded-lg border border-slate-700 bg-slate-900/60 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400">#{event.eventId.toString()}</p>
                        <h4 className="text-lg font-semibold capitalize">{event.type}</h4>
                      </div>
                      <div className="text-xs text-slate-400">
                        Tx {shortenHex(event.txHash, 6)} • Block {event.blockNumber}
                      </div>
                    </div>
                    <dl className="mt-2 grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
                      {Object.entries(event.data).map(([key, value]) => (
                        <div key={key} className="flex flex-col">
                          <dt className="uppercase tracking-wide text-[10px] text-slate-500">{key}</dt>
                          <dd className="font-mono text-[11px] text-primary">{String(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function buildGraphData(transfers: TransferRecord[]) {
  const nodesMap = new Map<string, GraphNode>();
  const links: GraphLink[] = [];

  transfers.slice(0, 50).forEach((transfer) => {
    if (!nodesMap.has(transfer.actor)) {
      nodesMap.set(transfer.actor, {
        id: transfer.actor,
        label: `${transfer.actor.slice(0, 6)}…`,
        type: "actor",
        risk: 0.3,
      });
    }
    if (!nodesMap.has(transfer.counterparty)) {
      nodesMap.set(transfer.counterparty, {
        id: transfer.counterparty,
        label: `${transfer.counterparty.slice(0, 6)}…`,
        type: "counterparty",
        risk: Math.random(),
      });
    }
    links.push({
      source: transfer.actor,
      target: transfer.counterparty,
      amount: Number(BigInt(transfer.amount)) / 1_000_000,
      transferId: transfer.id,
    });
  });

  return {
    nodes: Array.from(nodesMap.values()),
    links,
  };
}

function computeHighlightNodes(links: GraphLink[], caseId: number | null) {
  if (!caseId) return null;
  const nodeIds = new Set<string>();
  links.forEach((link) => {
    if (link.transferId === caseId) {
      nodeIds.add(link.source as string);
      nodeIds.add(link.target as string);
    }
  });
  return nodeIds.size ? nodeIds : null;
}

function buildStats(cases: ComplianceCase[]) {
  const total = cases.length;
  const failed = cases.filter((c) => c.verdict === "fail").length;
  const review = cases.filter((c) => c.verdict === "review").length;
  return [
    { label: "Total Cases", value: total },
    { label: "Escalated", value: failed },
    { label: "Under Review", value: review },
  ];
}

function shortenHex(value?: string, chars = 4) {
  if (!value || !value.startsWith("0x") || value.length <= chars * 2 + 4) {
    return value ?? "";
  }
  return `${value.slice(0, chars + 2)}…${value.slice(-chars)}`;
}

function StatsRow({ stats }: { stats: { label: string; value: number }[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-center">
          <p className="text-xs uppercase tracking-widest text-slate-400">{stat.label}</p>
          <p className="mt-2 text-3xl font-bold">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}

