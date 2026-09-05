import { describe, expect, it } from "vitest";
import type { Entity } from "../../../entities/api";
import { citasDelTexto, resolverCitas } from "../wikilinks";

// Qué defiende este fichero: **que `[[nombre]]` no se trague media ficha, no invente enlaces y no
// se calle lo que no encontró.**
//
// Es el otro módulo puro del taller, y por la misma razón que `posiciones.ts` merece pruebas de
// verdad: se puede ejecutar entero en `node`, sin navegador ni servidor, así que no hay excusa
// para dejar su comportamiento escrito solo en un comentario.

function ficha(id: string, name: string): Entity {
  return {
    id,
    campaignId: "c1",
    type: "LOCATION",
    name,
    tags: [],
    visibility: "DM_ONLY",
    createdById: "u-dm",
    createdAt: "2026-09-04T00:00:00.000Z",
  };
}

describe("sacar los [[nombre]] de la prosa", () => {
  it("saca los nombres en el orden en que aparecen", () => {
    const citas = citasDelTexto("Llegan a [[El Puerto Viejo]] y preguntan por [[Elara]].");
    expect(citas.map((c) => c.texto)).toEqual(["El Puerto Viejo", "Elara"]);
  });

  // **Un `[[` suelto en un párrafo no debe tragarse media ficha.** Sin este corte, escribir dos
  // corchetes por accidente convertiría el resto del texto en un nombre.
  it("ignora un [[ sin cerrar", () => {
    expect(citasDelTexto("Llegan a [[El Puerto Viejo y preguntan por Elara.")).toEqual([]);
    expect(citasDelTexto("Un [[ suelto y luego [[Elara]] de verdad").map((c) => c.texto)).toEqual([
      "Elara",
    ]);
  });

  // Y tampoco cruza un salto de línea: el par de corchetes vive dentro de una línea o no vive.
  it("no cruza un salto de línea dentro de los corchetes", () => {
    expect(citasDelTexto("Llegan a [[El Puerto\nViejo]] al anochecer.")).toEqual([]);
  });

  // Escribir el mismo nombre tres veces crea un enlace, no tres.
  it("no repite un nombre citado varias veces", () => {
    const citas = citasDelTexto("[[Elara]] mira a [[elara]] y luego a [[  ELARA  ]].");
    expect(citas).toHaveLength(1);
    // Se conserva la primera forma tal y como la escribió el DM, para poder señalarla en pantalla.
    expect(citas[0].texto).toBe("Elara");
  });

  // Los espacios de sobra son de quien teclea, no del nombre: se recortan para comparar y el
  // texto original se guarda aparte.
  it("recorta los espacios de sobra y colapsa los de dentro", () => {
    const [cita] = citasDelTexto("[[  El   Puerto   Viejo  ]]");
    expect(cita.texto).toBe("El   Puerto   Viejo");
    expect(cita.clave).toBe("el puerto viejo");
  });

  // Unos corchetes vacíos no son una cita: no hay nada que buscar.
  it("descarta unos corchetes con nada dentro", () => {
    expect(citasDelTexto("[[]] y [[   ]]")).toEqual([]);
  });
});

