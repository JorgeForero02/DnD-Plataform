# Archivo — La tanda de Playwright que cierra las migraciones (2026-09-11, noche)

Movida entera desde `docs/07-historial.md` el 2026-09-12, en la ronda de revisión de la Tarea 5
del pulido (`Campaign.boardRoomUrl`, IMPORTANT #1 y #2): el fichero quedaba en 1011 de 1000 y esta
era la entrada completa más antigua. Sin reescribir.

---

## La tanda de Playwright que cierra las migraciones (2026-09-11, noche)

153 recorridos en 44 ficheros en `WORKTREE_SLOT=1`: 150 verdes, 1 saltado, 2 rojos cerrados en la
pasada siguiente (un localizador ambiguo en `sobrecarga` y un rojo por carga en `hoja`). Antes,
135 rojos falsos porque el puerto 3000 lo tenía otro proyecto de esta máquina y Playwright lo
reutilizó como API; declarado en `08-pruebas.md`. **Revertir:** no procede.
