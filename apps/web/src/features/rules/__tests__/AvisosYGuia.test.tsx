import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { EditorDeRegla } from "../EditorDeRegla";
import { PlantillasDeRegla } from "../PlantillasDeRegla";
import { PLANTILLAS } from "../plantillas";
import type { RuleRow } from "../api";
import type { Entity } from "../../entities/api";

// Tareas F5 y F6 en la pantalla: que el aviso salga **con su arreglo**, que el arreglo se pueda
// pulsar y deje algo hecho, y que la guía cambie sola al hacer lo que pide.
//
// Lo que estas pruebas NO pueden ver: el arrastre y la maquetación. `jsdom` no arrastra ni
// maqueta. Eso se mide en `apps/web/e2e/reglas-arrastrar.spec.ts`.

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

const REGLA_VIEJA = {
  id: "ckregla00000000000000000",
  name: "La vieja",
  trigger: { kind: "SESSION_STARTED" },
  conditions: [],
  effects: [{ kind: "ADD_SESSION_NOTE", note: "x" }],
  mode: "AUTOMATIC",
  status: "ARMED",
  maxFires: null,
  fireCount: 0,
} as unknown as RuleRow;

function montar(props: Partial<Parameters<typeof EditorDeRegla>[0]> = {}) {
  const onCrearReversion = vi.fn();
  render(
    <EditorDeRegla
      abierto
      entities={[ENTIDAD]}
      reglas={[]}
      guardando={false}
      onGuardar={vi.fn()}
      onCrearReversion={onCrearReversion}
      onCerrar={vi.fn()}
      {...props}
    />,
  );
  return onCrearReversion;
}

const pieza = (nombre: string) => screen.getByRole("button", { name: nombre });
const avisos = () => screen.queryByRole("region", { name: "Avisos sobre esta regla" });

describe("F5 — los avisos ofrecen el arreglo", () => {
  it("una marca que nadie quita se avisa, y «Añadir reversión» crea la regla que la quita", () => {
    const onCrearReversion = montar();

    fireEvent.click(pieza("Empieza una sesión — poner en el carril Cuando"));
    fireEvent.click(pieza("Poner o quitar una marca — poner en el carril Entonces"));
    // Sin nombre de marca todavía no hay nada de lo que avisar: el hueco está vacío.
    expect(avisos()).toBeNull();

    fireEvent.change(screen.getByLabelText("Marca"), { target: { value: "combate" } });

    expect(avisos()).toHaveTextContent("Nadie deshace la marca «combate».");
    fireEvent.click(screen.getByRole("button", { name: "Añadir reversión" }));
    expect(onCrearReversion).toHaveBeenCalledWith(
      "Quitar la marca «combate» al cerrarse la sesión",
      "combate",
    );
  });

  it("dos reglas con el mismo suceso se avisan diciendo en qué orden se aplican", () => {
    montar({ reglas: [REGLA_VIEJA] });

    fireEvent.click(pieza("Empieza una sesión — poner en el carril Cuando"));
    fireEvent.click(pieza("Esta regla no se ha disparado nunca — poner en el carril Si"));

    expect(avisos()).toHaveTextContent("Gana esta regla, con 1 condición");
    expect(avisos()).toHaveTextContent("«La vieja», con 0, no se aplica");
  });

  it("el bucle se avisa, y su arreglo mete de verdad la condición en el carril «Si»", () => {
    montar();

    fireEvent.click(pieza("Se pone o se quita una marca — poner en el carril Cuando"));
    fireEvent.change(screen.getByLabelText("Nombre de la marca"), { target: { value: "eco" } });
    fireEvent.click(pieza("Poner o quitar una marca — poner en el carril Entonces"));
    fireEvent.change(screen.getByLabelText("Marca"), { target: { value: "eco" } });

    expect(avisos()).toHaveTextContent("Esto se muerde la cola.");

    const carrilSi = screen.getByRole("region", { name: "Carril Si" });
    expect(carrilSi).not.toHaveTextContent("Esta regla no se ha disparado nunca");

    fireEvent.click(
      screen.getByRole("button", { name: "Añadir «Esta regla no se ha disparado nunca»" }),
    );

    expect(screen.getByRole("region", { name: "Carril Si" })).toHaveTextContent(
      "Esta regla no se ha disparado nunca",
    );
  });

  it("una regla corriente no enseña ningún aviso", () => {
    montar();
    fireEvent.click(pieza("Empieza una sesión — poner en el carril Cuando"));
    fireEvent.click(pieza("Anotar en la sesión en curso — poner en el carril Entonces"));
    expect(avisos()).toBeNull();
  });
});

