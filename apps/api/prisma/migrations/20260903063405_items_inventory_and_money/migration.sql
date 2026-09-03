-- CreateEnum
CREATE TYPE "ItemKind" AS ENUM ('WEAPON', 'ARMOR', 'SHIELD', 'CONSUMABLE', 'GEAR', 'OTHER');

-- CreateEnum
CREATE TYPE "ItemLocation" AS ENUM ('EQUIPPED', 'CARRIED', 'STORED');

-- CreateEnum
CREATE TYPE "EquipSlot" AS ENUM ('MAIN_HAND', 'OFF_HAND', 'ARMOR', 'HEAD', 'NECK', 'CLOAK', 'RING_1', 'RING_2', 'HANDS', 'FEET', 'OTHER');

-- CreateEnum
CREATE TYPE "ArmorCategory" AS ENUM ('LIGHT', 'MEDIUM', 'HEAVY', 'SHIELD');

-- CreateEnum
CREATE TYPE "WeaponCategory" AS ENUM ('SIMPLE', 'MARTIAL');

-- CreateEnum
CREATE TYPE "WeaponRange" AS ENUM ('MELEE', 'RANGED');

-- CreateEnum
CREATE TYPE "DamageType" AS ENUM ('BLUDGEONING', 'PIERCING', 'SLASHING', 'ACID', 'COLD', 'FIRE', 'FORCE', 'LIGHTNING', 'NECROTIC', 'POISON', 'PSYCHIC', 'RADIANT', 'THUNDER');

-- CreateEnum
CREATE TYPE "WeaponProperty" AS ENUM ('AMMUNITION', 'FINESSE', 'HEAVY', 'LIGHT', 'LOADING', 'REACH', 'SPECIAL', 'THROWN', 'TWO_HANDED', 'VERSATILE');

-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "cp" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ep" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "gp" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pp" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sp" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CampaignItem" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "ItemKind" NOT NULL,
    "description" TEXT,
    "weightOz" INTEGER NOT NULL DEFAULT 0,
    "costCp" INTEGER,
    "effects" JSONB,
    "requiresAttunement" BOOLEAN NOT NULL DEFAULT false,
    "slot" "EquipSlot",
    "weaponCategory" "WeaponCategory",
    "weaponRange" "WeaponRange",
    "damageDice" TEXT,
    "damageType" "DamageType",
    "weaponProperties" "WeaponProperty"[] DEFAULT ARRAY[]::"WeaponProperty"[],
    "versatileDice" TEXT,
    "rangeNormalFt" INTEGER,
    "rangeLongFt" INTEGER,
    "armorCategory" "ArmorCategory",
    "baseAc" INTEGER,
    "dexCap" INTEGER,
    "strengthRequirement" INTEGER NOT NULL DEFAULT 0,
    "stealthDisadvantage" BOOLEAN NOT NULL DEFAULT false,
    "visibility" "Visibility" NOT NULL DEFAULT 'PLAYERS',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignItemVisibilityGrant" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "CampaignItemVisibilityGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "srdKey" TEXT,
    "campaignItemId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "location" "ItemLocation" NOT NULL DEFAULT 'CARRIED',
    "slot" "EquipSlot",
    "attuned" BOOLEAN NOT NULL DEFAULT false,
    "storedAt" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CampaignItem_campaignId_idx" ON "CampaignItem"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignItemVisibilityGrant_itemId_userId_key" ON "CampaignItemVisibilityGrant"("itemId", "userId");

-- CreateIndex
CREATE INDEX "InventoryItem_characterId_idx" ON "InventoryItem"("characterId");

-- CreateIndex
CREATE INDEX "InventoryItem_campaignItemId_idx" ON "InventoryItem"("campaignItemId");

-- AddForeignKey
ALTER TABLE "CampaignItem" ADD CONSTRAINT "CampaignItem_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignItemVisibilityGrant" ADD CONSTRAINT "CampaignItemVisibilityGrant_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CampaignItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_campaignItemId_fkey" FOREIGN KEY ("campaignItemId") REFERENCES "CampaignItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
