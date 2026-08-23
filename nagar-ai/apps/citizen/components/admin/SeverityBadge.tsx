const SEVERITY_STYLES: Record<string, string> = {
  low: "border-moss/40 bg-moss/10 text-moss",
  medium: "border-hazard/50 bg-hazard/15 text-hazard-dark",
  high: "border-red-400/60 bg-red-100 text-red-700",
  critical: "border-red-600 bg-red-600 text-white",
};

export default function SeverityBadge({
  severity,
  className = "",
}: {
  severity: string | null;
  className?: string;
}) {
  if (!severity) {
    return (
      <span
        className={`inline-block select-none whitespace-nowrap rounded-sm border border-rule bg-white px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wide text-ink/40 ${className}`}
      >
        n/a
      </span>
    );
  }
  const style = SEVERITY_STYLES[severity] ?? "border-rule bg-white text-ink";
  return (
    <span
      title={`AI severity: ${severity}`}
      className={`inline-block select-none whitespace-nowrap rounded-sm px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wide ${style} ${className}`}
    >
      {severity}
    </span>
  );
}
