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

## El ataque, comparado en el servidor (2.5.3) (2026-09-04)

**El motor calculaba el bono de ataque y quien tiraba comparaba a ojo contra la CA.** Nuevo
`CharacterSheetService.resolveAttack` (`POST .../sheet/attacks/:attackKey/resolve`): deriva el
bono ya conocido, tira con `RollsService`, compara con la CA del objetivo —**que nunca sale del
método**— y propone `HIT` / `MISS` / `CRITICAL`. Un 20 o un 1 natural mandan sobre la CA (SRD
5.1, *"Resolving Attacks"*, dnd5eapi.co/api/2014/rule-sections/making-an-attack: *"If the d20
roll for an attack is a 20, the attack hits regardless of any modifiers or the target's AC"* /
*"a 1, the attack misses regardless..."*). Ni el impacto ni el daño se aplican solos.

**La CA se calcula con un espectador del servidor** (`role: "DM"`), no con el de quien ataca:
`hojaDeStatblock` se niega entera —sin hoja, sin CA— a cualquiera que no sea el DM, y el
atacante casi nunca lo es. Sin este espectador omnisciente, atacar a un PNJ `DM_ONLY` habría
sido un 400 en vez de un veredicto (decisión D-2.5-5). **Atacar no exige `canView` sobre el
objetivo** a propósito: la garantía de esta tarea es «nunca sabrás su CA», no «no puedes apuntar
a lo que no ves».

**Lo que queda fuera, a propósito.** La ficha R2C-2 (el `critical` suelto en la DAMAGE de
`rollAttack`) no se toca aquí — es de 2.5.4, que es donde el daño se aplica de verdad. Ver
ficha **C2.5-2** en [06-pendientes.md](./06-pendientes.md).

**Probado.** Nueve unitarias del servicio (Prisma simulado): HIT por encima de la CA, HIT en el
empate exacto —el SRD dice «iguala o supera»—, MISS por debajo, `CRITICAL` con un 20 natural
aunque el total no llegue a la CA, `MISS` con un 1 natural aunque el total la supere, sin
veredicto en una tirada a ciegas, sin ningún campo de CA en la respuesta, 404 contra un
objetivo que no existe y un PNJ con la plantilla oculta al atacante que aun así compara bien.
Y un e2e contra Postgres real (`ataque-comparado-en-el-servidor.e2e-spec.ts`) que ataca a un
plebeyo del SRD `DM_ONLY` hasta ver «impacta» y comprueba, **sobre el cuerpo HTTP
serializado**, que su CA no aparece en ninguna respuesta ni en el registro de la partida.

**Cómo revertir.** `git revert` del commit; no toca el esquema de Prisma. El único cambio en
`@dnd/shared` es aditivo (`attack.schema.ts`, nuevo).

## ENTITY_REVEALED también al subir la visibilidad a mano (ficha P1) (2026-09-04)

El único sitio que emitía este suceso era el motor de reglas (`REVEAL_ENTITY`); un DM que sube a
mano la visibilidad de una ficha —que es como se revela un lugar casi siempre— no dejaba rastro,
y la cabecera de escena de la mesa (que ya sabe leerlo) nunca se encendía sola.
`EntitiesService.update` compara el índice del nivel nuevo contra el viejo en `DM_ONLY <
OWNER_DM < SPECIFIC_PLAYERS < PLAYERS < PUBLIC` —el mismo orden de `canView`— y solo emite
cuando sube; **bajar la visibilidad no es revelar** y no emite nada. El suceso hereda la
visibilidad NUEVA de la entidad, y se escribe con `PrismaService.transaction` + el buzón de
`after-commit.ts`, nunca con `$transaction`.

**Probado.** Unitarias del servicio (con `transaction` mockeado) y `entities.e2e-spec.ts`: sube
y no emite al bajar; un jugador que no puede ver la ficha tampoco ve el suceso.

**Cómo revertir.** `git revert` del commit; no toca esquema.

## Archivar un personaje en vez de borrarlo (2.5.8, ficha M9) (2026-09-04)

