import { formatUnits } from "ethers";
import { OracleBundle, RuleEvaluation, TransferRecord, Verdict } from "./types.js";

const HIGH_VALUE = 100_000;
const VERY_HIGH_VALUE = 250_000;

interface RuleOutput {
  verdict: Verdict;
  riskScore: number; // 0-100
  alerts: string[];
  evaluations: RuleEvaluation[];
  notes: string;
  sanctionsHit: boolean;
}

export function evaluateRules(transfer: TransferRecord, oracle: OracleBundle): RuleOutput {
  const amount = Number(formatUnits(BigInt(transfer.amount ?? "0"), 6));
  let verdict: Verdict = "pass";
  let riskScore = 15;
  let sanctionsHit = false;
  const alerts: string[] = [];
  const evaluations: RuleEvaluation[] = [];

  const addEval = (rule: string, triggered: boolean, details: string) => {
    evaluations.push({ rule, triggered, details });
    if (triggered) alerts.push(`${rule}: ${details}`);
  };

  const sanctionTriggered = oracle.sanctions.score >= 0.8;
  addEval("Sanctions", sanctionTriggered, sanctionTriggered ? "Sanctions match confidence above 0.8" : "No matches");
  if (sanctionTriggered) {
    verdict = "fail";
    riskScore = Math.max(riskScore, 95);
    sanctionsHit = true;
  }

  const pepTriggered = oracle.sanctions.watchlist === "pep";
  addEval("PEP", pepTriggered, pepTriggered ? "Politically exposed person hit" : "Not on PEP list");
  if (pepTriggered && verdict !== "fail") {
    verdict = "review";
    riskScore = Math.max(riskScore, 62);
  }

  const geoHigh = oracle.geolocation.riskScore >= 0.7;
  addEval(
    "GeoRisk",
    geoHigh,
    geoHigh ? `Country ${oracle.geolocation.countryCode} in high-risk band` : "Country deemed low/medium risk"
  );
  if (geoHigh && verdict !== "fail") {
    verdict = "review";
    riskScore = Math.max(riskScore, 55);
  }

  const identityLow = oracle.identity.confidence < 0.5;
  addEval(
    "IdentityConfidence",
    identityLow,
    identityLow ? `Identity confidence ${oracle.identity.confidence}` : "Identity confidence acceptable"
  );
  if (identityLow && verdict === "pass") {
    verdict = "review";
    riskScore = Math.max(riskScore, 50);
  }

  const highAmount = amount >= HIGH_VALUE;
  addEval(
    "HighValue",
    highAmount,
    highAmount ? `Transfer exceeds ${HIGH_VALUE} USD` : "Transfer below high-value threshold"
  );
  if (highAmount) {
    riskScore = Math.max(riskScore, 60);
    if (amount >= VERY_HIGH_VALUE || (identityLow && geoHigh)) {
      verdict = "fail";
      riskScore = Math.max(riskScore, 90);
    } else if (verdict === "pass") {
      verdict = "review";
    }
  }

  const notes = alerts.length ? alerts.join(" | ") : "No rules triggered";
  return { verdict, riskScore, alerts, evaluations, notes, sanctionsHit };
}

