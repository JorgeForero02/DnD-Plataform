# Plan 07 · Consolidación (iconos · vocabulario del daño · `type: tipo`)

**Objetivo en una frase:** juntar lo que quedó repartido porque **ningún carril tenía permiso para
tocarlo**, y poner freno a la ficha que puede convertir un PNJ en Documento sin dejar rastro.

**Tamaño:** tres commits. **Dependencias:** el plan 06 (para no tocar los mismos ficheros a la vez).
**Solo `apps/web/src`.**

---

## 7.1 · Los iconos

**Medido el 2026-09-05:** hay **diez ficheros de iconos** —`ui/Iconos.tsx` más nueve en
`features/`— y conceptos repetidos:

```
Escudo   3 definiciones
Mochila  3
Sol      2
Luna     2
```

La auditoría original contaba «4 iconos» porque **solo miró `ui/Iconos.tsx`**; el número real ronda
los 76. Y al traer los 23 de la maqueta a `ui/`, los duplicados se hicieron visibles.

**Ningún carril podía arreglarlo**: los seis tenían `features/**` prohibido. Es exactamente el
trabajo que solo se puede hacer ahora.

**Regla de consolidación, y solo esta:**
- **`ui/Iconos.tsx` es el dueño de todo concepto que use más de un módulo.** Escudo, mochila, sol,
  luna, lupa: uno solo, ahí.
- **Un icono que solo usa su módulo se queda en su módulo.** No lo subas: `ui/` no es un cajón.
- **Nada de reexportar «por compatibilidad»** salvo que el cambio de importaciones sea enorme. Un
  reexport que sobrevive es una segunda puerta.
- **El trazo se unifica al que ya tiene su prueba**, no al de la maqueta. Dos familias de grosor en
  un fichero es peor que un grosor discutible.

**El orden que evita un commit ilegible:** primero **mover y borrar duplicados** sin cambiar dibujo,
y en un commit aparte cualquier retoque visual. Si mezclas, la revisión no puede ver qué cambió de
verdad.

## 7.2 · El vocabulario del daño (D-OP-14)

**Medido:** hay **tres** vocabularios con la traducción de tipos de daño —
`character-sheet/vocabulario.ts`, `campaign-items/vocabulario.ts`, `inventory/vocabulario.ts`— y
**seis consumidores**.

**Y no son iguales:** `inventory` **abrevia** y usa otro término. Por eso **fusionarlas a ciegas
rompe su tabla**, y por eso la decisión fue un módulo con **dos formas**:

```
nombreTipoDano("lightning")       → "relámpago"     (larga)
nombreTipoDanoCorto("lightning")  → "rayo"          (corta)
```

**Dónde vive:** en `apps/web/src` como vocabulario de dominio compartido. **No en
`packages/shared`**: es forma legible en español, no forma de los datos, y `shared` no traduce.

**Cada consumidor elige su forma a propósito**: la tabla del inventario, corta; la hoja y la traza de
daño, larga. **Escribe en el commit cuál usa cada uno**, porque es la decisión que un futuro
«unificador» va a querer deshacer.

> **`tags` NO entra en este plan.** Su unicidad y la prueba que la fija viven en el **plan 15**: es
> esquema compartido, no consolidación de web, y mezclarlos haría que este commit tocara
> `packages/shared` sin necesidad.

## 7.3 · `type: tipo` — consecuencia dicha y rastro (I16)

**El defecto:** cambiar el tipo en el editor **reclasifica la ficha sin preguntar**. Un PNJ con
statblock, enlaces y comentarios se vuelve «Documento» de un clic, y **no queda rastro**.

**Un «¿Seguro?» es peor que nada**: se pulsa sin leer y encima tranquiliza. Dos piezas, y son norma
general del proyecto:

1. **La confirmación dice la consecuencia**, no el riesgo: **dónde deja de aparecer** la ficha, **qué
   filtros dejan de encontrarla**, y **si su statblock deja de tener sentido**. Con los nombres
   reales, no en abstracto.
2. **El cambio deja rastro**: un suceso en el registro. El registro **es la auditoría de esta
   aplicación**, y ahora mismo una ficha puede cambiar de naturaleza sin dejar huella.

Con las dos, el gesto **se vuelve reversible en la práctica**: alguien puede ver qué pasó y
deshacerlo. El patrón —**consecuencia dicha + rastro**— se escribe una vez en
`docs/04-convenciones.md` y vale igual para archivar, borrar y despromover.

