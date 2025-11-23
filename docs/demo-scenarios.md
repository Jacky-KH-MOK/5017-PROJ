## Demo Scenarios

| Scenario | Wallet | Description | Outcome |
| --- | --- | --- | --- |
| 1 | `0x1111…1111` → treasury sweep | Legit corporate treasury moving $125k to internal account | Pass |
| 2 | `0x2222…2222` → exchange settlement | Mid-risk geography, $25k | Review (geo) |
| 3 | `0x3333…3333` → OTC layering | High-risk wallet + sanctions hit | Fail |

Set `SEED_DEMO=true` before starting the compliance engine if you want these scenarios auto-loaded.

Mock oracle responses live in `services/oracle-mock/src/index.ts`. Adjust entries there to tweak demo storylines.

