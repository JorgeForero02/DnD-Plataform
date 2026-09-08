# Paso 3 — el catálogo y los conjuros del personaje · plan de implementación

> **Para quien lo ejecute:** las tareas van **en orden** y cada una lleva los cuatro pasos completos
> con su **mutación de una pieza cada vez**. Un commit por tarea, `pnpm verify` en verde antes de
> cada uno, mensaje en inglés (Conventional Commits).

**Goal:** que un mago exista. Hoy hay espacios de conjuro y **ni un hechizo**; al terminar, los 320
conjuros del SRD 5.1 están en el catálogo, un personaje puede decir cuáles son suyos, y lanzarlos
usa el motor de actividades que el paso 2 ya construyó.

**Arquitectura:** un **conversor** (script, fuera del servidor) traduce el YAML de Foundry a nuestro
formato de catálogo en TypeScript, como ya hacen `monsters-srd.ts` y `weapons.ts`. Una tabla nueva
—`CharacterSpell`— dice qué conjuros son de quién. **Lanzar no se construye: ya existe**, es una
actividad con `consumption` de un espacio.

**Specs que este plan implementa** (en `docs/superpowers/specs/`):

- `2026-09-05-paso-3-catalogo-design.md` — el conversor y la partición de fuentes
- `2026-09-07-paso-3-lo-que-cabe-medido.md` — **el censo de los 320, medido entero**
- `2026-09-07-los-conjuros-del-personaje-design.md` — los tres modelos de preparación
- `2026-09-05-conjuros-design.md` — la tesis fundacional

**Léelas. Este plan no las resume: las ejecuta.**

---

## Constantes globales

Aplican a **todas** las tareas y no se repiten en cada una.

- **SRD 5.1 (2014).** Las carpetas de Foundry **sin sufijo `24`**. El conversor **rechaza** cualquier
  fichero cuyo `system.source.rules` no sea `'2014'`. La copia de Foundry vive **fuera del
  repositorio** (`Mine/referencia-foundry-dnd5e`) y **su código no se ejecuta jamás**: se leen sus
  datos.
- **Nombres y prosa: traducción oficial al español.** Nunca criterio propio — está medido que falla:
  *goblin* es «Goblin» y no «trasgo», *wight* es «Tumulario» y no «Espectro». **Dos de quince.** Sin
  traducción oficial: **inglés, marcado, con ficha**. Nunca inventado.
- **Se conserva el texto en inglés junto al español.** Es la fuente para resolver dudas de reglas, y
  este proyecto ya tiene escrito que **manda el inglés**.
- **La autorización se comprueba en el servidor.** Y **un botón que el servidor contesta con 403 es
  un defecto declarado**: si una tarea cierra una puerta en la API, la pantalla deja de ofrecerla en
  el mismo commit.
- **Ningún valor de enumeración llega a la pantalla.** La forma legible se escribe una vez por
  dominio y se importa.
- **Cuenta y avisa; no impide.** Doctrina del paso 2, y gobierna todo lo de aquí.
- **Lo que se deriva no se guarda.** Nunca una segunda verdad.
- **No se despliega.** Lo lanza el autor a mano.
- **La máquina:** `pnpm verify` **no incluye los e2e** — córrelos aparte. Si el puerto 3000 está
  ocupado, `WORKTREE_SLOT=1` (API 3100, web 5273, base `dnd_wt1`); **`pnpm db:slot` está roto**
  (`Command "prisma" not found`), la base se crea con `prisma migrate deploy`. Una sola tanda de
  Playwright y cierra lo que abras.
- **La regla de las fichas:** arregla en vez de abrir ficha si le caben los cuatro pasos, con tope
  de **tres** extras. Ficha solo por **pantalla ajena** o **de verdad grande**. *«Necesita decisión
  del autor» no es motivo automático*: **mides y mandas la medición, no la pregunta.**

---

## Los números, para que nadie los recuente

