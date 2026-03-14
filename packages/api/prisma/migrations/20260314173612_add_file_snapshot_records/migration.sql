-- CreateTable
CREATE TABLE "file_snapshot_records" (
    "id" TEXT NOT NULL,
    "collection_id" TEXT NOT NULL,
    "relative_path" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "line_count" INTEGER NOT NULL,
    "coverage" DOUBLE PRECISION,
    "metrics" JSONB NOT NULL DEFAULT '{}',
    "scanned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_snapshot_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "file_snapshot_records_collection_id_relative_path_idx" ON "file_snapshot_records"("collection_id", "relative_path");

-- CreateIndex
CREATE INDEX "file_snapshot_records_collection_id_scanned_at_idx" ON "file_snapshot_records"("collection_id", "scanned_at");

-- AddForeignKey
ALTER TABLE "file_snapshot_records" ADD CONSTRAINT "file_snapshot_records_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
