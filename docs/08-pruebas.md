# Estrategia de pruebas

> **Léelo antes de dar una tarea por terminada.** El principio de `~/.claude/dev-rules.md`
> es que la revisión manual línea por línea deje de hacer falta *porque el proceso garantiza
> la calidad*. Ese proceso es este documento. **Que compile no prueba nada más que la
> sintaxis.**

## Las cinco capas y qué prueba cada una

| Capa | Herramienta | Qué demuestra | Dónde vive |
|---|---|---|---|
| **Esquemas** | vitest | Que un cuerpo inválido se rechaza y uno válido se acepta, **antes** de que exista el endpoint | `packages/shared/src/*.test.ts` |
| **Unitarias de servicio** | jest + Prisma simulado | Las reglas de negocio y de autorización: quién puede escribir, qué se filtra al listar | `apps/api/src/**/*.spec.ts` |
| **e2e de API** | jest + supertest + **Postgres real** | Que la cadena completa funciona: HTTP → guardia → pipe → servicio → base, con los códigos de estado correctos | `apps/api/test/*.e2e-spec.ts` |
| **Componentes** | vitest + Testing Library (jsdom) | Que la pantalla renderiza lo suyo y que interactuar dispara la mutación correcta | `apps/web/src/**/__tests__/` |
| **Navegador** | **Playwright** (Chromium) | Que la aplicación real funciona de punta a punta: pintado, navegación, sesión, proxy `/api` | `apps/web/e2e/*.spec.ts` |

> **Este documento es la fuente única de los conteos de pruebas — con una excepción
> declarada.** Las unitarias las genera `scripts/update-estado.mjs` en el bloque de estado de
> [00-INDEX.md](./00-INDEX.md); un número generado no puede desincronizarse de sí mismo, así
> que esa es ahora su fuente y aquí se enlaza en vez de repetirlo. Los conteos de e2e, que
> nada genera, siguen viviendo solo aquí. Si necesitas cualquiera de los dos en otro sitio,
> enlaza en vez de copiar: el 2026-09-01 el `00` decía 106, el `04` decía 66 y este decía
> 166 para las unitarias — tres cifras distintas y las tres falsas. Un dato repetido en
> cuatro documentos es un dato que va a mentir en tres.

**Unitarias:** ver el bloque de estado de [00-INDEX.md](./00-INDEX.md) — se regenera con
`pnpm update:estado` y `pnpm verify` falla si no coincide.

**E2e**, medidos el 2026-09-03 corriendo las dos suites: **121 e2e de API** en 23 suites y
**61 recorridos de navegador** en 14 especificaciones, todos verdes.

> La cifra de API decía **116 en 22 suites** y llevaba un día siendo falsa: faltaba
> `rate-limit.e2e-spec.ts`. Lo encontró una auditoría, no un control — y **este documento es la
> fuente única declarada de ese número**, así que `check:docs` prohíbe repetirlo en otro sitio y
> no había ningún otro lugar donde el lector pudiera cazar el error. La única defensa de una
> fuente única es mirarla de vez en cuando; ninguna expresión regular sabe cuántas suites hay. Las suites de API nuevas del
día son `character-sheet` (12), `character-state` (8), `world-state` (7), `rolls` (8),
`game-state` (6), `notifications` (4), `level-up` (4), `rules-engine` (7),
`catalog-y-velocidad` (4) y **`partida` (12), que
es la prueba de integración que juega una sesión entera** y no se parece a las demás. Uno de
los de `game-state` —«arrancar una segunda sesión en la misma
campaña falla»— **solo puede vivir aquí**: lo que lo impide es un índice único parcial de
Postgres, y el Prisma simulado de las unitarias no valida SQL.

> **El reseño reescribió nueve recorridos del navegador, y merece decirse por qué.** No se
> tocaron sus comprobaciones: se tocó el **camino**. Antes, leer una ficha era abrir su
> formulario, así que los recorridos hacían clic en una fila y esperaban un editor. Ahora la
> fila lleva a una página de lectura y el editor se abre desde ella, de modo que el recorrido
> tiene un paso más — el mismo que da una persona. Un recorrido que hubiera seguido pasando
> sin cambios habría sido la señal de que la mejora no llegó a la pantalla.

