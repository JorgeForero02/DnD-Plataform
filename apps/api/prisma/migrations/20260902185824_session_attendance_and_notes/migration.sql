-- AlterEnum
ALTER TYPE "GameEventType" ADD VALUE 'SESSION_NOTE';

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "attendance" JSONB;