```
320 conjuros · 492 actividades · todos con source.rules '2014'
las cinco actividades cubren 445 de 492 = 90%
108 de 320 tienen MÁS DE UNA actividad (máximo 9)   ← si el modelo asume una, rompe en 108
activación: action 375 · special 79 · heredada 30 · bonus 7 · hour 1

cobertura del motor:  61% hoy → 72% con lo temporal → 81% con el vocabulario numérico
el 18% restante es `special` DEL PROPIO SRD: texto, y lo arbitra el DM (decisión del autor)

puerta numérica: 72 conjuros · 316 cambios · 68 claves
  26% ventaja/desventaja (ya existe) · 24% ruido · 14% cubierto · 36% falta
```

---

## Bloque A — el conversor y el catálogo

### Tarea 0 · La prueba de fuego, ANTES de escribir el conversor

**No es opcional y no se salta.** La tarea 0 del paso 2 mapeó **diez** conjuros a mano y **obligó a
nueve cambios de esquema**. Repetirla aquí cuesta una mañana y ahorra rehacer el conversor entero.

**Files:** `docs/superpowers/specs/` (un informe nuevo). **No se escribe código de producción.**

- [ ] **Paso 1.** Coge **veinte** conjuros elegidos a propósito, no los veinte primeros: al menos
      tres con **más de una actividad** (son 108 de 320), dos con activación `special`, uno con
      `summon`, uno con `enchant`, uno con `transform`, *Bendición* (el `+1d4` que no es entero),
      *Escudo* (`ac.bonus`, que sí cabe hoy), y *Proyectil mágico*, *Bola de fuego*, *Curar heridas*.
- [ ] **Paso 2.** Mapea cada uno **a mano** contra el modelo de actividades del paso 2. Anota **cada
      campo que no encaja**, sin torcer nada para que quepa.
- [ ] **Paso 3.** Escribe el informe: qué entra tal cual, qué necesita vocabulario nuevo, qué se
      queda en texto. **Con los conteos.**
- [ ] **Paso 4.** **Si el mapeo pide inventar campos, PARA.** La spec lo dice con todas las letras:
      *«vuelve al paso 2. Torcer el conversor para que quepa es cómo se corrompe un modelo.»*
- [ ] **Paso 5.** Commit del informe.

### Tarea 1 · El conversor: leer, rechazar en voz alta, y no escribir nada todavía

**Files:** crear `scripts/convertir-catalogo.mjs` · test junto a él.

**Vive en `scripts/`, fuera del servidor, y no se ejecuta en producción ni en el arranque.** Se
puede volver a ejecutar. No toca la base: el catálogo del SRD es de solo lectura y vive en el
código.

- [ ] **Paso 1 · La prueba que falla:** un fichero con `source.rules: '2024'` es **rechazado**, y el
      informe dice por qué. Córrela y mírala fallar.
- [ ] **Paso 2.** El conversor lee YAML y **para y lo dice** cuando: `rules` no es `'2014'`; una
      actividad usa un tipo que no está entre las cinco **y el conjuro no tiene texto**; falta un
      campo obligatorio; o un nombre no tiene traducción oficial conocida.
- [ ] **Paso 3.** Al terminar imprime **cuántos entraron, cuántos se rechazaron y por qué, uno a
      uno**. *Un catálogo que se importa a medias en silencio es peor que no importarlo.*
- [ ] **Paso 4 · Mutación:** quitar la comprobación de `rules` deja pasar un fichero de 2024 y la
      prueba enrojece. Quitar el informe de rechazos enrojece la suya, no la otra.
- [ ] **Paso 5.** Commit.

### Tarea 2 · `classfeatures` (235) y `subclasses` (12)

**Van primero, pero NO por el motivo que dice la spec.** Aquella decía que arreglaban un fallo vivo
—`resolve.ts` aplicando los rasgos de todas las subclases— **y ese fallo se arregló en el paso 2**
(`resolve.ts:447`, `subclassKey` existe en `schema.prisma:609`). **Corrige la spec al citarla.**

**El motivo que sigue en pie:** son **el material de las once aptitudes** que un guerrero, un
bárbaro y un mago de nivel 3 necesitan, y hoy cada aptitud es **solo un nombre** — un bárbaro de
nivel 5 juega exactamente igual que un guerrero.

- [ ] **Paso 1 · La prueba que falla:** un bárbaro de nivel 5 tiene «Ataque adicional» **con su
      texto de reglas y su actividad**, no solo el nombre.
