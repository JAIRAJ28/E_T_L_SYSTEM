require("dotenv").config();

const config = require("../config");
const { connectMongo } = require("../config/db");
const { runCronOnce } = require("./cronRunner");

async function startCronProcess() {
  await connectMongo();
  const minutes = config.import.intervalMinutes;
  const intervalMs = minutes * 60 * 1000;
  console.log(`[CRON] started. Interval = ${minutes} minutes`);
  await runCronOnce();
  setInterval(() => {
    runCronOnce().catch((e) =>
      console.error("[CRON] run failed:", e?.stack || e?.message || e)
    );
  }, intervalMs);
}
startCronProcess().catch((e) => {
  console.error("[CRON] fatal:", e?.stack || e?.message || e);
  process.exit(1);
});
