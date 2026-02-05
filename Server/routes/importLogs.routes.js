const express = require("express")
const router=express.Router()
const {
  listImportLogs,
  getImportLogByRunId,
} = require("../controllers/importLogs.controller");

router.get("/", listImportLogs);
router.get("/:runId", getImportLogByRunId);

module.exports = router;