# Plan 10 · La documentación

**Objetivo en una frase:** que el repositorio deje de ir por detrás de lo decidido y lo hecho, y que
`Mine/` deje de ser la única fuente de verdad.

**Tamaño:** tres commits. **Va al final**, cuando lo demás esté hecho: documentar decisiones que aún
pueden cambiarse obliga a escribirlo dos veces.

> **Antes de empezar, pide permiso para una cosa.** El autor pidió el 2026-09-04 **no tocar
> `docs/06-pendientes.md`** mientras se consolidaban los pendientes en `Mine/`. Tres commits lo han
> respetado y lo han dicho. **Este plan necesita levantar esa restricción**, y es suya: pregúntale
> antes. Si dice que no, todo lo demás de este plan se puede hacer igual **menos** el punto 3.

---

## 10.1 · Las decisiones

En `docs/decisiones.md`, una sección nueva con **una línea por decisión y enlace a su razonamiento**:

- **D-OP-1 a D-OP-24** (2026-09-04), de `Mine/decisiones-2026-09-04-autor.md`.
- **D1–D4** (2026-09-05): el hilo como conversación · manda `04-convenciones.md` sobre el cobre · el
  color lo elige el jugador · **la telaraña se sustituye por la línea de tiempo**.
- **I5–I21**: las nueve que cerró la investigación y las siete de recomendación, de
  `Mine/investigacion-decisiones-2026-09-05.md`. **Con sus fuentes**: las de reglas llevan su cita.
- **Las doce desviaciones menores de la maqueta.** Si no se escriben, el próximo agente que abra la
  maqueta al lado **las «arregla» de vuelta** y se paga dos veces.

**Y una regla nueva que es normativa y va en `04-convenciones.md`, no en `decisiones.md`:**

> **Las reglas de D&D son verdad absoluta.** Si el SRD contesta una duda, se aplica; no se pregunta.
> **La maqueta no es fuente de reglas**: donde su rótulo discrepe del SRD, gana el SRD y el rótulo se
> corrige.

Con su ejemplo, que es lo que la hace entender: la maqueta pintaba «Ventaja por flanqueo +3» y «Ayuda
+1d4», **y las dos son falsas**.

## 10.2 · Lo que hay que corregir porque miente

**Estas ya están medidas y solo hay que escribirlas:**

- **El cobre.** `04-convenciones.md` tiene hoy la contradicción **declarada como viva**. Se cierra:
  manda el documento, la maqueta se corrige. Se retira el aviso y se anota la decisión.
- **`--warning` y `--success`.** El token existe en los cuatro temas con contrastes medidos, y la
  decisión de **no** tener `--success` vive solo en un comentario de `tokens.css`. **Súbela a
  `04-convenciones.md`**: una decisión de no-hacer que solo vive en el código **se revierte por buena
  fe** dentro de seis meses.
- **El patrón «consecuencia dicha + rastro»** para gestos que reclasifican o esconden (plan 07).
- **`CLAUDE.md` y `docs/00-INDEX.md`**: repásalos. Su bloque de estado se regenera con
  `pnpm update:estado`, pero **la prosa de la cabecera se escribe a mano y ya caducó una vez**.

## 10.3 · La auditoría de la cola larga

**Commit aparte, y el más grande de este plan.** `docs/06-pendientes.md` son **1362 líneas y 55
secciones** de fase 1, 2A y 2B **que nadie ha contrastado con el código**. El único día que se
miraron, **cuatro fichas se cerraron solas**.

**Método, ficha por ficha:**
1. Leer la ficha y **buscar en el código** lo que afirma.
2. **Cerrada** → táchala **con el `fichero:línea` que lo prueba**. No la borres: tachada con su
   prueba es historia útil.
3. **Viva** → déjala, y si su descripción caducó, corrígela.
4. **Ambigua** → márcala como **sin comprobar** y di por qué. Es mejor que adivinar.

**Va en su propio commit**: uno que decide y otro que limpia no se revierten igual.

**Y mientras se hace, se cierran las que estos planes hayan cerrado**: `ENTITY_LINKED`,
`concentrationSave`, los dos disparadores, C6-1, el panel de dados, los atajos, M9, P1, P3…

---

## Pruebas

Las que ya existen y **son las que importan aquí**:

- `pnpm check:docs` — caza rutas que no existen. **Ya cazó tres** que vivían en ramas sin fusionar.
- `pnpm check:estado` — el bloque generado de `00-INDEX.md` no se escribe a mano.
- `pnpm check:historial` — **tope de 400 líneas**, y hoy está en **399**. El siguiente que escriba ahí
  **tiene que archivar antes**, o se pone rojo. Está avisado en la cabecera del propio fichero.

## Guía de revisión

- [ ] Cada decisión es **una línea con enlace**, no un ensayo. `decisiones.md` existe para no releer
      `superpowers/`.
- [ ] Las decisiones de reglas llevan **su cita**.
- [ ] La contradicción del cobre **ya no aparece como abierta** en ningún sitio.
- [ ] La regla de «las reglas son verdad absoluta» está en `04-convenciones.md`, que es lo normativo.
- [ ] `docs/06-pendientes.md` se tocó **solo si el autor levantó la restricción**.
- [ ] La auditoría de la cola larga va en **commit aparte**.
- [ ] Nada tachado sin su `fichero:línea`.
- [ ] `07-historial.md` no pasa de 400: **archiva antes de escribir**.
- [ ] `pnpm verify` verde, con el gancho corriendo.

## Trampas

- **`07-historial.md` está a 399 de 400.** Escribir sin archivar antes pone `check:historial` rojo y
  te para el commit. El archivado tiene su procedimiento en la cabecera del fichero: **se mueve
  entero, no se resume**.
- **El bloque de estado de `00-INDEX.md` es generado**: si lo editas a mano, `check:estado` te para.
- **No conviertas la auditoría en una refactorización.** Si al comprobar una ficha ves código feo,
  **anótalo**; arreglarlo aquí mezcla dos commits que se revierten distinto.
- **Las fichas de `.superpowers/` son registro fechado**: caducan y **no se corrigen**. Solo `docs/`
  se mantiene al día.

## Commits

```
docs(decisiones): the decisions of 2026-09-04 and 2026-09-05, with their sources
docs(convenciones): the copper contradiction closes, and the rules become binding
docs(pendientes): audit the long tail against the code, ficha by ficha
```

## Definición de terminado

`pnpm verify` verde, los tres comprobadores en verde, y **`Mine/pendientes-maestro-2026-09-04.md`
apuntando a `docs/` en vez de sustituirlo** — el día que el repositorio tenga la verdad, el maestro
pasa a ser un resumen, no la fuente.
