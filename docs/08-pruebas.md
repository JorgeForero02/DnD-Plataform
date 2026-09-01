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

Estado medido el 2026-08-31 (tarea 1.13): **78 unitarias** (shared 10, api 37, web 31) y
**19 e2e de API** en 9 suites más **4 e2e de navegador** en 1 suite, todas verdes. Las
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

### Lo que falta cubrir, en orden

- **El DM copia el enlace de invitación → el jugador lo acepta → entra en la campaña**
  (cuando exista la interfaz, tarea 1.14).
- **El jugador no ve la entidad `DM_ONLY` en pantalla** — el mismo caso que el e2e de API
  prueba por HTTP, comprobado sobre el DOM real. Necesita dos sesiones de navegador y el
  flujo de invitación.

## Definición de terminado

Una tarea está terminada solo si: los criterios de aceptación pasan · las unitarias y los
e2e que le tocan pasan **y se ha visto la salida** · `pnpm build` está limpio · la
arquitectura y las convenciones se respetan · **la documentación está actualizada** · y, si
tocó una pantalla, **se abrió el navegador**: `pnpm --filter @dnd/web e2e` en verde.
