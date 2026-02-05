const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

require("dotenv").config();

const config = require("./config");
const { connectMongo } = require("./config/db");
const routes = require("./routes");
const errorMiddleware = require("./middlewares/error");
const { startScheduler } = require("./cron/scheduler");

const app = express();

app.use(helmet());
app.use(cors({ origin: "*", credentials: false }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.get("/health", async (req, res) => {
  res.json({ ok: true, env: config.env, ts: new Date().toISOString() });
});
app.use("/api", routes);
app.use(errorMiddleware);
async function startserver() {
  try {
    await connectMongo();

    app.listen(config.port, () => {
      console.log(`[API] running on http://localhost:${config.port}`);
      if (process.env.CRON_ENABLED === "true") {
        startScheduler({ runOnBoot: process.env.CRON_RUN_ON_BOOT === "true" });
      }
    });
  } catch (error) {
    console.error("[BOOT] fatal error:", error?.message || error);
    process.exit(1);
  }
}
startserver();
