import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { DmTableRoll } from "@dnd/shared";
import { ResultadoDeTabla } from "../ResultadoDeTabla";
import * as charactersApi from "../../characters/api";
import type { Character } from "../../characters/api";
import * as inventoryApi from "../../inventory/api";

// Tarea B5 — dar lo que la tabla acaba de entregar.
//
// La suite prueba lo que el encargo teme: que una clave de catálogo se cuele en la pantalla en
// vez de su nombre, que el gesto de dar aparezca donde no debe (una tirada de rumores, o para un
// jugador) y que un objeto caduco se diga y no se pueda dar sin apagar el gesto para el resto de
// una entrega mixta.

function personaje(id: string, name: string): Character {
  return {
    id,
    campaignId: "c1",
    ownerId: "u1",
    name,
    race: null,
    class: null,
    raceKey: null,
    subraceKey: null,
    classKey: null,
    level: 1,
    bio: null,
    visibility: "PLAYERS",
    color: null,
    createdAt: "x",
    archivedAt: null,
  };
}

const MARTA = personaje("ch-marta", "Marta");

function montar(tirada: DmTableRoll, soyDm = false) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ResultadoDeTabla tirada={tirada} soyDm={soyDm} campaignId="c1" />
    </QueryClientProvider>,
  );
}

const tiradaConBotin: DmTableRoll = {
  tableId: "t1",
  tableName: "Botín del cofre",
  die: 20,
  roll: 14,
  text: "Un arma y algo de oro.",
  eventId: "ev1",
  entrega: {
    objetos: [
      {
        ausente: false,
        ref: { source: "SRD", key: "short-sword" },
        cantidad: 1,
        name: "Espada corta",
        weightOz: 32,
        costCp: 1000,
      },
    ],
    monedas: { gp: 15 },
  },
};

const tiradaDeRumor: DmTableRoll = {
  tableId: "t2",
  tableName: "Rumores de la taberna",
  die: 6,
  roll: 3,
  text: "Dicen que el alcalde no duerme en su cama.",
  eventId: "ev2",
};

const tiradaConRefCaduca: DmTableRoll = {
  tableId: "t3",
  tableName: "Botín olvidado",
  die: 4,
  roll: 2,
  text: "Un objeto que ya no está.",
  eventId: "ev3",
  entrega: {
    objetos: [
      {
        ausente: true,
        ref: { source: "SRD", key: "short-sword" },
        cantidad: 1,
        // El motivo REAL del servidor lleva la clave dentro (`resolve-item.ts:42`). Se deja tal
        // cual en la fixture a propósito: la prueba de la clave de abajo tiene que enrojecer si
        // la pantalla vuelve a pintar este `motivo` en vez de su propia frase.
        motivo: '"short-sword" no es un objeto del catálogo del SRD.',
      },
    ],
  },
};

/** Una entrega MEZCLADA: un objeto vivo y uno caduco. Es el caso que sostiene todo el
 * razonamiento de "el botón sigue encendido para lo que sí se puede dar" — y hasta este arreglo
 * de vuelta 1 no tenía ninguna fixture propia. */
const tiradaConEntregaMixta: DmTableRoll = {
  tableId: "t4",
  tableName: "Botín parcial",
  die: 6,
  roll: 5,
  text: "Un arma y un objeto que ya no está.",
  eventId: "ev4",
  entrega: {
    objetos: [
      {
        ausente: false,
        ref: { source: "SRD", key: "short-sword" },
        cantidad: 1,
        name: "Espada corta",
        weightOz: 32,
        costCp: 1000,
      },
      {
        ausente: true,
        ref: { source: "CAMPAIGN", id: "ci-borrado" },
        cantidad: 1,
        motivo: "Ese objeto de campaña no existe, o no es de esta campaña.",
      },
    ],
  },
};

