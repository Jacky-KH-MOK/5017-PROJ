## Compliance Engine Service

Bridges the CEX AML audit-trail contract, oracle mocks, and dashboard.

### Features
- Logs `SuspiciousActivity`, `DepositTrace`, and `AmlResolution` on-chain events for observability and exposes endpoints to trigger those events from the UI.
- Calls Civic / Refinitiv / Oraculos mock endpoints.
- Applies AML rules and exposes REST + SSE APIs.
- Provides `/transfers/simulate` for deterministic demos.

### Key Endpoints
- `GET /transfers` – recent on-chain or simulated transfers.
- `POST /cases/:id/request` – run oracle + rules evaluation.
- `GET /stream` – server-sent events for UI live updates.

### Running
```bash
npm install
npm run dev
```

Environment variables:
```
COMPLIANCE_PORT=4002
ORACLE_BASE=http://localhost:4001
RPC_URL=http://127.0.0.1:8545
 MONITOR_ADDRESS=0x...          # address of the CexAmlAuditTrail contract
 CEX_BACKEND_KEY=0x...          # signer that emits audit-trail events
 AUDIT_CHAIN_ID=31337           # optional override if provider chain mismatch
```