describe("F6 — la guía se cierra sola al hacer la acción", () => {
  // El pie de guía se localiza por su marca de datos, no por su texto: el texto es justamente lo
  // que está cambiando en cada paso.
  const guia = () => document.querySelector("[data-guia]") as HTMLElement;

  it("va pidiendo una cosa cada vez, y avanza al hacerla", () => {
    montar();
    expect(guia()).toHaveTextContent("al carril «Cuando»");

    fireEvent.click(pieza("Empieza una sesión — poner en el carril Cuando"));
    expect(guia()).toHaveTextContent("al carril «Entonces»");

    fireEvent.click(pieza("Anotar en la sesión en curso — poner en el carril Entonces"));
    expect(guia()).toHaveTextContent("Falta un dato dentro de una caja");

    fireEvent.change(screen.getByLabelText("Nota"), { target: { value: "Suena la campana" } });
    expect(guia()).toHaveTextContent("Ponle un nombre a la regla");

    fireEvent.change(screen.getByLabelText("Nombre de la regla"), { target: { value: "Campana" } });
    expect(guia()).toHaveTextContent("La regla ya está completa");
  });

  it("no se puede cerrar: no hay ningún botón para descartarla", () => {
    montar();
    expect(
      screen.queryByRole("button", { name: /cerrar la ayuda|descartar|no mostrar/i }),
    ).toBeNull();
  });
});

describe("F6 — las plantillas del estado vacío", () => {
  it("cada plantilla se enseña dicha como frase y se puede clonar", () => {
    const onUsar = vi.fn();
    render(<PlantillasDeRegla onUsar={onUsar} />);

    const tarjetas = screen.getAllByRole("listitem");
    expect(tarjetas).toHaveLength(PLANTILLAS.length);
    // Dicha con las mismas palabras que el editor, no con un resumen aparte.
    expect(tarjetas[0]).toHaveTextContent("Cuando Empieza una sesión");
    // Y los huecos que la plantilla no puede rellenar salen dichos, no callados.
    expect(tarjetas[0]).toHaveTextContent("sin elegir");

    fireEvent.click(screen.getAllByRole("button", { name: "Usar esta plantilla" })[0]);
    expect(onUsar).toHaveBeenCalledWith(PLANTILLAS[0]);
  });

  it("clonar una plantilla abre el editor con sus cajas ya en los carriles y nada guardado", () => {
    const onGuardar = vi.fn();
    render(
      <EditorDeRegla
        abierto
        borradorInicial={PLANTILLAS[0].borrador}
        entities={[ENTIDAD]}
        reglas={[]}
        guardando={false}
        onGuardar={onGuardar}
        onCerrar={vi.fn()}
      />,
    );

    expect(screen.getByRole("region", { name: "Carril Cuando" })).toHaveTextContent(
      "Empieza una sesión",
    );
    expect(screen.getByRole("region", { name: "Carril Si" })).toHaveTextContent(
      "Esta regla no se ha disparado nunca",
    );
    expect(screen.getByRole("region", { name: "Carril Entonces" })).toHaveTextContent(
      "Revelar una entrada del mundo",
    );
    // Clonar no es guardar: nada ha salido hacia la API.
    expect(onGuardar).not.toHaveBeenCalled();
    // Y la guía señala justo el hueco que la plantilla no podía rellenar.
    expect(document.querySelector("[data-guia]")).toHaveTextContent("falta la entrada del mundo");
  });
});
