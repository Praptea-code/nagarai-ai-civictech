import { log } from "@/lib/logger";
import { supabase } from "@/lib/supabase";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

export interface AdminComplaintListItem {
  id: string;
  description: string;
  category: string;
  severity: string | null;
  status: string;
  ward: string | null;
  municipality: string | null;
  created_at: string;
  updated_at: string;
}

export interface StatusHistoryEntry {
  status: string;
  note: string | null;
  changed_by: string | null;
  created_at: string;
}

export interface CitizenInfo {
  id: string;
  full_name: string | null;
  phone: string | null;
}

export interface AdminComplaintDetail extends AdminComplaintListItem {
  latitude: number | null;
  longitude: number | null;
  ai_summary: string | null;
  ai_confidence: number | null;
  duplicate_of_complaint_id: string | null;
  department_id: string | null;
  citizen: CitizenInfo | null;
  image_urls: string[];
  status_history: StatusHistoryEntry[];
}

export interface DashboardSummary {
  total: number;
  by_status: Record<string, number>;
  by_severity: Record<string, number>;
  by_category: Record<string, number>;
  recent: AdminComplaintListItem[];
}

export interface ComplaintListQuery {
  status?: string;
  category?: string;
  severity?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

export interface ComplaintUpdateInput {
  status?: string;
  note?: string;
  department_id?: string | null;
}

async function getAccessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    log("warn", "getAccessToken no active session");
    throw new Error("You must be logged in to do that.");
  }
  return token;
}

function extractErrorDetail(body: unknown): string | undefined {
  if (body && typeof body === "object" && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    return typeof detail === "string" ? detail : JSON.stringify(detail);
  }
  return undefined;
}

async function request<T>(
  path: string,
  init?: { method?: string; body?: unknown }
): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${API_BASE}/admin${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) {
    let detail: string | undefined;
    try {
      detail = extractErrorDetail(await res.json());
    } catch {
      // non-JSON error body
    }
    log("warn", "admin api request failed", { path, status: res.status, detail });
    throw new Error(detail || `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export async function fetchAdminComplaints(
  query: ComplaintListQuery = {}
): Promise<{ items: AdminComplaintListItem[]; total: number }> {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.category) params.set("category", query.category);
  if (query.severity) params.set("severity", query.severity);
  if (query.q) params.set("q", query.q);
  if (query.limit !== undefined) params.set("limit", String(query.limit));
  if (query.offset !== undefined) params.set("offset", String(query.offset));
  const qs = params.toString();
  const payload = await request<{ items: AdminComplaintListItem[]; total: number }>(
    `/complaints${qs ? `?${qs}` : ""}`
  );
  log("info", "fetchAdminComplaints success", {
    total: payload.total,
    returned: payload.items.length,
  });
  return payload;
}

export async function fetchAdminComplaint(id: string): Promise<AdminComplaintDetail> {
  const payload = await request<AdminComplaintDetail>(`/complaints/${id}`);
  log("info", "fetchAdminComplaint success", { id: payload.id });
  return payload;
}

export async function updateComplaint(
  id: string,
  input: ComplaintUpdateInput
): Promise<AdminComplaintDetail> {
  const payload = await request<AdminComplaintDetail>(`/complaints/${id}`, {
    method: "PATCH",
    body: input,
  });
  log("info", "updateComplaint success", { id, status: payload.status });
  return payload;
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const payload = await request<DashboardSummary>("/dashboard/summary");
  log("info", "fetchDashboardSummary success", { total: payload.total });
  return payload;
}
