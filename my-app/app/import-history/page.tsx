"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ImportLogListItem, ImportStatus } from "@/types/importLog";
import { getImportLogs, runImportNow } from "@/lib/api";
import { useImportLogsSSE } from "@/hooks/useImportLogsSSE";

const STATUS_OPTIONS: Array<{ label: string; value: ImportStatus | "" }> = [
  { label: "All", value: "" },
  { label: "Running", value: "running" },
  { label: "Completed", value: "completed" },
  { label: "Partial", value: "partial" },
  { label: "Failed", value: "failed" },
];

function Badge({ status }: { status: ImportStatus }) {
  const cls =
    status === "completed"
      ? "bg-emerald-100 text-emerald-700 border-emerald-300"
      : status === "running"
      ? "bg-sky-100 text-sky-700 border-sky-200"
      : status === "partial"
      ? "bg-blue-100 text-blue-700 border-blue-200"
      : "bg-rose-100 text-rose-700 border-rose-300";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${cls}`}
    >
      {status}
    </span>
  );
}

function fmtDate(iso?: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

export default function ImportHistoryPage() {
  const router = useRouter();
  const cardShadow = { boxShadow: "rgba(99, 99, 99, 0.2) 0px 2px 8px 0px" };

  const [status, setStatus] = useState<ImportStatus | "">("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [page, setPage] = useState(1);
  const limit = 20;

  const [items, setItems] = useState<ImportLogListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(false);
  const [runningImport, setRunningImport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useImportLogsSSE(true, setItems);

  const queryArgs = useMemo(() => {
    const fromIso = from
      ? new Date(`${from}T00:00:00.000Z`).toISOString()
      : undefined;
    const toIso = to
      ? new Date(`${to}T23:59:59.999Z`).toISOString()
      : undefined;

    return {
      page,
      limit,
      status: status || undefined,
      q: sourceUrl.trim() || undefined,
      from: fromIso,
      to: toIso,
    };
  }, [page, status, sourceUrl, from, to]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await getImportLogs(queryArgs);
      setItems(res.items || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (e: any) {
      setError(e?.message || "Failed to load import logs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [queryArgs]);

  function applyFilters() {
    setPage(1);
    load();
  }

  function clearFilters() {
    setStatus("");
    setSourceUrl("");
    setFrom("");
    setTo("");
    setPage(1);
  }

  async function handleRunImportNow() {
    setRunningImport(true);
    setError(null);
    try {
      await runImportNow(sourceUrl.trim() ? { sourceUrl: sourceUrl.trim() } : {});
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to run import now");
    } finally {
      setRunningImport(false);
    }
  }

  function openDetails(runId: string) {
    router.push(`/import-history/${runId}`);
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Import History</h1>
          <p className="mt-1 text-sm text-slate-700">
            Track each feed import run: Fetched / Imported / New / Updated /
            Failed.
          </p>
        </div>

        <button
          onClick={handleRunImportNow}
          disabled={runningImport}
          className="rounded-lg bg-sky-500 px-4 py-2 text-sm text-white hover:bg-sky-600 disabled:opacity-60"
          title="Triggers import now (all feeds if Source URL is empty)"
        >
          {runningImport ? "Running..." : "Run Import Now"}
        </button>
      </div>

      <div
        className="mt-5 rounded-xl border border-sky-200 bg-white p-4"
        style={cardShadow}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-3">
            <label className="block text-xs text-slate-600">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="mt-1 w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.label} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-5">
            <label className="block text-xs text-slate-600">
              FileName (Source URL)
            </label>
            <input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://jobicy.com/?feed=job_feed"
              className="mt-1 w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
            />
            {loading && sourceUrl.trim() ? (
              <div className="mt-1 text-xs text-sky-700">Searching...</div>
            ) : null}
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs text-slate-600">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs text-slate-600">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 w-full rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={applyFilters}
            className="rounded-lg bg-sky-500 px-3 py-2 text-sm text-white hover:bg-sky-600"
          >
            Apply
          </button>
          <button
            onClick={clearFilters}
            className="rounded-lg border border-sky-200 px-3 py-2 text-sm text-slate-700 hover:bg-sky-50"
          >
            Clear
          </button>

          <div className="ml-auto text-xs text-slate-600">
            Total runs: <span className="text-slate-800">{total}</span>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div
        className="mt-4 overflow-hidden rounded-xl border border-sky-200 bg-white"
        style={cardShadow}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead className="bg-sky-100">
              <tr className="text-left text-xs text-slate-700">
                <th className="px-4 py-3">FileName</th>
                <th className="px-4 py-3">Import Date/Time</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">New</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3">Failed</th>
              </tr>
            </thead>

            <tbody className="bg-white">
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-700" colSpan={6}>
                    Loading...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-700" colSpan={6}>
                    No import runs found.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr
                    key={row.runId}
                    className="cursor-pointer border-t border-sky-100 hover:bg-sky-50/80"
                    onClick={() => openDetails(row.runId)}
                  >
                    <td className="px-4 py-3 text-sm text-slate-800">
                      <div
                        className="max-w-[420px] truncate"
                        title={row.sourceUrl}
                      >
                        {row.sourceUrl}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                        <span>{row.sourceName}</span>
                        <Badge status={row.status} />
                      </div>
                      {row.status === "running" && row.meta?.totalBatches ? (
                        <div className="mt-1 text-xs text-slate-600">
                          {row.meta.processedBatches || 0}/
                          {row.meta.totalBatches} batches
                        </div>
                      ) : null}
                    </td>

                    <td className="px-4 py-3 text-sm text-slate-700">
                      {fmtDate(row.startedAt)}
                    </td>

                    <td className="px-4 py-3 text-sm text-sky-700">
                      <div className="font-semibold">
                        {row.totalImported ?? 0}
                      </div>
                      <div className="text-xs text-slate-600">
                        fetched: {row.totalFetched ?? 0}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-sm text-sky-700">
                      {row.newJobs ?? 0}
                    </td>
                    <td className="px-4 py-3 text-sm text-sky-700">
                      {row.updatedJobs ?? 0}
                    </td>
                    <td className="px-4 py-3 text-sm text-sky-700">
                      {row.failedJobs ?? 0}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-sky-200 bg-sky-100/70 px-4 py-3">
          <div className="text-xs text-slate-700">
            Page <span className="text-slate-800">{page}</span> of{" "}
            <span className="text-slate-800">{totalPages}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-sky-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-sky-50 disabled:opacity-50"
            >
              Prev
            </button>
            <button
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-lg border border-sky-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-sky-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3 text-xs text-slate-500">
        Tip: click any row to open full run details (failures + meta).
      </div>
    </div>
  );
}
