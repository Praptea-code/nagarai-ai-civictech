"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Copy,
  FileWarning,
  MapPin,
  Sparkles,
  User,
} from "lucide-react";

import ActionPanel from "@/components/admin/ActionPanel";
import CategoryTag from "@/components/admin/CategoryTag";
import PhotoGallery from "@/components/admin/PhotoGallery";
import SeverityBadge from "@/components/admin/SeverityBadge";
import StatusBadge from "@/components/admin/StatusBadge";
import {
  AdminComplaintDetail,
  ComplaintUpdateInput,
  fetchAdminComplaint,
  updateComplaint,
} from "@/lib/admin-api";
import { formatDateTime } from "@/lib/constants";
import { log } from "@/lib/logger";

export default function ComplaintDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [complaint, setComplaint] = useState<AdminComplaintDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    fetchAdminComplaint(id)
      .then((payload) => {
        setComplaint(payload);
        setError(null);
      })
      .catch((err: Error) => {
        setError(err.message);
        log("error", "failed to load complaint detail", { message: err.message });
      });
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUpdate(input: ComplaintUpdateInput) {
    if (!id) return;
    await updateComplaint(id, input);
    load();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/admin/complaints")}
          className="flex items-center gap-1 text-sm text-ink/60 transition-colors hover:text-signal"
        >
          <ArrowLeft size={15} />
          Back
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {!complaint && !error && <p className="text-ink/60">Loading complaint…</p>}

      {complaint && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-lg text-ink/50">{complaint.id}</h1>
            <button
              title="Copy full ID"
              onClick={() =>
                navigator.clipboard.writeText(complaint.id).catch(() => {})
              }
              className="rounded-md border border-rule p-1.5 text-ink/40 transition-colors hover:border-signal hover:text-signal"
            >
              <Copy size={13} />
            </button>
            <StatusBadge status={complaint.status} />
            <SeverityBadge severity={complaint.severity} />
            <CategoryTag category={complaint.category} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <section className="rounded-md border border-rule bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule pb-3">
                  <h2 className="text-xs font-medium uppercase tracking-wide text-ink/50">
                    Citizen report
                  </h2>
                  <span className="text-xs text-ink/50">
                    Submitted {formatDateTime(complaint.created_at)}
                  </span>
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink/90">
                  {complaint.description}
                </p>

                <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  <MetaItem label="Ward" value={complaint.ward ?? "—"} />
                  <MetaItem label="Municipality" value={complaint.municipality ?? "—"} />
                  <MetaItem
                    label="Coordinates"
                    value={
                      complaint.latitude !== null && complaint.longitude !== null
                        ? `${complaint.latitude.toFixed(5)}, ${complaint.longitude.toFixed(5)}`
                        : "—"
                    }
                    icon={<MapPin size={12} />}
                  />
                  <MetaItem
                    label="Last updated"
                    value={formatDateTime(complaint.updated_at)}
                  />
                </dl>
              </section>

              <section className="rounded-md border border-rule bg-white p-4 shadow-sm">
                <h2 className="border-b border-rule pb-3 text-xs font-medium uppercase tracking-wide text-ink/50">
                  Evidence photos ({complaint.image_urls.length})
                </h2>
                <div className="mt-3">
                  <PhotoGallery urls={complaint.image_urls} />
                </div>
              </section>

              <section className="rounded-md border border-rule bg-white p-4 shadow-sm">
                <h2 className="border-b border-rule pb-3 text-xs font-medium uppercase tracking-wide text-ink/50">
                  AI classification
                </h2>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  <Sparkles size={14} className="text-hazard" />
                  <SeverityBadge severity={complaint.severity} />
                  <span className="text-xs text-ink/50">
                    confidence{" "}
                    <span className="font-mono tabular-nums">
                      {complaint.ai_confidence !== null
                        ? `${(Number(complaint.ai_confidence) * 100).toFixed(0)}%`
                        : "—"}
                    </span>
                  </span>
                </div>
                {complaint.ai_summary && (
                  <p className="mt-2 rounded bg-paper p-3 text-sm italic text-ink/70">
                    “{complaint.ai_summary}”
                  </p>
                )}
                {complaint.duplicate_of_complaint_id && (
                  <Link
                    href={`/admin/complaints/${complaint.duplicate_of_complaint_id}`}
                    className="mt-3 flex items-center gap-2 rounded-md border border-hazard/50 bg-hazard/10 px-3 py-2 text-sm text-hazard-dark transition-colors hover:bg-hazard/20"
                  >
                    <FileWarning size={14} />
                    Flagged as duplicate — view original complaint
                  </Link>
                )}
              </section>

              <StatusHistory history={complaint.status_history} />
            </div>

            <div className="space-y-4">
              <section className="rounded-md border border-rule bg-white p-4 shadow-sm">
                <h2 className="text-xs font-medium uppercase tracking-wide text-ink/50">
                  Reporter
                </h2>
                {complaint.citizen ? (
                  <div className="mt-2 space-y-1 text-sm">
                    <p className="flex items-center gap-2">
                      <User size={13} className="text-ink/40" />
                      {complaint.citizen.full_name || "Unnamed citizen"}
                    </p>
                    <p className="pl-[21px] text-xs text-ink/50">
                      {complaint.citizen.phone || "No phone provided"}
                    </p>
                    <p className="break-all pl-[21px] font-mono text-[11px] text-ink/30">
                      {complaint.citizen.id}
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-ink/40">
                    Account deleted or unknown.
                  </p>
                )}
              </section>

              <ActionPanel
                key={complaint.id + complaint.updated_at}
                complaintId={complaint.id}
                currentStatus={complaint.status}
                currentDepartmentId={complaint.department_id}
                onSubmit={handleUpdate}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MetaItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-ink/40">{label}</dt>
      <dd className="mt-0.5 flex items-center gap-1 text-ink/80">
        {icon}
        {value}
      </dd>
    </div>
  );
}

function StatusHistory({
  history,
}: {
  history: AdminComplaintDetail["status_history"];
}) {
  return (
    <section className="rounded-md border border-rule bg-white p-4 shadow-sm">
      <h2 className="border-b border-rule pb-3 text-xs font-medium uppercase tracking-wide text-ink/50">
        Status history
      </h2>
      {history.length === 0 ? (
        <p className="mt-3 text-sm text-ink/40">No recorded transitions.</p>
      ) : (
        <ol className="relative mt-3 space-y-4 border-l border-rule pl-5">
          {[...history].reverse().map((entry, i) => (
            <li key={`${entry.created_at}-${i}`} className="relative">
              <span
                className={`absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white ${
                  i === 0 ? "bg-signal" : "bg-rule"
                }`}
              />
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={entry.status} />
                <span className="text-xs text-ink/50">
                  {formatDateTime(entry.created_at)}
                </span>
              </div>
              {entry.note && (
                <p className="mt-1 rounded bg-paper p-2 text-sm text-ink/70">
                  {entry.note}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
