-- Plan 09, ficha I19 (2026-09-06): la batuta.
--
-- `DM_EXECUTED` estaba en el vocabulario del motor de reglas desde el principio y NO existia el
-- gesto en ninguna pantalla, asi que nadie escribia el suceso. Este valor es lo que le da un
-- escritor: el DM pulsa sobre una ficha del mundo y las reglas que la esperaban se disparan.
--
-- `ALTER TYPE ... ADD VALUE` va SOLO en su migracion: PostgreSQL no permite usar un valor de enum
-- recien anadido en la misma transaccion que lo crea.
ALTER TYPE "GameEventType" ADD VALUE 'DM_EXECUTED';
