import {
  Droplets,
  Filter,
  Lightbulb,
  MoreHorizontal,
  Route,
  Trash2,
  Waves,
} from "lucide-react";

import { CATEGORY_LABELS } from "@/lib/constants";

const CATEGORY_ICONS: Record<string, typeof Route> = {
  pothole: Route,
  garbage: Trash2,
  water_leakage: Droplets,
  streetlight: Lightbulb,
  flooding: Waves,
  drainage: Filter,
  other: MoreHorizontal,
};

export default function CategoryTag({
  category,
  className = "",
}: {
  category: string;
  className?: string;
}) {
  const label = CATEGORY_LABELS[category] ?? category;
  const Icon = CATEGORY_ICONS[category] ?? MoreHorizontal;
  return (
    <span
      title={label}
      className={`inline-flex select-none items-center gap-1.5 whitespace-nowrap rounded-full border border-rule bg-white px-2 py-0.5 text-xs text-ink/70 ${className}`}
    >
      <Icon size={12} />
      {label}
    </span>
  );
}
