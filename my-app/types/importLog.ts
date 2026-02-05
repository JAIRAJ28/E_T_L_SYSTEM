export type ImportStatus = "running" | "completed" | "partial" | "failed";

export type ImportLogMeta = {
  batchSize?: number;
  concurrency?: number;
  totalBatches?: number;
  processedBatches?: number;
  durationMs?: number;
  attempts?: number;
};

export type ImportFailure = {
  reasonCode?: string;
  message?: string;
  dedupeKey?: string | null;
  sample?: any;
  at?: string;
};

export type ImportLogListItem = {
  runId: string;
  sourceUrl: string;
  sourceName: string;

  status: ImportStatus;

  startedAt?: string;
  finishedAt?: string;

  totalFetched?: number;
  totalImported?: number;
  newJobs?: number;
  updatedJobs?: number;
  failedJobs?: number;

  meta?: ImportLogMeta;
};

export type ImportLogDetail = ImportLogListItem & {
  failures?: ImportFailure[];
};

export type PaginatedResponse<T> = {
  ok: boolean;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  items: T[];
};

export type ImportLogDetailResponse = {
  ok: boolean;
  item: ImportLogDetail;
};

export type RunImportNowRequest = {
  sourceUrl?: string;
};

export type RunImportNowResponse =
  | {
      ok: true;
      mode: "single";
      result: {
        runId: string;
        totalFetched: number;
        queuedBatches: number;
        invalidCount: number;
      };
    }
  | {
      ok: true;
      mode: "all";
      results: Array<
        | {
            sourceUrl: string;
            ok: true;
            result: {
              runId: string;
              totalFetched: number;
              queuedBatches: number;
              invalidCount: number;
            };
          }
        | {
            sourceUrl: string;
            ok: false;
            error: string;
          }
      >;
    };
