# 3A.1 · El libro entra, de voz y con daño — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el catálogo del SRD 5.1 tenga **los 320 conjuros y todas las aptitudes de clase, subclase y raza**, cada uno con **nombre y prosa en español oficial**, el inglés al lado, sus metadatos, **su pago** (espacio o usos con `resetOn`) y, donde exista, **su mecánica de daño/curación con cómo se resuelve** (salvación, directo, ataque de conjuro) — expresada en el vocabulario que el motor **ya** entiende (`Actividad`, `Origen`), sin que ningún código de producción lea Foundry.

**Architecture:** Un conversor **offline y re-ejecutable** (`scripts/convertir-catalogo.mjs`) lee dos fuentes fuera del repositorio —el YAML de Foundry (estructura y números) y el texto del SRD 5.1 español (nombres y prosa)—, las casa **por huella estructural** (nivel + escuela + tiempo + alcance + componentes + duración), traduce cada fórmula `@` de Foundry a una forma cerrada de `Origen` (**rechazando en voz alta** la que no cabe) y escribe **ficheros dorados** en `apps/api/src/rules/catalog/generado/` (JSON + un informe de rechazos) que se **commitean**. El motor consume esos JSON validados con Zod al cargar. Las pruebas viven sobre todo en el conversor (puro, sin base): invariantes, huella y una tabla de casos raros elegidos a mano; el motor solo gana **una** forma nueva de `Origen` (`nivelDeClase`) con su unitaria. Decisión del autor (2026-09-14): «el sistema ya está probado porque la furia funciona; se prueba la fórmula, no cada caso».

**Tech Stack:** Node 20 (`.mjs`, `js-yaml`, `pymupdf` solo para extraer el PDF una vez) · Zod en `packages/shared` · Jest (API) · el catálogo TS existente (`apps/api/src/rules/catalog/`).

**Spec:** [2026-09-05-paso-3-catalogo-design.md](../specs/2026-09-05-paso-3-catalogo-design.md) (§3 la partición de fuentes, §5 cuatro pasos, §7 riesgos) y el bloque A del [plan del 8](./2026-09-08-paso-3-el-catalogo-y-los-conjuros-del-personaje.md) (T0–T4), con el alcance recortado por [Paso 3 en dos partes](./2026-09-14-paso-3-en-cinco-tandas.md) §3A.1 (D-CF-71). Proceso: **D-CF-65 con rigor según riesgo** (memoria del autor, 2026-09-14): un implementador por tarea, pruebas donde cambia comportamiento, un `verify` por tarea (lo exige el pre-commit), **sin** revisión por tarea; al cierre **una** revisión Opus que **lee el fichero dorado** y **una** ola. Sin Playwright: esta tanda no toca ninguna pantalla.

## Global Constraints

