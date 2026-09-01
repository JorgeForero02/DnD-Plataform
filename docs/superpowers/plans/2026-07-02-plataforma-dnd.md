# Plataforma D&D — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web platform where a D&D group manages campaigns, worldbuilding, sessions, characters and a rules engine in one place — starting as a personal tool, evolving toward SaaS.

**Architecture:** Modular monolith. NestJS (Fastify adapter) REST API + Prisma/PostgreSQL backend; React (Vite) SPA frontend; shared TypeScript types package. Domain-driven modules (auth, users, campaigns, worldbuilding, sessions, characters, rules). Domain events from Phase 1 via `@nestjs/event-emitter` (in-process, no infra) to decouple audit/notifications/side-effects; upgraded to a real broker only if/when multi-instance. Real-time (WebSockets), 3D and AI are deferred to later phases and are explicitly out of the early scope.

**Tech Stack:**
- Backend: Node 20 LTS, TypeScript, NestJS 10 (+ `@nestjs/platform-fastify`), Prisma 5, PostgreSQL 16, `nestjs-zod` + Zod, `argon2` (password hashing), `@nestjs/jwt`, `@nestjs/event-emitter` (domain events), `@sentry/node` (error observability)
- Frontend: React 18, Vite 5, TypeScript, React Router 6, TanStack Query 5, Zustand, Tailwind CSS 3, React Hook Form + Zod resolver
- Shared: `packages/shared` (Zod schemas + inferred types shared by API and web)
- Tooling: pnpm workspaces, ESLint + Prettier, Jest + Supertest (API), Vitest + React Testing Library (web)
- Infra: Docker Compose (Postgres only, local dev), **Coolify on a self-hosted VPS** (deploy: builds Dockerfiles, managed Postgres resource, Traefik reverse proxy + Let's Encrypt SSL, auto-deploy on git push), GitHub Actions (CI: lint + tests)

## Global Constraints

- **Solo developer, spare time.** Every phase must end in deployable, usable software. No "broken for months" states.
- **Node version:** `"engines": { "node": ">=20" }` in every `package.json` (dev machines may run Node 24). **Production is pinned to Node 20**: CI uses `node-version: 20` and Dockerfiles use `node:20-slim` — do not change those to 24. dev=24 / prod=20 is intentional.
- **Language:** TypeScript everywhere, `strict: true` in every `tsconfig.json`. No `any` without an inline `// eslint-disable` justification.
- **One frontend.** React only. No HBS/SSR path — decided.
- **Rules/legal:** Only SRD 5.1 / OGL content. Never copy proprietary D&D book text or stat blocks outside the SRD.
- **Stack minimalism:** Do NOT add Redis, BullMQ, workers, WebSockets, S3, or a separate AI service until a phase explicitly requires it. Start with Postgres + NestJS + React only.
- **Permissions are first-class.** All 5 visibility levels from the source doc are modeled from Phase 1, not bolted on later: `PUBLIC` (any campaign member), `PLAYERS` (all players + DM), `SPECIFIC_PLAYERS` (per-user allow-list + DM), `OWNER_DM` (creator + DM), `DM_ONLY` (DM only). Plus a system `ADMIN` role that can view everything for support/moderation.
- **Domain events from Phase 1.** Use `@nestjs/event-emitter` (in-process, zero infra) for audit/decoupling from the start (e.g. `entity.created`, `campaign.member_joined`). No message broker until multi-instance forces it.
- **Observability from Phase 0.** Sentry wired in the API for error tracking. OpenTelemetry/Grafana deferred until scale demands it.
- **TDD, DRY, YAGNI, frequent commits.** Every code change is preceded by a failing test.
- **Commit convention:** Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`, `docs:`).
- **pnpm 10 build scripts:** root `package.json` must include `"pnpm": { "onlyBuiltDependencies": ["esbuild", "@prisma/client", "prisma", "argon2", "@sentry/node"] }` — pnpm 10 blocks postinstall builds by default, which otherwise breaks Prisma/argon2/esbuild. Also add a `.gitattributes` with `* text=auto eol=lf` (cross-platform line endings).
- **Windows + `&` in the repo path:** the folder is `D&D-Plataform`. `nest start --watch` breaks because the Nest CLI spawns a child with the unquoted path (`Cannot find module '…\D'`). Workaround baked into the API `start:dev` script: `concurrently` running `nest build --watch` + `node --watch dist/src/main.js` (Node's built-in watcher, cwd-safe). Do not revert `start:dev` to `nest start --watch`. Production uses `start:prod` (`node dist/src/main.js`).

---

## Phase Roadmap

| Phase | Scope | Exit criteria (must all be true to proceed) |
|---|---|---|
| **0 — Foundation** | Monorepo, tooling, Postgres via Docker, NestJS API skeleton + event-emitter + Sentry, React shell, auth (register/login/JWT), first Coolify deploy on VPS, CI green | Can register + log in against deployed VPS URL (HTTPS); CI passes; `pnpm test` green |
| **1 — Campaign core** | Campaigns CRUD, membership + roles, invite links, worldbuilding entities (all doc types: NPC/Location/Quest/Faction/Object/Event/Document) with tags, **inter-entity links (wiki)**, comments, session notes, basic characters, **5-level visibility incl. per-player**, domain events | Used in one real session at your table; DM + player see correct content per all permission levels; entities link to each other |
| **2 — Characters + minimal rules engine** | Full CharacterSheet on top of Phase 1 basic character, SRD 5.1 data, deterministic rules engine (base stats, proficiency, AC, HP, save DC), manual modifiers | A real character sheet auto-computes core derived stats; rules engine has full test coverage |
| **3 — Maps 2D** | Upload map, markers linked to entities, simple fog, DM/player layer views | Used during a real session for at least one map |
| **4 — Real-time + social** | WebSockets (presence, live sheet/session updates), comments, activity feed, notifications | Two clients see live updates; group uses comments |
| **5 — Visual + AI (premium)** | Avatar/miniature creator (Three.js), later image→3D via decoupled AI service | Only begun after phases 1–2 show recurring real use |

**Phases 0 and 1 are fully specified below as bite-sized TDD tasks. Phases 2–5 have scope + exit criteria here and MUST each get their own detailed plan (re-run the writing-plans skill) when reached** — detailing them now would be speculative, since their design depends on real usage feedback from earlier phases.

> **Note on the source doc's "MVP estricto":** it lists a "Mapa 2D simple con pines" inside the MVP, but the same doc's phase table (`Fase 3`) places maps after the rules engine. This plan follows the **phase table** (maps = Phase 3), the more consistent reading, because a 2D map with fog needs object storage (S3) that we deliberately defer. Basic characters, however, are pulled into Phase 1 to match the doc's `Fase 1` line ("...personajes básicos"); their live sheet + rules engine stay in Phase 2.

---

# PHASE 0 — Foundation

## File Structure (Phase 0)

```
D&D-Plataform/
  package.json                 # pnpm workspace root
  pnpm-workspace.yaml
  tsconfig.base.json
  .gitignore
  .env.example
  docker-compose.yml           # postgres only
  .github/workflows/ci.yml
  packages/
    shared/
      package.json
      tsconfig.json
      src/
        index.ts
        auth.schema.ts         # Zod: registerSchema, loginSchema, authResponse
  apps/
    api/
      package.json
      tsconfig.json
      nest-cli.json
      prisma/schema.prisma
      src/
        main.ts
        app.module.ts
        prisma/prisma.service.ts
        prisma/prisma.module.ts
        auth/auth.module.ts
        auth/auth.service.ts
        auth/auth.controller.ts
        auth/jwt.strategy.ts
        auth/jwt-auth.guard.ts
        users/users.module.ts
        users/users.service.ts
      test/
        auth.e2e-spec.ts
    web/
      package.json
      tsconfig.json
      vite.config.ts
      index.html
      src/
        main.tsx
        App.tsx
        lib/api.ts
        lib/queryClient.ts
        store/auth.store.ts
        pages/LoginPage.tsx
        pages/RegisterPage.tsx
        pages/DashboardPage.tsx
        components/ProtectedRoute.tsx
      src/__tests__/
        auth.store.test.ts
```

---

### Task 0.1: Workspace scaffold + tooling

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore`, `.env.example`, `docker-compose.yml`

**Interfaces:**
- Produces: pnpm workspace with `apps/*` and `packages/*` globs; `tsconfig.base.json` with `strict: true` extended by all sub-projects; Postgres reachable at `postgresql://dnd:dnd@localhost:5432/dnd`.

- [ ] **Step 1: Init git repo**

Run:
```bash
cd "C:/Users/gogam/Desktop/Trabajo/Mine/D&D-Plataform"
git init
```
Expected: `Initialized empty Git repository`.

- [ ] **Step 2: Create workspace root files**

`pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

`package.json`:
```json
{
  "name": "dnd-platform",
  "private": true,
  "packageManager": "pnpm@10.32.1",
  "engines": { "node": ">=20" },
  "scripts": {
    "dev:api": "pnpm --filter @dnd/api start:dev",
    "dev:web": "pnpm --filter @dnd/web dev",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "build": "pnpm -r build",
    "prepare": "pnpm --filter @dnd/shared build"
  },
  "devDependencies": {
    "prettier": "^3.3.0",
    "typescript": "^5.5.0"
  }
}
```

`tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "sourceMap": true
  }
}
```

`.gitignore`:
```
node_modules/
dist/
.env
*.log
coverage/
```

`.env.example`:
```
DATABASE_URL=postgresql://dnd:dnd@localhost:5432/dnd
JWT_SECRET=change-me-in-production
JWT_EXPIRES_IN=7d
PORT=3000
SENTRY_DSN=
```

- [ ] **Step 3: Create docker-compose.yml (Postgres only)**

```yaml
services:
  db:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_USER: dnd
      POSTGRES_PASSWORD: dnd
      POSTGRES_DB: dnd
    ports:
      - "5432:5432"
    volumes:
      - dnd_pgdata:/var/lib/postgresql/data
