# Pendientes

Deuda conocida y decisiones abiertas. Cada línea: qué, por qué importa, y la evidencia de
que existe. **Subir de nivel de verificación o pagar deuda es una tarea con su ficha, nunca
un efecto colateral de la siguiente funcionalidad.**

Última revisión: 2026-08-31.

## Cerrados

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

**Los e2e de navegador cubren tres recorridos, no el catálogo.** Faltan, en orden: el flujo de
invitación con dos sesiones, que un jugador **no vea** en pantalla una entidad `DM_ONLY`, y
las pantallas que aún no existen (editores de sesión y personaje). Lista en
[08-pruebas.md](./08-pruebas.md).

**No hay prueba de accesibilidad, responsive ni rendimiento.** Ninguna herramienta lo mira
hoy.

## P2 — Ruta de mejora del nivel

**Linting sin información de tipos.** `typescript-eslint` corre en modo básico; el modo
*type-checked* (que ve los tipos y caza promesas sin esperar, comparaciones imposibles y
`any` implícitos que hoy pasan) exige apuntar cada paquete a su `tsconfig` y cuesta tiempo de
CI. Decisión: se activa como tarea propia, no de rebote.

**Sin umbral de cobertura (N2) ni mutación (N3).** No declarados y no prometidos. Ruta de
mejora, no compromiso.

**No hay prueba de rechazo por validación** en personajes (`level > 20` devuelve 400 y nadie
lo comprueba). Detectado en la tarea 1.9.

## P3 — Correcciones funcionales conocidas

Ninguna es un agujero de lectura —nadie ve contenido ajeno—, pero todas degradan el
comportamiento:

- **Un enlace duplicado devuelve 500 en vez de 409** (choca contra el índice único de
  `EntityLink`). Tarea 1.6.
- **Crear un enlace no comprueba la visibilidad del destino** → sirve de oráculo de
  existencia para un identificador ajeno. Tarea 1.6.
- **Aceptar una invitación no es transaccional** y **el token no caduca**. Tarea 1.4.
- **`specificPlayerIds` no se valida contra los miembros de la campaña**: se puede conceder
  acceso a alguien de fuera. Queda inerte, pero se guarda. Tarea 1.5.
- **Los `grants` son inertes si la visibilidad no es `SPECIFIC_PLAYERS`**, y aun así se
  aceptan sin aviso. Tarea 1.5.
- **`Session` y `Character` no tienen `grants` ni creador propio** → `SPECIFIC_PLAYERS` es
  inerte en ellos y **el dueño de un personaje no ve el suyo si lo marca `DM_ONLY`**.
  Tareas 1.8 y 1.9.
- **Las filas de la lista de entidades son botón de editar aunque el servidor vaya a devolver
  403.** `CampaignDetailPage.tsx` no distingue si el usuario puede modificar la entidad antes
  de pintar el botón; se descubre el 403 al intentar guardar. Detectado en la revisión de
  1.12a, no arreglado (fuera del alcance de 1.12a-fix).
- **`auth.store.ts:13` deja `user: null` tras recargar la página**: el token persiste en
  `localStorage` pero el usuario no, así que la web no conoce su propio identificador hasta el
  siguiente login. Detectado en la revisión de 1.12a, no arreglado.
- **Los botones "Quitar" (`LinksPanel.tsx`) y "Borrar" (`CommentThread.tsx`) se pintan en
  todas las filas, sin mirar si el usuario es DM o autor.** El servidor sí rechaza
  (`links.service.ts:75`, `comments.service.ts:65`, ambos 403), y desde 1.12b-fix el fallo ya
  se ve como mensaje en vez de callar; pero el botón sigue ahí para quien nunca podrá usarlo.
  Es el mismo problema de fondo que la fila de la entidad de arriba: no se puede ocultar el
  botón con criterio hasta que la web conozca su propio identificador de usuario — mismo
  bloqueante que `auth.store.ts:13`. Detectado en la revisión de 1.12b, no arreglado a
  propósito (fuera del alcance de 1.12b-fix).
- **Falta `key` en `EntityTab` al cambiar de pestaña** (`CampaignDetailPage.tsx:135`): hoy es
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
