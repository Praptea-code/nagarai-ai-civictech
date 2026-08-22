const STATUS_STYLES: Record<string, string> = {
  submitted: "border-signal text-signal",
  under_review: "border-signal text-signal",
  assigned: "border-hazard text-hazard-dark",
  in_progress: "border-hazard text-hazard-dark",
  resolved: "border-moss text-moss",
  // Muted ink rather than a new red — keeps the palette restrained.
  rejected: "border-ink/50 text-ink/70",
  duplicate: "border-hazard text-hazard-dark",
};

export default function StatusBadge({
  status,
  className = "",
}: {
  status: string;
  className?: string;
}) {
  const style = STATUS_STYLES[status] ?? "border-rule text-ink";
  return (
    <span
      className={`inline-block -rotate-2 select-none whitespace-nowrap rounded-sm border px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wide ${style} ${className}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
