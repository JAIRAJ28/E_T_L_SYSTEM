// Server/routes/import.routes.js
const exress = require("express")
const router=exress.Router()
const { runImportNow } = require("../controllers/manualTrig.controller");

router.post("/run", runImportNow);

module.exports = router;
