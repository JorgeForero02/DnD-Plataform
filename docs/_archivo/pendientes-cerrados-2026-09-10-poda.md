# Pendientes cerrados — la poda del 2026-09-10

**Treinta y nueve bloques que `06-pendientes.md` arrastraba y que salen enteros**, clasificados
contra el árbol en `4ced2bc` dos días después del reconocimiento del 2026-09-08. Se pidió con dos
instrucciones: *«cierra o poda las falsas»* y *«para las de decisión usa los cuatro pasos»*. Tres
clases de bloque, y cada cabecera de abajo dice cuál es:

- **FALSA** — el código la contradice. La evidencia va con fecha y `fichero:línea`, como exige la
  cabecera del 06 desde el 2026-09-05.
- **Tachada** — llevaba «CERRADA» o `~~…~~` dentro y seguía en el documento contra su propia regla
  («lo tachado sale»). No se re-mide: ya se midió cuando se tachó.
- **Decidido / no es ficha** — pasada por los cuatro pasos de `04-convenciones.md` (§ *Antes de
  abrir una ficha*). O era una decisión ya declarada que vivía disfrazada de deuda, o un
  compromiso conocido sin nada que hacer, o una nota de herramienta. Las decisiones que salen de
  aquí tienen su fila en `decisiones.md` (`D-POD-*`).

**No se editan.** Cada bloque se conserva **entero y con su texto original** bajo su cabecera,
con las líneas que ocupaba en `06-pendientes.md` en `4ced2bc` para poder volver a él.

## La medición que cierra cada FALSA

| Ficha | Lo que decía | Lo que hay |
|---|---|---|
| **N2** | `recordEntityOpened` implementado y NO conectado | `entities/entities.service.ts:160` lo llama al abrir una ficha · `7fec559` 2026-09-02. La obligación que la ficha añadía —avisar en pantalla de que abrir una ficha puede disparar reglas— se cumple a medias: el aviso existe en `PanelDeEstadoDelMundo.tsx:110` y `LoQueSabeLaMesa.tsx:119` para las marcas, no al abrir una ficha. Es menor y no reabre la ficha: el suceso es `DM_ONLY` |
| **N3** | los dos e2e declaran su propio `TestAppModule` | `apps/api/test/notifications.e2e-spec.ts:4,23` y `world-state.e2e-spec.ts:4,23` importan `AppModule`, con un comentario que cuenta la corrección · `a5b6c03` 2026-09-02 |
| **M2B-12** | la hoja lee el inventario por otra conexión dentro de una transacción bloqueada | `character-sheet.service.ts:398-404` — `equipoEquipado(userId, character, tx?)` recibe el cliente de la transacción, y los dos llamadores dentro de una (`:494`, `:1056`) se lo pasan · `85d0882` 2026-09-07 (ficha P2-0b) |
| **M8** | modificadores temporales con caducidad, «no está escrito en ningún plan» | plan 13 los construyó: `apps/api/src/temporary-modifiers/`, caducan contra el reloj de campaña · `bf33b0e` 2026-09-05 |
| **A3** (documentación) | el censo de controladores caducado sigue en `docker-compose.prod.yml` | el comentario de la comprobación de salud se reescribió entero (E-15-3) y ya no censa nada: `docker-compose.prod.yml:76-91` · `bf1b1c9` 2026-09-05 |
| **A3-invitaciones** (dos tercios) | invitaciones sin caducidad ni revocación | `schema.prisma:268` `expiresAt`, `:272` `revokedAt`, plan 11 · `bf1b1c9` 2026-09-05. **«Usos máximos» sigue en el 06**, trimado: es una columna, o sea migración |
| **I8** | el nombre legible de una competencia no existe en ninguna parte | `BloquesDelPie.tsx:26` `CompetenciasConArmas` pinta las claves a través de `vocabulario.ts:115` · `8466c82` 2026-09-06 |
| **`--warning` y `--success`** | faltan los dos tokens y tres sitios pagan por ello | `ui/tokens.css` declara `--warning-ch` en los cuatro temas (11 apariciones) y `--success` **no se añade por decisión** (D-OP-7, `tokens.css:130`); lo dice `04-convenciones.md` |
| **Seguridad · 8** | la propia fila se declaraba «HECHO salvo la recuperación» | `pages/AccountPage.tsx`; la recuperación vive en **D8** del bloque de despliegue, que sigue en el 06 |
| **P3 · `key` en `EntityTab`** | falta al cambiar de pestaña | `pages/CampaignDetailPage.tsx:947` `<EntityTab key={tipo} …>` · `4dcb25f` 2026-09-04 |
| **P3 · enlace sin comprobar visibilidad del destino** | oráculo de existencia para un id ajeno | `links/links.service.ts:64` exige `requireDM` antes de mirar el destino, y el DM ve todo: no hay oráculo · `32c595c` 2026-09-02 |
| **P3 · token de invitación** (media línea) | no caduca ni es revocable | igual que A3-invitaciones. La mitad transaccional sigue en el 06 |
| **P3 · `Character` sin creador** (media línea) | el dueño no ve su personaje `DM_ONLY` | `common/character-viewer.ts:42-47` pasa `createdById: character.ownerId` a `canView` · `528c58c` 2026-09-03. La mitad de `Session` sigue en el 06 |
| **Antes de ejecutar 2A** (sección) | dos ausencias: el dinero y la visibilidad de un objeto | D-2B-5 (cinco columnas de moneda) y `schema.prisma:1103` `CampaignItemVisibilityGrant` (D-2B-7) |
| **Antes de la primera partida** (sección) | — | solo contenía una frase tachada y dos avisos que se declaran caducados a sí mismos |
| **Un riesgo con fecha** | la sesión «de la semana que viene» (2026-09-02) | D-OP-6 la cerró como mitigación de coste cero, y la fecha pasó |
| **Lo que dijeron los jugadores** (tres filas) | ranuras · atributos temporales · varios personajes | D-2B-2 (ranuras, 2B) · plan 13 (temporales) · plan 06 (M9, archivar). Las otras filas ya tenían ficha propia (P1 mago, M10b, M11) y la sección entera era un registro fechado |

## Lo que los cuatro pasos decidieron

