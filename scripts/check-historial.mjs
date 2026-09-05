#!/usr/bin/env node
// Fails if docs/07-historial.md grows past its ceiling.
//
// Why a machine checks this at all. The documentation protocol always said "archive the
// historial when it passes ~600 lines", and on 2026-09-03 the file measured **2192**. A
// threshold nobody enforces is not a threshold, it is a wish — the same lesson that produced
// scripts/check-docs.mjs and scripts/update-estado.mjs.
//
// Why the ceiling matters more here than tidiness. The main consumer of this documentation is
// an agent with no memory that re-reads it at the start of every session. When the corpus
// does not fit in its context it does not say so: it reads fragments and fills the gaps by
// inventing. A 2192-line historial is not read, it is skimmed, and a skimmed record is worse
// than an absent one — it lends the authority of a dated log to whatever the reader guessed.
//
// What to do when this fails: MOVE entries out to docs/_archivo/, whole and unedited. Do not
// summarise them to fit, and do not raise the limit to make the check pass — the project rule
// is that a dated record is never rewritten after the fact (docs/04-convenciones.md), and
// that a control that gets in the way is either obeyed or changed as a declared decision, not
// bypassed. What stays in 07 is one entry per delivery (a phase closing, its deploy, the
// review that closed it); what leaves is the per-task detail, which the ledger at
// .superpowers/sdd/progress.md already carries at higher resolution.
//
// The ceiling was 400 until 2026-09-05, and it moved to 1000 that day as exactly the declared
// decision this comment demands — the author's, written down in docs/04-convenciones.md. What
// forced it: one night closed six plans and wrote thirteen entries, and the check fired SEVEN
// times, so the archive was being used as a pressure valve rather than as an archive. 400 was
// sized for a slower rhythm. The reason for having a ceiling at all does not change with the
// number, and neither does the rule above: when this fails, entries move out whole.

import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(process.argv[2] ?? ".");
const FILE = join(ROOT, "docs", "07-historial.md");
const LIMIT = 1000;

if (!existsSync(FILE)) {
  console.error(`check-historial: no existe ${FILE}`);
  process.exit(1);
}

// Count the same way `wc -l` and every editor do: number of lines of text. A trailing
// newline at end of file does not add a phantom empty line.
const text = readFileSync(FILE, "utf8");
const lines = text.replace(/\r\n/g, "\n").replace(/\n$/, "").split("\n").length;

if (lines <= LIMIT) {
  console.log(`check-historial: docs/07-historial.md tiene ${lines} líneas (tope ${LIMIT}).`);
  process.exit(0);
}

console.error(
  `check-historial: docs/07-historial.md tiene ${lines} líneas y el tope son ${LIMIT}.\n` +
    `\n` +
    `  Mueve las entradas más antiguas a docs/_archivo/, ENTERAS Y SIN REESCRIBIR, y deja\n` +
    `  aquí un hito por entrega. El detalle por tarea ya vive en el ledger\n` +
    `  (.superpowers/sdd/progress.md).\n` +
    `\n` +
    `  No resumas una entrada para que quepa: un registro fechado no se reescribe.\n` +
    `  No subas el tope para que pase la comprobación: si el tope estorba, se cambia como\n` +
    `  decisión declarada en docs/04-convenciones.md, no en silencio.`,
);
process.exit(1);
