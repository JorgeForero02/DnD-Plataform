import { describe, expect, it } from "vitest";
import type { GameEventPayload } from "@dnd/shared";
import { datosDeTirada, type DatosDeTirada } from "../tirada";

// Qué defiende este fichero: **que la tirada incrustada REPRODUCE lo que el servidor guardó y no
// recompone ni un número**, y que lo que la maqueta pinta aparte —el dado natural, el veredicto—
// se sigue viendo aparte.
//
// Es la capa que más se puede romper en silencio: una suma «de más» en el desglose no rompe nada
// visible mientras los payloads de prueba sean coherentes. Por eso varias de estas pruebas usan
// payloads **deliberadamente incoherentes**: un total que no cuadra con sus dados es la única
// forma de distinguir «lo lee» de «lo calcula».

type ConTipo<T extends GameEventPayload["type"]> = Extract<GameEventPayload, { type: T }>;

function tiradaDeHabilidad(campos: Partial<ConTipo<"ABILITY_ROLL">> = {}): GameEventPayload {
  return {
    type: "ABILITY_ROLL",
    expression: "2d20kh1+4",
    rolls: [18, 3],
    kept: [18],
    dropped: [3],
    modifier: 4,
    total: 22,
    natural: "NONE",
    outcome: "NO_DC",
    ...campos,
  };
}

/** Todo el desglose en una sola cadena: es lo que el lector acaba viendo en la pantalla. */
function textoDe(datos: DatosDeTirada | null): string {
  if (!datos) return "";
  const pasos = datos.desglose.map((p) => `${p.origen}: ${p.valor}`).join(" · ");
  return `${datos.prueba} · ${datos.resultado} · ${datos.veredicto ?? "sin veredicto"} · ${pasos}`;
}

describe("el desglose sale del payload y no se recalcula", () => {
  // **La prueba central del fichero.** El payload dice 99 con unos dados que suman 22: si alguien
  // mete una suma en el cliente «para que cuadre», la salida diría 22 y esto se pone rojo. El
  // total lo calcula el servidor, que es quien tiró.
  it("pinta el total que trae el suceso, aunque no cuadre con sus dados", () => {
    const datos = datosDeTirada(tiradaDeHabilidad({ total: 99 }));
    expect(datos?.resultado).toBe(99);
    expect(datos?.desglose).toContainEqual({ origen: "Total", valor: "99" });
    expect(textoDe(datos)).not.toContain("22");
  });

  // Los tres conjuntos se enseñan tal cual: lo que salió, lo que se conservó y lo que se descartó.
  // Sin los tres no se puede auditar una tirada con ventaja.
  it("enseña los dados, lo conservado y lo descartado tal y como llegaron", () => {
    const datos = datosDeTirada(tiradaDeHabilidad({ total: 99 }));
    expect(datos?.desglose).toContainEqual({ origen: "Dados", valor: "18, 3" });
    expect(datos?.desglose).toContainEqual({ origen: "Se conserva", valor: "18" });
    expect(datos?.desglose).toContainEqual({ origen: "Se descarta", valor: "3" });
    expect(datos?.desglose).toContainEqual({ origen: "Modificador", valor: "+4" });
  });

  // Sin descartes no se pintan dos filas vacías: una tirada simple se lee de un vistazo.
  it("omite conservado y descartado cuando no se descartó nada", () => {
    const datos = datosDeTirada(
      tiradaDeHabilidad({ rolls: [12], kept: [12], dropped: [], modifier: 0, total: 12 }),
    );
    const origenes = datos?.desglose.map((p) => p.origen);
    expect(origenes).not.toContain("Se conserva");
    expect(origenes).not.toContain("Se descarta");
    // Un modificador de cero tampoco ocupa una fila: no aporta nada que leer.
    expect(origenes).not.toContain("Modificador");
  });

  // El modificador negativo se lee como negativo. Un «+-2» sería un defecto de lectura.
  it("escribe el signo del modificador", () => {
    const datos = datosDeTirada(tiradaDeHabilidad({ modifier: -2, total: 16 }));
    expect(datos?.desglose).toContainEqual({ origen: "Modificador", valor: "-2" });
  });
});

