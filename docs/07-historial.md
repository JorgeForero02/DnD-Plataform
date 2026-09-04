# Historial

Qué se entregó, por qué, y cómo revertirlo. Fechas absolutas. El detalle por tarea —commit,
número de pruebas, resultado de la revisión— vive en el ledger
`.superpowers/sdd/progress.md`; aquí van los hitos.

> ## Este fichero tiene un tope de 400 líneas, y lo comprueba una máquina
>
> `pnpm check:historial` falla si se pasa (ver `scripts/check-historial.mjs`, enganchado en
> `pnpm verify` junto a `check:estado`). No es pulcritud: el consumidor principal de esta
> documentación es un agente sin memoria que la relee entera en cada sesión, y **lo que no le
> cabe en contexto lo rellena inventando**. Un historial de 2192 líneas —lo que llegó a medir
> este— no se lee: se hojea, y hojear un registro es peor que no tenerlo.
>
> **Qué se queda y qué se archiva.** Se queda **un hito por entrega**: el cierre de una fase,
> su despliegue, la revisión que lo cerró. Se archiva **el detalle por tarea**, que es lo que
> el ledger ya cuenta a más resolución. Ninguna entrada se reescribe ni se resume al
> archivarla — se mueve entera, y el archivo es tan cierto como era el día que se escribió.
>
> | Dónde | Qué hay |
> |---|---|
> | [`_archivo/historial-hasta-2026-09-01.md`](./_archivo/historial-hasta-2026-09-01.md) | Desde el arranque del proyecto (2026-07-02) hasta el cierre de la fase 1 y el reseño visual |
> | [`_archivo/historial-hasta-2026-09-02.md`](./_archivo/historial-hasta-2026-09-02.md) | Todo el 2026-09-02 —la fase 2A entera, la ronda de interfaz, la primera puesta en producción— y **las entradas por tarea del 2026-09-03** (2B, 2C y 2D, tarea a tarea) |
>
> **El siguiente corte toca cuando el 2026-09-03 deje de ser el presente**, o antes si
> `check:historial` se pone rojo.

---

## B0 — los tokens por canales y el tercer tema (2026-09-04)

**Por qué.** El reseño de la mesa decidió sustituir la interfaz por la maqueta de `prototipo/`,
y al leerla por dentro resultó estar escrita con **174 clases de opacidad sobre tokens** — las
que en este proyecto se descartaban en silencio. Copiada tal cual se habría pintado sin un solo
borde. Se arregló la causa (ficha P2, ahora cerrada) en vez de traducir 174 clases a mano.

**Qué entra.** Los trece tokens de color se declaran por canales (`--copper-ch: 201 125 70`) y
Tailwind compone `rgb(var(--copper-ch) / <alpha-value>)`; el nombre sin sufijo sobrevive como
color pintable, así que los ~35 `var(--accent)` de `style` y SVG no se tocaron. Escala de
opacidad de 0 a 100 (la de Tailwind tiene huecos). Tercer tema **Lectura**, con el conmutador
convertido en grupo de tres opciones visibles y el rótulo «Lectura (vitela)» del tema claro
corregido, que llevaba mintiendo desde 1.19.

**Evidencia.** 797 unitarias verdes; las **19** mediciones de contraste de
`tokens-contrast.spec.ts` pasan en los **tres** temas. Mutación medida dos veces: devolver
`copper` a `var(--copper)` pone la medición en `rgb(229, 231, 235)` —el gris del preflight— y la
prueba en rojo; quitar `"reading"` de `esTema` sobrevivía a las tres pruebas del conmutador, así
que se escribió la cuarta (un tema guardado se recupera al volver) y entonces sí muere.

**Cómo revertir.** Un solo commit. `tailwind.config.js` vuelve a `var(--x)` y `ui/tokens.css` a
los colores literales por tema; el tercer tema se cae solo al quitar `"reading"` de
`ui/theme.ts`, `index.html` y `tokens.css`.

## Tarea 2.5.1 — tipos de daño y resistencias que de verdad reducen (2026-09-04)

