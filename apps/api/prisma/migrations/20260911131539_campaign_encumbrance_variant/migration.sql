-- Migración 6 (D-CF-16, tickets I4/M2B-5): la sobrecarga del SRD 5.1 entra como variante con
-- interruptor por campaña, apagada por defecto. Mismo patrón que houseTablesEnabled: con la
-- columna en false nada cambia en ninguna hoja existente.
ALTER TABLE "Campaign" ADD COLUMN "encumbranceVariant" BOOLEAN NOT NULL DEFAULT false;
