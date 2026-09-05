ALTER TABLE "RollRequest" ADD COLUMN "encounterId" TEXT;
-- **Anular no es responder.** Cuando el DM fuerza el arranque, la petición se cierra SIN que nadie
-- la respondiera: `resolvedEventId` se queda nulo y esto lo distingue. Sin esta columna, la
-- pantalla del jugador diría que tiró él.
ALTER TABLE "RollRequest" ADD COLUMN "cancelledAt" TIMESTAMP(3);

ALTER TABLE "RollRequest" ADD CONSTRAINT "RollRequest_encounterId_fkey"
  FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "RollRequest_encounterId_idx" ON "RollRequest"("encounterId");

-- **El índice parcial hay que recontarlo.** Con PREPARING el WHERE viejo se queda corto: cabría
-- uno preparándose y otro activo a la vez, que es el lío que este índice existe para impedir.
DROP INDEX "encounter_one_active_per_session";
CREATE UNIQUE INDEX "encounter_one_active_per_session"
  ON "Encounter" ("sessionId") WHERE "status" IN ('ACTIVE', 'PREPARING');
