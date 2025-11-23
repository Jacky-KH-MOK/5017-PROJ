## Demo Wallet

Simple React app that injects mock transfers into the compliance engine via the `/transfers/simulate` endpoint. Use it during demos as the first-line (analyst) submission UI, separate from the compliance dashboard.

### Scripts
```bash
npm install
npm run dev
```

Set `VITE_ENGINE_URL` to the compliance engine origin if different from the default `http://localhost:4002`.