volumes:
  dnd_pgdata:
```

- [ ] **Step 4: Start Postgres and verify**

Run:
```bash
docker compose up -d
docker compose ps
```
Expected: `db` service `running`, port `5432` mapped.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "chore: init pnpm workspace, tsconfig base, docker postgres"
```

---

### Task 0.2: Shared package with auth Zod schemas

**Files:**
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/src/index.ts`, `packages/shared/src/auth.schema.ts`

**Interfaces:**
- Produces: `@dnd/shared` exporting `registerSchema`, `loginSchema` (Zod objects) and types `RegisterInput`, `LoginInput`, `AuthResponse`. Consumed by both API and web.

- [ ] **Step 1: Create package files**

`packages/shared/package.json`:
```json
{
  "name": "@dnd/shared",
  "version": "0.0.1",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "test": "vitest run",
    "lint": "eslint src --ext .ts",
    "build": "tsc -p tsconfig.json"
  },
  "dependencies": { "zod": "^3.23.0" },
  "devDependencies": { "vitest": "^2.0.0" }
}
```

> **Critical (runtime resolution):** `main`/`types` point to `dist`, not `src`. If they point to `src/index.ts`, dev/tests still work (ts-jest/vite compile TS) but the **production** `node dist/src/main.js` crashes: the compiled API does `require("@dnd/shared")`, Node resolves it to a `.ts` file, and Node cannot parse TypeScript. Building `@dnd/shared` to JS + the root `prepare` script (which runs on every `pnpm install`, including CI and Docker) guarantees `dist` exists before anything imports it.

`packages/shared/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src"],
  "exclude": ["**/*.test.ts"]
}
```

- [ ] **Step 2: Write the failing test**

`packages/shared/src/auth.schema.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema } from "./auth.schema";

describe("registerSchema", () => {
  it("accepts valid input", () => {
    const r = registerSchema.safeParse({
      email: "a@b.com", password: "password123", displayName: "Gandalf"
    });
    expect(r.success).toBe(true);
  });
  it("rejects short password", () => {
    const r = registerSchema.safeParse({
      email: "a@b.com", password: "short", displayName: "Gandalf"
    });
    expect(r.success).toBe(false);
  });
  it("rejects bad email", () => {
    const r = loginSchema.safeParse({ email: "nope", password: "password123" });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @dnd/shared test`
Expected: FAIL — cannot resolve `./auth.schema`.

- [ ] **Step 4: Implement schemas**

`packages/shared/src/auth.schema.ts`:
```ts
import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  displayName: z.string().min(1).max(50),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export interface AuthResponse {
  token: string;
  user: { id: string; email: string; displayName: string };
}
```

`packages/shared/src/index.ts`:
```ts
export * from "./auth.schema";
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @dnd/shared test`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/shared
git commit -m "feat(shared): auth zod schemas and types"
```

---

### Task 0.3: NestJS API skeleton + Prisma + User model

**Files:**
- Create: `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/nest-cli.json`, `apps/api/prisma/schema.prisma`, `apps/api/src/main.ts`, `apps/api/src/app.module.ts`, `apps/api/src/prisma/prisma.service.ts`, `apps/api/src/prisma/prisma.module.ts`

**Interfaces:**
- Consumes: Postgres from Task 0.1, `@dnd/shared` from Task 0.2.
- Produces: bootable Nest app on `PORT`; `PrismaService` (injectable, extends `PrismaClient`); `User` table with `id`, `email` (unique), `passwordHash`, `displayName`, `createdAt`.

- [ ] **Step 1: Create API package + config**

`apps/api/package.json`:
```json
{
  "name": "@dnd/api",
  "version": "0.0.1",
  "engines": { "node": ">=20" },
  "scripts": {
    "start:dev": "concurrently -k -n build,run \"nest build --watch\" \"node --watch dist/src/main.js\"",
    "start:prod": "node dist/src/main.js",
    "build": "nest build",
    "test": "jest",
    "test:e2e": "jest --config test/jest-e2e.json",
    "lint": "eslint src --ext .ts",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev"
  },
  "dependencies": {
    "@dnd/shared": "workspace:*",
    "@nestjs/common": "^10.3.0",
    "@nestjs/core": "^10.3.0",
    "@nestjs/config": "^3.2.0",
    "@nestjs/event-emitter": "^2.0.0",
    "@nestjs/jwt": "^10.2.0",
    "@nestjs/platform-fastify": "^10.3.0",
    "@prisma/client": "^5.18.0",
    "@sentry/node": "^8.0.0",
    "argon2": "^0.40.0",
    "nestjs-zod": "^3.0.0",
    "passport-jwt": "^4.0.1",
    "@nestjs/passport": "^10.0.0",
    "passport": "^0.7.0",
    "reflect-metadata": "^0.2.0",
    "rxjs": "^7.8.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.4.0",
    "@nestjs/testing": "^10.3.0",
    "concurrently": "^9.0.0",
    "@types/jest": "^29.5.0",
    "@types/node": "^20.14.0",
    "@types/passport-jwt": "^4.0.0",
    "jest": "^29.7.0",
    "prisma": "^5.18.0",
    "supertest": "^7.0.0",
    "ts-jest": "^29.2.0",
    "ts-node": "^10.9.0"
  }
}
```

`apps/api/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": ".",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "baseUrl": "."
  },
  "include": ["src", "test"]
}
```

`apps/api/nest-cli.json`:
```json
{ "collection": "@nestjs/schematics", "sourceRoot": "src" }
```

- [ ] **Step 2: Prisma schema with User**

`apps/api/prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  displayName  String
  createdAt    DateTime @default(now())
}
```

- [ ] **Step 3: Install deps and run first migration**

Run:
```bash
pnpm install
cd apps/api
cp ../../.env.example .env
pnpm prisma:migrate --name init
```
Expected: migration `init` applied; `prisma/migrations/*/migration.sql` created; client generated.

- [ ] **Step 4: PrismaService + module**

`apps/api/src/prisma/prisma.service.ts`:
```ts
import { Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

`apps/api/src/prisma/prisma.module.ts`:
```ts
import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

@Global()
@Module({ providers: [PrismaService], exports: [PrismaService] })
export class PrismaModule {}
```

- [ ] **Step 5: App module + bootstrap (Fastify)**

`apps/api/src/app.module.ts`:
```ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    PrismaModule,
  ],
})
export class AppModule {}
```

`apps/api/src/main.ts`:
```ts
import * as Sentry from "@sentry/node";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { AppModule } from "./app.module";

// No-op if SENTRY_DSN is unset (local/dev) — safe to always call.
Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 });

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  app.enableCors();
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, "0.0.0.0");
}
bootstrap();
```

> Add `SENTRY_DSN=` (empty locally) to `.env.example`. In Railway set the real DSN from a Sentry project.

- [ ] **Step 6: Verify it boots**

Run: `pnpm start:dev` (in `apps/api`)
Expected: log `Nest application successfully started`, no errors. Stop with Ctrl-C.

- [ ] **Step 7: Commit**

```bash
git add apps/api pnpm-lock.yaml
git commit -m "feat(api): nest+fastify skeleton, prisma, user model"
```

---

### Task 0.4: Users service (create + find)

**Files:**
- Create: `apps/api/jest.config.js` (unit-test config — no jest config existed before this task), `apps/api/src/users/users.module.ts`, `apps/api/src/users/users.service.ts`, `apps/api/src/users/users.service.spec.ts`

**Interfaces:**
- Consumes: `PrismaService`.
- Produces: `UsersService` with `create(email: string, passwordHash: string, displayName: string): Promise<User>` and `findByEmail(email: string): Promise<User | null>`.

`apps/api/jest.config.js` (needed so `pnpm --filter @dnd/api test` discovers `*.spec.ts` under `src`):
```js
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: "src",
  testRegex: ".*\\.spec\\.ts$",
  transform: { "^.+\\.(t|j)s$": "ts-jest" },
  testEnvironment: "node",
};
```

- [ ] **Step 1: Write the failing test**

`apps/api/src/users/users.service.spec.ts`:
```ts
import { Test } from "@nestjs/testing";
import { UsersService } from "./users.service";
import { PrismaService } from "../prisma/prisma.service";

