const mongoose = require("mongoose");
const FailureSchema = new mongoose.Schema(
  {
    dedupeKey: { type: String, default: null },
    reasonCode: {
      type: String,
      enum: ["VALIDATION_ERROR", "DB_ERROR", "PARSE_ERROR", "HTTP_ERROR", "UNKNOWN"],
      default: "UNKNOWN",
    },
    message: { type: String, default: null },
    sample: { type: mongoose.Schema.Types.Mixed, default: null },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);
const ImportLogSchema = new mongoose.Schema(
  {
    runId: { type: String, required: true, unique: true, index: true },
    sourceUrl: { type: String, required: true, index: true }, 
    sourceName: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["running", "completed", "partial", "failed"],
      default: "running",
      index: true,
    },
    startedAt: { type: Date, default: Date.now, index: true },
    finishedAt: { type: Date, default: null },
    totalFetched: { type: Number, default: 0 },
    totalImported: { type: Number, default: 0 },
    newJobs: { type: Number, default: 0 },
    updatedJobs: { type: Number, default: 0 },
    failedJobs: { type: Number, default: 0 },
    failures: { type: [FailureSchema], default: [] },
    data: {
      batchSize: { type: Number, default: null },
      concurrency: { type: Number, default: null },
      totalBatches: { type: Number, default: 0 },
      processedBatches: { type: Number, default: 0 },
      attempts: { type: Number, default: 0 },
      durationMs: { type: Number, default: null },
    },
  },
  { timestamps: true }
);

ImportLogSchema.index({ sourceUrl: 1, startedAt: -1 });
ImportLogSchema.index({ startedAt: -1 });
ImportLogSchema.index({ status: 1, startedAt: -1 });

module.exports =
  mongoose.models.ImportLog || mongoose.model("ImportLog", ImportLogSchema);