| Bloque | Paso que lo contesta | Resultado |
|---|---|---|
| `@testing-library/user-event` no instalado | no es deuda: no hay prueba que lo necesite | Se instala el día que una prueba lo pida (D-POD-1) |
| S3 · el catálogo en `apps/api` | decisión ya declarada en la propia ficha | Se queda ahí; si hace falta el paquete es un `git mv` (D-POD-2) |
| I2 · la red y la cerbatana | decisión declarada en la cabecera de `weapons.ts` | Fuera hasta que `damageDice` admita daño plano, y eso lo pide el paso 3 si lo pide (D-POD-3) |
| I9 · el conteo es una cota inferior | ya lo declara el bloque generado de `00-INDEX.md` | No es ficha: es una propiedad documentada del control (D-POD-4) |
| H2b · el `PATCH` absoluto no se recorta | la ficha misma dice «es deliberado» | Decisión: un DM que escribe un número quiere ese número (D-POD-5) |
| D5 · nadie ha restaurado una copia | contradice la decisión de la cabecera del 06 | Fuera: la copia no se propone ni se menciona (decisión del autor, 2026-09-05) |
| D7 · `TRUST_PROXY` en Coolify sale caro | trampa conocida, ya en `03-despliegue.md` y en `CLAUDE.md` | No es ficha |
| Seguridad · 7 · token en `localStorage` | compromiso declarado en la auditoría del 2026-09-01 | Decisión (D-POD-6) |
| 1.18a · `JwtStrategy.validate` consulta la base | la ficha misma da la salida («si algún día pesa») | Decisión: se paga por invalidar tokens al cambiar la contraseña (D-POD-7) |
| 1.18a · `AUTH_RATE_LIMIT` en la suite | ya lo declara `04-convenciones.md` entero | No es ficha |
| 1.18a · `main.ts` sin prueba | «cinturón y tirantes», por su propio texto | Compromiso, no deuda (D-POD-8) |
| Densidad 14 px | decisión con las pantallas delante | Va a `04-convenciones.md` como regla, que es donde faltaba (D-POD-9) |
| Etiqueta huérfana del filtro (1.17c) | «decisión deliberada, no un descuido», por su propio texto | Decisión (D-POD-10); si molesta jugando, ficha nueva con lo que se vio |
| P2 · fichas que mienten con un barrido dentro | su lección ya es regla en `04-convenciones.md` («nombrar el símbolo y dejar el barrido escrito») | Se archiva con las dos mediciones que la mantenían abierta |
| P5 · MADR hacia adelante | decisión, no deuda | D-POD-11 |
| J10 · el modificador de tirada sin tope | paso 3: el SRD no da tope; la ficha misma: «trampa a ojos vista que el DM vigila» | No es fallo (D-POD-12) |

## Lo que NO se movió, y por qué

Tres fichas que estaban en «decide el autor» **salen de ahí sin salir del 06**, porque los cuatro
pasos las contestan y hay una prueba que las ve fallar: `start()` con dos DM (su premisa —«no hay
pantalla para un segundo DM»— caducó con el plan 11), `U10` (las frases pueden salir de una matriz
que una prueba compara con `canView`) y `M2B-14` (el SRD 5.1 trae *Weapon/Armor/Shield +1, +2,
+3*, así que no es decisión de producto sino transcripción). Las tres llevan su nota en el 06.

Y lo que sigue siendo del autor de verdad —migraciones (`race`/`class`, cargas, `RestKind`, un
suceso `DEATH`), lo que solo se juzga jugando (la mesa a 390 px, el hilo con el suceso de archivar),
decisiones de producto (identificado, sobrecarga, editar en silencio, compartir lo revelado, el
correo, `isAdmin`), y el editor TipTap que **nunca se montó** (cero imports en `apps/web/src`)—
sigue en el 06 con su medición.

---

# Los bloques, enteros

## Segunda tanda · el arrastre del editor de reglas (tachada)

*(Líneas 316–340 de `06-pendientes.md` en `4ced2bc`.)*

- ~~**El arrastre del editor de reglas no está probado en un navegador, y puede que no funcione.**~~
  **CERRADA (2026-09-05), remedida en el navegador** — plan 14, punto 14.1. La medición está en
  `apps/web/e2e/arrastre-dentro-del-cajon.spec.ts:85` y **repite el experimento original**, no uno
  parecido: el mismo `<div draggable>` trivial, dentro del cajón y fuera, comparados. El resultado,
  con su fecha: **`dragstart` FUERA: SÍ · `dragstart` DENTRO del cajón: SÍ.** Y el arrastre real,
  con ratón paso a paso, también: `apps/web/e2e/reglas-arrastrar.spec.ts` pasa sus **ocho**
  recorridos, incluido *«arrastrar una pieza hasta su carril la coloca de verdad»*.

  **Lo que había caducado era la premisa, no el diagnóstico.** Aquel dato era cierto contra el
  `Dialog` de entonces —cuadro centrado con `max-h-[85vh]`—, y la Ola 0 lo convirtió en **cajón
  lateral de altura completa**: justo la variable que la medición culpaba. Es lo que D-OP-19 dejó
  escrito que había que rehacer.

  **La primera pasada de esta remedición dio un control falso** —«fuera: NO»— porque la sonda se
  añadía al final del `body` y en la página de campaña caía fuera de la vista: geometría, no
  contexto. Se fijó su posición y entonces midió. Queda escrito porque una medición con el control
  roto habría «confirmado» el diagnóstico viejo por el motivo equivocado.

  Texto original:
  > En la página del editor **no se dispara ni un `dragstart`**. Descartado ya: `dragTo` frente a
  > ratón paso a paso, `<button>` frente a `<div draggable>`, con y sin `clip-path`, con y sin
  > `user-select: none`. El dato que apunta a dónde mirar: un `<div draggable>` **trivial**
  > inyectado *dentro del diálogo* tampoco arrastra, y uno inyectado *fuera* sí — así que **es del
  > contexto, no de la pieza**. Sospechas sin comprobar: el atrapa-foco del diálogo, o algo del
  > apilado.

## Segunda tanda · `BarraDeSesion` y la cabecera (tachada)

*(Líneas 341–346 de `06-pendientes.md` en `4ced2bc`.)*

- ~~**`BarraDeSesion` y la cabecera se pelean por la misma banda.**~~ **CERRADA (2026-09-05):**
  `features/sessions/BarraDeSesion.tsx:45` define `PEGADA_BAJO_LA_CABECERA` y el `sticky` lo lleva
  el envoltorio; además la mesa ya no vive dentro de `AppShell`. Texto original: ~~Las dos son
  `sticky top-0`; la barra va a `z-30` y la cabecera también es fija. Con una sesión en curso se
  solapan. Es previo a esta tanda y no lo tocó nadie. La cabecera de combate de la hoja va a
  `top-16` y quedará por debajo de la barra, no encima, así que el defecto se ve más ahora.

## Segunda tanda · `@testing-library/user-event` (decidido: se instala cuando una prueba lo pida)

*(Líneas 354–356 de `06-pendientes.md` en `4ced2bc`.)*

- **`@testing-library/user-event` no está instalado**, así que las pruebas de componente que
  querrían simular teclado real usan `fireEvent`. No es falso —se comprueba que el control es
  activable y que su activación coloca— pero es menos fiel.

## Segunda tanda · `ui/Iconos.tsx` sin icono de inventario (tachada)

*(Líneas 357–361 de `06-pendientes.md` en `4ced2bc`.)*