describe("UsersService", () => {
  let service: UsersService;
  const prismaMock = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = moduleRef.get(UsersService);
    jest.clearAllMocks();
  });

  it("create() delegates to prisma with correct data", async () => {
    prismaMock.user.create.mockResolvedValue({ id: "1" });
    await service.create("a@b.com", "hash", "Gandalf");
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: { email: "a@b.com", passwordHash: "hash", displayName: "Gandalf" },
    });
  });

  it("findByEmail() queries by unique email", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const r = await service.findByEmail("a@b.com");
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { email: "a@b.com" },
    });
    expect(r).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @dnd/api test users.service`
Expected: FAIL — cannot find `./users.service`.

- [ ] **Step 3: Implement service + module**

`apps/api/src/users/users.service.ts`:
```ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { User } from "@prisma/client";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  create(email: string, passwordHash: string, displayName: string): Promise<User> {
    return this.prisma.user.create({
      data: { email, passwordHash, displayName },
    });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }
}
```

`apps/api/src/users/users.module.ts`:
```ts
import { Module } from "@nestjs/common";
import { UsersService } from "./users.service";

@Module({ providers: [UsersService], exports: [UsersService] })
export class UsersModule {}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @dnd/api test users.service`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/users
git commit -m "feat(api): users service create/findByEmail"
```

---

### Task 0.5: Auth service (register + login) with argon2 + JWT

**Files:**
- Create: `apps/api/src/auth/auth.service.ts`, `apps/api/src/auth/auth.service.spec.ts`

**Interfaces:**
- Consumes: `UsersService`, `JwtService` (`@nestjs/jwt`), `argon2`.
- Produces: `AuthService` with `register(input: RegisterInput): Promise<AuthResponse>` (throws `ConflictException` on duplicate email) and `login(input: LoginInput): Promise<AuthResponse>` (throws `UnauthorizedException` on bad credentials). `AuthResponse` shape from `@dnd/shared`.

- [ ] **Step 1: Write the failing test**

`apps/api/src/auth/auth.service.spec.ts`:
```ts
import { Test } from "@nestjs/testing";
import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { AuthService } from "./auth.service";
import { UsersService } from "../users/users.service";

describe("AuthService", () => {
  let service: AuthService;
  const users = { findByEmail: jest.fn(), create: jest.fn() };
  const jwt = { signAsync: jest.fn().mockResolvedValue("token123") };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: users },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
    jest.clearAllMocks();
  });

  it("register() rejects duplicate email", async () => {
    users.findByEmail.mockResolvedValue({ id: "1" });
    await expect(
      service.register({ email: "a@b.com", password: "password123", displayName: "G" }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("register() creates user and returns token", async () => {
    users.findByEmail.mockResolvedValue(null);
    users.create.mockResolvedValue({ id: "1", email: "a@b.com", displayName: "G" });
    const r = await service.register({ email: "a@b.com", password: "password123", displayName: "G" });
    expect(users.create).toHaveBeenCalled();
    expect(r.token).toBe("token123");
    expect(r.user).toEqual({ id: "1", email: "a@b.com", displayName: "G" });
  });

  it("login() rejects wrong password", async () => {
    const hash = await argon2.hash("password123");
    users.findByEmail.mockResolvedValue({ id: "1", email: "a@b.com", displayName: "G", passwordHash: hash });
    await expect(
      service.login({ email: "a@b.com", password: "wrongpass" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("login() succeeds with right password", async () => {
    const hash = await argon2.hash("password123");
    users.findByEmail.mockResolvedValue({ id: "1", email: "a@b.com", displayName: "G", passwordHash: hash });
    const r = await service.login({ email: "a@b.com", password: "password123" });
    expect(r.token).toBe("token123");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @dnd/api test auth.service`
Expected: FAIL — cannot find `./auth.service`.

- [ ] **Step 3: Implement auth service**

`apps/api/src/auth/auth.service.ts`:
```ts
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { RegisterInput, LoginInput, AuthResponse } from "@dnd/shared";
import { UsersService } from "../users/users.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async register(input: RegisterInput): Promise<AuthResponse> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) throw new ConflictException("Email already registered");
    const passwordHash = await argon2.hash(input.password);
    const user = await this.users.create(
      input.email,
      passwordHash,
      input.displayName,
    );
    return this.buildResponse(user);
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await this.users.findByEmail(input.email);
    if (!user) throw new UnauthorizedException("Invalid credentials");
    const ok = await argon2.verify(user.passwordHash, input.password);
    if (!ok) throw new UnauthorizedException("Invalid credentials");
    return this.buildResponse(user);
  }

  private async buildResponse(user: {
    id: string;
    email: string;
    displayName: string;
  }): Promise<AuthResponse> {
    const token = await this.jwt.signAsync({ sub: user.id, email: user.email });
    return {
      token,
      user: { id: user.id, email: user.email, displayName: user.displayName },
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @dnd/api test auth.service`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/auth/auth.service.ts apps/api/src/auth/auth.service.spec.ts
git commit -m "feat(api): auth service register/login with argon2+jwt"
```

---

### Task 0.6: Auth controller + JWT strategy + guard + wiring

**Files:**
- Create: `apps/api/src/auth/auth.controller.ts`, `apps/api/src/auth/jwt.strategy.ts`, `apps/api/src/auth/jwt-auth.guard.ts`, `apps/api/src/auth/auth.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Test: `apps/api/test/auth.e2e-spec.ts`, `apps/api/test/jest-e2e.json`

**Interfaces:**
- Consumes: `AuthService`, `registerSchema`/`loginSchema` from `@dnd/shared`.
- Produces: HTTP `POST /auth/register`, `POST /auth/login` (both return `AuthResponse`), and `GET /auth/me` (protected by `JwtAuthGuard`, returns `{ id, email }` from token). `JwtAuthGuard` reusable in later phases.

- [ ] **Step 1: Write the failing e2e test**

`apps/api/test/jest-e2e.json`:
```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" }
}
```