> **Dos especificaciones de navegador que no estaban documentadas (2026-09-03).**
> `armazon.spec.ts` mide las tres cosas que el autor señaló mirando el prototipo y que `jsdom`
> no puede ver: que **el pie se apoya en el borde inferior** aunque la pantalla tenga poco
> contenido, que **ninguna entrada del carril va sin su icono**, y que la marca dice lo que debe.
> `capturas-comparacion.spec.ts` no afirma nada: **fotografía nuestras pantallas** en tema
> oscuro con contenido de ejemplo, para poder ponerlas al lado de las del prototipo. Se conserva
> porque montar una campaña con contenido a mano cada vez que hay que comparar cuesta más que
> tenerlo escrito, y porque las dos rondas de interfaz que salieron bien empezaron mirando las
> dos capturas juntas.

> **Un intermitente que parecía un defecto y era el limitador de peticiones (2026-09-03).**
> La suite empezó a fallar en sitios distintos en cada vuelta: un personaje que no aparecía en
> su lista, un campo que no guardaba, un `<input>` que «se desprendía del DOM». Cada fallo por
> separado tenía una explicación creíble y **ninguna era la verdadera**. La causa: hay un tope
> global de **100 peticiones por IP y minuto** sobre todas las rutas, y la suite dispara
> cientos de peticiones legítimas desde `127.0.0.1` en un minuto — sesenta recorridos que
> registran una cuenta, crean una campaña, escriben fichas y rellenan una hoja. Pasado el
> centenar, la API responde **429** y el recorrido se rompe donde le pille.
>
> Se resolvió como ya se había resuelto para el límite de autenticación: **haciéndolo
> configurable y dándole margen solo a esta suite** (`RATE_LIMIT` en `playwright.config.ts`).
> El control de producción no se toca, y un valor mal escrito cae al de producción, nunca a
> «sin límite» — hay pruebas que lo fijan.
>
> **Y una trampa dentro de la trampa:** el primer intento no funcionó y parecía descartar la
> hipótesis. `reuseExistingServer` estaba reutilizando un servidor **arrancado antes del
> cambio**, así que la variable nueva no llegaba. Al matar el proceso viejo, 61 verdes en dos
> vueltas seguidas. Si se toca una variable de entorno del servidor de pruebas, **hay que matar
> el que esté levantado** o la medición miente.

> **Una clase de prueba más, del 2026-09-03: la que comprueba que una clase de CSS pinta.**
> `jsdom` no resuelve una clase de Tailwind hasta un color, así que toda una familia de fallos
> le era invisible **por construcción**: 49 utilidades de opacidad que el compilador descartaba
> en silencio, entre ellas el fondo de la cabecera, el velo de los diálogos y el subrayado que
> distingue lo editable de lo derivado. Se cubren con **dos redes que no se sustituyen**:
> `src/ui/__tests__/clases-de-opacidad.test.ts` barre el código fuente —caza una clase
> reintroducida en una pantalla que ningún recorrido monta— y `e2e/clases-que-si-pintan.spec.ts`
> mide en el navegador que la utilidad llega al CSS y pinta un color, que es lo que el barrido
> no puede saber.
>
> Y una advertencia que salió de ahí: **una prueba de contraste puede pasar midiendo un fondo
> que no existe.** La del filete entre filas daba 12,89:1 en tema oscuro leyendo el gris del
> preflight —alto contra un fondo oscuro por casualidad— y solo se cayó en el claro. Medía el
> borde del enlace, y el filete lo pinta el `<li>`. Cuando una medición de contraste sale
> sospechosamente alta, conviene comprobar **qué** se está midiendo.

> **Y la alarma de maquetación acabó cazando el arrastre, que era lo que faltaba.** Durante unas
> horas del 2026-09-02 aquí ponía que no había forma de probarlo: que en el editor de reglas «no
> se dispara ni un `dragstart`». **Era falso, y las dos conclusiones que llevaron a esa frase lo
> eran también.** Se culpó primero al `backdrop-filter` del velo y después al `overflow-y-auto`
> del panel; la causa real la encontró un banco de pruebas que compiló el componente con su CSS
> y bisectó: era el **`max-h-[85vh]`**. Con el editor dentro de un diálogo de altura acotada, la
> pieza quedaba en `y = 451` y su carril en `y = 891` sobre una ventana de 720 — **no estaban
> nunca en pantalla a la vez**, así que no había dónde soltar. No era un defecto de código: era
> un defecto de sitio, y lo padecía igual una persona con un portátil.
>
> El arreglo fue sacar el editor del diálogo y pintar la paleta en dos columnas para que la
> pieza y su ranura quepan juntas. Hoy hay **dos recorridos que arrastran de verdad**, y el del
> rechazo arrastra **primero** algo que sí se coloca, para que no pueda volver a pasar en verde
> por el motivo equivocado. Mutación comprobada: con el carril rechazando todo, las dos se ponen
> rojas.
>
> Queda una lección que no es sobre arrastrar: **tres diagnósticos seguidos sonaron plausibles y
> dos eran falsos**, y los tres se apoyaban en mediciones reales. Medir no basta si se mide la
> cosa equivocada.

