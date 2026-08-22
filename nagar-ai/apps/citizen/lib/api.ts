import { log } from "@/lib/logger";
import { supabase } from "@/lib/supabase";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

export interface SubmitComplaintInput {
  description: string;
  category: string;
  latitude: number;
  longitude: number;
  ward?: string | null;
  municipality?: string | null;
  images?: File[];
}

export interface ComplaintCreated {
  id: string;
  status: string;
  category: string;
  severity: string | null;
  ai_summary: string | null;
  ai_confidence: number | null;
  duplicate_of_complaint_id: string | null;
  image_url: string | null;
  created_at: string;
}

export interface ComplaintListItem {
  id: string;
  description: string;
  category: string;
  severity: string | null;
  status: string;
  department: string | null;
  created_at: string;
  updated_at: string;
}

export interface StatusHistoryEntry {
  status: string;
  created_at: string;
}

export interface ComplaintDetail {
  id: string;
  description: string;
  status: string;
  status_history: StatusHistoryEntry[];
  image_urls: string[];
  duplicate_of_complaint_id: string | null;
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

async function requestJson<T>(path: string): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    let detail: string | undefined;
    try {
      detail = extractErrorDetail(await res.json());
    } catch {
      // non-JSON error body
    }
    log("warn", "api request failed", { path, status: res.status, detail });
    throw new Error(detail || `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

function extractErrorDetail(body: unknown): string | undefined {
  if (body && typeof body === "object" && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    return typeof detail === "string" ? detail : JSON.stringify(detail);
  }
  return undefined;
}

export async function submitComplaint(
  input: SubmitComplaintInput,
): Promise<ComplaintCreated> {
  const token = await getAccessToken();

  const form = new FormData();
  form.append("description", input.description);
  form.append("category", input.category);
  form.append("latitude", String(input.latitude));
  form.append("longitude", String(input.longitude));
  if (input.ward) form.append("ward", input.ward);
  if (input.municipality) form.append("municipality", input.municipality);
  for (const file of input.images ?? []) {
    form.append("images", file);
  }

  log("info", "submitComplaint sending", {
    category: input.category,
    numImages: input.images?.length ?? 0,
    descLen: input.description.length,
  });

  const res = await fetch(`${API_BASE}/complaints`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!res.ok) {
    let detail: string | undefined;
    try {
      detail = extractErrorDetail(await res.json());
    } catch {
      // non-JSON error body
    }
    log("warn", "submitComplaint rejected", { status: res.status, detail });
    throw new Error(detail || `Submission failed (${res.status})`);
  }

  const payload = (await res.json()) as ComplaintCreated;
  log("info", "submitComplaint success", {
    id: payload.id,
    status: payload.status,
  });
  return payload;
}

export async function fetchMyComplaints(): Promise<ComplaintListItem[]> {
  const payload = await requestJson<{ items: ComplaintListItem[]; total: number }>(
    "/complaints/mine",
  );
  log("info", "fetchMyComplaints success", {
    total: payload.total,
    returned: payload.items.length,
  });
  return payload.items;
}

export async function fetchComplaint(id: string): Promise<ComplaintDetail> {
  const payload = await requestJson<ComplaintDetail>(`/complaints/${id}`);
  log("info", "fetchComplaint success", { id: payload.id });
  return payload;
}
