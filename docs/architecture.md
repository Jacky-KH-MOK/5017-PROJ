## Stablecoin Compliance Demo Architecture

### Goals
- Provide an auditable path from on-chain transfers to off-chain AML/KYC verdicts.
- Showcase modular oracle integrations and a tunable rules engine.
- Deliver a dashboard that makes compliance insights understandable for demos.

### High-Level Components
1. **CEX AML Audit-Trail Contract**
   - Solidity contract deployed via Hardhat.
   - Emits `SuspiciousActivity`, `DepositTrace`, and `AmlResolution` audit events when the backend calls the corresponding `log*` functions.
   - Restricts mutation to a single trusted backend address captured at deployment time.
2. **Oracle Bridge Listener**
   - Hardhat/ethers script (part of compliance engine) subscribes to contract events.
   - Forwards payloads to mock oracle services and aggregates results.
3. **Mock Oracle Services**
   - Express server exposing `/identity`, `/sanctions`, `/geolocation`.
   - Deterministic responses keyed by wallet or transaction metadata to keep demos repeatable.
4. **Compliance Engine API**
   - Node/Express service.
   - Persists transactions and risk evaluations (initially in an in-memory store, swappable for PostgreSQL).
   - Hosts AML rules (thresholds, sanctions hits, geo risk, velocity, watchlists).
5. **React Compliance Dashboard**
   - Vite + TypeScript SPA.
   - Views: live feed, alerted cases with an on-chain audit workflow button, analytical network visualization, and a regulator tab that queries the audit-trail contract directly.
   - Connects to compliance engine over REST + WebSocket (mocked with Server-Sent Events for simplicity).

### Data Flow
1. Demo script (or backend worker) emits AML breadcrumbs via `logSuspicious`, `logDepositTrace`, or `logResolution` on `CexAmlAuditTrail`.
2. Contract event triggers the compliance engine listener for observability/logging.
3. Engine queries mock oracles:
   - Civic → identity confidence and KYC tier.
   - Refinitiv → sanctions/PEP scores.
   - Oraculos → geolocation risk bands.
4. Engine evaluates AML rules, updates case status, and emits dashboard notifications.
5. Dashboard fetches historical data via REST and listens for live updates via SSE.

### Tech Stack
| Layer | Stack | Notes |
| --- | --- | --- |
| Smart Contracts | Solidity 0.8.x, Hardhat, OpenZeppelin | Scripts in TypeScript, local Hardhat network |
| Oracle Mock Services | Node 20, Express, TypeScript | Single server with modular routers |
| Compliance Engine | Node 20, Express, ethers.js, Zod | Runs event listener + REST API |
| Dashboard | Vite, React 18, TypeScript, Tailwind CSS | Uses TanStack Query for data fetching |
| Shared Tooling | PNPM workspaces (fallback NPM), ESLint, Prettier | Root scripts orchestrate all packages |

### Environments
- **Local Demo:** Hardhat node + oracle mocks + compliance engine + dashboard, orchestrated via `npm run dev`.
- **CI Smoke:** Hardhat tests + Jest tests for services + React lint/build.

### Security & Compliance Considerations
- Use `.env` to hold RPC URLs, but default to local Hardhat provider for demos.
- On-chain writes are limited to the backend signer captured at deployment; off-chain services still enforce analyst/policy/auditor roles.
- Mock oracle responses are deterministic but shaped to illustrate pass/fail cases.

### Next Steps
1. Scaffold contracts package with Hardhat + OpenZeppelin.
2. Build oracle mock server with deterministic datasets.
3. Implement compliance engine (event listener, rules, REST, SSE).
4. Develop React dashboard consuming the engine API.
5. Seed demo transactions and wrap orchestration scripts.

