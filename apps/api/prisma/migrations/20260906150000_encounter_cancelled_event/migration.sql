-- Paso 1, tarea 19 (D-A-3, 2026-09-06) — cancelar un combate avisa a quien esperaba.
--
-- **Un valor de enum se AÑADE, nunca se edita ni se borra.**
ALTER TYPE "GameEventType" ADD VALUE IF NOT EXISTS 'ENCOUNTER_CANCELLED';
