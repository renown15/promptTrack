/*
  Warnings:

  - You are about to drop the column `collection_id` on the `chains` table. All the data in the column will be lost.
  - You are about to drop the column `collection_id` on the `prompts` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "chains" DROP CONSTRAINT "chains_collection_id_fkey";

-- DropForeignKey
ALTER TABLE "prompts" DROP CONSTRAINT "prompts_collection_id_fkey";

-- DropIndex
DROP INDEX "chain_version_embedding_idx";

-- DropIndex
DROP INDEX "chains_collection_id_idx";

-- DropIndex
DROP INDEX "prompt_version_embedding_idx";

-- DropIndex
DROP INDEX "prompts_collection_id_idx";

-- AlterTable
ALTER TABLE "chains" DROP COLUMN "collection_id";

-- AlterTable
ALTER TABLE "prompts" DROP COLUMN "collection_id";

-- CreateTable
CREATE TABLE "prompt_collections" (
    "prompt_id" TEXT NOT NULL,
    "collection_id" TEXT NOT NULL,

    CONSTRAINT "prompt_collections_pkey" PRIMARY KEY ("prompt_id","collection_id")
);

-- CreateTable
CREATE TABLE "chain_collections" (
    "chain_id" TEXT NOT NULL,
    "collection_id" TEXT NOT NULL,

    CONSTRAINT "chain_collections_pkey" PRIMARY KEY ("chain_id","collection_id")
);

-- AddForeignKey
ALTER TABLE "prompt_collections" ADD CONSTRAINT "prompt_collections_prompt_id_fkey" FOREIGN KEY ("prompt_id") REFERENCES "prompts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_collections" ADD CONSTRAINT "prompt_collections_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chain_collections" ADD CONSTRAINT "chain_collections_chain_id_fkey" FOREIGN KEY ("chain_id") REFERENCES "chains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chain_collections" ADD CONSTRAINT "chain_collections_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
