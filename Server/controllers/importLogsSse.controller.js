const ImportLog = require("../model/import_logs_model");

function sseHeaders(res) {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
}

function writeEvent(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

async function streamImportLogs(req, res, next) {
  try {
    sseHeaders(res);
    res.flushHeaders?.();
    const { sourceUrl, runId } = req.query;
    writeEvent(res, "hello", { ok: true, ts: new Date().toISOString() });
    const filter = {};
    if (sourceUrl) filter.sourceUrl = sourceUrl;
    if (runId) filter.runId = runId;

    const initial = await ImportLog.find(filter)
      .sort({ startedAt: -1 })
      .limit(20)
      .select(
        "runId sourceUrl sourceName status startedAt finishedAt totalFetched totalImported newJobs updatedJobs failedJobs meta.durationMs meta.totalBatches meta.processedBatches"
      )
      .lean();

    writeEvent(res, "init", { items: initial });
    const pipeline = [];
    const match = {};
    if (sourceUrl) match["fullDocument.sourceUrl"] = sourceUrl;
    if (runId) match["fullDocument.runId"] = runId;
    if (Object.keys(match).length > 0) {
      pipeline.push({ $match: match });
    }
    let changeStream;
    try {
      changeStream = ImportLog.watch(pipeline, { fullDocument: "updateLookup" });
    } catch (e) {
      writeEvent(res, "error", {
        message: "Change Streams not available. Ensure MongoDB is a replica set.",
        details: e?.message || String(e),
      });
      return res.end();
    }

    const onChange = (change) => {
      const doc = change?.fullDocument;
      if (!doc) return;
      writeEvent(res, "import_log", {
        runId: doc.runId,
        sourceUrl: doc.sourceUrl,
        sourceName: doc.sourceName,
        status: doc.status,
        startedAt: doc.startedAt,
        finishedAt: doc.finishedAt,
        totalFetched: doc.totalFetched,
        totalImported: doc.totalImported,
        newJobs: doc.newJobs,
        updatedJobs: doc.updatedJobs,
        failedJobs: doc.failedJobs,
        meta: doc.meta,
        updatedAt: doc.updatedAt,
      });
    };
    changeStream.on("change", onChange);
    const keepAlive = setInterval(() => {
      res.write(`event: ping\ndata: ${Date.now()}\n\n`);
    }, 25000);
    req.on("close", async () => {
      clearInterval(keepAlive);
      try {
        await changeStream.close();
      } catch {}
      res.end();
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { streamImportLogs };
