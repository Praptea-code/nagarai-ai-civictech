"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Inbox,
} from "lucide-react";

import CategoryTag from "@/components/admin/CategoryTag";
import SeverityBadge from "@/components/admin/SeverityBadge";
import StatCard from "@/components/admin/StatCard";
import StatusBadge from "@/components/admin/StatusBadge";
import {
  fetchDashboardSummary,
  DashboardSummary,
  AdminComplaintListItem,
} from "@/lib/admin-api";
import {
  CATEGORY_LABELS,
  SEVERITY_OPTIONS,
  formatDateTime,
  shortId,
} from "@/lib/constants";
import { log } from "@/lib/logger";

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardSummary()
      .then(setSummary)
      .catch((err: Error) => {
        setError(err.message);
        log("error", "failed to load dashboard summary", { message: err.message });
      });
  }, []);

  const byStatus = summary?.by_status ?? {};
  const needsTriage = (byStatus["submitted"] ?? 0) + (byStatus["under_review"] ?? 0);
  const active =
    (byStatus["assigned"] ?? 0) + (byStatus["in_progress"] ?? 0);
  const resolved = (byStatus["resolved"] ?? 0) + (byStatus["rejected"] ?? 0);
  const urgent =
    (summary?.by_severity["critical"] ?? 0) + (summary?.by_severity["high"] ?? 0);
  const maxSeverityCount = Math.max(
    ...SEVERITY_OPTIONS.map((s) => summary?.by_severity[s.value] ?? 0),
    1
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">Dashboard</h1>
        <Link
          href="/admin/complaints"
          className="flex items-center gap-1.5 text-sm text-signal hover:underline"
        >
          All complaints
          <ArrowRight size={14} />
        </Link>
      </div>

      {error && (
        <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {!summary && !error && (
        <p className="text-ink/60">Loading summary…</p>
      )}

      {summary && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={Inbox}
              label="Total complaints"
              value={summary.total}
              hint="All time"
            />
            <StatCard
              icon={Clock3}
              label="Needs triage"
              value={needsTriage}
              accent="text-hazard-dark"
              hint="submitted + under review"
            />
            <StatCard
              icon={AlertTriangle}
              label="High / critical severity"
              value={urgent}
              accent="text-red-600"
              hint="AI-classified"
            />
            <StatCard
              icon={CheckCircle2}
              label="Closed out"
              value={resolved}
              accent="text-moss"
              hint="resolved + rejected"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <section className="lg:col-span-2 rounded-md border border-rule bg-white p-4 shadow-sm">
              <h2 className="text-xs font-medium uppercase tracking-wide text-ink/50">
                AI severity distribution
              </h2>
              <ul className="mt-3 space-y-3">
                {SEVERITY_OPTIONS.map(({ value, label }) => {
                  const count = summary.by_severity[value] ?? 0;
                  return (
                    <li key={value} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="capitalize">{label}</span>
                        <span className="font-mono tabular-nums text-ink/60">
                          {count}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-paper">
                        <div
                          className={`h-full rounded-full ${
                            value === "critical"
                              ? "bg-red-600"
                              : value === "high"
                                ? "bg-red-400"
                                : value === "medium"
                                  ? "bg-hazard"
                                  : "bg-moss"
                          }`}
                          style={{ width: `${(count / maxSeverityCount) * 100}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>

              <h2 className="mt-6 text-xs font-medium uppercase tracking-wide text-ink/50">
                Pipeline
              </h2>
              <ul className="mt-3 space-y-1.5 text-sm">
                <li className="flex justify-between">
                  <span>Active (assigned / in progress)</span>
                  <span className="font-mono tabular-nums text-ink/60">{active}</span>
                </li>
                <li className="flex justify-between">
                  <span>Duplicates flagged</span>
                  <span className="font-mono tabular-nums text-ink/60">
                    {byStatus["duplicate"] ?? 0}
                  </span>
                </li>
              </ul>
            </section>

            <section className="lg:col-span-3 rounded-md border border-rule bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-rule px-4 py-3">
                <h2 className="text-xs font-medium uppercase tracking-wide text-ink/50">
                  Recent submissions
                </h2>
                <Link href="/admin/complaints" className="text-xs text-signal hover:underline">
                  View all
                </Link>
              </div>
              <RecentTable items={summary.recent} />
            </section>
          </div>

          <section className="rounded-md border border-rule bg-white p-4 shadow-sm">
            <h2 className="text-xs font-medium uppercase tracking-wide text-ink/50">
              By category
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(summary.by_category)
                .sort((a, b) => b[1] - a[1])
                .map(([category, count]) => (
                  <span
                    key={category}
                    className="inline-flex items-center gap-2 rounded-md border border-rule px-2.5 py-1 text-sm"
                  >
                    {CATEGORY_LABELS[category] ?? category}
                    <span className="font-mono tabular-nums text-ink/60">{count}</span>
                  </span>
                ))}
              {Object.keys(summary.by_category).length === 0 && (
                <p className="text-sm text-ink/40">No data yet.</p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function RecentTable({ items }: { items: AdminComplaintListItem[] }) {
  if (items.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-ink/40">
        No complaints submitted yet.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-rule">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={`/admin/complaints/${item.id}`}
            className="flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-paper"
          >
            <span className="font-mono text-xs text-ink/40">{shortId(item.id)}</span>
            <CategoryTag category={item.category} />
            <span className="min-w-0 flex-1 truncate text-sm text-ink/70">
              {item.description}
            </span>
            <SeverityBadge severity={item.severity} />
            <StatusBadge status={item.status} />
            <span className="hidden whitespace-nowrap text-xs text-ink/50 md:block">
              {formatDateTime(item.created_at)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