- ~~**`ui/Iconos.tsx` no tiene icono de inventario.**~~ **CERRADA (2026-09-05)**, y hoy el problema
  es el **contrario**: hay conceptos duplicados entre `ui/Iconos.tsx` y nueve ficheros de
  `features/` (escudo ×3, mochila ×3, sol ×2, luna ×2). Lo cierra el **plan 07**. Texto original:
  ~~La hoja dibuja un `IconoArcon` local; cuando
  2B monte el inventario debería subir a la casa común.

## E0 · las dependencias de TipTap (tachada)

*(Líneas 365–373 de `06-pendientes.md` en `4ced2bc`.)*

- ~~**Las dependencias de TipTap están en `devDependencies`.**~~ **CERRADA (2026-09-05, plan 01):**
  los seis paquetes están ahora en `dependencies` de `apps/web/package.json:19-24`, con las mismas
  versiones (`^3.31.0`) y con el movimiento reflejado en `pnpm-lock.yaml`. No se esperó a que `src/`
  los importara a propósito: la ficha condicionaba el arreglo a un momento futuro que nadie iba a
  vigilar. Texto original: ~~Hoy su único consumidor es
  `scripts/e0-tiptap-roundtrip.mjs`, que no se empaqueta. **E1 tiene que moverlas a
  `dependencies` en cuanto las importe desde `src/`**, o la imagen de producción se
  construirá sin ellas y el editor no existirá allí. Es un fallo que no se ve en local,
  porque en local están instaladas igual.~~

## S3 · el catálogo vive en `apps/api` (decidido: se queda)

*(Líneas 407–407 de `06-pendientes.md` en `4ced2bc`.)*

| **S3** | **El catálogo vive en `apps/api/src/rules/catalog/`, no en un paquete `packages/srd`** | El plan (§4.1) dejaba las dos abiertas. Hoy **solo lo consume el propio borde de la API, dentro de `apps/api`**, y crear un paquete costaría cableado de compilación por cero beneficio. (La justificación anterior decía «un solo consumidor, el motor» y era **al revés**: la dirección real es `catalog → engine`. Corregido tras la revisión.) La web ya los pide por endpoint (`GET /catalog`, `apps/api/src/rules/catalog.controller.ts`, creado el 2026-09-02 al ver que la pantalla los tenía transcritos a mano). La deuda de fondo sigue: el catálogo continúa dentro de `apps/api`. Si aun así conviene el paquete, es un `git mv` |

## I2 · la red y la cerbatana (decidido: declarado en `weapons.ts`)

*(Líneas 420–420 de `06-pendientes.md` en `4ced2bc`.)*

| **I2** | **Dos armas del SRD no están: la red y la cerbatana** | Ninguna cabe en la forma: la red no hace daño y la cerbatana hace «1» fijo, no un dado. Modelarlas exige que `damageDice` admita un daño plano o nulo, que es un cambio de forma en `packages/shared`. Declarado en la cabecera de `weapons.ts` para que no parezca un olvido |

## I9 · el conteo de unitarias es una cota inferior (decidido: lo declara el bloque generado)

*(Líneas 425–425 de `06-pendientes.md` en `4ced2bc`.)*

| **I9** | **El conteo de unitarias del bloque de estado es una cota inferior, no lo que imprime el corredor** | `scripts/update-estado.mjs` cuenta **declaraciones**, y un bloque `it.each` declara una y ejecuta varias: hay más de cuarenta, así que la cifra va varios cientos por debajo de la real. El comentario del script decía «nada aquí usa `.each`» e **invitaba a comprobarlo con un grep**; el grep lo desmiente. Corregido el texto y ampliada la expresión regular para que al menos cuente el bloque, pero **la cifra sigue sin ser la del corredor**. El arreglo de verdad es leer los informes de `vitest`/`jest` (`--reporter=json`) en vez de contar líneas, y cuesta que `check:estado` deje de ser barato — que es justo por lo que está donde está en `pnpm verify`. Lo encontró la auditoría de documentación de 2B |

## I8 · el nombre legible de una competencia (FALSA)

*(Líneas 427–427 de `06-pendientes.md` en `4ced2bc`.)*

| **I8** | **El nombre legible de una competencia ya no existe en ninguna parte** | Al pasar `weaponProficiencies`/`armorProficiencies` a claves de máquina, las frases en español («Armas marciales») desaparecieron. **Nadie las pintaba**, así que no se rompió nada, pero el día que la hoja quiera enseñar «Competencias e idiomas» hará falta la tabla de traducción — en la pantalla, como con toda clave del catálogo, y no de vuelta en el dato |

## M2B-12 · la hoja lee el inventario por otra conexión (FALSA)

*(Líneas 470–470 de `06-pendientes.md` en `4ced2bc`.)*

| **M2B-12** | **La hoja lee el inventario por otra conexión dentro de una transacción bloqueada** | El refutador rebajó esto de «incorrección» a **higiene**: lo que se lee está confirmado, pero son N+1 consultas sosteniendo un candado de fila. Se arregla pasando el `tx` hasta `equipoEquipado` |

## Sección entera · Lo que dejó la auditoría de documentación — A3 (FALSA)

*(Líneas 472–481 de `06-pendientes.md` en `4ced2bc`.)*

## Lo que dejó la auditoría de documentación (2026-09-02)

Dos agentes auditaron los ocho documentos numerados **contra el código**, afirmación por
afirmación. **Treinta hallazgos, todos corregidos el mismo día** salvo estos tres, que son
trabajo y no una frase:

| | Qué | Por qué importa |
|---|---|---|
| **A3** | **El censo de controladores caducado también está en `docker-compose.prod.yml`**, en el comentario que justifica la comprobación de salud de la API | Es la misma mentira en dos sitios; se corrigió la del documento y queda la del compose. Cambiar el compose recompila la imagen en Coolify, así que **se hace con el siguiente despliegue, no suelto** |

## H2b · el `PATCH` absoluto no se recorta (decidido: se anota como decisión)

*(Líneas 499–499 de `06-pendientes.md` en `4ced2bc`.)*

| **H2b** | **El `PATCH` absoluto de PG del DM no se recorta contra el máximo** (el `POST` de delta sí) | Es deliberado y coherente con «recortar al leer, nunca al recalcular»: **un DM que escribe un número quiere ese número**. Se anota porque parece un olvido y no lo es, y porque si algún día se decide lo contrario hay que decidirlo, no arreglarlo |

## Sección entera · Cabos sueltos de 2A.14 y 2A.15 — N2 y N3 (FALSAS)

*(Líneas 501–509 de `06-pendientes.md` en `4ced2bc`.)*

## Cabos sueltos de 2A.14 y 2A.15 (2026-09-02)

Los deja la implementacion **a proposito y dichos**, en vez de inventar el enganche.

