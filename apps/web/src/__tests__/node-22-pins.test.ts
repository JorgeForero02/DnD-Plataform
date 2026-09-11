import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Colocado junto a worktree-slot.test.ts por la misma razón: vite.config.ts restringe
// vitest a `src/**`, así que un test fuera de aquí no lo correría nadie.
//
// Prueba que los cinco pines de versión de Node no se desincronizan: los dos Dockerfile,
// los dos jobs de CI, los dos `engines.node` de los subpaquetes y el `engines.node` de la
// raíz deben decir todos 22, ninguno 20.

const repoRoot = join(__dirname, "..", "..", "..", "..");

describe("Node 22 LTS: los cinco pines coinciden", () => {
  it("apps/api/Dockerfile usa node:22-slim", () => {
    const dockerfile = readFileSync(join(repoRoot, "apps/api/Dockerfile"), "utf8");
    expect(dockerfile).toMatch(/FROM node:22-slim/);
    expect(dockerfile).not.toMatch(/FROM node:20-slim/);
  });

  it("apps/web/Dockerfile usa node:22-slim", () => {
    const dockerfile = readFileSync(join(repoRoot, "apps/web/Dockerfile"), "utf8");
    expect(dockerfile).toMatch(/FROM node:22-slim/);
    expect(dockerfile).not.toMatch(/FROM node:20-slim/);
  });

  it(".github/workflows/ci.yml fija node-version: 22 en los dos jobs", () => {
    const ci = readFileSync(join(repoRoot, ".github/workflows/ci.yml"), "utf8");
    const matches = ci.match(/node-version:\s*22/g) ?? [];
    expect(matches.length).toBe(2);
    expect(ci).not.toMatch(/node-version:\s*20/);
  });

  it("apps/api/package.json declara engines.node >=22", () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, "apps/api/package.json"), "utf8"));
    expect(pkg.engines?.node).toBe(">=22");
  });

  it("apps/web/package.json declara engines.node >=22", () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, "apps/web/package.json"), "utf8"));
    expect(pkg.engines?.node).toBe(">=22");
  });

  it("package.json de la raíz declara engines.node >=22", () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
    expect(pkg.engines?.node).toBe(">=22");
  });
});
