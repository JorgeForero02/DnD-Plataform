# D&D Platform — instrucciones del proyecto

Plataforma para gestionar campañas de D&D: mundo tipo wiki (entidades enlazadas entre sí),
sesiones y personajes, con **cinco niveles de visibilidad** por objeto. Herramienta propia
para la mesa del autor primero; SaaS después. **Sí tiene motor de reglas desde la fase 2A**:
derivación de hoja de 5.ª edición con traza (`apps/api/src/rules/`) y reglas
suceso–condición–efecto de vocabulario cerrado (`apps/api/src/rules-engine/`), con su pantalla
en la pestaña «Reglas». **No es** mapas, tiempo real ni 3D: eso son fases posteriores.

> Hasta el 2026-09-02 esta línea decía «no es motor de reglas», y llevaba una fase entera siendo
> falsa. [docs/00-INDEX.md](docs/00-INDEX.md) ya se había corregido y este fichero no, así que
> **los dos que se mandan leer primero se contradecían**.

## Lee esto antes de tocar código

| Archivo | Qué contiene |
|---|---|
| `docs/00-INDEX.md` | Mapa de documentos, con el commit/rama/conteo de unitarias actuales en su bloque generado. **Empieza aquí.** |
| `docs/06-pendientes.md` | Deuda conocida y decisiones abiertas. Léelo con el 00. |
| `docs/04-convenciones.md` | Nivel de verificación, convenciones de API y web, precedencia |
| `docs/08-pruebas.md` | **Qué prueba cada capa, qué no cubre, y la regla de Playwright** |
| `docs/01-arquitectura.md` | Monorepo, capas, módulos, dirección de dependencias |
| `docs/02-entorno.md` | Cómo levantar todo, variables, gotchas de Windows |
| `docs/05-datos.md` | Esquema, migraciones y semántica de la visibilidad |
| `docs/superpowers/plans/` | Plan maestro por fases |
| `.superpowers/sdd/progress.md` | Ledger de ejecución, una línea por tarea. **Está en `.gitignore`: es local a esta máquina y no viaja con el clon** |

**Al terminar un cambio relevante, actualiza la documentación en el mismo commit**: estado
en 01–05, deuda nueva en 06, una línea en 07. Documentación que miente es peor que ausente.

## Reglas que no se negocian

- **La autorización se comprueba en el servidor, siempre.** Esconder un botón no es control
  de acceso. Las mutaciones exigen DM, creador o dueño; los listados filtran por `canView`.
- **`canView` (`apps/api/src/common/visibility.ts`) es el dueño único de "quién ve qué".**
  Nadie reimplementa la matriz de visibilidad por su cuenta.
- **La validación de entrada es Zod desde `@dnd/shared`**, vía `ZodValidationPipe`. Ningún
  DTO a mano.
- **La forma de los datos vive una sola vez**, en `packages/shared/src`.
- **Nada de secretos en el código.** Todo por variable de entorno, con `.env.example` al día.
- **Ninguna tarea se marca completa sin prueba real en verde** y sin haber mirado la salida:
  API unitaria + e2e, web RTL + `pnpm verify` limpio. **Si tocas una pantalla, abres el
  navegador** (`pnpm --filter @dnd/web e2e`), y si la tarea toca una pantalla ya cubierta, su
  brief lleva el e2e dentro. Ver `docs/08-pruebas.md`.
- **Nunca** desactives una prueba, bajes un umbral, silencies una regla ni saltes el gancho de
  pre-commit para que pase el build. Si el control molesta, se arregla el código o se cambia el control como decisión
  declarada en `docs/04-convenciones.md`.
- **Evidencia antes que afirmación.** Si algo falla, se dice que falla y se pega la salida.
- **Un commit por tarea**, mensaje en inglés (Conventional Commits), ledger y memoria al día.
- **Código en inglés, interfaz y documentación en español.** Y **ningún valor de enumeración
  llega a la pantalla**: la forma legible se escribe una vez por dominio y todo lo demás la
  importa. Ese fallo apareció tres veces en una sola mañana (`(LOCATION)`, `PUBLIC`,
  `Nuevo LOCATION`).
- **La interfaz tiene sus propias reglas vinculantes** desde el reseño del 2026-09-02, en
  `docs/04-convenciones.md`: iconos dibujados y no glifos de fuente; opciones con significado
  como radios con explicación y no en un desplegable; **si el texto explica una regla del
  servidor y discrepan, miente el texto**; un valor guardado que un selector no ofrece se
  muestra marcado y no seleccionable; y **lo que solo se ve maquetado se mide en el navegador**,
  porque `jsdom` no maqueta y por eso un borde partido sobrevivió a la suite entera en verde.
- **Está en producción desde el 2026-09-02**: `dnd.supportive.pro`, en `vps1new` tras
  Coolify + Traefik, desde `docker-compose.prod.yml`. Ver `docs/03-despliegue.md`, y en
  particular por qué `TRUST_PROXY` vale **2** (Traefik y nginx son **dos** proxies).
  **Lo que de verdad protege el límite de intentos es que Traefik descarte el
  `X-Forwarded-For` del cliente, no el número 2**: si cambia la topología, hay que recontar.

## Comandos

**Conteos de pruebas unitarias: los genera `scripts/update-estado.mjs` en el bloque de
estado de [docs/00-INDEX.md](docs/00-INDEX.md)**, comprobado por `pnpm verify`; no se
escriben a mano. **Conteos de e2e: solo en [docs/08-pruebas.md](docs/08-pruebas.md)**, que
enlaza al bloque de arriba en vez de repetir las unitarias. Ninguno de los dos se copia en
más sitios — es su fuente única declarada.

```bash
docker compose up -d                     # Postgres 16 en :5432 (los e2e lo necesitan)
pnpm verify                              # build + lint + formato + check:docs + check:estado + unitarias (lo exige el pre-commit)
pnpm --filter @dnd/api test:e2e          # e2e de API contra Postgres real
pnpm --filter @dnd/web e2e               # Playwright, Chromium
pnpm dev:api                             # API en :3000
pnpm dev:web                             # web en :5173
pnpm format                              # aplica Prettier
```
