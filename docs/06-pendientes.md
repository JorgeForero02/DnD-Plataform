# Pendientes

Deuda conocida y decisiones abiertas. Cada línea: qué, por qué importa, y la evidencia de
que existe. **Subir de nivel de verificación o pagar deuda es una tarea con su ficha, nunca
un efecto colateral de la siguiente funcionalidad.**

Última revisión: 2026-09-01.

## Pedido por el autor el 2026-09-02, colocado — antes de 2A

Razonado en [el análisis de las seis peticiones](./superpowers/specs/2026-09-02-seis-peticiones-analisis.md).
Los puntos 4 (modales) y 5 (líneas del acceso) ya están hechos; el 6 entró en el plan de 2A.

| | Qué | Por qué aquí y no después |
|---|---|---|
| **A1** | **Bandeja de notificaciones.** Tabla `Notification` alimentada por los eventos de dominio que ya se emiten, y una bandeja en la cabecera. **Sin tiempo real**: se pide al cargar | Hoy la aplicación no le cuenta nada a nadie: ni invitaciones, ni sesión el viernes, ni comentarios. Y **el motor de reglas de 2A no tiene dónde avisar** sin esto |
| **A2** | **Invitar por correo a un usuario que ya tiene cuenta**, sin pegar enlaces. **La respuesta del servidor debe ser idéntica exista o no la cuenta**, o se convierte en un comprobador de padrón | Es lo que el autor pedía de verdad al hablar de «amigos», por una fracción del coste. Un grafo social duplica la pertenencia a campaña, que es la unidad real del producto |
| **A3** | **Invitaciones con usos máximos, caducidad y revocación** | Hoy es un enlace por persona —decisión declarada— y montar una mesa de cuatro exige generar cuatro. **Un enlace eterno no**: acaba circulando por un grupo y la visibilidad se apoya en quién es miembro |

## Reseño de interfaz (2026-09-02) — lo que dejó abierto

Lo entregado está en [07-historial](./07-historial.md) y su porqué en
[la auditoría](./superpowers/specs/2026-09-02-auditoria-interfaz.md). Lo que **no** entró:

| | Qué | Por qué importa |
|---|---|---|
| **U1** | **Las sesiones no tienen página de lectura.** Fichas y personajes sí; una sesión se sigue abriendo en su formulario | Es justo la pantalla que el DM mira **durante** la partida. El patrón ya está construido dos veces, así que sale barato |
| **U2** | **La columna de secciones desaparece por debajo de 768 px** y nada la sustituye | En móvil se llega a una sección por URL pero no se puede navegar a ella. Hace falta un desplegable o una tira horizontal |
| **U3** | **Buscar solo mira el nombre**, no el cuerpo de las fichas | Buscar dentro del texto exige hacerlo **en el servidor**: el filtro de pantalla opera sobre lo que `canView` ya dejó pasar, y ampliarlo sería confundir *esconder* con *no mandar*. Ver [04-convenciones](./04-convenciones.md) |
| **U4** | **El panel de campañas no dice cuánto mundo tiene cada una** | Contar fichas bien exige aplicar la matriz de visibilidad, cuyo dueño único es `canView`. Es una tarea con su ficha, no un efecto colateral: hoy se muestran rol, personas y fecha, que no delatan nada |
| **U5** | **La hoja de personaje es solo la forma**: todas sus casillas dicen «—» | A propósito, y anunciado en la propia pantalla. El motor es la [fase 2A](./superpowers/plans/2026-09-01-fase-2A-motor-y-hoja-de-personaje.md), que ya no tiene que decidir la disposición |
| **U6** | **Sin prueba de accesibilidad automática ni de móvil real** | Playwright mide contraste y un tamaño de fuente táctil, pero nadie comprueba el recorrido de teclado ni la lectura con ayudas técnicas. El fallo del nombre accesible («PNJ 12») lo cazó una prueba funcional de rebote, no una de accesibilidad |
| **U8** | **Cerrar un diálogo con cambios sin guardar no avisa** | `Escape`, el clic fuera y «Cancelar» descartan lo escrito sin preguntar. Con un cuerpo de ficha en markdown de varios párrafos, eso es perder trabajo de verdad. Lo recomienda la investigación de formularios ([informe](./superpowers/specs/2026-09-02-formularios-estudio.md)) y no entró por tiempo |
| **U9** | **`Guardar` deshabilitado en vez de `aria-disabled`** | Un botón `disabled` sale del recorrido de teclado, así que quien navegue con teclado o lector de pantalla no puede llegar a él **ni leer por qué** no puede guardar. La aplicación ya pone el motivo en pantalla; falta que el control sea alcanzable |
| **U10** | **El texto que explica la visibilidad no está atado a `canView`** | Las frases de `features/entities/visibilidad.ts` describen la matriz del servidor y **ya mintieron una vez** (prometían que «público» dejaba entrar a quien no fuera miembro). Hoy nada rompe si vuelven a divergir: haría falta una prueba que compare las dos, o aceptar explícitamente que es texto y se revisa a mano |
| **U7** | **El ornamento no se puede apagar.** La cuadrícula y el horizonte se pintan siempre | No se mueven, así que `prefers-reduced-motion` no aplica, pero no hay forma de dejar la pantalla desnuda para quien la prefiera así |

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

## Antes de ejecutar 2A — huecos del alcance, sin decidir (2026-09-01)

Salieron de una pregunta del autor: *"¿hay un sistema de manos? me pongo un escudo que me da más
CA pero llevo un arma en la otra"*. La spec dice que los objetos se **equipan y desequipan** y
**nunca dice dónde**: no hay ranuras. Buscando huecos de esa misma forma —la regla lo exige, la
mesa lo toca pronto, y el alcance no tiene dónde ponerlo— aparecieron **doce**, en
[`superpowers/specs/2026-09-01-huecos-fase-2-design.md`](./superpowers/specs/2026-09-01-huecos-fase-2-design.md),
con 16 preguntas para el autor.

**Los cuatro que hay que decidir antes de la primera migración**, porque cambian la **forma** de
una tabla y después salen caros:

| | Hueco | Por qué corre prisa |
|---|---|---|
| **H1** | **Ranuras de equipo**, y el estado de un objeto como **tres** (llevado / equipado / **sintonizado**, con tope de 3), no como un booleano | Toca la fórmula de CA, que **no es una suma**: la armadura sustituye la fórmula y limita la Destreza |
| **H2** | El **descanso** está a medias: hay gatillo, pero nada restaura los PG y los **dados de golpe no existen** en ningún documento | Es el bucle más frecuente de una sesión; sin él la mesa corrige PG a mano y deja de fiarse de la pantalla |
| **H3** | **PG temporales**: el daño los atraviesa tal como está escrito | Error silencioso dentro de un registro que se declara inmutable |
| **H4** | **Pericia** (competencia doble): el modificador solo conoce competencia como booleano | La hoja del pícaro dirá +5 donde la regla dice +7 |

**Y dos ausencias completas**, no decisiones: **el dinero** no aparece ni una vez en las 805
líneas de la spec, y **un objeto del inventario no tiene visibilidad** — el DM prepara la
mazmorra el jueves y la mesa le ve el botín el viernes.

**Esto no se decide de pasada.** La spec de alcance es un registro fechado y no se reescribe:
las decisiones que salgan de aquí entran en el plan de 2A, con su firma.

## Despliegue — abierto tras escribir la pila (2026-09-02)

Hay servidor (`vps1new`), dominio (`dnd.supportive.pro`) y autorización, y existe
`docker-compose.prod.yml` con su procedimiento en [03-despliegue.md](./03-despliegue.md).
**Ejecutado contra el servidor el 2026-09-02**: la plataforma está en producción en
`dnd.supportive.pro`. Con ello se cierran **D1, D2, D4 y D6** (ver
[07-historial.md](./07-historial.md)). Lo que sigue abierto:

| | Qué | Por qué importa |
|---|---|---|
| **D1** | ~~`02-entorno.md` decía `TRUST_PROXY=1`~~ | **Cerrado.** El documento ya dice que en producción son **dos** saltos y por qué |
| **D2** | ~~`00-INDEX.md` anunciaba "no desplegado"~~ | **Cerrado el 2026-09-02**, junto con la misma afirmación en `CLAUDE.md` |
| **D3** | **La API no tiene endpoint de salud** | No hay `@Controller("health")` ni controlador raíz: `GET /` responde 404. La comprobación del compose acepta ese 404 como señal de vida, así que **detecta un proceso caído pero no una base de datos caída**. Un `/health` que haga un `SELECT 1` es un cambio de código con su propia ficha, no un efecto colateral |
| **D4** | ~~¿Descubre el respaldo diario los contenedores nuevos?~~ | **Cerrado: no los descubre.** El trabajo de las 04:00 lleva **una lista escrita a mano**. Se le añadió un bloque para esta base (`dnd-pg.sql.gz`), resolviendo el contenedor por prefijo de uuid porque su nombre cambia en cada despliegue. Volcado verificado por contenido: 11 tablas y la cuenta del autor dentro |
| **D5** | **Nadie ha restaurado nunca una copia de *esta* base** — ahora con más motivo: ya existen copias diarias reales que nadie ha probado a restaurar | Una copia sin restauración probada es una hipótesis. Requisitos reales de la restauración en [03-despliegue.md](./03-despliegue.md) |
| **D6** | ~~`TRUST_PROXY` sin verificar contra el sistema real~~ | **Cerrado el 2026-09-02 con la prueba de las dos tandas.** Seis logins fallidos → 429; seis **con `X-Forwarded-For` falsificado y rotando** → **también 429**. Traefik descarta la cabecera del cliente, que es de donde viene la protección |
| **D7** | **Corregir `TRUST_PROXY` en Coolify sale caro** | Ahí las variables de entorno son argumentos de construcción: cambiar una **recompila la imagen**. Por eso el valor vive en el compose y no en la UI |
| **D8** | **Recuperar la contraseña olvidada sigue bloqueada: no hay servicio de correo** | Era "se decide junto al despliegue", y el despliegue ya está aquí. Hoy, un usuario que olvide su contraseña **no tiene salida**: el DM no puede reiniciarla y no hay correo que mandar. Hace falta decidir proveedor (y sus variables) o aceptar explícitamente que la primera mesa vive sin recuperación |

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
| 1 | ~~**`JWT_SECRET` tiene un valor por defecto en el código**, en dos sitios~~ — **HECHO** (2026-09-01, ver [07-historial.md](./07-historial.md)): no hay valor por defecto, la variable es obligatoria y de 32 caracteres mínimo, y la API se niega a arrancar sin ella | ~~**Crítico**~~ |
| 2 | ~~**29 vulnerabilidades en dependencias de producción**~~ — **HECHO** (1.18a): Nest y Fastify subidos a 11.x, `fast-uri` a 3.1.6; quedan **4 moderadas** (`@opentelemetry/core` vía Sentry v8, 3 de `react-router` en web). CI audita con `--audit-level=high` | ~~Alto~~ |
| 3 | ~~**Sin límite de peticiones**~~ — **HECHO** (1.18a): límite por IP en login, registro, aceptar invitación y cambiar contraseña. **Exige el `TRUST_PROXY` correcto en producción, que en `vps1new` es `2`, no `1`** (Traefik **y** nginx son dos proxies), ver [03-despliegue.md](./03-despliegue.md) | ~~Alto~~ |
| 4 | ~~**Sin cabeceras de seguridad**~~ — **HECHO** (1.18a): `@fastify/helmet` con política revisada, fijada por `apps/api/test/security-headers.e2e-spec.ts` | ~~Medio~~ |
| 5 | ~~**CORS abierto**~~ — **HECHO** (1.18a): apagado por defecto; `CORS_ORIGIN` es la única forma de encenderlo | ~~Medio~~ |
| 6 | ~~**Sin pantalla de 404 ni `ErrorBoundary`**~~ — **HECHO** (1.18b): ruta comodín, red de errores con salida que funciona, y un comentario que declara lo que una red de React **no** atrapa | ~~Medio~~ |
| 7 | El token vive en `localStorage` — compromiso conocido, no urgencia | Bajo |
| 8 | **HECHO a medias** (1.18a, mitad de servidor): ya se puede cambiar el nombre visible y la contraseña por API —exigiendo la actual, verificada con argon2—, y cambiarla **invalida los tokens anteriores**. Falta la **pantalla** (va en 1.18b). **Recuperarla si se olvida sigue BLOQUEADO**: necesita servicio de correo, que no existe; se decide junto al despliegue | web |

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
- **La interfaz sigue mezclando idiomas**: la pantalla de entrar dice *Email*, *Password* y
  *Log in* en inglés, contra la regla del proyecto (interfaz en español). No se tocó dentro de
  una tarea de color; es tarea propia, y arrastra los localizadores de los recorridos de
  navegador.

### Deuda nueva aceptada en 1.18b (2026-09-01)

- **El mensaje de «se cerró tu sesión» solo se limpia al iniciar sesión con éxito.** Si el
  usuario se va a otra pantalla sin entrar, el mensaje sigue pendiente en memoria y reaparece la
  próxima vez que monte el inicio de sesión en la misma pestaña. Solo en memoria, desaparece al
  recargar.
- **La rama de error del detalle de campaña dice «no existe o no tienes acceso» ante cualquier
  fallo de la consulta**, incluido un 500 pasajero o una conexión caída (no hay reintentos). Un
  mensaje que distinga por código sería más honesto, pero es un cambio más ancho que el hallazgo
  que lo motivó.
- **El aviso «no puedes editar esto» de una fila sigue midiéndose solo en la página de tokens**,
  no en la pantalla de un jugador que no sea el creador — haría falta un segundo contexto de
  navegador en el recorrido. El resto de las mediciones sí son sobre pantallas reales.

### Deuda nueva aceptada en 1.18a (2026-09-01)

Cada línea es un compromiso conocido, no un descuido:

- **`JwtStrategy.validate` consulta la base en CADA petición autenticada**, y carga la fila
  entera del usuario (el hash incluido) para devolver dos campos. Es el precio de invalidar los
  tokens al cambiar la contraseña: el token no lleva ninguna señal de un cambio posterior, así
  que la única forma es preguntar a la fuente de la verdad. Si algún día pesa, la salida es un
  `select` estrecho y, si aún pesa, caché corta.
- **Cerrado el 2026-09-02:** `POST /auth/register` y `POST /invites/:token/accept` llevaban
  límite de intentos **sin ninguna prueba que se pusiera roja si se quitaba el decorador**. Ya la
  tienen, comprobada por mutación. De paso se descubrió que el guardia de Nest indexa por
  `Controlador-manejador-IP`, así que **cada ruta tiene su propio cubo** y no compiten por el
  presupuesto — lo que sí competía era la preparación de la prueba de contraseña, que se
  registraba por HTTP; ahora crea el usuario por dentro.
- **`AUTH_RATE_LIMIT` (5/min) condiciona la suite e2e**: `auth.e2e-spec.ts` gasta 3 de esas 5
  llamadas en la misma ventana. Quien añada un login de más verá un 429 que parece un fallo de
  credenciales. **La respuesta es reestructurar el fichero, nunca subir la constante.**
- **El `NotFoundException` de `GET /auth/me` quedó inalcanzable**: `JwtStrategy` ya rechaza con
  401 al usuario borrado antes de llegar al controlador. Mejor comportamiento, rama muerta.
- **`PATCH /auth/password` no devuelve un token nuevo**, así que cambiar la contraseña y volver
  a entrar dentro del mismo segundo de reloj puede rechazar el token recién emitido (el `iat` de
  JWT tiene precisión de segundos y el empate se trata como caduco, a propósito). Es también la
  razón de la espera de 1,1 s en la e2e. Devolver un token fresco en la respuesta lo cerraría.
- **Sin prueba automática de que `main.ts` llame a `loadBootEnv()`**: la garantía se movió
  dentro de `buildAdapter()`, donde sí la fija una prueba. La llamada de `main.ts` es cinturón
  y tirantes.

## Tarea 1.17 — cierre real de la fase 1

**Contraste sistemático entre lo que el modelo y la API permiten y lo que la pantalla ofrece**,
hecho el 2026-09-01 al preguntar el autor si había un cuaderno para escribir la historia.
Detalle y evidencia en
**[`superpowers/specs/2026-09-01-cierre-fase-1-congruencia-design.md`](./superpowers/specs/2026-09-01-cierre-fase-1-congruencia-design.md)**.
**Las cuatro subtareas (1.17a-d) están hechas y comiteadas en `main`**: 1.17a en
`cafc434`, 1.17b en `ede6d1e`, 1.17c en `64b1a67`, 1.17d en `158e72d`. Lo único que queda para
cerrar la fase 1 de verdad es jugarla — un gate que el autor tiene suspendido a propósito, ver
"Antes de la primera partida" más abajo en este mismo documento.