| | Que | Por que importa |
|---|---|---|
| **N2** | **`recordEntityOpened` esta implementado y NO esta conectado** al modulo de entidades | Es el suceso `ENTITY_OPENED` que el motor de reglas escucha (hueco **H3**), y ya se escribe con visibilidad `DM_ONLY` como se decidio. Conectarlo toca `entities`, que estaba fuera de la frontera de esa tarea. **Y con el va una obligacion que no se puede olvidar**: la interfaz tiene que avisar al jugador de que abrir una ficha puede disparar reglas — registrar quien abre que es vigilancia si nadie lo dice |
| **N3** | **Los dos e2e nuevos declaran su propio `TestAppModule`** que reproduce la composicion de `app.module.ts` | Es una segunda copia del mismo hecho, y dos copias derivan — el problema exacto que este proyecto lleva todo el dia evitando. Nacio de una frontera de ficheros necesaria (el agente no podia tocar `app.module.ts`), y **se corrige en cuanto los modulos estan cableados**: pasan a importar `AppModule` como el resto |

## M8 · modificadores temporales con caducidad (FALSA)

*(Líneas 525–525 de `06-pendientes.md` en `4ced2bc`.)*

| **M8** | **Modificadores temporales con caducidad** — *«+2 a Fuerza durante una hora»*. Lo pidieron los jugadores y **no está escrito en ningún plan**: no es un estado con nombre ni un objeto equipado, es un modificador con fecha de fin | Necesita el **reloj de campaña**, que es 2C. El modelo de modificadores de 2A ya sabría aplicarlo; falta quién decide que ha caducado. Meterlo sin reloj sería un campo que nadie limpia |

## M9 · el personaje se archiva (tachada)

*(Líneas 526–526 de `06-pendientes.md` en `4ced2bc`.)*

| **M9** | ~~**El personaje se archiva, no se borra**~~ **— CERRADA el 2026-09-05 (plan 06).** El gesto existe en `apps/web/src/features/characters/BotonArchivar.tsx`, montado en `AjustesDePersonaje.tsx` junto a borrar y **más barato que él**; la puerta de salida es `features/characters/ArchivoDePersonajes.tsx`, montada en la lista de personajes de `pages/CampaignDetailPage.tsx`; y las tres llamadas que faltaban están en `features/characters/api.ts`. `grep -rn "archiv" apps/web/src` ya no da cero. Probado por `features/characters/__tests__/archivar.test.tsx` y por el camino entero de `apps/web/e2e/archivar.spec.ts` | Lo que la ficha exigía era que **cambiara cuál de los dos gestos es el fácil**, y cambia: archivar es un botón `secondary` con una confirmación que dice **que se recupera**, y borrar conserva su filete de peligro y ahora además **nombra archivar como la salida barata**. Con ella se cierra el último de los tres gestos de **D-OP-8** |

## M10a · revocar una concesión (tachada)

*(Líneas 527–527 de `06-pendientes.md` en `4ced2bc`.)*

| **M10a** | ~~**Revocar una concesión de visibilidad**~~ **— MITAD FALSA, comprobada el 2026-09-05.** `entities.service.ts:171` hace `deleteMany` y reescribe las concesiones al editar: **revocar sí se puede**. La ficha decía lo contrario | **Lo que sigue vivo es M10b** |

## Texto original de la línea sustituida · A3-invitaciones

*(Líneas 539–539 de `06-pendientes.md` en `4ced2bc`.)*

| **A3-invitaciones** | **Invitaciones con usos máximos, caducidad y revocación** | Hoy es un enlace por persona —decisión declarada— y montar una mesa de cuatro exige generar cuatro. **Un enlace eterno no**: acaba circulando por un grupo y la visibilidad se apoya en quién es miembro |

## Sección entera · Lo que dijeron los jugadores (registro; tres filas FALSAS, el resto ya tiene ficha propia)

*(Líneas 552–571 de `06-pendientes.md` en `4ced2bc`.)*

## Lo que dijeron los jugadores (2026-09-02)

Respondieron a las ocho preguntas de la presentación *"Delante de la pantalla"*. El detalle y el
razonamiento están en
[`superpowers/specs/2026-09-02-respuestas-jugadores-design.md`](./superpowers/specs/2026-09-02-respuestas-jugadores-design.md).
Lo que mueve algo:

| | Qué pidieron | Consecuencia |
|---|---|---|
| **Ranuras de equipo** | *"sí, es muy importante"* | El hueco H1 deja de ser recomendación: entra en 2B, con el objeto en **tres** estados (llevado / equipado / sintonizado, tope 3) |
| **Inventario de hechizos** | Es lo primero que nombran al preguntarles qué llevan a mano | **Contradice la exclusión** de la spec de la fase 2. Recomendación: los espacios de conjuro entran como **recurso consumible** en 2A — el mismo contador que la inspiración— y fuera queda solo interpretar cada conjuro |
| **Atributos temporales** | *"subidas y bajadas de atributos temporales"* | Hueco nuevo: un **modificador con caducidad** no está escrito ni en 2A ni en 2C |
| **El DM edita sin avisar** | Con ejemplo: la **hidra falsa** | Hace falta **revocar** una concesión de visibilidad —hoy solo se puede conceder— y un interruptor de edición silenciosa. **Las notas del propio jugador no se borran**: es lo que hace que el truco funcione en la mesa |
| **Compartir lo revelado** | *"si la quiero o no compartir"* | Capacidad nueva: que un jugador pase a otro lo que le contaron. Decidir si crea concesión (y el DM la ve y puede revocarla) |
| **Varios personajes** | *"que se queden guardados como recuerdos… te pueden revivir"* | Un personaje **se archiva, no se borra**. Barato ahora; el borrado de hoy es definitivo |
| **Móvil** | *"aunque es incómodo, sería interesante"* | Cada pantalla nueva se decide también en estrecho. Ya hay medio pago hecho: suelo de 16 px en controles táctiles (1.19b) |

Sin cambios, y confirmado por ellos: no hace falta ver las tiradas ajenas en vivo (el sondeo
basta) y los dados con física siguen siendo una opción, no una prioridad.

## Sección entera · Antes de ejecutar 2A — huecos del alcance (FALSA: las dos ausencias las cerró 2B)

*(Líneas 572–599 de `06-pendientes.md` en `4ced2bc`.)*

## Antes de ejecutar 2A — huecos del alcance, sin decidir (2026-09-01)

Salieron de una pregunta del autor: *"¿hay un sistema de manos? me pongo un escudo que me da más
CA pero llevo un arma en la otra"*. La spec dice que los objetos se **equipan y desequipan** y
**nunca dice dónde**: no hay ranuras. Buscando huecos de esa misma forma —la regla lo exige, la
mesa lo toca pronto, y el alcance no tiene dónde ponerlo— aparecieron **doce**, en
[`superpowers/specs/2026-09-01-huecos-fase-2-design.md`](./superpowers/specs/2026-09-01-huecos-fase-2-design.md),
con 16 preguntas para el autor.

