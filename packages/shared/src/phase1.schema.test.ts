import { describe, it, expect } from "vitest";
import { createCampaignSchema, updateCampaignSchema } from "./campaign.schema";
import { createEntitySchema, createEntityLinkSchema } from "./entity.schema";
import { visibilitySchema } from "./visibility.schema";
import { createCharacterSchema } from "./character.schema";
import { createSessionSchema } from "./session.schema";

describe("phase1 schemas", () => {
  it("createEntity defaults tags=[] and visibility=DM_ONLY", () => {
    const r = createEntitySchema.parse({ type: "NPC", name: "Strahd" });
    expect(r.tags).toEqual([]);
    expect(r.visibility).toBe("DM_ONLY");
  });
  it("createEntity rejects an invalid type", () => {
    expect(createEntitySchema.safeParse({ type: "DRAGON", name: "x" }).success).toBe(false);
  });
  it("visibility accepts SPECIFIC_PLAYERS, rejects junk", () => {
    expect(visibilitySchema.safeParse("SPECIFIC_PLAYERS").success).toBe(true);
    expect(visibilitySchema.safeParse("EVERYONE").success).toBe(false);
  });
  it("createCampaign requires a name", () => {
    expect(createCampaignSchema.safeParse({}).success).toBe(false);
    expect(createCampaignSchema.safeParse({ name: "Curse of Strahd" }).success).toBe(true);
  });
  it("createCharacter defaults level=1 and visibility=PLAYERS", () => {
    const r = createCharacterSchema.parse({ name: "Ezmerelda" });
    expect(r.level).toBe(1);
    expect(r.visibility).toBe("PLAYERS");
  });
  // D-CF-27: `race`/`class` de texto libre se retiraron del esquema (la clave del catálogo
  // manda). El esquema no es `.strict()`, así que una clave desconocida se descarta en
  // silencio: el resultado parseado no debe llevar ni rastro de ella.
  it("createCharacter strips a free-text race/class instead of storing it", () => {
    const r = createCharacterSchema.parse({ name: "Ezmerelda", race: "Elfo", class: "Bruja" });
    expect(r).not.toHaveProperty("race");
    expect(r).not.toHaveProperty("class");
  });
  it("createSession defaults visibility=PLAYERS and requires title", () => {
    expect(createSessionSchema.safeParse({}).success).toBe(false);
    expect(createSessionSchema.parse({ title: "Session 1" }).visibility).toBe("PLAYERS");
  });
  it("createEntityLink requires toId", () => {
    expect(createEntityLinkSchema.safeParse({ label: "lives in" }).success).toBe(false);
    expect(createEntityLinkSchema.safeParse({ toId: "abc" }).success).toBe(true);
  });
  it("updateCampaign accepts an empty object and an empty description (both optional)", () => {
    expect(updateCampaignSchema.safeParse({}).success).toBe(true);
    expect(updateCampaignSchema.safeParse({ description: "" }).success).toBe(true);
    expect(updateCampaignSchema.safeParse({ name: "" }).success).toBe(false); // still min(1) if present
  });
});