**El tipo de daño es una columna** (`GameEvent.damageType`, opcional): «¿de qué murió Elara?» ya
se contesta por columna, no leyendo el `payload`. **La resistencia se parte en dos**: las tres
listas de prosa de un statblock se conservan, y al lado nace `damageModifiers` —lo estructurado
que el servidor sabe aplicar—, rellenado solo para las tres criaturas del catálogo con resistencia
limpia o citable (esqueleto, zombi, tumulario). **Y una función pura nueva**
(`apply-damage-modifiers.ts`, misma familia que `effective-speed.ts`) reduce el daño con su
traza, enganchada a `POST .../hp`: con `damageType`, reduce antes de aplicar; sin él, nada cambia.

**La revisión de cierre encontró cuatro cosas, y una era una regla mal leída.** Se anotan porque
las cuatro son del tipo que vuelve si no queda escrito por qué pasaron:

1. **Resistencia y vulnerabilidad al mismo tipo NO se cancelan: se encadenan.** El código las
   cancelaba apoyándose en un comentario que afirmaba haber buscado la cláusula «en la edición
   inglesa y en la española» y no encontrarla. La inglesa **sí** la tiene, en dos palabras que la
   traducción oficial pierde: *«Resistance **and then** vulnerability are applied after all other
   modifiers to damage»*. Con 25: mitad 12, doble 24 — no 25. Con daño par las dos lecturas
   coinciden, que es por qué la prueba vieja pasaba. **Cuando las dos ediciones discrepan, manda
   la inglesa.**
2. **El registro publicaba el daño BRUTO** junto a unos `from`/`to` ya reducidos. Filtraba —de
   25 anunciados y 12 perdidos se deduce una resistencia, y la plantilla puede ser `DM_ONLY`— y
   además la línea de la mesa se contradecía consigo misma. Se registra el daño aplicado.
3. **Una curación se podía etiquetar con tipo de daño**, y entonces «¿de qué murió?» devolvía
   curaciones. Ahora solo un delta negativo lleva tipo.
4. **`schema.prisma` no declaraba `damageModifiers`**, aunque su migración creaba la columna: un
   checkout limpio no compilaba y el siguiente `prisma migrate dev` habría propuesto borrarla.
   Sobrevivió a un `pnpm verify` en verde porque el cliente generado de aquella máquina sí la
   tenía. **Lo cazó `pnpm build`, no una prueba.**

Y una decisión de traza: los pasos de resistencia dicen `sourceType: "statblock"` y no `"manual"`.
`"manual"` es la anulación del DM; una regla del libro no es un ajuste a mano.

Dos reglas más verificadas contra la fuente y citadas en el código: la resistencia se aplica
después del resto de modificadores, y varias resistencias del mismo tipo cuentan como una.

**Cómo revertir:** `git revert` de los commits `feat(api)`/`feat(shared)` de la tarea. Las dos
migraciones solo añaden columnas nullable — revertir el código no revierte el esquema, y no hace
falta: una columna de más sin escribir no rompe nada.

## Lo comprobado EN PRODUCCIÓN al desplegar la fase 2D (2026-09-03)

Despliegue lanzado por la API de Coolify **desde dentro de la VPS**
(`POST /api/v1/deploy?uuid=5awvsn1dnkexhcjzg7kjwom6`), con la tanda entera de 2D y **dos
migraciones**. Volcado previo en `vps1new:/root/dnd-antes-de-2d.sql.gz`.

> **Dos trampas del volcado previo, y las dos mordieron.** El filtro `--filter name=dnd` **no
> encuentra nada**: los contenedores de Coolify se llaman por el UUID de la aplicación
> (`db-5awvsn1dnkexhcjzg7kjwom6-…`). Y el usuario de Postgres **no es `postgres`**, es `dnd`
> (`POSTGRES_USER`), así que `pg_dumpall -U postgres` falla con «role does not exist» — y el
> primer intento dejó un fichero de **20 bytes** que parecía un volcado. Comprobar el tamaño del
> volcado antes de tocar nada no es opcional.

