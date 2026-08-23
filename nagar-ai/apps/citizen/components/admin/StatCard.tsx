import { LucideIcon } from "lucide-react";

export default function StatCard({
  icon: Icon,
  label,
  value,
  accent = "text-signal",
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  accent?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-md border border-rule bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-ink/50">{label}</p>
        <Icon size={16} className={accent} />
      </div>
      <p className="mt-2 font-display text-3xl font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink/50">{hint}</p>}
    </div>
  );
}
