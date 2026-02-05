const feedSources = require("./apiSource");
const { runImportForSource } = require("../services/importRunner");
const { acquireLock, releaseLock } = require("../config/lock");

async function runCronOnce() {
  const lockKey = "job-import:cron-lock";
  const lockVal = await acquireLock(lockKey);
  if (!lockVal) {
    console.log("[Cron] skipped: another run is active");
    return;
  }
  console.log(`[Cron] started at ${new Date().toISOString()}`);
  try {
    for (const src of feedSources) {
      try {
        const result = await runImportForSource({
          sourceUrl: src.url,
          sourceName: src.sourceName,
        });
        console.log("[Cron] imported", src.url, result);
      } catch (e) {
        console.error("[Cron] source failed:", src.url, e?.message || e);
      }
    }
  } finally {
    await releaseLock(lockKey, lockVal);
    console.log(`[Cron] finished at ${new Date().toISOString()}`);
  }
}

module.exports = { runCronOnce };
