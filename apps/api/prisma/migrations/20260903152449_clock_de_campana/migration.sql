-- AlterEnum
ALTER TYPE "GameEventType" ADD VALUE 'CLOCK_ADVANCED';

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "clockSeconds" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "lastLongRestClock" INTEGER;
