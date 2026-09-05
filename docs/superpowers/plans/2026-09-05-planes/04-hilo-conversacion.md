# Plan 04 · El hilo como conversación (decisión D1)

**Objetivo en una frase:** que el hilo se lea como un chat —**lo último abajo**— sin perder la franja
de «esto te perdiste», que es lo único delicado del cambio.

**Tamaño:** un commit. **Dependencias:** ninguna. **Toca solo `apps/web/src/features/sessions/**`**,
así que no choca con el carril del motor.

**Decisión del autor, literal:** *«esto es el chat de mesa que muestra el historial, se supone que lo
último siempre va en línea como si fuera una conversación».*

---

## Lo que hay hoy, medido

- **El servidor manda el registro más reciente primero**, y está escrito en el código:
  `HiloDeSesion.tsx:112` — *«`eventos` llega del servidor más reciente primero»*.
- La marca de lectura se guarda con `eventos[0].id`, o sea **el primero del array = el más
  reciente** (`HiloDeSesion.tsx:86`).
- `loQueTePerdiste` (`reincorporarse.ts:60`) devuelve `desde` = **el más antiguo de los nuevos**, y
  su comentario dice por qué: *«es donde va la franja, porque es por donde hay que seguir leyendo.
  Poner la franja en el más reciente la dejaría arriba del todo, sin nada debajo»*.
- El contenedor scrollea por dentro: `scroll-quiet flex min-h-0 flex-1 flex-col overflow-y-auto`
  (`:160`).

## Qué hay que cambiar, y qué NO

**Sí cambia:** el **orden de pintado** y el **anclaje del scroll**.

**NO cambia, y es importante que no cambie:**
- **El orden en que llega del servidor.** Invertir la consulta rompería la paginación por cursor
  —`nextCursor` sale de la última fila traída— y eso está fuera de este plan.
- **La lógica de `loQueTePerdiste`.** Sigue devolviendo el más antiguo de los nuevos, y **sigue
  siendo el sitio correcto**: con el orden invertido, ese suceso es el primero por debajo del cual
  está lo no leído. **La función no se toca**; lo que cambia es dónde cae visualmente.
- **La marca congelada al montar.** Si se releyera en cada sondeo, la franja desaparecería a los
  quince segundos —justo cuando alguien vuelve a la mesa—. Está resuelto con una referencia que se
  siembra en **el primer lote que trae algo**, no en el primer pintado. **No lo toques.**

## Pasos

1. **Invertir al pintar, no al pedir.** En `HiloDeSesion.tsx`, pintar sobre una copia invertida:
   `const enOrden = [...eventos].reverse()`. **Copia, no `eventos.reverse()`**: `reverse` muta, y
   mutar el array que viene de la caché de consultas corrompe lo que ven otros componentes y no falla
   de forma visible.
2. **La marca de leído sigue siendo el más reciente** — `eventos[0].id` **no cambia**, porque el
   array original conserva su orden. Si te ves escribiendo `enOrden[enOrden.length - 1].id`, has
   entendido mal: es el mismo suceso y el rodeo es un sitio donde equivocarse.
3. **Anclar abajo.** Al montar y al llegar sucesos nuevos, llevar el scroll al final.
4. **Y no saltar si el usuario está leyendo arriba.** Antes de anclar, comprobar si estaba **al
   fondo** con una tolerancia:
   ```
   const alFondo = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
   ```
   Solo se ancla si `alFondo`. Si no, **no se mueve nada** y se le enseña un aviso discreto de que
   hay algo nuevo abajo, pulsable para bajar. **Esto es el corazón del plan**: un chat que te
   arrastra mientras lees es peor que uno que no se mueve.
5. **El compositor ya está debajo del scroll** desde la Ola 0. Confirmar que sigue **fuera** del
   contenedor que scrollea.
6. **La franja de «te perdiste»** se pinta antes del suceso que devuelve `desde`, y con el orden
   nuevo queda con lo no leído **por debajo**. Revisar su texto: si dice algo como «más abajo» o
   «más arriba», corregirlo — y si no dice ninguna dirección, mejor.

## Pruebas

