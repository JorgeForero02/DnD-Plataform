import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Colocado bajo src/ por la misma razón que worktree-slot.test.ts: vite.config.ts
// restringe vitest a `src/**`, así que un test fuera de aquí no lo correría nadie.

describe("apps/web/package.json no depende de TipTap", () => {
  it("ningún paquete @tiptap/* está en dependencies ni devDependencies", () => {
    const pkgPath = join(__dirname, "..", "..", "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    const deps = Object.keys(pkg.dependencies ?? {});
    const devDeps = Object.keys(pkg.devDependencies ?? {});
    const tiptapDeps = [...deps, ...devDeps].filter((name) => name.startsWith("@tiptap/"));
    expect(tiptapDeps).toEqual([]);
  });
});
