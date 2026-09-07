-- Paso 2, tarea A2 (2026-09-06) — gastar la economía del turno deja rastro.
--
-- **Un valor de enum se AÑADE, nunca se edita ni se borra.**
ALTER TYPE "GameEventType" ADD VALUE IF NOT EXISTS 'ACTION_SPENT';
