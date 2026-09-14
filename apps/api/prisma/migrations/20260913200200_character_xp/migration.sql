-- Puerta de efectos §5 bis (2026-09-13, D-CF-68/69). SRD 5.1, Beyond 1st Level: «A character who
-- reaches a specified experience point total advances in capability.» El nivel NO sube solo
-- (D-CF-66): esta columna cuenta; subir lo pulsa el DM.
-- Revertir:
--   ALTER TABLE "Character" DROP COLUMN "xp";
--   (el valor XP_AWARDED del enum no se puede quitar sin reescribir el tipo; se deja)
ALTER TABLE "Character" ADD COLUMN "xp" INTEGER NOT NULL DEFAULT 0;
ALTER TYPE "GameEventType" ADD VALUE 'XP_AWARDED';
