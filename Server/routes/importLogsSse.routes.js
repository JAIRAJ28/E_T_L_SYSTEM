const express = require("express");
const router = express.Router();

const { streamImportLogs } = require("../controllers/importLogsSse.controller");
router.get("/stream", streamImportLogs);
router.get("/sse", streamImportLogs);

module.exports = router;
