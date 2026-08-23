"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Save } from "lucide-react";

import { ComplaintUpdateInput } from "@/lib/admin-api";
import { STATUS_OPTIONS, statusLabel } from "@/lib/constants";
import { log } from "@/lib/logger";
import { supabase } from "@/lib/supabase";

export default function ActionPanel({
  complaintId,
  currentStatus,
  currentDepartmentId,
  onSubmit,
}: {
  complaintId: string;
  currentStatus: string;
  currentDepartmentId: string | null;
  onSubmit: (input: ComplaintUpdateInput) => Promise<void>;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [note, setNote] = useState("");
  const [departmentId, setDepartmentId] = useState(currentDepartmentId ?? "");
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStatus(currentStatus);
    setDepartmentId(currentDepartmentId ?? "");
  }, [complaintId, currentStatus, currentDepartmentId]);

  useEffect(() => {
    // departments are readable by any authenticated user per RLS
    supabase
      .from("departments")
      .select("id, name")
      .order("name")
      .then(({ data }) => setDepartments(data ?? []));
  }, []);

  async function handleSubmit() {
    if (!note.trim() && status === currentStatus && departmentId === (currentDepartmentId ?? "")) {
      setError("Nothing to save — pick a new status or write a note.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const input: ComplaintUpdateInput = {};
      if (status !== currentStatus) input.status = status;
      if (note.trim()) input.note = note.trim();
      if (departmentId !== (currentDepartmentId ?? ""))
        input.department_id = departmentId || null;
      await onSubmit(input);
      log("info", "action panel update applied", { complaintId, ...input });
      setSaved(true);
      setNote("");
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Update failed.";
      log("warn", "action panel update failed", { message });
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-md border border-rule bg-white p-4 shadow-sm">
      <h2 className="text-xs font-medium uppercase tracking-wide text-ink/50">
        Actions
      </h2>

      <div className="mt-3 space-y-3">
        <div>
          <label htmlFor="status" className="mb-1 block text-xs text-ink/60">
            Status
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-md border border-rule bg-white px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-signal"
          >
            {STATUS_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {status !== currentStatus && (
            <p className="mt-1 text-xs text-hazard-dark">
              Transition: {statusLabel(currentStatus)} → {statusLabel(status)}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="department" className="mb-1 block text-xs text-ink/60">
            Assign department
          </label>
          <select
            id="department"
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="w-full rounded-md border border-rule bg-white px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-signal"
          >
            <option value="">Unassigned</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="note" className="mb-1 block text-xs text-ink/60">
            Prediction / resolution note
          </label>
          <textarea
            id="note"
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Crew scheduled for ward 12 on Friday; pothole filled and verified."
            className="w-full resize-y rounded-md border border-rule px-2.5 py-2 text-sm outline-none transition-colors focus:border-signal"
          />
          <p className="mt-1 text-xs text-ink/40">
            Saved to the audit trail with every status change.
          </p>
        </div>

        {error && (
          <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={busy}
          className={`flex w-full items-center justify-center gap-2 rounded-md py-2 font-medium text-white transition-colors duration-150 disabled:opacity-50 ${
            saved ? "bg-moss" : "bg-signal hover:bg-signal-dark"
          }`}
        >
          {busy ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Saving…
            </>
          ) : saved ? (
            <>
              <CheckCircle2 size={15} />
              Updated
            </>
          ) : (
            <>
              <Save size={15} />
              Save changes
            </>
          )}
        </button>
      </div>
    </div>
  );
}
