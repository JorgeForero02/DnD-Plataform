# Historial — El cero de tipos comodín, y el proceso pasa a medirse (2026-09-06)

**Dos entradas de `07-historial.md` movidas enteras el 2026-09-12**, al cerrar la ronda de
retoques de la revisión de la hoja a página completa: el fichero llegó a 1002 de sus 1000 líneas
y estas eran las dos entradas completas más antiguas. No se reescriben.

---

## El cero de tipos comodín deja de depender de la costumbre (2026-09-06)

**Qué:** `no-explicit-any` pasa de **aviso heredado** a **error** en `apps/api/src`,
`apps/web/src` y `packages/shared/src`. Las pruebas siguen exentas, con el motivo que ya estaba
escrito.

**Por qué:** la medición del día contradijo a la sospecha. Se auditó el repositorio esperando
encontrar la regla apagada y deuda escondida, y lo que hay es **cero** comodines en código de
aplicación: la excepción de `eslint.config.mjs` estaba acotada a las pruebas desde el principio.
Lo que no había era nada que **sostuviera** ese cero — un aviso no frena un commit, y
`pnpm verify` pasa con avisos. Poner en error una regla que hoy da cero cuesta cero y convierte
una costumbre en una propiedad comprobada.

**Verificado por mutación:** se añadió `(x: any) => x` en un fichero de la web, `eslint` lo
rechazó **como error** —no como aviso— y se restauró.

**Cómo revertir:** quitar el bloque de reglas nuevo de `eslint.config.mjs`. No toca ni una línea
de código de aplicación.


## El proceso pasa a medirse, y la frontera del encargo deja de ser solo de ficheros (2026-09-06)

**Qué:** cuatro cosas, todas documentación y ninguna toca comportamiento.

1. **Los cuatro pasos antes de abrir una ficha son regla del repositorio**, en
   [04-convenciones.md](./04-convenciones.md), con **la frontera** de cuatro casos en los que el
   paso 1 no aplica. Hasta hoy vivían solo en los prompts de arranque, fuera del repositorio.
2. **La frontera del encargo pasa a ser también de herramientas**: bloque de prohibiciones
   obligatorio, superficie mínima por rol, y la comprobación de que lo prohibido no ocurrió.
3. **Tabla de observabilidad de la tanda** en el ledger: vueltas por tarea, qué encontró la
   revisión, tiempo perdido y en qué.
4. **[10-banco-de-tareas.md](./10-banco-de-tareas.md)** y **[prompts.md](./prompts.md)**: tres
   tareas fijas que miden si un cambio del proceso mejora o empeora, y los prompts que hasta hoy
   vivían en la carpeta de al lado.

**Por qué:** este repositorio tiene la puerta más completa de los tres del PC —siete pasos en
`verify`, conteos generados, seis reglas de lint de documentación—, pero **el proceso que escribe
ese código se seguía ajustando por intuición**: cada regla nacía de un golpe real y ninguna se
contrastó nunca contra una tarea repetible. Y la frontera del encargo declaraba rutas pero no
herramientas, así que un implementador acotado a `apps/api` seguía pudiendo desplegar, empujar o
lanzar una segunda tanda de Playwright encima de la primera — que es justo lo que ya costó 82
fallos falsos.

**Las tres tareas del banco salen de fallos ya pagados aquí:** la prosa de estado caducada del
fichero que se lee primero, la prueba que hay que ver fallar antes de tocar `normalizar`, y
`jsdom` dando 871 pruebas verdes con la mesa rota.

**Cómo revertir:** quitar las tres secciones nuevas de `04-convenciones.md`, borrar
`docs/10-banco-de-tareas.md` y `docs/prompts.md`, y sus filas en `00-INDEX.md` y `CLAUDE.md`.