| | Hallazgo | Dónde falla |
|---|---|---|
| A2 | ~~Las etiquetas se guardan y no se ven en ninguna parte ni se puede filtrar por ellas~~ — **CERRADO en 1.17c**: se pintan en la fila y `EntityFilterBar` filtra por ellas (Y lógico) | — |
| B1 | ~~Una campaña no se puede editar ni borrar~~ — **CERRADO en 1.17d**: `CampaignSettings.tsx` (pestaña Resumen) consume el `PATCH`/`DELETE` que 1.17a ya tenía probados | — |
| B2 | ~~No se puede expulsar a un jugador ni salirse~~ — **CERRADO en 1.17d**: `MembersPanel.tsx` (pestaña Resumen) consume el `DELETE /campaigns/:id/members/:userId` de 1.17a | — |
| B3 | **No se puede cambiar el nombre visible ni la contraseña**, ni recuperarla si se olvida — va con la **tarea 1.18** (seguridad), no con 1.17 | API + web |
| C1 | ~~No hay búsqueda ni filtro en ninguna pantalla~~ — **cerrado en 1.17c para las siete pestañas de entidades**; **Sesiones y Personajes se quedan sin buscador, ver la nota debajo de la tabla** | Solo web |

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
- **`entity.schema.ts` no impone unicidad en `tags`**: es `z.array(z.string().min(1).max(40)).max(50)`,
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

## Segunda pasada del contraste modelo/API ↔ pantalla (2026-09-01)

**Contraste hecho a mano sobre el commit `70b353c` de `main`**: los 10 modelos de
`apps/api/prisma/schema.prisma` campo a campo, las 35 rutas de la API una a una, y por cada
una la pregunta *"¿quién la usa desde la pantalla?"*. Es la repetición del contraste de 1.17
—que **se repite al cerrar cada fase**— y encontró doce cosas nuevas, con identificadores que
empiezan en **D** para no chocar con los de la pasada anterior (A1–C1, arriba).

**El informe completo no vive en el repositorio**: se escribió fuera, en el directorio de
trabajo de la sesión que lo produjo, así que **lo que hay que conservar está aquí**. Cada línea
lleva su evidencia comprobada contra el código de este árbol, no contra el del día del
contraste — ver la nota sobre líneas desplazadas al final de la sección.

Lo que **sí** quedó comprobado como congruente, para que la próxima pasada no lo recorra otra
vez: comentarios, campañas (desde 1.17d), miembros, los siete campos de `Entity`, y la matriz
de visibilidad entera —los recortes de `features/sessions/SessionEditor.tsx` y
`features/characters/CharacterEditor.tsx` corresponden con los límites reales del modelo
descritos en [05-datos.md](./05-datos.md), y ninguno de los dos editores miente al usuario.
**El núcleo de la promesa —quién ve qué— está entero.** Lo que falta es casi todo *movimiento*:
navegar, buscar, ordenar y administrar la mesa.

| | Hallazgo | Prioridad | Evidencia |
|---|---|---|---|
| D1 | **Cuenta sin pantalla** — nombre visible y contraseña solo cambiables por API. **Ya asignado a la tarea 1.18b**, no es hueco nuevo | P1 — **asignado** | `auth/auth.controller.ts:63` y `:83` exponen los dos `PATCH`; `grep -rn "auth/me\|auth/password" apps/web/src` solo encuentra el `GET` de `features/auth/api.ts` |
| D2 | **No se puede invitar a un segundo DM, ni ascender a nadie**: el rol de un miembro es inmutable de por vida | P1 | `prisma/schema.prisma:73` declara `role Role @default(PLAYER)` y `invites/invites.service.ts:29` lo respeta al aceptar, pero `invites/invites.service.ts:17-19` crea la invitación **sin `role`**, el controlador no acepta cuerpo, y no existe ningún `PATCH .../members/:userId` |
| D3 | **Una invitación no se puede listar ni revocar**: se generan a ciegas y valen para siempre | P1 | `schema.prisma:74-75` escribe `createdAt`/`usedAt` y ninguna pantalla los lee; `invites/invites.controller.ts` tiene exactamente dos rutas (ni `GET` de lista ni `DELETE`); `features/invites/InvitePanel.tsx` solo muestra el último enlace, y solo hasta que se recargue |
| D4 | **La fecha de una sesión no se ve en la lista ni la ordena** | P1 | `schema.prisma:129` la guarda y `features/sessions/SessionEditor.tsx` la edita, pero la fila (`pages/CampaignDetailPage.tsx:220-224`) pinta título y distintivo y nada más; el servidor ordena por `createdAt: "desc"` (`sessions/sessions.service.ts:48`) |
| D5 | **Raza, clase y biografía se editan y no salen en la lista de personajes** | P2 | `schema.prisma:141-144` los guarda, `features/characters/CharacterEditor.tsx` los edita, y la fila (`pages/CampaignDetailPage.tsx:284-285`) pinta nombre y nivel. Relacionado: `GET .../characters/:id` y `GET .../sessions/:id` no los llama nadie, porque el modal de edición se siembra desde el objeto de la lista — no es un fallo, es no tener vista de detalle |
| D6 | **`User.isAdmin` no tiene ninguna puerta de concesión**: es el permiso más potente del sistema y no lo gobierna nada | P2 | `schema.prisma:38` lo declara y `common/visibility.ts:16` lo respeta de verdad (salta toda la matriz de visibilidad); `grep -rn "isAdmin" apps packages` fuera de esos lectores **no encuentra un solo escritor**: solo un `UPDATE` a mano en Postgres |
| D7 | **`Campaign.ownerId` es una segunda fuente de verdad que nadie consulta** | P3 | Se escribe en `campaigns/campaigns.service.ts:20` y ninguna comprobación de autorización lo lee: todas pasan por `membership.requireDM`, que mira `CampaignMember.role`. La web lo declara en su tipo y tampoco lo usa |
| D8 | **Ninguna pantalla muestra ninguna fecha**, comentarios incluidos | P3 | `grep -rn "createdAt" apps/web/src --include=*.tsx` fuera de comprobaciones: **cero**. `features/comments/CommentThread.tsx` pinta autor y cuerpo, sin marca de tiempo |
| D9 | **Seis emisiones de evento sin un solo oyente** — andamiaje futuro, no afecta al usuario | P3 | `campaigns/campaigns.service.ts`, `entities/entities.service.ts` e `invites/invites.service.ts` emiten por `EventEmitter2`; `grep -rn "OnEvent" apps/api/src`: **cero** |
| E1 | **Sesiones y Personajes siguen sin buscador ni filtro**, y **no hay búsqueda que cruce pestañas** — ya declarado bajo la tabla de 1.17, confirmado abierto | P2 — ya declarado | `features/entities/EntityFilterBar.tsx` se monta solo en `EntityTab` de `pages/CampaignDetailPage.tsx` y filtra la lista ya cargada de **un solo tipo**; `fetchAllEntities` (`features/entities/api.ts`) ya trae todos los tipos y solo lo consume el selector de destino de enlaces |
| E2 | **Los enlaces del mundo no se pueden recorrer, y son de un solo sentido** | P1 | `features/links/LinksPanel.tsx` pinta el destino como **texto plano**, no como enlace, así que ver una relación no lleva a ella; y `links/links.service.ts:49` consulta `where: { fromId: entityId }`, así que **no hay enlaces entrantes** — ninguna ficha sabe quién la menciona. **La tercera parte de este hallazgo se cerró el 2026-09-02**: el panel ya no vive dentro del editor, sino en la página de lectura de la ficha |
| E3 | **Diez campos con límite en el servidor que la pantalla no anuncia**, y el error vuelve crudo y en inglés | P2 | `grep -rn "maxLength" apps/web/src`: **cero**; el único límite en cliente es `min`/`max` del nivel (`features/characters/CharacterEditor.tsx:151-152`). Los límites reales viven en `packages/shared/src` (`campaign.schema.ts`, `entity.schema.ts`, `session.schema.ts`, `character.schema.ts`) |
| E4 | **Las etiquetas duplicadas se siguen persistiendo** — ya declarado como deuda aceptada de 1.17c, confirmado abierto y sin novedad | P3 — ya declarado | `packages/shared/src/entity.schema.ts:14` no impone unicidad y `parseTags` (`features/entities/EntityEditor.tsx`) tampoco; la fila dedupa solo al pintar |

**Lo que estas líneas significan en una mesa real**, ordenado por cuándo duele y no por
dificultad, porque es la pregunta que hizo el autor:

- **Antes de sentarse, el DM no puede tener un co-DM** (D2). Si la mesa tiene dos narradores,
  uno entra como jugador y ve la campaña como jugador, sin camino de vuelta: nadie puede
  ascender a nadie y `campaigns/membership.service.ts` prohíbe al DM salir. Peor: como la
  **recuperación de contraseña está bloqueada** (ver abajo), si esa cuenta se pierde **la
  campaña queda huérfana para siempre**. D2 y D1 juntos son un modo de fallo, no dos molestias.
- **No sabe qué invitaciones ha mandado ni cuáles siguen vivas** (D3). Con cuatro jugadores son
  cuatro enlaces irrevocables y sin registro; si uno se filtra en un chat de grupo, no hay nada
  que pulsar. `InvitePanel.tsx` es honesto y lo dice en pantalla, pero eso documenta el
  problema, no lo resuelve.
