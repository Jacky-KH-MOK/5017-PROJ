## Demo Runbook

1. **Install**
   ```bash
   npm install
   ```

2. **Launch full stack**
   ```bash
   npm run dev
   ```
   This command starts the Hardhat node, deploys `CexAmlAuditTrail`, and runs the oracle mock (4001), compliance engine (4002), dashboard (5173), and wallet (5174).

3. **Interact**
   - Wallet: `http://localhost:5174` — inject preset/custom transfers.
   - Dashboard: `http://localhost:5173` — monitor flows, trigger AML checks, and inspect oracles.
   - Alerted Cases tab: run the "Push Evidence On-Chain" button to emit audit events, then open the Regulator View tab to query the same contract by user ID.

4. **Troubleshooting**
   - Oracle mock health: `curl http://localhost:4001/health`
   - Compliance engine health: `curl http://localhost:4002/health`
   - Want the canned demo cases pre-loaded? Set `SEED_DEMO=true` before `npm run dev`.
   - Need only UI/services (node already running)? Use `npm run dev:stack`.

