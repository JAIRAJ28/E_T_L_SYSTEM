module.exports = function errorMiddleware(err, req, res, next) {
  console.error("[API ERROR]", err?.stack || err);

  const status = err?.statusCode || err?.status || 500;
  res.status(status).json({
    ok: false,
    error: true,
    message: err?.message || "Internal Server Error",
  });
};
