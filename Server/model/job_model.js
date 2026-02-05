const mongoose = require("mongoose");

const JobSchema = new mongoose.Schema(
  {
    sourceUrl: { type: String, required: true, index: true },     
    sourceName: { type: String, required: true, index: true },    
    externalId: { type: String, default: null, index: true },     
    jobUrl: { type: String, required: true },                     
    dedupeKey: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    company: { type: String, default: null, trim: true, index: true },
    location: { type: String, default: null, trim: true },
    description: { type: String, default: null },
    categories: { type: [String], default: [], index: true },
    jobType: { type: String, default: null },
    region: { type: String, default: null },
    publishedAt: { type: Date, default: null, index: true },

    // Keep raw optional; storing huge raw payloads can explode storage.
    raw: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);
JobSchema.index({ sourceUrl: 1, publishedAt: -1 });

module.exports = mongoose.models.Job || mongoose.model("Job", JobSchema);
