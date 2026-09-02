# Plan — reseño completo de la interfaz · 2026-09-02

**Encargo.** *"quiero mejoras de todo absolutamente todo"*, *"cada cosa es super incomoda de
usar"*, *"quiero una identidad buena decente algo manejable y comodo"*, *"que evoque medival
y modernidad"*.

**Base de hechos:** [auditoría del 2026-09-02](../specs/2026-09-02-auditoria-interfaz.md),
medida sobre capturas de producción con datos reales sembrados, no sobre lectura de código.
**Dirección visual:** [identidad «Sala de guerra»](../specs/2026-09-02-identidad-visual-design.md).

## Alcance, y sus dos fronteras

**Entra:** la identidad entera, la navegación, y **todas** las pantallas existentes.

**No entra, por decisión del autor** (2026-09-02: *"entra pero no su funcionalidad completa,
no quiero dejar tareas de la fase 2 aca"*):

1. **El motor de reglas de la hoja de personaje.** Aquí entra **la forma** —la hoja se
   reordena al formato real de 5ª edición con los campos que ya existen— y el diseño completo
   del resto queda **especificado** en el plan de la fase 2A. Ni un campo nuevo en el esquema,
   ni una fórmula.
2. **La búsqueda dentro del cuerpo de las entidades.** El filtro de pantalla es de cliente y
   `04-convenciones.md` ya declara por qué buscar en el texto exige hacerlo **en el servidor**.
   Eso es una tarea con su ficha, no un efecto colateral de este reseño.

## Restricciones que no se negocian

- **`canView` no se toca.** La visibilidad se **presenta** mejor; quién ve qué lo sigue
  decidiendo el servidor. Un filtro de pantalla nunca es control de acceso.
- **Nada de bajar umbrales.** Los colores nuevos pasan por `e2e/tokens-contrast.spec.ts`
  (4,5:1 texto, 3:1 interfaz, los dos temas). Si un color no pasa, se cambia **el color**.
- **Si toca pantalla, se abre el navegador.** Cada tarea lleva su e2e dentro.
- **Las dos corridas de Playwright nunca se solapan** — puertos 3000/5173. Siempre en serie.
- **Un commit por tarea**, revisión antes de commitear, y despliegue por tandas.

## Tandas

Cada tanda termina desplegada y comprobada en `dnd.supportive.pro` antes de empezar la
siguiente. El autor pidió expresamente ver avance real al despertar, aunque falte alcance.

### Tanda 1 · La identidad (todo lo demás se apoya aquí)

| Tarea | Qué | Cierra |
|---|---|---|
| **R1** | **Valores nuevos de token**: paleta «Sala de guerra» en los dos temas, más una vitela cálida que funcione también de noche. Ampliar `tokens-contrast.spec.ts` a los colores nuevos | D1 |
| **R2** | **Tipografía real**: Marcellus (título), Public Sans (interfaz), EB Garamond (mundo), IBM Plex Mono (dato), desde Google Fonts con pila de reserva y sin salto de pintado | D2 |
| **R3** | **Primitivas nuevas**: `AppShell`, `PageHeader`, `Breadcrumbs`, `Toolbar`, `EmptyState`, `ListRow`, `Prose` y un `VisibilityBadge` con lenguaje propio | B5, C3 |

### Tanda 2 · El esqueleto

| Tarea | Qué | Cierra |
|---|---|---|
| **R4** | **Cabecera global y barra lateral**: marca, campaña actual, acceso a Cuenta y tema desde cualquier sitio; contadores por tipo; migas de pan | B3, B6 |
| **R5** | **Ruta propia para cada entidad** (`/campanas/:id/entidades/:eid`), de modo que el nombre de una fila **sea un enlace de verdad** | A3 |
| **R6** | **Reordenar las nueve pestañas**: el mundo por un lado, la mesa —sesiones y personajes— por otro, con el peso que les toca | B4 |

### Tanda 3 · Las pantallas

| Tarea | Qué | Cierra |
|---|---|---|
| **R7** | **Panel de campañas**: qué campaña es, cuánto mundo tiene, cuándo se jugó, quién juega | C4, C1 |
| **R8** | **Resumen de campaña de verdad**, y los ajustes a su sitio, con **Borrar** separado y confirmado | B2 |
| **R9** | **Listas útiles**: cada fila con su resumen, su tipo y su visibilidad; barra de herramientas agrupada; estados vacíos que dicen qué hacer | B1, C1, C3 |
| **R10** | **Página de entidad**: cabecera, cuerpo en vitela con medida legible, relaciones y **qué apunta aquí**, comentarios | B1 |
| **R11** | **Editores** de entidad, sesión y personaje: medida máxima, campos agrupados, la visibilidad explicada donde se elige | C2 |
| **R12** | **Acceso, registro, cuenta, 404 y todos los textos sueltos en español** | A1, D3 |

### Tanda 4 · La hoja de personaje

| Tarea | Qué | Cierra |
|---|---|---|
| **R13** | **Forma de 5ª edición** con los campos que ya existen, y la especificación completa —fórmulas, huecos, rejilla— incorporada al plan de la fase 2A para que se implemente allí | E1 |

### Tanda 5 · Cierre

| Tarea | Qué | Cierra |
|---|---|---|
| **R14** | **Documentación**: corregir `04-convenciones.md`, que aún dice «sin sistema de diseño» y `bg-slate-900`; estado en 01–05, deuda en 06, historial en 07, cobertura en 08 | A2 |

## Definición de terminado

Una tanda está hecha cuando `pnpm verify` está limpio, sus e2e de navegador pasan, la
revisión previa al commit no deja hallazgos abiertos, está **desplegada y comprobada en
producción**, y la documentación dice la verdad sobre lo que hay.
