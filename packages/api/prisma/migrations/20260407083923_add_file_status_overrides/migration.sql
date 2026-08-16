-- CreateTable
CREATE TABLE "file_status_overrides" (
    "id" TEXT NOT NULL,
    "collection_id" TEXT NOT NULL,
    "relative_path" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'human',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "file_status_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "file_status_overrides_collection_id_relative_path_idx" ON "file_status_overrides"("collection_id", "relative_path");

-- CreateIndex
CREATE UNIQUE INDEX "file_status_overrides_collection_id_relative_path_metric_key" ON "file_status_overrides"("collection_id", "relative_path", "metric");

-- AddForeignKey
ALTER TABLE "file_status_overrides" ADD CONSTRAINT "file_status_overrides_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
