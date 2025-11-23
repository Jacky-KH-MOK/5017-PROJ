import axios from "axios";
import {
  AuditAction,
  AuditConfig,
  AuditEventRecord,
  AuditWorkflowSummary,
  ComplianceCase,
  TransferRecord,
} from "../types";

const BASE_URL = import.meta.env.VITE_ENGINE_URL ?? "http://localhost:4002";

export async function fetchTransfers(): Promise<TransferRecord[]> {
  const { data } = await axios.get(`${BASE_URL}/transfers`);
  return data;
}

export async function fetchCases(): Promise<ComplianceCase[]> {
  const { data } = await axios.get(`${BASE_URL}/cases`);
  return data;
}

export async function requestComplianceCase(transferId: number): Promise<ComplianceCase> {
  const { data } = await axios.post(`${BASE_URL}/cases/${transferId}/request`);
  return data;
}

export async function triggerAuditWorkflow(payload: {
  transferId: number;
  action: AuditAction;
  strFiled: boolean;
}): Promise<AuditWorkflowSummary> {
  const { data } = await axios.post(`${BASE_URL}/audit/workflow`, payload);
  return data;
}

export async function fetchAuditEvents(userId?: string): Promise<AuditEventRecord[]> {
  const { data } = await axios.get(`${BASE_URL}/audit/events`, {
    params: userId ? { userId } : undefined,
  });
  return data;
}

export async function fetchAuditConfig(): Promise<AuditConfig> {
  const { data } = await axios.get(`${BASE_URL}/audit/config`);
  return data;
}

export const streamUrl = `${BASE_URL}/stream`;

