# E_T_L_SYSTEM
  
  Job Import System (XML Feeds → Redis Queue → MongoDB + Import History)
   
    Scalable job import system using Node.js, MongoDB, Redis (BullMQ), and Next.js. Fetches XML job feeds both existing and new type of RSS or atom is normalized into common schema and then converts to JSON, queues jobs for background processing, performs if exists update or insert to into MongoDB, and tracks import history (new/updated/failed). Includes admin UI for monitoring imports and logs.
    Tech Stack: **Node.js (Express)**, **MongoDB (Mongoose)**, **Redis**, **BullMQ**, **Next.js (client)**  
    Bonus: **SSE** real-time import log updates.

---

## Features
    - Fetch jobs from multiple XML feeds (Jobicy + HigherEdJobs) -- all apis are added to the apisource.js in cron
    - XML → JSON conversion (RSS/Atom support, both old and new stricter format supported.)
    - Queue-based background processing using Redis + BullMQ 
    - Worker bulk upserts into MongoDB (efficient for 1M+ scale as asked in the project description.)
    - Import history tracking (`import_logs`) with:
    - totalFetched, totalImported, newJobs, updatedJobs, failedJobs
    - run status: running / completed / partial / failed
    - failure samples (capped)
    - Admin APIs for pagination + filtering
    - Added SSE endpoint for real-time updates

---

## Architecture (High Level)
The system is split into 3 processes:
1. **API Service** (`npm run api`)  
   Exposes endpoints for manual import trigger + import history APIs.
2. **Cron Producer** (`npm run cron`)  
   Runs every `IMPORT_INTERVAL_MINUTES`, fetches feed XML, normalizes records, batches them, and enqueues batches to BullMQ. Uses a Redis lock to prevent overlap.
3. **Worker Consumer** (`npm run worker`)  
   Consumes queued batches and performs MongoDB `bulkWrite` upserts. Computes new vs updated counts per batch and updates `import_logs`. Finalizes the run when all batches are processed.

More details: see **/docs/architecture.md**.

---

## Prerequisites
- Node.js **18+** (20+ recommended)
- MongoDB (Atlas or local)
- Redis (Redis Cloud)
---

## Environment Variables
Create `Server/.env`:
```env
    PORT=2001
    MONGO_URI="..............."
    REDIS_URL="..............."
    BATCH_SIZE=200
    WORKER_CONCURRENCY=10
    IMPORT_INTERVAL_MINUTES=60
    FAILURE_SAMPLE_LIMIT=200
    HTTP_TIMEOUT_MS=15000
    RUN_LOCK_TTL_SEC=3600
    NODE_ENV=development