**Es lo único abierto que destruía datos mientras esperaba.** Columna `Character.archivedAt`
(`null` = activo). `list()` suma `archivedAt: null` a la misma consulta que ya excluye a los PNJ
instanciados (`statblockRef: null`, 2D.6) — el mismo patrón, un filtro más. `archive()`/
`unarchive()` usan `requireEditable` (dueño o DM, sin regla nueva), no tocan hoja/inventario/
dinero, y dejan `CHARACTER_ARCHIVED`/`CHARACTER_RESTORED` en la línea de tiempo con la
visibilidad del personaje. Ambos son idempotentes: repetir el gesto no vuelve a emitir el
suceso. Borrar de verdad (`DELETE`) sigue existiendo tal cual — lo que cambia es cuál de los dos
gestos es el fácil.

**Probado.** Unitarias del servicio (con Prisma simulado y `transaction` mockeado) y
`characters.e2e-spec.ts`: archivar saca del listado sin borrar filas —contadas, no fiadas del
200—, recupera hoja/inventario/dinero enteros, deja su rastro en la línea de tiempo, y solo
dueño o DM pueden archivar.

**Cómo revertir.** `git revert` del commit. La migración `character_archived` añade una columna
nula y dos valores de enum — revertirla no pierde datos de personajes ya archivados si se hace
antes de que alguien dependa de la columna.

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

## B1.1 — la mesa entra en la navegación y estrena cabecera de escena (2026-09-04)

**Por qué.** Los dos defectos que el reseño clasifica como de arquitectura: la mesa **no estaba en
la navegación** —solo se llegaba por enlaces que existían mientras había sesión, y por URL directa
contestaba un cartel de vacío—, y el hilo sin cabecera es *«un tablón, no un escenario»*.

**Qué entra.** Un enlace permanente a la mesa desde la campaña, con su estado escrito (en juego /
en reposo). El **reposo pasa a ser uno de los tres estados de la mesa** y no su ausencia: cabecera,
registro y consulta siguen ahí. Y la **cabecera de escena**, estrato permanente sin botón de
cerrar, que ocupa el hueco del futuro tablero con el reloj de campaña —que llevaba semanas
sondeando para nadie desde la pestaña «Dados»—, quién está en la escena y el lugar cuando lo hay.

**Lo que se encontró por el camino, y está en `06-pendientes.md`:** **nadie escribe
`ENTITY_REVEALED`** salvo el motor de reglas, así que la mitad «el DM revela un lugar y la cabecera
lo dice» del reseño no era cierta. La derivación se escribió igual, con sus pruebas, y se enciende
sola el día que el servidor emita el suceso.

**Evidencia.** 809 unitarias de web; 98 recorridos de navegador. Dos mutaciones: quitar el enlace
deja el recorrido de alcance en rojo; quitar los minutos del reloj deja la derivación en rojo. Y el
recorrido cazó dos defectos antes del commit: un `<header>` anidado tiene rol `generic` y **no
admite nombre accesible**, y el enlace nuevo chocaba en nombre con el de la barra de sesión — el
fallo de english-log que `08-pruebas.md` cuenta.

**Cómo revertir.** Un commit. Quitar `<EnlaceALaMesa>` y `<CabeceraDeEscena>` devuelve la pantalla
a su rama de vacío; `escena.ts` y su prueba se pueden dejar, no los usa nadie más.

## `ENTITY_REVEALED` a mano y 2.5.8 (archivar), con su revisión aplicada (2026-09-04)

**Dos piezas de servidor.** Revelar una ficha subiéndole la visibilidad **ya deja rastro**, que es
lo que enciende la cabecera de escena de la mesa — escrita y probada en B1.1 y que hasta hoy no se
encendía nunca. Y un personaje **se archiva en vez de borrarse**: sale del listado, no se borra
nada, se recupera entero, y borrar de verdad sigue existiendo.

**La revisión de cierre encontró nueve cosas. Una era de correctitud.**

