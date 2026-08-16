-- AlterTable
ALTER TABLE "collections" ADD COLUMN     "in_scope_directories" TEXT[] DEFAULT ARRAY[]::TEXT[];
