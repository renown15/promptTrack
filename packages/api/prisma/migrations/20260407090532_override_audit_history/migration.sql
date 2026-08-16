/*
  Warnings:

  - You are about to drop the column `updated_at` on the `file_status_overrides` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "file_status_overrides_collection_id_relative_path_metric_key";

-- AlterTable
ALTER TABLE "file_status_overrides" DROP COLUMN "updated_at",
ADD COLUMN     "superseded_at" TIMESTAMP(3),
ADD COLUMN     "superseded_by" TEXT;

-- CreateIndex
CREATE INDEX "file_status_overrides_collection_id_relative_path_metric_idx" ON "file_status_overrides"("collection_id", "relative_path", "metric");
