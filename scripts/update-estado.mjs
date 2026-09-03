#!/usr/bin/env node
// Regenerates the machine-written block in docs/00-INDEX.md, between
// <!-- estado:inicio --> and <!-- estado:fin -->: current commit, branch, and unit test
// counts per package. Written so 00-INDEX.md — the file CLAUDE.md tells everyone to read
// first — stops asserting state a person typed by hand next to the pointer table. That mix
// is what made it wrong three times in one session: a document that only points cannot
// contradict anything.
//
// Usage:
//   node scripts/update-estado.mjs [root]           regenerate and write the file
//   node scripts/update-estado.mjs [root] --check    exit 1 if the file's block is stale,
//                                                     without writing anything
//
// Counts are test *declarations*, not a live run of the suites, and since 2026-09-03 that
// sentence carries a caveat the earlier version of this comment got wrong.
//
// It used to say "nothing here uses `.each`", and invited the reader to grep before trusting
// it. The grep now finds **more than forty** `it.each(`/`test.each(` blocks, and each of them
// expands into several tests at run time. So the number below is a **lower bound**: a `.each`
// block counts as the one declaration it is, never as the cases it runs. It is not the number
// vitest/jest prints, and this block no longer claims to be.
//
// Why keep a static count at all: --check sits in `pnpm verify` right after `check:docs` and
// before the real `pnpm test` — both are meant to fail fast and cheap, and re-running three
// suites here to print a number `test` is about to compute anyway would defeat that. What it
// protects is real: nobody can hand-edit the number in 00-INDEX.md without --check catching
// it. What it does NOT protect is the number matching the runner's, and pretending otherwise
// was worse than the gap itself. Ficha I9 of docs/06-pendientes.md carries the fix.
//
// docs/08-pruebas.md is where this project declares test counts belong (see
// docs/04-convenciones.md and the root CLAUDE.md). For the unit counts specifically, this
// block is now that declared source — generated code cannot drift the way a typed sentence
// can — and 08-pruebas.md links here instead of repeating the numbers. It keeps declaring the
// e2e counts directly, because nothing here generates those (see docs/06-pendientes.md for
// why that stays manual).
//
// Why --check does not compare the commit/branch fields against live git, only the counts:
// a file cannot know the hash of the commit that is about to contain it — this repo does one
// commit per task, not a write-then-amend dance. Regenerate locally before committing and the
// pre-commit hook's `verify` sees a match (HEAD is still the parent at that point); the moment
// the commit lands, HEAD advances and the block's commit line is, by construction, one commit
// behind itself — forever, for every commit, not just this one. A PR-triggered CI checkout is
// the same story for the branch field: it runs detached, so `git rev-parse --abbrev-ref HEAD`
// reports "HEAD", not the branch that was checked out. Diffing either field byte-for-byte
// would make --check fail on every single commit regardless of whether anything is actually
// stale. So --check carries the file's existing commit/branch text forward unexamined (it
// only requires the line to be present and well-formed) and recomputes just the counts, which
// have no such structural lag — a hand-edited or genuinely outdated number still fails, which
// is the property this check exists for. `pnpm update:estado` always writes fresh commit and
// branch values; they are simply not part of what --check is able to hold accountable.

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, resolve } from "node:path";

const args = process.argv.slice(2);
const CHECK = args.includes("--check");
const ROOT = resolve(args.find((a) => a !== "--check") ?? ".");
const INDEX_FILE = join(ROOT, "docs", "00-INDEX.md");
const START = "<!-- estado:inicio -->";
const END = "<!-- estado:fin -->";

// Package name -> [source dir, test-file suffixes]. Suffixes checked with String#endsWith.
const PACKAGES = [
  { name: "shared", dir: "packages/shared/src", suffixes: [".test.ts"] },
  { name: "api", dir: "apps/api/src", suffixes: [".spec.ts"] },
  { name: "web", dir: "apps/web/src", suffixes: [".test.ts", ".test.tsx"] },
];

// A test declaration: `it(`/`test(` — or `it.each(...)`/`test.each(...)`, which declare one
// block that expands into several cases at run time and are counted once. Written anchored to
// the start of the line, not just "contains it(", so a variable named `unitCount` or a prose
// sentence in a fixture file cannot be mistaken for a test. `it.skip(`/`test.todo(` still do
// NOT match, so a skipped test does not count as one that runs.
const TEST_LINE_RE = /^\s*(it|test)(\.each|\()/;

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name === "__snapshots__") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function countTests(dir, suffixes) {
  const full = join(ROOT, dir);
  if (!existsSync(full)) return 0;
  let total = 0;
  for (const file of walk(full)) {
    if (!suffixes.some((s) => file.endsWith(s))) continue;
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    for (const line of lines) if (TEST_LINE_RE.test(line)) total++;
  }
  return total;
}

