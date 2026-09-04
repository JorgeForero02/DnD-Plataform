-- CreateEnum
CREATE TYPE "EncounterStatus" AS ENUM ('ACTIVE', 'ENDED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "GameEventType" ADD VALUE 'ENCOUNTER_STARTED';
ALTER TYPE "GameEventType" ADD VALUE 'TURN_ADVANCED';
ALTER TYPE "GameEventType" ADD VALUE 'ROUND_ADVANCED';

-- CreateTable
CREATE TABLE "Encounter" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "status" "EncounterStatus" NOT NULL DEFAULT 'ACTIVE',
    "round" INTEGER NOT NULL DEFAULT 1,
    "activePosition" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Encounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Combatant" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "initiative" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Combatant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Combatant_encounterId_idx" ON "Combatant"("encounterId");

-- CreateIndex
CREATE INDEX "Combatant_characterId_idx" ON "Combatant"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "Combatant_encounterId_position_key" ON "Combatant"("encounterId", "position");

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Combatant" ADD CONSTRAINT "Combatant_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Combatant" ADD CONSTRAINT "Combatant_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Como máximo un encuentro ACTIVE por sesión, garantizado por la base y no por el servicio.
-- Prisma no sabe expresar un índice único parcial en el esquema, así que va aquí a mano, igual
-- que "session_one_in_progress_per_campaign" (20260902131046_session_state_and_game_event).
-- Motivo: una comprobación en el servicio es una carrera esperando a ocurrir en cuanto el DM
-- tenga dos pestañas abiertas. Y como el Prisma simulado de las unitarias no valida SQL, la
-- prueba de esto es e2e contra Postgres real (docs/08-pruebas.md).
CREATE UNIQUE INDEX "encounter_one_active_per_session"
  ON "Encounter" ("sessionId") WHERE "status" = 'ACTIVE';