> **Los cuatro de abajo están decididos desde el 2026-09-02**, en ausencia del autor y con su
> permiso expreso: manos **reservadas como columna en 2A y modeladas en 2B**; descansos y dados
> de golpe **en 2A**; PG temporales **en 2A, como columna propia**; pericia **en 2A, como tercer
> estado por habilidad**. El razonamiento, y lo que cuesta si algún fallo está mal, en
> [la parte 2 del plan, §1](./superpowers/plans/2026-09-02-fase-2A-parte-2-eventos-distancias-y-cierre.md).
> Se conserva el planteamiento tal cual porque explica **por qué** había que decidirlos antes de
> la primera migración:
>
**Los cuatro que había que decidir antes de la primera migración** —los que cambian la **forma**
de una tabla— **están decididos y aplicados**. Sus cuatro fichas se cerraron y viven en
[`_archivo/pendientes-cerrados-hasta-2026-09-05.md`](./_archivo/pendientes-cerrados-hasta-2026-09-05.md).

**Y dos ausencias completas**, no decisiones: **el dinero** no aparece ni una vez en las 805
líneas de la spec, y **un objeto del inventario no tiene visibilidad** — el DM prepara la
mazmorra el jueves y la mesa le ve el botín el viernes.

**Esto no se decide de pasada.** La spec de alcance es un registro fechado y no se reescribe:
las decisiones que salgan de aquí entran en el plan de 2A, con su firma.

## D5 · nadie ha restaurado una copia (contradice la decisión de la cabecera)

*(Líneas 610–610 de `06-pendientes.md` en `4ced2bc`.)*

| **D5** | **Nadie ha restaurado nunca una copia de *esta* base** — ahora con más motivo: ya existen copias diarias reales que nadie ha probado a restaurar | Una copia sin restauración probada es una hipótesis. Requisitos reales de la restauración en [03-despliegue.md](./03-despliegue.md) |

## D7 · corregir `TRUST_PROXY` en Coolify sale caro (trampa conocida, no ficha)

*(Líneas 611–611 de `06-pendientes.md` en `4ced2bc`.)*

| **D7** | **Corregir `TRUST_PROXY` en Coolify sale caro** | Ahí las variables de entorno son argumentos de construcción: cambiar una **recompila la imagen**. Por eso el valor vive en el compose y no en la UI |

## Sección entera · Antes de desplegar — seguridad (7: compromiso declarado · 8: FALSA)

*(Líneas 614–631 de `06-pendientes.md` en `4ced2bc`.)*

## Antes de desplegar — seguridad

**Auditoría hecha el 2026-09-01 sobre el commit `4a3fe43`, con todos los hallazgos verificados
en el código.** El detalle, la evidencia y el orden de arreglo están en
**[`superpowers/specs/2026-09-01-endurecimiento-seguridad-design.md`](./superpowers/specs/2026-09-01-endurecimiento-seguridad-design.md)**
— ahí está todo, para no tener que auditar otra vez.

Lo que **sí** está cubierto (comprobado, no supuesto): inyección SQL, XSS, validación de
entrada, contraseñas con argon2, autorización en el servidor y ausencia de secretos en el
código.

Lo que falta, y va como **tarea 1.18**:

| | Hallazgo | Gravedad |
|---|---|---|
| 7 | El token vive en `localStorage` — compromiso conocido, no urgencia | Bajo |
| 8 | **HECHO, servidor y pantalla.** Se puede cambiar el nombre visible y la contraseña —exigiendo la actual, verificada con argon2—, y cambiarla **invalida los tokens anteriores**. **La pantalla también está**: `pages/AccountPage.tsx`, con su formulario de nombre y el de contraseña; la frase «falta la pantalla (va en 1.18b)» era falsa y se retiró el 2026-09-08. **Lo único que sigue BLOQUEADO es recuperarla si se olvida**: necesita servicio de correo, que no existe — su ficha viva es **D8** del bloque de despliegue | cerrado salvo la recuperación |

## Sección entera · Deuda de la capa visual tras 1.19b (`--warning`/`--success`: FALSA · densidad: decidida · idioma: tachada)

*(Líneas 632–660 de `06-pendientes.md` en `4ced2bc`.)*

### Deuda de la capa visual, tras 1.19b (2026-09-01)

Las 19 pantallas están convertidas: cero clases de paleta de Tailwind en `apps/web/src`, el
interruptor de tema vive en el chrome, y el contraste se mide sobre pantallas **reales** en los
dos temas. El defecto que motivó la tarea está cerrado: el distintivo `DM_ONLY` en tema claro
pasó de **1,10:1 a 5,95:1**.

Lo que queda abierto:

- **Faltan `--warning` y `--success`, y tres sitios pagan por ello.** Los usos viejos de `amber`
  y `emerald` se remapearon a los tokens existentes; siete de los once quedaron bien o mejor
  (dos eran avisos mal etiquetados que ahora son rojos de verdad), pero tres perdieron su
  registro: el aviso de que generar otro enlace **no anula los anteriores** (arreglado en
  falso con `--danger-text`, que dice "peligro" donde toca decir "cuidado"), la razón por la
  que no puedes editar una fila —que hoy se lee como metadato, igual que las etiquetas— y el
  "Copiado." del panel de invitaciones, que usa el color de los enlaces. **Está esperando una
  decisión del autor entre dos direcciones de paleta**, con los hexadecimales ya medidos en los
  dos temas. No se inventa un color mientras tanto.
- **La densidad quedó en 14 px de base**, decidida con las pantallas delante y no como efecto
  colateral. Los controles de formulario llevan **suelo de 16 px en pantallas táctiles**
  (`@media (pointer: coarse)`), porque por debajo de eso iOS Safari hace zoom al enfocar — la
  primera versión del arreglo argumentaba que el riesgo no aplicaba "porque cada control lleva
  clase explícita", y lo que dispara el zoom es el tamaño **calculado**.
- ~~**La interfaz sigue mezclando idiomas**~~ — **CERRADA (2026-09-05)**: cero coincidencias de
  *Email*, *Password* o *Log in* en `pages/LoginPage.tsx`. Texto original: ~~la pantalla de entrar dice *Email*, *Password* y
  *Log in* en inglés, contra la regla del proyecto (interfaz en español). No se tocó dentro de
  una tarea de color; es tarea propia, y arrastra los localizadores de los recorridos de
  navegador.

## 1.18a · `JwtStrategy.validate` consulta la base (compromiso declarado)

*(Líneas 679–683 de `06-pendientes.md` en `4ced2bc`.)*

- **`JwtStrategy.validate` consulta la base en CADA petición autenticada**, y carga la fila
  entera del usuario (el hash incluido) para devolver dos campos. Es el precio de invalidar los
  tokens al cambiar la contraseña: el token no lleva ninguna señal de un cambio posterior, así
  que la única forma es preguntar a la fuente de la verdad. Si algún día pesa, la salida es un
  `select` estrecho y, si aún pesa, caché corta.

## 1.18a · límite de intentos con prueba (ya cerrada el 2026-09-02)

*(Líneas 684–689 de `06-pendientes.md` en `4ced2bc`.)*

