import { describe, expect, it } from "vitest";
import type { Entity } from "../../../entities/api";
import { citasDelTexto, resolverCitas } from "../wikilinks";

// Qué defiende este fichero: **que `[[nombre]]` no se trague media ficha, no invente enlaces y no
// se calle lo que no encontró.**
//
// Es un módulo puro del taller, y por la misma razón que `mundo/arbolDelMundo.ts` merece pruebas de
// verdad: se puede ejecutar entero en `node`, sin navegador ni servidor, así que no hay excusa
// para dejar su comportamiento escrito solo en un comentario.

function ficha(id: string, name: string, createdAt = "2026-09-04T00:00:00.000Z"): Entity {
  return {
    id,
    campaignId: "c1",
    type: "LOCATION",
    name,
    tags: [],
    visibility: "DM_ONLY",
    createdById: "u-dm",
    createdAt,
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

  // Dos fichas con el mismo nombre: gana **la más reciente**. `resolverCitas` ordena ella misma
  // por `createdAt` desc antes de elegir — no depende de que quien la llame ya traiga la lista en
  // ese orden (el servidor sí la manda así, `entities.service.ts`,
  // `orderBy: { createdAt: "desc" }`, pero eso es una coincidencia de hoy, no un contrato). La
  // ambigüedad se resuelve a mano en el panel de enlaces: inventar un desempate sería adivinar.
  it("con nombres duplicados gana la más reciente, venga en el orden que venga la lista", () => {
    const vieja = ficha("e-vieja", "Almacén cuatro", "2026-09-01T00:00:00.000Z");
    const nueva = ficha("e-nueva", "Almacén cuatro", "2026-09-04T00:00:00.000Z");
    // Orden del servidor: la más reciente primero.
    const resultado = resolverCitas(citasDelTexto("[[Almacén cuatro]]"), [nueva, vieja]);
    expect(resultado.encontradas[0].fichaDestino.id).toBe("e-nueva");
  });

  // La prueba que de verdad defiende el ordenar: la lista llega **al revés** (la más vieja
  // primero, como si quien llama no supiera del contrato del servidor) y aun así gana la más
  // reciente.
  it("gana la más reciente aunque la lista llegue en orden inverso", () => {
    const vieja = ficha("e-vieja", "Almacén cuatro", "2026-09-01T00:00:00.000Z");
    const nueva = ficha("e-nueva", "Almacén cuatro", "2026-09-04T00:00:00.000Z");
    const resultado = resolverCitas(citasDelTexto("[[Almacén cuatro]]"), [vieja, nueva]);
    expect(resultado.encontradas[0].fichaDestino.id).toBe("e-nueva");
  });

  // Fix round 1 (9b, Important): a igual `createdAt` el desempate es por `id`, no por el orden
  // de llegada. Antes de este arreglo, dos `createdAt` iguales dejaban el resultado en manos del
  // orden de `fichas` (un `sort` estable no reordena los empates); esta prueba lo comprueba con
  // el id "mayor" primero en la lista, para que un desempate por orden de llegada (en vez de por
  // id) se note.
  it("con el mismo createdAt, gana el id menor, venga en el orden que venga la lista", () => {
    const mismaFecha = "2026-09-04T00:00:00.000Z";
    const b = ficha("e-b", "Almacén cuatro", mismaFecha);
    const a = ficha("e-a", "Almacén cuatro", mismaFecha);
    // "e-b" llega primero en la lista; si el desempate fuera por orden de llegada (no por id),
    // ganaría "e-b".
    const resultado = resolverCitas(citasDelTexto("[[Almacén cuatro]]"), [b, a]);
    expect(resultado.encontradas[0].fichaDestino.id).toBe("e-a");
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

  // **Los acentos ya no separan una cita de su ficha (P4, cerrada el 2026-09-07).** Hasta hoy
  // esta prueba fijaba lo contrario —`[[bahia]]` daba «Bahía» por inexistente— y su comentario
  // avisaba de que cambiarla sería a propósito. Esto es ese propósito: para un mundo escrito en
  // español, que el DM escriba el enlace sin tilde y la ficha se anuncie como inexistente muerde
  // a diario. La decisión queda en `docs/decisiones.md`.
  it("normaliza los acentos: [[bahia]] encuentra «Bahía»", () => {
    const bahia = ficha("e-bahia", "Bahía");
    const resultado = resolverCitas(citasDelTexto("[[bahia]]"), [bahia]);
    expect(resultado.encontradas).toHaveLength(1);
    expect(resultado.encontradas[0].fichaDestino.id).toBe("e-bahia");
    expect(resultado.sinFicha).toEqual([]);
    // Y sigue encontrándola escrita con su acento, en cualquier caja.
    expect(resolverCitas(citasDelTexto("[[BAHÍA]]"), [bahia]).encontradas).toHaveLength(1);
  });

  // **El texto que se enseña en pantalla no se toca**: la normalización es solo para comparar.
  // Si el aviso mostrara la forma normalizada, el DM leería un nombre que él no escribió.
  it("normalizar para comparar no reescribe lo que el DM tecleó", () => {
    const [cita] = citasDelTexto("[[Bahía de los Ahogados]]");
    expect(cita.texto).toBe("Bahía de los Ahogados");
    expect(cita.clave).toBe("bahia de los ahogados");
  });

  // **La ñ también se pliega, y se dice aquí porque es la parte discutible.** En español la ñ es
  // letra propia, no una n con adorno, así que plegarla es una concesión deliberada a quien
  // teclea sin ella — la misma que ya hace `claveDeConcentracion` en
  // `apps/web/src/features/character-sheet/vocabulario.ts`. Casar de más aquí solo tiende un
  // enlace que el DM pidió; casar de menos lo pierde en silencio.
  it("pliega también la ñ y la diéresis", () => {
    const montana = ficha("e-montana", "Paso de la Montaña");
    const pinguino = ficha("e-pinguino", "Bahía del Pingüino");
    const resultado = resolverCitas(
      citasDelTexto("[[Paso de la Montana]] y [[bahia del pinguino]]"),
      [montana, pinguino],
    );
    expect(resultado.encontradas.map((e) => e.fichaDestino.id)).toEqual([
      "e-montana",
      "e-pinguino",
    ]);
    expect(resultado.sinFicha).toEqual([]);
  });

  // **Dos fichas que solo se distinguen por la tilde ahora colisionan**, y el desempate es el que
  // ya existía: gana la primera de la lista. Se fija para que la colisión no sea una sorpresa el
  // día que aparezca — es el precio declarado de plegar acentos, no un fallo nuevo.
  it("dos fichas que solo difieren en la tilde colisionan, y gana la primera de la lista", () => {
    const conTilde = ficha("e-con", "Bahía");
    const sinTilde = ficha("e-sin", "Bahia");
    const resultado = resolverCitas(citasDelTexto("[[bahia]]"), [conTilde, sinTilde]);
    expect(resultado.encontradas).toHaveLength(1);
    expect(resultado.encontradas[0].fichaDestino.id).toBe("e-con");
  });

  // Sin citas no hay nada que resolver, y las tres listas salen vacías en vez de indefinidas.
  it("un texto sin citas resuelve a tres listas vacías", () => {
    const resultado = resolverCitas(citasDelTexto("Prosa sin corchetes."), [puerto]);
    expect(resultado).toEqual({ encontradas: [], sinFicha: [], aSiMisma: [] });
  });
});