> **Si el suceso nuevo obliga a tocar `packages/shared` y el enum de Prisma**, mira antes el plan 03:
> no conviene que dos planes añadan valores al mismo enum a la vez. Si coinciden, este espera.

---

## Pruebas

**Iconos:** una prueba que **falla si un concepto compartido tiene dos definiciones**. Barrer los
nombres exportados en `features/**/iconos*.tsx` y cruzarlos con `ui/Iconos.tsx`; si un nombre está en
los dos, rojo. **Esa prueba es el valor duradero de este plan**: sin ella habrá una cuarta copia.

**Daño:** la tabla de los tipos con sus **dos formas**, y una prueba de que **ningún consumidor pinta
la clave** (`lightning` no aparece nunca en pantalla).

**`type: tipo`:** cambiar el tipo pide confirmación · la confirmación **nombra la consecuencia**
(busca el texto, no el rol) · aceptar **escribe el suceso** · cancelar **no cambia nada**.

**Mutación:** borra el diálogo de confirmación y comprueba que su prueba se pone roja; y duplica a
mano un icono compartido para ver que la prueba de duplicados lo caza.

## Guía de revisión

- [ ] `ui/Iconos.tsx` no ganó iconos de un solo módulo: **subir todo también es un error**.
- [ ] Cero conceptos con dos definiciones, **demostrado por la prueba**, no leyendo.
- [ ] El commit de mover y el de retocar el dibujo **están separados**.
- [ ] El módulo de daño tiene **las dos formas**, y el commit dice qué usa cada consumidor.
- [ ] `inventory` conserva su forma corta: **no se ha "arreglado" su tabla**.
- [ ] La confirmación de tipo **nombra la consecuencia** y no dice «¿estás seguro?».
- [ ] El cambio de tipo **aparece en el registro**, traducido y sin claves.
- [ ] Ninguna traducción se fue a `packages/shared`.

## Trampas

- **Un reexport «temporal» sobrevive a todos.** Si lo pones, ponle fecha en el comentario y una
  ficha, o no lo pongas.
- **Mover un icono cambia su tamaño heredado.** Los de `features/` a veces traen su propio
  `strokeWidth` o `viewBox`; al centralizar, míralos **en el navegador** — `jsdom` no maqueta.
- **El vocabulario del daño ya se intentó fusionar a ciegas una vez y se detectó a tiempo.** Las tres
  copias **no son iguales**: compáralas entrada por entrada antes de borrar ninguna.
- **`type` es una columna con enum**: cambiarlo puede dejar huérfano el statblock de un PNJ. Ese es
  justo el caso que la confirmación tiene que nombrar.

## Commits

```
refactor(web): one icon per idea, and ui/Iconos owns the shared ones
refactor(web): one damage vocabulary with two shapes, long and short
feat(web): changing an entry's type says what it costs, and leaves a trace
```

## Definición de terminado

`pnpm verify` verde, la prueba anti-duplicados **existiendo y demostrada con una mutación**, el
navegador abierto para mirar los iconos movidos, y las tres fichas anotadas en el maestro.


---

## Avance — lo escribe quien ejecuta este plan

> **Obligatorio, y se escribe MIENTRAS se trabaja, no al final.** Si la sesión se queda sin contexto
> o muere, **esto y el prompt de arranque son lo único que sabe la siguiente**. Una línea por paso,
> con su commit. Nada de memoria: `fichero:línea` o no cuenta.

| Estado | Cuándo | Qué |
|---|---|---|
| ✅ hecho | 2026-09-06 | **7.1 · Los iconos.** Prueba nueva `apps/web/src/ui/__tests__/iconos-sin-duplicados.test.ts`. Consolidados a `ui/Iconos.tsx`: el escudo de `bestiario` y el sol, la luna, la mochila y la lupa de `apps/web/src/features/sessions/iconos.tsx`. El escudo de `apps/web/src/features/campaign-items/iconos.tsx:59` deja de exportarse; `inventory/IconoMochila` pasa a `IconoLlevado`; el «más» de `campaigns/iconosDeSeccion.tsx` viene de `ui`. **Commit `<pendiente 7.1>`** |
| ⬜ sin empezar | — | 7.2 · El vocabulario del daño (D-OP-14) |
| ⬜ sin empezar | — | 7.3 · `type: tipo` — consecuencia dicha y rastro (I16) |

