-- AlterEnum
ALTER TYPE "GameEventType" ADD VALUE 'TABLE_ROLLED';

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "houseTablesEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "DmTable" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "visibility" "Visibility" NOT NULL DEFAULT 'DM_ONLY',
    "trigger" TEXT NOT NULL DEFAULT 'NONE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DmTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DmTableEntry" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "min" INTEGER NOT NULL,
    "max" INTEGER NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "DmTableEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DmTable_campaignId_idx" ON "DmTable"("campaignId");

-- CreateIndex
CREATE INDEX "DmTableEntry_tableId_idx" ON "DmTableEntry"("tableId");

-- AddForeignKey
ALTER TABLE "DmTable" ADD CONSTRAINT "DmTable_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DmTableEntry" ADD CONSTRAINT "DmTableEntry_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "DmTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- **Como mucho UNA tabla de críticos y una de pifias por campaña**, y lo garantiza la base.
--
-- Es un índice único PARCIAL —solo sobre `trigger <> 'NONE'`— porque las tablas normales son
-- muchas: botín, rumores, encuentros. Prisma no sabe expresar un índice parcial, así que va aquí
-- en SQL, igual que el de «una sola sesión en curso por campaña».
--
-- Y va en la base y no en un `if` del servicio por el motivo de siempre: la comprobación en el
-- servicio es una carrera esperando a ocurrir en cuanto alguien tenga dos pestañas abiertas.
CREATE UNIQUE INDEX "DmTable_campaignId_trigger_key"
  ON "DmTable" ("campaignId", "trigger")
  WHERE "trigger" <> 'NONE';
