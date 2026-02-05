const exress = require("express")
const router=exress.Router()

const { streamImportLogs } = require("../controllers/importLogsSse.controller");
router.get("/stream", streamImportLogs);
router.get("/sse", streamImportLogs);

module.exports = router;