**Unitarias (RTL):**
- Con tres sucesos, el **último del DOM es el más reciente**. Se comprueba por el orden de los nodos,
  no por el texto.
- `marcarVisto` se llama con **el id del más reciente**, con el hilo ya invertido.
- Con marca puesta y dos sucesos nuevos, **la franja aparece** y tiene **dos sucesos por debajo**.

**En el navegador — y esto no se puede probar en `jsdom`, que no maqueta:**
- Al abrir la mesa, el hilo está **al fondo**.
- Con el scroll subido a la mitad, **llega un suceso nuevo y la vista NO se mueve**.
- Estando al fondo, llega uno nuevo y **sí baja**.

Va en `apps/web/e2e/` — cabe en `mesa-mide.spec.ts`, que ya mide maquetación de la mesa.

**Mutación (obligatoria):** quita la condición `alFondo` y comprueba que **la prueba del scroll
subido se pone roja**. Es la única que protege el comportamiento que de verdad importa.

## Guía de revisión

- [ ] Se invierte **una copia**; `eventos` nunca se muta.
- [ ] La marca de leído sigue saliendo de `eventos[0].id` y **no** del array invertido.
- [ ] `loQueTePerdiste` **no se ha tocado**.
- [ ] La marca sigue **congelada al montar** y no se resiembra en cada sondeo.
- [ ] La franja tiene lo no leído **debajo**, comprobado en el navegador.
- [ ] Con el scroll arriba, un suceso nuevo **no roba la posición**, y hay aviso de que hay algo
      nuevo.
- [ ] La página **sigue sin scrollear**: lo que scrollea es el hilo (`mesa-mide.spec.ts` ya lo mide).
- [ ] Playwright corrido **de verdad** y una sola tanda en la máquina.

## Trampas

- **`Array.prototype.reverse()` muta.** Es el error más probable de este plan y no da error: da
  síntomas raros en otros componentes.
- **`scrollTop` justo tras pintar puede leerse antes de que el navegador maquete.** Anclar en un
  efecto tras el pintado, y si hace falta, en el siguiente cuadro.
- **`jsdom` no maqueta**: `scrollHeight` y `clientHeight` valen 0 y **cualquier prueba de anclaje
  pasa siempre**. Por eso el anclaje va a Playwright y no a RTL. Es exactamente el fallo que dejó 871
  pruebas verdes con la mesa rota.
- **El compositor no puede entrar en el contenedor que scrollea**: si entra, se va con el texto y
  desaparece al subir.

## Commit

```
feat(web): the thread reads like a conversation, newest at the bottom

The author's words: it is the table's chat, and the last thing said goes on the
last line. The list is reversed at paint time on a copy — the server keeps
sending newest first, and the cursor pagination depends on that order, so
nothing about the request changes.

The delicate half is the "you missed this" band, and it did not need new logic:
`loQueTePerdiste` already returns the oldest of the unread, which used to sit at
the top with nothing under it and now sits exactly where reading resumes.

The scroll anchors to the bottom only when the reader is already there. A chat
that drags you down while you are reading further up is worse than one that
never moves, so when the reader has scrolled away the view stays put and a quiet
notice says there is something new below.
```

## Definición de terminado

`pnpm verify` verde, Playwright corrido, la mutación probada, capturas de la mesa en las tres
disposiciones para el autor, y la decisión D1 anotada como aplicada en el maestro.


---

## Avance — lo escribe quien ejecuta este plan

> **Obligatorio, y se escribe MIENTRAS se trabaja, no al final.** Si la sesión se queda sin contexto
> o muere, **esto y el prompt de arranque son lo único que sabe la siguiente**. Una línea por paso,
> con su commit. Nada de memoria: `fichero:línea` o no cuenta.

| Estado | Cuándo | Qué |
|---|---|---|
| ⬜ sin empezar | — | — |

**Leyenda:** ⬜ sin empezar · 🟨 en marcha · ✅ hecho · ⛔ bloqueado (di por qué y qué descartaste).

**Lo que decidí por los cuatro pasos** (qué no cuadraba · qué elegí · por qué es duradero · la
fuente si la hubo):

- _(nada todavía)_

**Lo siguiente exacto, si me quedo aquí:**

- _(nada todavía)_
