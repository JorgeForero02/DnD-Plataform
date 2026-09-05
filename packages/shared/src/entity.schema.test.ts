import { describe, it, expect } from "vitest";
import { createEntitySchema, entityBodySchema, updateEntitySchema } from "./entity.schema";

describe("entityBodySchema", () => {
  it("accepts a well-formed markdown body", () => {
    const r = entityBodySchema.safeParse({ format: "markdown", text: "## Hola" });
    expect(r.success).toBe(true);
  });
  it("rejects a format other than markdown", () => {
    const r = entityBodySchema.safeParse({ format: "html", text: "<p>hi</p>" });
    expect(r.success).toBe(false);
  });
  it("rejects text longer than 50000 characters", () => {
    const r = entityBodySchema.safeParse({ format: "markdown", text: "a".repeat(50001) });
    expect(r.success).toBe(false);
  });
  it("accepts text at exactly the 50000 character limit", () => {
    const r = entityBodySchema.safeParse({ format: "markdown", text: "a".repeat(50000) });
    expect(r.success).toBe(true);
  });
  it("accepts an empty string as a way to clear the body", () => {
    const r = entityBodySchema.safeParse({ format: "markdown", text: "" });
    expect(r.success).toBe(true);
  });
});

describe("createEntitySchema body", () => {
  it("accepts an entity with no body at all (optional)", () => {
    const r = createEntitySchema.safeParse({ type: "NPC", name: "Strahd" });
    expect(r.success).toBe(true);
  });
  it("rejects an entity whose body has an invalid format", () => {
    const r = createEntitySchema.safeParse({
      type: "NPC",
      name: "Strahd",
      body: { format: "html", text: "<p>hi</p>" },
    });
    expect(r.success).toBe(false);
  });
  it("rejects an entity whose body text is too long", () => {
    const r = createEntitySchema.safeParse({
      type: "NPC",
      name: "Strahd",
      body: { format: "markdown", text: "a".repeat(50001) },
    });
    expect(r.success).toBe(false);
  });
  it("accepts an entity with a well-formed body", () => {
    const r = createEntitySchema.safeParse({
      type: "NPC",
      name: "Strahd",
      body: { format: "markdown", text: "## Título" },
    });
    expect(r.success).toBe(true);
  });
});

describe("etiquetas: se normalizan al guardar, no se rechazan", () => {
  // Escribir «lich, lich» persistía `["lich","lich"]`. Las filas dedupaban **al pintar**, que tapa
  // el síntoma y deja la fila sucia. Se normaliza en el esquema compartido —y no en la pantalla—
  // porque la web no es la única puerta: una normalización que solo hace el cliente es una que la
  // API no tiene.

  it("**un duplicado no se rechaza: se queda en uno**", () => {
    const r = createEntitySchema.parse({
      type: "NPC",
      name: "Vecna",
      tags: ["lich", "lich"],
    });
    expect(r.tags).toEqual(["lich"]);
  });

  it("conserva el orden de la primera aparición, que es el que quien escribe tiene en la cabeza", () => {
    const r = createEntitySchema.parse({
      type: "NPC",
      name: "Vecna",
      tags: ["lich", "mago", "lich", "villano"],
    });
    expect(r.tags).toEqual(["lich", "mago", "villano"]);
  });

  it("no toca las que ya son únicas", () => {
    const r = createEntitySchema.parse({ type: "NPC", name: "X", tags: ["a", "b"] });
    expect(r.tags).toEqual(["a", "b"]);
  });

  it("sin etiquetas sigue dando la lista vacía", () => {
    expect(createEntitySchema.parse({ type: "NPC", name: "X" }).tags).toEqual([]);
  });

  it("**y un PATCH sin `tags` no las trae**, que es lo que impide borrarlas en silencio", () => {
    // Hoy funciona por la alineación de dos detalles: `.partial()` sobre el `.default([])`, y la
    // guarda `!== undefined` del servicio. Quien quite cualquiera de los dos **borra etiquetas sin
    // decir nada**, y por eso esto se fija aquí.
    const r = updateEntitySchema.parse({ name: "Otro nombre" });
    expect("tags" in r).toBe(false);
  });

  it("y un PATCH CON `tags` duplicadas también las normaliza", () => {
    const r = updateEntitySchema.parse({ tags: ["orco", "orco", "jefe"] });
    expect(r.tags).toEqual(["orco", "jefe"]);
  });
});
