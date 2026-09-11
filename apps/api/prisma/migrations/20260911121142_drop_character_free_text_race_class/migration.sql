-- D-CF-27 (2026-09-11): se retiran `race` y `class`, las columnas de texto libre HEREDADAS de
-- `Character`. La clave del catalogo (`raceKey`/`subraceKey`/`classKey`) es la unica verdad desde
-- la Tarea 24 (la web ya crea personajes por catalogo, `CharacterEditor.tsx`).
--
-- Decision del autor: se borran SIN medir su contenido ("no hay datos que valgan") — no hubo
-- conteo previo de filas que solo tuvieran texto libre y ninguna clave. Si alguna fila dependia
-- solo de `race`/`class` para mostrar algo, esa fila pasa a no mostrar raza/clase.
ALTER TABLE "Character" DROP COLUMN "race";
ALTER TABLE "Character" DROP COLUMN "class";
