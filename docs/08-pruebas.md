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

Estado medido el 2026-08-31: **54 unitarias** (shared 10, api 37, web 7) y **19 e2e** en 9
suites, todas verdes.

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
- **No hay prueba de accesibilidad, ni de responsive, ni de rendimiento.**
- **No hay mutación ni umbral de cobertura** (N2/N3 no declarados).

## Playwright: la regla que aún no tiene herramienta

**Playwright todavía NO está instalado en este repositorio** — es la **P2** de
[06-pendientes.md](./06-pendientes.md). La regla se escribe ahora para que el plan la
respete desde el primer día en que exista, porque la lección viene de otro proyecto y ya
costó defectos ahí:

> En english-log, la fase 0 entregó una pantalla de ingreso con contraste 1.1:1 y la fase 1A
> entregó un "cerrar sesión" roto, **las dos veces con toda la suite en verde**. Y un plan
> posterior metió un componente en cuatro pantallas, creó un segundo enlace con el mismo
> nombre accesible y dejó un `spec` roto en la rama; no lo vio ninguna prueba de componente,
> ni la captura, ni la revisión de la tarea. Lo encontró, dos tareas más tarde, la primera
> tarea que tenía instrucción de abrir un navegador. **La culpa fue del plan, no de quien
> implementó.**

Reglas, cuando Playwright entre:

1. **Los e2e de navegador no entran en `pnpm verify` ni en el gancho de pre-commit.**
   Necesitan Docker, base sembrada y dos servidores vivos; encadenarlos a cada commit haría
   el gancho inservible. Van en un script propio (`pnpm --filter @dnd/web e2e`) y en CI como
   trabajo aparte.
2. **Eso no los hace opcionales. Si una tarea toca una pantalla, corre el e2e antes de darla
   por terminada.**
3. **La regla también aplica al plan, no solo al código:** si una tarea toca una pantalla que
   ya recorre un `*.spec.ts`, **su brief lleva el e2e dentro**. Quien escribe el brief es
   responsable de ponerlo.
4. **Al medir en el navegador, mide los dos ejes.** Una revisión que solo comprueba posición
   y anchura deja pasar celdas estiradas por un `align-items` que nadie miró.
5. Los primeros guiones que hay que cubrir, en este orden: **registrarse → crear campaña →
   crear entidad → verla en la pestaña**; **el DM copia el enlace de invitación → el jugador
   lo acepta → entra en la campaña**; y **el jugador no ve la entidad `DM_ONLY` en pantalla**
   (el mismo caso que el e2e de API prueba por HTTP, comprobado ahora sobre el DOM real).

## Definición de terminado

Una tarea está terminada solo si: los criterios de aceptación pasan · las unitarias y los
e2e que le tocan pasan **y se ha visto la salida** · `pnpm build` está limpio · la
arquitectura y las convenciones se respetan · **la documentación está actualizada** · y, si
tocó una pantalla cubierta por Playwright, **se abrió el navegador**.
