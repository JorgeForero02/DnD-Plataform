import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Colocado junto a worktree-slot.test.ts por la misma razón: vite.config.ts restringe
// vitest a `src/**`, así que un test fuera de aquí no lo correría nadie.
//
// scripts/db-slot.mjs usaba `shell: true` para invocar `pnpm ... exec prisma ...`. En esta
// ruta de repo, que lleva `&` (`D&D-Plataform`), el shell de Windows corta el comando ahí y
// `pnpm` nunca ve el resto de los argumentos ("Command \"prisma\" not found"). El arreglo es
// el mismo patrón que usa `apps/web/e2e/admin-reinicio.spec.ts` en `concederAdmin()`:
// `execFileSync(process.execPath, [rutaAPrismaCli, ...])`, sin shell de por medio.

const repoRoot = join(__dirname, "..", "..", "..", "..");

describe("scripts/db-slot.mjs no depende de un shell", () => {
  it("no usa shell: true", () => {
    const script = readFileSync(join(repoRoot, "scripts/db-slot.mjs"), "utf8");
    expect(script).not.toMatch(/shell:\s*true/);
  });

  it("invoca prisma con process.execPath y la ruta a prisma/build/index.js", () => {
    const script = readFileSync(join(repoRoot, "scripts/db-slot.mjs"), "utf8");
    expect(script).toMatch(/process\.execPath/);
    expect(script).toMatch(/["'`]prisma["'`]/);
    expect(script).toMatch(/["'`]build["'`]/);
    expect(script).toMatch(/["'`]index\.js["'`]/);
  });
});
