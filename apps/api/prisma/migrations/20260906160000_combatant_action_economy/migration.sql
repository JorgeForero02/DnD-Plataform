-- Paso 2, tarea A1 (2026-09-06) — la economía de acciones del turno.
--
-- Las cuatro columnas nacen con el valor de «nada gastado todavía», y ese es el estado correcto
-- para cualquier fila que ya exista: un combatiente de un encuentro viejo no tiene un turno en
-- curso, así que no hay dato real que migrar.
ALTER TABLE "Combatant" ADD COLUMN     "actionUsed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "bonusUsed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "movementUsed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reactionUsed" BOOLEAN NOT NULL DEFAULT false;