| Comprobación | Salida real |
|---|---|
| **El commit desplegado es el que se empujó** | imágenes `web` y `api` en `…:82fab54ea3a2…` = `HEAD` local |
| Los tres contenedores vuelven sanos | `web` / `api` / `db` en `Up … (healthy)` |
| **Las dos migraciones de 2D se aplican solas** | `statblocks_del_dm` y `pnj_instanciado`, las dos con `finished_at` no nulo |
| La tabla y la columna nuevas existen | `CampaignStatblock` presente; `Character.statblockRef` presente |
| **Los datos sobrevivieron** | 1 campaña · 3 personajes · 2 usuarios, **los mismos conteos que antes del despliegue** |
| La SPA se sirve | `GET /` → **200** |
| La API responde y exige sesión | `GET /api/auth/me` → **401**; `GET /api/campaigns/x/statblocks` → **401** |
| El certificado es el del dominio y de Let's Encrypt | `subject=CN=dnd.supportive.pro`, `issuer=… Let's Encrypt`, válido hasta el 1 de diciembre de 2026 — **medido desde dentro**, porque Norton intercepta el TLS en el PC del autor |

**Lo que sigue sin hacerse, y es decisión del autor:** la partida de prueba con dos cuentas de
jugador. Es lo único que le queda a la fase 2.

## Lo comprobado EN PRODUCCIÓN al desplegar la fase 2C (2026-09-03)

Despliegue lanzado por la API de Coolify **desde dentro de la VPS**
(`POST /api/v1/deploy?uuid=5awvsn1dnkexhcjzg7kjwom6`), con la tanda entera de 2C y **cuatro
migraciones**. Volcado previo de la base en `vps1new:/root/dnd-antes-de-2c.sql.gz` antes de tocar
nada, porque el documento lo pide cuando la tanda trae migración.

| Comprobación | Salida real |
|---|---|
| **El commit desplegado es el que se empujó** | `GET /api/v1/deployments/<uuid>` → `finished`, commit `b0d6a6d8` = `HEAD` local |
| Los tres contenedores vuelven sanos | `web` / `api` / `db` en `Up About a minute (healthy)` |
| **Las cuatro migraciones de 2C se aplican solas** | `clock_de_campana`, `condiciones_con_vencimiento`, `peticion_de_tirada` y `tablas_del_dm`, las cuatro con `finished_at` no nulo |
| **El índice único parcial de las tablas del DM existe en producción** | `DmTable_campaignId_trigger_key` presente en `pg_indexes` |
| La SPA se sirve | `GET /` → **200** |
| La API responde y exige sesión | `GET /api/auth/me` → **401**; `GET /api/catalog` → **401** |
| El certificado es el del dominio y de Let's Encrypt | `issuer=... Let's Encrypt`, `subject=CN=dnd.supportive.pro`, válido hasta el 1 de diciembre de 2026 — **medido desde dentro** con `openssl s_client` contra `127.0.0.1:443`, porque Norton intercepta el TLS en el PC del autor |

**Lo que NO se hizo, y es decisión del autor:** la partida de prueba con dos cuentas de jugador.
Se pospone **a después de la fase 2D**, con el despliegue ya en pie.

## 2026-09-03 (noche) — **La fase 2C está en producción**

**Qué.** Desplegada la tanda entera de 2C en `dnd.supportive.pro`, lanzada por la API de Coolify
desde dentro de la VPS, con **volcado previo de la base** porque la tanda trae cuatro migraciones.

**Comprobado con evidencia, no con el «queued»**: el commit desplegado es el que se empujó
(`b0d6a6d`), los tres contenedores vuelven sanos, **las cuatro migraciones se aplican solas**, el
índice único parcial de las tablas del DM existe en producción, la SPA da 200, la API exige sesión
y el certificado es el del dominio. La tabla está en [03-despliegue.md](./03-despliegue.md).

**Lo que no se hizo, por decisión del autor:** la partida de prueba con dos cuentas de jugador, que
pasa **a después de la fase 2D**. El despliegue queda en pie para cuando toque.

## 2026-09-03 (noche) — La fase 2D: los PNJ tienen números y bajan a la mesa

**Qué.** El autor eligió el alcance grande de 2D: no solo la ficha del PNJ, sino el PNJ jugable —
que recibe daño, coge condiciones y aparece en el registro. Cuatro bloques hasta ahora.

**La decisión que hace que el alcance grande no cueste el doble:** un PNJ en la mesa **es una fila
de `Character`**. `Character` ya trae, probado y desplegado, todo lo que un combatiente necesita
—PG, condiciones con vencimiento, versión optimista, salvaciones de muerte, inventario, su sitio en
el registro—, y reescribir eso para PNJ habría sido duplicar el sistema más revisado del proyecto
para desincronizarlo el primer día que alguien arregle un fallo en una sola de las dos copias.

