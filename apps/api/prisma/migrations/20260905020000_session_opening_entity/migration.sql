-- Plan 02 (2026-09-05): una sesion puede decir DONDE abre su escena, apuntando a una ficha del
-- mundo. Nunca se guarda el nombre como texto: se queda viejo, no enlaza y no respeta la
-- visibilidad.
--
-- `ON DELETE SET NULL` y NO `CASCADE`: borrar un lugar del mundo no puede borrar la sesion que
-- paso alli.
ALTER TABLE "Session" ADD COLUMN "openingEntityId" TEXT;

ALTER TABLE "Session"
  ADD CONSTRAINT "Session_openingEntityId_fkey"
  FOREIGN KEY ("openingEntityId") REFERENCES "Entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Session_openingEntityId_idx" ON "Session"("openingEntityId");
