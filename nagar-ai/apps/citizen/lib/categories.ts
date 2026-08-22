export const CATEGORY_LABELS: Record<string, string> = {
  pothole: "Pothole",
  garbage: "Garbage",
  water_leakage: "Water Leakage",
  streetlight: "Streetlight",
  flooding: "Flooding",
  drainage: "Drainage",
  other: "Other",
};

export const STATUS_BADGE_CLASSES: Record<string, string> = {
  submitted: "bg-gray-100 text-gray-700",
  under_review: "bg-yellow-100 text-yellow-800",
  assigned: "bg-indigo-100 text-indigo-800",
  in_progress: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-700",
  duplicate: "bg-purple-100 text-purple-800",
};

export function statusBadgeClass(status: string): string {
  return STATUS_BADGE_CLASSES[status] ?? "bg-gray-100 text-gray-700";
}
