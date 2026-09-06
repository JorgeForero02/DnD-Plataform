-- Paso 1, tarea 4 (2026-09-06) — una condición puede cortarse en un borde de turno.
--
-- Las dos columnas nacen `NULL`, y ese es el camino de **todas** las condiciones que ya existen:
-- sin borde, la caducidad la decide el reloj exactamente como hasta hoy. No hay dato que migrar.
ALTER TABLE "CharacterCondition" ADD COLUMN "expiryEdge" TEXT;
ALTER TABLE "CharacterCondition" ADD COLUMN "sourceCharacterId" TEXT;