**Tres invariantes verificadas contra los quince statblocks del SRD ANTES de escribirlas**, no
después: los PG son la media de los dados **más la Constitución por cada dado** (el ogro es
«59 (7d10 + 21)», y 21 es su +3 siete veces), el dado de golpe sale del **tamaño** de la criatura, y
el bonificador de competencia sale del **valor de desafío**. Quince de quince cada una.

**Dos nombres que habrían salido mal por criterio.** La traducción oficial dice **«Goblin»** y no
«trasgo» —trasgo es el colectivo de los goblinoides— y **«Tumulario»** y no «Espectro», que es el
*specter*; se confirmó por CA 14 y PG 45 (6d8+18) exactos. Se bajó el PDF oficial en español y se
comprobaron los quince uno a uno.

> **Un fallo de diseño propio, encontrado al enganchar la hoja.** Había **dos** caminos que
> construían una hoja de personaje —el de leer (`buildResponse`) y el de mutar
> (`construirODenegar`)— y cada uno derivaba por su cuenta. Al añadir la rama de PNJ se parcheó
> uno, y el otro siguió intentando construir un personaje sin raza ni clase: la pantalla devolvía
> un 200 con la hoja vacía. **Es exactamente lo que la revisión de 2C llamó «la mitad del sistema
> sin arreglar»**, y la respuesta no fue añadir la rama dos veces sino que exista un solo sitio
> donde añadirla: `hojaOMotivo`. El agotamiento se aplica ahí, para que leer y mutar recorten
> contra el mismo máximo.

**Una mutación que sobrevivió y no era un hueco de prueba**: `Math.ceil` → `Math.floor` sobre el
valor de desafío es una **mutación equivalente**, porque los VD fraccionarios del SRD solo existen
por debajo de 1 y caen todos en la misma banda. Queda anotada en `06-pendientes.md` para que el
próximo que mida cobertura no escriba una prueba que no puede fallar. Y una que **no se contó**:
un `return` temprano que dejaba el resto inalcanzable, con lo que la suite no compiló y no midió
nada. Una mutación que no compila no es una medición.

**Probado.** Unitarias de motor, de catálogo, de servicio y de instanciación; y un e2e contra
Postgres real que recorre el bucle entero —instanciar, derivar del statblock, recibir daño, una
anulación del DM en la traza, y **el agotamiento partiéndole los PG máximos a un ogro sin que se
escribiera una línea de agotamiento para PNJ**. Esa última es la que justifica la decisión de
diseño de la fase entera. Siete mutaciones comprobadas en rojo.

**La cascada de borrar una campaña cuenta la tabla nueva**, que es la lección que 2C dejó escrita:
un huérfano no avisa, la operación devuelve 200 igual.

**Cómo revertir.** `git revert` de los commits de 2D y quitar las dos tablas
(`CampaignStatblock` y la columna `Character.statblockRef`). El camino del personaje jugador no se
tocó, y hay una prueba que lo dice.

## 2026-09-03 (noche) — La revisión de cierre de la fase 2D: la tercera fuga de la misma familia

**Qué.** Dos revisiones de solo lectura sobre el diff entero de 2D —una de seguridad, otra de
reglas contra la fuente en local—. **Cinco hallazgos reales, los cinco arreglados.**

> **1 · Seguro. Los números de un statblock `DM_ONLY` llegaban al jugador por la hoja del PNJ.**
> El escenario es el que un DM hace de verdad: escribe su statblock (nace `DM_ONLY`), lo baja a la
> mesa, y cuando los jugadores se topan con el bicho **le sube la visibilidad al PNJ** para que lo
> vean. La plantilla sigue siendo suya. La hoja derivaba sin preguntar por ella, así que ese
> jugador leía CA, PG máximos, las seis salvaciones, las dieciocho habilidades y **la traza**, que
> además lleva dentro la nota del libro. **Es la tercera de la misma familia**: la revisión de 2C
> encontró las otras dos.
>
> El arreglo no era pasar el espectador y ya: `resolver()` colapsa «no existe» con «no lo ves» a
> propósito, y con eso la hoja habría contestado «apunta a un statblock que ya no existe» sobre uno
> que existe — mentirle al DM. Se añadió `resolverParaHoja`, que **sí distingue**, porque aquí la
> existencia de la criatura ya la sabe quien pregunta: la está viendo en la mesa.

