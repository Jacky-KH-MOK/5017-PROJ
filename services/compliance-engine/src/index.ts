import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import { ethers } from "ethers";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { evaluateRules } from "./rules.js";
import { getWalletContext } from "./demoContext.js";
import { auditTrailAbi } from "./abi.js";
import { ComplianceCase, OracleBundle, TransferRecord } from "./types.js";
import { demoScenarios } from "./demoScenarios.js";

const repoRoot = path.resolve(process.cwd(), "..", "..");
dotenv.config({ path: path.join(repoRoot, ".env") });
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const port = Number(process.env.COMPLIANCE_PORT ?? 4002);
const oracleBase = process.env.ORACLE_BASE ?? "http://127.0.0.1:4001";
const rpcUrl = process.env.RPC_URL ?? "http://127.0.0.1:8545";
const auditTrailAddress = loadAuditTrailAddress();
const provider = new ethers.JsonRpcProvider(rpcUrl);
const signerKey = process.env.CEX_BACKEND_KEY ?? process.env.DEPLOYER_KEY ?? "";
const auditTrailReader = auditTrailAddress ? new ethers.Contract(auditTrailAddress, auditTrailAbi, provider) : undefined;
const signer = signerKey ? new ethers.Wallet(signerKey, provider) : undefined;
const managedSigner = signer ? new ethers.NonceManager(signer) : undefined;
const auditTrailWriter = auditTrailReader && managedSigner ? auditTrailReader.connect(managedSigner) : undefined;
const reviewDelayMs = Number(process.env.REVIEW_DELAY_MS ?? 2500);
let resolvedChainId = Number(process.env.AUDIT_CHAIN_ID ?? 0);
provider
  .getNetwork()
  .then((network) => {
    if (!resolvedChainId) {
      resolvedChainId = Number(network.chainId);
    }
  })
  .catch(() => {
    resolvedChainId = resolvedChainId || 31337;
  });

const transfers = new Map<number, TransferRecord>();
const cases = new Map<number, ComplianceCase>();
const sseClients = new Set<express.Response>();
let nextTransferId = 1;

const simulateSchema = z.object({
  asset: z.string().default(ethers.ZeroAddress),
  actor: z.string(),
  counterparty: z.string(),
  amount: z.string().or(z.number().transform(String)),
  memo: z.string().default(""),
  txHash: z.string().optional(),
});

const workflowSchema = z.object({
  transferId: z.number(),
  action: z.enum(["freeze", "release", "confiscate"]).default("freeze"),
  strFiled: z.boolean().default(true),
});

const auditQuerySchema = z.object({
  userId: z.string().optional(),
});

app.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true, service: "compliance-engine" });
});

app.get("/transfers", (_req: Request, res: Response) => {
  res.json(Array.from(transfers.values()).sort((a, b) => b.id - a.id));
});

app.get("/cases", (_req: Request, res: Response) => {
  res.json(Array.from(cases.values()).sort((a, b) => b.transferId - a.transferId));
});

app.post("/transfers/simulate", (req: Request, res: Response) => {
  const result = simulateSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() });
  }
  const transfer = ingestTransfer({ ...result.data, synthetic: true });
  res.status(201).json(transfer);
});

app.post("/cases/:id/request", async (req: Request, res: Response) => {
  const transferId = Number(req.params.id);
  try {
    const caseData = await handleComplianceRequest(transferId);
    res.json(caseData);
  } catch (error: any) {
    res.status(400).json({ error: error.message ?? "Unable to process case" });
  }
});

app.post("/audit/workflow", async (req: Request, res: Response) => {
  const body = workflowSchema.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: body.error.flatten() });
  }
  if (!auditTrailAddress || !auditTrailWriter) {
    return res.status(400).json({ error: "Audit trail contract or signer missing" });
  }
  const transfer = transfers.get(body.data.transferId);
  if (!transfer) {
    return res.status(404).json({ error: "Transfer not found" });
  }
  try {
    const summary = await runAuditWorkflow({
      transfer,
      action: body.data.action,
      strFiled: body.data.strFiled,
    });
    res.json(summary);
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? "Failed to emit audit trail" });
  }
});

