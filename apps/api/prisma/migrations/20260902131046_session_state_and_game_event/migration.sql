-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'CLOSED');

-- CreateEnum
CREATE TYPE "GameEventType" AS ENUM ('SESSION_STARTED', 'SESSION_CLOSED', 'REST_DECLARED', 'HP_CHANGED', 'TEMP_HP_SET', 'RESOURCE_SPENT', 'RESOURCE_RESTORED', 'LEVEL_CHANGED', 'ABILITY_ROLL', 'MANUAL_OVERRIDE_SET');

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "endedAt" TIMESTAMP(3),
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "status" "SessionStatus" NOT NULL DEFAULT 'PLANNED';

-- CreateTable
CREATE TABLE "GameEvent" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "sessionId" TEXT,
    "actorUserId" TEXT NOT NULL,
    "type" "GameEventType" NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "visibility" "Visibility" NOT NULL DEFAULT 'PLAYERS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GameEvent_campaignId_createdAt_idx" ON "GameEvent"("campaignId", "createdAt");

-- CreateIndex
CREATE INDEX "GameEvent_sessionId_createdAt_idx" ON "GameEvent"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "GameEvent_subjectType_subjectId_createdAt_idx" ON "GameEvent"("subjectType", "subjectId", "createdAt");

-- AddForeignKey
ALTER TABLE "GameEvent" ADD CONSTRAINT "GameEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Como máximo UNA sesión en curso por campaña, garantizado por la base y no por el servicio.
-- Prisma no sabe expresar un índice único parcial en el esquema, así que va aquí a mano.
-- Motivo: una comprobación en el servicio es una carrera esperando a ocurrir en cuanto el DM
-- tenga dos pestañas abiertas. Y como el Prisma simulado de las unitarias no valida SQL, la
-- prueba de esto es e2e contra Postgres real (docs/08-pruebas.md).
CREATE UNIQUE INDEX "session_one_in_progress_per_campaign"
  ON "Session" ("campaignId") WHERE "status" = 'IN_PROGRESS';
