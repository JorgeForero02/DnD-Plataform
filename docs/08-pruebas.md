# Estrategia de pruebas

> **Léelo antes de dar una tarea por terminada.** El principio de `~/.claude/dev-rules.md`
> es que la revisión manual línea por línea deje de hacer falta *porque el proceso garantiza
> la calidad*. Ese proceso es este documento. **Que compile no prueba nada más que la
> sintaxis.**

## Las cuatro capas y qué prueba cada una

| Capa | Herramienta | Qué demuestra | Dónde vive |
|---|---|---|---|
| **Esquemas** | vitest | Que un cuerpo inválido se rechaza y uno válido se acepta, **antes** de que exista el endpoint | `packages/shared/src/*.test.ts` |
| **Unitarias de servicio** | jest + Prisma simulado | Las reglas de negocio y de autorización: quién puede escribir, qué se filtra al listar | `apps/api/src/**/*.spec.ts` |
| **e2e de API** | jest + supertest + **Postgres real** | Que la cadena completa funciona: HTTP → guardia → pipe → servicio → base, con los códigos de estado correctos | `apps/api/test/*.e2e-spec.ts` |
| **Componentes** | vitest + Testing Library (jsdom) | Que la pantalla renderiza lo suyo y que interactuar dispara la mutación correcta | `apps/web/src/**/__tests__/` |
| **Navegador** | **Playwright** (Chromium) | Que la aplicación real funciona de punta a punta: pintado, navegación, sesión, proxy `/api` | `apps/web/e2e/*.spec.ts` |

Estado medido el 2026-09-01 (tarea 1.14-fix): **106 unitarias** (shared 10, api 37, web 59) y
**19 e2e de API** en 9 suites más **5 e2e de navegador** en 2 suites, todas verdes. Las
unitarias, el lint y el formato los exige `pnpm verify` en el gancho de pre-commit; los e2e
quedan fuera del gancho pero dentro de CI.

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
- **No hay prueba de accesibilidad, ni de responsive, ni de rendimiento.** Playwright cubre
  hoy dos recorridos, no el catálogo.
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
  crea dos NPCs, abre uno pulsando su fila (el único paso que activa `isEdit && entity` en
  `EntityEditor.tsx` y monta `LinksPanel`/`CommentThread`), comprueba que los dos paneles se
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

### Lo que falta cubrir

Nada del catálogo de recorridos de la fase 1 queda pendiente: registro, campaña, entidades
con visibilidad, enlaces y comentarios en modo edición, sesiones y personajes, cerrar sesión,
y ahora invitación con dos sesiones de navegador y el `DM_ONLY` comprobado sobre el DOM real.
Lo que sigue sin cubrir es lo de siempre — accesibilidad, responsive, rendimiento — ver la
sección de arriba.

## Definición de terminado

Una tarea está terminada solo si: los criterios de aceptación pasan · las unitarias y los
e2e que le tocan pasan **y se ha visto la salida** · `pnpm build` está limpio · la
arquitectura y las convenciones se respetan · **la documentación está actualizada** · y, si
tocó una pantalla, **se abrió el navegador**: `pnpm --filter @dnd/web e2e` en verde.
