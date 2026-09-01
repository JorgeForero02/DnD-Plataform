import { describe, it, expect } from "vitest";
import { createEntitySchema, entityBodySchema } from "./entity.schema";

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
