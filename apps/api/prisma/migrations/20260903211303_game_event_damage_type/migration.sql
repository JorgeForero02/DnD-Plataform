-- AlterTable
ALTER TABLE "GameEvent" ADD COLUMN     "damageType" "DamageType";

-- CreateIndex
CREATE INDEX "GameEvent_subjectType_subjectId_damageType_idx" ON "GameEvent"("subjectType", "subjectId", "damageType");
