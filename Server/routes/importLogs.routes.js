const exress = require("express")
const router=exress.Router()
const {
  listImportLogs,
  getImportLogByRunId,
} = require("../controllers/importLogs.controller");

router.get("/", listImportLogs);
router.get("/:runId", getImportLogByRunId);

module.exports = router;