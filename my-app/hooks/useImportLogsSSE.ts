import { useEffect, useRef } from "react";
import type { ImportLogListItem } from "@/types/importLog";
import { API_BASE_URL } from "@/lib/config";

type ImportUpdatePayload = Partial<ImportLogListItem> & {
  runId?: string;
  processedBatches?: number;
  totalBatches?: number;
  durationMs?: number;
  meta?: ImportLogListItem["meta"];
  data?: ImportLogListItem["meta"];
};

function mergeMeta(
  current: ImportLogListItem["meta"] | undefined,
  payload: ImportUpdatePayload
) {
  const incoming = payload.meta || payload.data;
  return {
    ...(current || {}),
    ...(incoming || {}),
    processedBatches:
      payload.processedBatches ??
      incoming?.processedBatches ??
      current?.processedBatches,
    totalBatches:
      payload.totalBatches ?? incoming?.totalBatches ?? current?.totalBatches,
    durationMs:
      payload.durationMs ?? incoming?.durationMs ?? current?.durationMs,
  };
}

export function useImportLogsSSE(
  enabled: boolean,
  setItems: React.Dispatch<React.SetStateAction<ImportLogListItem[]>>
) {
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const url = `${API_BASE_URL}/api/import-logs/sse`;
    const es = new EventSource(url);
    sourceRef.current = es;

    const handleUpdate = (raw: MessageEvent) => {
      try {
        const msg = JSON.parse(raw.data);
        const payload: ImportUpdatePayload = msg?.payload || msg;
        if (!payload?.runId) return;

        setItems((prev) =>
          prev.map((row) => {
            if (row.runId !== payload.runId) return row;

            return {
              ...row,
              status: payload.status ?? row.status,
              newJobs: payload.newJobs ?? row.newJobs,
              updatedJobs: payload.updatedJobs ?? row.updatedJobs,
              failedJobs: payload.failedJobs ?? row.failedJobs,
              totalImported: payload.totalImported ?? row.totalImported,
              totalFetched: payload.totalFetched ?? row.totalFetched,
              finishedAt: payload.finishedAt ?? row.finishedAt,
              meta: mergeMeta(row.meta, payload),
            };
          })
        );
      } catch (e) {
        console.error("[SSE] parse error", e);
      }
    };

    es.addEventListener("import_log", handleUpdate);
    es.onmessage = handleUpdate;
    es.onerror = (err) => {
      console.warn("[SSE] connection error", err);
    };

    return () => {
      es.removeEventListener("import_log", handleUpdate);
      es.close();
      sourceRef.current = null;
    };
  }, [enabled, setItems]);
}
