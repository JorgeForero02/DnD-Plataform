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
// Deliberately conservative: a false positive here costs somebody an argument with a script,
// so every check has an escape hatch documented below. It does depend on `git` now (see
// isGitIgnored below) — the one place that costs something is a Docker build context with no
// `.git` (scripts/install-git-hooks.mjs calls that out too); this script is not run there.
//
// Escape hatch: put <!-- docs-lint-ignore --> on the line, or anywhere in a fenced code block,
// and that line is skipped. Use it for a single legitimate mention that happens to trip a
// check — e.g. a living doc correctly saying "docs/DEPLOY.md se eliminó" while explaining a
// past deletion; the file not existing is the point of the sentence, not an error.
//
// docs/07-historial.md is exempt from the counts check only (COUNTS_EXEMPT): each entry is a
// dated snapshot of that day's numbers, but paths inside it must still resolve — an
// abbreviated path there is a typo to fix, not a claim to preserve.
//
// docs/superpowers/specs/ and docs/superpowers/plans/ are exempt from every check, file by
// file rather than line by line (DATED_RECORD_DIRS): a spec is the brief as given on the day
// it was written, a plan is what got derived from it, and both are read once to produce the
// next document, then never revisited. A stale path or a hypothetical "(3 tests)" inside one
// is not a documentation lie, because the document never claimed to describe today — and
// dozens of individually-marked escape hatches across one frozen plan (see
// docs/superpowers/plans/2026-07-02-plataforma-dnd.md) would be noise nobody could review.
// A newer plan or spec dropped into these same directories still gets this exemption, which
// is deliberate: it is exempt because of what kind of document it is, not because it is old.
// This does cost real coverage — docs/superpowers/specs/2026-09-01-cierre-fase-1-congruencia-
// design.md cites an abbreviated path that would otherwise be a legitimate finding — and that
// is accepted, not overlooked: a dated record is not rewritten after the fact (see the
// "toda revisión..." rule in docs/04-convenciones.md), so a finding here is one this script
// would refuse to act on either way. Reporting it would just be noise nobody can clear.
//
// A cited path that does not exist under any BASE is still not necessarily wrong: this
// project's own docs cite files that are deliberately excluded from the clone (the ledger
// under .superpowers/, apps/api/.env) — see the git-ignore check below. Reporting those as
// broken paths would be exactly backwards: it would make check:docs pass on a machine that
// happens to have local, gitignored files lying around and FAIL on a clean checkout or in
// CI, which is the one place this check matters most. So before a missing path is reported,
// this script asks `git check-ignore` whether the repository itself would have excluded it;
// if git says yes, the citation is left alone.

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, relative, resolve } from "node:path";

const ROOT = resolve(process.argv[2] ?? ".");
const COUNTS_SOURCE = "docs/08-pruebas.md";
const COUNTS_EXEMPT = [COUNTS_SOURCE, "docs/07-historial.md"];
// docs/_archivo/ joins them for the same reason and one stronger (added 2026-09-02): the
// documentation protocol forbids editing anything in there at all, so a finding inside it
// could never be acted on. A frozen record legitimately carries the test counts of its day
// and cites paths that have since been deleted ON PURPOSE — EditorFicha.tsx, removed
// 2026-09-02, is named there because that is what was true then. Linting it would demand
// falsifying the archive to make a check pass.
const DATED_RECORD_DIRS = ["docs/superpowers/specs", "docs/superpowers/plans", "docs/_archivo"];
const IGNORE = "docs-lint-ignore";

// Roots a doc might be citing from. Order does not matter; any hit means the path is real.
// Deliberately does NOT include packages/shared (only packages/shared/src): its dist/ is a
// gitignored build artifact, and `git clone && pnpm check:docs` — no install, no build — would
// see it missing and report a false finding. docs/02-entorno.md:71 cites
// packages/shared/dist/index.js on purpose (it is package.json's own "main"); that one line
// carries a docs-lint-ignore instead of teaching the lint to depend on a build.
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
const ignoreCache = new Map();

// Whether the repository's own .gitignore would exclude this path — checked lazily, once per
// candidate, and cached: this runs once per doc-lint invocation, not per commit, so a few
// extra `git` processes are cheap next to the false positives they prevent. Returns false (not
// ignored) on any error, including "not a git repository" — the conservative default, since a
// path this script cannot prove is deliberately excluded should still be reported.
function isGitIgnored(relPath) {
  if (ignoreCache.has(relPath)) return ignoreCache.get(relPath);
  let ignored = false;
  try {
    execFileSync("git", ["check-ignore", "-q", "--", relPath], {
      cwd: ROOT,
      stdio: "ignore",
    });
    ignored = true; // exit 0 = matched a .gitignore rule
  } catch {
    ignored = false; // exit 1 = not ignored; any other failure (no git repo, etc.) too
  }
  ignoreCache.set(relPath, ignored);
  return ignored;
}

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

function isDatedRecord(rel) {
  return DATED_RECORD_DIRS.some((d) => rel.startsWith(d + "/"));
}

const docsDir = join(ROOT, "docs");
if (!existsSync(docsDir)) {
  console.error("check-docs: no docs/ directory at " + ROOT);
  process.exit(1);
}

// docs/ recursively, plus root-level .md files (CLAUDE.md, AGENTS.md, a README if one shows
// up) — not the whole repo root, just its top level: those are the files that make claims
// about the project the same way docs/ does, and this diff itself edited CLAUDE.md for
// exactly that reason. Everything nested under the root (apps/, packages/, node_modules/...)
// stays out of scope; the walk() above only ever recurses into docs/.
const rootMdFiles = readdirSync(ROOT)
  .filter((name) => name.endsWith(".md") && statSync(join(ROOT, name)).isFile())
  .map((name) => join(ROOT, name));

for (const file of [...walk(docsDir), ...rootMdFiles]) {
  const rel = relative(ROOT, file).replaceAll("\\", "/");
  if (isDatedRecord(rel)) continue;
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  let inFence = false;

  lines.forEach((line, i) => {
    const at = `${rel}:${i + 1}`;
    if (/^\s*```/.test(line)) inFence = !inFence;
    if (inFence || line.includes(IGNORE)) return;

    // 1 — counts outside the single source
    if (!COUNTS_EXEMPT.includes(rel) && COUNT_RE.test(line)) {
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
      const candidates = BASES.map((b) => join(ROOT, b, path));
      const target = candidates.find((c) => existsSync(c));
      if (!target) {
        const deliberatelyExcluded = candidates.some((c) =>
          isGitIgnored(relative(ROOT, c).replaceAll("\\", "/")),
        );
        if (deliberatelyExcluded) continue;
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
