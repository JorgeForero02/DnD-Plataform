-- Paso 1, tarea 16 (2026-09-06) — corregir el bando y el reajuste del turno dejan suceso.
--
-- **Un valor de enum se AÑADE, nunca se edita ni se borra**: los que ya existen siguen intactos y
-- las filas escritas antes no cambian.
ALTER TYPE "GameEventType" ADD VALUE IF NOT EXISTS 'COMBATANT_SIDE_CHANGED';
ALTER TYPE "GameEventType" ADD VALUE IF NOT EXISTS 'ACTIVE_TURN_SHIFTED';
