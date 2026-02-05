// Server/controllers/import.controller.js
const feedSources = require("../cron/apiSource");
const { runImportForSource } = require("../services/importRunner");

async function runImportNow(req, res, next) {
  try {
    const { sourceUrl } = req.body || {};
    if (sourceUrl) {
      const found = feedSources.find((s) => s.url === sourceUrl);
      if (!found) {
        return res.status(400).json({
          ok: false,
          message: "sourceUrl not found in feedSources registry",
        });
      }
      const result = await runImportForSource({
        sourceUrl: found.url,
        sourceName: found.sourceName,
      });
      return res.json({ ok: true, mode: "single", result });
    }
    const results = [];
    for (const src of feedSources) {
      try {
        const r = await runImportForSource({
          sourceUrl: src.url,
          sourceName: src.sourceName,
        });
        results.push({ sourceUrl: src.url, ok: true, result: r });
      } catch (e) {
        results.push({
          sourceUrl: src.url,
          ok: false,
          error: e?.message || String(e),
        });
      }
    }
    return res.json({ ok: true, mode: "all", results });
  } catch (err) {
    next(err);
  }
}

module.exports = { runImportNow };
