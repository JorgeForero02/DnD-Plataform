# Pendientes

Deuda conocida y decisiones abiertas. Cada línea: qué, por qué importa, y la evidencia de
que existe. **Subir de nivel de verificación o pagar deuda es una tarea con su ficha, nunca
un efecto colateral de la siguiente funcionalidad.**

Última revisión: 2026-08-31.

## Cerrados

**~~P1 · ESLint no existe~~ — CERRADO el 2026-08-31.** ESLint 9 con configuración plana en la
raíz, Prettier, `pnpm verify` completo y gancho de pre-commit que bloquea. CI corre lint y
formato. Los 15 errores que encontró la primera pasada se arreglaron **corrigiendo el
código**, no silenciando reglas: diez `any` en los cuerpos de los controladores pasaron a los
tipos de `@dnd/shared`, tres `require("supertest")` a `import`, un import sin usar fuera, y
los `updateSessionSchema` / `updateCharacterSchema` que vivían duplicados en un controlador y
en un servicio se mudaron a `@dnd/shared`, que es donde la convención dice que vive la forma
de los datos. Ver [07-historial.md](./07-historial.md).

## P1 — Huecos de verificación

**Playwright no está instalado.** No hay ninguna prueba que abra un navegador, así que nada
cubre pintado, navegación, foco, contraste ni responsive.
→ Reglas y guiones iniciales ya escritos en [08-pruebas.md](./08-pruebas.md); falta la
herramienta. **Es la siguiente ficha en cerrarse.**

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
- **El modo edición del editor de entidades no precarga los `specificPlayerIds` existentes**:
  quien edita y guarda puede borrar sin querer las concesiones que había. Tarea 1.12a.

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