**El orden de visibilidades no existe.** Se comparaban los cinco niveles por su índice en una
fila, y `OWNER_DM` (la ve el creador) y `SPECIFIC_PLAYERS` (la ven los concedidos) **no son
comparables**: ninguno contiene al otro. Pasar de `OWNER_DM` a `SPECIFIC_PLAYERS` con la lista
vacía subía de índice y emitía «se reveló» cuando la ficha había pasado de verla una persona a no
verla nadie. Y no era ruido: `rules-engine/world-builder.ts` construye «qué se ha revelado» con
esas filas **sin caducidad y sin deshacer**, así que la ficha quedaba marcada como revelada para
siempre y una regla `REVEALED_WITH_TAG_AT_LEAST` empezaba a cumplirse sola.

Ahora se comparan **conjuntos de audiencia**, en `common/visibility.ts` junto a `canView`, que es
donde este proyecto guarda una sola vez quién ve qué. El par incomparable sale bien sin tratarlo
como caso especial, **y en las dos direcciones**.

Las otras ocho, en corto: archivar un PNJ escribía la fecha y no hacía nada —seguía en el
Bestiario y fuera de la lista de archivados— y ahora va 404; un archivado seguía siendo objetivo
válido de una petición de tirada y de un encuentro; el suceso de una revelación dirigida se
etiquetaba `SPECIFIC_PLAYERS` **y no lo veía nadie**, porque un `GameEvent` no tiene concesiones
propias (ficha P2, y el comentario que afirmaba lo contrario se corrigió); la ficha L1 decía siete
tipos sin traducir y son **doce**, porque cada tanda del motor añade tipos y ninguna puede tocar
`apps/web`; y **M9 estaba tachada sin estarlo** — el servidor existe, la pantalla no, y
`grep -rn "archiv" apps/web/src` da cero, así que el único gesto sigue siendo el borrado
definitivo.

**Dos pruebas no distinguían**, y las dos se reescribieron: la del orden de visibilidad pasaba con
cualquier orden que pusiera `DM_ONLY` primero, y la del listado afirmaba `toHaveBeenCalledWith`
sobre un mock que devolvía `[]` hiciera lo que hiciera el filtro — el ejemplo que
`docs/08-pruebas.md` prohíbe con esas palabras.

**Evidencia.** `pnpm verify` limpio; e2e de API en verde. Mutación: devolver la comparación por
índices deja **cuatro** aserciones rojas, justo los pares que el índice contestaba mal.

**Revertir:** `git revert -m 1` de la fusión. La migración solo añade una columna nullable y dos
valores de enum.

## B1.2 — el elenco en dos disposiciones, y volver a la mesa sale gratis (2026-09-04)

**Por qué.** El reseño invierte el modelo de Baldur's Gate 3 con una frase del autor: *«en BG3 es
un jugador manejando varios; acá somos varios manejando uno propio»*. En BG3 los retratos del grupo
son **mandos**; aquí no pueden serlo, porque el personaje de otro no es tuyo. De ahí la regla
vinculante: **sobre el retrato de otro no van botones.**

**Qué entra.** El elenco pasa a tener **dos disposiciones**: el jugador ve el suyo delante y con
detalle, y el resto del grupo en segundo plano, legible pero sin mandos; el DM ve la parrilla de
todos con mandos sobre cada uno, que es su situación real de BG3. Y **«desde aquí te perdiste»**:
una franja en el registro que marca por dónde seguir, del §6 del reseño — *«alguien puede irse a la
mitad y volver, y reincorporarse tiene que ser gratis»*.

**Dos decisiones declaradas.** La marca de lectura vive en `localStorage` y no en el servidor: por
dónde ibas leyendo es un dato del lector, no de la partida, y guardarlo en el servidor sería una
tabla y una escritura por cada vez que alguien mira la pantalla. Y la marca **se congela al
montar**: releerla en cada sondeo haría desaparecer la franja a los quince segundos, justo cuando
alguien vuelve y todavía no ha leído nada.

**Evidencia.** 819 unitarias de web; 100 recorridos de navegador. Mutación: dar mandos sobre el
personaje de otro deja el recorrido rojo con dos botones de más contados.

