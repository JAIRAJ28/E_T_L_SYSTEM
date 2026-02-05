const { z } = require("zod");
const ImportLog = require("../model/import_logs_model");

const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sourceUrl: z.string().min(1).optional(),
  status: z.enum(["running", "completed", "partial", "failed"]).optional(),
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
});

async function listImportLogs(req, res, next) {
  try {
    const q = ListQuerySchema.parse(req.query);
    const filter = {};
    if (q.sourceUrl) filter.sourceUrl = q.sourceUrl;
    if (q.status) filter.status = q.status;
    if (q.from || q.to) {
      filter.startedAt = {};
      if (q.from) filter.startedAt.$gte = new Date(q.from);
      if (q.to) filter.startedAt.$lte = new Date(q.to);
    }
    const skip = (q.page - 1) * q.limit;
    const [items, total] = await Promise.all([
      ImportLog.find(filter)
        .sort({ startedAt: -1 })
        .skip(skip)
        .limit(q.limit)
        .select(
          "runId sourceUrl sourceName status startedAt finishedAt totalFetched totalImported newJobs updatedJobs failedJobs data.durationMs"
        )
        .lean(),
      ImportLog.countDocuments(filter),
    ]);
    const totalPages = Math.ceil(total / q.limit) || 1;
    res.json({
      ok: true,
      page: q.page,
      limit: q.limit,
      total,
      totalPages,
      items,
    });
  } catch (err) {
    next(err);
  }
}

async function getImportLogByRunId(req, res, next) {
  try {
    const runId = req.params.runId;
    if (!runId) {
      return res.status(400).json({ ok: false, message: "runId is required" });
    }
    const doc = await ImportLog.findOne({ runId }).lean();
    if (!doc) {
      return res.status(404).json({ ok: false, message: "Import log not found" });
    }
    res.json({ ok: true, item: doc });
  } catch (err) {
    next(err);
  }
}

module.exports = { listImportLogs, getImportLogByRunId };