> **2 · Seguro. El `statblockRef` de una plantilla escondida viajaba al jugador.** Es el
> identificador de la fila que la lista de statblocks le está ocultando a ese mismo jugador, así
> que se deshacía por la puerta de al lado. Mismo criterio que `redactado()` con los objetos
> ocultos de una hoja. Los del SRD sí viajan: el libro no esconde nada.

> **3 · Seguro. Una tirada de ataque de un PNJ `DM_ONLY` se anunciaba a la mesa entera**, con su
> nombre en la etiqueta y, con él, el hecho de que ese PNJ existe. La audiencia por defecto era
> `PUBLIC` fija; ahora sale de la visibilidad del personaje. **Es la misma forma exacta del segundo
> hallazgo de 2C**, que era una condición vencida escrita con `PLAYERS` fijo.

> **4 · Regla. El alineamiento del Bandido se había tragado la línea entera del PDF** —«cualquier
> alineamiento no legal Clase de Armadura: 12 (armadura de cuero) Puntos de golpe: 11 (2d8 + 2)
> Velocidad: 9 m»— porque el volcado pegó cabecera y estadísticas en un renglón, y **se pintaba tal
> cual en la ficha**. Único de los quince afectado. Hay ahora una prueba que mira los quince, no
> solo ese.

> **5 · Regla. `pgMediosDe` no tenía el suelo de 1 PG que sí tiene su gemela `pgDeMonstruo`.** Un
> statblock propio con una criatura Diminuta de un dado y Constitución 1 salía a −3, y el PNJ se
> guardaba con los puntos de golpe en negativo **mientras el motor derivaba 1 para esa misma
> criatura**: dos números distintos para lo mismo.

**Y dos comentarios que mentían**, los dos en `statblock.schema.ts` y los dos sobre nombres: uno
citaba un «huargo» que **no está en la tanda** (el Grande con d10 es el lobo terrible), y otro
llamaba «espectro» al tumulario **en el mismo trabajo que se molestó en corregir ese nombre**.
Documentación que miente es peor que ausente, y aquí mentía sobre una comprobación.

**Lo que la revisión declaró limpio**, y conviene que conste: instanciar exige DM y el `ref` está
acotado a la campaña, así que no se puede instanciar de otra mesa; `statblockRef` no es escribible
por el cliente; un jugador no puede abrir la hoja de un PNJ `DM_ONLY` ni mutar ninguno; los
statblocks de otra campaña dan 404 y no 403; y **los quince statblocks cuadran número a número con
la fuente** —CA, dados, características, competencias, sentidos, velocidades, VD, inmunidades— con
los quince nombres en la traducción oficial y la prosa completa a través de los saltos de página.

**Probado.** Suites completas de nuevo —unitarias de API y de web, e2e de API y Playwright— todo en
verde y mirado. Una mutación más en rojo sobre el arreglo de la fuga.

**Cómo revertir.** `git revert` del commit. Ojo a un cambio de comportamiento: la hoja de un PNJ
cuya plantilla no ves devuelve ahora `sheet: null` con un motivo, en vez de los números.

## 2026-09-03 (noche) — El cierre de la fase 2C: cuatro fichas, una revisión de dos frentes y once arreglos

**Qué.** El autor pidió cerrar todo lo que se pudiera antes de 2D. Esto es lo que se cerró.

**Las cuatro fichas que quedaban de 2C**: pedir las salvaciones de marcha forzada (**C2C-4**),
pintar la tabla de la casa en la tirada que la disparó (**C2C-5**), editar una tabla (**C2C-6**) y
«solo las mías» en el registro (**C2C-7**). Y **C2C-1 contestada por el autor**: no, un jugador no
puede esconderle una tirada al DM — se cierra con tres modos.

**Y una revisión del diff entero, en dos frentes de solo lectura**, que es lo que esta sesión se
había saltado. Trece hallazgos; **once arreglados el mismo día**, cada uno con su prueba y su
mutación comprobada. Los cuatro que más importan:

> **1 · Seguro. El texto de una tabla `DM_ONLY` volvía al jugador en la respuesta del `POST`.**
> Es el agujero de la tirada a ciegas otra vez, un método más abajo, **y en la configuración por
> defecto**: una tabla nace `DM_ONLY`, su suceso se escribía bien —el registro la escondía— y la
> respuesta la cantaba entera. Un jugador que sacara un 1 leía la tabla de pifias del DM. Ahora se
> tira igual (el DM la necesita) y lo que se decide es si el texto viaja, y lo decide `canView`.
>
> **2 · Seguro. La condición vencida de un PNJ `DM_ONLY` se anunciaba a toda la mesa.** El suceso
> se escribía con `PLAYERS` fijo, así que filtraba que ese PNJ existe y qué le pasaba. El argumento
> de que la caducidad se ve —para no dejar al jugador con el «qué» y sin el «por qué»— vale para el
> personaje de un jugador; escrito fijo, se aplicaba también a los del DM.
>
> **3 · Regla. Curar no respetaba los PG máximos partidos por agotamiento.** `changeHp` —el camino
> principal de curación de la mesa— derivaba «pelado»: sin las anulaciones del DM y sin las
> condiciones. Un personaje con agotamiento 4 se curaba hasta el máximo entero y la hoja se lo
> enseñaba recortado con el aviso de «superan el máximo». **Es exactamente el fallo que 2C.4 decía
> haber arreglado, con la mitad del sistema sin arreglar.**
>
> **4 · Regla. El descanso largo devolvía dados de golpe redondeando hacia ARRIBA.** El SRD dice
> «half of», y la 5.ª edición **redondea hacia abajo incluso con un medio exacto**; la propia
> cláusula del «mínimo de un dado» lo demuestra, porque con redondeo hacia arriba sobraría. Nivel 5
> devuelve 2, no 3. **Y la prueba consagraba el error**: se llamaba «MUTACIÓN CLAVE» y afirmaba
> «2,5 → 3 hacia arriba». Se corrigieron las dos, la unitaria y la e2e.

Los otros siete: una carrera que permitía responder dos veces la misma petición de tirada (ahora la
condición va **dentro del `where`**, que es la base garantizando lo que un `if` no puede); la tirada
y la tabla que dispara **compartiendo transacción**, que un comentario prometía y nadie cumplía;
`mine` pisando en silencio a `characterId`; un 403 donde el resto de la fase eligió 404; la ventaja
**descartada en silencio** al pedirla sobre un `1d20r1` (la suerte del mediano); el mínimo de cero
de un dado de golpe, que es **por dado** y no por descanso; y un agotamiento ya vencido que un
descanso «gastaba» igual.

**Tres pruebas que no probaban**, también corregidas: una cuyo nombre prometía el caso contrario al
que ejecutaba, una que defendía el modo y la audiencia de una petición **sin comprobarlos nunca**, y
un e2e del tope de curación que **pasaba por casualidad** porque los dados reales casi nunca llegaban
al borde.

**Y dos cosas que no eran de esta tanda y estaban mintiendo**: la fila de `01-arquitectura.md` que
decía «solo DM» de `world-state` cuando **un jugador ya escribe ahí** al abrir una ficha (ficha A2,
que predijo exactamente esto), y `09-primera-partida.md`, que describía la herramienta de la fase 1
y llamaba imposible seguir un enlace **que lleva funcionando desde el reseño**.

**La cascada de borrar una campaña pasa de contar ocho tablas a diecisiete** (ficha A1), y se cerró
justo antes de desplegar por un motivo concreto: un huérfano en una tabla nueva **no avisa**, la
operación devuelve 200 igual.

**Probado.** 1203 unitarias de API · 769 de web · 43 de esquemas · **186 e2e de API en 29 suites** ·
**79 recorridos de navegador en 20 especificaciones**. Todo en verde y mirado. Ocho mutaciones
comprobadas sobre los arreglos de la revisión, cada una en rojo sobre su prueba.

**Cómo revertir.** `git revert` del commit. Dos cambios de comportamiento que conviene conocer antes
de revertir: responder la petición de otro pasa a **404** (era 403), y el descanso largo devuelve
**menos** dados de golpe que antes, que es lo que dice la fuente.

## 2026-09-03 (noche) — Fase 2B: objetos, inventario, equipar, y el cuadro de ataques que faltaba