describe("casar las citas con las fichas de la campaña", () => {
  const puerto = ficha("e-puerto", "El Puerto Viejo");
  const elara = ficha("e-elara", "Elara");

  it("encuentra la ficha ignorando mayúsculas y espacios de sobra", () => {
    const resultado = resolverCitas(citasDelTexto("[[  el puerto   VIEJO ]]"), [puerto, elara]);
    expect(resultado.encontradas).toHaveLength(1);
    expect(resultado.encontradas[0].fichaDestino.id).toBe("e-puerto");
    expect(resultado.sinFicha).toEqual([]);
  });

  // **Lo que no existe se nombra, no desaparece.** El DM tiene que enterarse de que ese enlace no
  // se tendió; un silencio aquí es un enlace perdido sin aviso.
  it("nombra las citas que no son ninguna ficha", () => {
    const resultado = resolverCitas(citasDelTexto("[[El Puerto Viejo]] y [[Nadie]]"), [puerto]);
    expect(resultado.encontradas).toHaveLength(1);
    expect(resultado.sinFicha.map((c) => c.texto)).toEqual(["Nadie"]);
  });

  // **La autocita tiene lista propia**, y ese es el punto: antes se caía por el hueco entre las
  // otras dos —ni enlazada ni «sin ficha»— y el aviso de pantalla no decía nada de ella. Está
  // bien no enlazar una ficha consigo misma; está mal callarlo.
  it("una ficha que se cita a sí misma va a su propia lista, ni enlazada ni dada por inexistente", () => {
    const resultado = resolverCitas(citasDelTexto("Ver [[El Puerto Viejo]]"), [puerto], "e-puerto");
    expect(resultado.encontradas).toEqual([]);
    expect(resultado.sinFicha).toEqual([]);
    expect(resultado.aSiMisma.map((c) => c.texto)).toEqual(["El Puerto Viejo"]);
  });

  // Dos fichas con el mismo nombre: gana **la primera de la lista**, y el servidor devuelve las
  // entidades de más nueva a más vieja (`entities.service.ts`, `orderBy: { createdAt: "desc" }`),
  // así que en la pantalla eso es «gana la más reciente». La ambigüedad se resuelve a mano en el
  // panel de enlaces: inventar un desempate sería adivinar.
  it("con nombres duplicados gana la primera de la lista, que es la más reciente", () => {
    const vieja = ficha("e-vieja", "Almacén cuatro");
    const nueva = ficha("e-nueva", "Almacén cuatro");
    // Orden del servidor: la más reciente primero.
    const resultado = resolverCitas(citasDelTexto("[[Almacén cuatro]]"), [nueva, vieja]);
    expect(resultado.encontradas[0].fichaDestino.id).toBe("e-nueva");
  });

  // Y es determinista: la misma lista da siempre el mismo ganador, tantas veces como se pida.
  it("y el desempate es determinista", () => {
    const a = ficha("e-a", "Almacén cuatro");
    const b = ficha("e-b", "Almacén cuatro");
    const citas = citasDelTexto("[[Almacén cuatro]]");
    for (let i = 0; i < 5; i += 1) {
      expect(resolverCitas(citas, [a, b]).encontradas[0].fichaDestino.id).toBe("e-a");
    }
  });

  // **Comportamiento actual, no deseo: los acentos NO se normalizan.** `[[bahia]]` no encuentra
  // «Bahía». Es una decisión que hoy no está declarada en ningún sitio, así que se fija aquí para
  // que quien la cambie sepa que rompe esta prueba **a propósito** y no por accidente — y para
  // que, si se cambia, se cambie con su línea en `docs/06-pendientes.md`.
  it("no normaliza los acentos: [[bahia]] no encuentra «Bahía»", () => {
    const bahia = ficha("e-bahia", "Bahía");
    const resultado = resolverCitas(citasDelTexto("[[bahia]]"), [bahia]);
    expect(resultado.encontradas).toEqual([]);
    expect(resultado.sinFicha.map((c) => c.texto)).toEqual(["bahia"]);
    // Escrito con su acento sí la encuentra, así que el fallo es solo de acentos y no del casado.
    expect(resolverCitas(citasDelTexto("[[BAHÍA]]"), [bahia]).encontradas).toHaveLength(1);
  });

  // Sin citas no hay nada que resolver, y las tres listas salen vacías en vez de indefinidas.
  it("un texto sin citas resuelve a tres listas vacías", () => {
    const resultado = resolverCitas(citasDelTexto("Prosa sin corchetes."), [puerto]);
    expect(resultado).toEqual({ encontradas: [], sinFicha: [], aSiMisma: [] });
  });
});