`apps/api/test/auth.e2e-spec.ts`:
```ts
import { Test } from "@nestjs/testing";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

describe("Auth (e2e)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const email = `test${Date.now()}@b.com`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it("registers, logs in, and reads /auth/me", async () => {
    const server = app.getHttpServer();
    const reg = await require("supertest")(server)
      .post("/auth/register")
      .send({ email, password: "password123", displayName: "Gandalf" });
    expect(reg.status).toBe(201);
    expect(reg.body.token).toBeDefined();

    const login = await require("supertest")(server)
      .post("/auth/login")
      .send({ email, password: "password123" });
    expect(login.status).toBe(201);

    const me = await require("supertest")(server)
      .get("/auth/me")
      .set("Authorization", `Bearer ${login.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe(email);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @dnd/api test:e2e`
Expected: FAIL — routes not found (404) / module not wired.

- [ ] **Step 3: JWT strategy + guard**

`apps/api/src/auth/jwt.strategy.ts`:
```ts
import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

export interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? "change-me-in-production",
    });
  }

  async validate(payload: JwtPayload) {
    return { id: payload.sub, email: payload.email };
  }
}
```

`apps/api/src/auth/jwt-auth.guard.ts`:
```ts
import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}
```

- [ ] **Step 4: Controller**

`apps/api/src/auth/auth.controller.ts`:
> **Note (execution deviation):** instead of `nestjs-zod`'s `ZodValidationPipe` (its raw-schema API varies by version), the build uses a tiny custom pipe `apps/api/src/common/zod-validation.pipe.ts` that `safeParse`s the Zod schema and throws `BadRequestException` on failure. Same behavior, no version risk. Create it:
> ```ts
> import { BadRequestException, PipeTransform } from "@nestjs/common";
> import { ZodSchema } from "zod";
> export class ZodValidationPipe implements PipeTransform {
>   constructor(private readonly schema: ZodSchema) {}
>   transform(value: unknown) {
>     const result = this.schema.safeParse(value);
>     if (!result.success) throw new BadRequestException(result.error.flatten());
>     return result.data;
>   }
> }
> ```

```ts
import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { registerSchema, loginSchema } from "@dnd/shared";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  register(@Body(new ZodValidationPipe(registerSchema)) body: any) {
    return this.auth.register(body);
  }

  @Post("login")
  login(@Body(new ZodValidationPipe(loginSchema)) body: any) {
    return this.auth.login(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  me(@Req() req: { user: { id: string; email: string } }) {
    return req.user;
  }
}
```

- [ ] **Step 5: Auth module + wire into app**

`apps/api/src/auth/auth.module.ts`:
```ts
import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { UsersModule } from "../users/users.module";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./jwt.strategy";

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? "change-me-in-production",
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN ?? "7d" },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
```

Modify `apps/api/src/app.module.ts` — add `AuthModule` and `UsersModule` to imports:
```ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    UsersModule,
    AuthModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 6: Run e2e to verify it passes**

Run:
```bash
docker compose up -d
pnpm --filter @dnd/api test:e2e
```
Expected: PASS (1 test) — register 201, login 201, `/auth/me` 200.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/auth apps/api/src/app.module.ts apps/api/test
git commit -m "feat(api): auth controller, jwt strategy+guard, e2e"
```

---

### Task 0.7: React shell — Vite + router + Tailwind + query client

**Files:**
- Create: `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/vite.config.ts`, `apps/web/index.html`, `apps/web/tailwind.config.js`, `apps/web/postcss.config.js`, `apps/web/src/main.tsx`, `apps/web/src/index.css`, `apps/web/src/App.tsx`, `apps/web/src/lib/queryClient.ts`

**Interfaces:**
- Produces: bootable Vite app at `http://localhost:5173` with React Router routes `/login`, `/register`, `/` and a `QueryClientProvider`. Consumed by later web tasks.

- [ ] **Step 1: Package + config files**

`apps/web/package.json`:
```json
{
  "name": "@dnd/web",
  "version": "0.0.1",
  "engines": { "node": ">=20" },
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "lint": "eslint src --ext .ts,.tsx"
  },
  "dependencies": {
    "@dnd/shared": "workspace:*",
    "@tanstack/react-query": "^5.51.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-hook-form": "^7.52.0",
    "@hookform/resolvers": "^3.9.0",
    "react-router-dom": "^6.26.0",
    "zustand": "^4.5.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.4.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.0",
    "jsdom": "^24.1.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.5.0",
    "vite": "^5.4.0",
    "vitest": "^2.0.0"
  }
}
```

`apps/web/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client", "vitest/globals", "@testing-library/jest-dom"],
    "noEmit": true
  },
  "include": ["src"]
}
```

`apps/web/vite.config.ts`:
```ts
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Alias @dnd/shared to its TS source: rollup cannot resolve named exports
    // from the compiled CJS dist (`export *` → `__exportStar`), which breaks
    // `vite build`. Vite compiles the TS source directly — works in dev, test,
    // and prod (source is present in the Docker build context).
    alias: {
      "@dnd/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
    },
  },
  server: { port: 5173, proxy: { "/api": "http://localhost:3000" } },
  test: { environment: "jsdom", globals: true, setupFiles: "./src/setupTests.ts" },
});
```
> Note: Task 0.8 later refines the `/api` proxy to add a rewrite (`{ target, rewrite: p => p.replace(/^\/api/, "") }`). Keep the `resolve.alias` block through that edit.

`apps/web/index.html`:
```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Plataforma D&D</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`apps/web/tailwind.config.js`:
```js
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};
```

`apps/web/postcss.config.js`:
```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

`apps/web/src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`apps/web/src/setupTests.ts`:
```ts
import "@testing-library/jest-dom";
```

- [ ] **Step 2: Query client + entry + app**

`apps/web/src/lib/queryClient.ts`:
```ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
});
```

`apps/web/src/App.tsx`:
```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ProtectedRoute } from "./components/ProtectedRoute";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
```

`apps/web/src/main.tsx`:
```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { App } from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
```

> Note: `LoginPage`, `RegisterPage`, `DashboardPage`, `ProtectedRoute` are created in Tasks 0.8–0.9. This task's verification runs after those exist; to boot the shell alone before then, temporarily render a `<div>Hello</div>` — but prefer implementing 0.8/0.9 next and verifying together.

- [ ] **Step 3: Commit**

```bash
git add apps/web
git commit -m "feat(web): vite+react shell, router, tailwind, query client"
```

---

### Task 0.8: Auth store + API client + typed auth calls

**Files:**
- Create: `apps/web/src/lib/api.ts`, `apps/web/src/store/auth.store.ts`, `apps/web/src/__tests__/auth.store.test.ts`

**Interfaces:**
- Consumes: `AuthResponse`, `LoginInput`, `RegisterInput` from `@dnd/shared`.
- Produces: `useAuthStore` (Zustand) with `{ token: string | null, user: AuthResponse["user"] | null, setAuth(r: AuthResponse): void, logout(): void }`, persisting token to `localStorage` key `dnd_token`. `apiFetch<T>(path, options)` that attaches bearer token and throws on non-2xx. `login(input)` / `register(input)` helpers returning `Promise<AuthResponse>`.

- [ ] **Step 1: Write the failing test**

`apps/web/src/__tests__/auth.store.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "../store/auth.store";