- **Preparando el mundo, no puede recorrer los enlaces que acaba de crear** (E2). Es el
  hallazgo más importante de la pasada y es de dirección inversa: la pantalla **ofrece** una
  wiki de entidades enlazadas y **no deja andar por ella**. Es literalmente lo que el paso 2 de
  [09-primera-partida.md](./09-primera-partida.md) llama *"el valor real de la herramienta"*.
  Y como no hay enlaces entrantes, la ficha del NPC no sabe en qué misiones sale, que es la
  forma en que se pregunta de verdad.
- **Durante la partida, nadie sabe cuándo es la próxima sesión sin abrirlas una a una** (D4), y
  un jugador no ve quién es quién en el grupo más allá del nombre y el nivel (D5).

**La recuperación de contraseña no es un hueco simple y no se cuenta como tal.** Está
**bloqueada por un servicio de correo que no existe**, y así está declarado en el propio código
(`packages/shared/src/auth.schema.ts:18-20`: *"Password RECOVERY (forgotten password) is out of
scope — it needs an email service that doesn't exist"*). Es una **decisión de despliegue**, se
toma junto con el VPS (ver [03-despliegue.md](./03-despliegue.md)), y hasta entonces agrava a
D2 en vez de resolverse por su cuenta. Ya está dicho así en la fila 8 de la tabla de seguridad,
arriba; se repite aquí porque D2 la convierte en algo peor que una molestia.

**Coste declarado, para poder decidir sin volver a mirar el código:** D4 y D5 son triviales
(una línea en la fila, un `orderBy`); D2 es bajo en el servidor —una entrada de cuerpo en
`POST /campaigns/:id/invites` reutilizando el `roleSchema` que ya existe en
`packages/shared/src/visibility.schema.ts`— y medio si además se quiere cambiar el rol de un
miembro ya dentro (hay que decidir qué pasa si el último DM se degrada); D3 es medio-bajo; E3
es bajo si la respuesta es traducir el error de Zod una sola vez en `lib/api.ts`; E2 es el
caro, porque su arreglo de verdad es **una página de detalle de entidad con URL propia**, y los
otros dos puntos —enlace navegable y enlaces entrantes— dependen de ella para no quedarse en
parche. D6 y D7 son **decisión, no código**: o se le da una puerta a `isAdmin` y se declara
cuál de las dos fuentes manda sobre "quién manda aquí", o se escribe que son de mantenimiento
manual — pero D7 se rompe solo en cuanto exista D2.

**Dos cosas que conviene no leer mal:**

- **Ninguna prueba iba a encontrar nada de esto.** La suite (unitarias: bloque generado de
  [00-INDEX.md](./00-INDEX.md); navegador: [08-pruebas.md](./08-pruebas.md)) verifica que **lo
  que existe** funciona. Nada puede ponerse rojo porque un enlace no sea navegable, porque la
  fila de una sesión no pinte su fecha o porque un campo del esquema no tenga escritor. Es el
  mismo punto ciego estructural que motivó el contraste de 1.17.
- **Las citas del informe original apuntaban al commit `70b353c`.** Las de esta tabla están
  reescritas contra el árbol actual, porque la tarea 1.19b (`1bf0351`, capa de tokens)
  reordenó los ficheros de `apps/web/src` y desplazó sus líneas — las de `apps/api` y
  `packages/shared` no se movieron. Si alguien recupera el informe original, sus números de
  línea de web hay que leerlos sobre `70b353c`, no sobre `main`.

## P0 — Las fichas del mundo no tienen texto — CERRADO en 1.17b (2026-09-01)

**Descubierto el 2026-09-01 respondiendo a una pregunta del autor, no por una prueba.
Cerrado el mismo día en la tarea 1.17b.** `EntityEditor.tsx` ya pinta y manda `body` como
Markdown (`{ format: "markdown", text }`), con vista previa renderizada por
`Markdown.tsx` (`react-markdown`). Detalle completo en [05-datos.md](./05-datos.md) y la
entrada de 1.17b en [07-historial.md](./07-historial.md).

**Queda abierto, deliberadamente fuera de esta tarea:** la tarea 1.19 (sistema de diseño; el
Markdown renderizado hoy lleva solo clases mínimas, sin plugin de tipografía de Tailwind).
A2 (las etiquetas se guardaban y no se veían en ninguna parte) se cerró después, en 1.17c —
ver la tabla de arriba. `Session.notes` sigue siendo una cadena pelada sin formato: no se
tocó a propósito, ver [05-datos.md](./05-datos.md).

**Deuda nueva, aceptada a conciencia al cerrar 1.17b:**

- **El `<textarea>` de "Texto" no lleva `maxLength`.** El servidor rechaza un texto de más de
  50 000 caracteres con un 400 cuyo mensaje de Zod es en inglés y poco legible — deliberado,
  no un descuido: un `maxLength` en el HTML **trunca en silencio** un texto pegado que se
  pasa del límite, y eso pierde contenido sin avisar. Un rechazo con mensaje feo pero
  explícito es preferible a una pérdida silenciosa. Si el mensaje molesta, la tarea es dar
  formato al error en español, no poner `maxLength`.
- **Nada de la suite comprueba que `Markdown.tsx` no renderiza HTML crudo.** La garantía hoy
  descansa en la convención (sin `rehype-raw`, sin `remark-gfm`) y en la revisión de código,
  no en una prueba roja si alguien la rompe: si una tarea futura añade `rehype-raw` a
  `Markdown.tsx` para pedir alguna funcionalidad, **ninguna prueba existente se pondría en
  rojo** — la revisión de esta tarea confirmó por trazado manual (react-markdown +
  hast-util-to-jsx-runtime) que los nodos HTML crudos se descartan, no una prueba automatizada
  que lo siga vigilando.

<details>
<summary>Redacción original del hallazgo (2026-09-01, antes de cerrarse)</summary>

**Descubierto el 2026-09-01 respondiendo a una pregunta del autor, no por una prueba.**

`Entity.body` existe en el modelo (`schema.prisma:80`, `Json?`) y en el esquema compartido
(`entity.schema.ts:7`, `body: z.unknown().optional()`), y la API lo aceptaría sin problema.
**Pero `EntityEditor.tsx` no lo pinta ni lo envía**, y `features/entities/api.ts` tampoco: los únicos
`body` que hay en la web son cuerpos de peticiones HTTP.

**Consecuencia:** una entidad es hoy **nombre + etiquetas + visibilidad + enlaces +
comentarios**, y nada más. Una ficha de tipo `DOCUMENT` **no puede contener un documento**; un
NPC no puede tener su descripción. La wiki es un índice sin páginas.

**Por qué nadie lo vio:** ninguna prueba lo echa en falta, porque **nunca se escribió la prueba
de que se pueda escribir**. La suite entera (recuento en [08-pruebas.md](./08-pruebas.md))
comprueba con detalle que el texto que no existe se oculta a quien no debe verlo.

**Es lo más barato de arreglar y lo que más cambia el producto**: el modelo, el esquema y la
API ya están. Es trabajo de web —un campo de texto en el editor y su prueba— y va **antes que
1.17**, porque sin esto no hay nada que enseñarle a nadie.

Al hacerlo, decidir **si el texto es plano o con formato** (negritas, listas, encabezados). Si
va a ser con formato, mejor decidirlo ahora que migrar después: `body` es `Json?`, así que el
modelo aguanta las dos cosas.

</details>

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
[09-primera-partida.md](./09-primera-partida.md) para el guion de esa sesión cuando llegue).
La única carencia que quedaba de la lista original —no se podía borrar casi nada desde la
interfaz— se cerró como tarea 1.16 (ver "Cerrados"). Queda esta:

**No hay despliegue.** Sin VPS, la partida se juega en local y los jugadores tienen que
estar en la misma red. Si se quiere que entren desde sus casas, esto **sí** es bloqueante.
Decisión aparte, no configuración. Ver [03-despliegue.md](./03-despliegue.md).

## Cerrados