- **SRD 5.1 (2014).** Carpetas de Foundry **sin sufijo `24`**; el conversor **rechaza** cualquier fichero cuyo `system.source.rules !== '2014'`. Foundry vive en `C:\Users\gogam\Desktop\Trabajo\Mine\referencia-foundry-dnd5e\packs\_source` (**fuera del repo, solo lectura; su código jamás se ejecuta**). El SRD español vive en `C:\Users\gogam\Desktop\Trabajo\Mine\referencia-srd-es\` (`SRD_CC_v5.1_ES.pdf`, CC-BY 4.0, descargado de Wizards el 2026-09-14; `srd-5.1-es.txt` es su texto extraído con `pymupdf`). Las dos rutas entran al conversor por variables de entorno (`FOUNDRY_SOURCE_DIR`, `SRD_ES_TXT`), nunca cableadas.
- **Nombres y prosa: solo del SRD español oficial. Nunca criterio propio** (*Second Wind* es «Tomar Aliento», no «Segundo aliento»; *wight* es «Tumulario»). Sin correspondencia en el SRD español → **inglés, marcado** (`nameEs: null`, `textEs: null`, `sinTraduccion: true`) y una línea en el informe de rechazos. El texto inglés **se conserva siempre** (`nameEn`, `textEn`).
- **Ninguna fórmula evaluable llega al catálogo.** Cada `@` de Foundry se traduce a una forma cerrada de `Origen` (`packages/shared/src/origen.schema.ts`): `fijo`, `modificador(ability)`, `competencia`, `escala(clave)`, `lanzamiento`, `nivelDeEspacio`, `cdDeConjuro` — más **`nivelDeClase(clase)`**, que esta tanda añade (T1). Lo que no cabe **se rechaza en voz alta** y ese ítem entra **como texto** (sin actividad), nunca torcido para que quepa.
- **Tipos de actividad que entran en A:** `save`→`salvacion`, `attack`→`ataque`, `damage`→`dados` (con `tipoDeDano`), `heal`→`dados` (sin `tipoDeDano`), `utility`→`utilidad`, `check`→`prueba`. **El `signo` de daño y curación se copia del que ya usa el motor** (`expresionDeDadosSchema` y el comentario de `activity.schema.ts:337`: «funde daño y curación»; mira un consumidor real en `activities.service.ts` antes de fijarlo — no se supone). `summon`, `transform`, `enchant`, `teleport`, `forward`, `cast`, `order` → **texto** (el ítem conserva su prosa; sin actividad; contado en el informe como «fuera de A»).
- **Los ficheros generados se commitean y no se editan a mano.** `apps/api/src/rules/catalog/generado/*.json` + `rechazos.md` llevan cabecera «GENERADO por scripts/convertir-catalogo.mjs — no editar». Una prueba regenera en memoria y compara con lo commiteado (fichero dorado): un cambio en el conversor **se ve como diff del catálogo** y lo lee una persona en la revisión.
- **Lo que se deriva no se guarda; los conteos cuadran o el conversor falla.** 320 conjuros exactos (319 `type: spell` + 1 `weapon` que hay que mirar y decidir en T0), 234 aptitudes (`type: feat` en `classfeatures`), 12 subclases, rasgos raciales (`races`, `type: feat`). Los números del plan del 8 se recontaron el 2026-09-14: 331/275/50 ficheros incluyen 51 carpetas (`type: Item`) que no cuentan.
- **Atribución:** `NOTICE.md` nombra las dos licencias sobre el mismo fichero: estructura de Foundry `dnd5e` (**MIT**) y contenido del SRD 5.1 en inglés **y en español** (**CC-BY 4.0**, con la frase literal que exige Wizards: «Esta obra incluye materiales extraídos del Documento de referencia del sistema 5.1 ("SRD 5.1") de Wizards of the Coast LLC»).
- **Código en inglés en el conversor y en shared; comentarios y documentación en español; identificadores del contrato como los nombra la spec** (`Actividad`, `Origen`, `usos`, `resetOn`).
- **Proceso por tarea:** unitarias donde cambia comportamiento + `pnpm update:estado` + `pnpm verify` limpio (**primer plano, `timeout: 600000` como parámetro de Bash, nunca `run_in_background`**) + un commit del orquestador. **Sin Playwright, sin e2e de API, sin revisión por tarea, sin ritual de mutación** (rigor según riesgo). Todo Bash que pueda pasar de 120 s lleva `timeout: 600000`. Frontera del encargo: no commitear, no empujar, no desplegar, no lanzar agentes, no desactivar pruebas ni bajar umbrales, no `git stash`.
- **No entra (3A.1):** `CharacterSpell` y la pestaña Conjuros (3A.2 T10/T11), lanzar/usar (3A.2), ataque de conjuro contra la CA (T19, 3A.2), objetos +N (HP-9b, fuera), monstruos (ya están), la edición 2024, traducir a ojo, invocar/transformar/encantar como mecánica (B).

## Decisiones de ejecución tomadas al escribir el plan (E-3A1-*)

| | Decisión | Por qué |
|---|---|---|
| E-3A1-1 | **El emparejamiento inglés↔español se hace por huella estructural** — `(nivel, escuela, tiempo de lanzamiento, alcance en pies↔metros ×0,3, componentes V/S/M, duración, concentración, ritual)`— y **solo** donde la huella sea única en las dos fuentes; los choques van a una **tabla a mano** en `scripts/convertir-catalogo/emparejamientos.json` (`{ "fireball": "Bola de fuego" }`), que el conversor exige que sea completa (sin choque sin resolver) o falla | Los números son idénticos en las dos ediciones; es la única clave que no exige traducir |
| E-3A1-2 | **Los rasgos de clase se emparejan por (clase, nivel, posición en la tabla de la clase)**: la tabla «El guerrero / Nivel / Rasgos» del SRD español lista los nombres por nivel en el mismo orden que el `advancement` de Foundry (`packs/_source/classes/*.yml`). Choques → la misma tabla a mano | No hay huella numérica para un rasgo; la tabla de la clase es el índice oficial |
| E-3A1-3 | **Las listas de conjuros por clase salen del SRD español** («Lista de conjuros del mago», por nivel), no de Foundry (su YAML de conjuro no lleva clases). Cada conjuro gana `classes: string[]` con las claves de nuestro catálogo (`wizard`, `cleric`…) | 3A.2 (T10) lo necesita y es la única fuente que lo tiene |
| E-3A1-4 | **`nivelDeClase` es la única forma nueva de `Origen`** (`{ tipo: "nivelDeClase", clase: string }`). `@mod`→`lanzamiento`; `@abilities.X.mod`→`modificador(X)`; `@item.level`→`nivelDeEspacio`; `@scale.<clase>.<clave>`→`escala("<clase>-<clave>")` **con la tabla inlinada** desde el `advancement` de Foundry al `scales` de la clase en `classes.ts` (como `barbarian-rages`); `@classes.<c>.levels`→`nivelDeClase(c)`; número literal→`fijo`. **Cualquier otra fórmula → rechazo** | Seis formas ya existen; una falta; nada más se inventa |
| E-3A1-5 | **Un ítem con varias actividades conserva todas** en `actividades: Actividad[]` (108 conjuros; 6 aptitudes). Para las aptitudes, `ClassFeature.grant` (que el motor ya consume para la Furia) se rellena con **la primera actividad que entre en A** y `usos` del ítem; las demás quedan en `actividades`. La Furia **no se regenera**: su `grant` a mano (verificado contra el SRD) manda, y el conversor **compara** y avisa si discrepa | El consumidor de hoy (`activities.module.ts:38`) lee un solo `grant`; ampliar a N es de 3A.2 |
| E-3A1-6 | **Salida en JSON validado con Zod al cargar** (`spellsCatalogSchema`, `classFeaturesCatalogSchema` en `packages/shared/src/catalog.schema.ts`), no en TS generado: `tsconfig.base.json` es `commonjs` sin `resolveJsonModule` → el cargador lee con `readFileSync` + `JSON.parse` + `schema.parse` una vez (módulo `apps/api/src/rules/catalog/generado/index.ts`) | Un JSON no puede colar código; Zod es la barrera, como con `GameEvent.payload` |
| E-3A1-7 | **La prosa se limpia en el conversor a texto plano con saltos** (`<p>`→`\n\n`, `<strong>`→sin marca, `@UUID[...]{Nombre}`→`Nombre`, `&nbsp;`→espacio) y **«A niveles superiores» va aparte** (`higherLevelsEn`/`higherLevelsEs`) | Es una regla, no prosa; y la pantalla nunca parsea HTML |
| E-3A1-8 | **El catálogo español de un conjuro se corta del texto extraído entre su cabecera y la siguiente** («Nombre \n Escuela nivel N \n Tiempo de lanzamiento…»); el bloque «A niveles superiores.» se separa por su rótulo. Metros del SRD español se ignoran (la estructura manda desde Foundry) | Extracción medida el 2026-09-14: 295 cabeceras regulares de 320; las ~25 restantes se resuelven en T0 (probablemente cabeceras partidas por salto de página) |
| E-3A1-9 | **Se prueba la fórmula, no cada caso**: (a) fichero dorado regenerado en memoria = commiteado; (b) invariantes (conteos, nivel 0–9, ocho escuelas, actividad-o-texto sin vacíos, concentración ⇒ duración no instantánea, truco ⇒ sin espacio, toda aptitud con clase y nivel, ninguna sin nombre inglés, ningún `@` en la salida); (c) **tabla de ~12 casos raros elegidos a mano** con la `Actividad` esperada literal; (d) una unitaria de `nivelDeClase` en `engine.spec.ts`. **Nada por conjuro** | Decisión del autor |
| E-3A1-10 | **T0 no es un informe suelto: es el `emparejamientos.json` inicial y la tabla de casos raros**, escritos a mano sobre 20 conjuros + 8 aptitudes antes de que exista el conversor; T1 los consume | «En papel» que la máquina luego comprueba |
| E-3A1-11 | **El ítem `type: weapon` de `spells/` y el de `classfeatures/`** se miran en T0 y se decide uno a uno (probablemente carpetas mal tipadas o un arma de conjuro): entran como rechazo declarado si no son conjuro/aptitud | Cuadrar 320 exige saber qué es cada excepción |
| E-3A1-12 | **Los `ActiveEffects` de Foundry (167 conjuros, 20 aptitudes) no se convierten en A**: se cuentan en el informe como «efecto pasivo fuera de A» y el texto los cubre | Es B (condiciones desde conjuros, modificadores) |

## Mapa de ficheros

| Fichero | Responsabilidad | Tarea |
|---|---|---|
| `docs/superpowers/specs/2026-09-14-3a1-tarea-0-prueba-de-fuego.md` **(nuevo)** | Informe T0: los 20 + 8 mapeados a mano, los ~25 conjuros sin cabecera regular y cómo se cortan, las dos excepciones `weapon`, conteos | T0 |
| `scripts/convertir-catalogo/emparejamientos.json` **(nuevo)**, `scripts/convertir-catalogo/casos-raros.json` **(nuevo)** | Tabla a mano inglés→español para los choques de huella; tabla de casos raros con la `Actividad` esperada | T0 (semilla), T2/T3 (completan) |
| `packages/shared/src/origen.schema.ts` (+ test), `apps/api/src/rules/engine.ts` (+ `engine.spec.ts`) | `nivelDeClase` | T1 |
| `packages/shared/src/catalog.schema.ts` **(nuevo)** (+ test), `index.ts` | `srdSpellSchema`, `spellsCatalogSchema`, `srdFeatureSchema`, `classFeaturesCatalogSchema`, `raceFeaturesCatalogSchema` | T1 |
| `scripts/convertir-catalogo.mjs` **(nuevo)**, `scripts/convertir-catalogo/*.mjs` **(nuevo)**: `foundry.mjs` (leer YAML, rechazar 2024), `srd-es.mjs` (cortar el texto español), `huella.mjs` (emparejar), `origen.mjs` (`@`→`Origen`), `actividad.mjs` (actividad Foundry→`Actividad`), `salida.mjs` (JSON + `rechazos.md`) | El conversor | T1 |
| `scripts/convertir-catalogo/__tests__/*.test.mjs` **(nuevo)** | Pruebas puras del conversor (node:test o vitest — el que ya use `scripts/`; si ninguno, `node --test`) | T1–T3 |
| `apps/api/src/rules/catalog/generado/spells-srd.json` **(nuevo)**, `class-features-srd.json` **(nuevo)**, `race-features-srd.json` **(nuevo)**, `rechazos.md` **(nuevo)**, `index.ts` **(nuevo)** (+ `generado.spec.ts`: dorado + invariantes) | El catálogo generado y su cargador validado | T2, T3 |
| `apps/api/src/rules/catalog/classes.ts` | `scales` nuevos inlinados por el conversor (`rogue-sneak-attack`, `monk-ki`…) — **escritos por el conversor en un bloque marcado**, o a mano si son ≤ 10 (T0 decide) ; `ClassFeature.textEs/textEn/actividades` | T3 |
| `apps/api/src/rules/catalog/types.ts` | `ClassFeature` gana `nameEn?`, `textEs?`, `textEn?`, `actividades?`, `sinTraduccion?` | T3 |
| `NOTICE.md`, `docs/05-datos.md`, `docs/01-arquitectura.md`, `docs/08-pruebas.md`, `docs/decisiones.md` (E-3A1-* → D-CF-92…), `docs/02-entorno.md` (las dos rutas externas y cómo regenerar) | Atribución y documentación | T4 |

---

### Task 0: La prueba de fuego — 20 conjuros y 8 aptitudes a mano, la huella, y las excepciones

**Files:**
- Create: `docs/superpowers/specs/2026-09-14-3a1-tarea-0-prueba-de-fuego.md`
- Create: `scripts/convertir-catalogo/emparejamientos.json`, `scripts/convertir-catalogo/casos-raros.json`
- **No se escribe código de producción.** Se puede escribir un script desechable en el scratchpad para medir.

**Interfaces:**
- Consumes: `packages/shared/src/activity.schema.ts` (`Actividad`, `expresionDeDadosSchema`, `activacionSchema`, `rangoSchema`, `duracionSchema`), `origen.schema.ts`, `apps/api/src/rules/catalog/classes.ts` (`RASGO_FURIA` como referencia de forma), Foundry `packs/_source/{spells,classfeatures,classes,races}`, `referencia-srd-es/srd-5.1-es.txt`.
- Produces: `emparejamientos.json` (`{ "<identifier de Foundry>": "<nombre español exacto del SRD>" }`, al menos los 28 de esta tarea y todos los choques que la medición encuentre), `casos-raros.json` (`[{ id, fuente: "spell"|"feature", esperado: <Actividad literal>, porque }]`, ≥ 12 casos), y el informe.

- [ ] **Step 1: Los veinte conjuros y las ocho aptitudes.** Conjuros: *Magic Missile*, *Fireball*, *Cure Wounds*, *Fire Bolt*, *Bless* (bono `1d4` no entero), *Shield* (`ac.bonus`), *Sleep* (`5d8` sin objetivo por CD — texto), *Spiritual Weapon* (ataque de conjuro con dados), *Healing Word*, *Sacred Flame* (salvación sin mitad), *Burning Hands* (mitad), *Hold Person* (salvación sin daño), *Revivify* (cura 1, `custom.formula: '1'`), *Magic Weapon* (enchant → texto), *Conjure Animals* (summon → texto), *Polymorph* (transform → texto), *Counterspell* (activación `reaction` + `check`), *Lesser Restoration* (utility puro), *Scorching Ray* (3 ataques), *Mass Cure Wounds* (varios objetivos). Aptitudes: *Rage* (ya a mano — comparar), *Second Wind*, *Sneak Attack*, *Lay on Hands* (dos actividades), *Channel Divinity: Turn Undead*, *Ki* (usos por escala), *Wild Shape*, *Action Surge*. Para cada uno, escribe en el informe: la `Actividad` **literal** que le corresponde en nuestro esquema (o «texto» con el motivo), la forma de `Origen` de cada `@`, y **el nombre y las primeras líneas del texto español** tal como están en `srd-5.1-es.txt` (búscalos; anota si el nombre difiere de lo que habrías supuesto — es la prueba de la regla).
- [ ] **Step 2: La huella.** Con un script desechable, calcula para los 320 de Foundry la tupla `(level, school, activation.type+value, range.value en ft, properties V/S/M, duration.value+units, concentration, ritual)` y para las cabeceras del texto español `(nivel, escuela, tiempo, alcance en m, componentes, duración, concentración, ritual)`; cuenta cuántas huellas son únicas en cada lado y cuántas casan 1:1. **Escribe el número** y lista los choques; los choques van a `emparejamientos.json` a mano (ese es el trabajo de esta tarea, no del conversor).
- [ ] **Step 3: Los que no tienen cabecera regular.** Los ~25 conjuros del texto español cuya cabecera no casa con `Nombre \n Escuela nivel N \n Tiempo de lanzamiento` (medido el 2026-09-14: 295 de 320): mira por qué (salto de página, «(ritual)», dos líneas de nombre) y escribe la regla de corte que los recoge, con ejemplos. Igual para las tablas de clase («El guerrero / Nivel / Rasgos») y las listas de conjuros por clase: la regla que las lee.
- [ ] **Step 4: Las excepciones.** El `type: weapon` en `spells/` y en `classfeatures/`, los 11 y 40 `type: Item` (carpetas), las 12 subclases: qué es cada cosa y qué hace el conversor con ella. Y las fórmulas `@`: **lista completa** de las distintas que aparecen en `spells` + `classfeatures` + `races` (medido: ~30, de ~6 formas) con la forma de `Origen` de cada una; las que no caben, con su motivo.
- [ ] **Step 5: `casos-raros.json`** con ≥ 12 entradas (los 8 de aptitudes y al menos *Fireball*, *Cure Wounds*, *Fire Bolt*, *Revivify*, *Scorching Ray*, *Counterspell*), cada una con la `Actividad` esperada **literal** (copiada del informe) — es la prueba de T2/T3.
- [ ] **Step 6: Si el mapeo pide inventar un campo, PARA** y escríbelo en el informe como «vuelve al esquema»; el orquestador decide. Commit del informe y los dos JSON.

---

### Task 1: El conversor — leer, emparejar, traducir `@`, rechazar en voz alta; y `nivelDeClase`

**Files:**
- Modify: `packages/shared/src/origen.schema.ts` (+ `__tests__/origen.schema.test.ts`), `apps/api/src/rules/engine.ts` (+ `engine.spec.ts`)
- Create: `packages/shared/src/catalog.schema.ts` (+ `__tests__/catalog.schema.test.ts`); Modify: `packages/shared/src/index.ts`
- Create: `scripts/convertir-catalogo.mjs`, `scripts/convertir-catalogo/{foundry,srd-es,huella,origen,actividad,salida}.mjs`, `scripts/convertir-catalogo/__tests__/*.test.mjs`
- Modify: `package.json` (raíz): script `"catalogo:convertir": "node scripts/convertir-catalogo.mjs"` y `"catalogo:test": "node --test scripts/convertir-catalogo/__tests__/"` (o vitest si `scripts/` ya lo usa — mira `scripts/*.spec.*`); `pnpm test` de la raíz debe incluirlo.

**Interfaces:**
- Consumes: T0 (`emparejamientos.json`, `casos-raros.json`, las reglas de corte del informe).
- Produces:
  - `Origen` gana `{ tipo: "nivelDeClase", clase: string }`; `resolverOrigen` (o como se llame en `engine.ts`) lo resuelve al nivel de esa clase del personaje (`classKey === clase ? level : 0`, hasta que haya multiclase — anótalo).
  - `srdSpellSchema` = `{ key, nameEn, nameEs: string|null, sinTraduccion: boolean, level 0–9, school: enum de 8 claves, castingTime: Activacion, range: Rango, components: { v, s, m, materials?: Materiales }, duration: Duracion, ritual, concentration, textEn, textEs: string|null, higherLevelsEn?, higherLevelsEs?, classes: string[], actividades: Actividad[], fueraDeA: string[] (tipos de Foundry no convertidos), efectosPasivos: number }`; `srdFeatureSchema` = `{ key, class, subclass?, level, nameEn, nameEs, sinTraduccion, textEn, textEs, usos?: { max: Origen, resetOn }, actividades: Actividad[], fueraDeA, efectosPasivos }`; `raceFeatureSchema` igual con `race`/`subrace`.
  - CLI: `pnpm catalogo:convertir` lee `FOUNDRY_SOURCE_DIR` y `SRD_ES_TXT`, escribe en `apps/api/src/rules/catalog/generado/` y **sale con código ≠ 0** si hay un rechazo no declarado; `--check` regenera en memoria y compara con lo commiteado.
  - Módulos puros con firma estable: `leerFoundry(dir): { spells, features, races, folders, rechazados }`; `cortarSrdEs(txt): { conjuros: Map<nombreEs, bloque>, tablasDeClase, listasPorClase }`; `emparejar(spellsEn, conjurosEs, tablaAMano): { pares, choques, sinPareja }`; `origenDe(formula: string): Origen | { rechazo: string }`; `actividadDe(activityFoundry, ctx): Actividad | { texto: true, tipo } | { rechazo }`.

- [ ] **Step 1: `nivelDeClase`, prueba primero.** En `origen.schema.test.ts`: `{ tipo: "nivelDeClase", clase: "fighter" }` valida; `clase` vacía no. En `engine.spec.ts`, junto a la prueba de `lanzamiento` (~línea 990): un guerrero nivel 5 resuelve `nivelDeClase("fighter")` = 5 y `nivelDeClase("wizard")` = 0, con su paso de traza. Rojo → implementar → verde.
- [ ] **Step 2: Los esquemas del catálogo** en `catalog.schema.ts`, exportados desde `index.ts`, con una prueba que parsea un conjuro mínimo válido y rechaza uno con `level: 10`, uno con `actividades: []` y `textEn: ""` (actividad-o-texto), y uno con un `@` dentro de cualquier string (`z.string().refine(s => !s.includes("@"))` en `textEs/textEn` no — solo en campos de fórmula: como el catálogo ya no lleva fórmulas, comprueba que `JSON.stringify(actividades)` no contiene `"@"`).
- [ ] **Step 3: `foundry.mjs`** — prueba: un YAML con `source.rules: '2024'` se rechaza con motivo; una carpeta (`type: Item`) se cuenta aparte; `type: weapon` va a `rechazados` con «no es conjuro/aptitud» salvo que T0 decidiera otra cosa. Implementa con `js-yaml` (añádelo a `devDependencies` de la raíz si no está).
- [ ] **Step 4: `srd-es.mjs`** — pruebas sobre un fragmento fijo del texto (pega en el test 3 cabeceras reales, una partida como las que T0 documentó): corta nombre, escuela, nivel, ritual, texto y «A niveles superiores»; lee una tabla de clase (fragmento real de «El guerrero») a `[{ nivel, rasgos: [...] }]`; lee una lista de conjuros por clase a `{ clase, nivel, nombres }`.
- [ ] **Step 5: `huella.mjs`** — prueba: dos conjuros con huella única casan; dos con la misma huella y sin entrada en la tabla a mano salen en `choques`; con entrada, casan; un español sin inglés sale en `sinPareja`.
- [ ] **Step 6: `origen.mjs`** — prueba con **cada** fórmula distinta que T0 listó (tabla en el test): `"@mod"`→`lanzamiento`, `"@abilities.cha.mod"`→`modificador("cha")`, `"@item.level"`→`nivelDeEspacio`, `"@scale.rogue.sneak-attack"`→`escala("rogue-sneak-attack")`, `"@classes.fighter.levels"`→`nivelDeClase("fighter")`, `"1"`→`fijo(1)`, `"5 * @classes.paladin.levels"`→ **rechazo** (o la forma que T0 decidió), `"@item.uses.value"`→rechazo.
- [ ] **Step 7: `actividad.mjs`** — prueba con la tabla `casos-raros.json` de T0 (léela en el test): para cada caso, `actividadDe(yamlDeFoundry)` **es igual** a `esperado` (`deepEqual`). Los tipos fuera de A devuelven `{ texto: true, tipo }`. `onSave: "half"`→`siSalva: "mitad"`, `dc.calculation: "spellcasting"`→`cd: cdDeConjuro`, `healing`→`dados` con el signo de curación, `attack.type.value`→`ataque.bono: lanzamiento` (el bono de ataque de conjuro es la característica de lanzamiento + competencia: mira cómo lo expresa hoy `spiritual-weapon` si existe o la Furia; si el esquema no lo expresa, **rechazo y a T19**), `scaling.mode: "whole"`→`escalado: { por: "espacio", n, caras }`, `consumption.targets[itemUses]`→`usos` del ítem, `uses.recovery[].period sr/lr`→`SHORT_REST/LONG_REST`.
- [ ] **Step 8: `salida.mjs` y el CLI** — escribe los tres JSON ordenados por `key` (diff estable), `rechazos.md` con tres tablas (2024, sin traducción, fórmula/actividad fuera de A) y **conteos al pie**; `--check` compara byte a byte. Prueba: con un directorio de 3 YAML sintéticos y un texto de 3 cabeceras, la salida es la esperada y `--check` pasa; tocar un YAML hace fallar `--check`.
- [ ] **Step 9:** `pnpm catalogo:test` en verde; `pnpm update:estado`; `pnpm verify`.

---

### Task 2: Los 320 conjuros — generar, cuadrar, cargar

**Files:**
- Create: `apps/api/src/rules/catalog/generado/spells-srd.json`, `rechazos.md`, `index.ts`, `generado.spec.ts`
- Modify: `scripts/convertir-catalogo/emparejamientos.json` (completar los choques), `casos-raros.json` (si T0 dejó alguno pendiente)
- Modify: `apps/api/src/rules/catalog/index.ts` (exporta `SRD_SPELLS`, `SRD_SPELL_POR_KEY`)

**Interfaces:**
- Consumes: T1 entero.
- Produces: `SRD_SPELLS: readonly SrdSpell[]` (320), `SRD_SPELL_POR_KEY: ReadonlyMap<string, SrdSpell>`, cargados y validados una vez en `generado/index.ts` (`readFileSync` + `spellsCatalogSchema.parse`; un JSON inválido revienta al arrancar, a propósito).

- [ ] **Step 1:** `FOUNDRY_SOURCE_DIR=… SRD_ES_TXT=… pnpm catalogo:convertir`. Lee `rechazos.md`. **Meta: 0 conjuros sin traducción** (la huella + la tabla a mano deben cubrir los 320; cada uno que quede sin pareja se resuelve a mano en `emparejamientos.json`, no se acepta). Fórmulas rechazadas: cada una va a texto y queda contada.
- [ ] **Step 2: `generado.spec.ts`** — (a) dorado: `execFileSync("node", ["scripts/convertir-catalogo.mjs", "--check"])` pasa **solo si las variables de entorno existen**; si no (CI), la prueba se salta con `it.skip` y **lo dice** (no se puede regenerar sin las fuentes externas; el JSON commiteado es la verdad en CI); (b) invariantes sobre el JSON cargado: 320; nivel 0–9; las 8 escuelas y ninguna otra; `nameEs` en todos; `actividades.length > 0 || textEn.length > 0` en todos; `concentration ⇒ duration.unidad !== "instantanea"`; `level === 0 ⇒` ninguna actividad con `consumption` de espacio; `classes` no vacío en todos y solo claves de `SRD_CLASSES`; `JSON.stringify(spell).includes("@") === false`; los 108 con más de una actividad siguen teniendo más de una (cuenta ≥ 100, fija el número exacto que salga); (c) los 4 contrastados a mano de la spec (*Proyectil mágico*, *Bola de fuego*, *Curar heridas*, *Escudo*) con su `Actividad` literal **y su nombre español**.
- [ ] **Step 3:** el cargador `generado/index.ts` y la exportación desde `catalog/index.ts`. Comprueba que `apps/api` compila el JSON en `dist/` (`nest build` copia assets? si no, añade `assets` en `nest-cli.json` o léelo con `path.join(__dirname, …)` desde `src` — mira cómo hace `monsters-srd.ts` con datos y cómo el Dockerfile copia `dist`; **el JSON tiene que estar en la imagen de producción** — anótalo en el informe con la evidencia).
- [ ] **Step 4:** `pnpm update:estado`; `pnpm verify`.

---

### Task 3: Las aptitudes — clase (234), subclase (12) y raza — y los `scales` inlinados

**Files:**
- Create: `apps/api/src/rules/catalog/generado/class-features-srd.json`, `race-features-srd.json`
- Modify: `apps/api/src/rules/catalog/types.ts` (`ClassFeature` gana `nameEn?`, `textEs?`, `textEn?`, `actividades?`, `sinTraduccion?`), `classes.ts` (`scales` nuevos + `features` enriquecidas desde el generado), `races.ts` (ídem), `generado/index.ts`, `generado.spec.ts`
- Modify: `scripts/convertir-catalogo/emparejamientos.json` (choques de rasgos)

**Interfaces:**
- Consumes: T1, T2; `SRD_CLASSES[].features` (`f(level, key, name)`), `advancement` de `packs/_source/classes/*.yml` (ScaleValue).
- Produces: cada `ClassFeature` de `SRD_CLASSES` y de las subclases con `textEs/textEn/actividades` (y `grant` donde la primera actividad entra en A, E-3A1-5); `scales` nuevos en `classes.ts`; rasgos raciales con lo mismo en `races.ts`.

- [ ] **Step 1:** Generar. `rechazos.md` cuenta: sin actividad (texto puro, ~124), fuera de A, fórmulas rechazadas, sin traducción (**meta 0**: la tabla de la clase da el nombre de cada rasgo).
- [ ] **Step 2: Enlazar por `key`.** Las `features` de `classes.ts` se enriquecen **en el cargador**, no reescribiendo `classes.ts` a mano: `generado/index.ts` exporta `enriquecerClases(SRD_CLASSES, generado)` que, por `key` (= `identifier` de Foundry, verifica que coinciden; los que no, tabla a mano), añade `textEs/textEn/actividades/nameEn` y, si no hay `grant` a mano y la primera actividad entra en A, construye `grant` (`id: "<clase>-<key>"`, `labelKey: "class.<clase>.<key>"`, `usos`). **La Furia conserva su `grant` a mano**; el cargador compara y **falla la prueba** si el generado discrepa en `usos.max` o `resetOn`.
- [ ] **Step 3: `scales`.** Las claves `@scale.<clase>.<x>` que T1 tradujo a `escala("<clase>-<x>")` necesitan su tabla en `SRD_CLASSES[].scales`: el conversor la emite en el JSON (`scales: { "<clase>-<x>": number[] }` desde el `advancement` de tipo `ScaleValue` de la clase) y el cargador la funde con las de `classes.ts` — la de la Furia (`barbarian-rages`) manda si difiere, y se avisa.
- [ ] **Step 4: Invariantes** en `generado.spec.ts`: 234 aptitudes de clase, 12 subclases con ≥ 1 rasgo cada una, toda aptitud con `class` y `level` 1–20, ninguna sin `nameEn`, `nameEs` en todas, ninguna con `actividades: []` **y** `textEn: ""`; `enriquecerClases` no deja ningún `feature` de `SRD_CLASSES` sin texto; **cuatro contrastadas a mano** contra el SRD español e inglés: *Tomar Aliento* (`dados` 1d10 + `nivelDeClase(fighter)`, usos 1 `SHORT_REST`), *Ataque Furtivo* (`dados` por `escala("rogue-sneak-attack")`), *Imposición de Manos* (usos `5 × nivel` → si la fórmula se rechazó, texto + `usos` a mano en la tabla de casos), *Acción Súbita* (usos 1 `SHORT_REST`, `utilidad`). Un bárbaro de nivel 5 tiene «Ataque Adicional» **con texto**.
- [ ] **Step 5:** `pnpm update:estado`; `pnpm verify`.

---

### Task 4: `NOTICE.md`, documentación, decisiones

**Files:**
- Modify: `NOTICE.md`, `docs/02-entorno.md`, `docs/05-datos.md`, `docs/01-arquitectura.md`, `docs/08-pruebas.md`, `docs/decisiones.md`, `docs/06-pendientes.md`

- [ ] **Step 1: `NOTICE.md`** — dos licencias sobre los mismos ficheros generados: estructura de Foundry `dnd5e` (MIT, con su aviso), contenido del SRD 5.1 en inglés y en español (CC-BY 4.0), con la frase literal de atribución de Wizards en español y en inglés.
- [ ] **Step 2: `docs/02-entorno.md`** — las dos rutas externas, cómo obtener cada fuente (el clon de Foundry; el PDF de Wizards y `pymupdf` para extraer `srd-5.1-es.txt`), `pnpm catalogo:convertir` y `--check`, y que **en CI la prueba dorada se salta** porque las fuentes no viajan.
- [ ] **Step 3: `docs/05-datos.md`** — el catálogo generado: qué lleva un conjuro y una aptitud, que **no toca la base** (solo lectura, en código), y la regla «generado, no editado». `docs/01-arquitectura.md`: `scripts/convertir-catalogo/` y `catalog/generado/` en el mapa. `docs/08-pruebas.md`: qué demuestran `catalogo:test` y `generado.spec.ts`, y qué **no** (nada por conjuro; E-3A1-9).
- [ ] **Step 4: `docs/decisiones.md`** — E-3A1-1…12 como D-CF-92…103, fechadas 2026-09-14, enlazando a este plan; más la del conversor→`Origen` que el autor tomó en conversación (memoria «conversor con vocabulario cerrado»). `docs/06-pendientes.md`: lo que el informe de rechazos dejó fuera de A, agrupado (fórmulas rechazadas, tipos fuera de A, efectos pasivos), como **una** ficha «Lo que 3A.1 dejó como texto», con los conteos.
- [ ] **Step 5:** `pnpm update:estado`; `pnpm check:docs`; `pnpm verify`.

---

## Al cerrar la tanda (lo hace el orquestador)

1. **Una revisión Opus de la rama** que **lee `rechazos.md` y muestrea el fichero dorado** (20 conjuros y 10 aptitudes al azar contra el SRD español e inglés: nombre, texto, actividad) + **una** ola.
2. Sin Playwright ni e2e de API: esta tanda no toca pantalla ni ruta. `pnpm verify` entero sobre la rama.
3. Docs de cierre (`07-historial.md`, `como-seguir.md` §0, `00-INDEX` generado); push; **fusión a `main` con permiso del autor**; sin desplegar.
4. Lo siguiente: **3A.2** — y antes de planificarla, las tres preguntas del plan del 8 al autor (libro sembrado, preparar en combate, trucos).
