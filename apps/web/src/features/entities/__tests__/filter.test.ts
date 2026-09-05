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

  it("**ya NO filtra por texto**, y eso es la ficha U3: el texto lo busca el servidor", () => {
    // **Esta prueba decía lo contrario hasta el 2026-09-06, y el cambio es deliberado.** Afirmaba
    // que `query` recortaba por nombre, que era cierto y era el problema: solo miraba el NOMBRE, así
    // que una ficha que dice «la puerta de sal» en su tercer párrafo era inencontrable, y el
    // navegador no puede arreglarlo porque el cuerpo hay que buscarlo donde está.
    //
    // Ahora lo hace el servidor, que además aplica `canView` **antes** que el texto — sin eso,
    // buscar sería un oráculo sobre fichas que no puedes ver. Dejar aquí una segunda comparación
    // del nombre habría dado dos filtros para lo mismo, con el de aquí ignorando el cuerpo.
    expect(filterEntities([barovia, avernus], { query: "strahd", tags: [] })).toEqual([
      barovia,
      avernus,
    ]);
    expect(filterEntities([barovia, avernus], { query: "no existe", tags: [] })).toEqual([
      barovia,
      avernus,
    ]);
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

  it("con etiquetas, el texto ya no recorta nada: manda la etiqueta", () => {
    // Las etiquetas **sí** siguen aquí: se resuelven sobre lo que ya está en pantalla y no
    // necesitan más filas. El texto lo ha aplicado el servidor antes de llegar.
    expect(filterEntities([barovia, avernus], { query: "strahd", tags: ["villano"] })).toEqual([
      barovia,
    ]);
    expect(filterEntities([barovia, avernus], { query: "zariel", tags: ["villano"] })).toEqual([
      barovia,
    ]);
  });

  it("devuelve una lista vacía cuando ninguna etiqueta casa", () => {
    expect(filterEntities([barovia, avernus], { query: "", tags: ["no existe"] })).toEqual([]);
  });

  it("an entity without tags never matches an active tag filter", () => {
    expect(filterEntities([untagged, barovia], { query: "", tags: ["Barovia"] })).toEqual([
      barovia,
    ]);
  });
});