- [ ] **Paso 2.** Convertir e importar, con la partición de fuentes: estructura de Foundry, nombre y
      prosa del SRD español, inglés conservado.
- [ ] **Paso 3 · Invariantes**, que es donde no se ahorra: toda aptitud tiene nivel y clase; ninguna
      vacía; **los conteos cuadran**; y **cuatro contrastadas a mano contra el SRD**.
- [ ] **Paso 4 · Mutación** y commit.

### Tarea 3 · Los 320 conjuros

**El bloque grande, y el que hace que un mago exista.**

- [ ] **Paso 1 · La prueba que falla:** el catálogo tiene 320 conjuros, todos con nivel de 0 a 9 y
      una de las ocho escuelas.
- [ ] **Paso 2.** Convertir. **El `description.value` viene con HTML** (`<p>`, `<strong>`): se limpia
      **en el conversor, nunca en la pantalla**, a texto plano con saltos, y **«A niveles
      superiores» va como campo aparte** porque es una regla y no prosa.
- [ ] **Paso 3 · Los invariantes de la spec, los seis:** nivel 0-9 y ocho escuelas · **actividad o
      texto, ninguno vacío** · concentración declarada en `properties` y duración no instantánea ·
      un truco no gasta espacio · **los conteos cuadran** · y **cuatro contrastados a mano**:
      *Proyectil mágico*, *Bola de fuego*, *Curar heridas*, *Escudo*. **Cuatro bien mirados valen
      más que 320 por encima.**
- [ ] **Paso 4 · El invariante que la spec no nombra y este plan añade:** **108 conjuros tienen más
      de una actividad y uno llega a nueve.** Una prueba tiene que fijar que el modelo las admite
      todas — si asume una por conjuro, rompe en 108 casos y ningún otro invariante lo caza.
- [ ] **Paso 5 · Mutación** y commit.

### Tarea 4 · `NOTICE.md` y la atribución

- [ ] **Paso único.** Ampliar `NOTICE.md`: la **estructura** viene del sistema `dnd5e` de Foundry
      (**MIT**) y el **contenido** del SRD 5.1 (**CC-BY 4.0**). **Son dos licencias distintas sobre
      el mismo fichero y las dos se nombran.** Commit.

---

## Bloque B — el vocabulario que falta, y las fichas pendientes

**Este bloque existe porque el catálogo importa conjuros que el motor no sabe ejecutar.** Las tres
primeras son fichas abiertas del paso 2.

### Tarea 5 · La segunda puerta (ficha **P2-4**, decidida como `D-P2-11`)

**Files:** `character-sheet.service.ts` (`changeHp`) · `roll-requests.service.ts` (`create`).

**Decidida por el autor el 2026-09-07 y no se re-litiga.** Un jugador puede curar a otro y pedirle
una salvación **solo desde una actividad ya autorizada** sobre un objetivo que `canView` le deja
ver. El `PATCH` directo sigue exigiendo dueño-o-DM.

**El precedente a copiar existe:** `recordFromEngine` (`game-events.service.ts:224`), que el motor
usa en cuatro sitios. **Aflojar `requireEditable` a secas está descartado**: abriría el `PATCH` de
cualquier personaje ajeno. **Llamar con el id del DM sería un diputado confundido de manual.**

**Y la puerta está cerrada por los dos lados**, medido: `roll-requests.service.ts:104` vuelve a
comprobar `miembro.role !== "DM"` incluso en la ruta interna que recibe un `tx`.

- [ ] **Paso 1 · La prueba que falla:** un clérigo cura a otro jugador **desde una actividad** y
      funciona; el mismo jugador por `PATCH` directo sigue recibiendo 403.
- [ ] **Paso 2, 3 · Arreglo y verde.**
- [ ] **Paso 4 · Mutación**, y la que importa: **abrir el `PATCH` directo tiene que enrojecer la
      segunda prueba**. Si solo se rompe la primera, la puerta nueva se comió a la vieja.
- [ ] **Paso 5.** Commit.

### Tarea 6 · El daño de una salvación se aplica al responderla (ficha **P2-5**)