> **Una clase de prueba más, desde el 2026-09-02: la alarma de maquetación.** `jsdom` no
> maqueta —no hay ancho, ni alto, ni `display` calculado—, así que ninguna prueba unitaria
> puede ver un borde mal dibujado. Cuando las filas de las listas pasaron de `<button>` a `<a>`
> heredaron `display: inline` y pintaron el borde **partido**, con **toda la suite unitaria** en
> verde y
> un despliegue de por medio. `apps/web/e2e/campana.spec.ts` lee ahora el `display` calculado
> de una fila y falla si vuelve a ser `inline`. **Lo que solo se ve maquetado, se mide en el
> navegador** — la misma razón por la que el contraste se mide ahí desde 1.19.

La suite de navegador nueva es `apps/web/e2e/tokens-contrast.spec.ts`, y hace algo que ninguna
otra hace: **mide**. Recorre `/design-tokens` **y cinco pantallas reales** (entrar, el detalle de campaña, la 404,
`/acerca-de` y la de cuenta) en los dos temas, lee los colores **calculados**
del DOM —componiendo el alfa contra el fondo real, no leyendo el color declarado— y falla por
debajo de 4,5:1 en texto y 3:1 en bordes y anillos de foco. **Todas las mediciones bloquean.**
La vía de escape de 1.19 —un `observe()` con lista de etiquetas permitidas que registraba sin
bloquear— **se retiró**, y hoy `record()` es el único camino: cada par medido hace su
`expect(...).toBeGreaterThanOrEqual(umbral)`. Esa vía existió porque la primera versión medía
solo los pares que su autor había elegido, y se le escaparon dos que incumplían su propio
umbral; quitarla fue el paso siguiente.

Las unitarias, el lint, el formato y `check:docs`/`check:estado` los exige `pnpm verify` en el
gancho de pre-commit; los e2e quedan fuera del gancho pero dentro de CI.

## Qué escribe una tarea de API

Toda tarea de API entrega, como mínimo:

1. **Unitarias del servicio** con el Prisma simulado: el caso normal, el caso sin permiso,
   y el filtrado de visibilidad para un jugador que no debe ver algo.
2. **Un e2e** que registra un DM y un jugador, crea la campaña, **invita al jugador**, y
   comprueba desde fuera que el jugador ve lo que le toca y **no ve** lo que no.
   Ese guion —registrar, invitar, comprobar los dos puntos de vista— es el patrón de todas
   las suites e2e existentes; cópialo, no inventes uno nuevo.
3. **El caso de entrada inválida**, si la tarea introduce validación nueva.

**Se prueba comportamiento, no implementación.** Un test que afirma que se llamó a
`prisma.entity.findMany` no prueba nada; el que afirma que un jugador no recibe la entidad
`DM_ONLY`, sí.

Los criterios de aceptación se escriben antes, en formato Dado / Cuando / Entonces:

```
Dado un jugador miembro de la campaña
Cuando lista las entidades y una es DM_ONLY
Entonces esa entidad no aparece en la respuesta
```

## Qué escribe una tarea de web

RTL con los módulos `api.ts` simulados y los hooks reales dentro de `QueryClientProvider` +
`MemoryRouter`. Se prueba lo que hace el usuario: escribir, elegir, enviar — y que la
mutación recibe la carga correcta.

**Y `pnpm build` limpio**, que es lo que hace de type-check del `tsx`.

## Lo que las pruebas de hoy NO cubren

Esto no es una salvedad teórica; es el hueco por donde se cuelan los defectos.

- **jsdom no pinta nada.** No hay color, ni tamaño, ni posición, ni contraste, ni foco real,
  ni desbordamiento. Una pantalla puede estar ilegible con toda la suite en verde.
- **jsdom no navega.** Un enlace roto, una ruta que no existe, un `ProtectedRoute` que
  redirige mal: invisible para RTL.
- **El Prisma simulado no valida SQL.** Una restricción única violada aparece como 500 en la
  vida real y como nada en la unitaria.