describe("auth store", () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().logout();
  });

  it("setAuth stores token+user and persists token", () => {
    useAuthStore.getState().setAuth({
      token: "abc",
      user: { id: "1", email: "a@b.com", displayName: "G" },
    });
    expect(useAuthStore.getState().token).toBe("abc");
    expect(useAuthStore.getState().user?.email).toBe("a@b.com");
    expect(localStorage.getItem("dnd_token")).toBe("abc");
  });

  it("logout clears state and storage", () => {
    useAuthStore.getState().setAuth({
      token: "abc",
      user: { id: "1", email: "a@b.com", displayName: "G" },
    });
    useAuthStore.getState().logout();
    expect(useAuthStore.getState().token).toBeNull();
    expect(localStorage.getItem("dnd_token")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @dnd/web test`
Expected: FAIL — cannot resolve `../store/auth.store`.

- [ ] **Step 3: Implement store + api client**

`apps/web/src/store/auth.store.ts`:
```ts
import { create } from "zustand";
import type { AuthResponse } from "@dnd/shared";

interface AuthState {
  token: string | null;
  user: AuthResponse["user"] | null;
  setAuth: (r: AuthResponse) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem("dnd_token"),
  user: null,
  setAuth: (r) => {
    localStorage.setItem("dnd_token", r.token);
    set({ token: r.token, user: r.user });
  },
  logout: () => {
    localStorage.removeItem("dnd_token");
    set({ token: null, user: null });
  },
}));
```

`apps/web/src/lib/api.ts`:
```ts
import type { AuthResponse, LoginInput, RegisterInput } from "@dnd/shared";
import { useAuthStore } from "../store/auth.store";

const BASE = "/api";

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = useAuthStore.getState().token;
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function login(input: LoginInput): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function register(input: RegisterInput): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
```

> Note: Vite proxy maps `/api` → `http://localhost:3000`. Update `vite.config.ts` proxy to `"/api": { target: "http://localhost:3000", rewrite: (p) => p.replace(/^\/api/, "") }` so `/api/auth/login` hits `/auth/login`.

Apply that proxy edit in `apps/web/vite.config.ts`:
```ts
server: {
  port: 5173,
  proxy: {
    "/api": {
      target: "http://localhost:3000",
      rewrite: (p) => p.replace(/^\/api/, ""),
    },
  },
},
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @dnd/web test`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/store apps/web/src/lib apps/web/vite.config.ts
git commit -m "feat(web): auth store, api client, login/register helpers"
```

---

### Task 0.9: Login/Register/Dashboard pages + ProtectedRoute

**Files:**
- Create: `apps/web/src/pages/LoginPage.tsx`, `apps/web/src/pages/RegisterPage.tsx`, `apps/web/src/pages/DashboardPage.tsx`, `apps/web/src/components/ProtectedRoute.tsx`
- Test: `apps/web/src/__tests__/LoginPage.test.tsx`

**Interfaces:**
- Consumes: `login`/`register` from `lib/api`, `useAuthStore`, `loginSchema`/`registerSchema` from `@dnd/shared`.
- Produces: functional auth UI. `ProtectedRoute` redirects to `/login` when `token` is null.

- [ ] **Step 1: Write the failing test**

`apps/web/src/__tests__/LoginPage.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LoginPage } from "../pages/LoginPage";