describe("el dado natural y el veredicto son dos hechos distintos", () => {
  // El esquema los guarda por separado a propósito: **un 20 natural que no llega a la dificultad
  // sigue siendo un 20 natural**. Los dos tienen que verse, y el uno no puede tapar al otro.
  it("un 20 natural que falla enseña el 20 Y el fallo", () => {
    const datos = datosDeTirada(
      tiradaDeHabilidad({ natural: "TWENTY", outcome: "FAILURE", dc: 25, total: 24 }),
    );
    expect(datos?.desglose).toContainEqual({ origen: "Dado natural", valor: "20" });
    expect(datos?.veredicto).toBe("FALLO");
  });

  // El caso simétrico: un 1 natural que aun así supera la dificultad.
  it("un 1 natural que acierta enseña el 1 Y el éxito", () => {
    const datos = datosDeTirada(
      tiradaDeHabilidad({ natural: "ONE", outcome: "SUCCESS", dc: 5, total: 6 }),
    );
    expect(datos?.desglose).toContainEqual({ origen: "Dado natural", valor: "1" });
    expect(datos?.veredicto).toBe("EXITO");
  });

  // Sin dificultad no hay veredicto: hay número, pero no hay nada que superar. `null` y no
  // «fallo», que es la lectura equivocada de una tirada suelta.
  it("una tirada sin dificultad no tiene veredicto", () => {
    const datos = datosDeTirada(tiradaDeHabilidad({ outcome: "NO_DC" }));
    expect(datos?.veredicto).toBeNull();
    expect(datos?.dificultad).toBeUndefined();
    expect(textoDe(datos)).not.toContain("Dificultad");
  });

  // Cuando sí la hay, se enseña: es contra lo que se comparó.
  it("una tirada con dificultad la enseña", () => {
    const datos = datosDeTirada(tiradaDeHabilidad({ dc: 16, outcome: "SUCCESS" }));
    expect(datos?.dificultad).toBe(16);
    expect(datos?.desglose).toContainEqual({ origen: "Dificultad", valor: "16" });
  });
});

describe("el ataque no pinta la clase de armadura (D-OP-11)", () => {
  const ataque: GameEventPayload = {
    type: "ATTACK_RESOLVED",
    attackerId: "c-elara",
    attackName: "Espada larga",
    verdict: "HIT",
    rollEventId: "ev-tirada",
  };

  // **La decisión D-OP-11, y la prueba que impide que alguien «arregle» el hueco de buena fe.**
  // La dificultad de un ataque es la CA del objetivo, y lo que sale es la palabra —impacta,
  // falla, crítico—, nunca el número contra el que se tiró. La tirada ligada SÍ trae ese número:
  // que esté ahí y no se pinte es justo lo que se está defendiendo.
  it("no enseña la CA ni cuando la tirada ligada la trae", () => {
    const ligada = tiradaDeHabilidad({ dc: 16, outcome: "SUCCESS", total: 22 });
    const datos = datosDeTirada(ataque, ligada);
    expect(datos).not.toBeNull();
    expect(datos?.dificultad).toBeUndefined();
    const texto = textoDe(datos);
    expect(texto).not.toContain("16");
    expect(texto.toLowerCase()).not.toContain("dificultad");
  });

  // Lo que sí toma de la tirada ligada: sus números, sin recomponer ninguno.
  it("toma los números de la tirada ligada tal cual", () => {
    const ligada = tiradaDeHabilidad({ total: 99, natural: "TWENTY" });
    const datos = datosDeTirada(ataque, ligada);
    expect(datos?.prueba).toBe("Espada larga");
    expect(datos?.resultado).toBe(99);
    expect(datos?.desglose).toContainEqual({ origen: "Total", valor: "99" });
    expect(datos?.desglose).toContainEqual({ origen: "Dado natural", valor: "20" });
  });

  // El veredicto del ataque es del ataque, no de la tirada: el `outcome` de la ligada no manda.
  it("el veredicto lo pone el ataque, no la tirada ligada", () => {
    const ligada = tiradaDeHabilidad({ outcome: "SUCCESS", dc: 5 });
    expect(datosDeTirada({ ...ataque, verdict: "MISS" }, ligada)?.veredicto).toBe("FALLO");
    expect(datosDeTirada({ ...ataque, verdict: "CRITICAL" }, ligada)?.veredicto).toBe("EXITO");
  });

  // **No se inventa un desglose que no llegó.** Si la tirada quedó fuera de la ventana del
  // registro —o el espectador no puede verla— el mensaje se lee como la frase que ya escribe
  // `linea-de-log.ts`, y eso vale bastante más que medio desglose con huecos.
  it("sin su tirada en la ventana devuelve null, no un desglose a medias", () => {
    expect(datosDeTirada(ataque)).toBeNull();
    expect(datosDeTirada(ataque, null)).toBeNull();
    expect(datosDeTirada(ataque, undefined)).toBeNull();
  });

  // Y tampoco vale una tirada de otro tipo: una salvación de muerte no es la tirada de un ataque.
  it("con un payload ligado de otro tipo también devuelve null", () => {
    const salvacion: GameEventPayload = {
      type: "DEATH_SAVE",
      roll: 12,
      result: "SUCCESS",
      successes: 1,
      failures: 0,
    };
    expect(datosDeTirada(ataque, salvacion)).toBeNull();
  });
});