**Files:** `roll-requests.service.ts` (`answer`).

`ActivitiesService.usar` crea la petición con su `dc` y sus `dados`, y `answer` **no aplica el daño
ni la mitad**. Hoy la mesa lo arbitra a mano leyendo el resultado.

- [ ] **Paso 1 · La prueba que falla:** respondida una salvación con éxito y `siSalva: "mitad"`, el
      objetivo pierde la mitad; con fallo, todo.
- [ ] **Paso 2.** Cablear `salvacion.siSalva` (`z.enum(["ninguno","mitad"])`,
      `packages/shared/src/activity.schema.ts`) dentro de `answer()`.
- [ ] **Paso 3.** **Depende de la tarea 5**: aplicar daño a otro personaje pasa por la segunda
      puerta. Si intentas esto antes, te chocas con el 403.
- [ ] **Paso 4 · Mutación** y commit.

### Tarea 7 · El bono a tiradas que no es un entero

**Files:** `packages/shared` (el objetivo de `TemporaryModifier`) · su servicio · la traza.

**Es el caso caro y está medido:** de los 316 cambios numéricos, el **9%** son bonos a tiradas
—`+1d4` de *Bendición* y *Perdición*—, y **hoy no hay dónde aterrizarlos**: los doce objetivos de
`TemporaryModifier` son las seis características, `ac` y las cinco velocidades, y `amount` es
`z.number().int()`. **`+1d4` no es un entero.**

**Bendición y Perdición son dos de los conjuros más usados de la quinta edición**, así que este caso
decide solo si merece la pena.

- [ ] **Paso 1.** *Escudo* **sí cabe hoy**: cambia `ac.bonus` y `"ac"` ya es uno de los doce
      objetivos. **Empieza por él**, con su prueba, para separar lo que cabe de lo que no.
- [ ] **Paso 2 · MIDE ANTES DE DISEÑAR** y manda la medición: cuántos conjuros del catálogo real
      necesitan un bono **no entero**, y sobre qué tiradas. Con ese número delante se decide si se
      añade un objetivo de tirada con `amount` no entero o si se queda en texto. **No lo decidas
      solo; tampoco abras ficha: manda la medición.**
- [ ] **Paso 3.** Lo que se decida, con sus cuatro pasos.

### Tarea 8 · Empuñar o lanzar (ficha **A11-lanzado**)

**Files:** `packages/shared` · `rules/attacks.ts` · `character-sheet.service.ts` · la pantalla del
ataque · e2e.

El bono de daño de la Furia **se cuela en un arma arrojada**. `decidirCaracteristica` recibe
`range: "MELEE" | "RANGED"`, **que es una propiedad del ARMA, no del ataque**: un hacha de mano *es*
`MELEE` con `THROWN` y no cambia de tipo al salir de la mano. El SRD solo da el bono en cuerpo a
cuerpo (*«When you make a melee weapon attack using Strength»*).

**No es un `if`: es un modo que nace en la pantalla** y atraviesa las cuatro capas.

- [ ] **Paso 1 · La prueba que falla:** un bárbaro en furia lanza una jabalina y **no** suma el bono.
- [ ] **Pasos 2-4.** El campo, la pantalla, la mutación, el commit.

### Tarea 9 · `NOMBRE_TIPO_DANO` deja de estar tres veces (media ficha **L2-traza-dano**)

**Files:** `campaign-items/vocabulario.ts:81` · `character-sheet/vocabulario.ts:77` ·
`inventory/vocabulario.ts:57`.

**Está escrito tres veces**, contra la regla vinculante de una forma legible por dominio. **Se deja
una y las otras la importan.** Media hora.

**La otra mitad de esa ficha —traducir las `labelKey` de resistencia— NO entra aquí**: su propia
ficha dice que va con la pantalla del daño aplicado, «no antes».

- [ ] Los cuatro pasos. **La mutación:** borrar la que se queda tiene que enrojecer las tres
      pantallas, no una.

---

## Bloque C — los conjuros del personaje (paso 3.5)

**Sin esto, el paso 3 deja a un mago con 320 hechizos que no son suyos.** Y la mesa del autor tiene
un mago: guerrero, bárbaro y mago de nivel 3 es la partida de prueba declarada.

