## Compliance Dashboard

React + Vite single-page app visualizing stablecoin monitoring data.

### Features
- Transfer Live Feed tab showing every transaction with auto-triggered AML reviews.
- Alerted Cases tab auto-runs rules and lets analysts mark cases as escalated/dismissed (they drop out of the queue once actioned).
- Network Traces tab renders a live force-directed actor/counterparty graph (via `react-force-graph`) with case-focused filtering and edge value labels.
- Live case detail drawer surfacing oracle responses and rule alerts.
- React Query caching + SSE updates.

### Scripts
```bash
npm install
npm run dev
npm run build
```

Configure the API origin with `VITE_ENGINE_URL` (defaults to `http://localhost:4002`).

