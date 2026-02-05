const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.json({ ok: true, message: "API is up" });
});
router.use("/import", require("./manual.route"));
router.use("/import-logs", require("./importLogsSse.routes"));
router.use("/import-logs", require("./importLogs.routes"));

module.exports = router;
