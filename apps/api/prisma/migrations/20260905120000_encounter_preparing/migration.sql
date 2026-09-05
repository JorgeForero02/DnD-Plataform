-- Un valor de enum se AÑADE, nunca se edita ni se borra. Los encuentros existentes siguen ACTIVE.
--
-- **Solo los dos `ADD VALUE`, y nada más, en esta migración.** Postgres no deja usar un valor de
-- enum nuevo dentro de la misma transacción en la que se añadió (`unsafe use of new value`), y
-- Prisma aplica cada `migration.sql` como una única transacción. El resto de esta tarea —las
-- columnas de `RollRequest` y el índice recontado, que sí USAN 'PREPARING'— va en la migración
-- siguiente (`20260905120001_encounter_preparing_data`), para que 'PREPARING' ya esté comprometido
-- cuando se use.
ALTER TYPE "EncounterStatus" ADD VALUE IF NOT EXISTS 'PREPARING' BEFORE 'ACTIVE';

-- Un tipo de suceso nuevo es una migración, como los seis del 2026-09-05.
ALTER TYPE "GameEventType" ADD VALUE IF NOT EXISTS 'INITIATIVE_ROLLED_BY_SYSTEM';
