import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { EditorDeRegla } from "../EditorDeRegla";
import type { Entity } from "../../entities/api";

// Tarea R1 — **una regla entera escrita sin tocar el ratón**.
//
// Es la prueba que justifica que la ruta de teclado exista: si colocar una caja solo se pudiera
// hacer arrastrando, esta prueba no se podría escribir y quien no usa ratón no podría escribir
// una regla. Las dos rutas pasan por la misma función (`colocar` en `EditorDeRegla.tsx`), así
// que esto ejercita también lo que hace el arrastre; lo que el arrastre añade —el gesto y la
// maquetación— se mide en el navegador.

const ENTIDAD: Entity = {
  id: "ckentidad000000000000000",
  campaignId: "ckcampana00000000000000",
  kind: "NPC",
  name: "El heraldo de la puerta",
  summary: null,
  body: null,
  tags: [],
  visibility: "DM_ONLY",
  createdById: "ckuser0000000000000000",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
} as unknown as Entity;

function montar(onGuardar = vi.fn()) {
  render(
    <EditorDeRegla
      abierto
      entities={[ENTIDAD]}
      reglas={[]}
      guardando={false}
      onGuardar={onGuardar}
      onCerrar={vi.fn()}
    />,
  );
  return onGuardar;
}

const pieza = (nombre: string) => screen.getByRole("button", { name: nombre });

function escribir(etiqueta: string, valor: string) {
  fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } });
}

describe("el editor de reglas por carriles", () => {
  it("arranca con los tres carriles vacíos, y cada uno dice qué pide", () => {
    montar();
    expect(screen.getByRole("region", { name: "Carril Cuando" })).toHaveTextContent(
      "Arrastra aquí el suceso que despierta la regla",
    );
    expect(screen.getByRole("region", { name: "Carril Si" })).toHaveTextContent(
      "Puedes dejarlo vacío",
    );
    expect(screen.getByRole("region", { name: "Carril Entonces" })).toHaveTextContent(
      "Arrastra aquí lo que hace la regla",
    );
  });

  it("una regla entera se escribe activando piezas, sin arrastrar nada, y llega entera a la API", () => {
    const onGuardar = montar();

    escribir("Nombre de la regla", "Al empezar, el heraldo");

    // Las tres piezas son `<button>`: el navegador las activa con Enter y con Espacio. Ninguna
    // de estas tres líneas necesita un ratón, y ésa es justo la propiedad que se está probando.
    fireEvent.click(pieza("Empieza una sesión — poner en el carril Cuando"));
    fireEvent.click(pieza("Esta regla no se ha disparado nunca — poner en el carril Si"));
    fireEvent.click(pieza("Revelar una entrada del mundo — poner en el carril Entonces"));

    // El único hueco que queda es el de la caja de acción: qué entrada se revela.
    escribir("Qué entrada del mundo", ENTIDAD.id);

    fireEvent.click(screen.getByRole("button", { name: "Guardar regla" }));

    expect(onGuardar).toHaveBeenCalledTimes(1);
    expect(onGuardar).toHaveBeenCalledWith({
      name: "Al empezar, el heraldo",
      trigger: { kind: "SESSION_STARTED" },
      conditions: [{ kind: "NEVER_FIRED" }],
      effects: [{ kind: "REVEAL_ENTITY", entityId: ENTIDAD.id, visibility: "PLAYERS" }],
      mode: "AUTOMATIC",
      maxFires: null,
    });
  });

  it("colocar sin arrastrar se anuncia, porque nada se ve moverse", () => {
    montar();

    fireEvent.click(pieza("Empieza una sesión — poner en el carril Cuando"));
    expect(screen.getByText("«Empieza una sesión» colocado en el carril «Cuando».")).toBeVisible();

    // El carril Cuando admite uno solo: colocar otro sustituye, y lo dice.
    fireEvent.click(pieza("Se cierra una sesión — poner en el carril Cuando"));
    expect(
      screen.getByText(
        "«Se cierra una sesión» sustituye a «Empieza una sesión» en el carril «Cuando». Un suceso por regla.",
      ),
    ).toBeVisible();
    expect(screen.getByRole("region", { name: "Carril Cuando" })).not.toHaveTextContent(
      "Empieza una sesión",
    );
  });

  it("lo que falta se cuenta por carriles y en español, no con el mensaje crudo de Zod", () => {
    const onGuardar = montar();

    fireEvent.click(screen.getByRole("button", { name: "Guardar regla" }));
    expect(onGuardar).not.toHaveBeenCalled();

    const aviso = screen.getByRole("alert");
    expect(aviso).toHaveTextContent("El carril «Cuando» está vacío");
    expect(aviso).toHaveTextContent("El carril «Entonces» está vacío");
    expect(aviso).not.toHaveTextContent("Required");
    expect(aviso).not.toHaveTextContent("trigger");
  });

  it("un hueco a medio rellenar dice en qué caja de qué carril está", () => {
    const onGuardar = montar();

    escribir("Nombre de la regla", "A medias");
    fireEvent.click(pieza("Empieza una sesión — poner en el carril Cuando"));
    fireEvent.click(pieza("Revelar una entrada del mundo — poner en el carril Entonces"));
    // Sin elegir la entrada: el efecto está incompleto.
    fireEvent.click(screen.getByRole("button", { name: "Guardar regla" }));

    expect(onGuardar).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Carril «Entonces», caja «Revelar una entrada del mundo»: falta la entrada del mundo.",
    );
  });

  it("una regla ya guardada se abre con sus cajas dentro de sus carriles", () => {
    render(
      <EditorDeRegla
        abierto
        regla={
          {
            id: "ckregla00000000000000000",
            name: "La regla vieja",
            trigger: { kind: "FLAG_SET", key: "puerta" },
            conditions: [{ kind: "ALL_PLAYERS_PRESENT" }],
            effects: [{ kind: "ADD_SESSION_NOTE", note: "hola" }],
            mode: "PROPOSAL",
            maxFires: null,
          } as never
        }
        entities={[ENTIDAD]}
        reglas={[]}
        guardando={false}
        onGuardar={vi.fn()}
        onCerrar={vi.fn()}
      />,
    );

    expect(screen.getByRole("region", { name: "Carril Cuando" })).toHaveTextContent(
      "Se pone o se quita una marca",
    );
    expect(screen.getByRole("region", { name: "Carril Si" })).toHaveTextContent(
      "Están todos los jugadores presentes",
    );
    expect(screen.getByRole("region", { name: "Carril Entonces" })).toHaveTextContent(
      "Anotar en la sesión en curso",
    );
    // Y el modo propuesta sigue vivo, que era lo que no se podía romper.
    expect(screen.getByRole("radio", { name: /Propuesta/ })).toBeChecked();
  });
});
