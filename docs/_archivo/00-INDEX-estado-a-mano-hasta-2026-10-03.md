# 00-INDEX — el estado escrito a mano (hasta el 2026-10-03)

**Las líneas 12-49 de `00-INDEX.md`, movidas enteras el 2026-10-03.** Afirmaban qué imagen servía
producción (`6d2b2ca`) y qué la separaba de `main`; el 2026-10-03, **antes del parche de dependencias**,
producción servía `a4883f0` (medición del orquestador con `docker ps`). Era la quinta vez que este
párrafo caducaba, y por eso el índice pasa a dar el comando en vez del dato. No se reescribe.
Los enlaces relativos que trae apuntaban desde `docs/`; aquí no resuelven y se leen como texto.

---

**Sí tiene, y está desplegado: las fases 2 y 2.5, el reseño de la mesa, los quince planes del
2026-09-05, la sesión de cerrar fichas, las ocho migraciones de D-CF-14 y ahora la hoja a página
completa.** `dnd.supportive.pro` sirve la imagen etiquetada **`6d2b2ca`** — lo comprobó el
controlador el 2026-09-12 en `vps1new` con `docker ps` (API y web `healthy`) y con `curl` contra el
dominio (200).

> **Hasta el 2026-09-12 aquí ponía que producción servía `6eb2590`**, la imagen del 2026-09-05, y
> el párrafo de abajo contaba la distancia contra ella (70 ficheros). El autor desplegó después y
> este fichero no se enteró: la misma caducidad de siempre, escrita a mano en el que se manda leer
> primero.

> **Hasta el 2026-09-05 aquí ponía que el reseño de la mesa NO estaba desplegado y que producción
> iba por detrás de los dos `main`.** Las dos frases caducaron con ese despliegue.

> **Hasta este mismo bloque, hasta el 2026-09-06, aquí ponía que «no hay ningún cambio de código
> sin desplegar».** Era cierto cuando se escribió y dejó de serlo con este plan — la misma
> caducidad que ya avisó el párrafo de arriba sobre el reseño de la mesa.

> **Hasta el 2026-09-12 este párrafo decía que producción servía `f9579b2` y que `main` (en
> `e43038f`) le llevaba 80 ficheros de ventaja sin desplegar.** Las dos frases eran ciertas hasta
> que el autor desplegó ese mismo día: `git diff --name-only 6d2b2ca..HEAD -- apps packages` está
> vacío, así que no queda nada sin desplegar.

**`main` va por delante de producción desde el 2026-09-13**: la rama `pulido/antes-del-paso-3`
(45 commits sobre `0ebdd9f`, cerrada por la Tarea 15) se fusionó a `main` en `d7ec2b3`
(`--no-ff`) y se empujó a GitHub. Producción sigue sirviendo `6d2b2ca`: empujar **no despliega
nada** — el CI solo prueba, y el despliegue es manual por decisión del autor, ver
[03-despliegue.md](./03-despliegue.md). Qué separa `main` de producción se mide:
`git diff --name-only 6d2b2ca..HEAD -- apps packages`.

**Los quince planes del 2026-09-05 están cerrados**, uno por fichero, en
[superpowers/plans/2026-09-05-planes/](./superpowers/plans/2026-09-05-planes/00-INDICE.md), y lo que
decidieron mientras se ejecutaban está en [decisiones.md](./decisiones.md). **Lo que queda por hacer
ya no es «jugar y ya»: son tres tandas más antes del paso 3** (D-CF-52, enmendada por D-CF-64) —
**reglas de la mesa** → **puerta de efectos** → **paso 3**, con el **mapa de historia del DM
aplazado** por el autor tras ver cuatro maquetas (su spec se queda escrita, sin fecha). Cada tanda
espera su propio plan y el OK del autor; ninguna arranca sola. Y sigue pendiente la partida de
prueba con dos cuentas de jugador (D-OP-3), en producción desde el 2026-09-02.
