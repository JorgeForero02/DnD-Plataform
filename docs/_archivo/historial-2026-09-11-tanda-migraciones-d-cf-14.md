# Archivo — La tanda de migraciones de D-CF-14 (2026-09-11)

Movida entera desde `docs/07-historial.md` el 2026-09-12, al escribir la entrada de la Tarea 5 del
pulido (`Campaign.boardRoomUrl`): el fichero quedaba en 995 de 1000 líneas y esta era la entrada
completa más antigua sin archivar. Sin reescribir.

---

## La tanda de migraciones de D-CF-14, un commit por migración (2026-09-11)

Sobre `main`, después de fusionar `ficha/tanda-2-a-5`. Cada migración es SQL escrito a mano con su
cabecera, aplicada en local con `migrate deploy`; nada se despliega. **Revertir:** cada una es su
commit y su migración inversa está descrita en la cabecera del SQL.

- **1 · `DROP TYPE "RestKind"`** (X1): nadie lo usaba. Queda `no-dead-enum.spec.ts`, que hace
  fallar el próximo enum sin campo.
- **2 · Índice único parcial en `EntityLink` (`fromId`, `toId`) `WHERE label IS NULL`**: dos
  enlaces sin rótulo entre las mismas fichas entraban porque Postgres no iguala dos `NULL`. La
  migración borra duplicados quedándose con el más antiguo (en local había cero) y crea el índice;
  Prisma no lo sabe expresar, así que vive solo en el SQL y el esquema lo dice en un comentario.
  El segundo enlace igual ya es 409 (e2e en `links`).
- **3 · `DROP COLUMN race, class`** (D-CF-27): sin medir filas, por decisión del autor. El contrato
  de creación y edición descarta el texto libre y `tsc` barrió los lectores en API y web. Quien
  solo tuviera texto libre y ninguna clave del catálogo se queda sin raza ni clase en pantalla.
- **4 y 5 · `ITEM_QUANTITY_CHANGED` y `CHARACTER_DIED`**, dos migraciones en **un** commit —se
  declara la desviación de la letra de D-CF-14: los dos valores comparten el enum, la lista de
  `@dnd/shared`, el renderizador del hilo y sus pruebas, y partir esos hunks a mano arriesgaba el
  árbol; cada uno tiene su SQL—. El `PATCH` de cantidad deja «Ajusta Antorcha: 3 → 5»; la muerte se
  escribe una sola vez, en la transición, por sus tres puertas, con causa cerrada y la tirada que
  la decidió (J5).
- **6 · La sobrecarga como variante por campaña** (D-CF-16, I4/M2B-5): apagada por defecto, del
  DM; −10/−20 pies con traza, desventaja solo en Fuerza/Destreza/Constitución por característica,
  y la columna de Fuerza de la armadura ignorada cuando la variante manda —la primera versión la
  seguía restando y la desventaja salía en Persuasión: dos altos de la revisión, con SRD en mano—.
  El estado de carga lo calcula el servidor y el panel lo pinta.
- **7 · «Lo tengo pero no sé qué hace»** (D-CF-15, I3/M2B-15): `identified` y alias por fila, del
  DM, capa ortogonal a `canView` con el principio de `redactado()` —identidad fuera, números
  dentro—. La revisión encontró que la primera versión filtraba el nombre real por los sucesos
  del hilo, por `temporary:<nombre>`, por los mensajes de error y por las tiradas que lanza el
  DM; la ronda los cerró en cada camino con una sola función de nombre visible. Decisión de
  cierre: el catálogo puede bajar a `DM_ONLY` mientras las filas en manos de jugadores sigan sin
  identificar, y el DM puede entregar un objeto `DM_ONLY` si nace sin identificar. Cuatro rondas de
  revisión (dos Opus con caza de fugas camino por camino); de paso, `GameEvent.attackRef` (columna,
  migración 8) casa el crítico con su ataque por la referencia real y no por el nombre.