- **Cerrado el 2026-09-02:** `POST /auth/register` y `POST /invites/:token/accept` llevaban
  límite de intentos **sin ninguna prueba que se pusiera roja si se quitaba el decorador**. Ya la
  tienen, comprobada por mutación. De paso se descubrió que el guardia de Nest indexa por
  `Controlador-manejador-IP`, así que **cada ruta tiene su propio cubo** y no compiten por el
  presupuesto — lo que sí competía era la preparación de la prueba de contraseña, que se
  registraba por HTTP; ahora crea el usuario por dentro.

## 1.18a · `AUTH_RATE_LIMIT` condiciona la suite (ya lo declara `04-convenciones.md`)

*(Líneas 690–692 de `06-pendientes.md` en `4ced2bc`.)*

- **`AUTH_RATE_LIMIT` (5/min) condiciona la suite e2e**: `auth.e2e-spec.ts` gasta 3 de esas 5
  llamadas en la misma ventana. Quien añada un login de más verá un 429 que parece un fallo de
  credenciales. **La respuesta es reestructurar el fichero, nunca subir la constante.**

## 1.18a · `main.ts` y `loadBootEnv()` (compromiso declarado)

*(Líneas 699–701 de `06-pendientes.md` en `4ced2bc`.)*

- **Sin prueba automática de que `main.ts` llame a `loadBootEnv()`**: la garantía se movió
  dentro de `buildAdapter()`, donde sí la fija una prueba. La llamada de `main.ts` es cinturón
  y tirantes.

## Sección entera · Tarea 1.17 — cierre real de la fase 1 (vacía: B1/B2/B3 cerradas, C1 vive en E1, etiqueta huérfana decidida, etiquetas duplicadas tachada)

*(Líneas 703–776 de `06-pendientes.md` en `4ced2bc`.)*

## Tarea 1.17 — cierre real de la fase 1

**Contraste sistemático entre lo que el modelo y la API permiten y lo que la pantalla ofrece**,
hecho el 2026-09-01 al preguntar el autor si había un cuaderno para escribir la historia.
Detalle y evidencia en
**[`superpowers/specs/2026-09-01-cierre-fase-1-congruencia-design.md`](./superpowers/specs/2026-09-01-cierre-fase-1-congruencia-design.md)**.
**Las cuatro subtareas (1.17a-d) están hechas y comiteadas en `main`**: 1.17a en
`cafc434`, 1.17b en `ede6d1e`, 1.17c en `64b1a67`, 1.17d en `158e72d`. Lo único que queda para
cerrar la fase 1 de verdad es jugarla — un gate que el autor tiene suspendido a propósito, ver
"Antes de la primera partida" más abajo en este mismo documento.

> **B3 se archivó el 2026-09-08, y con ella esta tabla se quedó vacía.** Decía que no se puede
> cambiar el nombre visible ni la contraseña: `pages/AccountPage.tsx` hace las dos. La tercera
> parte —recuperarla si se olvida— **no se pierde**: vive en **D8** del bloque de despliegue,
> que es donde le corresponde por depender de un servicio de correo. La medición está en
> [`_archivo/pendientes-cerrados-2026-09-08-reconocimiento.md`](./_archivo/pendientes-cerrados-2026-09-08-reconocimiento.md).