**~~No se puede borrar casi nada desde la interfaz~~, y ~~"Quitar"/"Borrar" en `LinksPanel`/
`CommentThread` se pintan sin mirar permiso~~ — CERRADO el 2026-09-01 (tarea 1.16).** Los tres
editores (`EntityEditor.tsx`, `SessionEditor.tsx`, `CharacterEditor.tsx`) ganan un botón
"Borrar" en modo edición, con confirmación **en la propia pantalla** — un `DeleteButton`
compartido (`apps/web/src/components/DeleteButton.tsx`), no `window.confirm` — que reutiliza
exactamente el mismo `readOnly`/`readOnlyReason` que el editor ya recibía para editar: los
tres recursos gatean borrar con la misma regla que editar (`entities.service.ts` y
`characters.service.ts`: DM o creador/dueño vía `requireEditable`; `sessions.service.ts`: DM
vía `requireDM`), así que no hace falta una segunda comprobación de permiso. La confirmación
de entidad dice qué se lleva la cascada real del esquema (`schema.prisma`: `EntityLink` en
ambas direcciones, `EntityVisibilityGrant` y `Comment`, los tres `onDelete: Cascade`), con
números reales de comentarios y concesiones cuando ya están cargados (comparten clave de
consulta con `CommentThread`/el propio detalle de la entidad, así que no hay una petición
extra) — el número de enlaces no se muestra porque `/entities/:id/links` solo lista los
salientes visibles para quien mira, no los entrantes de otras entidades, así que no hay forma
honesta de contarlos desde aquí. Sesión y personaje no tienen hijos en cascada
(`schema.prisma`), así que su aviso es solo "no se puede deshacer".

`LinksPanel.tsx` y `CommentThread.tsx` ganan el mismo criterio de honestidad que 1.15 le dio a
los otros cuatro sitios: "Quitar" se deshabilita (nunca se oculta) para quien no es DM ni creó
la entidad (`links.service.ts:75`), y "Borrar" para quien no es DM ni el propio autor del
comentario (`comments.service.ts:65`), ambos con el motivo visible — la ficha que 1.15 dejó
abierta a propósito porque su brief pedía otras cuatro superficies.

**Invalidación de caché — dos mordiscos nuevos del mismo tipo que 1.12b, encontrados
escribiendo las pruebas de esta tarea, no adivinados:**
- Borrar una entidad invalida `entitiesKey`/`allEntitiesKey` (mismo patrón que crear/editar).
- La cascada del esquema borra `EntityLink` **en las dos direcciones**: al borrar una entidad
  puede desaparecer un enlace que **otra** entidad ya tenía cacheado bajo su propio
  `linksKey(otraEntidadId)` — una clave que `useDeleteEntity` no puede nombrar porque no sabe
  qué otras entidades la enlazaban. Se prueba y se cazó primero en el navegador real (reabrir
  el editor de la primera entidad seguía mostrando el enlace hacia la segunda, ya borrada, en
  Postgres) — ni un espía ni la unitaria original lo habrían visto, porque ninguna comparte
  cache real entre dos entidades. Arreglado invalidando por predicado sobre la raíz
  `"entities"` (`features/entities/hooks.ts`), que cubre `linksKey`/`commentsKey` de
  cualquier entidad — más ancho de lo estrictamente necesario, pero la alternativa es
  exactamente este bug. Regresión cubierta en
  `apps/web/src/features/entities/__tests__/hooks.test.tsx` y en el recorrido de navegador
  `apps/web/e2e/campana.spec.ts`.

**Bug real encontrado y arreglado de paso, mismo tipo que el de 1.14 con las invitaciones:**
las cinco llamadas `DELETE` de la web (`deleteEntity`, `deleteSession`, `deleteCharacter`,
y las ya existentes `deleteLink`, `deleteComment`) no mandaban cuerpo. `apiFetch` (`lib/api.ts`)
manda siempre `Content-Type: application/json`, y Fastify rechaza esa combinación con 500
("Body cannot be empty…") antes de llegar al controlador — visible solo contra la API real
compilada, nunca en una unitaria con `api.ts` simulado. `deleteLink`/`deleteComment` llevaban
este defecto latente desde que existen (nunca los ejercitó un recorrido de navegador hasta
ahora); arreglado enviando `JSON.stringify({})` en las cinco. Cambio solo en `apps/web`.

Ver la entrada de 1.16 en [07-historial.md](./07-historial.md).

**~~Pantalla en blanco perpetua tras un token caducado~~ — CERRADO el 2026-09-01 (tarea
1.15-fix, Crítico verificado en el código por una revisión independiente).** `AuthGate.tsx`
devolvía `<Navigate to="/login" replace/>` **en lugar de** sus hijos, y estaba montado **por
fuera** de `<Routes>` (`App.tsx`). `setInvalidToken(true)` (`features/auth/hooks.ts`) nunca
volvía a `false`, y como `AuthGate` no estaba dentro del árbol de rutas, navegar no lo
desmontaba: en cada render volvía a devolver `<Navigate>`, y `<Routes>` —que contiene la
propia ruta `/login`— no se renderizaba jamás. La URL cambiaba a `/login` pero la pantalla se
quedaba vacía hasta recargar a mano. El JWT caduca a los 7 días
(`apps/api/src/auth/auth.module.ts`): a cualquiera que volviera la semana siguiente le tocaba
esto. La prueba de entonces (`AuthGate.test.tsx`) pasaba por construcción: montaba `AuthGate`
dentro de una `<Route>`, una topología que sí lo desmonta al navegar — no la de producción.
**Arreglado eliminando el estado pegajoso en vez de remendarlo:** `AuthGate` ya no redirige
nunca — solo dispara `useAuthRehydration` y renderiza siempre sus hijos; `logout()` ya ponía
el token a `null`, y `ProtectedRoute` ya redirigía a `/login` cuando no hay token, así que no
hacía falta que `AuthGate` supiera redirigir nada. La prueba nueva monta `<App/>` real
(`AuthGate.test.tsx`). Ver la entrada de 1.15-fix en [07-historial.md](./07-historial.md).

**~~Cualquier fallo de red o del servidor cerraba la sesión, no solo un token inválido~~ —
CERRADO el 2026-09-01 (tarea 1.15-fix, Importante).** `apiFetch` (`lib/api.ts`) lanzaba el
mismo `Error` genérico para un 401, un 500, un 502 del proxy de Vite o un fallo de red, y
`hooks.ts` cerraba la sesión (`logout()`, que borra `dnd_token`) en cualquiera de esos casos —
al revés de lo que ya afirmaban `01-arquitectura.md` y `07-historial.md`. Con el arreglo de
arriba, eso significaba: la API se reinicia o hay un microcorte mientras el DM recarga en
plena partida → se le borra el token y se queda mirando el formulario de login sin saber por
qué. **Arreglado con `ApiError` (`lib/api.ts`)**, que propaga el `status` real de la
respuesta; `useAuthRehydration` solo cierra la sesión si `err instanceof ApiError && err.status
=== 401`. Cualquier otro fallo deja el token en paz. El mensaje legible de errores que se
arregló en 1.14 no se tocó — sigue viviendo en `readableErrorMessage()`, ahora envuelto en
`ApiError` en vez de `Error`. Ver la entrada de 1.15-fix en [07-historial.md](./07-historial.md).