- **El catálogo de accesibilidad y de responsive está a medias, y el de rendimiento no
  existe.** Playwright cubre hoy **61 recorridos en catorce especificaciones**, y dentro de
  ellos **sí** hay accesibilidad —el contraste medido en los dos temas— y **sí** hay un caso
  de responsive real: que un control de formulario no dispare el zoom de iOS Safari en un
  puntero basto. Lo que falta es el resto del catálogo: foco, lectores de pantalla, teclado,
  anchos intermedios, y cualquier medida de rendimiento.
  (Esta línea ha estado mal dos veces: primero decía «seis recorridos en dos especificaciones»
  y luego «26 en cuatro», las dos contradiciendo la sección de más arriba. **Los recorridos
  contados a mano no coinciden con los que el runner ejecuta**, porque `tokens-contrast.spec.ts`
  declara sus pruebas dentro de bucles sobre los dos temas: la cifra buena es la que imprime
  `pnpm --filter @dnd/web e2e`, no la de contar `test(` en los ficheros.)
- **No hay mutación ni umbral de cobertura** (N2/N3 no declarados).

## Playwright

Instalado el 2026-08-31. **Chromium**, `apps/web/playwright.config.ts`, especificaciones en
`apps/web/e2e/`.

```bash
docker compose up -d                     # los e2e necesitan Postgres
pnpm --filter @dnd/web e2e               # levanta API compilada + Vite y abre el navegador
pnpm --filter @dnd/web e2e:ui            # modo interactivo
```

La configuración levanta los dos servidores sola: la **API compilada** (`start:prod`, que es
como corre en producción) y Vite, que hace de proxy de `/api` igual que nginx. Cada prueba
registra su propio usuario con correo único, así que **no dependen de datos sembrados ni se
pisan entre sí** al repetirse contra la misma base.

`vitest` tiene su `include` acotado a `src/`: los `.spec.ts` de `e2e/` son de Playwright, y
sin eso los recogerían los dos corredores.

### Por qué existen: la comprobación que se hizo al instalarlos

No basta con que una prueba pase. **Se comprobó que puede fallar.** Con la guarda de
autenticación desactivada a mano (`ProtectedRoute` dejando pasar sin token):

| Suite | Resultado con la guarda rota |
|---|---|
| 7 pruebas de componente (jsdom) | **las 7 en verde** |
| 2 e2e de navegador | **la de sesión falla**, con captura |

Ese es exactamente el defecto que en english-log llegó a producción dos veces con toda la
suite verde: una pantalla de ingreso con contraste 1.1:1 y un "cerrar sesión" roto.

### Las reglas

1. **Los e2e de navegador no entran en `pnpm verify` ni en el gancho de pre-commit.**
   Necesitan Docker y dos servidores vivos; encadenarlos a cada commit haría el gancho
   inservible. Van en su script y en CI como **trabajo aparte** (`e2e-browser`), que sube el
   informe como artefacto cuando falla.
2. **Eso no los hace opcionales. Si una tarea toca una pantalla, corre el e2e antes de darla
   por terminada.**
3. **La regla también aplica al plan, no solo al código:** si una tarea toca una pantalla que
   ya recorre un `*.spec.ts`, **su brief lleva el e2e dentro**. Quien escribe el brief es
   responsable de ponerlo.
   > En english-log un plan metió un componente en cuatro pantallas, creó un segundo enlace
   > con el mismo nombre accesible y dejó un `spec` roto en la rama. No lo vio ninguna prueba
   > de componente, ni la captura, ni la revisión de la tarea: lo encontró, dos tareas más
   > tarde, la primera con instrucción de abrir un navegador. **La culpa fue del plan.**
4. **Al medir en el navegador, mide los dos ejes.** Una revisión que solo comprueba posición
   y anchura deja pasar celdas estiradas por un `align-items` que nadie miró.

### Cubierto hoy

- **Registro → crear campaña → crear NPC → verlo en su pestaña**, con etiquetas y
  visibilidad, comprobando que el editor se cierra y la entidad aparece con su `DM_ONLY`.
- **Salir cierra la sesión** y volver a la ruta protegida a mano devuelve a `/login`.
- **Modo edición del editor de entidades, con enlaces y comentarios reales** (1.12b-fix):
  crea dos NPCs y abre uno pulsando su fila. **Desde el reseño del 2026-09-02 la fila lleva a
  la página de lectura** (`pages/EntityDetailPage.tsx`), y es ahí donde se montan `LinksPanel` y
  `CommentThread`; este párrafo decía que el único camino era el modo edición de
  `EntityEditor.tsx`, que hoy solo los nombra en comentarios. Comprueba que los dos paneles se
  pintan, enlaza el NPC con el otro y ve el enlace aparecer en la lista, y publica un
  comentario y lo ve aparecer con su texto. Es la prueba que faltaba: la tanda anterior de
  1.12b tenía cobertura de componente para los dos paneles pero **ningún** recorrido de
  navegador entraba en modo edición, así que el e2e pasó sin ejecutar ni una línea del código
  nuevo. Ver la entrada de 1.12b-fix en [07-historial.md](./07-historial.md).
