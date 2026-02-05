const config = require("../config");
const { runCronOnce } = require("./cronRunner");

let intervalRef = null;

function startScheduler({ runOnBoot = false } = {}) {
  const minutes = config.import.intervalMinutes;
  const intervalMs = minutes * 60 * 1000;
  if (intervalRef) return;
  console.log(`[Scheduler] interval = ${minutes} minutes`);
  if (runOnBoot) {
    runCronOnce().catch((e) =>
      console.error("[Scheduler] runOnBoot failed:", e?.message || e)
    );
  }
  intervalRef = setInterval(() => {
    runCronOnce().catch((e) =>
      console.error("[Scheduler] scheduled run failed:", e?.message || e)
    );
  }, intervalMs);
  intervalRef.unref?.();
}

function stopScheduler() {
  if (!intervalRef) return;
  clearInterval(intervalRef);
  intervalRef = null;
  console.log("[Scheduler] stopped");
}

module.exports = { startScheduler, stopScheduler };