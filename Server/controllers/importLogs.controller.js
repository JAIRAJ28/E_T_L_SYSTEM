const { z } = require("zod");
const ImportLog = require("../model/import_logs_model");

const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sourceUrl: z.string().min(1).optional(),
  status: z.enum(["running", "completed", "partial", "failed"]).optional(),
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
  q: z.string().min(1).optional(),
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function listImportLogs(req, res, next) {
  try {
    const q = ListQuerySchema.parse(req.query);
    console.log(q,"the_q")
    const filter = {};
    if (q.sourceUrl) filter.sourceUrl = q.sourceUrl;
    if (q.status) filter.status = q.status;
    if (q.from || q.to) {
      filter.startedAt = {};
      if (q.from) filter.startedAt.$gte = new Date(q.from);
      if (q.to) filter.startedAt.$lte = new Date(q.to);
    }
    if (q.q && q.q.trim()) {
      const regex = new RegExp(q.q.trim(), "i");

      filter.$or = [
        { sourceUrl: regex },
        { sourceName: regex },
        { runId: regex },
        { status: regex },
      ];
    }
    const page = Math.max(1, q.page);
    const limit = Math.min(100, q.limit);
    const skip = (page - 1) * limit;
    const projection = {
      runId: 1,
      sourceUrl: 1,
      sourceName: 1,
      status: 1,
      startedAt: 1,
      finishedAt: 1,
      totalFetched: 1,
      totalImported: 1,
      newJobs: 1,
      updatedJobs: 1,
      failedJobs: 1,
      "data.durationMs": 1,
    };
    const [items, total] = await Promise.all([
      ImportLog.find(filter)
        .sort({ startedAt: -1 })
        .skip(skip)
        .limit(limit)
        .select(projection)
        .lean(),

      ImportLog.countDocuments(filter),
    ]);
    console.log(items,"items___")
    res.json({
      ok: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
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
