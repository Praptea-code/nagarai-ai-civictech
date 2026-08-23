export const CATEGORY_LABELS: Record<string, string> = {
  pothole: "Pothole",
  garbage: "Garbage",
  water_leakage: "Water Leakage",
  streetlight: "Streetlight",
  flooding: "Flooding",
  drainage: "Drainage",
  other: "Other",
};

export const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS);

export const STATUS_OPTIONS = [
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under Review" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "rejected", label: "Rejected" },
  { value: "duplicate", label: "Duplicate" },
] as const;

export type StatusValue = (typeof STATUS_OPTIONS)[number]["value"];

export function statusLabel(status: string): string {
  return STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status.replace("_", " ");
}

export const SEVERITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
] as const;

export function severityLabel(severity: string | null | undefined): string {
  if (!severity) return "Unclassified";
  return SEVERITY_OPTIONS.find((s) => s.value === severity)?.label ?? severity;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function shortId(id: string): string {
  return id.slice(0, 8);
}
