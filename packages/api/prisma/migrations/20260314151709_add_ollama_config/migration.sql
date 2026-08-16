-- CreateTable
CREATE TABLE "ollama_config" (
    "id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL DEFAULT 'http://localhost:11434',
    "model" TEXT NOT NULL DEFAULT 'llama3',
    "metrics" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ollama_config_pkey" PRIMARY KEY ("id")
);