**Leyenda:** ⬜ sin empezar · 🟨 en marcha · ✅ hecho · ⛔ bloqueado (di por qué y qué descartaste).

**Lo que decidí por los cuatro pasos** (qué no cuadraba · qué elegí · por qué es duradero · la
fuente si la hubo):

- **7.1 · La prueba encontró TRES duplicados que la lectura a ojo se había dejado.** Yo había medido
  escudo, mochila, sol, luna y lupa; faltaban `campaign-items/IconoEscudo`, `campaigns/IconoMas` e
  `inventory/IconoMochila`. **Es el argumento entero de por qué el plan pedía la prueba** y no solo
  la limpieza: sin ella la cuarta copia llega sola.
- **7.1 · Tres módulos dibujan en rejilla de 16, no de 24** (`inventory`, `rules`, `level-up`, con
  trazo 1.4/1.5 frente al 1.6 de `ui`). **Moverlos sería redibujar**, y el plan separa mover de
  retocar a propósito. Se quedan, y la prueba no los toca porque sus nombres ya no chocan.
- **7.1 · `IconoObjeto` y `IconoLugar` NO se fusionan, y no es pereza.** Son **tres dibujos para tres
  significados** —un cofre (el sello «objeto entregado»), el glifo del tipo `ITEM`, y una caja de la
  rejilla de 16—. La regla del plan dice que un icono que solo usa su módulo **se queda en su
  módulo**; subirlo todo es tan malo como duplicarlo. Está escrito en la cabecera de la prueba para
  que nadie lo «arregle».
- **7.1 · El escudo del catálogo deja de EXPORTARSE en vez de renombrarse o moverse.** Nadie lo
  importaba —la puerta pública de esa familia es `IconoDeObjeto({ kind })`—, así que dejarlo privado
  es la verdad: hay **un solo `IconoEscudo` importable**. Y su dibujo se queda porque lleva marca de
  verificación y el lienzo de sus hermanos; meter el de `ui` mezclaría dos grosores en la misma fila.
- **7.1 · `inventory/IconoMochila` → `IconoLlevado`, y eso es una mejora aparte.** Sus dos hermanas
  se llaman por su significado (`IconoEquipado`, `IconoGuardado`, del trío
  `EQUIPPED`/`CARRIED`/`STORED`) y esta se llamaba por su dibujo: era la rara **antes** de chocar
  con `ui`.
- **7.1 · El tamaño se pasó explícito donde se heredaba.** `ui/Marco` mide en `1em`; el `base()` de
  `sessions` traía `h-5 w-5` por defecto. `RailDePaneles.tsx` llamaba `<IconoMochila />` sin clase,
  así que **sustituir sin más habría encogido el icono sin que ninguna prueba lo viera** — es la
  trampa que la ficha avisaba, y por eso se miró en el navegador.

**Lo siguiente exacto, si me quedo aquí:**

- **7.2 · El vocabulario del daño (D-OP-14).** Hay **tres** copias —`character-sheet/vocabulario.ts`,
  `campaign-items/vocabulario.ts`, `inventory/vocabulario.ts`— y **no dicen lo mismo**: `inventory`
  abrevia (`rayo` donde las otras dicen `relámpago`). **Compáralas entrada por entrada antes de
  borrar ninguna.** La decisión ya tomada es un módulo con **dos formas**, `nombreTipoDano` y
  `nombreTipoDanoCorto`, en `apps/web/src` y **no** en `packages/shared` —es forma legible en
  español, no forma de los datos—, y **cada consumidor elige la suya a propósito**: la tabla del
  inventario corta, la hoja y la traza largas. **Escríbelo en el commit**, porque es justo lo que un
  futuro «unificador» va a querer deshacer.
- **7.3 · `type: tipo` (I16).** Cambiar el tipo reclasifica la ficha sin preguntar y **sin dejar
  rastro**. Dos piezas: la confirmación **dice la consecuencia** —dónde deja de aparecer, qué filtros
  dejan de encontrarla, si su statblock deja de tener sentido— y **nunca «¿estás seguro?»**; y el
  cambio **escribe un suceso**. Si el suceso obliga a añadir un valor al enum de Prisma, **mira antes
  si algún otro plan lo está tocando**.
