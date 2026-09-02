# Auditoría de la interfaz — 2026-09-02

**Origen.** El autor entró en producción por primera vez y dijo: *"no me gusta nada la
interfaz se ve terrible"*, *"cada cosa es super incomoda de usar"*, *"pese a que las hojas de
personaje se trataran no usa el formato de la 5ta edicion"*.

**Método.** No se auditó leyendo código. Se sembró una campaña real en producción —9
entidades de los 7 tipos, 4 enlaces, 2 sesiones, 3 personajes— y se fotografió cada pantalla
en escritorio (1440×900) y móvil (390×844) con Playwright contra `dnd.supportive.pro`. Todo
lo que sigue está medido sobre esas capturas, no supuesto.

> Esto es un registro fechado: no se reescribe. Lo que se arregle se marca abajo, con su
> commit.

---

## Hallazgos, por gravedad

### A. Rompen una regla del proyecto (no son opinión)

| | Hallazgo | Evidencia | Regla que incumple |
|---|---|---|---|
| **A1** | **La interfaz está a medias en inglés.** La pantalla de acceso dice «Iniciar sesión» y debajo `Email`, `Password`, botón `Log in`, y el error `Invalid credentials` | captura `01-login` | `CLAUDE.md`: «Código en inglés, **interfaz y documentación en español**» |
| **A2** | **`04-convenciones.md` describe una interfaz que ya no existe**: dice «sin sistema de diseño para el MVP» y `bg-slate-900` + `indigo-600`, cuando 1.19 introdujo tokens y primitivas | `docs/04-convenciones.md` §Web | «Documentación que miente es peor que ausente» |
| **A3** | **Los nombres de las entidades no parecen enlaces** y no responden como tales: un clic programático sobre «Maestra Ilvara Duskryn» no navegó a ninguna parte | el guion de capturas se quedó en la lista | Una lista cuyo elemento principal no se puede abrir no está terminada |

### B. Impiden trabajar

| | Hallazgo | Evidencia |
|---|---|---|
| **B1** | **Las listas no dicen nada.** Cada NPC es una barra de 1370×60 px con solo nombre, insignia de visibilidad y etiquetas. **Ni una línea de quién es**, pese a que todos tienen cuerpo escrito | `tab-NPCs` |
| **B2** | **La pestaña «Resumen» no resume: es un formulario de ajustes.** Lo primero que ves de tu campaña es un campo «Nombre» editable — y **«Borrar» a la izquierda, del mismo tamaño que «Guardar»** | `desktop-campana` |
| **B3** | **No hay navegación global.** Ni cabecera, ni logotipo, ni buscador, ni acceso a «Cuenta» desde dentro de una campaña. El único control permanente es **un asterisco sin etiqueta** en la esquina | todas |
| **B4** | **Nueve pestañas planas al mismo nivel**: NPCs, Lugares, Misiones, Facciones, Objetos, Eventos, Documentos, Sesiones, Personajes. Las sesiones —lo que ocurre cada semana— pesan lo mismo que «Documentos» | `desktop-campana` |
| **B5** | **La visibilidad, que es el rasgo diferencial del producto, se muestra como una insignia más**, con el mismo peso visual que una etiqueta cualquiera | `tab-NPCs` |
| **B6** | **Sin migas de pan.** Dentro de una campaña, el único camino atrás es «← Mis campañas» en letra pequeña | todas |

### C. Densidad y composición

| | Hallazgo | Evidencia |
|---|---|---|
| **C1** | **Más de la mitad del alto es vacío en todas las vistas.** El panel de campañas: 2 filas y ~700 px muertos. La lista de NPCs: 2 filas y ~500 px | `desktop-dashboard`, `tab-NPCs` |
| **C2** | **Nada tiene medida máxima.** El campo «Nombre» de la campaña mide 1340 px para un texto de 20 caracteres | `desktop-campana` |
| **C3** | **Los controles flotan sin agrupar**: «Nuevo» (¿nuevo qué?), luego «Buscar» con su etiqueta encima, luego las etiquetas como botones sueltos sin estado visible | `tab-NPCs` |
| **C4** | **El panel de campañas no informa de nada**: ni cuántas entidades tiene, ni cuándo se jugó, ni quiénes son sus jugadores | `desktop-dashboard` |

### D. Identidad

| | Hallazgo |
|---|---|
| **D1** | **Crema `#F4F1EA` + verde bosque + tipografía del sistema** es, literalmente, el aspecto por defecto de una interfaz generada. No evoca ni época ni herramienta |
| **D2** | **Una sola voz tipográfica** para el cromado de la aplicación y para el texto del mundo, cuando son dos cosas distintas: una se opera, la otra se lee |
| **D3** | **Ningún elemento memorable.** Nada distingue esta pantalla de un panel de administración cualquiera |

### E. Hoja de personaje

| | Hallazgo |
|---|---|
| **E1** | **No tiene formato de 5ª edición ni se le parece.** Es un formulario plano de nombre, raza, clase, nivel y biografía. Ni características, ni modificadores, ni competencia, ni CA, ni puntos de golpe |

---

## Qué NO se toca en este reseño

- **El motor de reglas y los cálculos de la hoja son fase 2A** — decisión del autor el
  2026-09-02: *"entra pero no su funcionalidad completa, no quiero dejar tareas de la fase 2
  aca"*. Aquí entra **la forma** de la hoja (E1) con los campos que ya existen, y el diseño
  completo queda especificado en el plan de 2A.
- La visibilidad **se presenta** mejor (B5), pero `canView` no se toca: sigue siendo el dueño
  único de quién ve qué.
