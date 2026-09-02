# Historial

Qué se entregó, por qué, y cómo revertirlo. Fechas absolutas. El detalle por tarea —commit,
número de pruebas, resultado de la revisión— vive en el ledger
`.superpowers/sdd/progress.md`; aquí van los hitos.

---

## 2026-09-01 — Capa de tokens y seis primitivas: "la mesa y el manual" (tarea 1.19)

**Qué.** `apps/web/src/ui/` (nuevo): `tokens.css` con la paleta por tema, `theme.ts` con el
interruptor, y seis primitivas —`Button`, `Field`, `Panel`, `Badge`, `Dialog`, `Tabs`—, cada una
con sus pruebas. `/design-tokens` las muestra todas. Se convierten **solo dos consumidores**, a
propósito: el Markdown del mundo pasa a `Panel tone="vellum"` y el distintivo de visibilidad a
`Badge`.

**La dirección visual la eligió el autor** en conversación, antes de escribir el brief:
**chrome oscuro sobrio, tipo instrumento; el contenido del mundo sobre pergamino con serifa**.
El tema claro no es un extra — **es el modo de lectura en pergamino**. Oscuro por defecto,
`prefers-color-scheme` la primera vez, elección guardada. Elemento firma único: el panel de
pergamino dentro del chrome oscuro. Tipografías por pila del sistema, sin fuentes de red, para
que la medición de contraste sea estable.

**Ocho tokens por tema**, y ninguno se escribe como literal en ningún componente. Acento
**cardenillo** (`#3F8C79`) y destructivo **lacre** (`#B4463C`), más dos variantes de texto que
la medición obligó a añadir: `--accent-text` (`#469b86`) y `--danger-text` (`#cb6b62`). Ese es
el resultado más útil de la tarea: **en oscuro, ningún par ponía `--danger` como texto por
encima de 4,5:1** —lo mejor era 3,43:1—, así que la tabla original estaba incompleta. La
alternativa que llegó primero era pintar el mensaje de error con el color del texto normal, es
decir, un error que no se distingue de un párrafo; se descartó.

**El contraste se mide, no se supone.** `e2e/tokens-contrast.spec.ts` lee los colores calculados
del DOM en los dos temas —componiendo el alfa contra el fondo real— y falla por debajo del
umbral. Ver [08-pruebas.md](./08-pruebas.md).

**Las tres trampas que encontró la revisión, y que son la lección de la tarea:**

1. **`tailwind.config.js` remaquetaba la aplicación entera.** `extend` con las **mismas claves**
   que Tailwind (`fontSize`, `spacing`, y también `borderRadius`) **sustituye**, no añade:
   `.text-base` pasaba de 1rem a 0.875rem, `.text-sm` perdía su `line-height`, `.p-6` de 1.5rem
   a 2rem. 124 usos en pantallas que esta tarea no debía tocar. Ninguna prueba lo veía, porque
   RTL y Playwright seleccionan por rol y por texto. Se renombran a `chrome-*`, `world-*`,
   `s1..s8` y `radius-*`, y se comprueba compilando el CSS.
2. **Medir solo lo que uno eligió medir no es medir.** Dos pares incumplían el umbral de la
   propia tarea —enlaces sobre pergamino a 4,14:1, botón fantasma sobre `--surface` a 4,26:1— y
   la prueba no los veía porque la página de muestra no tenía ningún enlace dentro del panel de
   pergamino. Se añaden las muestras que faltaban y una lista cerrada de qué puede medirse sin
   bloquear.
3. **El `body` bajaba la base de 16 a 14 px** en 17 ficheros no revisados —98 elementos de texto
   sin clase de tamaño, 28 de ellos controles de formulario, y por debajo de 16 px iOS Safari
   hace zoom al enfocar—. Era la misma remaquetación por otra puerta. Se quita: la densidad se
   decide en 1.19b, con las pantallas delante.

**Lo que NO entra, y por qué.** `ThemeToggle` está construido y probado, pero **solo se alcanza
en `/design-tokens`**: mientras las pantallas sigan clavadas a `bg-slate-900`, pulsarlo no
mejora nada y deja los distintivos de visibilidad a **1,10:1** sobre la fila sin convertir. Un
interruptor que anuncia un modo que la aplicación todavía no tiene es una regresión, no una
funcionalidad. Se monta en **1.19b**, que convierte las pantallas. Ver
[06-pendientes.md](./06-pendientes.md).

**Cómo revertir.** Un commit propio. Revertirlo borra `src/ui/`, la página de tokens y la suite
de contraste, y devuelve el Markdown y el distintivo a su forma anterior. No toca `apps/api` ni
`packages/`.

---

## 2026-09-01 — Endurecimiento de la API: cabeceras, CORS, límite de intentos, dependencias y cuenta (tarea 1.18a)

**Qué.** Los hallazgos 2, 3, 4, 5 y la mitad de servidor del 8 de la auditoría del 2026-09-01,
en una sola rama que solo tocó `apps/api` y `packages/shared`:

- **Cabeceras (`@fastify/helmet`)** con política revisada, no la de por defecto: `X-Frame-Options:
  DENY`, `nosniff`, `Referrer-Policy`, y `Content-Security-Policy` **apagada a propósito** —
  gobierna cómo un navegador pinta una página, y esta API solo devuelve JSON.
