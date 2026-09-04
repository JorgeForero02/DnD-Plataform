-- 2.5.3 — la propuesta del ataque deja rastro.
--
-- El §2.5.3 del alcance de la fase 2.5 dice, paso 5: «el DM confirma o corrige», y §4 lo resume
-- en «el sistema propone; el DM dispone». Sin este tipo de suceso el veredicto solo existia en la
-- respuesta HTTP del atacante: no habia objetivo, ni veredicto, ni nada que confirmar.
ALTER TYPE "GameEventType" ADD VALUE 'ATTACK_RESOLVED';
