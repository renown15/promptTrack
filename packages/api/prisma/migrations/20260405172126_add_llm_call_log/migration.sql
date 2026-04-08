-- CreateTable
CREATE TABLE "llm_call_logs" (
    "id" TEXT NOT NULL,
    "collection_id" TEXT NOT NULL,
    "relative_path" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "prompt_chars" INTEGER NOT NULL,
    "prompt_tokens" INTEGER,
    "response_tokens" INTEGER,
    "status" TEXT NOT NULL,
    "error_reason" TEXT,

    CONSTRAINT "llm_call_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "llm_call_logs_collection_id_started_at_idx" ON "llm_call_logs"("collection_id", "started_at");

-- AddForeignKey
ALTER TABLE "llm_call_logs" ADD CONSTRAINT "llm_call_logs_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
