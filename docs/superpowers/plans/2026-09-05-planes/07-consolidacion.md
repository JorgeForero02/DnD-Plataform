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
| ✅ hecho | 2026-09-05 | **7.1 · Los iconos.** Prueba nueva `apps/web/src/ui/__tests__/iconos-sin-duplicados.test.ts`. Consolidados a `ui/Iconos.tsx`: el escudo de `bestiario` y el sol, la luna, la mochila y la lupa de `apps/web/src/features/sessions/iconos.tsx`. El escudo de `apps/web/src/features/campaign-items/iconos.tsx:59` deja de exportarse; `inventory/IconoMochila` pasa a `IconoLlevado`; el «más» de `campaigns/iconosDeSeccion.tsx` viene de `ui`. **Commit `dc4d6aa`** |
| ✅ hecho | 2026-09-05 | **7.2 · El vocabulario del daño.** Módulo nuevo `apps/web/src/dominio/dano.ts` con las **dos formas**; las cuatro pantallas importan de ahí. Carpeta `src/dominio/` declarada en `docs/01-arquitectura.md`. **Commit `83cee63`** |
| ✅ hecho | 2026-09-05 | **7.3 · `type: tipo` (I16).** Suceso `ENTITY_RETYPED` (`packages/shared/src/game-event.schema.ts`, migración `apps/api/prisma/migrations/20260906010000_entity_retyped_event/`), emitido en `apps/api/src/entities/entities.service.ts:184-215`. La confirmación va en **los chips del taller** (`apps/web/src/features/sessions/taller/EscribirFicha.tsx`), **no en el editor**. **Commit `83cee63`** |
| ✅ | 2026-09-05 | **EL PLAN 07 ESTÁ CERRADO**: las tres, con sus mutaciones |

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

- **7.2 · Comparé las tres entrada por entrada ANTES de borrar, como avisaba el plan, y el dato
  cambia el diseño.** `character-sheet` y `campaign-items` son **idénticas** en las trece; solo
  `inventory` difiere, y **en cuatro**. Si hubiera fusionado a ciegas habría roto una fila por
  ahorrarme una tabla.
- **7.2 · Las dos tablas son COMPLETAS: la corta no es «la larga salvo excepciones».** Un valor por
  defecto habría dado, el día que se añada un tipo de daño, una forma corta silenciosamente larga —y
  la fila del inventario se rompe sin que nada avise—. Con dos `Record<DamageType, string>`, el
  compilador exige las dos.
- **7.2 · Carpeta nueva `src/dominio/`, y va declarada en `docs/01-arquitectura.md`** porque el mapa
  de carpetas está documentado y una carpeta que aparece sola es deriva. Su regla de entrada:
  vocabulario del juego **y** usado por más de una pantalla. `lib/` es infraestructura, `ui/` es
  presentación, y meterlo en un `features/<x>/` es cómo nacieron las tres copias.
- **7.2 · `campaign-items` importa ADEMÁS de reexportar.** Un `export ... from` no trae el nombre al
  ámbito del módulo, y ese fichero lo usa unas líneas más abajo en `subtituloDeObjeto`. Lo cazó el
  compilador, no yo.

- **7.3 · LA FICHA SEÑALABA EL SITIO EQUIVOCADO, y llegué a escribir el arreglo en él.** Decía
  «cambiar el tipo **en el editor**»; `EntityEditor` recibe `type` como **prop** y sus dos
  consumidores le pasan `entity.type` al editar, así que **ahí el gesto no existe**. El único sitio
  donde se reclasifica son los **chips de tipo del taller**
  (`apps/web/src/features/sessions/taller/EscribirFicha.tsx:243-247`). Tuve la confirmación puesta
  en el editor y la moví al medir. **Es el argumento de medir antes de arreglar**, y por eso queda
  escrito en la ficha cerrada.
- **7.3 · Solo pregunta al EDITAR una que ya existe.** En una ficha nueva el chip elige de qué tipo
  va a ser y no reclasifica nada. Una confirmación que salta cuando no hace falta se aprende a
  ignorar en dos días, **y entonces tampoco protege el caso que importa**. Hay una prueba de que en
  el camino de crear no aparece.
- **7.3 · El suceso lleva los DOS tipos, y como clave.** «Ahora es un Documento» no dice qué se
  perdió; «pasa de PNJ a Documento» sí. Y van como `NPC`/`DOCUMENT` porque un registro guarda datos
  —la forma legible se compone al pintar, que es donde vive el español.
- **7.3 · Añadir el valor al enum de `GameEventType` no chocó con nadie**: el plan 03 añadió
  **columnas**, no valores. `ALTER TYPE ... ADD VALUE` va **solo en su migración**.
- **7.3 · Tres exhaustivos lo cazaron por mí**, y conviene saberlo: `linea-de-log.ts` y
  `hilo/tipo-de-mensaje.ts` no compilan si un suceso nuevo no se traduce y no se clasifica. La red
  ya estaba puesta.

**Lo siguiente exacto, si me quedo aquí:**

- **Nada: el plan 07 está cerrado, con sus tres fichas y sus mutaciones.** Lo siguiente del orden
  recomendado es el **plan 05** (`05-color-por-personaje.md`), que no depende de nada.
