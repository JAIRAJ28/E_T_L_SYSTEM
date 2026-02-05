// Server/utils/gracefulShutdown.js
const mongoose = require("mongoose");
const { getRedis } = require("../config/redis");

function setupGracefulShutdown({ name, onClose } = {}) {
  let shuttingDown = false;
  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[${name || "Process"}] received ${signal}, shutting down...`);
    try {
      if (onClose) await onClose();
      try {
        await mongoose.connection.close(false);
        console.log(`[${name || "Process"}] Mongo closed`);
      } catch (e) {
        console.error(`[${name || "Process"}] Mongo close error:`, e?.message || e);
      }
      try {
        const redis = getRedis();
        await redis.quit();
        console.log(`[${name || "Process"}] Redis quit`);
      } catch (e) {
        console.error(`[${name || "Process"}] Redis quit error:`, e?.message || e);
      }
    } finally {
      process.exit(0);
    }
  }
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

module.exports = { setupGracefulShutdown };
