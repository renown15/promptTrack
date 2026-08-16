-- AlterTable
ALTER TABLE "ollama_config" ADD COLUMN     "timeout_ms" INTEGER NOT NULL DEFAULT 60000;
