require("dotenv").config();

const { connectMongo } = require("../config/db");
const { startWorker } = require("./workers");

async function mongoWorker() {
  await connectMongo();
  startWorker();
}

mongoWorker().catch((err) => {
  console.error("[Worker BOOT] fatal:", err?.message || err);
  process.exit(1);
});