**Lo único que falta es decir cuáles son míos.** Lanzar ya existe: es una actividad del paso 2 con
`consumption` de un espacio.

### Tarea 10 · `CharacterSpell`

**Files:** `schema.prisma` + migración · `packages/shared` · servicio + spec.

```
CharacterSpell
  characterId   a quién
  spellRef      ContentRef — la misma forma de 2B, NUNCA clave foránea
  estado        EN_EL_LIBRO | PREPARADO | CONOCIDO
```

**Tres modelos de preparación, no dos**, y el SRD los distingue:

| Modelo | Clases | Cómo |
|---|---|---|
| lista completa, prepara cada día | clérigo, druida, paladín | cualquiera de su clase; `modificador + nivel` (**paladín: medio nivel**) |
| libro propio | mago | aprende al libro; prepara `modificador + nivel` **de los del libro** |
| conocidos fijos | bardo, hechicero, explorador, brujo | número fijo de tabla; siempre listos |

**Los trucos van aparte de los tres:** se conocen siempre, **no se preparan y no gastan espacio**.

- [ ] **Paso 1 · Tres pruebas que fallan, una por modelo.**
- [ ] **Paso 2.** La tabla, la migración **aditiva**, el servicio.
- [ ] **Paso 3 · Lo que se DERIVA y no se guarda:** cuántos puede preparar, cuántos trucos le tocan,
      y si se ha pasado. **Guardar el tope sería una segunda verdad que se desincroniza al subir de
      nivel.**
- [ ] **Paso 4 · Cuenta y avisa, no impide:** si un clérigo prepara siete con seis de tope, la
      pantalla lo dice y el DM decide. Hay rasgos y objetos que regalan preparaciones y ninguno
      estará modelado el primer día.
- [ ] **Paso 5 · La trampa nombrada, con su prueba: el paladín es MEDIO nivel.** Es el que se copia
      mal. **La cita del SRD, en inglés, va en el commit.**
- [ ] **Paso 6 · Mutación** —cada modelo por separado— y commit.

### Tarea 11 · La pestaña «Conjuros»

**Files:** `apps/web/src/features/character-sheet/` · pruebas de componente · **un e2e**.

Va en la pestaña «Conjuros» de la hoja (`2026-09-06-la-hoja-en-la-mesa-design.md`), **no en una
página aparte**: preparar conjuros se hace mirando los espacios que tienes.

**Ninguna zona es una rejilla de iconos** — decisión del autor: no hay arte, la referencia es la
lista de *Final Fantasy*.

- [ ] **Preparados**: nombre, nivel, escuela y su acción.
- [ ] **Disponibles**: la lista de la clase (o el libro, si es mago), con buscador y **filtros por
      nivel y escuela reutilizando `FilterChip`**, que ya filtra el bestiario.
- [ ] **El contador**: «5 de 6 preparados · 4 trucos», derivado del servidor **con su traza**.
- [ ] **Lanzar no es un botón nuevo**: un conjuro preparado enseña **la misma fila** que un ataque
      del cuadro, porque por debajo es lo mismo.
- [ ] **El servidor comprueba que el conjuro es de tu clase**, no la pantalla.
- [ ] **e2e obligatorio** y su mutación: quitar el arreglo deja la lista vacía **y la prueba en
      rojo**.

---

## Bloque D — lo temporal (invocar, transformar, encantar)

**No son tres funcionalidades: es una.** Una invocación es un PNJ temporal, una transformación es un
`statblockRef` temporal, un encantamiento es un efecto temporal sobre un objeto. **Lo mismo con tres
formas: algo que se aplica, dura y se retira solo.** Sube la cobertura del **61% al 72%**.

**Y media pieza ya existe:** las condiciones caducan solas contra el reloj de campaña desde 2C, y la
concentración sabe terminar lo que sostiene.

### Tarea 12 · El permiso partido (ficha **P2-9**, decidida: se diseña aquí)

**El SRD parte el permiso en dos, y esta es la pieza que falta:**

