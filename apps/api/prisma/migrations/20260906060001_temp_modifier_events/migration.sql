-- Plan 13, ficha M8 (2026-09-06): conceder y vencer se cuentan.
--
-- Un numero que cambia sin suceso es un numero que nadie entiende: la Fuerza sube o baja sola y el
-- jugador no sabe por que.
--
-- Van en su propia migracion: `ALTER TYPE ... ADD VALUE` no convive con otras sentencias en la
-- misma transaccion en PostgreSQL.
ALTER TYPE "GameEventType" ADD VALUE 'TEMP_MODIFIER_GRANTED';
ALTER TYPE "GameEventType" ADD VALUE 'TEMP_MODIFIER_EXPIRED';
