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
    <main className="mx-auto max-w-lg space-y-4 p-4">
      <h1 className="text-xl font-bold">My reports</h1>

      {error && (
        <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {!items && !error && <p className="text-gray-500">Loading...</p>}

      {items && items.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-gray-500">
          <p>You haven&apos;t reported anything yet.</p>
          <Link href="/submit" className="mt-2 inline-block text-blue-600 hover:underline">
            Report an issue
          </Link>
        </div>
      )}

      <ul className="space-y-3">
        {items?.map((item) => (
          <li key={item.id}>
            <Link
              href={`/my-complaints/${item.id}`}
              className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:border-blue-400"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{CATEGORY_LABELS[item.category] ?? item.category}</span>
                <StatusBadge status={item.status} />
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-gray-600">{item.description}</p>
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                {item.severity && (
                  <span className="rounded bg-gray-50 px-1.5 py-0.5">Severity: {item.severity}</span>
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
          className="block rounded bg-blue-600 p-2 text-center font-medium text-white hover:bg-blue-700"
        >
          Report another issue
        </Link>
      )}
    </main>
  );
}
