-- CreateEnum
CREATE TYPE "CreatureSize" AS ENUM ('TINY', 'SMALL', 'MEDIUM', 'LARGE', 'HUGE', 'GARGANTUAN');

-- CreateEnum
CREATE TYPE "CreatureType" AS ENUM ('ABERRATION', 'BEAST', 'CELESTIAL', 'CONSTRUCT', 'DRAGON', 'ELEMENTAL', 'FEY', 'FIEND', 'GIANT', 'HUMANOID', 'MONSTROSITY', 'OOZE', 'PLANT', 'UNDEAD');

-- CreateTable
CREATE TABLE "CampaignStatblock" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "size" "CreatureSize" NOT NULL,
    "type" "CreatureType" NOT NULL,
    "subtype" TEXT,
    "alignment" TEXT,
    "ac" INTEGER NOT NULL,
    "acNote" TEXT,
    "hitDiceCount" INTEGER NOT NULL,
    "hitDieSizeOverride" INTEGER,
    "str" INTEGER NOT NULL,
    "dex" INTEGER NOT NULL,
    "con" INTEGER NOT NULL,
    "int" INTEGER NOT NULL,
    "wis" INTEGER NOT NULL,
    "cha" INTEGER NOT NULL,
    "saveProficiencies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "skillProficiencies" JSONB,
    "damageResistances" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "damageImmunities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "damageVulnerabilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "conditionImmunities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "darkvisionFeet" INTEGER,
    "otherSenses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "speeds" JSONB,
    "languages" TEXT,
    "cr" DOUBLE PRECISION NOT NULL,
    "traits" JSONB,
    "actions" JSONB,
    "reactions" JSONB,
    "legendaryActions" JSONB,
    "visibility" "Visibility" NOT NULL DEFAULT 'DM_ONLY',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignStatblock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CampaignStatblock_campaignId_idx" ON "CampaignStatblock"("campaignId");

-- AddForeignKey
ALTER TABLE "CampaignStatblock" ADD CONSTRAINT "CampaignStatblock_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
