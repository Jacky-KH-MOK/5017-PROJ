## Oracle Mock Service

Simulates Civic, Refinitiv, and Oraculos data sources for the demo.

### Endpoints
- `POST /identity` → `{ wallet }`
- `POST /sanctions` → `{ wallet }`
- `POST /geolocation` → `{ countryCode }`

### Usage
```bash
npm install
npm run dev
```

Configure the port via `ORACLE_PORT` (default `4001`).

