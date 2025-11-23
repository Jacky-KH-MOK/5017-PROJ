import { useMemo, useState } from "react";
import axios from "axios";
import "./App.css";

type TransferRequest = {
  actor: string;
  counterparty: string;
  amount: string;
  memo: string;
  asset?: string;
};

type RecentTransfer = TransferRequest & {
  id: number;
  timestamp: number;
};

const API_BASE = import.meta.env.VITE_ENGINE_URL ?? "http://localhost:4002";

const scenarios: TransferRequest[] = [
  {
    actor: "0x1111111111111111111111111111111111111111",
    counterparty: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    amount: "125000000000",
    memo: "Treasury sweep",
  },
  {
    actor: "0x2222222222222222222222222222222222222222",
    counterparty: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    amount: "25000000000",
    memo: "Exchange settlement",
  },
  {
    actor: "0x3333333333333333333333333333333333333333",
    counterparty: "0xcccccccccccccccccccccccccccccccccccccccc",
    amount: "650000000000",
    memo: "Layered OTC trade",
  },
];

export default function App() {
  const [form, setForm] = useState<TransferRequest>(scenarios[0]);
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: "idle" | "success" | "error"; message?: string }>({
    type: "idle",
  });
  const [recent, setRecent] = useState<RecentTransfer[]>([]);

  const engineUrl = useMemo(() => API_BASE.replace(/\/$/, ""), []);

  const updateField = (key: keyof TransferRequest, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleScenarioChange = (index: number) => {
    setScenarioIndex(index);
    setForm(scenarios[index]);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setStatus({ type: "idle" });
    try {
      await axios.post(`${engineUrl}/transfers/simulate`, form);
      setStatus({ type: "success", message: "Transfer injected successfully" });
      setRecent((prev) => [
        { ...form, id: Date.now(), timestamp: Date.now() },
        ...prev.slice(0, 4),
      ]);
    } catch (error: any) {
      const message = error?.response?.data?.error ?? error?.message ?? "Failed to simulate transfer";
      setStatus({ type: "error", message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <main className="card">
        <header>
          <p className="eyebrow">Stablecoin Demo Wallet</p>
          <h1>Submit Test Transfers</h1>
          <p className="muted">
            Craft demo transactions that flow into the compliance dashboard. All requests call the compliance engine
            simulate endpoint—no real funds move.
          </p>
        </header>

        <section className="section">
          <div className="section-header">
            <h2>Preset Scenarios</h2>
            <select value={scenarioIndex} onChange={(e) => handleScenarioChange(Number(e.target.value))}>
              {scenarios.map((scenario, index) => (
                <option key={scenario.memo} value={index}>
                  Scenario {index + 1}: {scenario.memo}
                </option>
              ))}
            </select>
          </div>
          <ul className="scenario-list">
            {scenarios.map((scenario, index) => (
              <li key={scenario.memo} className={index === scenarioIndex ? "active" : ""}>
                <span className="scenario-title">{scenario.memo}</span>
                <span className="scenario-meta">
                  {shorten(scenario.actor)} → {shorten(scenario.counterparty)} • {prettyAmount(scenario.amount)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <form className="section form" onSubmit={handleSubmit}>
          <h2>Custom Transfer</h2>
          <label>
            Actor Address
            <input value={form.actor} onChange={(e) => updateField("actor", e.target.value)} required />
          </label>
          <label>
            Counterparty Address
            <input value={form.counterparty} onChange={(e) => updateField("counterparty", e.target.value)} required />
          </label>
          <label>
            Amount (6 decimals)
            <input value={form.amount} onChange={(e) => updateField("amount", e.target.value)} required />
          </label>
          <label>
            Memo / Reference
            <input value={form.memo} onChange={(e) => updateField("memo", e.target.value)} />
          </label>
          <button type="submit" disabled={submitting}>
            {submitting ? "Sending..." : "Submit Transfer"}
          </button>
          {status.type !== "idle" && (
            <p className={`status ${status.type}`}>{status.message ?? "No message available"}</p>
          )}
        </form>

        <section className="section">
          <div className="section-header">
            <h2>Recent Submissions</h2>
            <span className="muted">Latest 5 transfers</span>
          </div>
          {recent.length === 0 && <p className="muted">No submissions yet.</p>}
          <ul className="recent-list">
            {recent.map((item) => (
              <li key={item.id}>
                <p className="scenario-title">{item.memo || "Untitled transfer"}</p>
                <p className="scenario-meta">
                  {shorten(item.actor)} → {shorten(item.counterparty)} • {prettyAmount(item.amount)}
                </p>
                <span className="timestamp">{new Date(item.timestamp).toLocaleTimeString()}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

function prettyAmount(value: string) {
  try {
    const amount = Number(BigInt(value)) / 1_000_000;
    return `$${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  } catch {
    return value;
  }
}

function shorten(address: string) {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

