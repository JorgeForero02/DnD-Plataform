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