function git(cmd) {
  return execSync(`git ${cmd}`, { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] })
    .toString()
    .trim();
}

if (!existsSync(INDEX_FILE)) {
  console.error(`update-estado: no existe ${INDEX_FILE}`);
  process.exit(1);
}
const current = readFileSync(INDEX_FILE, "utf8");
const startAt = current.indexOf(START);
const endAt = current.indexOf(END);
if (startAt === -1 || endAt === -1 || endAt < startAt) {
  console.error(`update-estado: ${INDEX_FILE} no tiene un bloque ${START} ... ${END} válido`);
  process.exit(1);
}
const currentBlock = current.slice(startAt, endAt + END.length);

// The commit/branch line, so --check can carry it forward instead of recomputing it — see
// the comment above about why that field cannot be diffed against live git.
const COMMIT_LINE_RE =
  /\*\*Generado sobre el commit\*\* `([0-9a-f]{4,40})` \*\*\(rama `([^`]+)`\)\*\*/;
const existingMatch = currentBlock.match(COMMIT_LINE_RE);

let commit, branch;
if (CHECK) {
  if (!existingMatch) {
    console.error(
      "update-estado --check: no se encuentra la línea de commit/rama en el bloque de " +
        "docs/00-INDEX.md — ejecuta `pnpm update:estado`.",
    );
    process.exit(1);
  }
  [, commit, branch] = existingMatch;
} else {
  try {
    commit = git("rev-parse --short HEAD");
    branch = git("rev-parse --abbrev-ref HEAD");
  } catch {
    console.error("update-estado: no se pudo leer git (¿hay repositorio en " + ROOT + "?)");
    process.exit(1);
  }
}

const counts = PACKAGES.map((p) => ({ ...p, count: countTests(p.dir, p.suffixes) }));
const total = counts.reduce((sum, p) => sum + p.count, 0);
const detail = counts.map((p) => `${p.name} ${p.count}`).join(", ");

const block = [
  START,
  "> **Este bloque lo escribe una máquina (`pnpm update:estado`) y no se edita a mano.**",
  "> `pnpm verify` falla si no coincide con lo que el script generaría — ver",
  "> `scripts/update-estado.mjs`.",
  ">",
  `> - **Generado sobre el commit** \`${commit}\` **(rama \`${branch}\`)** — instantánea de la`,
  ">   última vez que alguien ejecutó `pnpm update:estado`, no un valor comprobado:",
  ">   `pnpm verify` solo vuelve a calcular las pruebas unitarias de abajo, nunca este",
  ">   commit ni esta rama, así que pueden quedar desactualizados varios commits — no",
  ">   necesariamente solo uno — sin que `check:estado` lo detecte.",
  `> - **Declaraciones de prueba unitaria:** ${total} (${detail}). **Es una cota inferior, no lo`,
  ">   que imprime el corredor**: un bloque `it.each` cuenta como la declaración que es y no",
  ">   como los casos que ejecuta, y hay más de cuarenta. Sirve para que nadie edite el número",
  ">   a mano —`check:estado` lo caza—, no para citar cuántas pruebas hay: eso lo dice",
  ">   `pnpm test`. Ver el comentario al principio del script, y la ficha I9 de",
  ">   [06-pendientes.md](./06-pendientes.md). Los conteos de e2e están en",
  ">   [08-pruebas.md](./08-pruebas.md).",
  END,
].join("\n");

const next = current.slice(0, startAt) + block + current.slice(endAt + END.length);

if (CHECK) {
  if (next === current) {
    console.log("update-estado --check: el bloque de estado coincide.");
    process.exit(0);
  }
  console.error(
    "update-estado --check: el bloque de estado de docs/00-INDEX.md no coincide con lo " +
      "generado (fuera del commit/rama, que --check no compara — ver el script). Ejecuta " +
      "`pnpm update:estado` y confirma el resultado.",
  );
  process.exit(1);
}

if (next === current) {
  console.log("update-estado: sin cambios (ya estaba al día).");
} else {
  writeFileSync(INDEX_FILE, next);
  console.log("update-estado: docs/00-INDEX.md actualizado.");
}