> *«It acts on each of your turns. **You decide what action it takes and how it moves. The DM has
> the creature's Statistics and resolves all of its Actions and Movement.**»* — *Polimorfar
> verdadero*, SRD 5.1.

**Dar el `ownerId` concede las dos mitades**, y por eso no es un endpoint de una línea: hace falta
un **tercer modo de permiso** —el jugador decide, el DM tiene los números—, que es **exactamente lo
que `invocar` necesita**. Emparenta con `D-P2-11`: las dos son «un permiso que no es *puedes editar
esta ficha*».

- [ ] Los cuatro pasos. **Y la cita del SRD en el commit.**

### Tarea 13 · Invocar · Tarea 14 · Transformar · Tarea 15 · Encantar

**Se escriben cuando la tarea 12 esté hecha**, y cada una con lo ya verificado:

- **Invocar**: `npcs.service.ts:60` ya instancia con `ownerId`. Los 29 `summon` traen `profiles` con
  criatura + cantidad — **la mitad traen varios perfiles, así que es un selector, no un modelo**.
  Falta que **nazca visible**: hoy un PNJ nace `DM_ONLY` a propósito, y una invocación no es una
  emboscada.
- **Transformar**: `statblockRef` temporal. **Dos detalles que no se adivinan:** los PG **se
  sustituyen y se devuelven** al volver, con el daño sobrante pasando a la forma normal, y **el
  equipo deja de contar** mientras dure. **Solo tres de los seis `transform` son esto**; los otros
  tres son ilusión y entran como texto.
- **Encantar**: efecto temporal sobre un objeto, con las etiquetas que sus `restrictions` ya
  declaran (`type: "weapon"`, `"container"`, `""`). **Y `enchant` NO es hechizar a nadie**:
  hipnotizar y dominar son actividades de **salvación** que aplican `charmed`. El nombre engaña en
  español.

---

## Lo que este plan NO hace

- **No toca la fase 3** —mapas, tablero, posiciones—. `teleport` (1 conjuro) es distancia y es de
  ahí.
- **No importa las carpetas con sufijo `24`.**
- **No reemplaza `items` ni `monsters`.** Están transcritos a mano, en español oficial, con
  invariantes probadas. **Reemplazar algo que funciona por algo equivalente es riesgo sin ganancia**,
  y esa decisión se toma con el conversor escrito y las dos formas delante.
- **No mecaniza los rituales**, ni copiar conjuros al libro con su coste en oro.
- **No automatiza el 18% de activación `special`.** Es del propio SRD: entra con su prosa y lo
  arbitra el DM. **Decisión del autor: existir sin automatizarse es infinitamente mejor que no
  existir.**
- **No hace la mesa a 390 px** (medida, con tres salidas y decisión pendiente del autor) ni la poda
  de las 56 secciones del tablero.

## Lo que decide el autor antes de empezar

1. **¿El mago empieza con su libro sembrado?** Recomendado **sí** — llegar a la mesa con el libro
   vacío es una tarea administrativa antes de jugar.
2. **¿Se puede preparar en mitad del combate?** El SRD lo prohíbe; este proyecto **cuenta y avisa**.
   Recomendado: **avisar y dejar**.
3. **¿Los trucos se eligen o se siembran?** Recomendado: **se eligen** — son la mitad de lo que hace
   un mago de nivel bajo.

## Si esto es demasiado, córtalo por aquí

**Los bloques A + C son «un mago existe y puede jugar».** El bloque B son fichas viejas que se
pueden hacer antes o después, salvo la **tarea 5**, que la **tarea 6 necesita**. El bloque D sube la
cobertura del 61% al 72% y **es el único que se puede aplazar entero** sin que nadie lo note en la
primera partida.

## Al cerrar

Archiva las fichas cerradas (no las dejes tachadas en el 06), una línea por tarea en
`07-historial.md`, **una fila por decisión en `decisiones.md`**, y `pnpm update:estado`. Y **relee
los documentos de estado (01–05, 09)**: `07-historial.md` cuenta qué se entregó, **no es
documentación de estado**, y confundir las dos ya dejó una noche entera sin documentar.

Y la tabla de siempre: una fila por tarea con vueltas, qué encontró cada mutación, y tiempo perdido
y en qué.