- **CORS apagado por defecto.** La configuración contradecía a `01-arquitectura.md` (*"No hay
  CORS por diseño"*): en producción nginx y en local Vite sirven `/api` en el mismo origen.
  `CORS_ORIGIN` queda como única forma de encenderlo.
- **Límite de peticiones por IP** (`@nestjs/throttler`) en login, registro, aceptar invitación y
  cambiar contraseña, con constantes con nombre en `common/rate-limit.constants.ts`.
- **Dependencias**: Nest y Fastify a 11.x y `fast-uri` a 3.1.6. `pnpm audit --prod` pasa de
  **29 hallazgos (1 crítico, 16 altos) a 4 moderados**, y CI audita con `--audit-level=high`.
- **Cuenta**: cambiar el nombre visible y la contraseña —exigiendo la actual y verificándola con
  argon2—, con esquemas Zod en `@dnd/shared`. **Cambiar la contraseña invalida los tokens
  anteriores** (`User.passwordChangedAt`, ver [05-datos.md](./05-datos.md)).
- `main.ts` se parte: `configure-app.ts` expone `buildAdapter()`, `configureApp()` y
  `loadBootEnv()`, que ahora usan tanto el arranque real como las pruebas.

**Por qué se parte `main.ts`.** Porque lo que solo vive en `bootstrap()` **no lo prueba nadie**:
los e2e construyen `AppModule` directamente. Antes eso era una línea (`enableCors()`); al añadir
toda la política de cabeceras y la configuración del adaptador habría sido borrable en silencio
por el siguiente refactor.

**La trampa que encontró la revisión, y que es la lección de la tarea.** `trustProxy: true`
**anulaba el límite de intentos que esta misma tarea añadía**: el limitador usa `req.ip`, y con
`true` Fastify toma la entrada **más a la izquierda** de `X-Forwarded-For` —la que manda el
cliente—, mientras el `proxy_add_x_forwarded_for` de nginx **añade** sin sustituir. Un atacante
rotando la cabecera tenía intentos ilimitados. Medido contra fastify 5.11.3: con `true` la clave
era `9.9.9.9` (falsa); con `1`, `203.0.113.7` (la real). Se sustituye por `TRUST_PROXY`, un
**número de saltos** que por defecto no confía en ninguno.

Y una segunda vuelta de tuerca: `TRUST_PROXY` se leía **antes** de cargarse `apps/api/.env`
—`buildAdapter()` es un argumento de `NestFactory.create`, la misma trampa que ya documentaba
`auth.module.ts` para `JWT_SECRET`—, así que ponerlo en el `.env` no hacía nada. Falla al
cerrar, que suena bien y no lo es: detrás de nginx significa que todo internet comparte un cubo
de cinco intentos por minuto y cualquiera deja a todos fuera del login. Se arregla con
`loadBootEnv()` **dentro de `buildAdapter()`**, donde vive la lectura.

**Prueba.** 81 unitarias y 43 e2e de API. Cada protección tiene una prueba que **falla si se
quita**, comprobado por mutación **ejecutada por el orquestador**, no por el informe:
`trustProxy` de vuelta a `true` → `trust-proxy.e2e-spec.ts` da *Expected: 429, Received: 401*;
la ventana de `passwordChangedAt` aflojada → caen dos de `jwt.strategy.spec.ts` y la e2e de
cambio de contraseña; `loadBootEnv()` fuera de `buildAdapter()` → *Expected: "203.0.113.7",
Received: "127.0.0.1"*. Esa última mutación **descubrió que el arreglo anterior no estaba
fijado**: borrar la llamada de `main.ts` dejaba la suite entera en verde, porque la prueba
llamaba a `dotenv` por su cuenta. Probaba el mecanismo, no el cableado.

**Cómo revertir.** Un commit propio. Revertirlo devuelve CORS abierto, quita cabeceras y límite
de intentos, y deja la columna `passwordChangedAt` huérfana (anulable: no estorba). La
autorización del servidor no se tocó: `canView` sigue intacto.

---

## 2026-09-01 — `JWT_SECRET` deja de tener valor por defecto (tarea 1.18, hallazgo 1)

**Qué.** `apps/api/src/common/jwt-secret.ts` (nuevo) expone `requireJwtSecret()`, que lee la
variable y **lanza** si falta, si está vacía o si mide menos de `JWT_SECRET_MIN_LENGTH` (32);
nunca incluye el valor en el mensaje. `auth.module.ts` y `jwt.strategy.ts` pierden su
`?? "change-me-in-production"`. El primero pasa a `JwtModule.registerAsync`: el array
`imports` del decorador `@Module` se evalúa **al importar el fichero**, antes de que
`ConfigModule.forRoot()` cargue `apps/api/.env`, así que la lectura tenía que aplazarse a la
instanciación para que el secreto de firma y el de verificación —que `jwt.strategy.ts` lee en
su constructor— salgan de la misma fuente. Se alargan a 32 caracteres los **dos**
`JWT_SECRET` de `.github/workflows/ci.yml`, que con `ci-secret` (9) ya no arrancarían. En `.env.example` el valor se deja **vacío**, no con un marcador largo: un
marcador de 32 caracteres o más pasaría la validación, y como el arranque documentado es
`cp .env.example apps/api/.env`, la API acabaría firmando con una cadena publicada en el
repositorio — el mismo agujero por otra puerta. Vacío falla al cerrar. `main.ts` gana un
`.catch` en `bootstrap()` para que el operador lea el mensaje accionable y no una traza cruda.

**Por qué.** Era el hallazgo **crítico** de la auditoría del 2026-09-01: un despliegue sin la
variable firmaba tokens válidos con una cadena publicada en el repositorio, y cualquiera podía
fabricarse un token para el usuario que quisiera. Fallar al arrancar es preferible a funcionar
inseguro.

**Prueba.** `jwt-secret.spec.ts` cubre el ayudante (ausente, vacío, solo espacios, 31, 32, y
que el mensaje no filtra el valor). `auth.module.spec.ts` prueba lo que importa de verdad: que
`Test.createTestingModule({ imports: [PrismaModule, AuthModule] })` con `PrismaService`
sustituido por un doble **no compila** sin la variable, ni con una cadena de 31. El doble de
Prisma es lo que mantiene la prueba unitaria: `compile()` instancia proveedores pero no llama a
`onModuleInit`, así que nunca se abre una conexión; y `AuthModule` a solas tampoco compilaría,
porque `UsersService` necesita el `PrismaService` global.

Los dos consumidores se prueban **por separado a propósito**: hay dos tests que sustituyen uno
al otro (`JwtStrategy` por un doble en uno; `JWT_MODULE_OPTIONS`, el testigo de `@nestjs/jwt`,
en el otro), de modo que el rechazo solo puede venir del consumidor bajo prueba. Sin eso, un
`??` repuesto en **un solo** fichero dejaba la suite en verde con el secreto de firma público
—lo señaló la revisión, y era cierto—. Comprobado por mutación **fichero a fichero, ejecutada
por el orquestador**: mutar solo `auth.module.ts` tumba únicamente el test de la fábrica de
`JwtModule`; mutar solo `jwt.strategy.ts` tumba únicamente el de `JwtStrategy`; restaurados,
66/66 en verde.

**Cómo revertir.** Un commit propio. Revertirlo devuelve el valor por defecto y vuelve a hacer
opcional la variable; no toca autorización, ni el esquema, ni `apps/web`.

---

## 2026-09-01 — Antideriva: la regla de documentación pasa a comprobarla una máquina (tarea 1.17e)

**Qué.** `scripts/check-docs.mjs` (ya existía, sin enganchar) entra en `pnpm verify`, y se
arreglan sus 16 hallazgos: cinco citas al fichero de despliegue ya borrado, con la marca de
escape puesta donde la mención es legítima —explican que se borró—, sin tocar nada donde es
un registro fechado del plan de julio (excluido entero, con su motivo, en el propio script);
varias rutas abreviadas sin `features/` corregidas, y una base nueva (`packages/shared`) para
que el propio `dist/index.js` de `package.json` resuelva. Se añade
`scripts/update-estado.mjs`, que regenera un bloque delimitado en `docs/00-INDEX.md` (commit,
rama, conteo de unitarias por declaración) y falla en modo `--check` si alguien lo edita a
mano; `00-INDEX.md` deja de llevar estado escrito por una persona junto al mapa de
documentos. Las unitarias pasan a tener como fuente única ese bloque generado;
`08-pruebas.md` enlaza en vez de repetirlas. `docs/04-convenciones.md` gana dos reglas: toda
revisión comprueba cada afirmación de la documentación del cambio contra el código, y un
fichero no mezcla tipos de documento. CI gana los pasos `check:docs` y `check:estado`, que
antes solo corrían en el gancho local.

**Por qué.** Siete afirmaciones de la documentación contradijeron el código en una sola
sesión; lo mecánicamente comprobable ya tenía script pero nada lo obligaba a pasar.

**Cómo revertir.** Un commit propio; revertirlo quita `check:docs`/`check:estado` de
`verify` y de CI, restaura el estado escrito a mano en `00-INDEX.md` y borra
`scripts/update-estado.mjs`. No toca `apps/` ni `packages/`.

---

## 2026-09-01 — Web: ajustes de campaña y miembros en la pantalla (tarea 1.17d · B1 + B2, última de 1.17)

**Qué.** Los hallazgos B1 y B2 de `06-pendientes.md`, cerrados del todo: la API de editar/
borrar campaña y expulsar/salir (1.17a) existía pero ninguna pantalla la ofrecía.
`CampaignSettings.tsx` y `MembersPanel.tsx` (nuevos, montados en la pestaña "Resumen" de
`CampaignDetailPage.tsx`, la única sección que este brief tocó de ese fichero) añaden el
formulario de editar nombre/descripción, borrar la campaña, expulsar a un jugador y salirse
—el DM nunca ve "Salir": ve el motivo que da el servidor—, todo deshabilitado con el motivo
visible en pantalla mientras el rol no se conoce, nunca escondido. Borrar campaña y salir
navegan a `/` con `useNavigate`, no `window.location`. `DeleteButton.tsx` gana dos props
opcionales (`label`, `confirmLabel`) para poder decir "Expulsar"/"Salir de la campaña" en vez
de "Borrar" sin tocar ninguno de sus otros usos. Con esto entran las cuatro subtareas de la
1.17 — ver [06-pendientes.md](./06-pendientes.md) y [00-INDEX.md](./00-INDEX.md).

**Pruebas.** Unitarias nuevas en `pages/__tests__/CampaignDetailPage.test.tsx` (incluidas,
en una segunda ronda de revisión, dos que montan la lista de campañas real para probar que
salir y renombrar actualizan "/" sin recargar dentro del `staleTime` de producción — un
`reload()` de Playwright no puede probar esa invalidación de caché, así que no basta con el
recorrido de navegador) y un recorrido nuevo de Playwright en `campana.spec.ts` (dos sesiones
de navegador), con comprobación por mutación. El recuento vive solo en
[08-pruebas.md](./08-pruebas.md).

**Cómo revertir.** Un commit propio; revertirlo deja la API de 1.17a sin ninguna pantalla que
la consuma, como antes de esta tarea — sin pérdida de datos.

---

## 2026-09-01 — Web: etiquetas visibles, filtro por etiqueta y búsqueda por nombre (tarea 1.17c · A2 + C1)

**Qué.** Los hallazgos A2 y C1 de `06-pendientes.md`: las etiquetas de una entidad se
guardaban y no las leía nadie salvo el propio campo de edición (`EntityEditor.tsx`), y no
había búsqueda ni filtro en ninguna pantalla. `EntityTab` (dentro de
`CampaignDetailPage.tsx`) ahora pinta las `tags` de cada fila (nada si la ficha no tiene
ninguna) y monta `EntityFilterBar` (`features/entities/EntityFilterBar.tsx`, nuevo) encima de
la lista: un `<input type="search">` con etiqueta "Buscar" (subcadena, insensible a
mayúsculas con `toLocaleLowerCase("es")`) y un botón por cada etiqueta presente en la lista
ya cargada de esa pestaña (deduplicadas y ordenadas), conmutable con `aria-pressed`. Varias
etiquetas seleccionadas exigen todas (Y lógico). El filtrado en sí vive en una función pura
y exportable, `filterEntities` (`features/entities/filter.ts`), separada del componente por
la misma razón que `body.ts`: para no disparar `react-refresh/only-export-components` con un
segundo export en un `.tsx`. Con algún filtro activo aparece un contador "N de M" y un botón
"Quitar filtros"; si el filtro no deja nada, el mensaje es "Ningún elemento coincide con el
filtro.", distinto del "Sin elementos." que ya existía para una lista genuinamente vacía.

**Es un filtro de cliente, nunca control de acceso**: opera sobre una lista que el servidor
ya filtró por `canView` y solo puede quitar de la vista filas que la persona ya podía ver.
Detalle y la razón completa en [04-convenciones.md](./04-convenciones.md).

**Alcance deliberado.** El brief acotaba el trabajo a `EntityTab` para no invadir la zona de
`overview` que 1.17d edita en paralelo: `SessionsTab` y `CharactersTab` (mismo fichero) se
quedan sin buscador — C1 se cierra solo para las siete pestañas de entidades, ver
[06-pendientes.md](./06-pendientes.md).

**Un defecto real, encontrado y arreglado durante la propia tarea, no por el brief**:
`EntityTab` no se remonta solo porque cambie su prop `type` — es la misma posición del árbol
con el mismo componente, así que React reutiliza la instancia entre pestañas de entidad. Sin
`key={tab.type}` en la llamada (`CampaignDetailPage.tsx`), el nuevo estado de filtro (y ya
antes, sin que nada lo notara, `creating`/`editing`) se colaba de una pestaña a otra: escribir
"strahd" en NPCs seguía filtrando la lista de Lugares al cambiar de pestaña. Confirmado con
una comprobación de RTL desechable antes de corregirlo, y cubierto ahora con una prueba
permanente.

**Pruebas.** Unitarias nuevas de `filterEntities` en `features/entities/__tests__/filter.test.ts`,
y de pantalla en `pages/__tests__/CampaignDetailPage.test.tsx` (etiquetas pintadas en la fila,
buscar reduce filas, una etiqueta reduce filas, dos etiquetas exigen las dos, "Quitar
filtros" restaura la lista, mensaje de cero-resultados correcto, y el filtro no se cuela
entre pestañas). Un recorrido de Playwright nuevo en `campana.spec.ts`: crea dos NPCs con
etiquetas distintas, filtra por una, comprueba con `toHaveCount(0)` que el otro desaparece de
verdad del DOM, y que "Quitar filtros" lo devuelve. **Comprobación por mutación**: se rompió
a mano `filterEntities` para que siempre devolviera la lista completa sin filtrar: el
recorrido nuevo falló exactamente en el `toHaveCount(0)` esperado, los otros siete siguieron
en verde, y se restauró. El recuento vive solo en [08-pruebas.md](./08-pruebas.md), la fuente
única; no se repite aquí.

**Cómo revertir.** Un commit propio; revertirlo deja `entity.tags` de nuevo sin más lector
que `EntityEditor.tsx` y ninguna pantalla con búsqueda ni filtro — sin pérdida de datos,
porque el filtro nunca escribió nada.

---

## 2026-09-01 — Web: el cuerpo Markdown de las fichas (tarea 1.17b · A1)

**Qué.** El hallazgo P0 de `06-pendientes.md`: `Entity.body` existía en el modelo y en el
esquema compartido, pero `EntityEditor.tsx` nunca lo pintaba ni lo mandaba — la wiki era un
índice sin páginas. Forma explícita en `entity.schema.ts`
(`entityBodySchema = { format: z.literal("markdown"), text: z.string().max(50000) }`), campo
"Texto" en el editor con conmutador Editar/Vista previa, y `Markdown.tsx`
(`react-markdown@9`, sin `remark-gfm` ni `rehype-raw`) como único punto del proyecto que
renderiza Markdown. Detalle completo de la forma, cómo se vacía y por qué difiere de
`Session.notes` en [05-datos.md](./05-datos.md).

**Pruebas.** Unitarias de esquema nuevas en `packages/shared/src/entity.schema.test.ts`,
e2e de API nuevas en `entities.e2e-spec.ts` (formato inválido → 400, texto > 50000 → 400, ida
y vuelta idéntica), RTL nuevas en `EntityEditor.test.tsx`, y un recorrido de Playwright nuevo
en `campana.spec.ts`, comprobado por mutación (se quitó a mano la clave `body` del payload, el
recorrido falló donde tocaba, se restauró y volvió a verde). El recuento vive solo en
[08-pruebas.md](./08-pruebas.md), la fuente única; no se repite aquí.

**Cómo revertir.** Un commit propio; revertirlo deja `Entity.body` en el modelo pero de nuevo
sin pantalla que lo escriba o lo lea — ninguna fila tiene datos que perder porque, antes de
esta tarea, ninguna escritura real llegó a producirse.

---

## 2026-09-01 — API: editar/borrar campaña y expulsar/salir (tarea 1.17a)

**Qué.** Los hallazgos B1 y B2 del contraste de 1.17 (`06-pendientes.md`) decían que una
campaña no se podía editar ni borrar, y que un miembro no se podía expulsar ni salirse — la
API no tenía esos endpoints. Esta tarea es solo la mitad de API: **`apps/web` no se toca**,
así que B1/B2 siguen abiertos hasta 1.17d.

1. **`packages/shared/src/campaign.schema.ts`**: `updateCampaignSchema =
   createCampaignSchema.partial()`. `description` sigue sin `.nullable()` — vaciarla se hace
   mandando `""`, la misma trampa ya pagada en 1.13.
2. **`MembershipService.removeMember(campaignId, actorId, targetUserId)`**
   (`apps/api/src/campaigns/membership.service.ts`): un único método cubre expulsar y
   salirse, distinguidos solo por si `targetUserId === actorId`. Un DM no puede salirse de su
   propia campaña (hay que borrarla) ni ser expulsado. El borrado va en una transacción que
   limpia también las `EntityVisibilityGrant` de esa persona en la campaña — retirar acceso
   es el argumento del producto, y una concesión huérfana lo devolvería si reingresara.
   **Lo que no se borra**: los personajes que posee y las entidades que creó se quedan en la
   campaña (detalle completo en [05-datos.md](./05-datos.md)).
3. **`CampaignsService`**: `update` (requiere DM, escribe solo las claves presentes),
   `remove` (requiere DM, un `delete` de una línea porque el esquema ya cascadea todo) y
   `removeMember` (delega en `MembershipService`). Los tres emiten su evento
   (`campaign.updated`, `campaign.deleted`, `campaign.member.removed`).
4. **`CampaignsController`**: `PATCH /campaigns/:id`, `DELETE /campaigns/:id`,
   `DELETE /campaigns/:id/members/:userId` — este último sirve para expulsar y para salirse;
   deliberadamente no hay ruta `/members/me` (en Nest `:userId` capturaría el literal `me`
   según el orden de declaración).

**Pruebas.** Unitarias nuevas con Prisma simulado en `membership.service.spec.ts` y
`campaigns.service.spec.ts`, y e2e nuevas contra Postgres real en `campaigns.e2e-spec.ts` y
`members.e2e-spec.ts` — el recuento vive solo en [08-pruebas.md](./08-pruebas.md), la fuente
única; no se repite aquí. Incluida la prueba de cascada real que crea una campaña con
entidad, enlace, comentario, concesión, sesión, personaje e invitación, la borra, y comprueba
con `prisma.*.count()` que las siete tablas quedan en 0 — es la prueba que justifica que
`remove` sea un `delete` de una línea.

**Cómo revertir.** Un solo commit; `git revert` quita los tres endpoints, el método de
`MembershipService`, el esquema `updateCampaignSchema` y las pruebas. No hay migración nueva.

---

## 2026-09-01 — Cierre de sesión: auditoría de seguridad y alineación de la documentación

**Qué.** Se audita la seguridad del sistema a petición del autor y se escribe
`superpowers/specs/2026-09-01-endurecimiento-seguridad-design.md` con los siete hallazgos, su
evidencia y el orden de arreglo — será la **tarea 1.18**, en sesión aparte. Y se alinea la
documentación entera, que había empezado a contradecirse.

**Lo que la auditoría encontró.** Bien cubiertos: inyección SQL (cero SQL crudo), XSS (cero
`innerHTML`), validación de entrada, argon2, autorización en el servidor y ausencia de secretos
en el código. Faltan siete cosas, y una es **Crítica**: `JWT_SECRET` tiene un valor por defecto
escrito en el código, en dos sitios, así que un despliegue al que se le olvide la variable
firmaría tokens con una cadena **que está en el repositorio público**. Además, 29
vulnerabilidades en dependencias de producción sin que CI audite, sin límite de peticiones, sin
cabeceras de seguridad, CORS abierto —y además innecesario, porque nginx hace de proxy—, y **ni
pantalla de 404 ni red de errores**: una URL inventada da pantalla en blanco.

**La alineación, y por qué hacía falta.** Los conteos de pruebas vivían repetidos en cuatro
documentos y ya se habían desincronizado: el `00` decía 106, el `04` decía 66 y el `08` decía
166, cuando eran **167**. Tres cifras distintas y las tres falsas. Ahora
[08-pruebas.md](./08-pruebas.md) es la **fuente única** y los demás enlazan en vez de copiar.

Es la cuarta vez en la jornada que un documento afirma algo que el código no hace: pasó con el
401 de `/auth/me` en 1.15, con la lección falsa sobre `useMutation` en 1.14, con el motivo
"visible" que era un tooltip en 1.16, y ahora con los conteos. **Un dato repetido en cuatro
sitios es un dato que va a mentir en tres**, y por eso la regla queda escrita donde se aplica.

**Cómo revertir.** Solo añade documentación; `git revert` del commit no toca código ni pruebas.

---

## 2026-09-01 — Borrar desde la interfaz (tarea 1.16)

**Qué.** La carencia que más se notaba usando la herramienta: desde la web no se podía borrar
casi nada, aunque la API ya supiera hacerlo. Ahora sí, con confirmación en pantalla y sin
esconder botones.

1. **Botón "Borrar" en modo edición de los tres editores** (entidad, sesión, personaje), con
   confirmación **en la propia pantalla** — `apps/web/src/components/DeleteButton.tsx`, un
   componente pequeño y compartido, nunca `window.confirm` (incómodo de probar en jsdom y en
   Playwright, y aquí la prueba importa más que en ningún otro sitio). Reutiliza el mismo
   `readOnly`/`readOnlyReason` que el editor ya recibía para editar: borrar y editar están
   gateados por la misma regla del servidor en los tres recursos (`entities.service.ts` y
   `characters.service.ts`: DM o creador/dueño vía `requireEditable`;
   `sessions.service.ts`: DM vía `requireDM`), así que no hace falta calcular un permiso
   aparte — deshabilitado con el motivo a la vista, nunca escondido, igual que 1.15.
2. **La confirmación de entidad dice qué se lleva la cascada real** (`schema.prisma`:
   `EntityLink` en ambas direcciones, `EntityVisibilityGrant` y `Comment`, los tres
   `onDelete: Cascade`), con números reales de comentarios y concesiones cuando ya están
   cargados — comparten clave de consulta con `CommentThread` y con el detalle de la entidad,
   así que no hay petición extra. El número de enlaces no se muestra: `/entities/:id/links`
   solo lista los salientes visibles para quien mira, no los entrantes de otras entidades, y
   mostrar un número parcial habría sido peor que no mostrarlo. Sesión y personaje no tienen
   hijos en cascada, así que su aviso es solo "no se puede deshacer".
3. **`LinksPanel.tsx` y `CommentThread.tsx` dejan de pintar "Quitar"/"Borrar" sin mirar
   permiso** — el hueco que 1.15 dejó declarado a propósito. "Quitar" se deshabilita para
   quien no es DM ni creó la entidad (`links.service.ts:75`); "Borrar" para quien no es DM ni
   el propio autor del comentario (`comments.service.ts:65`); los dos con el motivo visible.
4. **Dos bugs reales encontrados por el recorrido de navegador nuevo, invisibles a cualquier
   prueba con espías:**
   - Las cinco llamadas `DELETE` de la web (las tres nuevas más `deleteLink`/`deleteComment`,
     que llevaban el defecto latente desde que existen) no mandaban cuerpo; `apiFetch`
     (`lib/api.ts`) manda siempre `Content-Type: application/json`, y Fastify rechaza esa
     combinación con 500 ("Body cannot be empty…") — el mismo error que 1.14 encontró en las
     invitaciones. Arreglado enviando `JSON.stringify({})` en las cinco.
   - La cascada de `EntityLink` en ambas direcciones deja el `linksKey`/`commentsKey`
     (`features/links/hooks.ts`, `features/comments/hooks.ts`) de una **entidad distinta** a
     la borrada sin invalidar — nadie puede nombrar esa clave de antemano porque no se sabe
     qué otras entidades enlazaban a la que se borra. `useDeleteEntity`
     (`features/entities/hooks.ts`) invalida ahora por predicado sobre la raíz `"entities"`,
     más ancho de lo estrictamente necesario pero suficiente para cubrir cualquier entidad.
5. **`apps/web/e2e/campana.spec.ts`** gana la prueba que exige el brief: crea dos NPCs, enlaza
   el primero con el segundo, comenta en el segundo, lo borra confirmando en pantalla,
   comprueba que desaparece de la lista, y **reabre el panel de enlaces del primero** para
   comprobar que el enlace hacia el segundo ya no aparece — la cascada contra Postgres real,
   no un mock. El mismo recorrido de sesión/personaje borra también un personaje y una sesión
   (con una cancelación) contra la API real.

**Por qué.** Era la primera carencia de "Antes de la primera partida"
(`docs/06-pendientes.md`): en una partida se crean cosas mal, y sin borrado se quedan para
siempre. Construida encima de 1.15 (`useMyRole`, `readOnly`/`readOnlyReason`), que dejó la web
sabiendo quién la usa.

**Cómo revertir.** `git revert` del commit de esta tarea. No toca `apps/api` ni
`packages/shared` — los cinco `DELETE` del servidor ya existían y seguían probados antes de
empezar. Sin migraciones de base de datos.

**Verificación.** `pnpm verify`: 167 unitarias (shared 10, api 40, web 117), build/lint/formato
limpios. `pnpm --filter @dnd/api test:e2e`: 20/20, sin tocar. `pnpm --filter @dnd/web e2e`:
6/6 (las 5 anteriores más la nueva de cascada).

---

## 2026-09-01 — Arreglos de la revisión de identidad y permisos (tarea 1.15-fix)

**Qué.** Dos Críticos, dos Importantes y un Menor de la revisión independiente de 1.15.

1. **La fila de una entidad, sesión o personaje volvía a abrir siempre** (Crítico). 1.15
   deshabilitaba la fila cuando el usuario no podía editar, confundiendo "editar" con "ver": la
   fila es la única vista de detalle que existe (el editor es el único consumidor de
   `useEntity`/`useSession`/`useCharacter`, y `LinksPanel`/`CommentThread` solo se pintan
   dentro de él). `EntityEditor.tsx`, `SessionEditor.tsx` y `CharacterEditor.tsx` ganaron un
   prop `readOnly`/`readOnlyReason`: campos e inputs deshabilitados, Guardar deshabilitado con
   su motivo, pero enlaces y comentarios siguen pintándose y siendo usables sin condición —
   nunca estuvieron gateados por permiso de edición en el servidor
   (`comments.service.ts`/`links.service.ts` solo exigen `canView`/membresía).
   `CampaignDetailPage.tsx` deja de poner `disabled` en las tres filas y en su lugar decide
   `readOnly` al abrir el editor.
2. **`AuthGate` dejaba la pantalla en blanco para siempre tras un token caducado** (Crítico).
   Devolvía `<Navigate to="/login" replace/>` **en lugar de** sus hijos, montado **por fuera**
   de `<Routes>` (`App.tsx`): `<Routes>` —que contiene `/login`— nunca se renderizaba, así que
   la URL cambiaba pero la pantalla se quedaba vacía. `AuthGate.tsx` ya no redirige nunca —
   solo dispara `useAuthRehydration` y renderiza siempre sus hijos; `ProtectedRoute` (que ya
   redirigía a `/login` sin token) es quien lo hace ahora. La prueba nueva monta `<App/>` real
   en vez de `AuthGate` suelto dentro de una `<Route>` — la topología anterior sí lo desmontaba
   al navegar y por eso nunca vio el defecto.
3. **Cualquier fallo de red o del servidor cerraba la sesión, no solo un 401** (Importante).
   `apiFetch` (`lib/api.ts`) ganó `ApiError`, que propaga el `status` real; `hooks.ts` solo
   cierra la sesión si `err instanceof ApiError && err.status === 401`. El mensaje legible de
   1.14 sigue igual, ahora dentro de `ApiError` en vez de `Error`.
4. **Un solo fallo al listar los miembros hacía que un DM legítimo se leyera a sí mismo como
   no-DM** (Importante). `useMyRole` (`features/campaigns/members.ts`) expone `isError` (nunca
   tratado como "no soy miembro") y `retry()`; `CampaignDetailPage.tsx` e `InvitePanel.tsx`
   enlazan `retry()` a un botón "Reintentar" junto al "Comprobando permisos…".
5. **La inestabilidad de `invites.e2e-spec.ts`/`members.e2e-spec.ts` no estaba anotada**
   (Menor). Ambas construían `dm${Date.now()}@b.com`/`pl${Date.now()}@b.com` — resolución de
   milisegundo, colisión posible entre workers de Jest. Arreglado con un sufijo aleatorio
   además de `Date.now()`; ficha en [06-pendientes.md](./06-pendientes.md), que también anota
   el mismo patrón (sin arreglar) en las demás suites e2e.

**Por qué.** Los dos Críticos los verificó el propio autor del brief en el código antes de
encargar la tarea. El primero rompía el movimiento central del producto (revelar algo a la
mesa); el segundo dejaba a cualquiera que volviera pasados los 7 días del JWT
(`auth.module.ts`) sin formulario de acceso.

**Prohibido y respetado.** No se tocó ningún guardia del servidor (`canView`, `requireDM`,
`requireMember`, `requireEditable`); `/auth/me` no se tocó más allá de lo ya hecho en 1.15; el
mensaje legible de `apiFetch` (1.14) no se perdió; no se desactivó ninguna prueba, ni se
silenció ningún aviso, ni se subió ningún `timeout`; no hubo commits intermedios ni push.

**Verificación.** `pnpm verify`: build + lint + formato + **135 unitarias** (shared 10, api
40, web 85) en verde. `pnpm --filter @dnd/api test:e2e`: **20 e2e** en verde (9 suites).
`pnpm --filter @dnd/web e2e`: **5 recorridos** en verde. `invitacion.spec.ts` se amplió con un
NPC `PLAYERS` (`Gundren Rockseeker`, con un comentario del DM ya puesto) que el jugador abre y
lee tras unirse: comprueba que la fila está `toBeEnabled()`, que el campo Nombre precarga el
valor real y está `toBeDisabled()`, que Guardar está deshabilitado con su motivo, que el
comentario del DM es visible, y que el jugador puede publicar el suyo propio y verlo aparecer
— la comprobación que le faltaba al recorrido: antes la única entidad del DM era `DM_ONLY`, así
que el jugador solo veía "Sin elementos." y nunca existía una fila visible-pero-no-editable
que abrir.

**Cómo revertir.** `git revert` del commit de la tarea. `AuthGate.tsx` vuelve a redirigir con
`<Navigate>`; `apiFetch` vuelve a lanzar `Error` sin `status`; `useMyRole` pierde `isError` y
`retry`; las tres filas (`CampaignDetailPage.tsx`) y los tres editores pierden `readOnly` y
vuelven a `disabled` en la fila.

---

## 2026-09-01 — La interfaz sabe quién es quien la usa (tarea 1.15)

**Qué.** `/auth/me` (único cambio permitido en `apps/api` para esta tarea) devuelve ahora
`{ id, email, displayName }` en vez de solo `{ id, email }` —`UsersService.findById` es
nuevo—, con su unitaria (`auth.controller.spec.ts`, `users.service.spec.ts`) y su e2e
(`auth.e2e-spec.ts`: displayName correcto, y 401 sin token). En la web, `AuthGate` +
`useAuthRehydration` (`apps/web/src/features/auth/`) piden ese endpoint una vez, al arrancar,
cuando hay token en `localStorage` pero no hay usuario en memoria — `auth.store.ts` ganó
`setUser` para esto —, sin bloquear el pintado (`ProtectedRoute` sigue mirando solo el token);
si `/auth/me` devuelve 401, cierra la sesión y redirige a `/login`. `useMyRole`
(`features/campaigns/members.ts`) cruza el `id` ya conocido con
`GET /campaigns/:id/members` para responder "¿soy DM o jugador aquí?", con un tercer estado
explícito de "aún no lo sé" mientras carga cualquiera de los dos. Con eso, cuatro pantallas
dejan de mentir: crear/editar sesión (solo DM), editar personaje (dueño o DM), editar entidad
(DM o creador) y generar invitación (solo DM) se **deshabilitan con una explicación visible**
en vez de ofrecer una acción que el servidor iba a rechazar con 403 — elegido sobre ocultar
porque un botón oculto hace pensar que la función no existe. Mientras el rol es
"aún no lo sé", también se deshabilita: ni se muestra activo (ofrecería algo que puede acabar
en 403) ni se oculta (parpadearía al llegar la respuesta real). Las filas de sesión, personaje
y entidad que el usuario no puede editar dejan de comportarse como botón de editar (dos fichas
de P3 cerradas).

**Por qué.** `auth.store.ts` guardaba el token pero no el usuario; tras cualquier recarga la
web no sabía ni quién era ni qué rol tenía, así que ningún botón podía ocultarse ni
deshabilitarse por permiso. Detectado en la revisión de 1.12a, bloqueaba dos fichas de P3
desde entonces y estaba explícitamente anotado como "antes de la primera partida" en
[06-pendientes.md](./06-pendientes.md).

**Esto es honestidad de la interfaz, no seguridad.** `canView`, `requireDM`, `requireMember`
y `requireEditable` (`apps/api/src/common/visibility.ts` y cada servicio) no se tocaron: si
todo el código de esta tarea desapareciera, el servidor seguiría rechazando exactamente igual.

**Fuera de alcance a propósito.** Los botones "Quitar" (`LinksPanel.tsx`) y "Borrar"
(`CommentThread.tsx`) tienen el mismo problema y no se tocaron — el brief pedía exactamente
cuatro superficies (sesiones, personajes, entidades, invitaciones); `useMyRole` queda
disponible para resolverlos del mismo modo cuando se aborden.

**Verificación.** `pnpm verify`: build + lint + formato + **128 unitarias** (shared 10, api
40, web 78) en verde. `pnpm --filter @dnd/api test:e2e`: **20 e2e** en verde (uno nuevo: 401
sin token en `/auth/me`). `pnpm --filter @dnd/web e2e`: **5 recorridos** en verde —
`invitacion.spec.ts` se amplió para comprobar, sobre el DOM real, que el jugador recién unido
ve "Nuevo" en Sesiones **deshabilitado** con el motivo "Solo el DM puede crear o editar
sesiones.", y que el DM, en su propia sesión de navegador, sí puede crear una.

**Cómo revertir.** `git revert` del commit de la tarea. `apps/api`: revertir
`auth.controller.ts`, `users.service.ts` y sus pruebas deja `/auth/me` como antes
(`{ id, email }`). `apps/web`: quitar `AuthGate` de `App.tsx` devuelve a `ProtectedRoute` solo;
borrar `features/auth/` y `useMyRole` (`features/campaigns/members.ts`) y revertir
`CampaignDetailPage.tsx`/`InvitePanel.tsx` deja los cuatro botones sin gatear, como antes.

---

## 2026-09-01 — Cierre de la construcción de la fase 1

**Qué.** Con la tarea 1.14 y sus arreglos, **la fase 1 queda construida**: el mundo, las
sesiones, los personajes y las invitaciones se manejan enteros desde el navegador, con los
cinco niveles de visibilidad comprobados de punta a punta. Se añade
[09-primera-partida.md](./09-primera-partida.md) —el guion de la sesión real, lo que todavía no
se puede hacer y qué anotar mientras se juega— y una sección "Antes de la primera partida" en
[06-pendientes.md](./06-pendientes.md) que prioriza lo que se nota en la mesa.

**Por qué.** La fase no se cierra por tener el código: se cierra por haberla usado. El plan lo
exige y la sesión real es lo único que puede decir qué falta de verdad para la fase 2, cuyo
plan a propósito no está escrito todavía.

**Dónde quedó la verificación.** `pnpm verify` en verde: build, ESLint, Prettier y **106
pruebas unitarias** (shared 10, api 37, web 59), aplicado por `.githooks/pre-commit`. Más **19
e2e de API** contra Postgres real y **5 recorridos de navegador** en Chromium, incluido el de
dos sesiones simultáneas que comprueba sobre el DOM que un jugador **no ve** una entidad
`DM_ONLY`. Al empezar la jornada eran 54 unitarias, cero recorridos de navegador y `pnpm lint`
fallaba con *"eslint no se reconoce"*.

### Lo que enseñaron las revisiones, y que vale más que el código entregado

Las **cuatro** revisiones independientes de la jornada salieron con hallazgos; **ninguna
limpia**. Tres eran pérdida de datos o acceso indebido, y ninguna la habría encontrado una
prueba existente:

- Editar una entidad `SPECIFIC_PLAYERS` **borraba todas sus concesiones**, siempre y en
  silencio, dejándola invisible para toda la mesa. Llevaba días anotado en el ledger como
  *"hueco conocido, aceptable para el MVP"*: la ficha subestimaba un fallo determinista.
- Vaciar las notas de una sesión **no las borraba**: el formulario cerraba como si hubiera
  guardado y el texto seguía publicado.
- Una invitación huérfana en `localStorage` **metía en la campaña al siguiente que iniciara
  sesión** en ese navegador, quemando el enlace del jugador legítimo.

**Tres reglas de proceso salieron de ahí, y están escritas donde se aplican:**

1. **Correr una suite que no llega al código nuevo no es evidencia.** La regla de Playwright
   de [08-pruebas.md](./08-pruebas.md) falló en su primer uso porque el encargo decía *correr*
   el e2e, no *extenderlo*: pasó en verde sin ejecutar una línea de lo nuevo. Desde entonces
   cada encargo nombra **qué recorrido debe ejercer el cambio**.
2. **El informe de quien implementa no es evidencia.** Dos veces afirmó una cobertura que no
   existía —una de ellas, que el recorrido ejercía un `PATCH` que nunca se ejecutaba en un
   navegador—. La salida se comprueba aparte, siempre.
3. **En un arreglo de pérdida de datos, se reintroduce el fallo a mano** y se mira la prueba en
   rojo. Se hizo en las tres últimas tareas; en la última, quitar la limpieza del cierre de
   sesión y la caducidad de la invitación tumbó una prueba cada uno.

También se **retiró una lección falsa** de esta misma documentación: afirmaba que
`useMutation` se rompe con el modo estricto de React, cuando lo comprobable era otra cosa. Una
lección falsa en los documentos es peor que ninguna, porque la siguiente tarea la obedece.

**Cómo revertir.** Nada que revertir: este cierre solo añade documentación. El código de la
fase son los commits `1c2d31f`…`5a49912`, cada tarea el suyo.

---

## 2026-09-01 — Arreglos de la revisión del flujo de invitación (1.14-fix)

**Qué.** Una revisión independiente de 1.14 encontró un **Crítico** verificado en el código:
una invitación pendiente quedaba en `localStorage` para siempre — nada la borraba si el
invitado no volvía (`logout()` solo quitaba `dnd_token`; no había caducidad) — y **cualquier**
autenticación posterior en ese navegador la leía y navegaba a `/join/:token`, donde la
aceptación se disparaba sola al montar sin pedir confirmación. En una mesa con un portátil
compartido, el siguiente que iniciara sesión ahí —otro jugador, el DM— acababa dentro de la
campaña como `PLAYER` sin pulsar nada, y el token quedaba quemado: el invitado legítimo
recibía "Invalid or already-used invite".

**Arreglo 1 (el Crítico), con sus tres partes:**

1. **`/join/:token` ya no acepta al montar.** Con sesión activa, la página muestra una
   confirmación ("Estás a punto de unirte a una campaña con esta invitación.") y espera un
   clic en "Unirse a la campaña" (`JoinPage.tsx`). La guarda `attempted = useRef(false)` sigue
   ahí, sin tocar — ahora protege el clic explícito de un doble clic rápido en vez del efecto
   de montaje bajo StrictMode.
2. **`logout()` borra la invitación pendiente** (`auth.store.ts`), igual que borra
   `dnd_token`.
3. **La invitación pendiente caduca a los 5 minutos** (`PENDING_INVITE_TTL_MS`,
   `features/invites/api.ts`): el guardado ahora lleva un sello de tiempo
   (`{ token, savedAt }` en vez del token suelto) y `peekPendingInvite()` descarta y borra la
   entrada si ya pasó el plazo. Cinco minutos alcanza para completar un login o un registro
   corto sin tener que volver a pegar el enlace, y es corto a propósito: quien se aleja de un
   portátil compartido en la mesa no debería dejarle a la siguiente persona una invitación
   utilizable pasado ese rato. Una entrada con formato antiguo (token suelto, sin `savedAt`,
   de antes de este cambio) se trata como caducada.

**Arreglo 2 (Importante).** Mismo origen: antes, quien abriera el enlace ya autenticado lo
consumía aunque solo quisiera mirarlo — el caso típico es el DM comprobando su propio enlace
antes de mandarlo. Lo cierra el clic explícito del arreglo 1, y la pantalla de confirmación
dice explícitamente que aceptar consume el enlace. `apps/web/e2e/invitacion.spec.ts` ahora
comprueba este caso: el DM visita su propio enlace, ve la confirmación, pulsa "Cancelar" sin
aceptar, y el mismo enlace **sigue funcionando** cuando el jugador lo usa después.

**Arreglo 3 (Importante).** `LoginPage.tsx`/`RegisterPage.tsx` seguían desviando a
`/join/...` mientras existiera la clave en `localStorage`, sin distinguir una invitación
reciente de una de hace semanas ya usada. Lo cierra la caducidad del arreglo 1: expirada la
entrada, `peekPendingInvite()` devuelve `null` y el login/registro navegan a `/` como
siempre. Se añadió la prueba que faltaba: `LoginPage.test.tsx` (y, por simetría,
`RegisterPage.test.tsx`) comprueban que sin invitación pendiente el flujo normal navega al
listado.

**Arreglo 4 (Importante).** La guarda `attempted` no la protegía ninguna prueba unitaria:
`JoinPage.test.tsx` usaba `toHaveBeenCalledWith`, que no cuenta invocaciones, y
`setupTests.ts` no probaba nada bajo `<React.StrictMode>`. Se añadieron las tres pruebas que
faltaban (todas vistas en rojo antes del arreglo correspondiente):
- `JoinPage` bajo `<React.StrictMode>`, dos clics rápidos en "Unirse a la campaña" →
  `acceptInvite` se llama una sola vez.
- Tras un intento de aceptar (éxito o error), `peekPendingInvite()` es `null`.
- `LoginPage` sin invitación pendiente navega a `/`.

Y se corrigió, en su versión de entonces, la prueba de `InvitePanel.test.tsx` que comprobaba
el párrafo estático "una sola persona" ya pintado siempre, sin depender de ninguna
interacción — pasaba por construcción (la cita de línea de esta entrada ya no corresponde: el
fichero se ha reescrito desde entonces). Se
quitó y se sustituyó por dos pruebas que sí dependen del estado: el aviso de "no anula el
anterior" (arreglo 6) solo aparece tras generar un enlace, y el mensaje de error traducido
(arreglo 8) solo aparece cuando `createInvite` falla.

**Arreglo 5 (Menor).** `JoinPage.tsx` no invalidaba la consulta de campañas al aceptar: un
jugador que ya había cargado "Mis campañas" podía tardar hasta 30 s
(`staleTime`, `lib/queryClient.ts`) en verla ahí. Ahora invalida `campaignsKey`
(`features/campaigns/hooks.ts`) justo antes de navegar a la campaña.

**Arreglo 6 (Menor).** Generar un enlace nuevo no anula el anterior en el servidor —no hay
revocación—, y `InvitePanel.tsx` no lo decía. Ahora, una vez hay un enlace en pantalla,
aparece un aviso explícito de que generar otro no invalida los anteriores. La revocación de
verdad necesita API que no existe hoy: fichada en [06-pendientes.md](./06-pendientes.md), sin
tocar `apps/api`.

**Arreglo 7 (Menor).** Corrección de una lección falsa que este mismo documento y
`08-pruebas.md` habían dejado: "la suscripción de `useMutation` se rompe con montaje +
StrictMode" no está demostrado como regla general — ver la nota de corrección en la entrada
de 1.14 más abajo y en [08-pruebas.md](./08-pruebas.md).

**Arreglo 8 (Menor).** Los dos mensajes de error conocidos del servidor
("Invalid or already-used invite", "DM role required") llegaban en inglés a una interfaz en
español, justo a alguien que acaba de entrar por un enlace sin más contexto.
`translateInviteError` (`features/invites/api.ts`) traduce esos dos casos exactos y deja
pasar cualquier otro mensaje tal cual, sin inventar uno que tape la causa real.

**Prohibido, respetado.** No se tocó `apps/api` ni `packages/shared` — la caducidad y
revocación del token en el servidor quedan en [06-pendientes.md](./06-pendientes.md). No se
quitó la guarda `attempted`. La aserción `DM_ONLY` del e2e sigue exactamente igual.

**Pruebas.** TDD: cada prueba nueva se vio en rojo por el comportamiento que le falta al
código, no por fichero ausente — confirmado corriendo `vitest run` contra la implementación
anterior antes de escribir cada arreglo. Unitarias nuevas o reescritas: `api.test.ts` en
`features/invites/__tests__/` (8, nuevo — expiración de la invitación pendiente y
`translateInviteError`), `JoinPage.test.tsx` (6, reescrito para el flujo de clic explícito),
`auth.store.test.ts` (+1, logout borra la invitación pendiente), `LoginPage.test.tsx` y
`RegisterPage.test.tsx` (+1 cada uno), `InvitePanel.test.tsx` (4, una prueba estática
quitada, dos nuevas dependientes de estado). Total: **106 unitarias** (shared 10, api 37, web
59). `apps/web/e2e/invitacion.spec.ts` se actualizó para el clic explícito del jugador y para
el caso del DM que abre su propio enlace sin unirse por accidente; las 5 suites de e2e siguen
verdes.

**Revertir.** `git revert` del commit de esta tarea. No toca `apps/api` ni `packages/shared`;
no hay migración que deshacer.

---

## 2026-08-31 — Flujo de invitación en la interfaz (1.14)

**Qué.** Última tarea de construcción de la fase 1: hasta ahora no había forma de meter a un
jugador en una campaña desde el navegador.

- `features/invites/api.ts` + `hooks.ts` — `createInvite`/`acceptInvite` contra
  `POST /campaigns/:id/invites` y `POST /invites/:token/accept` (API sin tocar); solo
  `useCreateInvite` (mutación) en `hooks.ts` — ver el porqué de que no haya
  `useAcceptInvite` más abajo. `api.ts` también guarda el token de invitación pendiente en
  `localStorage` (`savePendingInvite`/`peekPendingInvite`/`clearPendingInvite`), junto a
  `dnd_token`, para que sobreviva a un login/registro.
- `features/invites/InvitePanel.tsx` — lado DM, montado en la pestaña Resumen de
  `CampaignDetailPage.tsx`. Un botón genera la invitación; el enlace completo
  (`origen + /join/token`) aparece en un `<input readOnly>` seleccionable con su propia
  etiqueta, y un botón de copiar. Si `navigator.clipboard.writeText` falla (permiso
  bloqueado), se muestra el fallo y **el enlace sigue en pantalla** — nunca un "copiado" que
  mienta. Generar la invitación es solo del DM en el servidor (`requireDM`); el botón se
  muestra a todo el mundo igual que en 1.13, porque `auth.store.ts:15` sigue sin conocer el
  id del usuario tras recargar — es el 403 del servidor el que corrige a quien no debería
  pulsarlo.
- `pages/JoinPage.tsx` — ruta `/join/:token`, deliberadamente fuera de `ProtectedRoute`
  (`App.tsx`) porque "sin sesión" es uno de los tres caminos que tiene que cubrir por sí
  sola: sin sesión guarda el token pendiente y muestra enlaces a iniciar sesión o
  registrarse; con sesión llama a aceptar el token de la URL y navega a
  `/campaigns/<campaignId>` con el id que **devuelve el servidor**; token inválido o ya usado
  muestra el mensaje legible de `lib/api.ts` con salida al listado de campañas.
- `pages/LoginPage.tsx` y `pages/RegisterPage.tsx` — tras autenticar, si hay una invitación
  pendiente guardada, navegan a `/join/<token>` en vez de al listado: la invitación se
  completa sola, sin que el jugador tenga que volver a pegar el enlace.

**Dos defectos reales, cazados solo por Playwright contra la API real** (las unitarias de
componente simulan `features/invites/api.ts` entero y no los ejercitan):

1. `createInvite`/`acceptInvite` mandaban `POST` sin cuerpo. `apiFetch` (`lib/api.ts`)
   siempre añade `Content-Type: application/json`, y Fastify rechaza esa combinación con 500
   ("Body cannot be empty…") antes de llegar al controlador. Arreglado enviando
   `JSON.stringify({})` — cambio solo en `apps/web`.
2. La primera versión de `JoinPage.tsx` disparaba la aceptación con `useMutation`
   (`useAcceptInvite`) dentro de un `useEffect` de montaje. Contra la API real, con
   `React.StrictMode` (`main.tsx`) montando el componente dos veces en desarrollo, el `201`
   volvía del servidor (confirmado con logs: `RESPONSE: 201 …/accept`) pero ninguna llamada
   a `onSuccess` ni ningún nuevo render con `isSuccess: true` llegaba a producirse — la
   pantalla se quedaba en "Aceptando invitación…" para siempre, con la invitación ya
   aceptada en la base de datos. Se comprobó también con un segundo enfoque (efecto separado
   observando `accept.isSuccess`/`accept.data` en vez de un callback ligado a la llamada de
   `mutate()`) y el bloqueo persistía igual, así que la causa no era el callback puntual sino
   la suscripción de `useMutation` en sí bajo ese patrón concreto (montaje + StrictMode).
   Arreglado quitando `useMutation` de esta ruta: `JoinPage.tsx` llama `acceptInvite`
   (`api.ts`) directamente y guarda el resultado con `useState`, ajeno al ciclo de vida de
   react-query. `useAcceptInvite` se quitó de `hooks.ts` por quedarse sin nadie que lo use;
   `useCreateInvite` (el botón del DM, disparado por clic, no por montaje) no tiene este
   problema y se queda igual.

   **Corrección (revisión de 1.14-fix, 2026-09-01):** el párrafo de arriba generaliza más de
   lo que se comprobó. Lo que hace seguro el código de hoy contra la doble invocación del
   efecto de montaje es la ref `attempted = useRef(false)`, que se añadió a la vez que se
   quitó `useMutation` — el experimento nunca aisló las dos variables. Con esa misma guarda,
   la versión con `useMutation` habría dejado de disparar una segunda aceptación igual: la ref
   corta la segunda llamada antes de que le importe si la primera se está siguiendo con una
   mutación o con `useState`. "La suscripción de `useMutation` se rompe con montaje +
   StrictMode" **no es una regla general del proyecto** — es una generalización no
   demostrada a partir de un síntoma real (el `201` sin `isSuccess` visible), y no debe
   tratarse como lección para tareas futuras. Ver la entrada de 1.14-fix más abajo.

**Pruebas.** TDD: cada prueba se vio roja por comportamiento (elemento/texto/navegación que
no existía, capturado con `vitest run` antes de escribir la implementación), no por fichero
ausente — el detalle línea a línea vive en el informe de la tarea (fuera de `docs/`; ver el
ledger `.superpowers/sdd/progress.md`). Unitarias nuevas: `InvitePanel.test.tsx` (3),
`JoinPage.test.tsx` (3), `LoginPage.test.tsx` y `RegisterPage.test.tsx` (1 cada una, el caso
"resume la invitación pendiente") — 8 pruebas nuevas, 91 unitarias en total (shared 10, api
37, web 44).
Playwright: `apps/web/e2e/invitacion.spec.ts`, primera suite del proyecto con dos
`BrowserContext` (DM y jugador, cookies y `localStorage` independientes); lee el enlace de
invitación con `inputValue()` sobre el campo real de la pantalla en vez de construirlo a
mano, y comprueba a la vez que la lista de NPCs del jugador dice "Sin elementos." y que el
NPC `DM_ONLY` del DM tiene `toHaveCount(0)` — la comprobación que la fase llevaba debiendo
desde que se instaló Playwright.

**Documentación.** `08-pruebas.md` (estado 91/19/5, recorrido nuevo documentado con los dos
defectos que cazó, "lo que falta cubrir" reducido a accesibilidad/responsive/rendimiento),
`06-pendientes.md` (cierra el flujo de invitación; abre que el token ahora es visible para
el usuario sin caducar ni poder revocarse; `InvitePanel.tsx` añadido a la lista de botones
que no se ocultan por rol), `00-INDEX.md` (fase 1 con la construcción completa, pendiente de
uso real en mesa).

**Revertir.** `git revert` del commit de esta tarea. No toca `apps/api` ni
`packages/shared`; no hay migración que deshacer.

---

## 2026-08-31 — Editores de sesión y personaje (1.13)

**Qué.** `SessionsTab` y `CharactersTab` (`CampaignDetailPage.tsx`) eran de solo lectura;
ganan botón "Nuevo" y sus filas abren el editor correspondiente en modo edición, igual que la
pestaña de entidades:

- `features/sessions/SessionEditor.tsx` — título, fecha/hora opcional (`<input
  type="datetime-local">`, convertida a ISO al enviar), notas opcionales y visibilidad.
  `features/sessions/api.ts`/`hooks.ts` ganan `createSession`/`updateSession` y sus
  mutaciones; `Session` gana el campo `notes` que ya devolvía el servidor pero el tipo no
  declaraba.
- `features/characters/CharacterEditor.tsx` — nombre, raza, clase, nivel (convertido a
  `Number(...)`, nunca la cadena cruda del `<input type="number">`) y biografía, más
  visibilidad. `features/characters/api.ts`/`hooks.ts` ganan `createCharacter`/
  `updateCharacter` y sus mutaciones; `Character` gana el campo `bio`.
- Los dos siguen la convención `api.ts` + `hooks.ts` + componente + `__tests__` en ficheros
  separados de `features/links` y `features/comments`, y la lección de la tarea anterior: la
  edición pasa el objeto ya cargado por la lista (sin `useEntity` porque ni `Session` ni
  `Character` tienen datos ocultos como `grants`) y cada mutación fallida pinta su error en
  el formulario en vez de fallar en silencio.
- **Selector de visibilidad recortado a `PUBLIC`/`PLAYERS`/`OWNER_DM`/`DM_ONLY`**, sin
  `SPECIFIC_PLAYERS` (inerte en los dos modelos). Justificación completa en
  [05-datos.md](./05-datos.md).
- **Playwright**: nuevo recorrido en `apps/web/e2e/campana.spec.ts` que crea una sesión
  `DM_ONLY` y un personaje `PUBLIC` desde sus pestañas, comprueba que aparecen en su lista
  con lo que corresponde, y reabre los dos en modo edición para comprobar la precarga —
  título/notas de la sesión, raza/clase/nivel/biografía del personaje— contra la API real.
  Antes de esta tarea ningún recorrido visitaba `SessionsTab` ni `CharactersTab`; ver
  [08-pruebas.md](./08-pruebas.md).

**Arreglos de la revisión independiente (2026-08-31, tarea 1.13-fix), sobre el mismo trabajo
sin commitear.** Tres hallazgos Importantes y dos Menores:

1. **Vaciar un campo opcional en edición no lo borraba, en silencio.**
   `SessionEditor.tsx` y `CharacterEditor.tsx` construían el `PATCH` con propagación
   condicional (`...(trimmedX ? { x: trimmedX } : {})`), correcto para crear pero no para
   editar: si el usuario borraba el contenido de un campo, la clave se omitía del `PATCH` y
   el servicio (`if (input.x !== undefined) data.x = ...`, tanto en `sessions.service.ts`
   como en `characters.service.ts`) dejaba el valor viejo tal cual. El editor se cerraba como
   si hubiera guardado y el dato seguía en la base. Arreglado enviando la cadena vacía en modo
   edición (`notes`, `race`, `class`, `bio` — ninguno tiene `min` en el esquema). **Excepción
   que se documenta, no se arregla:** `scheduledAt` es `z.coerce.date()` sin `.nullable()`, así
   que "quitar la fecha de una sesión" no es expresable contra la API de hoy sin tocar
   `packages/shared`/`apps/api` — ver [06-pendientes.md](./06-pendientes.md).
2. **`OWNER_DM` en una sesión no significaba lo que decía.** `sessions.service.ts` pasa
   `createdById: ""` a `canView`, así que la comparación de `OWNER_DM` es falsa para
   cualquier jugador, y `visibility.ts` ya devuelve `true` para cualquier DM antes de mirar
   la visibilidad: en una sesión, `OWNER_DM`, `SPECIFIC_PLAYERS` y `DM_ONLY` producían
   exactamente el mismo conjunto de espectadores. Se quitó `OWNER_DM` del selector de
   `SessionEditor.tsx` (se queda en `CharacterEditor.tsx`, donde `ownerId` sí lo hace
   literal). Ver [05-datos.md](./05-datos.md) para la corrección del párrafo que lo
   justificaba con un razonamiento circular.
3. **El recorrido de Playwright nunca guardaba una edición.** El paso de sesión pulsaba
   "Cancelar" tras comprobar la precarga, y el de personaje terminaba en la aserción de
   precarga sin pulsar "Guardar": `updateSession` y `updateCharacter` no se ejecutaban ni una
   vez en un navegador real, pese a que el informe de 1.13 afirmaba que sí. Arreglado para
   que los dos bloques guarden de verdad y comprueben el resultado en la lista, y para que el
   paso de sesión cubra el arreglo 1 de punta a punta: vacía las notas, guarda, reabre y
   comprueba contra la API real que siguen vacías.
4. **Menor.** Un valor de visibilidad guardado que el `<select>` no ofrece (p. ej.
   `SPECIFIC_PLAYERS` por curl o siembra) dejaba el desplegable en blanco sin explicación.
   Ahora se añade como opción extra, marcada como "valor guardado, no seleccionable aquí".
5. **Menor.** Faltaba la prueba que ata el arreglo 1 (vaciar un campo en edición envía la
   cadena vacía) en los dos editores, y `CharacterEditor.test.tsx` nunca afirmaba el payload
   completo de `updateCharacter`. Las dos se añadieron, vistas en rojo antes del arreglo. Se
   dejó constancia, con comentario en el fixture y ficha en
   [06-pendientes.md](./06-pendientes.md), de que la prueba de precarga de la fecha de sesión
   solo cuadra porque el fixture tiene los segundos a cero.

**Por qué.** Cierra el hueco que dejaban abierto 1.8/1.9 (API) y P1 de
[06-pendientes.md](./06-pendientes.md): la API de sesiones y personajes existía y estaba
probada, pero no había forma de crearlos o editarlos desde la web.

**Qué queda abierto, a propósito.** Ni `SessionsTab` ni `CharactersTab` ocultan el botón de
edición según permiso (crear/editar sesión es solo del DM; editar personaje, del dueño o el
DM) — mismo bloqueante que las entidades y los enlaces/comentarios: la web no conoce su
propio id de usuario tras recargar (`auth.store.ts:15`). No hay UI de borrado, aunque la API
la soporte: el brief pedía creación y edición, no borrado.

**Cómo revertir.** `git revert` del commit de esta tarea. Sin migraciones ni cambios en
`apps/api` o `packages/shared`: solo web y documentación.

---

## 2026-08-31 — Editor de entidades: se arregla la pérdida de datos silenciosa

**Qué.** Cinco arreglos sobre el editor de entidades (commit `7714833`), encontrados en su
revisión independiente:

1. **Crítico.** Editar una entidad `SPECIFIC_PLAYERS` sin tocar la selección de jugadores
   mandaba `specificPlayerIds: []`, y el servicio lo interpretaba como "borra todas las
   concesiones y no crees ninguna" (`entities.service.ts:112-119`). Se arregló con precarga
   real: `useEntity` (nuevo hook, `features/entities/hooks.ts`) pide el detalle —que ya traía
   `grants`— solo en modo edición, y siembra la selección una vez llega. Mientras el detalle
   no ha llegado, `specificPlayerIds` no se manda (guarda de la carrera: si se pulsa Guardar
   en ese hueco, no se destruye nada).
2. El `fieldset` "Jugadores con acceso" mostraba todas las casillas vacías al editar, aunque
   hubiera concesiones vivas. Se cae solo con el arreglo 1; lleva su propia prueba porque
   afirma sobre lo que se ve, no sobre el payload.
3. Un jugador que creaba una entidad heredaba el `DM_ONLY` por defecto del modelo y su
   entidad desaparecía (invisible incluso para él). El formulario de creación arranca ahora
   en `OWNER_DM` — una línea en `EntityEditor.tsx`, sin tocar `canView` ni los valores por
   defecto del esquema o de Prisma. Ver [05-datos.md](./05-datos.md).
4. Un error del servidor (400 de Zod, 403) se pintaba como JSON crudo dentro del modal.
   `lib/api.ts` ahora extrae un mensaje legible (`fieldErrors`/`formErrors` de Zod
   concatenados, o `message` si es una cadena) y solo cae al texto crudo si el cuerpo no es
   JSON entendible.
5. `useMembers` se pedía siempre al abrir el editor, aunque la visibilidad nunca fuera
   `SPECIFIC_PLAYERS`, y un fallo o una carga en curso dejaba el `fieldset` vacío —el mismo
   estado, visualmente, que "cero concesiones". Ahora solo se pide cuando la visibilidad lo
   necesita (`useMembers(campaignId, { enabled })`, extensión mínima y compatible hacia atrás
   de `features/campaigns/members.ts`) y `isLoading`/`isError` tienen su propio texto.

**Por qué.** El arreglo 1 no era un riesgo eventual: era determinista. Abrir cualquier entidad
`SPECIFIC_PLAYERS`, corregir una coma del nombre y guardar destruía el 100 % de sus
concesiones, siempre, sin aviso — la entidad quedaba en `SPECIFIC_PLAYERS` con cero
concesiones, que nadie salvo el DM ve, y la lista seguía pintando la misma insignia.

**Pruebas.** 6 nuevas (`EntityEditor.test.tsx`: arreglos 1, 2, 3 y la carrera del arreglo 1,
más la guarda del camino "quitar SPECIFIC_PLAYERS" que ya funcionaba y no tenía prueba;
`lib/__tests__/api.test.ts`: arreglo 4, tres casos). Las 6 se vieron en rojo antes del arreglo
correspondiente. La prueba de creación existente no se tocó.

**Verificación.** `pnpm verify` limpio (build + lint + formato + 62 unitarias: shared 10, api
37, web 15) y `pnpm --filter @dnd/web e2e` en verde (2/2) — se comprobó explícitamente que la
prueba que selecciona `DM_ONLY` a mano seguía pasando tras cambiar el valor inicial del
selector.

**No arreglado, dado de alta en [06-pendientes.md](./06-pendientes.md):** las filas de la
lista de entidades son botón de editar aunque el servidor vaya a devolver 403;
`auth.store.ts:15` deja `user: null` tras recargar; falta `key` en `EntityTab` al cambiar de
pestaña; el modal no tiene `role="dialog"` ni cierra con Escape.

**Cómo revertir.** `git revert` del commit: devuelve `EntityEditor.tsx`, `features/entities/
{api,hooks}.ts`, `features/campaigns/members.ts` y `lib/api.ts` a su estado anterior. No toca
`apps/api` ni `packages/shared` — no hay migración que revertir.

---

## 2026-08-31 — Enlaces y comentarios en el editor de entidades (1.12b), y su revisión
(1.12b-fix)

**Qué.** `LinksPanel` y `CommentThread`, montados dentro de `EntityEditor` solo en modo
edición (`isEdit && entity`): panel de enlaces con selector de destino y etiqueta opcional,
hilo de comentarios con nombre de autor resuelto contra `useMembers`. El selector de destino
usa `useAllEntities` (`fetchAllEntities`, sin filtro `type`) porque un enlace puede apuntar a
cualquier tipo de entidad, no solo al de la pestaña activa.

**Por qué falló la primera revisión.** El único e2e de Playwright que existía entonces
(`campana.spec.ts`) pulsaba `Nuevo` y guardaba: nunca pulsaba la fila de una entidad ya creada,
así que nunca activaba `isEdit`. Como los dos paneles solo se pintan en ese modo, **ningún
navegador había pintado jamás `LinksPanel` ni `CommentThread`**, y el e2e pasó en verde sin
ejecutar una sola línea del código nuevo. `docs/08-pruebas.md` regla 3 describe exactamente
este fallo.

**Los arreglos de la revisión independiente (1.12b-fix), en el mismo commit:**

1. **El borrado de un enlace o un comentario ajeno fallaba en silencio.**
   `deleteLink.mutate(l.id)` / `deleteComment.mutate(c.id)` no tenían `onError`; el servidor sí
   rechazaba con 403 (`links.service.ts:75`, `comments.service.ts:65`) pero la interfaz no
   cambiaba nada, así que un jugador que pulsaba "Borrar" en un comentario ajeno no veía ni
   mensaje ni cambio. Arreglado reutilizando el `error` que ya existía para el camino de
   añadir/publicar, con `mutate(id, { onError: ... })`.
2. **El selector de destinos de enlace quedaba obsoleto hasta 30 s.** `allEntitiesKey` es una
   rama distinta de `entitiesKey(campaignId, type)` (`features/entities/hooks.ts`), y las mutaciones de
   crear/actualizar entidad solo invalidaban la segunda; con `staleTime: 30_000`
   (`lib/queryClient.ts`) tampoco se refrescaba al montar. Un DM que creaba una entidad y
   abría otra para enlazarla no la veía en el desplegable durante medio minuto. Arreglado
   invalidando también `allEntitiesKey(campaignId)` en `useCreateEntity` y `useUpdateEntity`.
3. **El e2e verde no probaba nada nuevo** (visto arriba). Se añadió el recorrido que faltaba a
   `campana.spec.ts`: crea dos NPCs, abre uno en modo edición, comprueba que los dos paneles
   se pintan, enlaza el NPC con el otro y ve el enlace en la lista, publica un comentario y lo
   ve con su texto — contra la API real, sin mocks.
4. **El desplegable ofrecía destinos ya enlazados**, y volver a elegirlo chocaba contra
   `@@unique([fromId, toId, label])` (`schema.prisma:100`) sin que `links.service.create`
   comprobara duplicados antes: 500 en crudo o fila repetida. Arreglado excluyendo del
   desplegable lo que ya está en `links.data`, además de la propia entidad. De paso se cerró
   una prueba semivacía (`LinksPanel.test.tsx`) que metía la entidad propia en el resultado de
   `fetchAllEntities` sin afirmar nunca que no apareciera como opción.
5. **Las pruebas de `EntityEditor` en modo edición disparaban `fetch` reales.** Los cuatro
   casos de edición ahora montan `LinksPanel` y `CommentThread`, que llaman a `fetchLinks`,
   `fetchAllEntities` y `fetchComments`; ninguno estaba espiado en `EntityEditor.test.tsx`, así
   que pasaban por `retry: false` convirtiendo el fallo real en un `isError` que nadie miraba.
   Arreglado espiando los tres fetchers en ese fichero.
6. `CommentThread` llama a `useMembers(campaignId)` sin `enabled`, a diferencia del
   `EntityEditor`, que lo hace perezoso a propósito. **Se dejó así, deliberadamente**: el hilo
   necesita los nombres para atribuir comentarios y se pinta siempre en modo edición; comparte
   clave de consulta con el picker de jugadores, así que sigue siendo una sola petición, no
   dos. Documentado con un comentario en `CommentThread.tsx`.

**No arreglado a propósito.** Los botones "Quitar"/"Borrar" se pintan en todas las filas sin
mirar permiso: ocultarlos con criterio necesita que la web conozca su propio identificador de
usuario, y `auth.store.ts:15` todavía lo pierde al recargar. Mismo bloqueante que la fila de
edición de `CampaignDetailPage.tsx`. Ver [06-pendientes.md](./06-pendientes.md).

**Pruebas.** 5 nuevas vistas en rojo antes de su arreglo: borrado con error en `LinksPanel` y
en `CommentThread` (fix 1), exclusión del desplegable en `LinksPanel` (fix 4, más la aserción
que faltaba en la prueba semivacía existente), y dos de `features/entities/__tests__/hooks.test.tsx` (nuevo
fichero) que comprueban `isInvalidated` en `allEntitiesKey` tras crear y tras actualizar (fix
2). El fix 5 no añade una prueba en rojo propia — espiar un fetcher no cambia el resultado de
una prueba que ya pasaba por `retry: false` — así que se declara aquí en vez de fingir un rojo
que no existió.

**Verificación.** `pnpm verify` limpio (build + lint + formato + 71 unitarias: shared 10, api
37, web 24) y `pnpm --filter @dnd/web e2e` en verde (3/3): las dos suites anteriores más el
recorrido nuevo de enlaces y comentarios, que sí ejecuta `LinksPanel` y `CommentThread` en un
navegador real.

**Cómo revertir.** `git revert` del commit: devuelve `LinksPanel.tsx`, `CommentThread.tsx`,
`features/entities/hooks.ts`, `campana.spec.ts` y los ficheros de prueba tocados a su estado anterior.
No toca `apps/api` ni `packages/shared`.

---

## 2026-08-31 — Playwright: la primera prueba que abre un navegador

**Qué.** Playwright con Chromium en `apps/web`: `playwright.config.ts`, especificaciones en
`apps/web/e2e/`, scripts `e2e` y `e2e:ui`, y un trabajo `e2e-browser` aparte en CI que sube el
informe como artefacto cuando falla. La configuración levanta sola los dos servidores —la API
**compilada** (`start:prod`, como en producción) y Vite haciendo de proxy de `/api`— así que
la prueba recorre la misma cadena que un usuario. El `include` de vitest se acotó a `src/`
para que los dos corredores no se disputen los `.spec.ts`.

Cubierto: **registro → crear campaña → crear un NPC con etiquetas y visibilidad → verlo en su
pestaña**, y **salir cierra la sesión** y volver a mano a la ruta protegida devuelve a
`/login`.

**Por qué.** Era la P1 tras cerrar el linter, y `08-pruebas.md` ya llevaba escritas sus reglas
esperando la herramienta: jsdom no pinta ni navega, así que nada cubría sesión, rutas ni
pintado.

**Evidencia de que las pruebas sirven, no solo de que pasan.** Se rompió a propósito la guarda
de autenticación (`ProtectedRoute` dejando pasar sin token) y se corrieron las dos suites: las
**7 pruebas de componente siguieron en verde** y **el e2e de sesión falló** con su captura. La
guarda se restauró y los dos e2e volvieron a pasar. Es el mismo defecto que en english-log
llegó dos veces a producción con toda la suite verde.

**Cómo revertir.** `git revert` del commit: quita la configuración, las especificaciones, los
scripts y el trabajo de CI, y devuelve a vitest su `include` por defecto. Los binarios del
navegador quedan en la caché del usuario (`~/AppData/Local/ms-playwright`) y se borran a mano
si molestan.

---

## 2026-08-31 — ESLint, Prettier y gancho de pre-commit: el nivel pasa a N1 real

**Qué.** ESLint 9 con configuración plana única en la raíz (`eslint.config.mjs`), Prettier
con `.prettierrc.json` y `.prettierignore` (Markdown excluido: la documentación se escribe a
mano), `pnpm verify` ampliado a `build && lint && format:check && test`, y
`.githooks/pre-commit` que lo ejecuta y bloquea el commit. El gancho se conecta solo desde el
`prepare` de la raíz vía `scripts/install-git-hooks.mjs`, escrito para **no fallar nunca sin
`.git`**, porque las imágenes Docker se construyen desde una copia sin repositorio. CI deja
de omitir el lint y añade el chequeo de formato.

**Por qué.** Era la P1 de `06-pendientes.md` y la única excepción declarada en
`04-convenciones.md`: el proyecto no podía exigir N1 sin linter desde la fase 0.

**Los 15 errores de la primera pasada se arreglaron corrigiendo el código, no las reglas:**

- Diez cuerpos de controlador tipados como `any` pasaron a los tipos de `@dnd/shared`
  (`RegisterInput`, `CreateEntityInput`, `UpdateSessionInput`…). El pipe de Zod ya garantizaba
  la forma; el `any` solo la escondía del compilador.
- `updateSessionSchema` y `updateCharacterSchema` estaban **definidos en el controlador**
  mientras el servicio redefinía a mano su `Partial<...>`: dos declaraciones de la misma
  forma. Se mudaron a `@dnd/shared`, que es donde la convención dice que vive la forma de los
  datos, y ambos las importan.
- Tres `require("supertest")` dentro del cuerpo de un test pasaron a un `import` normal.
- Un `ForbiddenException` importado y nunca usado, fuera.
- Los ficheros de configuración CommonJS (`jest.config.js`) declaran su entorno en la
  configuración de ESLint en vez de llevar un comentario que silencie la regla.

Prettier reformateó 57 ficheros de código. Ningún cambio de conducta.

**Evidencia.** `pnpm verify` ✅ (build + lint + formato + 54 unitarias) y
`pnpm --filter @dnd/api test:e2e` ✅ 19 en 9 suites, corridos después del cambio de tipos.

**Cómo revertir.** `git revert` del commit devuelve `any` a los controladores, los esquemas
de actualización al controlador, y `verify` a `build && test`; borra la configuración de
ESLint y Prettier y el gancho. Para desconectar solo el gancho sin revertir nada:
`git config --unset core.hooksPath`.

---

## 2026-08-31 — Se adopta la estructura de documentación numerada

**Qué.** Se crean `docs/00-INDEX.md` y `01`–`08` describiendo lo que el repositorio **es
hoy**, no lo que debería ser. `docs/DEPLOY.md` <!-- docs-lint-ignore --> se elimina y su contenido pasa, traducido y
ampliado con el estado real, a `03-despliegue.md`. `CLAUDE.md` y `AGENTS.md` de la raíz
quedan como punteros cortos. Se añade el script `pnpm verify`.

**Por qué.** El repositorio no tenía `04-convenciones.md`, así que **no declaraba nivel de
verificación**, y `~/.claude/dev-rules.md` exige uno. Al levantar el estado real apareció lo
que el nivel habría destapado antes: **ESLint no está instalado** y `pnpm lint` falla en los
tres paquetes desde la fase 0. Queda declarado como excepción (**N1 incompleto**) y abierto
como P1, en vez de seguir implícito.

**Línea base medida ese día, no prometida:** `pnpm build` ✅ · `pnpm test` ✅ 54 (shared 10,
api 37, web 7) · `pnpm --filter @dnd/api test:e2e` ✅ 19 en 9 suites contra Postgres real ·
`pnpm lint` ❌ *"eslint no se reconoce"*.

**Cómo revertir.** `git revert` del commit: borra `docs/00`–`08`, restaura `docs/DEPLOY.md` <!-- docs-lint-ignore -->
y quita el script `verify`. No toca código de aplicación ni pruebas.

---

## 2026-07-02 → 2026-08-31 — Fase 1: núcleo de campaña

**API completa.** Esquema y migración `campaign_core`; esquemas Zod compartidos; el helper
`canView` con su matriz de 5×6 probada; campañas y `MembershipService`; invitaciones;
entidades con filtro de visibilidad y concesiones; enlaces wiki; comentarios; sesiones
(gestionadas por el DM); personajes (dueño o DM); y el listado de miembros que alimenta el
selector de jugadores de la web.

**Web en curso.** Lista de campañas con creación; detalle con pestañas de entidades,
sesiones y personajes; editor de entidades con etiquetas, visibilidad y selección de
jugadores concretos (commit `7714833`, con su arreglo de pérdida de concesiones en
`1d27a52`); panel de enlaces y hilo de comentarios dentro del modo edición del editor de
entidades (tarea 1.12b), montados como componentes propios (`LinksPanel`, `CommentThread`)
solo cuando la entidad ya existe. El selector de destino de un enlace pide **todas** las
entidades de la campaña con una sola llamada (`useAllEntities`, sin filtro `type`), en vez
de siete listas por tipo: el endpoint ya aceptaba `type` como opcional
(`entities.controller.ts`) y un enlace puede apuntar a cualquier tipo. Quedan los editores
de sesión y personaje, y el flujo de invitación.

Los límites aceptados a conciencia de esta fase están en
[05-datos.md](./05-datos.md) y abiertos en [06-pendientes.md](./06-pendientes.md).

**Cómo revertir.** Cada tarea es un commit propio en `main`; el ledger da el identificador
de cada una. La migración `20260702215016_campaign_core` es la que introduce todas las
tablas de la fase.

---

## 2026-07-02 — Fase 0: cimientos

Monorepo pnpm, NestJS + Fastify + Prisma, React + Vite, `@dnd/shared`, autenticación con
argon2 y JWT, Sentry, Dockerfiles de API y web, CI en GitHub Actions y el procedimiento de
despliegue en Coolify. Ambas imágenes construyen y `node dist/src/main.js` arranca en modo
producción.

Correcciones de la fase que siguen vigentes y explican decisiones raras del repositorio
(las tres están detalladas en [02-entorno.md](./02-entorno.md)): el `&` de la carpeta rompe
`nest --watch` en Windows; `@dnd/shared` se publica a `dist` **y** se aliasa a `src` en Vite;
y `packageManager` queda fijado a pnpm 10.32.1.

**Deuda que nació aquí:** ESLint no se configuró y CI omitía el lint. **Cerrado el
2026-08-31** — ver la entrada "ESLint, Prettier y gancho de pre-commit" de esa fecha, arriba.
