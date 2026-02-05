<!-- SYSTEM DESIGN AS PER ASKED -->
1. WHAT HAS BEEN ASKED THE OVERVIEW?
    Needed a scalable job from multiple external xml feeds
    1.Pulls job from multiple external XML feeds
    2.converts xml to json
    3.process imports asynchronous using Redis + BullMq
    4.inserts/updates into MongoDb using bulk upsertings.
    5.records import runs into import_logs (history tracking)
    6.Using the api call it to the nextjs admin side UI including optional real time updating.

2.Key contraints:
    Must be kept scale to 1M+ job records
    Avoid duplications.
    Tracking new , particular that are updated , and also those are failed
    Recover from partial failures

3. High-Level Architecture
    Routes Created
    a> APIs:
    >/health --- Checks whether the server and its dependencies are alive.

    >/api/import/run --- Manually starts a new data import process and creates a fresh import run.

    >/api/import-logs --- Returns the list of all previous import runs with their status and timestamps from mongodb.

    >/api/import-logs/:runId --- Fetches detailed logs and results for a specific import execution using its run ID .

    >/api/import-logs/stream (optional SSE) --- Streams live import progress updates to the UI in real time using Server-Sent Events.

    b> Cron Service (Node process)
        .Runs every IMPORT_INTERVAL_MINUTES (default 60)
        For each source feed:
        .fetch XML -- (the source apis are returning data in the xml format)
        .parse + normalize -- (parse the data normalize it and make it ready for json format response)
        .batch jobs -- enqueue batches in BullMQ
     c> Worker Service (Node process)
        .BullMQ consumer >> Processes batches concurrently
        Performs >> dedupe detection,
        bulk upsert to MongoDB,
        accurate new/updated counts,
        failure collection ,
        finalizes import run status

4.  Storage : 
    >MongoDB
    jobs collection: normalized job records
    import_logs collection: run history + counters + failure samples
    >Redis
    BullMQ uses Redis to store background jobs, handle delayed execution and retries, and applies locks so the same job or cron task never runs twice at the same time or ever if not needed.


Import Run Lifecycle
    For each feed URL:
        (A) Cron Producer
            Create import_logs document:
                    status: running
                    startedAt, runId
                    sourceUrl (fileName), sourceName
                    Fetch XML from external feed with timeout.
                    Parse XML to raw items (RSS/Atom supported).
                    Normalize each item into a unified Job shape.
                    Validate minimal required fields.
                    Chunk valid jobs into batches (BATCH_SIZE).
                    Enqueue each batch to BullMQ:
                    job.name = IMPORT_FEED_BATCH
                              payload includes runId, sourceUrl, batchIndex, totalBatches, jobs[]
                    Update import_logs:
                    totalFetched
                    meta.totalBatches ---How many batches created.
                    Example: 500 items → 5 batches.
                             producer-stage validation failures counted into failedJobs
                    If no batches (feed empty): If feed had zero valid records.
                                                Example: XML exists but contains no jobs.
                    finalize immediately (completed or partial)

        Download XML JOb List → convert to objects → standardize format → validate → split into batches → push to BullMQ → track progress → finish import.

        (B) Worker Consumer
            Pick batch from queue
                > Worker receives one batch of records from BullMQ.
                Split valid vs invalid
                > Quickly validate data and separate good records from bad ones.
                Check duplicates in DB
                > Query MongoDB using dedupeKey to see which records already exist.
                Count new vs existing
                > Keys not found = new jobs, keys found = updates.
                Bulk upsert records
                > Use bulkWrite(upsert:true) to insert new or update existing in one DB call.
                Update import counters
                > Increase: totalImported , newJobs , updatedJobs , failedJobs ,processedBatches , Repeat for next batch
                > Worker continues until all batches are processed.
                Finalize import status
                > If any failed → partial, otherwise → completed.
                Save finish time & duration
                > Store finishedAt and total durationMs.

        Worker pulls batch → validates → checks duplicates → bulk upserts → updates counters → repeats → marks job completed or partial → saves finish time.

5. Scalability Decisions
    1. Dedupe Key Strategy : 
                Each job is identified by a stable unique key:
                dedupeKey = sha1(sourceUrl + "|" + (externalId || jobUrl))
                - taking the source url and with the externalId and joburl makes it   differentive among all other job if same exists into different links.

                Why : feed entries may not always provide stable GUIDs
                job URL often stable
                including sourceUrl avoids collisions across sources
                sha1 gives fixed length keys and fast index lookups.

                MongoDB unique key for this: 
                Unique index on dedupeKey
                Result: No duplicates even across repeated imports
                Upserts become deterministic and fast

                indexing to all the keys for better search with the b-tree method of the mongodb
                Pre-sorting and organizing my data in these patterns, because I will be query the same 
                ex- ImportLogSchema.index({ sourceUrl: 1, startedAt: -1 });
    2.  Batch Queue (not one job per record)
            Instead of pushing 1 job into queue per record, we push batches of jobs.
            Why:1M records → 1M queue jobs is heavy on Redis memory + queue overhead
            batch processing reduces Redis operations drastically
            worker can do 1 query + 1 bulkWrite per batch
            Batch size is configurable: batch size is 200 here , check it in the end can be configured.

    3.  Efficient Update if exists, Insert if not via bulkWrite
        Per batch we do:
        1 query to detect existing keys
        1 bulkWrite to upsert all records
        This keeps DB I/O bounded:
        O(B) operations but only 2 round-trips per batch
        Using:
        { ordered: false } One bad record does NOT kill the whole batch.


6)  MongoDB Schema & Indexing
        jobs
        Key fields:
                dedupeKey (unique)
                sourceUrl, sourceName
                title, jobUrl, company, categories, publishedAt
                timestamps
                Indexes:
                { dedupeKey: 1 } unique
                { sourceUrl: 1, publishedAt: -1 } for feed-based listing / future UI

                optional text index (if needed for search)

        import_logs
            Fields:
                runId unique
                sourceUrl, sourceName
                status, startedAt, finishedAt
                counters: totalFetched, totalImported, newJobs, updatedJobs, failedJobs
                failures[] (capped)
                meta: batchSize, concurrency, totalBatches, processedBatches, durationMs
                Indexes:
                { sourceUrl: 1, startedAt: -1 } (feed history)
                { status: 1, startedAt: -1 }
                { startedAt: -1 } (global history)


Real-Time Updates TO THE FRONTEND SIDE  through backend ---
        SSE endpoint: /api/import-logs/stream
        This pushes updates to UI instantly:
        status changes, counters change, progress updates




Security & Production Considerations
        Environment validation at booting instead of runtime through zod module to prevent misconfiguration
        process separation: Crom / Worker/ Redis 
        API scales horizontally
        Worker scales based on throughput
        Cron stays single
        
        graceful shutdown: finish current work , close Mongo/Redis connections safely
        
        limit stored “raw feed” data in production (storage control)