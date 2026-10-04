---
paths:
  - "apps/api/**/*.ts"
  - "apps/api/prisma/**"
---
# Backend NestJS + Fastify + Prisma (`apps/api`)

Versiones del repo (2026-10-03): NestJS 11 (`@nestjs/platform-fastify` 11.2.x, con `fastify` 5.12 forzado
por un `override`, ficha AD-2), Prisma 5, Jest 29 + Supertest, Zod 3. La regla de la plantilla describe
Nest 12 y Prisma 7: **no aplica hasta actualizar**. *(comunidad)* = práctica extendida; *(decisión del
repo)* = manda aquí. Si algo choca con `docs/04-convenciones.md`, manda el `04`.

- Módulos por dominio en `src/<dominio>/` (`docs/01-arquitectura.md`, «Módulos de la API»), controladores
  delgados y **un dueño por concepto** (`MembershipService`, `canView`). *(decisión del repo)*
- **Sobre Fastify, nada de paquetes ni middleware de Express**: los equivalentes `@fastify/*`. [1]
- **Validación con Zod desde `@dnd/shared` y `ZodValidationPipe`**, no `ValidationPipe` con
  `class-validator` (excepción declarada en el `04`). [2] *(decisión del repo)*
- Autenticación con guard (`JwtAuthGuard`); **autorización por objeto en el servicio, después de cargar el
  registro**, con su e2e «A contra recurso de B». [3] [4]
- Cabeceras con `@fastify/helmet` registrado en `configureApp`; **sin CORS por diseño** (mismo origen por
  nginx), `CORS_ORIGIN` solo como escape en desarrollo. [5] [6]
- Errores con excepciones de Nest; nunca el stack al cliente. [7] [8]
- Prisma: el esquema cambia **solo por migración** (`prisma migrate dev` en local, `migrate deploy` en el
  `CMD` de la imagen); `db push` nunca contra una base con datos. [9] Escrituras múltiples en una
  transacción (`PrismaService.transaction`, `01`). [10] SQL crudo **solo** con `$queryRaw` de plantilla
  etiquetada; `$queryRawUnsafe`/`$executeRawUnsafe`, prohibidos. [11]
- Límite de intentos con `@nestjs/throttler` (`UserOrIpThrottlerGuard`); detrás de proxy, `trustProxy` por
  **saltos, como función** ([ADR 0001](../../docs/adr/0001-trust-proxy-por-saltos.md)) — nunca `true`. [12] [13]
- Pruebas: Jest y Supertest; los e2e contra el Postgres real (`pnpm --filter @dnd/api test:e2e`). [14]
- **La regla de dependencias del `01`** (controlador ↛ Prisma salvo `health`; motor ↛ `catalog/`) se
  comprueba en `verify` con `no-restricted-imports` de ESLint. [15]

Fuentes ([1], [3]–[10], [12], [14] consultadas el 2026-10-01 para la plantilla `a78a535`; [2], [11], [13], [15] el 2026-10-03):
[1] https://docs.nestjs.com/techniques/performance
[2] https://docs.nestjs.com/pipes#schema-based-validation
[3] https://docs.nestjs.com/security/authentication
[4] https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
[5] https://docs.nestjs.com/security/helmet
[6] https://docs.nestjs.com/security/cors
[7] https://docs.nestjs.com/exception-filters
[8] https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html
[9] https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production
[10] https://www.prisma.io/docs/orm/fundamentals/transactions
[11] https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/raw-queries
[12] https://docs.nestjs.com/security/rate-limiting
[13] https://fastify.dev/docs/latest/Reference/Server/#trustproxy
[14] https://docs.nestjs.com/fundamentals/testing
[15] https://eslint.org/docs/latest/rules/no-restricted-imports