**Cómo revertir.** Un commit. El elenco vuelve a una sola lista quitando la rama del jugador;
`reincorporarse.ts` y su prueba se pueden dejar, no los usa nadie más.

## Tarea 2.5.2 — iniciativa y orden de turnos (2026-09-04)

`Encounter` y `Combatant` cuelgan de la sesión. La iniciativa **es una prueba de Destreza**
derivada por el motor (`CharacterSheetService.getInitiativeModifier`, reutilizando
`derived.initiative`) y tirada por el servidor (`RollsService`, el tirador inyectable de 2C); los
combatientes con el mismo `statblockRef` comparten una única tirada. El orden se calcula una vez y
se guarda; al completar la vuelta sube `Encounter.round` **y avanza el reloj de campaña seis
segundos** por el mismo camino que cualquier otro avance — demostrado en e2e: una condición de un
asalto queda vencida al terminar la vuelta **sin que el código del turno sepa nada de
condiciones**. Esa parte salió redonda a la primera.

**La revisión de cierre encontró cinco cosas, y una era una fuga crítica reincidente.**

1. **La iniciativa de un PNJ escondido se publicaba a la mesa entera.** La tirada iba con
   `audience: "PUBLIC"` fija, así que el jugador leía en su línea de tiempo una tirada de
   «Iniciativa» de un sujeto que no conoce, con su total y su modificador de Destreza dentro: sabía
   que había emboscada y con qué números. **Es la misma forma exacta de un fallo ya arreglado en
   este repositorio** —`character-sheet.service.ts` lleva escrito por qué la audiencia sale de la
   visibilidad del personaje— y hermano del segundo hallazgo de la revisión de 2C. Había vuelto.
2. **Dos fugas más por deducción**: el suceso de inicio contaba ocho combatientes a quien solo veía
   dos, y las posiciones viajaban con huecos —`[0, 7]` son seis criaturas escondidas—. Ahora el
   suceso no cuenta cabezas, las posiciones visibles se renumeran densas y `activePosition` viaja
   como `null` cuando el turno es de alguien que no se ve.
3. **La posición es del GRUPO, no del combatiente.** Se implementó con una posición por fila
   apoyándose en un índice `@@unique([encounterId, position])` que **se atribuyó al spec y a las
   convenciones, y que ninguno de los dos enuncia** — lo pidió mi encargo sin pensarlo. Manda la
   fuente: *«The DM makes one roll for an entire group of identical creatures, so each member of
   the group acts at the same time»* (SRD 5.1, «Initiative»). Con ocho posiciones la mesa jugaba
   seis turnos de goblin seguidos. La restricción correcta es que **un personaje no entre dos
   veces**, y `groupKey` guarda a qué grupo pertenece cada fila.
4. **Corregir la iniciativa no cambiaba nada.** Actualizaba la columna y dejaba `position` intacta,
   con un comentario que además prometía poder «separar a un grupo que actuaba junto». Como
   `advanceTurn` ordena solo por `position`, la columna era decorativa y la única razón por la que
   el SRD deja editarla —deshacer un empate— no se cumplía. Ahora recoloca, y el corregido sale de
   su grupo.
5. **Dos grupos empatados se partían el uno al otro**: el desempate era por `cuid`, así que seis
   goblins y cuatro orcos con la misma tirada quedaban intercalados. Ni la unitaria ni el e2e lo
   veían — los dos usaban un solo grupo.

**Y una cifra del spec que sigue abierta:** dice «siete posiciones» para dos personajes y seis
goblins, y del modelo correcto salen **tres** (dos grupos de uno más el de goblins). El modelo del
spec es el bueno; la cuenta no sale de ninguna lectura. Ficha **C2.5-1**, pendiente del autor.

**Revertir:** `git revert -m 1` de la fusión. Las tres migraciones solo crean tablas y columnas
nuevas; bajarlas es `prisma migrate resolve --rolled-back` y un `DROP TABLE "Combatant",
"Encounter"` si ya se aplicaron.

---

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
