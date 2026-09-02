-- CreateEnum
CREATE TYPE "ResourceReset" AS ENUM ('NONE', 'SHORT_REST', 'LONG_REST');

-- CreateEnum
CREATE TYPE "ResourceGrantor" AS ENUM ('DM_ONLY', 'OWNER');

-- CreateEnum
CREATE TYPE "RestKind" AS ENUM ('SHORT', 'LONG');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "GameEventType" ADD VALUE 'DEATH_SAVE';
ALTER TYPE "GameEventType" ADD VALUE 'CONDITION_APPLIED';
ALTER TYPE "GameEventType" ADD VALUE 'CONDITION_REMOVED';
ALTER TYPE "GameEventType" ADD VALUE 'ENTITY_OPENED';
ALTER TYPE "GameEventType" ADD VALUE 'ENTITY_REVEALED';
ALTER TYPE "GameEventType" ADD VALUE 'ENTITY_LINKED';
ALTER TYPE "GameEventType" ADD VALUE 'FLAG_SET';
ALTER TYPE "GameEventType" ADD VALUE 'SET_CHANGED';
ALTER TYPE "GameEventType" ADD VALUE 'SIGNAL_RAISED';

-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "cha" INTEGER,
ADD COLUMN     "choices" JSONB,
ADD COLUMN     "classKey" TEXT,
ADD COLUMN     "con" INTEGER,
ADD COLUMN     "currentHp" INTEGER,
ADD COLUMN     "deathSaveFailures" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "deathSaveSuccesses" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "dex" INTEGER,
ADD COLUMN     "equippedSlots" JSONB,
ADD COLUMN     "int" INTEGER,
ADD COLUMN     "raceKey" TEXT,
ADD COLUMN     "str" INTEGER,
ADD COLUMN     "subraceKey" TEXT,
ADD COLUMN     "tempHp" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "wis" INTEGER;

-- CreateTable
CREATE TABLE "CharacterResource" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "current" INTEGER NOT NULL,
    "max" INTEGER,
    "resetOn" "ResourceReset" NOT NULL DEFAULT 'NONE',
    "grantedBy" "ResourceGrantor" NOT NULL DEFAULT 'OWNER',

    CONSTRAINT "CharacterResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterCondition" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "level" INTEGER,
    "note" TEXT,
    "appliedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CharacterCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "campaignId" TEXT,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "subjectType" TEXT,
    "subjectId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignFlag" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" BOOLEAN NOT NULL DEFAULT true,
    "setById" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignSet" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "CampaignSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignSetMember" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "memberType" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "addedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignSetMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CharacterResource_characterId_key_key" ON "CharacterResource"("characterId", "key");

-- CreateIndex
CREATE INDEX "CharacterCondition_characterId_idx" ON "CharacterCondition"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterCondition_characterId_key_key" ON "CharacterCondition"("characterId", "key");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignFlag_campaignId_key_key" ON "CampaignFlag"("campaignId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignSet_campaignId_key_key" ON "CampaignSet"("campaignId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignSetMember_setId_memberType_memberId_key" ON "CampaignSetMember"("setId", "memberType", "memberId");

-- CreateIndex
CREATE INDEX "Character_campaignId_idx" ON "Character"("campaignId");

-- AddForeignKey
ALTER TABLE "CharacterResource" ADD CONSTRAINT "CharacterResource_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterCondition" ADD CONSTRAINT "CharacterCondition_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignFlag" ADD CONSTRAINT "CampaignFlag_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignSet" ADD CONSTRAINT "CampaignSet_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignSetMember" ADD CONSTRAINT "CampaignSetMember_setId_fkey" FOREIGN KEY ("setId") REFERENCES "CampaignSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
