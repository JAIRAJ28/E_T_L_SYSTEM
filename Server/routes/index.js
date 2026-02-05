const exress = require("express")
const router=exress.Router()
router.get("/", (req, res) => {
  res.json({ ok: true, message: "API is up" });
});
router.use("/import", require("./manual.route"));

module.exports = router;
