const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

require("dotenv").config();

const config = require("./config");
const { connectMongo } = require("./config/db");
const routes = require("./routes");
const errorMiddleware = require("./middlewares/error");
const { setupGracefulShutdown } = require("./utils/gracefulShutdown");

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

    const server = app.listen(config.port, () => {
      console.log(`[API] running on http://localhost:${config.port}`);
      console.log("[API] cron is disabled in API process (Step 11 split).");
    });
      //  if (process.env.CRON_ENABLED === "true") {
      //   startScheduler({ runOnBoot: process.env.CRON_RUN_ON_BOOT === "true" });
      //  }
    setupGracefulShutdown({
      name: "API",
      onClose: async () => {
        await new Promise((resolve) => server.close(resolve));
        console.log("[API] HTTP server closed");
      },
    });
  } catch (error) {
    console.error("[BOOT] fatal error:", error?.message || error);
    process.exit(1);
  }
}

startserver();