> **B1 y B2, cerrados del todo en 1.17d (2026-09-01).** La tarea 1.17a (mismo día) había
> entregado los tres endpoints con sus pruebas — ver [05-datos.md](./05-datos.md) y la entrada
> de 1.17a en [07-historial.md](./07-historial.md) — pero ninguna pantalla los consumía.
> `CampaignSettings.tsx` y `MembersPanel.tsx` (nuevos, montados en la pestaña "Resumen" de
> `CampaignDetailPage.tsx`) cierran ese hueco: editar nombre/descripción, borrar la campaña,
> expulsar a un jugador y salirse, los cuatro con el mismo criterio de honestidad del resto de
> la pantalla (deshabilitar con el motivo visible, nunca esconder ni afirmar "no tienes
> permiso" mientras el rol se está comprobando). Detalle completo en la entrada de 1.17d en
> [07-historial.md](./07-historial.md).

> **C1 tampoco se marca cerrado del todo:** la tarea 1.17c (2026-09-01) entregó
> `EntityFilterBar` (`features/entities/EntityFilterBar.tsx`) — buscar por nombre y filtrar
> por etiqueta — pero su brief acotaba el trabajo a `EntityTab` a propósito, para no invadir
> la zona de `overview` que 1.17d editaba en paralelo. `SessionsTab` y `CharactersTab` (mismo
> fichero, `CampaignDetailPage.tsx`) siguen sin buscador ni filtro. Ver la entrada de 1.17c en
> [07-historial.md](./07-historial.md).

> **A1 (las fichas sin cuerpo de texto) no está en esta tabla a propósito**: tiene su propia
> sección, **P0** (abajo), porque va **antes** que el resto de 1.17, no dentro. Las dos
> secciones lo situaban de forma contradictoria — aquí se deja solo la remisión.

**Deuda nueva, aceptada a conciencia al cerrar 1.17c:**

- **Una etiqueta seleccionada puede sobrevivir a su propio botón.** Si se borra la única
  entidad de la pestaña que llevaba una etiqueta mientras esa etiqueta está seleccionada en
  el filtro, `availableTags` se recalcula sin ella (ya no hay ninguna entidad que la lleve) y
  su botón desaparece de `EntityFilterBar`, pero `filter.tags` sigue conteniéndola — la
  lista queda en "Ningún elemento coincide con el filtro." de forma permanente hasta que se
  pulse "Quitar filtros". Es recuperable: "Quitar filtros" sigue visible porque se renderiza
  según `value.tags.length`, no según si esas etiquetas siguen teniendo botón. **Decisión
  deliberada, no un descuido**: reconciliar las etiquetas seleccionadas contra las disponibles
  (quitando en silencio la que ya no exista) haría que el contador "N de M" mintiera sobre
  qué se está filtrando de verdad en ese instante. Si esto molesta en uso real, la tarea es
  mostrar la etiqueta huérfana en el filtro igualmente (con algún indicio de que ya no existe
  en la lista), no borrarla del estado sin decirlo.
- ~~**`entity.schema.ts` no impone unicidad en `tags`**~~ **CERRADA (2026-09-05, plan 15).** El
  esquema compartido las **normaliza al guardar** con un `.transform` que conserva el orden de la
  primera aparición (`packages/shared/src/entity.schema.ts:14-32`). **Se normaliza y no se rechaza**:
  rechazar obliga a la persona a arreglar algo que la máquina arregla sola, y un duplicado no
  expresa ninguna intención que la lista sin él no exprese. Vive en el esquema y no en `parseTags`
  porque **la web no es la única puerta**: una normalización que solo hace el cliente es una que la
  API no tiene. Texto original: ~~es `z.array(z.string().min(1).max(40)).max(50)`,
  y `parseTags` (`EntityEditor.tsx`) solo recorta espacios y descarta vacíos — escribir
  "lich, lich" persiste `["lich","lich"]` sin que nada lo impida, ni en el cliente ni en el
  esquema compartido. Los distintivos de la fila (`CampaignDetailPage.tsx`, `EntityTab`)
  dedupan con `Array.from(new Set(e.tags))` solo en el render, para no pintar el mismo
  distintivo dos veces ni emitir el aviso de clave de React duplicada; los botones del filtro
  ya eran seguros porque `availableTags` pasa por un `Set`. **No se tocó `parseTags` ni el
  esquema**: decidir si una etiqueta duplicada debe rechazarse al guardar es una decisión
  aparte de esta tarea, no un efecto colateral de pintar la lista.

**Por qué ninguna prueba lo encontró:** la suite entera (unitarias: bloque generado de
[00-INDEX.md](./00-INDEX.md); e2e: [08-pruebas.md](./08-pruebas.md)) verifica que **lo que
existe** funciona;
ninguna puede gritar por lo que falta. Es el punto ciego estructural de una suite, y por eso
este contraste **se repite al cerrar cada fase**.

## Sección entera · Antes de la primera partida (todo tachado o caducado)

*(Líneas 899–929 de `06-pendientes.md` en `4ced2bc`.)*

## Antes de la primera partida

> **La primera partida queda aplazada por decisión del autor (2026-09-01):** no se juega hasta
> tener al menos el tablero 2D de la fase 3, y quizá tampoco antes de las reglas de la fase 2.
> **Eso suspende la regla de fase del plan**, que exigía usar una fase antes de empezar la
> siguiente. Las carencias de abajo dejan de bloquear nada inmediato, pero siguen abiertas —
> la de identidad/rol se cerró igual como tarea 1.15, y la de borrado entra como 1.16.
>
> **El riesgo que se acepta, escrito para que nadie lo descubra tarde:** los planes de las
> fases 2 a 5 se escribirán **sin realimentación de uso real**, que es exactamente lo que la
> regla quería evitar. Para la fase 2 es tolerable —las reglas de 5e están escritas y no
> dependen de esta mesa—; **para la fase 3 no**, porque un tablero se diseña alrededor de cómo
> juega la gente. Si se llega a la 3 sin haber jugado, su plan debería empezar por una sesión
> de prueba aunque sea con lo que haya.

La fase 1 está construida y verificada (ver
[09-jugar.md](./09-jugar.md) para cómo se monta esa sesión cuando llegue).
La única carencia que quedaba de la lista original —no se podía borrar casi nada desde la
interfaz— se cerró como tarea 1.16 (ver "Cerrados"). Queda esta:

~~**No hay despliegue.** Sin VPS, la partida se juega en local y los jugadores tienen que estar
en la misma red.~~ — **CERRADO el 2026-09-02, y esta frase llevaba un día siendo falsa.** Está
en `dnd.supportive.pro` y los jugadores entran desde sus casas. Ver
[03-despliegue.md](./03-despliegue.md).

> Es **la misma mentira que había en «Decisiones abiertas»**, escrita en otro sitio: la
> auditoría cazó aquella y esta se quedó, porque nada relaciona dos párrafos que dicen lo mismo
> en un documento de mil líneas. Y el aviso de arriba también caducó: la partida ya no espera al
> tablero, espera al tiempo real, por la decisión del autor del 2026-09-03 que está en
> «Decisiones abiertas».

## P1 verificación · CI nunca ejecuta `pnpm build` (tachada)

*(Líneas 943–954 de `06-pendientes.md` en `4ced2bc`.)*

~~**CI nunca ejecuta `pnpm build`.**~~ **CERRADA (2026-09-05, plan 01):** el paso está en
`.github/workflows/ci.yml:47`, **antes de `pnpm lint`** — `packages/shared` tiene que estar
construido para que la API compile contra él, y un error de tipos es más barato de leer que
novecientas pruebas rojas por la misma causa. Comprobado por mutación: con un `const x: number =
"cadena"` en `apps/web/src/main.tsx`, `pnpm build` cae con `error TS2322` y salida 2. Texto
original: ~~`.github/workflows/ci.yml` corre `lint`, `format:check`,
`check:docs`, `check:estado`, `test` y `test:e2e` en el job `test`, pero no llama a `pnpm
build` en ningún paso — el type-check completo de `tsc`/`nest build`/`vite build` de `pnpm
verify` no corre en CI. Detectado durante la revisión de la tarea antideriva (2026-09-01);
decisión explícita del revisor no arreglarlo en esa tarea (fuera de su alcance), dejarlo
anotado aquí en su lugar.~~

## P3 · crear un enlace no comprueba la visibilidad del destino (FALSA)

*(Líneas 1004–1005 de `06-pendientes.md` en `4ced2bc`.)*

- **Crear un enlace no comprueba la visibilidad del destino** → sirve de oráculo de
  existencia para un identificador ajeno. Tarea 1.6.

## Texto original de la línea sustituida · aceptar invitación

*(Líneas 1006–1008 de `06-pendientes.md` en `4ced2bc`.)*

- **Aceptar una invitación no es transaccional** y **el token no caduca ni es revocable**.
  Tarea 1.4; visible desde la interfaz desde la 1.14 (ver "Cerrados" arriba) — el DM ahora ve
  y comparte el enlace, así que la falta de caducidad deja de ser un detalle interno.

## Texto original de la línea sustituida · Session/Character

*(Líneas 1017–1019 de `06-pendientes.md` en `4ced2bc`.)*

- **`Session` y `Character` no tienen `grants` ni creador propio** → `SPECIFIC_PLAYERS` es
  inerte en ellos y **el dueño de un personaje no ve el suyo si lo marca `DM_ONLY`**.
  Tareas 1.8 y 1.9.

## P3 · falta `key` en `EntityTab` (FALSA)

*(Líneas 1020–1023 de `06-pendientes.md` en `4ced2bc`.)*

- **Falta `key` en `EntityTab` al cambiar de pestaña** (`CampaignDetailPage.tsx:313`): hoy es
  inofensivo porque `EntityTab` es la única instancia en esa posición del árbol, pero es un
  riesgo latente si el modal deja de comportarse como modal (p. ej. dos `EntityTab` a la vez).
  Observación del revisor de 1.12a, no arreglado.

## Sección entera · Dos fichas de este documento mienten con un barrido citado dentro (la lección ya vive en `04-convenciones.md`)

*(Líneas 1091–1133 de `06-pendientes.md` en `4ced2bc`.)*

## P2 · Dos fichas de este documento mienten con un barrido citado dentro (2026-09-04)

**P1 de `ENTITY_REVEALED` llevaba al menos una tanda afirmando, con su `grep` citado, algo que el
código desmentía.** Al buscar más casos aparecieron dos:

| Ficha | Afirma | Realidad |
|---|---|---|
| **E3** | «`grep -rn "maxLength" apps/web/src`: cero» | **37 aciertos** en 10+ ficheros |
| **D8** | «Ninguna pantalla muestra ninguna fecha» | Falsa desde `CampaignList`/`Overview`/`Cronicas`, y `ListaDeReglas` pinta «última vez el 4/9/2026» |

**Una ficha con un barrido dentro envejece igual que el código, y encima parece probada.** Las ~30
secciones sin auditar merecen una pasada con esto en mente.

### La pasada se hizo el 2026-09-08, y eran dieciocho

**Sigue abierta como ficha, y ahora con su medida.** El reconocimiento de ese día leyó unas
cincuenta y cinco fichas contra el árbol y encontró **dieciocho falsas**, no dos —`E3` y `D8`
incluidas, que llevaban desde el 2026-09-04 declaradas mentirosas **y en la tabla igual**—. Están
en
[`_archivo/pendientes-cerrados-2026-09-08-reconocimiento.md`](./_archivo/pendientes-cerrados-2026-09-08-reconocimiento.md),
cada una con su medición.

**Lo que la pasada añade a esta ficha, y es lo que la mantiene abierta:**

- **El barrido no es la única forma que envejece.** Diez de las dieciocho llevaban dentro un
  barrido, un símbolo o una **cita de línea**, y las citas de línea fueron las peores: siguen
  apuntando **dentro** del fichero, a código de otra cosa, así que `pnpm check:docs` no las ve —
  ese control solo caza la línea que se pasa del final. Se corrigieron **ocho** en esta pasada, en
  `encounters`, `roll-requests`, `entities`, `classes`, `visibility`, `campaigns`,
  `CampaignDetailPage` y `sessions`.
- **Y una lista enumerada envejece igual, en las dos direcciones.** La línea de `viewerFor`
  nombraba cinco servicios y hoy son trece; corregirla a la baja, con un barrido truncado por un
  `head`, **estuvo a punto de meter una mentira nueva en esta misma pasada**.
- **La pasada estuvo a punto de mentir dos veces, y las dos por el mismo atajo.** La otra fue
  `N4`: se dio por cerrada al encontrar `ruleName` en `rules-engine.service.ts:406`, que es el
  **aviso** de la propuesta y no su **listado** —`listProposals` devuelve las filas crudas—, así
  que la ficha seguía siendo cierta. **El atajo, en los dos casos, fue creer un acierto de `grep`
  sin leer qué lo rodea**, que es exactamente el modo de fallo que esta ficha describe, cometido
  por quien venía a arreglarlo. Queda dicho porque es el riesgo de este trabajo, no una anécdota.
- **La forma que no envejece** es la que ya usa `04-convenciones.md` desde que le pasó lo mismo:
  **nombrar el símbolo y dejar el barrido escrito para que se vuelva a correr**, en vez de pegar
  su resultado.

## Reseño · `GET .../statblocks` no devuelve `visibility` (tachada)

*(Líneas 1163–1163 de `06-pendientes.md` en `4ced2bc`.)*

- ~~**`GET .../statblocks` no devuelve `visibility`**~~ (ficha C6-2, **cerrada el 2026-09-05**).

## Sección entera · P5 — Dejado fuera de la tarea antideriva (`lychee`: tachada · MADR: decidido)

*(Líneas 1241–1266 de `06-pendientes.md` en `4ced2bc`.)*

## P5 — Dejado fuera a propósito de la tarea antideriva (2026-09-01)

- ~~**`lychee` 0.24.2 queda instalado en la máquina del autor, sin enganchar a nada.**~~
  **CERRADA (2026-09-05, plan 01), y la verdad medida no es la que la ficha esperaba: la
  integración nunca llegó a existir.** Un barrido de `*.yml`, `*.yaml`, `*.json`, `*.toml` y
  `*.mjs` del repositorio, excluyendo `node_modules/` y `.superpowers/`, **no devuelve ni una
  mención**: no hay nada que retirar ni nada que enganchar. La ficha se cierra porque no había
  integración, no porque se haya quitado. Lo que sigue siendo cierto —y por eso se conserva— es
  que **no sustituiría a `scripts/check-docs.mjs`**. Texto original: ~~Se
  engancha en un commit aparte.~~ **No sustituye a `scripts/check-docs.mjs`** — se afirmó eso
  antes de comprobarlo, y era falso: `lychee` mira enlaces Markdown `[texto](ruta)` y URLs; el
  lint propio mira rutas citadas en prosa entre comillas invertidas, referencias
  `fichero.ts:NN` con la línea fuera de rango, y conteos de pruebas fuera de su fuente. Una
  ruta escrita como `` `features/entities/hooks.ts` `` no es un enlace Markdown y `lychee` ni
  la ve. Medido en este repo: 128 enlaces, 15 únicos, `--offline` en 15 ms, cero errores — son
  comprobaciones complementarias, no la misma.
- **MADR (4.0.0) se adopta solo hacia adelante, no con migración retroactiva.** Migrar los
  specs existentes a ese formato contradice la regla de que un documento fechado es un
  registro y no se reescribe (ver `scripts/check-docs.mjs` y la regla de revisión en
  [04-convenciones.md](./04-convenciones.md)). Su primer uso previsto es concreto: las
  preguntas abiertas P0–P8 se han ido amontonando dentro de
  `superpowers/specs/2026-09-01-fase-2-alcance-design.md`, que ya funciona como cajón de
  sastre — cada una es en realidad una decisión pendiente con sus alternativas, o sea un ADR.
  Salen a registros MADR numerados con estado cuando se escriba el plan de la fase 2, no
  antes.

## Un riesgo con fecha: la sesión de la semana que viene (caducada: D-OP-6)

*(Líneas 1340–1346 de `06-pendientes.md` en `4ced2bc`.)*

### Un riesgo con fecha: la sesión de la semana que viene

La recuperación de contraseña **sigue bloqueada** (no hay servicio de correo) y el DM no puede
reiniciar la de nadie. Con cinco personas y cuentas creadas hace un día, que alguien no pueda
entrar el día de la partida no es improbable. **Mitigación de coste cero:** que cada jugador
compruebe que entra *antes* del día, y que guarde su contraseña donde pueda recuperarla.

## J10 · el modificador de tirada no tiene tope (decidido: no hay regla; lo vigila el DM)

*(Líneas 1361–1361 de `06-pendientes.md` en `4ced2bc`.)*

| **J10** | **El modificador de tirada no tiene tope** (`1d20+9999`) | Abierto, y menor: trampa a ojos vista que el DM vigila a mano, no un fallo de seguridad. `roll.schema.ts:72` valida `expression` como cadena de hasta 120 caracteres, así que el número cabe. **La otra mitad de esta fila era falsa y se retiró el 2026-09-08**: la CA no admite hasta 999 — `character-sheet.schema.ts:167` la topa en 50 y `statblock.schema.ts:156` en 40 |
