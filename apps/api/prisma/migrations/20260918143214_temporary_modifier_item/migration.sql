-- AlterTable
ALTER TABLE "TemporaryModifier" ADD COLUMN     "inventoryItemId" TEXT;

-- CreateIndex
CREATE INDEX "TemporaryModifier_inventoryItemId_idx" ON "TemporaryModifier"("inventoryItemId");

-- AddForeignKey
ALTER TABLE "TemporaryModifier" ADD CONSTRAINT "TemporaryModifier_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
