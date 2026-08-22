"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { fetchComplaint, ComplaintDetail } from "@/lib/api";
import { statusBadgeClass } from "@/lib/categories";
import { log } from "@/lib/logger";

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function ComplaintDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [complaint, setComplaint] = useState<ComplaintDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchComplaint(id)
      .then(setComplaint)
      .catch((err: Error) => {
        setError(err.message);
        log("error", "failed to load complaint", { id, message: err.message });
      });
  }, [id]);

  return (
    <main className="mx-auto max-w-lg space-y-4 p-4">
      <Link href="/my-complaints" className="text-sm text-blue-600 hover:underline">
        &larr; Back to my reports
      </Link>

      {error && (
        <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {!complaint && !error && <p className="text-gray-500">Loading...</p>}

      {complaint && (
        <>
          {complaint.duplicate_of_complaint_id && (
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 text-sm text-purple-800">
              This looks similar to an existing report.{" "}
              <Link
                href={`/my-complaints/${complaint.duplicate_of_complaint_id}`}
                className="font-medium underline"
              >
                View the original report
              </Link>
            </div>
          )}

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs ${statusBadgeClass(complaint.status)}`}>
                {complaint.status.replace("_", " ")}
              </span>
            </div>

            <h1 className="mt-2 text-lg font-semibold">Complaint details</h1>
            <p className="mt-2 whitespace-pre-line text-sm text-gray-700">{complaint.description}</p>

            {complaint.image_urls.length > 0 && (
              <section className="mt-4">
                <h2 className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  Photos ({complaint.image_urls.length})
                </h2>
                <ul className="mt-2 grid grid-cols-3 gap-2">
                  {complaint.image_urls.map((url, index) => (
                    <li key={url}>
                      <a href={url} target="_blank" rel="noreferrer" title={`Open photo ${index + 1} full size`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Complaint photo ${index + 1}`}
                          className="h-24 w-full rounded border border-gray-200 object-cover"
                        />
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">Status history</h2>
            <ol className="mt-3 space-y-0">
              {complaint.status_history.map((entry, idx) => (
                <li key={`${entry.created_at}-${idx}`} className="relative pb-6 pl-6 last:pb-0">
                  <span
                    className={`absolute left-0 top-1 h-2.5 w-2.5 rounded-full ${idx === complaint.status_history.length - 1 ? "bg-blue-600" : "bg-gray-300"}`}
                  />
                  {idx < complaint.status_history.length - 1 && (
                    <span className="absolute left-[4.5px] top-4 h-full w-px bg-gray-300" aria-hidden />
                  )}
                  <p className="text-sm font-medium">{entry.status.replace("_", " ")}</p>
                  <p className="text-xs text-gray-500">{formatTimestamp(entry.created_at)}</p>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </main>
  );
}
