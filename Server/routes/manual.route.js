// Server/routes/import.routes.js
const router = require("express").Router();
const { runImportNow } = require("../controllers/manualTrig.controller");

router.post("/run", runImportNow);

module.exports = router;
