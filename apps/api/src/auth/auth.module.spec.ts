import { Test } from "@nestjs/testing";
import { JWT_SECRET_MIN_LENGTH } from "../common/jwt-secret";
import { PrismaModule } from "../prisma/prisma.module";
import { PrismaService } from "../prisma/prisma.service";
import { AuthModule } from "./auth.module";
import { JwtStrategy } from "./jwt.strategy";

// "JWT_MODULE_OPTIONS": @nestjs/jwt's own DI token for the object JwtModule.registerAsync's
// useFactory produces (see node_modules/@nestjs/jwt/dist/jwt.constants.js) — not exported from
// its public entry point, so it's referenced by its literal string value here.
const JWT_MODULE_OPTIONS = "JWT_MODULE_OPTIONS";

// Proves the app refuses to start without a valid JWT_SECRET, not just that the helper
// throws in isolation. PrismaService is stubbed out so this stays a unit test: it never
// opens a real database connection (compile() instantiates providers but never calls
// onModuleInit, so the stub is never asked to $connect()).
//
// AuthModule reads JWT_SECRET in two independent places — the JwtModule.registerAsync
// factory in auth.module.ts, and JwtStrategy's constructor in jwt.strategy.ts — and a
// regression could reintroduce the "?? change-me-in-production" fallback in only one of
// them while the other keeps throwing, masking the reintroduced hole behind a still-failing
// compile(). Each "... only" test below stubs out the *other* consumer so the compile()
// rejection can only be coming from the one under test.
describe("AuthModule bootstrap", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("rejects module compilation when JWT_SECRET is missing", async () => {
    delete process.env.JWT_SECRET;

    await expect(
      Test.createTestingModule({ imports: [PrismaModule, AuthModule] })
        .overrideProvider(PrismaService)
        .useValue({})
        .compile(),
    ).rejects.toThrow(/JWT_SECRET/);
  });

  it("rejects module compilation when JWT_SECRET is one character short of the minimum", async () => {
    process.env.JWT_SECRET = "a".repeat(JWT_SECRET_MIN_LENGTH - 1);

    await expect(
      Test.createTestingModule({ imports: [PrismaModule, AuthModule] })
        .overrideProvider(PrismaService)
        .useValue({})
        .compile(),
    ).rejects.toThrow(new RegExp(`${JWT_SECRET_MIN_LENGTH}`));
  });

  it("compiles successfully once a valid JWT_SECRET is set", async () => {
    process.env.JWT_SECRET = "a".repeat(JWT_SECRET_MIN_LENGTH);

    await expect(
      Test.createTestingModule({ imports: [PrismaModule, AuthModule] })
        .overrideProvider(PrismaService)
        .useValue({})
        .compile(),
    ).resolves.toBeDefined();
  });

  it("the JwtModule factory alone rejects compilation when JWT_SECRET is missing", async () => {
    delete process.env.JWT_SECRET;

    // Stub out JwtStrategy so its constructor never runs requireJwtSecret() itself — only
    // the JwtModule.registerAsync factory is left able to throw.
    await expect(
      Test.createTestingModule({ imports: [PrismaModule, AuthModule] })
        .overrideProvider(PrismaService)
        .useValue({})
        .overrideProvider(JwtStrategy)
        .useValue({})
        .compile(),
    ).rejects.toThrow(/JWT_SECRET/);
  });

  it("JwtStrategy alone rejects compilation when JWT_SECRET is missing", async () => {
    delete process.env.JWT_SECRET;

    // Stub out the JwtModule factory's own output so it never calls requireJwtSecret() —
    // only JwtStrategy's real constructor is left able to throw.
    await expect(
      Test.createTestingModule({ imports: [PrismaModule, AuthModule] })
        .overrideProvider(PrismaService)
        .useValue({})
        .overrideProvider(JWT_MODULE_OPTIONS)
        .useValue({ secret: "a".repeat(JWT_SECRET_MIN_LENGTH), signOptions: { expiresIn: "7d" } })
        .compile(),
    ).rejects.toThrow(/JWT_SECRET/);
  });
});
