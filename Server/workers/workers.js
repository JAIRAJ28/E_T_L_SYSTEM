const { Worker } = require("bullmq");
const config = require("../config");
const { getRedis } = require("../config/redis");
const { QUEUE_NAME } = require("../config/queue");
const { JOB_TYPES } = require("../config/queue");
const Job = require("../model/job_model");
const ImportLog = require("../model/import_logs_model");


function capFailures(existingFailures, limit) {
  if (existingFailures >= limit) return 0;
  return limit - existingFailures;
}

function sanitizeFailureSample(job) {
  if (!job) return null;
  return {
    title: job.title,
    jobUrl: job.jobUrl,
    dedupeKey: job.dedupeKey,
    sourceUrl: job.sourceUrl,
  };
}

async function processImportFeedBatch(job) {
  const start = Date.now();
  const {
    runId,
    sourceUrl,
    sourceName,
    batchIndex,
    totalBatches,
    jobs: jobsPayload,
  } = job.data || {};

  if (!runId || !sourceUrl || !sourceName || !Array.isArray(jobsPayload)) {
    const e = new Error(
      "Invalid queue payload: missing runId/sourceUrl/sourceName/jobs",
    );
    e.reasonCode = "VALIDATION_ERROR";
    throw e;
  }
  const valid = [];
  const invalidFailures = [];

  for (const j of jobsPayload) {
    if ( !j || !j.dedupeKey || !j.jobUrl || !j.title || !j.sourceUrl || !j.sourceName) {
      invalidFailures.push({
        dedupeKey: j?.dedupeKey || null,
        reasonCode: "VALIDATION_ERROR",
        message:
          "Missing required fields (title/jobUrl/dedupeKey/sourceUrl/sourceName)",
        sample: sanitizeFailureSample(j),
        at: new Date(),
      });
      continue;
    }
    valid.push(j);
  }
  if (valid.length === 0) {
    await updateImportLogAfterBatch({
      runId,
      totalBatches,
      batchImported: 0,
      newCount: 0,
      updatedCount: 0,
      failedCount: invalidFailures.length,
      failuresToPush: invalidFailures,
      durationMs: Date.now() - start,
    });
    return {
      runId,
      batchIndex,
      total: jobsPayload.length,
      imported: 0,
      new: 0,
      updated: 0,
      failed: invalidFailures.length,
      durationMs: Date.now() - start,
    };
  }
  const keys = valid.map((j) => j.dedupeKey);
  const existingDocs = await Job.find({ dedupeKey: { $in: keys } })
    .select("dedupeKey")
    .lean();

  const existingSet = new Set(existingDocs.map((d) => d.dedupeKey));
  const newCount = keys.reduce(
    (acc, k) => acc + (existingSet.has(k) ? 0 : 1),
    0,
  );
  const updatedCount = valid.length - newCount;
  const now = new Date();
  const ops = valid.map((j) => ({
    updateOne: {
      filter: { dedupeKey: j.dedupeKey },
      update: {
        $set: {
          ...j,
          updatedAt: now, 
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      upsert: true,
    },
  }));
  let bulkRes;
  const dbFailures = [];

  try {
    bulkRes = await Job.bulkWrite(ops, { ordered: false });
  } catch (e) {
    dbFailures.push({
      dedupeKey: null,
      reasonCode: "DB_ERROR",
      message: `bulkWrite failed: ${e?.message || String(e)}`,
      sample: { sourceUrl, batchIndex },
      at: new Date(),
    });
    const allFailures = [...invalidFailures, ...dbFailures];
    await updateImportLogAfterBatch({
      runId,
      totalBatches,
      batchImported: 0,
      newCount: 0,
      updatedCount: 0,
      failedCount: allFailures.length,
      failuresToPush: allFailures,
      durationMs: Date.now() - start,
    });
    throw e;
  }
  const batchImported = valid.length;
  const failuresToPush = invalidFailures; 
  await updateImportLogAfterBatch({runId,totalBatches,batchImported,newCount,updatedCount,
    failedCount: invalidFailures.length,
    failuresToPush,durationMs: Date.now() - start,
  });
  return {
    runId,
    batchIndex,
    total: jobsPayload.length,
    imported: batchImported,
    new: newCount,
    updated: updatedCount,
    failed: invalidFailures.length,
    durationMs: Date.now() - start,
    bulk: {
      matched: bulkRes?.matchedCount,
      modified: bulkRes?.modifiedCount,
      upserted: bulkRes?.upsertedCount,
    },
  };
}

async function updateImportLogAfterBatch({
  runId,
  totalBatches,
  batchImported,
  newCount,
  updatedCount,
  failedCount,
  failuresToPush,
  durationMs,
}) {
  const limit = config.import.failureSampleLimit;
  let pushFailures = [];
  if (failuresToPush && failuresToPush.length > 0 && limit > 0) {
    const doc = await ImportLog.findOne({ runId }).select("failures").lean();
    const existingLen = doc?.failures?.length || 0;
    const remaining = capFailures(existingLen, limit);
    if (remaining > 0) {
      pushFailures = failuresToPush.slice(0, remaining);
    }
  }
  const update = {
    $inc: {
      totalImported: batchImported,
      newJobs: newCount,
      updatedJobs: updatedCount,
      failedJobs: failedCount,
      "meta.processedBatches": 1,
      "meta.attempts": 1,
    },
  };
  if (pushFailures.length > 0) {
    update.$push = { failures: { $each: pushFailures } };
  }
  await ImportLog.updateOne({ runId }, update);
  const latest = await ImportLog.findOne({ runId })
    .select("status startedAt failedJobs meta.totalBatches meta.processedBatches")
    .lean();
  const total = latest?.meta?.totalBatches ?? totalBatches ?? 0;
  const processed = latest?.meta?.processedBatches ?? 0;
  if (latest?.status === "running" && total > 0 && processed >= total) {
    const startedAt = latest?.startedAt
      ? new Date(latest.startedAt).getTime()
      : Date.now();
    const finalStatus = (latest?.failedJobs || 0) > 0 ? "partial" : "completed";
    await ImportLog.updateOne(
      { runId },
      {
        $set: {
          status: finalStatus,
          finishedAt: new Date(),
          "meta.durationMs": Date.now() - startedAt,
        },
      },
    );
  }
}

function startWorker() {
  const connection = getRedis();
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      if (job.name !== JOB_TYPES.IMPORT_FEED_BATCH) {
        return { skipped: true, reason: `Unknown job type: ${job.name}` };
      }
      return processImportFeedBatch(job);
    },
    {
      connection,
      concurrency: config.import.workerConcurrency,
    },
  );
  worker.on("completed", (job, result) => {
    console.log("[Worker] completed", job.id, job.name, result);
  });
  worker.on("failed", (job, err) => {
    console.error("[Worker] failed", job?.id, job?.name, err?.message || err);
  });
  worker.on("error", (err) => {
    console.error("[Worker] error:", err?.message || err);
  });
  console.log(
    `[Worker] started on queue=${QUEUE_NAME} concurrency=${config.import.workerConcurrency}`,
  );
  return worker;
}

module.exports = { startWorker };
