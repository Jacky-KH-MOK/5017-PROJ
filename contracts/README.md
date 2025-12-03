# Smart Contract: CexAmlAuditTrail

This directory contains the Solidity smart contracts for the Stablecoin Compliance Demo. The main contract, `CexAmlAuditTrail`, serves as an immutable, append-only ledger for recording AML (Anti-Money Laundering) decisions and audit trails.

## Prerequisites

- Node.js (v18 or v20 recommended)
- npm or pnpm

## Installation

Navigate to the `contracts` directory and install dependencies:

```bash
cd contracts
npm install
```

## Compilation

Compile the Solidity contracts to generate artifacts and type definitions:

```bash
npm run compile
```

This command uses Hardhat to compile `contracts/StablecoinMonitor.sol` and outputs artifacts to the `artifacts/` directory and TypeScript bindings to `typechain-types/`.

## Testing

Run the test suite to verify contract functionality:

```bash
npm run test
```

The tests (located in `test/StablecoinMonitor.ts`) cover:
- **Deployment**: Verifying the contract initializes correctly.
- **Access Control**: Ensuring only the authorized backend can log events.
- **Event Emission**: Validating that `SuspiciousActivity`, `DepositTrace`, and `AmlResolution` events are emitted with correct parameters (including the "Release" action).

## Local Deployment

To deploy the contract to a local Hardhat network:

1.  **Start the Local Node**
    Open a terminal and start the standalone Hardhat node. This spins up a local blockchain on `http://127.0.0.1:8545`.

    ```bash
    npm run node
    ```

2.  **Deploy the Contract**
    In a separate terminal (inside the `contracts` folder), run the deployment script:

    ```bash
    npm run deploy:local
    ```

    **What happens:**
    - The script deploys `CexAmlAuditTrail` to the local network.
    - It saves the deployment address and metadata to `../deployments/local.json`.
    - The frontend and compliance engine read this file to connect to the contract.

## Project Structure

- `contracts/`: Solidity source files.
- `scripts/`: Deployment and utility scripts (e.g., `deploy.ts`).
- `test/`: Hardhat tests written in TypeScript.
- `hardhat.config.ts`: Hardhat configuration (networks, solidity version, etc.).

## Events Reference

The contract emits the following events for the audit trail:

| Event | Description |
| :--- | :--- |
| `SuspiciousActivity` | Logs a suspicious internal transaction with a reason and timestamp. |
| `DepositTrace` | Links an internal user ID to an on-chain deposit transaction hash. |
| `AmlResolution` | Records the final decision (Freeze, DD, Release) and STR filing status. |

