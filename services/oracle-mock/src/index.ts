import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const port = Number(process.env.ORACLE_PORT ?? 4001);

type IdentityPayload = { wallet: string };
type SanctionsPayload = { wallet: string };
type GeoPayload = { countryCode: string };

const identityProfiles: Record<
  string,
  {
    status: "verified" | "unverified";
    kycTier: "lite" | "standard" | "enhanced";
    confidence: number;
  }
> = {
  "0x1111111111111111111111111111111111111111": {
    status: "verified",
    kycTier: "enhanced",
    confidence: 0.96,
  },
  "0x2222222222222222222222222222222222222222": {
    status: "verified",
    kycTier: "standard",
    confidence: 0.82,
  },
  "0x3333333333333333333333333333333333333333": {
    status: "unverified",
    kycTier: "lite",
    confidence: 0.31,
  },
};

const sanctionsRecords: Record<
  string,
  {
    watchlist: "none" | "pep" | "sanctioned";
    matches: string[];
    score: number;
  }
> = {
  "0x3333333333333333333333333333333333333333": {
    watchlist: "sanctioned",
    matches: ["OFAC-SDN-20492"],
    score: 0.92,
  },
  "0x4444444444444444444444444444444444444444": {
    watchlist: "pep",
    matches: ["PEP-5542"],
    score: 0.61,
  },
};

const geoRisk: Record<
  string,
  {
    region: string;
    travelAdvisory: "low" | "medium" | "high";
    riskScore: number;
  }
> = {
  USA: { region: "NA", travelAdvisory: "low", riskScore: 0.1 },
  CAN: { region: "NA", travelAdvisory: "low", riskScore: 0.15 },
  PAN: { region: "LATAM", travelAdvisory: "medium", riskScore: 0.48 },
  RUS: { region: "EEU", travelAdvisory: "high", riskScore: 0.9 },
  IRN: { region: "MENA", travelAdvisory: "high", riskScore: 0.95 },
};

const fallbackIdentity = {
  status: "unverified",
  kycTier: "lite",
  confidence: 0.25,
};

const fallbackSanctions = {
  watchlist: "none",
  matches: [],
  score: 0.05,
};

const fallbackGeo = {
  region: "UNKNOWN",
  travelAdvisory: "high",
  riskScore: 0.55,
};

app.get("/health", (_, res) => {
  res.json({ ok: true, service: "oracle-mock" });
});

app.post("/identity", (req, res) => {
  const { wallet } = req.body as IdentityPayload;
  if (!wallet) {
    return res.status(400).json({ error: "wallet is required" });
  }
  const profile = identityProfiles[wallet.toLowerCase()] ?? fallbackIdentity;
  res.json({ provider: "Civic", wallet, ...profile });
});

app.post("/sanctions", (req, res) => {
  const { wallet } = req.body as SanctionsPayload;
  if (!wallet) {
    return res.status(400).json({ error: "wallet is required" });
  }
  const record = sanctionsRecords[wallet.toLowerCase()] ?? fallbackSanctions;
  res.json({ provider: "Refinitiv", wallet, ...record });
});

app.post("/geolocation", (req, res) => {
  const { countryCode } = req.body as GeoPayload;
  if (!countryCode) {
    return res.status(400).json({ error: "countryCode is required" });
  }
  const normalized = countryCode.toUpperCase();
  const record = geoRisk[normalized] ?? fallbackGeo;
  res.json({ provider: "Oraculos", countryCode: normalized, ...record });
});

app.listen(port, () => {
  console.log(`[oracle-mock] listening on port ${port}`);
});