**Qué.** Un objeto deja de ser texto. Hay catálogo del SRD 5.1 (35 armas, 18 de equipo, las
armaduras con su peso y su precio), objetos propios de cada campaña que escribe el DM,
inventario por personaje con **tres sitios** —equipado, encima, guardado en otro sitio—, ranuras,
manos, sintonización con tope de tres, dinero en las cinco monedas, y peso transportado. Lo
equipado **entra en el motor**: la armadura sustituye la fórmula de CA, el escudo suma plano, y
cada objeto aparece como **un paso más de la traza**. Y con eso se cierra lo que la fase 2C
debía a 2B: el cuadro de ataques con su bono, su daño y su tipo, y el botón que pide al servidor
la tirada de ataque o la de daño.

**Por qué.** La hoja decía «+5 al ataque» y no tenía dónde leer «1d8+3 cortante»: media mecánica
en pantalla, que es peor que ninguna porque parece completa (ficha M19). Y el hueco del
inventario llevaba desde 2A rotulado y vacío, con la CA calculándose sin equipo.

**Cómo se trabajó.** Ocho carriles en dos tandas —cinco y tres— —catálogo, efectos y
motor, objetos de campaña, inventario, ataques; luego inventario en pantalla, catálogo en
pantalla y la hoja—, con la frontera de ficheros escrita en cada encargo. Los contratos de
`packages/shared`, las migraciones, el cableado, las corridas de e2e y esta documentación las
escribió el orquestador. **Prueba de mutación por comportamiento nuevo en los ocho carriles**, y
ninguno la dio por buena sin ver la prueba roja.

### Los dos defectos que solo la integración podía encontrar, los dos silenciosos

- **Las competencias de arma de las clases eran prosa en español** («Armas marciales»), y el
  cuadro de ataques pregunta por claves (`martial`). La comparación **nunca** podía acertar: todo
  guerrero habría perdido su bonificador de competencia **sin que ninguna prueba se pusiera
  roja**, porque las dos mitades estaban bien por separado. Ahora son claves de máquina y el
  español sale en la pantalla, como con todo el catálogo.
- **La traza de la CA no sumaba la CA que explicaba.** El paso de la característica llevaba el
  modificador **ya recortado** y además se añadía el paso del recorte, así que con cota de malla
  y Destreza 12 la hoja decía «CA 16» y su propia explicación sumaba 15. Nadie lo vio en 2A
  porque **nada alimentaba la armadura todavía**; apareció el día que se enchufó el inventario,
  que es exactamente para lo que sirve enchufar cosas.

### Decisiones de mecánica tomadas sin el autor, y su porqué

Están enteras en
[el plan de 2B](./superpowers/plans/2026-09-03-fase-2B-objetos-inventario-y-equipo.md). Las tres
que más cambian la forma de los datos:

- **Sitio del objeto: `EQUIPPED | CARRIED | STORED`, y la sintonización aparte.** El informe de
  huecos proponía meter «sintonizado» como tercer valor del enum, pero un anillo sintonizado
  **está** equipado: un solo enum obliga a elegir cuál de las dos verdades se guarda.
- **Peso en onzas, precio en cobres.** Enteros abajo, kg y monedas en pantalla; el mismo
  principio que los pies de la especificación de distancias.
- **Un objeto `DM_ONLY` no se le puede dar a quien no puede verlo**: 400 que explica cómo
  arreglarlo. Mandárselo igual es un agujero de `canView`; pintarle una fila fantasma es una
  pantalla que miente.

**Lo que se declaró fuera, con motivo**: «lo tengo pero no sé qué hace» (es visibilidad por
campo, y la traza delataría el número igual) y la penalización por sobrecarga (es una regla
variante del SRD y necesita un interruptor por campaña). Fichas I1–I8 de
[06-pendientes.md](./06-pendientes.md).

**Cómo revertir.** `git revert` de los commits de la jornada. Las tres migraciones nuevas
—`items_inventory_and_money`, `inventory_one_item_per_slot`, `money_changed_event`— crean dos
tablas, una de concesiones, un índice y un valor de enumeración que **nada en producción
referencia todavía** (deja de ser cierto en cuanto se despliegue y alguien mueva una moneda).
Revertirlas es `prisma migrate resolve --rolled-back`, dejar caer esas tablas **y quitar de
`Character` las cinco columnas de moneda** (`cp`, `sp`, `ep`, `gp`, `pp`): esa tabla es de la
fase 1 y **sí** cambia de forma — la primera versión de este párrafo decía que no cambiaba
ninguna, y es la frase que alguien lee bajo presión en mitad de un rollback. Ningún dato
existente se reescribe.

---
