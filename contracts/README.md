## CEX AML Audit Trail Contract

This Hardhat package deploys the `CexAmlAuditTrail` contract, an append-only ledger where the centralized exchange backend can broadcast AML events for downstream observers.

### Events
| Event | Description |
| --- | --- |
| `SuspiciousActivity` | Flags a user/internal transaction identifier with a textual reason and timestamp. |
| `DepositTrace` | Links an internal user to an on-chain deposit hash plus origin chain metadata. |
| `AmlResolution` | Documents the final action (freeze/release/etc.) and whether a SAR was filed. |

### Useful Commands
```bash
npm install
npm run compile
npm run node
npm run deploy:local
```

### Environment Variables
```
SEPOLIA_RPC=<https://...>
DEPLOYER_KEY=<0xabc...>
```

