import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { leerFoundry } from "../foundry.mjs";

// Tarea 3A.1 (T1), Step 3. Fuente sintética de 5 ficheros: un conjuro válido, un conjuro de la
// edición 2024 (rechazo), una carpeta (`_folder.yml`, se cuenta aparte), un `type: weapon` bajo
// `spells/` (rechazo declarado) y una aptitud válida bajo `classfeatures/`.

function fuenteSintetica() {
  const dir = mkdtempSync(join(tmpdir(), "convertir-catalogo-"));
  mkdirSync(join(dir, "spells", "cantrip"), { recursive: true });
  mkdirSync(join(dir, "classfeatures", "fighter"), { recursive: true });

  writeFileSync(join(dir, "spells", "_folder.yml"), "name: Spells\ntype: Item\n");

  writeFileSync(
    join(dir, "spells", "cantrip", "fire-bolt.yml"),
    [
      "name: Fire Bolt",
      "type: spell",
      "system:",
      "  identifier: fire-bolt",
      "  level: 0",
      "  source:",
      "    rules: '2014'",
    ].join("\n"),
  );

  writeFileSync(
    join(dir, "spells", "cantrip", "algo-2024.yml"),
    [
      "name: Algo 2024",
      "type: spell",
      "system:",
      "  identifier: algo-2024",
      "  source:",
      "    rules: '2024'",
    ].join("\n"),
  );

  writeFileSync(
    join(dir, "spells", "cantrip", "conjured-flame-blade.yml"),
    [
      "name: Flame Blade",
      "type: weapon",
      "system:",
      "  identifier: conjured-flame-blade",
      "  source:",
      "    rules: '2014'",
    ].join("\n"),
  );

  writeFileSync(
    join(dir, "classfeatures", "fighter", "second-wind.yml"),
    [
      "name: Second Wind",
      "type: feat",
      "system:",
      "  identifier: second-wind",
      "  source:",
      "    rules: '2014'",
    ].join("\n"),
  );

  return dir;
}

test("leerFoundry separa conjuros, aptitudes, carpetas y rechazos", () => {
  const dir = fuenteSintetica();
  try {
    const { spells, features, folders, rechazados } = leerFoundry(dir);

    assert.equal(spells.length, 1);
    assert.equal(spells[0].key, "fire-bolt");

    assert.equal(features.length, 1);
    assert.equal(features[0].key, "second-wind");

    assert.equal(folders, 1);

    assert.equal(rechazados.length, 2);
    const motivos = rechazados.map((r) => r.motivo).join(" | ");
    assert.match(motivos, /"2024"/);
    assert.match(motivos, /type: weapon/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
