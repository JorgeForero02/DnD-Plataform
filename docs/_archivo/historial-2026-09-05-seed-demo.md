# Historial — la campaña de demostración que se siembra sola (2026-09-05)

**Entrada de `07-historial.md` movida entera el 2026-09-10**, cuando la entrada de la tanda 1 de
cerrar fichas dejó el fichero en 1008 de sus 1000 líneas y esta era la entrada completa más
antigua. No se reescribe: es tan cierta como el día que se escribió. Su hito se queda en el 07.

---

## Una campaña de demostración que se siembra sola (2026-09-05)

**Qué.** `scripts/seed-demo.mjs` deja la aplicación con una mesa dentro: tres cuentas —DM y dos
jugadores—, fichas del mundo con **los cinco niveles de visibilidad**, dos personajes con su color y
su hoja derivada, un objeto propio del DM equipado y sintonizado, dinero, un statblock propio con su
PNJ jugable, **una sesión cerrada con su crónica** y otra en curso con su encuentro e iniciativas,
una regla del motor y avisos de verdad. Encargo del autor.

**Habla por HTTP, no por Prisma**, y esa es la decisión que lo gobierna todo:

- **Se puede correr contra producción** desde cualquier sitio, sin credenciales de Postgres.
- **Prueba de verdad**: si una ruta se rompe, la siembra se para en esa línea y enseña el mensaje de
  la API. Un script de Prisma habría escrito filas perfectas sobre una API rota — y de hecho esta
  siembra encontró seis contratos que la documentación de mi cabeza tenía mal (`body.format`,
  `weapon.damageDice`, `actions[].desc`, el dinero por `PATCH`, la lista de statblocks que trae dos
  catálogos y `effects[].visibility`).
- **No puede inventarse un permiso.** Cada cosa la crea quien la crearía en la mesa: los personajes
  los crean **sus jugadores**, y el comentario que dispara el aviso lo escribe **la jugadora**,
  porque nadie se avisa de lo que acaba de hacer.

**Es idempotente**: cada paso mira primero si su cosa ya existe, por nombre. Y **el 429 se espera,
no se sortea**: las rutas de autenticación están limitadas a cinco por minuto para frenar la fuerza
bruta, así que el script duerme y reintenta en vez de pedir que se afloje el límite — cambiar una
protección por la comodidad de un script es justo lo que este proyecto no hace.

**Cómo revertirlo.** `node scripts/seed-demo.mjs --limpiar` borra las campañas sembradas; el script
se puede borrar sin tocar nada más.
