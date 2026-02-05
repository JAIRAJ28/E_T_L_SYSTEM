"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import type {
  ImportLogDetail,
  ImportFailure,
  ImportStatus,
} from "@/types/importLog";
import { getImportLog } from "@/lib/api";

const cardShadow = { boxShadow: "rgba(99, 99, 99, 0.2) 0px 2px 8px 0px" };

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

function fmtMs(ms?: number) {
  if (!ms || ms <= 0) return "-";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m <= 0) return `${s}s`;
  return `${m}m ${r}s`;
}

function safeJsonStringify(obj: any) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

function FailureRow({ f }: { f: ImportFailure }) {
  const title =
    (f.sample && (f.sample.title || f.sample.jobTitle)) ||
    (f.sample && f.sample.name) ||
    "-";
  const jobUrl = f.sample?.jobUrl || f.sample?.url || null;

  return (
    <div
      className="rounded-xl border border-sky-200 bg-white p-3"
      style={cardShadow}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-sky-200 bg-sky-100 px-2 py-0.5 text-xs text-sky-700">
          {f.reasonCode || "ERROR"}
        </span>
        <span className="text-xs text-slate-600">{f.at ? fmtDate(f.at) : ""}</span>
      </div>

      <div className="mt-2 text-sm text-slate-700">
        {f.message || "Unknown error"}
      </div>

      <div className="mt-2 text-xs text-slate-600">
        <div>
          <span className="text-slate-600">Title:</span>{" "}
          <span className="text-slate-800">{title}</span>
        </div>
        {jobUrl ? (
          <div className="mt-1">
            <span className="text-slate-600">JobUrl:</span>{" "}
            <a
              href={jobUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sky-700 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {jobUrl}
            </a>
          </div>
        ) : null}
        {f.dedupeKey ? (
          <div className="mt-1">
            <span className="text-slate-600">DedupeKey:</span>{" "}
            <span className="text-slate-800">{f.dedupeKey}</span>
          </div>
        ) : null}
      </div>

      {f.sample ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-slate-600 hover:text-slate-800">
            View sample
          </summary>
          <pre className="mt-2 max-h-64 overflow-auto rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-slate-700">
            {safeJsonStringify(f.sample)}
          </pre>
        </details>
      ) : null}
    </div>
  );
}

export default function ImportRunDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const runId = useMemo(() => {
    const v = params?.runId;
    return typeof v === "string" ? v : Array.isArray(v) ? v[0] : "";
  }, [params]);

  const [item, setItem] = useState<ImportLogDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!runId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getImportLog(runId);
      setItem(res.item);
    } catch (e: any) {
      setError(e?.message || "Failed to load import run details");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [runId]);

  const totalBatches = item?.meta?.totalBatches || 0;
  const processedBatches = item?.meta?.processedBatches || 0;
  const progressPct =
    totalBatches > 0
      ? Math.min(100, Math.round((processedBatches / totalBatches) * 100))
      : 0;

  return (
    <div className="max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">Import Run Details</h1>
            {item?.status ? <Badge status={item.status} /> : null}
          </div>
          <p className="mt-1 text-sm text-slate-700">
            Run ID: <span className="text-slate-900">{runId || "-"}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/import-history")}
            className="rounded-lg border border-sky-200 px-3 py-2 text-sm text-slate-700 hover:bg-sky-50"
          >
            Back
          </button>

          <button
            onClick={load}
            disabled={loading}
            className="rounded-lg bg-sky-500 px-3 py-2 text-sm text-white hover:bg-sky-600 disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {loading && !item ? (
        <div className="mt-4 text-sm text-slate-700">Loading...</div>
      ) : null}

      {item ? (
        <>
          <div
            className="mt-5 rounded-xl border border-sky-200 bg-white p-4"
            style={cardShadow}
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
              <div className="md:col-span-8">
                <div className="text-xs text-slate-600">FileName (Source URL)</div>
                <div className="mt-1 break-all text-sm text-slate-800">
                  {item.sourceUrl}
                </div>
                <div className="mt-1 text-xs text-slate-600">
                  {item.sourceName}
                </div>
              </div>

              <div className="md:col-span-4">
                <div className="text-xs text-slate-600">Timing</div>
                <div className="mt-1 text-sm text-slate-700">
                  Started: {fmtDate(item.startedAt)}
                </div>
                <div className="mt-1 text-sm text-slate-700">
                  Finished: {fmtDate(item.finishedAt)}
                </div>
                <div className="mt-1 text-sm text-slate-700">
                  Duration: {fmtMs(item.meta?.durationMs)}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div
              className="rounded-xl border border-sky-200 bg-white p-4"
              style={cardShadow}
            >
              <div className="text-xs text-slate-600">Total Imported</div>
              <div className="mt-1 text-lg font-semibold text-sky-700">
                {item.totalImported ?? 0}
              </div>
              <div className="mt-1 text-xs text-slate-600">
                Fetched: {item.totalFetched ?? 0}
              </div>
            </div>

            <div
              className="rounded-xl border border-sky-200 bg-white p-4"
              style={cardShadow}
            >
              <div className="text-xs text-slate-600">New</div>
              <div className="mt-1 text-lg font-semibold text-sky-700">
                {item.newJobs ?? 0}
              </div>
            </div>

            <div
              className="rounded-xl border border-sky-200 bg-white p-4"
              style={cardShadow}
            >
              <div className="text-xs text-slate-600">Updated</div>
              <div className="mt-1 text-lg font-semibold text-sky-700">
                {item.updatedJobs ?? 0}
              </div>
            </div>

            <div
              className="rounded-xl border border-sky-200 bg-white p-4"
              style={cardShadow}
            >
              <div className="text-xs text-slate-600">Failed</div>
              <div className="mt-1 text-lg font-semibold text-sky-700">
                {item.failedJobs ?? 0}
              </div>
            </div>
          </div>

          <div
            className="mt-4 rounded-xl border border-sky-200 bg-white p-4"
            style={cardShadow}
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Batch Progress</div>
              <div className="text-xs text-slate-600">
                {processedBatches}/{totalBatches} ({progressPct}%)
              </div>
            </div>

            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-sky-100">
              <div
                className="h-full bg-sky-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <div className="mt-2 text-xs text-slate-600">
              Batch Size: {item.meta?.batchSize ?? "-"} - Concurrency:{" "}
              {item.meta?.concurrency ?? "-"} - Attempts: {item.meta?.attempts ?? "-"}
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Failures</h2>
              <div className="text-xs text-slate-600">
                Showing up to capped samples (backend limit)
              </div>
            </div>

            <div className="mt-3 space-y-3">
              {(item.failures || []).length === 0 ? (
                <div
                  className="rounded-xl border border-sky-200 bg-white p-4 text-sm text-slate-700"
                  style={cardShadow}
                >
                  No failures recorded for this run.
                </div>
              ) : (
                (item.failures || []).map((f: ImportFailure, idx: number) => (
                  <FailureRow key={`${idx}-${f.reasonCode}-${f.at}`} f={f} />
                ))
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
