require("dotenv").config();

const config = require("../config");
const { connectMongo } = require("../config/db");
const { runCronOnce } = require("./cronRunner");
const { setupGracefulShutdown } = require("../utils/gracefulShutdown");

async function startCronProcess() {
  await connectMongo();
  const minutes = config.import.intervalMinutes;
  const intervalMs = minutes * 60 * 1000;
  console.log(`[CRON] started. Interval = ${minutes} minutes`);
  let isRunning = false;
  const tick = async () => {
    if (isRunning) {
      console.log("[CRON] skipped tick: previous run still in progress");
      return;
    }
    isRunning = true;
    try {
      await runCronOnce();
    } catch (e) {
      console.error("[CRON] run failed:", e?.stack || e?.message || e);
    } finally {
      isRunning = false;
    }
  };
  await tick();
  const timer = setInterval(tick, intervalMs);
  setupGracefulShutdown({
    name: "CRON",
    onClose: async () => {
      clearInterval(timer);
      console.log("[CRON] interval cleared");
    },
  });
}

startCronProcess().catch((e) => {
  console.error("[CRON] fatal:", e?.stack || e?.message || e);
  process.exit(1);
});
