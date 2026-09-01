import { describe, it, expect } from "vitest";
import { filterEntities } from "../filter";

interface Fixture {
  name: string;
  tags: string[];
}

const barovia: Fixture = { name: "Strahd von Zarovich", tags: ["Barovia", "villano"] };
const avernus: Fixture = { name: "Zariel", tags: ["Avernus"] };
const untagged: Fixture = { name: "Extra sin etiquetas", tags: [] };

describe("filterEntities", () => {
  it("returns everything when the filter is empty", () => {
    expect(filterEntities([barovia, avernus, untagged], { query: "", tags: [] })).toEqual([
      barovia,
      avernus,
      untagged,
    ]);
  });

  it("matches by name substring, case-insensitively", () => {
    expect(filterEntities([barovia, avernus], { query: "strahd", tags: [] })).toEqual([barovia]);
    expect(filterEntities([barovia, avernus], { query: "ZARIEL", tags: [] })).toEqual([avernus]);
  });

  it("matches by a single tag", () => {
    expect(filterEntities([barovia, avernus], { query: "", tags: ["Barovia"] })).toEqual([barovia]);
  });

  it("with two tags selected requires BOTH (logical AND), not either", () => {
    // barovia carries "Barovia" and "villano"; avernus carries neither.
    expect(filterEntities([barovia, avernus], { query: "", tags: ["Barovia", "villano"] })).toEqual(
      [barovia],
    );
    // An entity with only one of the two selected tags must not match.
    const onlyBarovia: Fixture = { name: "Ismark", tags: ["Barovia"] };
    expect(
      filterEntities([barovia, onlyBarovia], { query: "", tags: ["Barovia", "villano"] }),
    ).toEqual([barovia]);
  });

  it("combines query and tags with AND", () => {
    expect(filterEntities([barovia, avernus], { query: "strahd", tags: ["villano"] })).toEqual([
      barovia,
    ]);
    expect(filterEntities([barovia, avernus], { query: "zariel", tags: ["villano"] })).toEqual([]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(filterEntities([barovia, avernus], { query: "no existe", tags: [] })).toEqual([]);
  });

  it("an entity without tags never matches an active tag filter", () => {
    expect(filterEntities([untagged, barovia], { query: "", tags: ["Barovia"] })).toEqual([
      barovia,
    ]);
  });
});