app.get("/audit/events", async (req: Request, res: Response) => {
  const query = auditQuerySchema.safeParse(req.query);
  if (!query.success) {
    return res.status(400).json({ error: query.error.flatten() });
  }
  if (!auditTrailReader || !auditTrailAddress) {
    return res.status(400).json({ error: "Audit trail contract not configured" });
  }
  try {
    const userId = query.data.userId ? deriveUserIdFromInput(query.data.userId) : undefined;
    const events = await queryAuditEvents(userId);
    res.json(events);
  } catch (error: any) {
    res.status(500).json({ error: error.message ?? "Unable to query audit events" });
  }
});

app.get("/audit/config", (_req: Request, res: Response) => {
  res.json({
    contractAddress: auditTrailAddress ?? null,
    chainId: currentChainId(),
    canTransact: Boolean(auditTrailWriter),
  });
});

app.get("/stream", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
  sseClients.add(res);
  res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);
  req.on("close", () => {
    sseClients.delete(res);
  });
});

function broadcast(event: string, payload: unknown) {
  const data = `data: ${JSON.stringify({ event, payload })}\n\n`;
  sseClients.forEach((client) => client.write(data));
}

function ingestTransfer(payload: {
  asset?: string;
  actor: string;
  counterparty: string;
  amount: string;
  memo: string;
  txHash?: string;
  synthetic?: boolean;
}) {
  const assignedId = nextTransferId++;
  const ctx = getWalletContext(payload.actor);
  const transfer: TransferRecord = {
    id: assignedId,
    asset: payload.asset ?? ethers.ZeroAddress,
    actor: payload.actor,
    counterparty: payload.counterparty,
    amount: payload.amount,
    memo: payload.memo,
    txHash: payload.txHash,
    reportedAt: Date.now(),
    countryCode: ctx.countryCode,
  };
  transfers.set(assignedId, transfer);
  const caseRecord: ComplianceCase = {
    transferId: assignedId,
    status: "reported",
    verdict: "review",
    riskScore: 0,
    sanctionsHit: false,
    notes: payload.synthetic ? "Simulated transfer" : "Awaiting analyst review",
    alerts: [],
  };
  cases.set(assignedId, caseRecord);
  broadcast("transfer", transfer);
  return transfer;
}

async function fetchOracleBundle(transfer: TransferRecord): Promise<OracleBundle> {
  const [identityRes, sanctionsRes, geoRes] = await Promise.all([
    axios.post(`${oracleBase}/identity`, { wallet: transfer.actor }),
    axios.post(`${oracleBase}/sanctions`, { wallet: transfer.actor }),
    axios.post(`${oracleBase}/geolocation`, { countryCode: transfer.countryCode }),
  ]);

  return {
    identity: identityRes.data,
    sanctions: sanctionsRes.data,
    geolocation: geoRes.data,
  };
}

