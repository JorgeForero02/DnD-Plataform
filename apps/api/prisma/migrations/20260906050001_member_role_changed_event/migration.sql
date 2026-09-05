-- Plan 11, ficha D2 (2026-09-06): el cambio de papel va al registro.
--
-- Va en su PROPIA migracion porque `ALTER TYPE ... ADD VALUE` no puede convivir con otras
-- sentencias en la misma transaccion en PostgreSQL.
ALTER TYPE "GameEventType" ADD VALUE 'MEMBER_ROLE_CHANGED';