**~~Un solo fallo al listar los miembros hace que el DM se lea a sí mismo como no-DM~~ —
CERRADO el 2026-09-01 (tarea 1.15-fix, Importante).** `useMyRole` (`features/campaigns/
members.ts`) calculaba `isLoading = !userId || members.isLoading` y el rol de
`members.data?.find(...)`. Con `retry: false` (`lib/queryClient.ts`), un solo fallo de
`GET /campaigns/:id/members` dejaba `isLoading === false` y `role === undefined` —
indistinguible de "confirmado que no es miembro". Un DM legítimo veía "Solo el DM puede
crear o editar sesiones." en su propia campaña, sin poder crear la sesión que estaba narrando
en ese momento, y solo se recuperaba si cambiaba de pestaña y volvía
(`refetchOnWindowFocus`), sin nada en pantalla que lo sugiriera. **Arreglado** exponiendo
`isError` como señal propia (nunca tratado como "no soy miembro", siempre como "aún no lo
sé") y `retry()` para forzar un nuevo intento; de los seis consumidores de `useMyRole` de hoy
(tres en `CampaignDetailPage.tsx`, más `InvitePanel.tsx`, `LinksPanel.tsx` y
`CommentThread.tsx`), los de `CampaignDetailPage.tsx` e `InvitePanel.tsx` lo enlazan a un
botón "Reintentar" junto al mensaje "Comprobando permisos…"; `LinksPanel.tsx:30` y
`CommentThread.tsx:20` leen `isError` pero **no** ofrecen ese botón. Ver la entrada de
1.15-fix en [07-historial.md](./07-historial.md).

**~~La web no conoce su propio identificador de usuario~~ — CERRADO el 2026-09-01 (tarea
1.15).** `auth.store.ts` dejaba `user: null` tras recargar la página: el token sobrevivía en
`localStorage`, pero el usuario solo vivía en memoria, así que ningún botón podía ocultarse ni
deshabilitarse por permiso. Arreglado con `/auth/me` devolviendo también `displayName`
(`apps/api/src/auth/auth.controller.ts`, único cambio permitido en `apps/api` para esta
tarea) y `AuthGate` + `useAuthRehydration` (`apps/web/src/features/auth/`) pidiéndolo una vez
al arrancar, cuando hay token y no hay usuario, sin bloquear el pintado de `ProtectedRoute`
(que sigue mirando solo el token); si `/auth/me` devuelve 401, cierra la sesión y redirige a
`/login`. Con el `id` disponible, `useMyRole` (`features/campaigns/members.ts`) cruza
`GET /campaigns/:id/members` para saber si el usuario es DM o jugador en la campaña, con un
tercer estado explícito de "aún no lo sé" mientras `members` o la identidad siguen cargando.
**Decisión, coherente en los cuatro sitios que se tocaron** (crear/editar sesión, editar
personaje, editar entidad, generar invitación): se **deshabilita con una explicación visible**,
nunca se oculta — un botón oculto hace pensar que la acción no existe; uno deshabilitado con
motivo enseña el modelo de permisos. Mientras el rol o la identidad todavía se están
resolviendo, también se deshabilita (no se muestra activo ni se oculta): mostrarlo activo
ofrecería una acción que puede acabar en 403 al llegar la respuesta real, y ocultarlo
parpadearía en cuanto ésta llega. Esto es honestidad de la interfaz, no seguridad: `canView`,
`requireDM`, `requireMember` y `requireEditable` no se tocaron y siguen rechazando exactamente
igual si este código desaparece. Ver la entrada de 1.15 en [07-historial.md](./07-historial.md).

**~~Las filas de la lista de entidades son botón de editar aunque el servidor vaya a devolver
403~~ y ~~lo mismo en sesiones y personajes~~ — CERRADO el 2026-09-01 (tarea 1.15), y
CORREGIDO el mismo día (tarea 1.15-fix, Crítico).** `InvitePanel.tsx` recibe el criterio
correcto de "deshabilitar con explicación, no ocultar" para "Generar invitación" (no hay nada
que leer si no puedes generar una invitación). Los botones "Quitar" (`LinksPanel.tsx`) y
"Borrar" (`CommentThread.tsx`) **no** se tocaron — quedan fuera de las "cuatro" que pedía el
brief de 1.15; su ficha sigue abierta en P3.
>
> **1.15 se equivocó al aplicar el mismo criterio a la fila de una entidad, sesión o
> personaje.** La versión de 1.15 deshabilitaba la fila entera cuando el usuario no podía
> editar. Eso confundía "editar" con "ver": la fila **es la única vista de detalle que
> existe** — el editor es el único consumidor de `useEntity`/`useSession`/`useCharacter`, y
> `LinksPanel`/`CommentThread` solo se pintan dentro de él (`EntityEditor.tsx`). *(Al día de
> hoy esa premisa ya no se cumple: el reseño del 2026-09-02 dio a las fichas y a los personajes
> su propia página de lectura, y allí viven los enlaces y los comentarios. La conclusión de
> 1.15-fix —que leer no es editar— sigue siendo la correcta, y ahora se apoya en una pantalla
> en vez de en un modal.)* Un jugador
> que **sí** puede ver una entidad por `canView` (por ejemplo `PLAYERS`, o `DM_ONLY` recién
> revelada) pero no puede editarla —no es el DM ni el creador— dejaba de poder leer su
> descripción, sus etiquetas, sus enlaces y sus comentarios: la fila deshabilitada rompía el
> movimiento central de la mesa que describe
> [09-primera-partida.md](./09-primera-partida.md) — "pasar algo de `DM_ONLY` a `PLAYERS`
> cuando la mesa lo descubre". Y en Sesiones, la fecha y las notas que un jugador sí puede ver
> por `canView` dejaban de abrirse igual. `apps/web/e2e/invitacion.spec.ts` no lo cazó en su
> momento porque la única entidad del DM en ese recorrido era `DM_ONLY` — el jugador nunca
> veía "Sin elementos." y una fila visible-pero-no-editable a la vez.
>
> **Arreglado en 1.15-fix:** la fila ahora **abre siempre** — es honestidad de lectura, no de
> escritura. Lo que el rol decide es si el editor que se abre lo hace en **modo lectura**
> (`readOnly` en `EntityEditor.tsx`/`SessionEditor.tsx`/`CharacterEditor.tsx`: campos
> deshabilitados, Guardar deshabilitado con su motivo) o en modo edición normal. `LinksPanel`
> y `CommentThread` siguen pintándose sin condición dentro del editor — nunca estuvieron
> gateados por permiso de edición en el servidor (`comments.service.ts` solo exige `canView`;
> `links.service.ts` solo exige ser miembro), así que no había honestidad que ganar
> deshabilitándolos también aquí. Ver la entrada de 1.15-fix en
> [07-historial.md](./07-historial.md).

**~~Una invitación pendiente huérfana mete a cualquiera en la campaña ajena~~ — CERRADO el
2026-09-01 (tarea 1.14-fix). Crítico verificado en el código por una revisión independiente.**
`JoinPage.tsx` guardaba el token en `localStorage` sin caducidad si el invitado no volvía;
nada lo borraba —`logout()` solo quitaba `dnd_token`— y **cualquier** autenticación posterior
en ese navegador (`LoginPage.tsx`/`RegisterPage.tsx`) lo leía y navegaba a `/join/:token`,
donde la aceptación se disparaba sola al montar sin pedir confirmación. En un portátil
compartido de mesa, el siguiente en iniciar sesión ahí acababa dentro de la campaña como
`PLAYER` sin pulsar nada, y el token quedaba quemado para el invitado real. Arreglo de tres
partes: (1) `/join/:token` ya no acepta al montar — con sesión, muestra una confirmación y
espera un clic explícito en "Unirse a la campaña", y dice que aceptar consume el enlace
(cierra también el caso del DM que abre su propio enlace y lo quemaba sin querer); (2)
`logout()` borra la invitación pendiente igual que borra `dnd_token`; (3) la invitación
pendiente caduca a los 5 minutos (sello de tiempo junto al token en `localStorage`), lo que
también cierra el caso de un token viejo desviando un login normal a una pantalla de error.
La guarda `attempted = useRef(false)` no se tocó — sigue protegiendo un doble clic rápido en
vez del efecto de montaje. Detalle completo, con las ocho partes de la revisión, en la
entrada de 1.14-fix en [07-historial.md](./07-historial.md).

**~~Falta el flujo de invitación en la interfaz~~ — CERRADO el 2026-08-31 (tarea 1.14).** El
DM genera un enlace de invitación desde `features/invites/InvitePanel.tsx` (montado en la
pestaña Resumen de `CampaignDetailPage.tsx`) y lo ve completo en pantalla, seleccionable, con
un botón de copiar que **muestra el fallo en vez de mentir** si el portapapeles del navegador
lo rechaza — el enlace sigue visible en cualquier caso. `/join/:token`
(`pages/JoinPage.tsx`), fuera de `ProtectedRoute` a propósito, cubre los tres caminos: sin
sesión guarda el token en `localStorage` (junto a `dnd_token`, que es donde ya vive el estado
de sesión) y lo limpia al consumirlo; con sesión acepta contra la API real y navega a
`/campaigns/<campaignId>` con el id que devuelve el servidor; token inválido o ya usado
muestra el mensaje del servidor con salida al listado. `LoginPage.tsx`/`RegisterPage.tsx`
resumen la invitación pendiente en vez de aterrizar en el listado, para que el jugador no
tenga que volver a pegar el enlace. Generar la invitación es solo del DM en el servidor
(`requireDM`). **Esta frase quedó superada por la tarea 1.15**: desde entonces
`InvitePanel.tsx:68` deshabilita "Generar invitación" con motivo visible para quien no es DM,
así que el botón ya no se muestra activo a todo el mundo — ver la entrada de 1.15 en
[07-historial.md](./07-historial.md).

Dos defectos reales, cazados solo por el e2e de Playwright contra la API real (las unitarias
simulan `api.ts` y no los veían): `createInvite`/`acceptInvite` mandaban un `POST` sin cuerpo
con `Content-Type: application/json`, que Fastify rechaza con 500 antes de llegar al
controlador — arreglado enviando `{}`. Y la primera versión de `JoinPage.tsx` disparaba la
aceptación con `useMutation` dentro de un `useEffect` de montaje: contra la API real, con
`React.StrictMode` montando dos veces en desarrollo, el `201` volvía del servidor pero el
`isSuccess` de la mutación nunca llegaba a reflejarse en un render nuevo, y la pantalla se
quedaba en "Aceptando invitación…" para siempre con la invitación ya aceptada en la base de
datos. Se cambió a llamar `acceptInvite` directamente y guardar el resultado con `useState`,
sin pasar por `useMutation` — ver la entrada de 1.14 en [07-historial.md](./07-historial.md)
para la secuencia de logs que lo confirmó.

Nuevo pendiente que esto deja abierto: **el token de invitación no caduca y no es
revocable** (servidor, desde la tarea 1.4 — `invites.service.ts`), y hasta ahora era un
detalle interno; con esta tarea el DM lo ve y lo comparte, así que un enlace filtrado o
reenviado por error sigue siendo válido indefinidamente hasta que alguien lo use. No se
arregla aquí — tocaría `apps/api`, fuera de alcance de 1.14 — pero conviene que su ficha
quede junto a la interfaz que lo hace visible, no solo en la fila de servidor de abajo.

**Sigue abierto tras 1.14-fix, mismo motivo, ahora más visible.** `InvitePanel.tsx` deja
generar un enlace nuevo cuantas veces el DM quiera, y cada uno anterior **sigue válido en el
servidor**: no hay listado de invitaciones vivas ni forma de revocar una desde la interfaz. Un
DM que pulsa "Generar invitación" dos veces creyendo que refresca el enlace deja el primero
flotando, sin verlo ni poder anularlo. El arreglo mínimo de 1.14-fix es honesto, no funcional:
la pantalla avisa de que generar otro enlace no anula los anteriores
(`features/invites/InvitePanel.tsx`). Arreglarlo de verdad pide un endpoint de listado y otro
de revocación en `apps/api` (fuera de alcance del brief de 1.14-fix, que prohíbe tocar
`apps/api`) — misma familia de deuda que la caducidad del párrafo de arriba: los dos piden
tocar `invites.service.ts`/`invites.controller.ts`, así que conviene resolverlos juntos en la
misma tarea de servidor cuando se aborde.

**~~Faltan editores de sesión y personaje~~ — CERRADO el 2026-08-31 (tarea 1.13).**
`SessionsTab` y `CharactersTab` (`CampaignDetailPage.tsx`) eran de solo lectura; ahora ganan
botón "Nuevo" y sus filas abren el editor correspondiente en modo edición, igual que la
pestaña de entidades. `SessionEditor.tsx` y `CharacterEditor.tsx` siguen el patrón
`api.ts` + `hooks.ts` + componente + `__tests__` de `features/links` y `features/comments`.
El selector de visibilidad de `CharacterEditor.tsx` recorta `SPECIFIC_PLAYERS` (inerte) y
conserva `PUBLIC`/`PLAYERS`/`OWNER_DM`/`DM_ONLY`. El de `SessionEditor.tsx` recorta además
`OWNER_DM` (revisión de 1.13-fix: en una sesión resuelve exactamente igual que `DM_ONLY`, no
solo "con nombre redundante"), y ofrece `PUBLIC`/`PLAYERS`/`DM_ONLY`; la justificación
completa está en [05-datos.md](./05-datos.md). Se añadió el recorrido de Playwright que
faltaba: crear una sesión `DM_ONLY` y un personaje `PUBLIC` desde sus pestañas, reabrir los
dos en modo edición para comprobar la precarga contra la API real, **guardar la edición de
los dos** y comprobar el resultado en la lista, y vaciar y guardar las notas de la sesión
para comprobar que el `PATCH` real las borra en vez de omitir la clave.
Ver [07-historial.md](./07-historial.md).

**~~El modo edición del editor de entidades no precarga los `specificPlayerIds`
existentes~~ — CERRADO el 2026-08-31 (tarea 1.12a-fix).** La consecuencia real era peor de lo
que decía esta ficha: no era un riesgo eventual, era **destrucción determinista y silenciosa**.
Cualquier edición de una entidad `SPECIFIC_PLAYERS` — aunque solo tocara el nombre — mandaba
`specificPlayerIds: []`, el servicio interpretaba el array vacío como "borra todo y no crees
nada" (`entities.service.ts:112-119`), y la entidad quedaba en `SPECIFIC_PLAYERS` con cero
concesiones: un `DM_ONLY` disfrazado, sin ningún aviso en pantalla. Se arregló con precarga
real (`GET .../entities/:entityId` ya devolvía `grants`; ahora se pide en modo edición vía
`useEntity` y siembra la selección) y una guarda de carrera: mientras el detalle no ha llegado,
`specificPlayerIds` no se manda. De paso se cerró el fallo hermano de que el selector de
jugadores mostraba todas las casillas vacías aunque hubiera concesiones vivas (misma causa raíz,
prueba propia). Ver [07-historial.md](./07-historial.md).

**~~Playwright no está instalado~~ — CERRADO el 2026-08-31.** Chromium, dos recorridos
cubiertos (registro → campaña → NPC → verlo; y cerrar sesión), trabajo `e2e-browser` propio en
CI con el informe como artefacto. Se comprobó que las pruebas **pueden fallar**: con la guarda
de `ProtectedRoute` rota a mano, las 7 de componente siguen verdes y el e2e la caza. Ver
[08-pruebas.md](./08-pruebas.md).

**~~P1 · ESLint no existe~~ — CERRADO el 2026-08-31.** ESLint 9 con configuración plana en la
raíz, Prettier, `pnpm verify` completo y gancho de pre-commit que bloquea. CI corre lint y
formato. Los 15 errores que encontró la primera pasada se arreglaron **corrigiendo el
código**, no silenciando reglas: diez `any` en los cuerpos de los controladores pasaron a los
tipos de `@dnd/shared`, tres `require("supertest")` a `import`, un import sin usar fuera, y
los `updateSessionSchema` / `updateCharacterSchema` que vivían duplicados en un controlador y
en un servicio se mudaron a `@dnd/shared`, que es donde la convención dice que vive la forma
de los datos. Ver [07-historial.md](./07-historial.md).

**~~El e2e verde de 1.12b no ejecutaba el código nuevo~~ — CERRADO el 2026-08-31
(1.12b-fix).** El único recorrido de Playwright existente pulsaba `Nuevo` y guardaba: nunca
entraba en modo edición, y los dos paneles (`LinksPanel`, `CommentThread`) solo se pintan con
`isEdit && entity` (`EntityEditor.tsx`). El e2e pasaba sin haber pintado nunca esos
componentes en un navegador real. Se añadió el recorrido que faltaba —crear dos NPCs, abrir
uno en modo edición, enlazarlo con el otro y publicar un comentario, contra la API real— y de
paso se cerraron cinco hallazgos más de una revisión independiente: el borrado de un enlace o
un comentario ajeno fallaba en silencio (sin `onError`, arreglado reusando el `error` que ya
existía), el selector de destinos de enlace quedaba obsoleto hasta 30 s tras crear o renombrar
una entidad (`allEntitiesKey` es una rama distinta de `entitiesKey` y no se invalidaba), el
desplegable ofrecía destinos ya enlazados (choca con `@@unique([fromId, toId, label])` y da
500 en crudo), y las pruebas de `EntityEditor` en modo edición disparaban `fetch` reales sin
espiar. Ver [07-historial.md](./07-historial.md).

## P1 — Huecos de verificación

**No hay prueba de accesibilidad, responsive ni rendimiento.** Ninguna herramienta lo mira
hoy.

**CI nunca ejecuta `pnpm build`.** `.github/workflows/ci.yml` corre `lint`, `format:check`,
`check:docs`, `check:estado`, `test` y `test:e2e` en el job `test`, pero no llama a `pnpm
build` en ningún paso — el type-check completo de `tsc`/`nest build`/`vite build` de `pnpm
verify` no corre en CI. Detectado durante la revisión de la tarea antideriva (2026-09-01);
decisión explícita del revisor no arreglarlo en esa tarea (fuera de su alcance), dejarlo
anotado aquí en su lugar.

**~~`invites.e2e-spec.ts` y `members.e2e-spec.ts` podían colisionar de correo entre workers de
Jest~~ — CERRADO el 2026-09-01 (tarea 1.15-fix, Menor).** Ambas suites construían sus correos
como `dm${Date.now()}@b.com` / `pl${Date.now()}@b.com` — resolución de milisegundo. Dos
workers de Jest que arrancaran en el mismo milisegundo generaban correos idénticos: el
segundo `register()` fallaba con 400 (email duplicado) y el `afterAll` de un worker borraba
el usuario que el otro seguía usando, produciendo fallos intermitentes sin relación con el
código bajo prueba. Detectado y explicado durante la revisión de 1.15 (explicación verificada
por el revisor), no corregido en su momento porque quedaba fuera del arreglo que se estaba
revisando. **Arreglado** añadiendo un sufijo aleatorio a `Date.now()` en los dos ficheros
(`${Date.now()}${Math.floor(Math.random() * 1e6)}`). **El mismo patrón de correo
(`Date.now()` a secas) existe también en `auth.e2e-spec.ts`, `campaigns.e2e-spec.ts`,
`characters.e2e-spec.ts`, `comments.e2e-spec.ts`, `entities.e2e-spec.ts`,
`links.e2e-spec.ts` y `sessions.e2e-spec.ts`** — comparten el mismo riesgo teórico, pero no
fueron los que la revisión de 1.15 vio fallar y el brief de 1.15-fix pedía arreglar
específicamente los dos de arriba; se deja anotado aquí en vez de corregido en silencio.

## P2 — Ruta de mejora del nivel

**Linting sin información de tipos.** `typescript-eslint` corre en modo básico; el modo
*type-checked* (que ve los tipos y caza promesas sin esperar, comparaciones imposibles y
`any` implícitos que hoy pasan) exige apuntar cada paquete a su `tsconfig` y cuesta tiempo de
CI. Decisión: se activa como tarea propia, no de rebote.

**Sin umbral de cobertura (N2) ni mutación (N3).** No declarados y no prometidos. Ruta de
mejora, no compromiso.

**No hay prueba de rechazo por validación** en personajes (`level > 20` devuelve 400 y nadie
lo comprueba). Detectado en la tarea 1.9.

## P3.5 — Limitaciones conocidas de la tarea 1.13-fix

- **No se puede borrar la fecha de una sesión desde la web.** `createSessionSchema.scheduledAt`
  es `z.coerce.date().optional()`, **sin `.nullable()`**
  (`packages/shared/src/session.schema.ts`), así que no existe ningún valor que
  `SessionEditor.tsx` pueda enviar en el `PATCH` que signifique "quita la fecha que ya tenía
  la sesión": omitir la clave dice "no la toques", y no hay una representación de "vacío" que
  el esquema acepte para `Date`. Arreglarlo pide `.nullable()` en el esquema y `data.scheduledAt
  = null` en `sessions.service.ts` cuando llega `null` — cambios en `packages/shared` y
  `apps/api`, fuera de alcance de esta tarea (prohibido tocarlos en el brief de 1.13-fix). El
  resto de campos opcionales de sesión y personaje (`notes`, `race`, `class`, `bio`) sí se
  pueden vaciar desde el editor, enviando la cadena vacía en vez de omitir la clave.
- **La precarga de la fecha de una sesión en `SessionEditor.test.tsx` solo cuadra por
  coincidencia.** `<input type="datetime-local">` tiene precisión de minutos;
  `toDatetimeLocal` (`SessionEditor.tsx`) descarta los segundos al convertir el ISO del
  servidor al valor del input. El fixture de la prueba usa una hora con segundos en `:00`
  (`20:00:00Z`), así que el ida y vuelta (ISO → input → `new Date(...).toISOString()`) da el
  mismo valor y la aserción pasa. Con una hora real como `20:00:30Z` el input truncaría a
  `20:00` y la vuelta a ISO perdería los `:30`, así que la misma aserción **fallaría**. No es
  un fallo del código de producción — es una limitación real y aceptada de
  `datetime-local` (no hay forma de teclear segundos con ese tipo de input) — pero la
  prueba no lo demuestra hoy: pasa por la casualidad del fixture, no porque compruebe la
  pérdida. Comentario dejado en el propio fixture
  (`apps/web/src/features/sessions/__tests__/SessionEditor.test.tsx`).

## P3 — Correcciones funcionales conocidas

Ninguna es un agujero de lectura —nadie ve contenido ajeno—, pero todas degradan el
comportamiento:

- **Un enlace duplicado devuelve 500 en vez de 409** (choca contra el índice único de
  `EntityLink`). Tarea 1.6.
- **Crear un enlace no comprueba la visibilidad del destino** → sirve de oráculo de
  existencia para un identificador ajeno. Tarea 1.6.
- **Aceptar una invitación no es transaccional** y **el token no caduca ni es revocable**.
  Tarea 1.4; visible desde la interfaz desde la 1.14 (ver "Cerrados" arriba) — el DM ahora ve
  y comparte el enlace, así que la falta de caducidad deja de ser un detalle interno.
- **`specificPlayerIds` no se valida contra los miembros de la campaña**: se puede conceder
  acceso a alguien de fuera. Queda inerte, pero se guarda. Tarea 1.5.
- **Los `grants` son inertes si la visibilidad no es `SPECIFIC_PLAYERS`**, y aun así se
  aceptan sin aviso. Tarea 1.5.
- **`Session` y `Character` no tienen `grants` ni creador propio** → `SPECIFIC_PLAYERS` es
  inerte en ellos y **el dueño de un personaje no ve el suyo si lo marca `DM_ONLY`**.
  Tareas 1.8 y 1.9.
- ~~No hay botón de borrar sesión o personaje en la interfaz~~ — CERRADO, tarea 1.16 (ver
  "Cerrados").
- ~~Los botones "Quitar" (`LinksPanel.tsx`) y "Borrar" (`CommentThread.tsx`) se pintan en
  todas las filas, sin mirar si el usuario es DM o autor~~ — CERRADO, tarea 1.16 (ver
  "Cerrados").
- **Falta `key` en `EntityTab` al cambiar de pestaña** (`CampaignDetailPage.tsx:313`): hoy es
  inofensivo porque `EntityTab` es la única instancia en esa posición del árbol, pero es un
  riesgo latente si el modal deja de comportarse como modal (p. ej. dos `EntityTab` a la vez).
  Observación del revisor de 1.12a, no arreglado.
- **El modal del editor de entidades no tiene `role="dialog"` ni se cierra con Escape**
  (`EntityEditor.tsx`). Observación del revisor de 1.12a, no arreglado.

## P4 — Limpieza

- **`viewerFor(userId, campaignId)` está duplicado** en los servicios de entidades, enlaces,
  comentarios, sesiones y personajes. Candidato a extraerse a `common/`. Detectado en 1.7.
- **`CreateCampaignModal` mantiene un estado de error local** que duplica `mutation.error`.
  Tarea 1.10.
- **Avisos ruidosos que conviene callar bien, no silenciar**: `ts-jest` se queja de compilar
  los `.js` de `packages/shared/dist` en los e2e, y Vite avisa de que
  `apps/web/postcss.config.js` no declara tipo de módulo. Ninguno lo tapa ESLint: son de
  otras herramientas.
- **No hay política de retención de datos escrita.** Hace falta antes de que el sistema deje
  de ser de uso personal. Ver [05-datos.md](./05-datos.md).

## Decisiones abiertas

- **Sin VPS asignado**: el despliegue en Coolify está preparado y **diferido**. La parte de
  despliegue de la tarea 1.14 no se ejecuta; solo se construye la interfaz de invitación.
- **Sin sistema de diseño** para el MVP: decisión explícita, no olvido.
- **Fases 2–5** (reglas, mapas, tiempo real, 3D/IA) solo tienen alcance, no plan. Cada una
  recibe el suyo al llegar, y **no se empieza la siguiente hasta usar la anterior en una
  sesión real**.

## P5 — Dejado fuera a propósito de la tarea antideriva (2026-09-01)

- **`lychee` 0.24.2 queda instalado en la máquina del autor, sin enganchar a nada.** Se
  engancha en un commit aparte. **No sustituye a `scripts/check-docs.mjs`** — se afirmó eso
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

## P6 — Node 20 del proyecto, sin migrar (2026-09-01)

- **La tarea 1.20 solo actualizó el runtime en el que corren las *acciones* de
  `.github/workflows/ci.yml`** (`actions/checkout` a v7, `pnpm/action-setup` a v6,
  `actions/setup-node` a v7, `actions/upload-artifact` a v7 — las cuatro corren ya sobre
  Node 24, según su propio `action.yml`), porque GitHub avisaba de que las forzaba a correr
  sobre un runtime distinto del que declaran. **Eso no toca el Node del propio proyecto**, que
  sigue fijado en 20 en tres sitios distintos y ninguno de ellos se tocó:
  `ci.yml` (`node-version: 20` en los dos jobs), `apps/api/package.json` y
  `apps/web/package.json` (`engines.node: ">=20"`), y `apps/api/Dockerfile` /
  `apps/web/Dockerfile` (`FROM node:20-slim`).
- **Importa porque Node 20 deja soporte de mantenimiento (LTS) el 2026-04-30** — para cuando
  se lea esto puede que ya lo haya dejado —, y a partir de ahí no recibe parches de seguridad.
  No es urgente hoy, pero es deuda con fecha de caducidad conocida, no indefinida.
- Migrar el Node del proyecto (probablemente a 22 LTS, o a la LTS vigente en el momento) es
  una tarea aparte, con su propio alcance: subir `engines`, `ci.yml` y ambos Dockerfiles a la
  vez para que no queden desincronizados, y comprobar con pruebas reales (`pnpm verify`,
  `pnpm --filter @dnd/api test:e2e`, `pnpm --filter @dnd/web e2e`, y build de las imágenes
  Docker) que nada se rompe con el cambio de runtime — no basta con que el CI actualizado en
  esta tarea siga en verde, porque eso no ejercita esa migración en absoluto.
