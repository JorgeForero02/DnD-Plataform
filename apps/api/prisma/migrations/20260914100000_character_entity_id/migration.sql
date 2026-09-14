-- PNJ del mundo y la mesa (2026-09-14, spec §3.1): el cuerpo en la mesa cuelga de su ficha del
-- mundo. Aditiva y nulable; SetNull para que borrar la ficha no borre al bicho.
-- Revertir:
--   ALTER TABLE "Character" DROP CONSTRAINT "Character_entityId_fkey";
--   DROP INDEX "Character_entityId_idx";
--   ALTER TABLE "Character" DROP COLUMN "entityId";
ALTER TABLE "Character" ADD COLUMN "entityId" TEXT;
CREATE INDEX "Character_entityId_idx" ON "Character"("entityId");
ALTER TABLE "Character" ADD CONSTRAINT "Character_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
