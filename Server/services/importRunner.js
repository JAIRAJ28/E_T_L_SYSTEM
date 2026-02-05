const{v4:uuidv4} =require("uuid");
const config = require("../config/index");
const { fetchXml } = require("./fetchXml");
const { parseFeedXml } = require("./parseFeedXml");
const { normalizeJob, validateNormalizedJob } = require("./normalizeJob");
const { getJobImportQueue } = require("../config/queue");
const { JOB_TYPES } = require("../config/queue");
const ImportLog = require("../model/import_logs_model");
function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size){ 
        out.push(arr.slice(i, i + size));
    }
  return out;
}

async function runImportForSource({sourceUrl,sourceName}){
  const runId = uuidv4();
  const startedAt = new Date();
  const log = await ImportLog.create({
    runId,
    sourceUrl,
    sourceName,
    status: "running",
    startedAt,
    meta: {
      batchSize: config.import.batchSize,
      concurrency: config.import.workerConcurrency,
      totalBatches: 0,
      processedBatches: 0,
    },
  });
  try {
    const xml = await fetchXml(sourceUrl);
    const parsed = parseFeedXml(xml);
    const rawItems = parsed.items || [];
    const totalFetched = rawItems.length;
    const validJobs = [];
    let invalidCount = 0;
    for (const rawItem of rawItems) {
      const normalized = normalizeJob({ sourceUrl, sourceName, rawItem });
      const { ok } = validateNormalizedJob(normalized);
      if (!ok) {
        invalidCount++;
        continue;
      }
      validJobs.push(normalized);
    }
    const batchSize = config.import.batchSize;
    const batches = chunkArray(validJobs, batchSize);
    const queue = getJobImportQueue();
    for (let i = 0; i < batches.length; i++) {
      await queue.add(
        JOB_TYPES.IMPORT_FEED_BATCH,
        {
          runId,
          sourceUrl,
          sourceName,
          batchIndex: i,
          totalBatches: batches.length,
          jobs: batches[i],
        }
      );
    }
    await ImportLog.updateOne(
      { runId },
      {
        $set: {
          totalFetched,
          failedJobs: invalidCount, 
          "meta.totalBatches": batches.length,
        },
      }
    );
    return { runId, totalFetched, queuedBatches: batches.length, invalidCount };
  } catch (err) {
     const message = err?.message || String(err);
    const reasonCode = err?.reasonCode || "UNKNOWN";
    await ImportLog.updateOne(
      { runId },
      {
        $set: {
          status: "failed",
          finishedAt: new Date(),
          "meta.durationMs": Date.now() - startedAt.getTime(),
        },
        $inc: { failedJobs: 1 },
        $push: {
          failures: {
            reasonCode,
            message,
            sample: { sourceUrl },
            at: new Date(),
          },
        },
      }
    )
    throw err;
  }
}
module.exports = { runImportForSource };
