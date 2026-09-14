-- apps/api/prisma/migrations/20260913200100_condition_expires_on_rest/migration.sql
-- Puerta de efectos §5 (2026-09-13). SRD 5.1: «until you finish a long rest» es una duración que
-- el descanso resuelve, no un número. "SHORT" | "LONG", mismo vocabulario que RestInput.kind.
-- Revertir:
--   ALTER TABLE "CharacterCondition" DROP COLUMN "expiresOnRest";
ALTER TABLE "CharacterCondition" ADD COLUMN "expiresOnRest" TEXT;