- **Editores de sesión y personaje** (1.13, ampliado en 1.13-fix): crea una sesión visible
  solo para el DM y un personaje `PUBLIC` desde sus pestañas — hasta la tarea 1.13
  `SessionsTab` y `CharactersTab` eran de solo lectura y ningún recorrido de Playwright las
  visitaba, así que `SessionEditor.tsx` y `CharacterEditor.tsx` nunca se habían pintado en un
  navegador real. El recorrido rellena título, fecha (`<input type="datetime-local">`), notas
  y visibilidad de la sesión; guarda y comprueba que aparece en la lista con `DM_ONLY`; la
  reabre en modo edición y comprueba que título y notas precargan de verdad contra la API
  real (no un espía). **A partir de ahí guarda una edición real**: cambia el título, vacía
  las notas y pulsa "Guardar" — ejerce el `PATCH` real de `updateSession` y, con las notas
  vacías, el arreglo 1.13-fix de punta a punta (una clave omitida en el `PATCH` deja el valor
  viejo; una cadena vacía sí lo borra) — comprueba la fila renombrada en la lista, y **la
  reabre otra vez** para comprobar contra la API real que las notas siguen vacías. Repite lo
  mismo con el personaje —nombre, raza, clase, nivel y biografía—, comprueba que aparece con
  "Nivel 3", y al reabrirlo en modo edición comprueba que raza, clase, nivel y biografía
  precargan: son justo los campos que `CharactersTab` nunca mostró en su lista de solo
  lectura, así que solo el formulario de edición demuestra que el servidor los guardó. **Y
  guarda una edición real**: sube el nivel a 4 con "Guardar" — ejerce `updateCharacter` de
  verdad — y comprueba "Nivel 4" en la lista. Antes de 1.13-fix este recorrido pulsaba
  "Cancelar" tras la precarga de la sesión y terminaba sin guardar en el bloque del
  personaje: `updateSession` y `updateCharacter` no se ejecutaban nunca en un navegador real,
  pese a que el informe de 1.13 lo daba por cubierto. Ver la entrada de 1.13-fix en
  [07-historial.md](./07-historial.md).

