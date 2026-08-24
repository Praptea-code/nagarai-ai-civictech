"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import StatusBadge from "@/components/StatusBadge";
import { fetchMyComplaints, ComplaintListItem } from "@/lib/api";
import { CATEGORY_LABELS } from "@/lib/categories";
import { log } from "@/lib/logger";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function MyComplaintsPage() {
  const [items, setItems] = useState<ComplaintListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyComplaints()
      .then(setItems)
      .catch((err: Error) => {
        setError(err.message);
        log("error", "failed to load complaints", { message: err.message });
      });
  }, []);

  return (
    <main className="space-y-5">
      <h1 className="font-display text-xl font-bold">My reports</h1>

      {error && (
        <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {!items && !error && <p className="text-ink/60">Loading...</p>}

      {items && items.length === 0 && (
        <div className="rounded-md border border-dashed border-rule p-6 text-center text-ink/60">
          <p>You haven&apos;t reported anything yet.</p>
          <Link href="/submit" className="mt-2 inline-block text-signal hover:underline">
            Report an issue
          </Link>
        </div>
      )}

      <ul className="space-y-3">
        {items?.map((item) => (
          <li key={item.id}>
            <Link
              href={`/my-complaints/${item.id}`}
              className="block rounded-md border border-rule bg-white p-4 shadow-sm transition-colors duration-150 hover:border-signal"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{CATEGORY_LABELS[item.category] ?? item.category}</span>
                <StatusBadge status={item.status} />
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-ink/70">{item.description}</p>
              <div className="mt-2 flex items-center gap-2 text-xs text-ink/60">
                {item.severity ? (
                  <span className="rounded-sm bg-paper px-1.5 py-0.5 font-mono">Severity: {item.severity}</span>
                ) : (
                  <span className="rounded-sm bg-paper px-1.5 py-0.5 font-mono">AI triage pending</span>
                )}
                {item.department && <span>{item.department}</span>}
                <span>{formatDate(item.created_at)}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {items && items.length > 0 && (
        <Link
          href="/submit"
          className="block rounded-md bg-signal p-2 text-center font-medium text-white transition-colors duration-150 hover:bg-signal-dark"
        >
          Report another issue
        </Link>
      )}
    </main>
  );
}
