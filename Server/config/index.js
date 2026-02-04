const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { z } = require("zod");
const EnvSchema = z.object({
        PORT: z.coerce.number(),
        MONGO_URI: z
            .string()
            .min(1)
            .refine(
            (v) => v.startsWith("mongodb://") || v.startsWith("mongodb+srv://"),
            "MONGO_URI must start with mongodb:// or mongodb+srv://",
            ),
        REDIS_URL: z
            .string()
            .min(1)
            .refine(
            (v) =>
                (v.startsWith("redis://") || v.startsWith("rediss://")) &&
                !v.includes("redis-cli"),
            "REDIS_URL must be a Redis connection string like redis://... (do not include 'redis-cli -u')",
            ),
        BATCH_SIZE: z.coerce.number(),
        WORKER_CONCURRENCY: z.coerce.number(),
        IMPORT_INTERVAL_MINUTES: z.coerce.number(),
        FAILURE_SAMPLE_LIMIT: z.coerce.number(),
        HTTP_TIMEOUT_MS: z.coerce.number(),
        RUN_LOCK_TTL_SEC: z.coerce.number(),
        NODE_ENV: z.string().default("development"),
        });
const env = EnvSchema.parse(process.env);
module.exports = {
        port: env.PORT,
        mongo: { uri: env.MONGO_URI },
        redis: { url: env.REDIS_URL },
        import: {
            batchSize: env.BATCH_SIZE,
            workerConcurrency: env.WORKER_CONCURRENCY,
            intervalMinutes: env.IMPORT_INTERVAL_MINUTES,
            failureSampleLimit: env.FAILURE_SAMPLE_LIMIT,
            runLockTtlSec: env.RUN_LOCK_TTL_SEC,
        },
        http: { timeoutMs: env.HTTP_TIMEOUT_MS },
        env: env.NODE_ENV,
};
