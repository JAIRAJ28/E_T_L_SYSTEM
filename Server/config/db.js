const mongoose = require("mongoose");
const config = require("./index");
let isConnected = false;
async function connectMongo({ maxRetries = 5 } = {}) {
  if (isConnected) return mongoose.connection;
  const uri = config.mongo.uri;
  mongoose.set("strictQuery", true);
  const options = {
    autoIndex: false, 
    maxPoolSize: 50, 
    minPoolSize: 5,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
  };
  let attempt = 0;
  while (true) {
    try {
      attempt++;
      await mongoose.connect(uri, options);
      isConnected = true;
      mongoose.connection.on("disconnected", () => {
        isConnected = false;
        console.error("[Mongo] disconnected");
      });
      mongoose.connection.on("error", (err) => {
        console.error("[Mongo] error:", err?.message || err);
      });
      console.log("[Mongo] connected");
      return mongoose.connection;
    } catch (error) {
      const msg = error?.message || String(error);
      console.error(`[Mongo] connect attempt ${attempt} failed: ${msg}`);
      if (attempt >= maxRetries) {
        console.error("[Mongo] max retries reached, exiting.");
        process.exit(1);
      }
      const delayMs = Math.min(1000 * 2 ** (attempt - 1), 15000);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}
module.exports = { connectMongo };
