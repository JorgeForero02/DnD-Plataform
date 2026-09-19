# Paso 4 — la prueba de partida (guion, 2026-09-18)

**Quién lo corre: el autor**, después de fusionar 3A.3 (decisión de la madrugada del 18: «parar al
terminar 3A.3, documentar y empujar; el Paso 4 lo corro yo»). Esta nota es el guion tal cual quedó
en el plan de la noche, para que la siguiente sesión no tenga que reconstruirlo.

## Qué es

El spec `partida` de Playwright, en `apps/web/e2e/` (aún no existe; lo escribe quien corra el paso): **una partida corta de punta a punta**, con Playwright y tres
contextos de navegador —el DM y dos jugadores (el mago y el clérigo o el pícaro, según el paso)—,
contra la API real (`WORKTREE_SLOT=1`, Postgres del worktree). No es una prueba de una pantalla:
es la prueba de que las puertas que 3A.1, 3A.2 y 3A.3 construyeron **encajan en una mesa real**.
**Cada paso mide el DOM real** (el texto que se ve, el atributo que cambia), nunca la respuesta de
la API sola.

## El guion

1. **Montaje**: tres cuentas; el DM crea la campaña, dos jugadores entran por invitación; cada
   jugador crea su personaje con hoja (un **mago** nivel 3 con *Proyectil mágico* y un conjuro con
   salvación preparados; un **clérigo** con *Curar heridas*; un **pícaro** con Ataque furtivo — o
   dos de los tres, si el tercero se resuelve con el DM «viendo como»). El DM crea un PNJ del
   bestiario con CA y PG conocidos.
2. **El DM empieza la sesión** declarando asistencia, va a la mesa y **empieza el combate** (tira
   iniciativas, fuerza el arranque si hace falta). Los tres ven la franja «Asalto 1» y el orden.
3. **El mago actúa desde la barra**: apunta al PNJ («Apuntar a …» en su tarjeta), abre
   **Conjuros**, «Lanzar sobre <PNJ>» *Proyectil mágico* eligiendo el espacio → medir: el espacio
   gastado baja en la pestaña Conjuros y en el `[N]` del botón de la barra; una línea nueva en el
   registro; **la economía marca la acción gastada**; el DM ve la bandeja de daño y **«Aplicar»** →
   los PG del PNJ bajan en su tarjeta (los tres navegadores).
4. **Un conjuro con salvación por la puerta de efectos**: el mago lanza el segundo conjuro; el DM
   resuelve la salvación del PNJ; medir la línea del registro y el efecto (daño o condición).
5. **El clérigo cura** (*Curar heridas* sobre el mago o sobre sí) → PG suben en la tarjeta.
6. **El pícaro ataca** desde la barra (Ataques, con el chip puesto), **marca Ataque furtivo** sobre
   su tirada pendiente y **el DM lo confirma al aplicar** → daño extra sumado en la línea.
7. **Un turno termina** («Siguiente turno» del DM) y **la economía se repone** (las marcas del
   siguiente combatiente en blanco; las del anterior, al volverle el turno).
8. **El DM pone daño y da PG temporales** desde la tarjeta («Daño», «…» → temporales) → la barra
   de PG y el texto flotante.
9. **Descanso corto** (desde la hoja o la mesa) y **el mago recupera espacios** (Recuperación
   arcana) → el `[N]` y la pestaña vuelven a subir.
10. Cerrar el combate y la sesión con crónica.

## Cómo se corre

- `WORKTREE_SLOT=1 pnpm --filter @dnd/web exec playwright test partida` — **tres veces
  seguidas**: una partida que pasa una vez y falla la segunda es una carrera, no un verde.
- Después, **las suites enteras una vez**: `pnpm verify`, `pnpm --filter @dnd/api test:e2e`,
  `WORKTREE_SLOT=1 pnpm --filter @dnd/web e2e`. Los totales van a `07-historial.md` (entrada
  «Paso 4»).
- Y **desplegar** con el comando de [03-despliegue.md](../../03-despliegue.md) — lo lanza el autor.

## Lo que este guion no decide

Qué hacer con lo que falle: cada fallo real es una ficha en `06-pendientes.md` con fichero:línea o
un arreglo en la misma rama, según la regla de rigor según riesgo (`04-convenciones.md`).