async function handleComplianceRequest(transferId: number) {
  const transfer = transfers.get(transferId);
  if (!transfer) {
    throw new Error("Transfer not found");
  }
  const existing = cases.get(transferId) ?? {
    transferId,
    status: "reported",
    verdict: "review",
    riskScore: 0,
    sanctionsHit: false,
    notes: "",
    alerts: [],
  };
  existing.status = "requested";
  existing.notes = "Running rule evaluation";
  existing.alerts = [];
  existing.requestedAt = Date.now();
  cases.set(transferId, existing);
  broadcast("case", existing);

  if (reviewDelayMs > 0) {
    await delay(reviewDelayMs);
  }

  const oracle = await fetchOracleBundle(transfer);
  const evaluation = evaluateRules(transfer, oracle);
  existing.status = "resolved";
  existing.verdict = evaluation.verdict;
  existing.riskScore = evaluation.riskScore;
  existing.sanctionsHit = evaluation.sanctionsHit;
  existing.notes = evaluation.notes;
  existing.alerts = evaluation.alerts;
  existing.oracle = oracle;
  existing.resolvedAt = Date.now();
  cases.set(transferId, existing);
  broadcast("case", existing);
  return existing;
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function bootstrapContractListener() {
  if (!auditTrailAddress) {
    console.warn(
      "[compliance-engine] MONITOR_ADDRESS (audit trail address) not set (and no deployment file found), running in simulation mode."
    );
    return;
  }
  if (!auditTrailReader) {
    console.warn("[compliance-engine] audit trail contract not initialized; listener disabled");
    return;
  }
  try {
    console.log(`[compliance-engine] watching CexAmlAuditTrail at ${auditTrailAddress}`);

    auditTrailReader.on(
      "SuspiciousActivity",
      (evtId, userId, internalTxId, reason, timestamp) => {
        console.log(
          `[audit-trail] suspicious #${evtId.toString()} user=${userId} case=${internalTxId} reason="${reason}" ts=${timestamp}`
        );
      }
    );

    auditTrailReader.on(
      "DepositTrace",
      (evtId, userId, depositTxHash, chainId, sender, blockNumber) => {
        console.log(
          `[audit-trail] deposit-trace #${evtId.toString()} user=${userId} origin=${depositTxHash} chain=${chainId} sender=${sender} block=${blockNumber}`
        );
      }
    );

    auditTrailReader.on(
      "AmlResolution",
      (evtId, userId, internalTxId, action, strFiled, timestamp) => {
        console.log(
          `[audit-trail] resolution #${evtId.toString()} user=${userId} case=${internalTxId} action=${action} str=${strFiled} ts=${timestamp}`
        );
      }
    );
    console.log("[compliance-engine] listening to CexAmlAuditTrail events");
  } catch (error) {
    console.error("[compliance-engine] Failed to connect to contract", error);
  }
}
const enableAuditListener = (process.env.ENABLE_AUDIT_LISTENER ?? "false").toLowerCase() === "true";

if (enableAuditListener) {
  bootstrapContractListener();
} else {
  console.log("[compliance-engine] audit listener disabled (set ENABLE_AUDIT_LISTENER=true to enable)");
}

seedDemoData().catch((err) => console.error("[compliance-engine] seed failed", err));

app.listen(port, () => {
  console.log(`[compliance-engine] listening on port ${port}`);
});

async function seedDemoData() {
  const shouldSeed = (process.env.SEED_DEMO ?? "false").toLowerCase();
  if (shouldSeed !== "true") {
    console.log("[compliance-engine] SEED_DEMO not enabled; starting with an empty queue.");
    return;
  }
  if (transfers.size > 0) {
    return;
  }
  console.log(`[compliance-engine] seeding ${demoScenarios.length} demo scenarios`);
  for (const scenario of demoScenarios) {
    const transfer = ingestTransfer({ ...scenario, synthetic: true });
    if (scenario.autoRequest) {
      await handleComplianceRequest(transfer.id);
    }
  }
}

async function runAuditWorkflow(params: { transfer: TransferRecord; action: string; strFiled: boolean }) {
  if (!auditTrailWriter) {
    throw new Error("Audit trail signer unavailable");
  }
  const writer: any = auditTrailWriter;
  const userId = userIdFromActor(params.transfer.actor);
  const internalTxId = internalTxFromTransfer(params.transfer.id);
  const caseNotes = cases.get(params.transfer.id)?.notes?.trim();
  const reasonBase = params.transfer.memo?.length
    ? `Case #${params.transfer.id}: ${params.transfer.memo}`
    : `Automated escalation for transfer #${params.transfer.id}`;
  const reason = caseNotes && caseNotes.length > 0 ? `${reasonBase} — Notes: ${caseNotes}` : reasonBase;

  const suspiciousTx = await writer.logSuspicious(userId, internalTxId, reason);
  await suspiciousTx.wait();

  const latestBlock = await provider.getBlockNumber();
  const depositHash = depositHashFromTransfer(params.transfer);
  const depositTx = await writer.logDepositTrace(
    userId,
    depositHash,
    currentChainId(),
    params.transfer.actor,
    latestBlock
  );
  await depositTx.wait();

  const resolutionTx = await writer.logResolution(
    userId,
    internalTxId,
    params.action,
    params.strFiled
  );
  await resolutionTx.wait();

  const summary = {
    transferId: params.transfer.id,
    userId,
    internalTxId,
    action: params.action,
    strFiled: params.strFiled,
    chainId: currentChainId(),
    steps: [
      { label: "SuspiciousActivity", txHash: suspiciousTx.hash },
      { label: "DepositTrace", txHash: depositTx.hash },
      { label: "AmlResolution", txHash: resolutionTx.hash },
    ],
  };
  broadcast("audit", summary);
  return summary;
}

async function queryAuditEvents(userId?: string) {
  if (!auditTrailReader) {
    return [];
  }
  const fromBlock = Number(process.env.AUDIT_FROM_BLOCK ?? 0);
  const matchUserId = userId ? normalizeUserId(userId) : undefined;
  const filters = [
    {
      type: "SuspiciousActivity",
      filter: auditTrailReader.filters.SuspiciousActivity(),
      map: (args: any) => ({
        internalTxId: args.internalTxId,
        reason: args.reason,
        timestamp: Number(args.timestamp),
      }),
    },
    {
      type: "DepositTrace",
      filter: auditTrailReader.filters.DepositTrace(),
      map: (args: any) => ({
        originalDepositTxHash: args.originalDepositTxHash,
        chainId: Number(args.chainId),
        sender: args.sender,
        blockNumber: Number(args.blockNumber),
      }),
    },
    {
      type: "AmlResolution",
      filter: auditTrailReader.filters.AmlResolution(),
      map: (args: any) => ({
        internalTxId: args.internalTxId,
        action: args.action,
        strFiled: Boolean(args.sarFiled),
        timestamp: Number(args.timestamp),
      }),
    },
  ];

  const results = await Promise.all(
    filters.map(async ({ type, filter, map }) => {
      const logs = await auditTrailReader.queryFilter(filter, fromBlock, "latest");
      return logs
        .map((log) => {
          const parsed = auditTrailReader.interface.parseLog(log);
          const args = (parsed?.args ?? {}) as Record<string, any>;
          return {
            type,
            eventId: Number(args.eventId ?? 0),
            userId: String(args.userId ?? ""),
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
            data: map(args),
          };
        })
        .filter((entry) => {
          if (!matchUserId) {
            return true;
          }
          return normalizeUserId(entry.userId) === matchUserId;
        });
    })
  );

  return results.flat().sort((a, b) => a.eventId - b.eventId);
}

function userIdFromActor(actor: string): string {
  try {
    return ethers.zeroPadValue(ethers.getAddress(actor), 32);
  } catch {
    return ethers.encodeBytes32String(actor.slice(0, 31));
  }
}

function internalTxFromTransfer(transferId: number): string {
  return ethers.zeroPadValue(ethers.toBeHex(transferId), 32);
}

function depositHashFromTransfer(transfer: TransferRecord): string {
  if (transfer.txHash && ethers.isHexString(transfer.txHash, 32)) {
    return transfer.txHash;
  }
  return ethers.keccak256(
    ethers.toUtf8Bytes(`deposit-${transfer.id}-${transfer.actor}-${transfer.counterparty}`)
  );
}

function deriveUserIdFromInput(input?: string): string {
  if (!input) {
    throw new Error("userId is required");
  }
  const value = input!;
  if (ethers.isHexString(value, 32)) {
    return normalizeUserId(value);
  }
  if (ethers.isAddress(value)) {
    return userIdFromActor(value);
  }
  const normalized = String(value);
  return ethers.encodeBytes32String(normalized.slice(0, 31));
}

function normalizeUserId(value: string): string {
  if (!value) {
    return value;
  }
  const lower = value.toLowerCase();
  if (ethers.isHexString(lower)) {
    return ethers.zeroPadValue(lower, 32);
  }
  return lower;
}

function currentChainId(): number {
  return resolvedChainId || 31337;
}

function loadAuditTrailAddress(): string | undefined {
  if (process.env.MONITOR_ADDRESS && process.env.MONITOR_ADDRESS.length > 0) {
    return process.env.MONITOR_ADDRESS;
  }
  try {
    const repoRoot = path.resolve(process.cwd(), "..", "..");
    const deploymentFile = path.join(repoRoot, "deployments", "local.json");
    const raw = fs.readFileSync(deploymentFile, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed?.address) {
      console.log(`[compliance-engine] Loaded audit-trail address from ${deploymentFile}`);
      return parsed.address as string;
    }
  } catch {
    // ignore, caller will log a single warning
  }
  return undefined;
}

