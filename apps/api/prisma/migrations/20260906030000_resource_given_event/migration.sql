-- Plan 08, ficha I8 (2026-09-06): regalar un recurso es un hecho propio.
--
-- El SRD dice que la inspiracion se puede dar a otro jugador. Con RESOURCE_SPENT +
-- RESOURCE_RESTORED la mesa veria dos sucesos sueltos sin saber que son el mismo gesto ni de
-- quien a quien fue, asi que el traspaso tiene su tipo.
--
-- `ALTER TYPE ... ADD VALUE` va SOLO en su migracion: PostgreSQL no permite usar un valor de enum
-- recien anadido en la misma transaccion que lo crea.
ALTER TYPE "GameEventType" ADD VALUE 'RESOURCE_GIVEN';
