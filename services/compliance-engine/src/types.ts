export type CaseStatus = "reported" | "requested" | "resolved";
export type Verdict = "pass" | "review" | "fail";

export interface TransferRecord {
  id: number;
  asset: string;
  actor: string;
  counterparty: string;
  amount: string;
  memo: string;
  reportedAt: number;
  countryCode: string;
  txHash?: string;
}

export interface OracleBundle {
  identity: {
    status: "verified" | "unverified";
    kycTier: string;
    confidence: number;
  };
  sanctions: {
    watchlist: string;
    matches: string[];
    score: number;
  };
  geolocation: {
    region: string;
    travelAdvisory: string;
    riskScore: number;
    countryCode: string;
  };
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

export interface RuleEvaluation {
  rule: string;
  triggered: boolean;
  details: string;
}

export interface ComplianceResult {
  caseData: ComplianceCase;
  evaluations: RuleEvaluation[];
}

