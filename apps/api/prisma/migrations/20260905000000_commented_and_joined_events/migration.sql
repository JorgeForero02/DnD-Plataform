-- Ola 3 (2026-09-04): `ENTITY_COMMENTED` y `MEMBER_JOINED` estaban en el vocabulario de
-- disparadores del motor de reglas y NO existian como suceso, asi que una regla armada sobre
-- ellos no se disparaba jamas. Ahora los escribe su gesto: comentar una ficha, y entrar en la
-- campana por una invitacion.
ALTER TYPE "GameEventType" ADD VALUE 'ENTITY_COMMENTED';
ALTER TYPE "GameEventType" ADD VALUE 'MEMBER_JOINED';