describe("ResultadoDeTabla", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(charactersApi, "fetchCharacters").mockResolvedValue([MARTA]);
  });

  it("el resultado enseña lo que entrega, con nombre y no con clave", () => {
    montar(tiradaConBotin);
    expect(screen.getByText("Espada corta")).toBeInTheDocument();
    expect(screen.getByText(/15 mo/)).toBeInTheDocument();
    expect(screen.queryByText(/short-sword/)).not.toBeInTheDocument();
  });

  it("y ofrece darlo, eligiendo a quién", async () => {
    montar(tiradaConBotin, true);
    fireEvent.click(screen.getByRole("button", { name: /dar/i }));
    expect(await screen.findByRole("radio", { name: /Marta/i })).toBeInTheDocument();
  });

  it("una tirada de rumores no ofrece dar nada", () => {
    montar(tiradaDeRumor, true);
    expect(screen.queryByRole("button", { name: /dar/i })).not.toBeInTheDocument();
  });

  it("un jugador no ve el gesto de dar sobre el resultado de una tabla", () => {
    // No es control de acceso: la puerta de verdad es `requireOwnerOrDM` en el servidor. Esto
    // solo evita ofrecerle a un jugador un botón que el servidor le rechazaría con 403.
    montar(tiradaConBotin, false);
    expect(screen.queryByRole("button", { name: /dar/i })).not.toBeInTheDocument();
  });

  it("un objeto que ya no existe se dice SIN su clave, y no ofrece el gesto de dar", () => {
    // Arreglo de vuelta 1 — crítico: la pantalla pintaba `objeto.motivo` tal cual, y ese motivo
    // es literalmente el mensaje de `resolveContentRef` con la clave dentro
    // (`"short-sword" no es un objeto del catálogo del SRD.`). Esta prueba fallaba en silencio
    // porque solo miraba `tiradaConBotin`, cuya clave nunca viaja por el `motivo`; la fixture
    // caduca es la única que de verdad la lleva, y es la que hay que comprobar.
    montar(tiradaConRefCaduca, true);
    expect(screen.getAllByText(/ya no existe/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/short-sword/)).not.toBeInTheDocument();
    // Cambiado desde `toBeDisabled()` (I5): con nada que dar, `DarObjeto` no pinta ningún botón
    // — un botón apagado y ningún botón no son lo mismo para quien navega con teclado.
    expect(screen.queryByRole("button", { name: /dar/i })).not.toBeInTheDocument();
  });

  it("una entrega mixta dice el objeto caduco aparte y sigue ofreciendo dar el que sí existe", async () => {
    // El caso que sostiene el razonamiento de "apagar el botón solo cuando no queda nada": aquí
    // sí queda algo, así que el botón se ofrece, la espada se puede dar y el objeto caduco se
    // dice sin su clave, aparte.
    montar(tiradaConEntregaMixta, true);
    expect(screen.getByText("Espada corta")).toBeInTheDocument();
    expect(screen.getAllByText(/ya no existe/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/ci-borrado/)).not.toBeInTheDocument();
    const boton = screen.getByRole("button", { name: /dar/i });
    expect(boton).toBeInTheDocument();
    fireEvent.click(boton);
    fireEvent.click(await screen.findByRole("radio", { name: /Marta/i }));
    // El objeto caduco no aparece en lo que se ofrece entregar: solo hay una línea con nombre.
    expect(screen.getAllByText("Espada corta")).toHaveLength(2); // la lista de arriba + el cajón
  });

  it("la cantidad se enseña cuando es mayor que uno", () => {
    const conDos: DmTableRoll = {
      ...tiradaConBotin,
      entrega: {
        ...tiradaConBotin.entrega,
        objetos: [{ ...tiradaConBotin.entrega!.objetos![0], cantidad: 2 }],
      },
    };
    montar(conDos);
    expect(screen.getByText("Espada corta x2")).toBeInTheDocument();
  });

  it("no se pinta «1 x» cuando la cantidad es uno", () => {
    montar(tiradaConBotin);
    expect(screen.getByText("Espada corta")).toBeInTheDocument();
    expect(screen.queryByText(/1 x/)).not.toBeInTheDocument();
  });

  it("una entrega de solo monedas, sin objetos, se pinta bien y se puede dar", () => {
    const soloMonedas: DmTableRoll = {
      ...tiradaConBotin,
      entrega: { monedas: { gp: 15 } },
    };
    montar(soloMonedas, true);
    expect(screen.getByText(/15 mo/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /dar/i })).toBeInTheDocument();
  });

  it("dar una entrega de solo monedas manda el delta de verdad — el puente completo (I3)", async () => {
    // Arreglo de vuelta 1, importante: hasta aquí, nada comprobaba el viaje entero
    // `ResultadoDeTabla` → `DarObjeto` → `changeMoney`. Poner `monedas: undefined` en la
    // `entregaFija` que arma `ResultadoDeTabla` dejaba esta suite entera en verde porque la
    // prueba de "se puede dar" solo miraba que el botón no estuviera apagado, nunca que el oro
    // saliera de verdad.
    vi.spyOn(inventoryApi, "changeMoney").mockResolvedValue({} as never);
    const soloMonedas: DmTableRoll = { ...tiradaConBotin, entrega: { monedas: { gp: 15 } } };

    montar(soloMonedas, true);
    fireEvent.click(screen.getByRole("button", { name: /dar/i }));
    fireEvent.click(await screen.findByRole("radio", { name: /Marta/i }));
    fireEvent.click(screen.getByRole("button", { name: /entregar/i }));

    await waitFor(() =>
      expect(inventoryApi.changeMoney).toHaveBeenCalledWith("c1", "ch-marta", { gp: 15 }),
    );
  });

  it("dar una entrega con objeto Y monedas manda las dos cosas — el puente completo (I3)", async () => {
    vi.spyOn(inventoryApi, "addInventoryItem").mockResolvedValue({} as never);
    vi.spyOn(inventoryApi, "changeMoney").mockResolvedValue({} as never);

    montar(tiradaConBotin, true);
    fireEvent.click(screen.getByRole("button", { name: /dar/i }));
    fireEvent.click(await screen.findByRole("radio", { name: /Marta/i }));
    fireEvent.click(screen.getByRole("button", { name: /entregar/i }));

    await waitFor(() =>
      expect(inventoryApi.addInventoryItem).toHaveBeenCalledWith("c1", "ch-marta", {
        ref: { source: "SRD", key: "short-sword" },
        quantity: 1,
        location: "CARRIED",
      }),
    );
    expect(inventoryApi.changeMoney).toHaveBeenCalledWith("c1", "ch-marta", { gp: 15 });
  });
});
