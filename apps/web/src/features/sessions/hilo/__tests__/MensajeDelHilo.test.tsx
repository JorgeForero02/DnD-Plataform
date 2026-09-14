import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import type { GameEventRow } from "../../log-api";
import { MensajeDelHilo } from "../MensajeDelHilo";
import { horaDe, lineaDeLog } from "../../linea-de-log";
import { nombresDelHilo } from "../../nombres-del-hilo";

// **La hora se calcula con `horaDe`, nunca se escribe a mano** — `toLocaleTimeString` depende de
// la zona horaria de quien ejecuta la prueba, y un «21:14» tecleado aquí solo sería cierto en UTC.
const CREADO_EN = "2026-09-13T21:14:00.000Z";
const HORA = horaDe(CREADO_EN);

// Ronda de revisión (tarea 11, C4 #15). **El defecto que encontró el revisor**: la cabecera
// pintaba `personaje.name` y la línea, compuesta sin `sujetoEnCabecera`, empezaba con ESE MISMO
// nombre — «Sylas Sylas pierde 7 PG…» en cualquier `HP_CHANGED` de un PJ visible. Esto prueba el
// lado de la RENDERIZACIÓN del arreglo: dada la línea que `HiloDeSesion` compondría de verdad
// (con `lineaDeLog(p, { sujetoEnCabecera: true, ... })`, no una cadena inventada a mano), la
// tarjeta se lee como una sola frase y no repite el nombre. El lado de la COMPOSICIÓN —que
// `lineaDeLog` de verdad omita el nombre cuando se le pide— está en
// `linea-de-log-con-nombres.test.ts`; los dos hacen falta, porque cada uno puede romperse sin
// romper el otro.
//
// **Se comprueba el texto COMPLETO de cada párrafo, nunca una subcadena** (`toBe`, no
// `toHaveTextContent` con una `RegExp` suelta): «Sylas pierde…» también contiene «Sylas» como
// subcadena de «Sylas Sylas pierde…», así que una comprobación por subcadena no habría cazado
// nunca este defecto.

function evento(
  payload: GameEventRow["payload"],
  overrides: Partial<GameEventRow> = {},
): GameEventRow {
  return {
    id: "e1",
    campaignId: "c1",
    sessionId: "s1",
    actorUserId: "u-jorge",
    type: payload.type,
    subjectType: "character",
    subjectId: "sylas",
    payload,
    visibility: "PLAYERS",
    createdAt: CREADO_EN,
    ...overrides,
  };
}

/** El `<li data-suceso>` que pinta `MensajeDelHilo`, o revienta si no lo encuentra. */
function liDelSuceso(contenedor: HTMLElement, id: string): HTMLElement {
  const li = contenedor.querySelector<HTMLElement>(`[data-suceso="${id}"]`);
  if (!li) throw new Error(`No se pintó ningún <li data-suceso="${id}">`);
  return li;
}

describe("MensajeDelHilo — la cabecera lleva el sujeto, la línea no lo repite", () => {
  it("HP_CHANGED de un personaje jugador visible: un solo «Sylas», la persona baja a la firma", () => {
    const nombres = nombresDelHilo(
      [
        { id: "klarg", name: "Klarg" },
        { id: "sylas", name: "Sylas" },
      ],
      [],
    );
    const e = evento({
      type: "HP_CHANGED",
      delta: -7,
      from: 20,
      to: 13,
      damageType: "SLASHING",
      sourceCharacterId: "klarg",
    });
    // Exactamente lo que `HiloDeSesion` compondría para este suceso: `sujetoEnCabecera: true`
    // porque `vozDe` resolvió un personaje real contra `subjectId` y el suceso se pinta con la
    // forma «personaje».
    const linea = lineaDeLog(e.payload, {
      sujeto: "Sylas",
      sujetoEnCabecera: true,
      nombres,
    });

    const { container } = render(
      <ul>
        <MensajeDelHilo
          campaignId="c1"
          evento={e}
          autor="Jorge"
          personaje={{ id: "sylas", name: "Sylas", color: null }}
          nuevo={false}
          linea={linea}
        />
      </ul>,
    );

    const li = liDelSuceso(container, "e1");
    const [parrafoDeLaFrase, parrafoDeLaFirma] = li.querySelectorAll("p");
    expect(parrafoDeLaFrase.textContent).toBe("Sylas pierde 7 PG (cortante) ← Klarg");
    expect(parrafoDeLaFirma.textContent).toBe(`Jorge · ${HORA}`);
  });

  it("HP_CHANGED de un PNJ visible: el mismo trato — su nombre en la cabecera, sin doblarlo", () => {
    // Un PNJ resuelto (viene de `useNpcs`, no de `useCharacters`): `MensajeDelHilo` no distingue
    // — `personaje` es `ConColor & { name? }` para los dos, y así lo prueba I2 de `HiloDeSesion`.
    const nombres = nombresDelHilo([{ id: "klarg", name: "Klarg" }], []);
    const e = evento(
      { type: "HP_CHANGED", delta: -3, from: 15, to: 12, damageType: "PIERCING" },
      { subjectId: "klarg" },
    );
    const linea = lineaDeLog(e.payload, { sujeto: "Klarg", sujetoEnCabecera: true, nombres });

    const { container } = render(
      <ul>
        <MensajeDelHilo
          campaignId="c1"
          evento={e}
          autor="Ada"
          personaje={{ id: "klarg", name: "Klarg", color: null }}
          nuevo={false}
          linea={linea}
        />
      </ul>,
    );

    const li = liDelSuceso(container, "e1");
    const [parrafoDeLaFrase, parrafoDeLaFirma] = li.querySelectorAll("p");
    expect(parrafoDeLaFrase.textContent).toBe("Klarg pierde 3 PG (perforante)");
    expect(parrafoDeLaFirma.textContent).toBe(`Ada · ${HORA}`);
  });

  it("sin personaje resuelto, como siempre: la persona en la cabecera, la hora detrás, sin firma aparte", () => {
    const e = evento(
      { type: "HP_CHANGED", delta: -7, from: 24, to: 17 },
      { subjectType: "session" },
    );
    const linea = lineaDeLog(e.payload);

    const { container } = render(
      <ul>
        <MensajeDelHilo
          campaignId="c1"
          evento={e}
          autor="Ada"
          personaje={{ id: "u-dm" }}
          nuevo={false}
          linea={linea}
        />
      </ul>,
    );

    const li = liDelSuceso(container, "e1");
    // Un solo párrafo: la persona, la línea y la hora en la misma frase, sin una firma aparte
    // debajo — es exactamente el comportamiento de antes de esta tarea.
    expect(li.querySelectorAll("p")).toHaveLength(1);
    expect(li.querySelector("p")?.textContent).toBe(`Ada Pierde 7 PG (24 → 17) ${HORA}`);
  });
});