- **Flujo de invitación con dos sesiones de navegador, y el jugador no ve la entidad
  `DM_ONLY`** (1.14). `apps/web/e2e/invitacion.spec.ts` es la primera suite de este proyecto
  con dos `BrowserContext` — el DM y el jugador tienen cookies y `localStorage` propios,
  como dos navegadores distintos de verdad. El DM se registra, crea una campaña, crea un NPC
  `DM_ONLY` desde su pestaña, y genera una invitación desde `InvitePanel.tsx` (pestaña
  Resumen); el recorrido **lee el enlace del campo `Enlace de invitación` con
  `inputValue()`**, no lo construye a mano — así prueba que la pantalla lo pinta de verdad,
  no que el token generado en el backend es correcto. Un segundo contexto (el jugador, sin
  sesión) visita ese enlace con `page.goto(inviteUrl)`: comprueba el aviso de "Necesitas
  iniciar sesión…" (uno de los tres caminos de `JoinPage.tsx`), se registra desde el enlace
  "Crear cuenta" de esa misma pantalla, y **sin volver a pegar el enlace** — resume
  automáticamente porque `RegisterPage.tsx` lee el token pendiente que `JoinPage.tsx` guardó
  en `localStorage` y navega de vuelta a `/join/:token` — termina en la página de la campaña
  del DM. Ahí abre la pestaña NPCs y comprueba **las dos cosas a la vez**: la lista dice "Sin
  elementos." y el botón con el nombre del NPC `DM_ONLY` tiene `toHaveCount(0)`. Es la
  comprobación que la fase llevaba debiendo desde el principio — el mismo caso que el e2e de
  API prueba por HTTP (`docs/08-pruebas.md` de fases anteriores), hecho por fin sobre el DOM
  real.

  **Un defecto real, cazado solo por esto:** la primera versión de `createInvite`/
  `acceptInvite` (`features/invites/api.ts`) llamaba a `apiFetch` con `method: "POST"` y sin
  `body`. `apiFetch` (`lib/api.ts`) siempre manda `Content-Type: application/json`, y Fastify
  rechaza esa combinación — cuerpo vacío con ese content-type — con 500 ("Body cannot be
  empty…") antes de que la petición llegue al controlador. Las unitarias de `InvitePanel` y
  `JoinPage` no lo vieron porque simulan `api.ts` entero; solo la corrida contra la API real
  compilada lo mostró. Arreglado enviando `JSON.stringify({})` en las dos llamadas — cambio
  solo en `apps/web`, la API no se tocó.

  **Un segundo defecto, más sutil, también solo visible aquí:** la primera versión de
  `JoinPage.tsx` disparaba la aceptación con `useMutation` (`useAcceptInvite`,
  `features/invites/hooks.ts`) dentro de un `useEffect` de montaje. Contra la API real, con
  React 18 `StrictMode` (`main.tsx`) montando el componente dos veces en desarrollo, el `201`
  de `/invites/:token/accept` volvía del servidor pero el `isSuccess` de la mutación nunca se
  reflejaba en un nuevo render: la pantalla se quedaba en "Aceptando invitación…" para
  siempre, con la aceptación ya hecha en la base de datos. Ninguna prueba de componente lo
  vio porque ahí `createInvite`/`acceptInvite` están simulados y se resuelven en el mismo
  tick, sin la ventana de tiempo real donde el problema aparece. Se cambió `JoinPage.tsx` a
  llamar `acceptInvite` (`api.ts`) directamente y guardar el resultado con `useState`, sin
  pasar por `useMutation`; `useAcceptInvite` se quitó de `hooks.ts` por no tener ya quien lo
  use. El detalle completo, con la secuencia de logs que lo confirmó, está en
  [07-historial.md](./07-historial.md).

  **Corrección (1.14-fix):** lo de arriba generalizaba de más. Lo que hace segura la
  aceptación contra una doble invocación no es haber dejado `useMutation`, es la ref
  `attempted = useRef(false)`, añadida en el mismo cambio — con esa guarda, la versión con
  `useMutation` habría cortado la segunda llamada igual. "La suscripción de `useMutation` se
  rompe con montaje + StrictMode" no quedó demostrado como regla general; ver la corrección
  completa en [07-historial.md](./07-historial.md).

  **Actualizado en 1.14-fix: la aceptación exige un clic explícito.** El Crítico de la
  revisión independiente era peor que los dos defectos de arriba: una invitación pendiente
  sin caducidad, que ni `logout()` ni nada más borraba, se auto-consumía en `/join/:token`
  con **cualquier** login posterior en el mismo navegador, porque la aceptación se disparaba
  sola al montar sin pedir confirmación. `JoinPage.tsx` ya no acepta en el efecto de montaje:
  con sesión activa muestra una confirmación ("vas a unirte…, aceptar consume el enlace") y
  espera el clic en "Unirse a la campaña". El recorrido de `invitacion.spec.ts` ejerce ese
  clic explícito (`playerPage.getByRole("button", { name: "Unirse a la campaña" }).click()`)
  después de que el registro resuma la invitación pendiente, y antes de eso comprueba que la
  pantalla de confirmación es visible — la aceptación no ocurre sola. Se añadió además el caso
  del DM que abre su propio enlace para comprobar que funciona: ve la misma confirmación,
  pulsa "Cancelar" sin aceptar, y **el enlace sigue funcionando** cuando el jugador lo usa
  después — antes de este arreglo, visitarlo ya autenticado bastaba para marcarlo `usedAt` y
  dejarlo inservible para el jugador real. Detalle completo, con las tres partes del arreglo,
  en la entrada de 1.14-fix en [07-historial.md](./07-historial.md).

  **Ampliado en 1.15-fix: el jugador abre y lee una entidad ajena que no puede editar.** La
  única entidad del DM en el recorrido era `DM_ONLY`, así que el jugador solo veía "Sin
  elementos." y nunca existía una fila visible-pero-no-editable que abrir — el recorrido
  entero podía pasar en verde sin ejecutar ni una línea del arreglo 1 de 1.15-fix (la fila deja
  de deshabilitarse; el editor se abre en modo lectura). El DM crea además un NPC `PLAYERS`
  (`Gundren Rockseeker`) y le pone un comentario antes de invitar. Tras unirse, el jugador ve
  esa fila `toBeEnabled()`, la abre, comprueba que el campo Nombre precarga
  `"Gundren Rockseeker"` de verdad (no un formulario vacío) y está `toBeDisabled()`, que
  Guardar está deshabilitado con su motivo ("Solo el DM o quien lo creó puede editarlo."), que
  el comentario del DM es visible, y que puede publicar el suyo propio y verlo aparecer —
  comentar es de cualquiera que pueda ver la entidad (`comments.service.ts` exige solo
  `canView`), así que el modo lectura del formulario no lo apaga. Ver la entrada de 1.15-fix
  en [07-historial.md](./07-historial.md).

- **Borrar una entidad se lleva sus enlaces consigo, cascada real** (1.16, renombrado en
  1.16-fix — el nombre anterior prometía cubrir también la cascada de comentarios y no la
  comprobaba): `apps/web/e2e/campana.spec.ts` crea dos NPCs, enlaza el primero con el segundo,
  comenta en el segundo (ejerce "Publicar" contra la API real, pero no verifica la cascada del
  comentario: la entidad que lo contenía ya no existe tras borrarla, así que no hay dónde
  comprobarlo desde la interfaz), lo borra confirmando en pantalla (nunca `window.confirm`),
  comprueba que desaparece de la lista, y **reabre el panel de enlaces del primero** para
  comprobar que el enlace hacia el segundo ya no aparece — la única forma de probar la cascada
  del esquema (`schema.prisma`, `onDelete: Cascade`) contra la base real, algo que ninguna
  prueba con espías puede demostrar. Esto cazó dos defectos reales que solo aparecían contra la
  API real:
  las cinco llamadas `DELETE` de la web mandaban `Content-Type: application/json` sin cuerpo
  (Fastify las rechazaba con 500, el mismo error que 1.14 encontró en las invitaciones), y la
  cascada bidireccional de `EntityLink` dejaba el `linksKey` de la **otra** entidad
  (`features/links/hooks.ts`) sin invalidar — el panel de enlaces del primer NPC seguía
  mostrando el enlace hacia el segundo, ya borrado en Postgres, durante los 30 s de
  `staleTime`. El mismo recorrido borra también un personaje y una sesión (incluida una
  cancelación) contra la API real, en las pantallas donde el botón "Borrar" se pintó por
  primera vez. Ver la entrada de 1.16 en [07-historial.md](./07-historial.md).

- **El cuerpo Markdown de una ficha, de punta a punta contra la API real** (1.17b · A1):
  `apps/web/e2e/campana.spec.ts` crea un NPC con `## Título\n\nUn herrero enano legendario.`
  en el campo "Texto", guarda, cierra el editor, lo reabre y comprueba dos cosas — que el
  `<textarea>` precarga el Markdown crudo exactamente como se escribió (prueba que el `GET`
  devuelve lo que el `POST` mandó) y que, al pulsar "Vista previa", el `## Título` se pinta
  como un encabezado accesible (`getByRole("heading", { name: "Título" })`), no como texto
  literal con almohadillas. **Comprobación por mutación**: se quitó a mano la clave `body`
  del payload en `EntityEditor.tsx` (`onSubmit`) y se corrió de nuevo — el recorrido falló
  exactamente donde se esperaba, con el `textarea` volviendo vacío tras reabrir
  (`Expected: "## Título\n\nUn herrero enano legendario." · Received: ""`), confirmando que
  el recorrido de verdad ejercita el código nuevo y no pasa en falso. El cambio se restauró
  después y la suite completa (7 recorridos) volvió a verde. Ver la entrada de 1.17b en
  [07-historial.md](./07-historial.md).

- **Filtrar por etiqueta oculta lo que no coincide, y quitar el filtro lo devuelve** (1.17c ·
  A2 + C1): `apps/web/e2e/campana.spec.ts` crea dos NPCs con etiquetas distintas ("lich,
  villano" y "aliado"), comprueba que las etiquetas guardadas ahora se leen en la fila (A2:
  antes de esta tarea `EntityEditor.tsx` era el único lector de `entity.tags` en toda la
  web), pulsa el botón de la etiqueta "lich" y comprueba con `toHaveCount(0)` que el NPC sin
  esa etiqueta desaparece de verdad del DOM — no solo que queda oculto por CSS — y que pulsar
  "Quitar filtros" devuelve la lista completa. **Comprobación por mutación**: se rompió a
  mano `filterEntities` (`features/entities/filter.ts`) para que siempre devolviera la lista
  entera sin filtrar, se corrió la suite de nuevo y el recorrido nuevo falló exactamente en
  el `toHaveCount(0)`, con los otros siete recorridos intactos en verde — confirma que el
  recorrido ejercita el filtro real y no pasa en falso. El cambio se restauró y la suite
  completa (8 recorridos) volvió a verde. Ver la entrada de 1.17c en
  [07-historial.md](./07-historial.md).

- **Editar el nombre de una campaña, expulsar a un jugador y borrar una segunda campaña, todo
  desde "Resumen"** (1.17d · B1 + B2): `apps/web/e2e/campana.spec.ts` añade un noveno
  recorrido, el segundo con dos sesiones de navegador (mismo patrón que
  `invitacion.spec.ts`). El DM crea una campaña, cambia su nombre desde `CampaignSettings.tsx`
  y lo ve cambiado en la cabecera (`PATCH` real); invita a un jugador, que se une y comprueba
  que la campaña está de verdad en su lista antes de que nadie la toque — si no, la
  comprobación de después pasaría por construcción. El DM recarga (la lista de miembros que
  ya tenía cargada queda cacheada 30 s, `staleTime`, `lib/queryClient.ts`, y no se entera sola
  de que alguien se unió) y expulsa al jugador desde "Miembros"; de paso comprueba que él
  mismo, como DM, nunca ve el botón "Salir de la campaña" — ve el motivo que da el servidor.
  El jugador recarga y la campaña ya no está en su lista: el `DELETE` real borró la
  membresía. Por último el DM crea una **segunda** campaña, la borra desde
  `CampaignSettings.tsx`, y comprueba que **solo esa** desaparece de "Mis campañas" —la
  primera, ya renombrada, sigue ahí— la misma exigencia de "no borres lo primero que
  encuentres" que 1.16 aplicó a las filas de entidad.

  **Comprobación por mutación**: se quitó el `JSON.stringify({})` del `DELETE` en
  `removeMember` (`features/campaigns/members.ts`): el recorrido **falló** exactamente donde
  se esperaba (`playerRow` seguía teniendo una fila tras pulsar "Sí, expulsar", con un 500
  real de Fastify en el log del servidor — "Body cannot be empty when content-type is set to
  'application/json'"), confirmando que este recorrido ejercita el código nuevo. Se restauró
  y la suite completa (9 recorridos) volvió a verde.

  **Un segundo intento de mutación, sobre `campaignsKey` en `useRemoveMember`
  (`features/campaigns/hooks.ts`), demostró que este recorrido concreto no puede probar esa
  invalidación — no que la invalidación en sí no se pueda probar.** Quitándola, la suite
  **siguió en verde**: el paso del jugador usa `playerPage.reload()`, y una recarga real de
  navegador crea un `QueryClient` nuevo, así que siempre pide todo por red sin que ninguna
  invalidación de caché pueda importar; además esa invalidación corre en el `QueryClient` del
  **DM**, nunca en el del jugador (son dos procesos de navegador distintos), así que ni
  siquiera en teoría podría cambiar lo que ve el jugador tras recargar. Restaurada sin contar
  como comprobación válida de esa línea. **La invalidación sí se prueba**, pero por dos
  recorridos que no recargan: dos pruebas RTL nuevas en
  `pages/__tests__/CampaignDetailPage.test.tsx` (misma tarea, misma corrección) montan
  `CampaignList` de verdad en "/" con un `staleTime` de producción (30 s,
  `lib/queryClient.ts`) en vez del `0` por defecto de las pruebas — con `staleTime: 0` un
  remontaje siempre volvería a pedir datos por sí solo y la invalidación sería igual de
  invisible para la prueba que un `reload()` de Playwright. Una entra a la campaña, sale, y
  comprueba que la lista pierde la fila sin recargar (`useRemoveMember`); la otra entra,
  cambia el nombre, vuelve a "/" con el enlace "&larr; Mis campañas" (navegación de cliente,
  no recarga) y comprueba que la lista ya dice el nombre nuevo (`useUpdateCampaign`). Las dos
  comprueban además que `fetchCampaigns` se llamó dos veces, no una — la prueba de que hubo
  una invalidación real, no solo que el dato final coincidía por casualidad.

### Lo que falta cubrir

Nada del catálogo de recorridos de la fase 1 queda pendiente: registro, campaña, entidades
con visibilidad, enlaces y comentarios en modo edición, sesiones y personajes, cerrar sesión,
invitación con dos sesiones de navegador y el `DM_ONLY` comprobado sobre el DOM real, borrar
con su cascada real, filtrar por etiqueta, y ahora editar/expulsar/borrar desde "Resumen". Lo
que sigue sin cubrir es lo de siempre —
accesibilidad, responsive, rendimiento — ver la sección de arriba.

## Definición de terminado

Una tarea está terminada solo si: los criterios de aceptación pasan · las unitarias y los
e2e que le tocan pasan **y se ha visto la salida** · `pnpm build` está limpio · la
arquitectura y las convenciones se respetan · **la documentación está actualizada** · y, si
tocó una pantalla, **se abrió el navegador**: `pnpm --filter @dnd/web e2e` en verde.
