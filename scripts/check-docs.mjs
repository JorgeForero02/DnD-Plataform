#!/usr/bin/env node
// Doc-lint: makes three of this project's documentation rules mechanical instead of
// aspirational. Written after a session where seven documentation claims contradicted the
// code, three of them in docs/00-INDEX.md — the file CLAUDE.md tells everyone to read first.
//
// A documentation rule a machine does not check is not a rule, it is an intention.
//
// Checks:
//   1. Test counts outside their single source (docs/08-pruebas.md).
//   2. Backticked file paths that do not exist.
//   3. Backticked `file.ext:NN` references whose line number is past the end of the file.
//
// Deliberately dependency-free and deliberately conservative: a false positive here costs
// somebody an argument with a script, so every check has an escape hatch documented below.
//
// Escape hatch: put <!-- docs-lint-ignore --> on the line, or anywhere in a fenced code block,
// and that line is skipped. Dated records (docs/superpowers/specs/, docs/07-historial.md) are
// skipped wholesale for the counts check: a dated document is a record of what was true when
// it was written, not a claim about now, and rewriting it would falsify the archive.

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const ROOT = resolve(process.argv[2] ?? ".");
const COUNTS_SOURCE = "docs/08-pruebas.md";
const COUNTS_EXEMPT = [COUNTS_SOURCE, "docs/07-historial.md"];
const COUNTS_EXEMPT_DIRS = ["docs/superpowers/specs"];
const IGNORE = "docs-lint-ignore";

// Roots a doc might be citing from. Order does not matter; any hit means the path is real.
const BASES = [
  "",
  "docs",
  "apps/api/src",
  "apps/web/src",
  "apps/api",
  "apps/web",
  "packages/shared/src",
];

// A number next to a word that means "how many tests". Requires the digit and the word to be
// adjacent (at most one short word between) so "las 5 reglas de visibilidad" does not trip it.
const COUNT_RE = /\b\d{1,5}\s+(?:\w+\s+)?(pruebas|unitarias|tests|recorridos|e2e|suites)\b/i;

// Backticked paths: at least one slash, a plausible extension, optional :NN suffix.
const PATH_RE = /`([\w./-]+\.[a-z]{1,5})(?::(\d{1,6}))?`/g;

const findings = [];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".git" || name === "dist") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (name.endsWith(".md")) out.push(full);
  }
  return out;
}

function isExempt(rel) {
  if (COUNTS_EXEMPT.includes(rel)) return true;
  return COUNTS_EXEMPT_DIRS.some((d) => rel.startsWith(d + "/"));
}

const docsDir = join(ROOT, "docs");
if (!existsSync(docsDir)) {
  console.error("check-docs: no docs/ directory at " + ROOT);
  process.exit(1);
}

for (const file of walk(docsDir)) {
  const rel = relative(ROOT, file).replaceAll("\\", "/");
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  let inFence = false;

  lines.forEach((line, i) => {
    const at = `${rel}:${i + 1}`;
    if (/^\s*```/.test(line)) inFence = !inFence;
    if (inFence || line.includes(IGNORE)) return;

    // 1 — counts outside the single source
    if (!isExempt(rel) && COUNT_RE.test(line)) {
      findings.push({
        at,
        rule: "conteo",
        msg: `un conteo de pruebas vive fuera de ${COUNTS_SOURCE}: "${line.trim().slice(0, 90)}"`,
      });
    }

    // 2 and 3 — paths and line references
    for (const m of line.matchAll(PATH_RE)) {
      const [, path, lineNo] = m;
      if (path.startsWith("http") || !path.includes("/")) continue;
      // Docs cite paths relative to whatever root the reader has in their head:
      // "features/entities/hooks.ts" means apps/web/src/..., "common/visibility.ts" means
      // apps/api/src/..., "superpowers/specs/x.md" is relative to docs/. Resolving against
      // one root produced 93 false positives on the first run — a lint nobody can trust is
      // worse than no lint, so a path counts as real if it resolves under ANY known base.
      const target = BASES.map((b) => join(ROOT, b, path)).find((c) => existsSync(c));
      if (!target) {
        findings.push({ at, rule: "ruta", msg: `cita una ruta que no existe: ${path}` });
        continue;
      }
      if (lineNo) {
        const total = readFileSync(target, "utf8").split(/\r?\n/).length;
        if (Number(lineNo) > total) {
          findings.push({
            at,
            rule: "línea",
            msg: `cita ${path}:${lineNo}, pero ese fichero tiene ${total} líneas`,
          });
        }
      }
    }
  });
}

if (findings.length === 0) {
  console.log("check-docs: sin hallazgos.");
  process.exit(0);
}

const byRule = findings.reduce((acc, f) => ((acc[f.rule] ??= []).push(f), acc), {});
for (const [rule, list] of Object.entries(byRule)) {
  console.log(`\n${rule} (${list.length}):`);
  for (const f of list) console.log(`  ${f.at}  ${f.msg}`);
}
console.log(`\ncheck-docs: ${findings.length} hallazgo(s).`);
process.exit(1);
