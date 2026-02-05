const { Queue } = require("bullmq");
const { getRedis } = require("./redis");
const QUEUE_NAME = "job-import";

let jobImportQueue = null;
const JOB_TYPES = Object.freeze({
  IMPORT_FEED_BATCH: "IMPORT_FEED_BATCH",
});

function getJobImportQueue() {
  if (jobImportQueue) return jobImportQueue;
  const connection = getRedis();
  jobImportQueue = new Queue(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: { count: 2000 },
      removeOnFail: { count: 5000 },
    },
  });
  console.log(`[BullMQ] queue initialized: ${QUEUE_NAME}`);
  return jobImportQueue;
}

module.exports = { QUEUE_NAME, getJobImportQueue, JOB_TYPES };