describe("las otras dos tiradas", () => {
  // Una salvación de muerte tiene cuatro resultados y dos tonos: el matiz (el 20 que devuelve a
  // la vida, el 1 que cuenta doble) lo escribe la frase de encima, no este bloque.
  it("la salvación de muerte enseña el dado y la cuenta de éxitos y fracasos", () => {
    const datos = datosDeTirada({
      type: "DEATH_SAVE",
      roll: 4,
      result: "CRIT_FAILURE",
      successes: 1,
      failures: 3,
    });
    expect(datos?.prueba).toBe("Salvación de muerte");
    expect(datos?.resultado).toBe(4);
    expect(datos?.veredicto).toBe("FALLO");
    expect(datos?.desglose).toContainEqual({ origen: "Éxitos", valor: "1" });
    expect(datos?.desglose).toContainEqual({ origen: "Fracasos", valor: "3" });
  });

  it("un 20 natural en una salvación de muerte va como éxito", () => {
    const datos = datosDeTirada({
      type: "DEATH_SAVE",
      roll: 20,
      result: "CRIT_SUCCESS",
      successes: 0,
      failures: 2,
    });
    expect(datos?.veredicto).toBe("EXITO");
  });

  // **Una tabla no se supera ni se falla: sale lo que sale.** Pintarle un veredicto sería
  // inventar una regla que no existe.
  it("una tabla de la casa sale sin veredicto", () => {
    const datos = datosDeTirada({
      type: "TABLE_ROLLED",
      tableName: "Saqueo del almacén",
      die: 100,
      roll: 73,
      text: "Una llave de latón sin cerradura conocida",
    });
    expect(datos?.veredicto).toBeNull();
    expect(datos?.prueba).toContain("Saqueo del almacén");
    expect(datos?.resultado).toBe(73);
    expect(datos?.desglose).toContainEqual({ origen: "Dado", valor: "d100" });
    expect(datos?.desglose).toContainEqual({
      origen: "Dice",
      valor: "Una llave de latón sin cerradura conocida",
    });
  });
});

describe("los sucesos que no son una tirada", () => {
  // El hilo pide el desglose de todo lo que pinta; los que no traen números tienen que decir que
  // no en vez de devolver un bloque vacío que se pintaría igual.
  it("devuelven null", () => {
    const cambioDePg: GameEventPayload = { type: "HP_CHANGED", delta: -7, from: 20, to: 13 };
    expect(datosDeTirada(cambioDePg)).toBeNull();
    expect(
      datosDeTirada({ type: "SESSION_NOTE", kind: "NOTE", text: "Llegan al puerto" }),
    ).toBeNull();
  });
});
