-- Reglas de la mesa (D-CF-53, 2026-09-13): lo que el DM decide antes de que nadie haga su hoja.
-- Revertir:
--   DROP TABLE "AbilityRollAttempt";
--   ALTER TABLE "Character" DROP COLUMN "hitPointsPerLevel";
--   ALTER TABLE "Campaign" DROP COLUMN "tableRules";
ALTER TABLE "Campaign" ADD COLUMN "tableRules" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "Character" ADD COLUMN "hitPointsPerLevel" JSONB;

CREATE TABLE "AbilityRollAttempt" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "values" JSONB NOT NULL,
    "rollEventIds" JSONB NOT NULL,
    "chosen" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AbilityRollAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AbilityRollAttempt_characterId_createdAt_idx" ON "AbilityRollAttempt"("characterId", "createdAt");

ALTER TABLE "AbilityRollAttempt" ADD CONSTRAINT "AbilityRollAttempt_characterId_fkey"
    FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
