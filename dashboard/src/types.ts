export type CaseStatus = "reported" | "requested" | "resolved";
export type Verdict = "pass" | "review" | "fail";

export interface TransferRecord {
  id: number;
  actor: string;
  counterparty: string;
  amount: string;
  asset: string;
  memo: string;
  reportedAt: number;
  countryCode: string;
  txHash?: string;
}

export interface OracleBundle {
  identity: { status: string; kycTier: string; confidence: number };
  sanctions: { watchlist: string; matches: string[]; score: number };
  geolocation: { countryCode: string; travelAdvisory: string; riskScore: number; region: string };
}

export interface ComplianceCase {
  transferId: number;
  status: CaseStatus;
  verdict: Verdict;
  riskScore: number;
  sanctionsHit: boolean;
  notes: string;
  requestedAt?: number;
  resolvedAt?: number;
  alerts: string[];
  oracle?: OracleBundle;
}

export type AuditAction = "freeze" | "DD" | "release";

export interface AuditWorkflowSummary {
  transferId: number;
  userId: string;
  internalTxId: string;
  action: AuditAction;
  strFiled: boolean;
  chainId: number;
  steps: { label: string; txHash: string }[];
}

export interface AuditEventRecord {
  eventId: number;
  type: string;
  userId: string;
  txHash: string;
  blockNumber: number;
  data: Record<string, unknown>;
}

export interface AuditConfig {
  contractAddress: string | null;
  chainId: number | null;
  canTransact: boolean;
}

