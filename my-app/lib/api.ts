import { API_BASE_URL } from "./config";
import type {
  ImportStatus,
  PaginatedResponse,
  ImportLogListItem,
  ImportLogDetail,
  ImportLogDetailResponse,
  RunImportNowRequest,
  RunImportNowResponse,
  ImportLogMeta,
} from "@/types/importLog";

export type ApiError = {
  message: string;
  status?: number;
};

function buildQuery(params: Record<string, any>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    sp.set(k, String(v));
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

async function parseJsonSafe(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { ok: false, message: text || "Invalid JSON response" };
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url, init);
  const data = await parseJsonSafe(res);

  if (!res.ok) {
    const err: ApiError = {
      message: data?.message || data?.error || "Request failed",
      status: res.status,
    };
    throw err;
  }

  return data as T;
}

function mapMeta<T extends { meta?: ImportLogMeta }>(item: T & { data?: any }) {
  if (item.meta || !("data" in item)) return item;
  const { data, ...rest } = item;
  return { ...rest, meta: data } as T;
}


export async function getImportLogs(args?: {
  page?: number;
  limit?: number;
  status?: ImportStatus;
  sourceUrl?: string;
  from?: string; 
  to?: string; 
}) {
  const qs = buildQuery({
    page: args?.page ?? 1,
    limit: args?.limit ?? 20,
    status: args?.status,
    sourceUrl: args?.sourceUrl,
    from: args?.from,
    to: args?.to,
  });

  const data = await request<PaginatedResponse<ImportLogListItem & { data?: any }>>(
    `/api/import-logs${qs}`,
    { method: "GET" }
  );

  return {
    ...data,
    items: data.items.map((item) => mapMeta(item)),
  };
}

/**
 * GET /api/import-logs/:runId
 */
export async function getImportLog(runId: string) {
  if (!runId) {
    const err: ApiError = { message: "runId is required" };
    throw err;
  }

  const data = await request<
    ImportLogDetailResponse & { item: ImportLogDetail & { data?: any } }
  >(`/api/import-logs/${runId}`, {
    method: "GET",
  });

  return {
    ...data,
    item: mapMeta(data.item),
  };
}

/**
 * POST /api/import/run  { sourceUrl? }
 */
export async function runImportNow(body?: RunImportNowRequest) {
  return request<RunImportNowResponse>(`/api/import/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
}
