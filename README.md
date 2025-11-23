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

### Quick Start
```bash
npm install
npm run dev
```

The `dev` script:
1. Starts a Hardhat node on `127.0.0.1:8545`.
2. Deploys `CexAmlAuditTrail` (a simple append-only AML audit log) and records the address in `deployments/local.json`.
3. Launches the oracle mock (4001), compliance engine (4002), compliance dashboard (5173), and demo wallet (5174).

Once the stack is live:
- Demo wallet: `http://localhost:5174` – submit preset or custom transfers (hit `/transfers/simulate`).
- Compliance dashboard: `http://localhost:5173` – monitor transfers, trigger AML checks, and inspect oracle verdicts. Use the role toggle (Analyst / Policy Admin / Auditor) to mirror the contract’s three lines of defense.
- Alerted Cases tab: run the "Push Evidence On-Chain" workflow to emit `logSuspicious` / `logDepositTrace` / `logResolution` events, then switch to the Regulator View tab to replay those events straight from the audit-trail contract.

Need only the UI/services? Run `npm run dev:stack` (assumes you already have a node + deployment available). By default the compliance engine starts empty; set `SEED_DEMO=true` before running if you want the three narrated demo cases pre-loaded (see `docs/demo-scenarios.md`). `docs/runbook.md` contains a walkthrough.

### Docker

Build and run the entire stack inside a single container using the provided `Dockerfile` + `docker-compose.yml`:

```bash
docker compose build
docker compose up
```

The compose file exposes every port the stack needs:
- Hardhat JSON-RPC `8545`
- Oracle mock API `4001`
- Compliance engine API/SSE `4002`
- Analyst dashboard `5173`
- Demo wallet `5174`

When the container is running, navigate to `http://localhost:5173` for the dashboard and `http://localhost:5174` for the wallet. Stop the stack with `docker compose down`.

### Environment Variables
- `services/oracle-mock`: `ORACLE_PORT` (default `4001`)
- `services/compliance-engine`: `COMPLIANCE_PORT`, `ORACLE_BASE`, `RPC_URL`, `MONITOR_ADDRESS` (audit-trail address), `CEX_BACKEND_KEY` (signs on-chain logs), `AUDIT_CHAIN_ID`, `SEED_DEMO`
- `dashboard`: `VITE_ENGINE_URL` (default `http://localhost:4002`)
- `wallet`: `VITE_ENGINE_URL` (default `http://localhost:4002`)

Keep the oracle mock running before starting the compliance engine; the engine will attempt to call `/identity`, `/sanctions`, and `/geolocation` immediately during seeding.

