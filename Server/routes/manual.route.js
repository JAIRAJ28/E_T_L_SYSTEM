// Server/routes/import.routes.js
const express = require("express")
const router=express.Router()
const { runImportNow } = require("../controllers/manualTrig.controller");

router.post("/run", runImportNow);

module.exports = router;