describe("LoginPage", () => {
  it("renders email + password fields and submit", () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @dnd/web test LoginPage`
Expected: FAIL — cannot resolve `../pages/LoginPage`.

- [ ] **Step 3: Implement ProtectedRoute**

`apps/web/src/components/ProtectedRoute.tsx`:
```tsx
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/auth.store";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
```

- [ ] **Step 4: Implement LoginPage**

`apps/web/src/pages/LoginPage.tsx`:
```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, Link } from "react-router-dom";
import { loginSchema, type LoginInput } from "@dnd/shared";
import { login } from "../lib/api";
import { useAuthStore } from "../store/auth.store";
import { useState } from "react";

export function LoginPage() {
  const { register, handleSubmit, formState: { errors } } =
    useForm<LoginInput>({ resolver: zodResolver(loginSchema) });
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (data: LoginInput) => {
    try {
      const res = await login(data);
      setAuth(res);
      navigate("/");
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
      <form onSubmit={handleSubmit(onSubmit)} className="w-80 space-y-4 p-6 bg-slate-800 rounded-lg">
        <h1 className="text-xl font-bold">Iniciar sesión</h1>
        <div>
          <label htmlFor="email" className="block text-sm">Email</label>
          <input id="email" type="email" className="w-full rounded bg-slate-700 p-2" {...register("email")} />
          {errors.email && <p className="text-red-400 text-xs">{errors.email.message}</p>}
        </div>
        <div>
          <label htmlFor="password" className="block text-sm">Password</label>
          <input id="password" type="password" className="w-full rounded bg-slate-700 p-2" {...register("password")} />
          {errors.password && <p className="text-red-400 text-xs">{errors.password.message}</p>}
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button type="submit" className="w-full rounded bg-indigo-600 p-2 font-semibold">Log in</button>
        <p className="text-xs">¿Sin cuenta? <Link to="/register" className="text-indigo-400">Regístrate</Link></p>
      </form>
    </div>
  );
}
```

- [ ] **Step 5: Implement RegisterPage**

`apps/web/src/pages/RegisterPage.tsx`:
```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, Link } from "react-router-dom";
import { registerSchema, type RegisterInput } from "@dnd/shared";
import { register as registerApi } from "../lib/api";
import { useAuthStore } from "../store/auth.store";
import { useState } from "react";

export function RegisterPage() {
  const { register, handleSubmit, formState: { errors } } =
    useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (data: RegisterInput) => {
    try {
      const res = await registerApi(data);
      setAuth(res);
      navigate("/");
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
      <form onSubmit={handleSubmit(onSubmit)} className="w-80 space-y-4 p-6 bg-slate-800 rounded-lg">
        <h1 className="text-xl font-bold">Crear cuenta</h1>
        <div>
          <label htmlFor="displayName" className="block text-sm">Nombre</label>
          <input id="displayName" className="w-full rounded bg-slate-700 p-2" {...register("displayName")} />
          {errors.displayName && <p className="text-red-400 text-xs">{errors.displayName.message}</p>}
        </div>
        <div>
          <label htmlFor="email" className="block text-sm">Email</label>
          <input id="email" type="email" className="w-full rounded bg-slate-700 p-2" {...register("email")} />
          {errors.email && <p className="text-red-400 text-xs">{errors.email.message}</p>}
        </div>
        <div>
          <label htmlFor="password" className="block text-sm">Password</label>
          <input id="password" type="password" className="w-full rounded bg-slate-700 p-2" {...register("password")} />
          {errors.password && <p className="text-red-400 text-xs">{errors.password.message}</p>}
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button type="submit" className="w-full rounded bg-indigo-600 p-2 font-semibold">Register</button>
        <p className="text-xs">¿Ya tienes cuenta? <Link to="/login" className="text-indigo-400">Entra</Link></p>
      </form>
    </div>
  );
}
```

- [ ] **Step 6: Implement DashboardPage**

`apps/web/src/pages/DashboardPage.tsx`:
```tsx
import { useAuthStore } from "../store/auth.store";

export function DashboardPage() {
  const { user, logout } = useAuthStore();
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Mis campañas</h1>
        <button onClick={logout} className="rounded bg-slate-700 px-3 py-1">Salir</button>
      </header>
      <p className="mt-4 text-slate-400">
        Bienvenido{user ? `, ${user.displayName}` : ""}. Aquí irán tus campañas (Fase 1).
      </p>
    </div>
  );
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `pnpm --filter @dnd/web test LoginPage`
Expected: PASS (1 test).

- [ ] **Step 8: Manual end-to-end check**

Run (two terminals): `pnpm dev:api` and `pnpm dev:web`, then open `http://localhost:5173/register`, create an account, confirm redirect to dashboard, reload page (token persists), click Salir (redirect to login).
Expected: full register→dashboard→logout flow works against local API.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/pages apps/web/src/components apps/web/src/__tests__
git commit -m "feat(web): login/register/dashboard pages + protected route"
```

---

### Task 0.10: CI (GitHub Actions) + Coolify deploy config

**Files:**
- Create: `.github/workflows/ci.yml`, `apps/api/Dockerfile`, `apps/web/Dockerfile`, `apps/web/nginx.conf`, `docs/DEPLOY.md`

**Interfaces:**
- Produces: CI running lint + tests on push/PR with a Postgres service; Dockerfiles + Coolify deploy notes (VPS, managed Postgres, Traefik SSL). Web container reverse-proxies `/api` to the API service over Coolify's internal network, so the frontend's `BASE = "/api"` (Task 0.8) works identically in dev and prod with no CORS.

- [ ] **Step 1: CI workflow**

`.github/workflows/ci.yml`:
```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request:
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: dnd
          POSTGRES_PASSWORD: dnd
          POSTGRES_DB: dnd
        ports: ["5432:5432"]
        options: >-
          --health-cmd pg_isready --health-interval 10s
          --health-timeout 5s --health-retries 5
    env:
      DATABASE_URL: postgresql://dnd:dnd@localhost:5432/dnd
      JWT_SECRET: ci-secret
    steps:
      - uses: actions/checkout@v4
      # pnpm version comes from package.json "packageManager" — do NOT also pass
      # a `version` input, or action-setup errors "Multiple versions specified".
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: "pnpm" }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @dnd/api prisma:generate
      - run: pnpm --filter @dnd/api exec prisma migrate deploy
      # NOTE: `pnpm lint` is intentionally omitted until ESLint is set up
      # (deferred follow-up — no eslint config exists yet in Phase 0).
      - run: pnpm test
      - run: pnpm --filter @dnd/api test:e2e
```

- [ ] **Step 2: API Dockerfile**

`apps/api/Dockerfile`:
```dockerfile
FROM node:20-slim AS base
RUN corepack enable
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @dnd/api prisma:generate
RUN pnpm --filter @dnd/api build
EXPOSE 3000
CMD ["sh", "-c", "pnpm --filter @dnd/api exec prisma migrate deploy && node apps/api/dist/src/main.js"]
```

- [ ] **Step 3: Web Dockerfile**

`apps/web/Dockerfile`:
```dockerfile
FROM node:20-slim AS build
RUN corepack enable
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @dnd/web build

FROM nginx:alpine
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
# Template is rendered at container start by nginx's envsubst entrypoint,
# substituting ${API_URL} (set in Coolify) — nginx runtime vars like $uri
# are preserved because they are not environment variables.
COPY apps/web/nginx.conf /etc/nginx/templates/default.conf.template
EXPOSE 80
```

`apps/web/nginx.conf`:
```
server {
  listen 80;

  # Proxy API calls to the backend service over Coolify's internal network.
  # API_URL example: http://api:3000  (use the API service's internal name).
  location /api/ {
    proxy_pass ${API_URL}/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # SPA static assets + client-side routing fallback.
  location / {
    root /usr/share/nginx/html;
    try_files $uri /index.html;
  }
}
```

> `proxy_pass ${API_URL}/;` strips the `/api` prefix (trailing slash on both `location /api/` and the target), so `/api/auth/login` → `${API_URL}/auth/login`. This mirrors the Vite dev proxy rewrite from Task 0.8, so `BASE = "/api"` works identically in dev and prod.

- [ ] **Step 4: Deploy notes**

`docs/DEPLOY.md`:
```markdown
# Deploy (Coolify on self-hosted VPS)

Prereqs: a VPS with Coolify installed (`https://coolify.io`), a domain with
DNS A-records pointing at the VPS, and this repo connected as a Coolify source
(GitHub App or deploy key).

## 1. Project + Postgres
1. Create a Coolify **Project** (e.g. `dnd`) with a `production` environment.
2. Add a **PostgreSQL** database resource. Coolify generates credentials and an
   **internal** connection URL (hostname = the DB service's internal name).
   Copy that internal `DATABASE_URL` — the API uses the internal one, not public.

## 2. API service
1. **+ New Resource → Application → from Git repo**, this repo, branch `main`.
2. Build Pack: **Dockerfile**. Dockerfile location: `apps/api/Dockerfile`.
   Base directory / build context: repo root (`/`).
3. Port: `3000`. Assign a domain, e.g. `https://api.tudominio.com` (Coolify
   provisions Let's Encrypt SSL via Traefik automatically).
4. Env vars:
   - `DATABASE_URL` = the internal Postgres URL from step 1
   - `JWT_SECRET` = long random string (`openssl rand -hex 32`)
   - `JWT_EXPIRES_IN=7d`
   - `PORT=3000`
   - `SENTRY_DSN` = your Sentry project DSN (or leave empty)
5. Deploy. The API Dockerfile CMD runs `prisma migrate deploy` on start, so the
   schema is applied automatically on first boot.

## 3. Web service
1. **+ New Resource → Application → from Git repo**, same repo/branch.
2. Build Pack: **Dockerfile**. Dockerfile location: `apps/web/Dockerfile`.
   Base directory: repo root (`/`). Port: `80`.
3. Assign a domain, e.g. `https://app.tudominio.com` (auto SSL).
4. Env var:
   - `API_URL` = the API service's **internal** address, e.g. `http://api:3000`
     (use the internal service name shown in Coolify, not the public domain).
     The web nginx template substitutes this and proxies `/api` → API, so no
     CORS setup and no `VITE_API_URL` needed.

## 4. Auto-deploy + verify
1. Enable **auto-deploy on push** for both services (Coolify webhook). GitHub
   Actions CI must be green first (tests), then push to `main` triggers deploy.
2. Verify: open `https://app.tudominio.com`, register, log in over HTTPS.
3. Confirm Sentry receives events (trigger a test error) if DSN is set.
```

- [ ] **Step 5: Verify CI locally (lint+test pass)**

Run:
```bash
pnpm lint
pnpm test
```
Expected: all packages lint clean and tests pass.

- [ ] **Step 6: Commit + push**

```bash
git add .github apps/api/Dockerfile apps/web/Dockerfile apps/web/nginx.conf docs/DEPLOY.md
git commit -m "chore: CI workflow, dockerfiles, coolify deploy notes"
```

**Phase 0 exit check:** Register + log in works against the deployed Coolify VPS URL over HTTPS; CI green on `main`; `pnpm test` green locally.

---

# PHASE 1 — Campaign core

**Goal:** A DM creates a campaign, invites players, records worldbuilding entities (NPCs, locations, quests) and session notes, with per-entity visibility enforced. This is the phase you validate at a real table.

## File Structure (Phase 1)

```
apps/api/prisma/schema.prisma       # + Campaign, CampaignMember, Invite, Entity,
                                    #   EntityLink, EntityVisibilityGrant, Comment,
                                    #   Session, Character; User.isAdmin
apps/api/src/campaigns/             # module, service, controller, spec
apps/api/src/campaigns/membership.service.ts
apps/api/src/campaigns/invites.service.ts
apps/api/src/common/visibility.ts   # canView helper (5 levels + admin + specific-players)
apps/api/src/worldbuilding/         # entity module (all EntityTypes via type field)
apps/api/src/worldbuilding/entity-links.service.ts
apps/api/src/worldbuilding/comments.service.ts
apps/api/src/sessions/              # session notes module
apps/api/src/characters/            # basic character module (sheet+rules in Phase 2)
packages/shared/src/campaign.schema.ts
packages/shared/src/entity.schema.ts   # + link + comment + visibility schemas
packages/shared/src/session.schema.ts
packages/shared/src/character.schema.ts
apps/web/src/features/campaigns/    # list, create, detail pages + hooks
apps/web/src/features/worldbuilding/ # entity list/editor, link editor, comments
apps/web/src/features/sessions/
apps/web/src/features/characters/
```

## Data model additions (Phase 1)

Add `isAdmin Boolean @default(false)` to the existing `User` model (system admin role for the `ADMIN` visibility rule).

```prisma
enum Role { DM PLAYER }

// All 5 visibility levels from the source doc.
enum Visibility {
  PUBLIC            // any campaign member
  PLAYERS           // all players + DM
  SPECIFIC_PLAYERS  // only users in EntityVisibilityGrant + DM
  OWNER_DM          // creator + DM
  DM_ONLY           // DM only
}

// Worldbuilding entity types from the doc's worldbuilding module.
enum EntityType { NPC LOCATION QUEST FACTION OBJECT EVENT DOCUMENT }

model Campaign {
  id          String   @id @default(cuid())
  name        String
  description String?
  ownerId     String
  createdAt   DateTime @default(now())
  members     CampaignMember[]
  entities    Entity[]
  sessions    Session[]
  invites     Invite[]
  characters  Character[]
}

model CampaignMember {
  id         String   @id @default(cuid())
  campaignId String
  userId     String
  role       Role
  campaign   Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  @@unique([campaignId, userId])
}

model Invite {
  id         String   @id @default(cuid())
  campaignId String
  token      String   @unique
  role       Role     @default(PLAYER)
  createdAt  DateTime @default(now())
  usedAt     DateTime?
  campaign   Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
}

model Entity {
  id          String     @id @default(cuid())
  campaignId  String
  type        EntityType
  name        String
  body        Json?      // flexible narrative content (JSONB)
  tags        String[]   @default([])
  visibility  Visibility @default(DM_ONLY)
  createdById String
  createdAt   DateTime   @default(now())
  campaign    Campaign   @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  grants      EntityVisibilityGrant[]
  linksFrom   EntityLink[] @relation("linkFrom")
  linksTo     EntityLink[] @relation("linkTo")
  comments    Comment[]
}

// Wiki-style relation between two entities (the doc's core differentiator).
model EntityLink {
  id         String  @id @default(cuid())
  fromId     String
  toId       String
  label      String? // e.g. "lives in", "member of", "owns"
  from       Entity  @relation("linkFrom", fields: [fromId], references: [id], onDelete: Cascade)
  to         Entity  @relation("linkTo", fields: [toId], references: [id], onDelete: Cascade)
  @@unique([fromId, toId, label])
}

// Per-user allow-list backing Visibility.SPECIFIC_PLAYERS.
model EntityVisibilityGrant {
  id       String @id @default(cuid())
  entityId String
  userId   String
  entity   Entity @relation(fields: [entityId], references: [id], onDelete: Cascade)
  @@unique([entityId, userId])
}

model Comment {
  id          String   @id @default(cuid())
  entityId    String
  authorId    String
  body        String
  createdAt   DateTime @default(now())
  entity      Entity   @relation(fields: [entityId], references: [id], onDelete: Cascade)
}

model Session {
  id          String   @id @default(cuid())
  campaignId  String
  title       String
  scheduledAt DateTime?
  notes       Json?
  visibility  Visibility @default(PLAYERS)
  createdAt   DateTime @default(now())
  campaign    Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
}

// Basic character (doc Fase 1 "personajes básicos"). Live sheet + rules = Phase 2.
model Character {
  id          String   @id @default(cuid())
  campaignId  String
  ownerId     String
  name        String
  race        String?  // free text in Phase 1; SRD-linked in Phase 2
  class       String?  // free text in Phase 1
  level       Int      @default(1)
  bio         String?
  visibility  Visibility @default(PLAYERS)
  createdAt   DateTime @default(now())
  campaign    Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
}
```

> Attachments (images/files on entities) need object storage → deferred to Phase 3 with the `Asset` model. Email invites need a mail service → deferred; Phase 1 ships link invites only. Both are noted, not forgotten.

## Phase 1 tasks (task-level; expand each into TDD steps at execution time following the Phase 0 pattern)

- [ ] **Task 1.1 — Migration + shared schemas.** Add `User.isAdmin` and all models above; `pnpm prisma:migrate --name campaign_core`. Add to `@dnd/shared`: `campaign.schema.ts` (`createCampaignSchema`, `campaignDto`), `entity.schema.ts` (`createEntitySchema` with `type`, `tags`, `visibility`, optional `specificPlayerIds`; plus `createEntityLinkSchema`, `createCommentSchema`), `session.schema.ts`, `character.schema.ts`. Export a `visibilitySchema` Zod enum matching the 5 Prisma levels. TDD the Zod schemas as in Task 0.2.

- [ ] **Task 1.2 — Visibility helper (security-critical).** `apps/api/src/common/visibility.ts`: pure function
  `canView(viewer: { userId: string; role: Role | null; isAdmin: boolean }, resource: { visibility: Visibility; createdById: string; grantedUserIds: string[] }): boolean`.
  Rules: `ADMIN` isAdmin → always true; `DM` role → always true; `PUBLIC` → any member (role non-null); `PLAYERS` → any member; `SPECIFIC_PLAYERS` → viewer in `grantedUserIds`; `OWNER_DM` → viewer is `createdById`; `DM_ONLY` → false for non-DM. Write the **full unit-test matrix** (every `Visibility` × {DM, player-owner, player-other, specific-granted player, admin, non-member}) BEFORE implementing. This gate is what protects DM secrets — no shortcuts.

- [ ] **Task 1.3 — Campaigns service + membership.** `create` (owner becomes DM member in a transaction), `listForUser`, `getById` (403 if not a member), `MembershipService.getMembership(campaignId, userId)` returning `{ role } | null` and `requireRole`. Unit tests with Prisma mock; then controller `POST /campaigns`, `GET /campaigns`, `GET /campaigns/:id`, guarded by `JwtAuthGuard`. Emit `campaign.created`. e2e: two users, non-member gets 403.

- [ ] **Task 1.4 — Invites.** `POST /campaigns/:id/invites` (DM only) creates `Invite` with random `token`; `POST /invites/:token/accept` adds the caller as `PLAYER`, sets `usedAt`, rejects reused/invalid tokens. Emit `campaign.member_joined`. e2e: DM invites, player accepts, player now a member. (Email delivery deferred — return the link.)

- [ ] **Task 1.5 — Worldbuilding entities + tags.** CRUD under `/campaigns/:id/entities?type=` for all `EntityType`s; on create with `SPECIFIC_PLAYERS`, write `EntityVisibilityGrant` rows from `specificPlayerIds` in a transaction; list loads each entity's grants and applies `canView` for the caller; create/update require membership, delete requires DM or creator. Support `tags` filter. Emit `entity.created`. e2e: DM creates `DM_ONLY` NPC → excluded from player list; `PLAYERS` entity included; `SPECIFIC_PLAYERS` visible only to granted player.

- [ ] **Task 1.6 — Entity links (wiki relations).** `POST /entities/:id/links` (body `{ toId, label? }`, both entities same campaign, membership required), `GET /entities/:id/links` (returns linked entities the caller `canView`), `DELETE /links/:id`. Reject cross-campaign links and self-links. e2e: link NPC→Location, fetch shows it; a `DM_ONLY` link target is hidden from a player.

- [ ] **Task 1.7 — Entity comments.** `POST /entities/:id/comments` (membership + `canView` on the entity required), `GET /entities/:id/comments`, `DELETE /comments/:id` (author or DM). e2e: player comments on a `PLAYERS` entity; cannot comment on a `DM_ONLY` entity (403).

- [ ] **Task 1.8 — Sessions.** CRUD under `/campaigns/:id/sessions` with `title`, `scheduledAt`, `notes` (JSON), `visibility`. Same `canView` filtering. e2e as above.

- [ ] **Task 1.9 — Basic characters.** CRUD under `/campaigns/:id/characters` with `name`, `race`, `class`, `level`, `bio`, `visibility`; create sets `ownerId` to caller; update/delete require owner or DM; list applies `canView` (treat `ownerId` as `createdById`). e2e: player creates own character, sees it; `DM_ONLY` character of another hidden.

- [ ] **Task 1.10 — Web: campaigns list + create.** `features/campaigns` with TanStack Query hooks (`useCampaigns`, `useCreateCampaign`), list on dashboard, create modal (React Hook Form + `createCampaignSchema`). Component test: list renders returned campaigns.

- [ ] **Task 1.11 — Web: campaign detail + tabs.** Detail route `/campaigns/:id` with tabs Overview / NPCs / Locations / Quests / Factions / Objects / Events / Documents / Sessions / Characters. Each tab lists via query hook. Test: tab switch renders correct list.

- [ ] **Task 1.12 — Web: entity editor (tags + visibility + links + comments).** Create/edit form with `type`, `tags` input, `visibility` selector (incl. per-player picker when `SPECIFIC_PLAYERS`), a linked-entities panel (add/remove links), and a comments thread. Optimistic invalidation via TanStack Query. Test: submitting create form calls mutation with parsed payload incl. tags + specificPlayerIds.

- [ ] **Task 1.13 — Web: session + character editors.** Forms for sessions and basic characters incl. `visibility` selector. Test: submit calls mutation with parsed payload.

- [ ] **Task 1.14 — Invite flow UI + deploy.** DM copies invite link; join route `/join/:token` calls accept then navigates to the campaign. Manual end-to-end: second account joins via link, sees only permitted content across every visibility level. Deploy to Coolify (push to `main` → auto-deploy); confirm Sentry receives a test error.

**Phase 1 exit check:** Run one real session at your table. DM + at least one player account. Verify each visibility level behaves (player never sees `DM_ONLY`; a `SPECIFIC_PLAYERS` secret reaches only its target; entities link to each other and links respect visibility). If it survives a real session, proceed to Phase 2.

---

# PHASE 2 — Characters + minimal rules engine (scope only — write its own plan when reached)

> **AMPLIADA el 2026-09-01.** El alcance de abajo se quedaba corto: no mencionaba objetos,
> inventario, equipar ni tiradas, que el documento fuente sí pide. La decisión acordada con el
> autor está en **`docs/superpowers/specs/2026-09-01-fase-2-alcance-design.md`** y **manda
> sobre esta sección**. En resumen: la fase se parte en **2A** (motor + hoja + traza de
> derivación), **2B** (objetos con datos + inventario + equipar, alimentando el motor con una
> **lista cerrada de efectos numéricos**), **2C** (tirador de dados con ventaja/desventaja
> marcada por el DM y condiciones **indefinidas**) y **2D opcional** (statblocks de NPC).
> Dos principios: **la máquina ejecuta, el DM arbitra**, y **el azar vive fuera del motor**.
> Fuera de la fase: comparar contra la CA, aplicar daño, iniciativa, duraciones por turnos y
> tiempo real.

**Scope:**
- `Character`, `CharacterSheet` models (structured columns + JSONB flexible part).
- SRD 5.1 data ingested as seed data (races, classes, ability scores) — SRD/OGL only.
- **Rules engine** as an isolated, pure, deterministic subsystem (`apps/api/src/rules/`), no HTTP/DB coupling:
  - Input: base character state + list of modifier sources.
  - Output: computed sheet + list of warnings + per-value derivation trace + diff vs previous snapshot.
  - Scope for v1: ability modifiers, proficiency bonus, AC (base + Dex, manual overrides), max HP by class/level/CON, spell save DC, attack/spell attack bonus. **Manual modifiers first**; no automatic feat/spell parsing yet.
- Rules engine gets exhaustive unit tests before any UI (this is the differentiator and the biggest risk).

**Exit criteria:** A real character sheet auto-computes the v1 derived stats and recomputes on stat change; rules engine test coverage covers every calculation stage and the derivation trace.

**Deferred deliberately:** automatic effect resolution for every feat/spell, homebrew override UI, multi-ruleset support.

---

# PHASE 3 — Maps 2D (scope only — write its own plan when reached)

> **ANTES DE ESTA FASE VA UN BLOQUE NUEVO: "Encuentros"** (decidido el 2026-09-01, detalle en
> `docs/superpowers/specs/2026-09-01-fase-2-alcance-design.md`). Statblocks de NPC con PG vivos,
> iniciativa y orden de turnos, ataque contra objetivo **comparado en el servidor** (la CA nunca
> viaja al navegador del jugador) y **propuesto al DM para que confirme o corrija**, daño
> aplicado por el DM, y **las condiciones con duración en turnos**, que nacen aquí porque un
> turno no existe en el sistema hasta que hay iniciativa. Es el compañero natural del tablero,
> así que va pegado a esta fase.

> **ACOTADA el 2026-09-01.** Decisión sobre editores y contenido visual en
> **`docs/superpowers/specs/2026-09-01-fase-3-assets-y-editores-design.md`**, que **manda sobre
> esta sección**: **no se construyen editores de arte**. Se suben imágenes, se curan en una
> biblioteca por campaña y se importan formatos estándar (Tiled para mapas, PNG + atlas para
> spritesheets). Orden de valor: subir y organizar con visibilidad → reproducir animaciones de
> un spritesheet → importar Tiled → y solo entonces, si el uso lo pide, un editor pequeño y
> específico. **El mismo criterio se aplicará al creador de avatares de la fase 5.**

**Scope:** Object storage for uploads (introduce S3-compatible storage + `Asset` model here — self-host **MinIO** as a Coolify resource on the same VPS, or use an external S3 bucket), `Map` + `MapMarker` models, marker→entity links, simple fog toggle, DM vs player layer views. **Also delivers entity image/file attachments and character portraits** (deferred from Phase 1 because they need this storage). First point where file storage is justified.

**Exit criteria:** Used for at least one map during a real session, with player-hidden markers actually hidden.

---

# PHASE 4 — Real-time + social (scope only — write its own plan when reached)

**Scope:** Introduce WebSocket Gateway (and Redis for presence/pub-sub if multi-instance). Live sheet/session updates, presence, comments per entity/session, activity feed, notifications. Domain events (`character.stats_recomputed`, `session.closed`, etc.) formalized here.

**Exit criteria:** Two clients observe live updates; group uses comments during a session.

---

# PHASE 5 — Visual + AI premium (scope only — write its own plan when reached)

**Scope:** Three.js / React Three Fiber avatar-or-miniature creator (GLB assets). Later: image→3D via a **decoupled** AI service + BullMQ workers + manual approval pipeline before persisting. Billing (`BillingSubscription`) gates premium features.

**Exit criteria:** Only started after phases 1–2 show recurring real use. Treated as premium; costs and quality validated before general availability.

---

## Self-Review (against source doc `docs/plataforma-dnd-documentacion.md`)

- **Módulo de campañas** (metadata, roles/permisos, sesiones, invites) → Phase 1 (Tasks 1.3, 1.4, 1.8). Invites by link; email deferred (noted). ✅
- **Módulo de worldbuilding** — all doc entity types (NPC, Location, Quest, Faction, Object, Event, Document/handout) → `EntityType` enum, Task 1.5. Tags → Task 1.5. **Relations/wiki links** (doc's core differentiator) → `EntityLink`, Task 1.6. Comments → Task 1.7. Image/file attachments → deferred to Phase 3 (need storage), noted. ✅
- **Módulo de sesiones** → Phase 1 (Task 1.8); rich fields (XP/loot/objetivos) live in `notes` JSON. ✅
- **Personajes básicos** (doc Fase 1) → Phase 1 (Task 1.9); live sheet + rules engine → Phase 2. ✅
- **Characters + rules engine** (data-driven, deterministic, trace, diff) → Phase 2 scope, matches doc's engine principles. ✅
- **Maps 2D + fog + layers** → Phase 3 (follows doc's phase table; doc's "MVP estricto" self-contradiction noted). ✅
- **Real-time + social feed/notifications** → Phase 4; entity-level comments pulled earlier to Phase 1. ✅
- **Visual creator + image→3D AI + billing/monetization** → Phase 5. ✅
- **Permissions/visibility — all 5 doc levels** (`PUBLIC`, `PLAYERS`, `SPECIFIC_PLAYERS`, `OWNER_DM`, `DM_ONLY`) + admin role → modeled Phase 1, `canView` full-matrix tested (Task 1.2). ✅
- **Modelo de datos del doc** — User, Campaign, CampaignMember, Session, Location/Quest/Faction (via `Entity`+type), Note (via `Comment`/`body` JSON) → Phase 1. Character/CharacterSheet/CharacterFeature/RuleSet → Phase 2. Map/MapMarker/Asset → Phase 3. BillingSubscription → Phase 5. Design choice: polymorphic `Entity` table instead of one table per narrative type (uniform permissions/listing; documented trade-off). ✅
- **Eventos internos de dominio** → `@nestjs/event-emitter` from Phase 1 (`campaign.created`, `campaign.member_joined`, `entity.created`); more events added per phase. ✅
- **Stack** (NestJS+Fastify, React+Vite+TanStack+Zustand+Tailwind+RHF, Postgres+Prisma, Zod) → Phase 0. Deferred (Redis/BullMQ/S3/WebSocket/Three.js/AI) mapped to the phase that first needs them, per Global Constraints. ✅
- **Observabilidad (Sentry)** → Phase 0; OTel/Grafana deferred. ✅
- **Modular monolith + domain modules** → API folder-per-domain from Phase 0. ✅
- **Risks** (scope creep, rules-engine complexity, AI cost) → mitigated by phase gates + "manual first" rules + AI last. ✅
- **Legal (SRD only)** → Global Constraints + Phase 2 scope. ✅

**Known deferrals (tracked, not dropped):** entity image/file attachments (Phase 3, needs S3), email invites (needs mail service), `TimelineEvent` as a dedicated timeline view (Phase 1 stores `EVENT` entities; chronology UI later), **ESLint setup** (package `lint` scripts exist but no eslint config/deps yet — CI skips lint until a dedicated follow-up configures ESLint 9 flat config across the workspace). Each is called out in the plan body where relevant.

**Placeholder note:** Phases 2–5 are intentionally scope-level, not bite-sized. This is a deliberate planning decision (their design depends on real usage feedback), NOT a placeholder omission — each MUST be expanded into its own detailed TDD plan via the writing-plans skill before implementation. Phases 0 and 1 contain the actionable near-term work; Phase 0 is fully bite-sized, Phase 1 is task-level with an explicit instruction to expand each task using the Phase 0 pattern.
