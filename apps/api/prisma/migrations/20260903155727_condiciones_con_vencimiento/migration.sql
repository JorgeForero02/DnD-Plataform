-- AlterEnum
ALTER TYPE "GameEventType" ADD VALUE 'CONDITION_EXPIRED';

-- AlterTable
ALTER TABLE "CharacterCondition" ADD COLUMN     "expiresAtClock" INTEGER;
