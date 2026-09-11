-- Migración 7, fix round 1 (M6): `GameEvent.attackRef`, el `ref` estable del arma de una tirada
-- de ataque, para casar el crítico del daño sin depender del nombre que llevaba `payload.reason`
-- (un objeto sin identificar cambia de nombre el día que el DM lo identifica; el `ref` no).
ALTER TABLE "GameEvent" ADD COLUMN "attackRef" TEXT;
