const STATUS_STYLES: Record<string, string> = {
  submitted: "border-signal/40 bg-signal/10 text-signal",
  under_review: "border-signal/40 bg-signal/10 text-signal",
  assigned: "border-hazard/50 bg-hazard/15 text-hazard-dark",
  in_progress: "border-hazard/50 bg-hazard/15 text-hazard-dark",
  resolved: "border-moss/40 bg-moss/10 text-moss",
  rejected: "border-ink/30 bg-ink/5 text-ink/60",
  duplicate: "border-hazard/50 bg-hazard/15 text-hazard-dark",
};

export default function StatusBadge({
  status,
  className = "",
}: {
  status: string;
  className?: string;
}) {
  const style = STATUS_STYLES[status] ?? "border-rule bg-white text-ink";
  return (
    <span
      className={`inline-block select-none whitespace-nowrap rounded-sm px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wide ${style} ${className}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
