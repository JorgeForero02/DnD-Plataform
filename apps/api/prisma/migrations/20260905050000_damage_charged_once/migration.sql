-- Plan 03, D-OP-15 (2026-09-05): el dano de una tirada de ataque se cobra UNA vez.
--
-- `attackRollEventId` existia como entrada y nada mas: `rollAttack` lo leia para saber si el golpe
-- fue critico y no lo guardaba, asi que nada impedia pedir el dano dos veces con la misma tirada.
--
-- Indice unico y no una comprobacion en el servicio: «una sola vez» comprobado en codigo es una
-- carrera esperando a ocurrir con dos pestanas abiertas. Y el registro es de SOLO ANADIR, asi que
-- la alternativa seria mutar una fila, cosa que aqui no se hace.
--
-- PostgreSQL trata dos nulos como DISTINTOS, asi que los miles de sucesos que no cobran ninguna
-- tirada no chocan entre si: basta un indice unico normal, no hace falta uno parcial.
ALTER TABLE "GameEvent" ADD COLUMN "attackRollEventId" TEXT;

CREATE UNIQUE INDEX "GameEvent_attackRollEventId_key" ON "GameEvent"("attackRollEventId");
