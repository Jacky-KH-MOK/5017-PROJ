## Stablecoin Compliance & Analytics Demo

End-to-end prototype that links a Solidity compliance monitor with oracle mocks, an off-chain AML engine, a compliance dashboard, and a demo wallet for generating test transfers.

### Repository Layout
- `contracts/` – Hardhat project containing the `CexAmlAuditTrail` audit-log contract.
- `services/oracle-mock/` – Mock Civic/Refinitiv/Oraculos endpoints.
- `services/compliance-engine/` – Event listener + AML rules engine + REST/SSE API.
- `dashboard/` – Analyst-facing React app for reviewing cases.
- `wallet/` – Demo wallet React app that injects transfers via the compliance engine’s simulate endpoint.
- `docs/` – Architecture notes, runbooks, and scenario guides.

### Prerequisites
- Node.js 18+
- PNPM or npm 8+ (workspaces enabled)
- This setup is cross-platform and works on macOS, Linux, and Windows.

### Quick Start
```bash
npm install
npm run dev
```

*Note: If using PNPM instead of npm, replace `npm` with `pnpm` in the commands above.*

The `dev` script:
1. Starts a Hardhat node on `127.0.0.1:8545`.
2. Deploys `CexAmlAuditTrail` (a simple append-only AML audit log) and records the address in `deployments/local.json`.
3. Launches the oracle mock (4001), compliance engine (4002), compliance dashboard (5173), and demo wallet (5174).

Once the stack is live:
## Demo wallet: 
- `http://localhost:5174` – submit preset or custom transfers (hit `/transfers/simulate`).
![Demo Wallet](images/demo_wallet.png)

## Compliance dashboard: 
- `http://localhost:5173` – monitor transfers, trigger AML checks, and inspect oracle verdicts. Use the role toggle (Analyst / Policy Admin / Auditor) to mirror the contract’s three lines of defense.

### Tabs
- **Transfer Live Feed** – real-time stream of simulated and wallet-generated transfers, including verdict badges once the AML engine finishes its review.
![Transfer_Live_Feed](images/Transfer_Live_Feed.png)

- **Alerted Cases** – queue of escalated cases with oracle context, STR switch, and the “Push Evidence On-Chain” workflow (Freeze, Due Diligence, or Release) that emits `logSuspicious` / `logDepositTrace` / `logResolution` events.
![Alerted_Cases](images/Alerted_Cases.png)

- **Regulator View** – on-chain replay portal where auditors can paste the copied userId/wallet to fetch audit trail events directly from the `CexAmlAuditTrail` contract.
![Regulator_View](images/Regulator_View.png)

By default the compliance engine starts empty; set `SEED_DEMO=true` before running if you want the three narrated demo cases pre-loaded (see `docs/demo-scenarios.md`). `docs/runbook.md` contains a walkthrough.
