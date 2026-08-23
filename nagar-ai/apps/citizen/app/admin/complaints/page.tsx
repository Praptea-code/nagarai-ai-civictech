"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";

import CategoryTag from "@/components/admin/CategoryTag";
import SeverityBadge from "@/components/admin/SeverityBadge";
import StatusBadge from "@/components/admin/StatusBadge";
import {
  AdminComplaintListItem,
  fetchAdminComplaints,
} from "@/lib/admin-api";
import {
  CATEGORY_OPTIONS,
  SEVERITY_OPTIONS,
  STATUS_OPTIONS,
  formatDateTime,
  shortId,
} from "@/lib/constants";
import { log } from "@/lib/logger";

const PAGE_SIZE = 20;

export default function ComplaintsPage() {
  const router = useRouter();
  const [items, setItems] = useState<AdminComplaintListItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [severity, setSeverity] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(searchInput.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const query = useMemo(
    () => ({
      q: q || undefined,
      status: status || undefined,
      category: category || undefined,
      severity: severity || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }),
    [q, status, category, severity, page]
  );

  const load = useCallback(() => {
    setError(null);
    fetchAdminComplaints(query)
      .then((payload) => {
        setItems(payload.items);
        setTotal(payload.total);
      })
      .catch((err: Error) => {
        setError(err.message);
        log("error", "failed to load complaints", { message: err.message });
      });
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  const hasFilters = Boolean(q || status || category || severity);

  function clearFilters() {
    setSearchInput("");
    setStatus("");
    setCategory("");
    setSeverity("");
    setPage(0);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">Complaints</h1>
        <p className="font-mono text-xs tabular-nums text-ink/50">
          {total} total
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-md border border-rule bg-white p-3 shadow-sm">
        <div className="relative min-w-56 flex-1">
          <Search
            size={14}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink/40"
          />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search description…"
            className="w-full rounded-md border border-rule py-1.5 pl-8 pr-3 text-sm outline-none transition-colors focus:border-signal"
          />
        </div>

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(0);
          }}
          className="rounded-md border border-rule bg-white px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-signal"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(0);
          }}
          className="rounded-md border border-rule bg-white px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-signal"
        >
          <option value="">All categories</option>
          {CATEGORY_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={severity}
          onChange={(e) => {
            setSeverity(e.target.value);
            setPage(0);
          }}
          className="rounded-md border border-rule bg-white px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-signal"
        >
          <option value="">All severities</option>
          {SEVERITY_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-ink/50 transition-colors hover:text-ink"
          >
            <X size={12} />
            Clear
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {!items && !error && <p className="text-ink/60">Loading complaints…</p>}

      {items && (
        <div className="overflow-x-auto rounded-md border border-rule bg-white shadow-sm">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-rule text-xs uppercase tracking-wide text-ink/50">
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Severity</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-ink/40">
                    No complaints match the current filters.
                  </td>
                </tr>
              )}
              {items.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => router.push(`/admin/complaints/${item.id}`)}
                  className="cursor-pointer border-b border-rule/60 last:border-0 transition-colors duration-150 hover:bg-paper/60"
                >
                  <td className="px-4 py-3 font-mono text-xs text-ink/40">
                    {shortId(item.id)}
                  </td>
                  <td className="px-4 py-3">
                    <CategoryTag category={item.category} />
                  </td>
                  <td className="max-w-72 px-4 py-3">
                    <span className="block truncate text-ink/80">
                      {item.description}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink/50">
                    {[item.ward, item.municipality].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <SeverityBadge severity={item.severity} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-ink/50">
                    {formatDateTime(item.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between border-t border-rule px-4 py-2.5 text-xs text-ink/60">
            <span className="font-mono tabular-nums">
              {total === 0 ? 0 : page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of{" "}
              {total}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex items-center gap-1 rounded-md border border-rule px-2 py-1 transition-colors hover:border-signal hover:text-signal disabled:opacity-40 disabled:hover:border-rule disabled:hover:text-ink"
              >
                <ChevronLeft size={13} />
                Prev
              </button>
              <span className="font-mono tabular-nums">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => (p + 1 < totalPages ? p + 1 : p))}
                disabled={page + 1 >= totalPages}
                className="flex items-center gap-1 rounded-md border border-rule px-2 py-1 transition-colors hover:border-signal hover:text-signal disabled:opacity-40 disabled:hover:border-rule disabled:hover:text-ink"
              >
                Next
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
