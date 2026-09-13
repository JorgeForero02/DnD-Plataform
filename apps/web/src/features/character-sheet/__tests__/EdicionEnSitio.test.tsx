import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  NumeroEditable,
  RadiosEditables,
  SelectorEditable,
  TextoEditable,
} from "../EdicionEnSitio";
import { Caracteristicas, FichaEditable } from "../IdentidadEditable";
import * as campaignsApi from "../../campaigns/api";
import * as characterSheetApi from "../api";

// **Estos dos se importan arriba y no dentro de cada prueba, y eso NO es estilo.** Un
// `await import()` en el cuerpo de una prueba mete el coste de transformar el módulo dentro de
// su presupuesto de 5 s, y con la máquina cargada —la suite entera, o un agente compilando al
// lado— ese presupuesto se agota: la prueba muere por `Test timed out in 5000ms` **sin haber
// medido nada**, y su DOM se queda sin limpiar, así que la siguiente cuenta doce «sin calcular»
// donde hay seis. Medido el 2026-09-06: verde tres de tres en solitario, roja dentro de
// `pnpm verify`. Es la misma trampa de máquina cargada que `docs/08-pruebas.md` documenta para
// Playwright, aquí en vitest.

/**
 * La identidad se partió en dos componentes al adoptar la maqueta —la ficha y las
 * características son dos tarjetas—, y lo que estas pruebas afirman sigue siendo de las dos
 * juntas: que se edita en el sitio y que no hay ningún botón que abra un diálogo.
 */
const IdentidadEditable = (p: Parameters<typeof Caracteristicas>[0]) => (
  <>
    <FichaEditable {...p} />
    <Caracteristicas {...p} />
  </>
);

// Las reglas de guardado que salieron de la investigación del 2026-09-02 (Primer de GitHub,
// sistema de diseño de GitLab). No son gusto: cada una evita un fallo documentado.

describe("un número se edita donde está", () => {
  it("guarda al salir del campo, no en cada tecla", async () => {
    // Autoguardar cada tecla manda basura al servidor y confunde a un lector de pantalla.
    const guardar = vi.fn().mockResolvedValue(undefined);
    render(<NumeroEditable etiqueta="Fuerza" valor={10} onGuardar={guardar} />);
    const campo = screen.getByLabelText("Fuerza");

    fireEvent.change(campo, { target: { value: "1" } });
    fireEvent.change(campo, { target: { value: "16" } });
    expect(guardar).not.toHaveBeenCalled();

    fireEvent.blur(campo);
    await waitFor(() => expect(guardar).toHaveBeenCalledWith(16));
    expect(guardar).toHaveBeenCalledTimes(1);
  });

  it("Enter guarda y Escape devuelve el valor anterior", async () => {
    const guardar = vi.fn().mockResolvedValue(undefined);
    render(<NumeroEditable etiqueta="Destreza" valor={12} onGuardar={guardar} />);
    const campo = screen.getByLabelText("Destreza");

    fireEvent.change(campo, { target: { value: "18" } });
    fireEvent.keyDown(campo, { key: "Escape" });
    expect(campo).toHaveValue(12);
    expect(guardar).not.toHaveBeenCalled();

    fireEvent.change(campo, { target: { value: "14" } });
    fireEvent.keyDown(campo, { key: "Enter" });
    await waitFor(() => expect(guardar).toHaveBeenCalledWith(14));
  });

  it("si no ha cambiado nada, no se escribe nada", async () => {
    const guardar = vi.fn().mockResolvedValue(undefined);
    render(<NumeroEditable etiqueta="Constitución" valor={13} onGuardar={guardar} />);

    fireEvent.blur(screen.getByLabelText("Constitución"));

    await waitFor(() => expect(guardar).not.toHaveBeenCalled());
  });

  it("cuando el servidor rechaza, CONSERVA lo tecleado y dice por qué en línea", async () => {
    // Es la regla que más importa aquí: nuestros rechazos son de autorización, y un aviso
    // flotante se va antes de que un lector de pantalla lo lea. Y perder el número obligaría a
    // reescribirlo para corregirlo.
    const guardar = vi.fn().mockRejectedValue(new Error("Solo el dueño o el DM."));
    render(<NumeroEditable etiqueta="Sabiduría" valor={10} onGuardar={guardar} />);
    const campo = screen.getByLabelText("Sabiduría");

    fireEvent.change(campo, { target: { value: "20" } });
    fireEvent.blur(campo);

    expect(await screen.findByRole("alert")).toHaveTextContent("Solo el dueño o el DM.");
    expect(campo).toHaveValue(20);
  });

  it("un cambio venido de fuera se refleja, pero NO pisa lo que se está escribiendo", () => {
    const guardar = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(
      <NumeroEditable etiqueta="Carisma" valor={8} onGuardar={guardar} />,
    );

    rerender(<NumeroEditable etiqueta="Carisma" valor={15} onGuardar={guardar} />);
    expect(screen.getByLabelText("Carisma")).toHaveValue(15);
  });

  it("sin permiso, el campo se deshabilita y dice por qué al pasar el ratón", () => {
    render(
      <NumeroEditable
        etiqueta="Inteligencia"
        valor={10}
        onGuardar={vi.fn()}
        disabled
        motivoDeshabilitado="Solo el dueño o el DM."
      />,
    );

    const campo = screen.getByLabelText("Inteligencia");
    expect(campo).toBeDisabled();
    expect(campo).toHaveAttribute("title", "Solo el dueño o el DM.");
  });
});

describe("un desplegable se guarda solo al elegir", () => {
  it("elegir ES la acción completa: no hay nada más que confirmar", async () => {
    const guardar = vi.fn().mockResolvedValue(undefined);
    render(
      <SelectorEditable
        etiqueta="Raza"
        valor="human"
        opciones={[
          { valor: "human", texto: "Humano" },
          { valor: "dwarf", texto: "Enano" },
        ]}
        onGuardar={guardar}
      />,
    );

    fireEvent.change(screen.getByLabelText("Raza"), { target: { value: "dwarf" } });

    await waitFor(() => expect(guardar).toHaveBeenCalledWith("dwarf"));
  });

  it("un valor guardado que la lista NO ofrece se enseña, marcado y no seleccionable", () => {
    // Regla vinculante: una opción invisible es un dato que se pierde en el siguiente guardado
    // sin que nadie se entere.
    render(
      <SelectorEditable
        etiqueta="Subraza"
        valor="elf-wood"
        opciones={[{ valor: "elf-high", texto: "Alto elfo" }]}
        onGuardar={vi.fn()}
      />,
    );

    const huerfana = screen.getByRole("option", { name: /elf-wood/ });
    expect(huerfana).toBeInTheDocument();
    expect(huerfana).toBeDisabled();
  });
});

// Encargo A8 (2026-09-07) — el camino se elige con radios, no con un desplegable
// (`docs/04-convenciones.md`): elegir camino es una opción con significado, y son pocas.
describe("radios que se guardan solos al elegir (encargo A8)", () => {
  it("elegir ES la acción completa: no hay nada más que confirmar", async () => {
    const guardar = vi.fn().mockResolvedValue(undefined);
    render(
      <RadiosEditables
        etiqueta="Camino"
        valor=""
        opciones={[
          { valor: "berserker", texto: "Senda del berserker", explicacion: "Furia sin control." },
        ]}
        onGuardar={guardar}
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: "Senda del berserker" }));

    await waitFor(() => expect(guardar).toHaveBeenCalledWith("berserker"));
  });

  it("elegir el mismo valor otra vez no escribe nada", async () => {
    const guardar = vi.fn().mockResolvedValue(undefined);
    render(
      <RadiosEditables
        etiqueta="Camino"
        valor="berserker"
        opciones={[
          { valor: "berserker", texto: "Senda del berserker", explicacion: "Furia sin control." },
        ]}
        onGuardar={guardar}
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: "Senda del berserker" }));

    await waitFor(() => expect(guardar).not.toHaveBeenCalled());
  });

  it("un valor guardado que las opciones NO ofrecen se enseña, marcado y no seleccionable", () => {
    // Regla vinculante: una opción invisible es un dato que se pierde en el siguiente guardado
    // sin que nadie se entere. Es el caso exacto del bárbaro con la subclase del guerrero.
    render(
      <RadiosEditables
        etiqueta="Camino"
        valor="champion"
        opciones={[
          { valor: "berserker", texto: "Senda del berserker", explicacion: "Furia sin control." },
        ]}
        onGuardar={vi.fn()}
        nombrarHuerfano={() => "Campeón"}
      />,
    );

    // Por rol y nombre, no por texto: un radio sin `<label htmlFor>` ni `aria-label` puede
    // pasar una búsqueda por texto y aun así anunciarse a un lector de pantalla como «radio,
    // marcado, deshabilitado» sin decir de qué. Esto comprueba las dos cosas a la vez.
    const huerfano = screen.getByRole("radio", { name: "Campeón" });
    expect(huerfano).toBeChecked();
    expect(huerfano).toBeDisabled();
    expect(screen.getByText("guardado, ya no disponible")).toBeInTheDocument();
    // Y **la clave cruda no llega a la pantalla**: solo el nombre resuelto.
    expect(screen.queryByText(/champion/)).not.toBeInTheDocument();
  });
});

describe("el selector de camino (subclase) en la ficha (encargo A8)", () => {
  const montarConCatalogo = async (
    over: Record<string, unknown>,
    subclases: { key: string; name: string; chosenAtLevel: number }[],
  ) => {
    const api = await import("../api");
    vi.spyOn(api, "fetchCatalog").mockResolvedValue({
      races: [{ key: "human", name: "Humano", subraces: [] }],
      classes: [{ key: "barbarian", name: "Bárbaro", hitDie: 12, subclasses: subclases }],
      armor: [],
    });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <FichaEditable
          campaignId="c1"
          characterId="ch1"
          character={
            {
              id: "ch1",
              level: 3,
              raceKey: "human",
              classKey: "barbarian",
              subclassKey: null,
              ...over,
            } as never
          }
          puedeEditar
        />
      </QueryClientProvider>,
    );
    return api;
  };

  const berserker = { key: "berserker", name: "Senda del berserker", chosenAtLevel: 3 };

  it("no aparece antes del nivel en que la clase elige camino", async () => {
    await montarConCatalogo({ level: 2 }, [berserker]);
    await screen.findByLabelText("Clase");
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it("un valor ya elegido NUNCA desaparece, aunque el nivel baje por debajo de chosenAtLevel (I3)", async () => {
    // Regla vinculante: un valor guardado que un selector no ofrece se muestra, marcado y no
    // seleccionable, y NUNCA desaparece. Un bárbaro que eligió camino al nivel 3 y a quien luego
    // se le baja el nivel a 1 sigue teniendo esa elección en la fila — la pantalla tiene que
    // seguir enseñándola, no esconder el selector entero.
    await montarConCatalogo({ level: 1, subclassKey: "berserker" }, [berserker]);
    const radio = await screen.findByRole("radio", { name: "Senda del berserker" });
    expect(radio).toBeChecked();
    vi.restoreAllMocks();
  });

  it("aparece desde el nivel en que la clase elige, con el nombre resuelto y su frase", async () => {
    await montarConCatalogo({ level: 3 }, [berserker]);
    const radio = await screen.findByRole("radio", { name: "Senda del berserker" });
    expect(radio).toBeInTheDocument();
    // Nunca la clave cruda del catálogo.
    expect(screen.queryByText(/^berserker$/)).not.toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it("elegir un camino lo guarda con la referencia SRD", async () => {
    const api = await montarConCatalogo({ level: 3 }, [berserker]);
    const espia = vi.spyOn(api, "updateSheet").mockResolvedValue({} as never);

    const radio = await screen.findByRole("radio", { name: "Senda del berserker" });
    fireEvent.click(radio);

    await waitFor(() =>
      expect(espia).toHaveBeenCalledWith(
        "c1",
        "ch1",
        expect.objectContaining({ subclass: { source: "SRD", key: "berserker" } }),
      ),
    );
    vi.restoreAllMocks();
  });

  it("una subclave de otra clase no revienta la pantalla: se enseña marcada y no seleccionable", async () => {
    // "champion" es la subclase del guerrero, no del bárbaro — el mismo caso que prueba
    // `resolve.spec.ts` en el servidor.
    await montarConCatalogo({ level: 3, subclassKey: "champion" }, [berserker]);
    await screen.findByRole("radio", { name: "Senda del berserker" });

    const huerfano = screen.getByRole("radio", { name: "Campeón" });
    expect(huerfano).toBeChecked();
    expect(huerfano).toBeDisabled();
    expect(screen.getByText("guardado, ya no disponible")).toBeInTheDocument();
    expect(screen.queryByText(/^champion$/)).not.toBeInTheDocument();
    vi.restoreAllMocks();
  });
});

describe("el texto libre se guarda con botón, no solo", () => {
  it("teclear es un proceso: hace falta confirmar", async () => {
    const guardar = vi.fn().mockResolvedValue(undefined);
    render(<TextoEditable etiqueta="Nombre" valor="Kaelen" onGuardar={guardar} />);

    fireEvent.click(screen.getByRole("button", { name: "Kaelen" }));
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Kaelen el Rojo" } });
    expect(guardar).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(guardar).toHaveBeenCalledWith("Kaelen el Rojo"));
  });

  it("cancelar devuelve lo que había, y no escribe", () => {
    const guardar = vi.fn();
    render(<TextoEditable etiqueta="Nombre" valor="Kaelen" onGuardar={guardar} />);

    fireEvent.click(screen.getByRole("button", { name: "Kaelen" }));
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "otra cosa" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(guardar).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Kaelen" })).toHaveTextContent("Kaelen");
  });

  it("el botón de guardar NUNCA se deshabilita", async () => {
    // Un botón deshabilitado no recibe foco de teclado y tiene mal contraste. Si no se puede
    // guardar, se dice al pulsarlo.
    render(<TextoEditable etiqueta="Bio" valor="" onGuardar={vi.fn().mockResolvedValue(1)} />);

    fireEvent.click(screen.getByTitle("Editar Bio"));

    expect(screen.getByRole("button", { name: "Guardar" })).not.toHaveAttribute("aria-disabled");
  });
});

describe("la hoja ya no tiene botones de «Editar»", () => {
  // Era el encargo literal del autor: «la hoja de personaje tiene 2 botones de editar y
  // sinceramente me gustaría que fuera dinámica». Los dos han desaparecido — el de la identidad
  // (raza, clase, características) y el del nombre y la historia.

  it("IdentidadEditable pinta selectores y números, no un botón que abre un diálogo", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={qc}>
        <IdentidadEditable
          campaignId="c1"
          characterId="ch1"
          character={
            {
              id: "ch1",
              level: 3,
              raceKey: "dwarf",
              subraceKey: null,
              classKey: "fighter",
              str: 16,
              dex: 12,
              con: 14,
              int: 10,
              wis: 10,
              cha: 8,
            } as never
          }
          sheet={null}
          puedeEditar
        />
      </QueryClientProvider>,
    );

    expect(screen.getByLabelText("Raza")).toBeInTheDocument();
    expect(screen.getByLabelText("Clase")).toBeInTheDocument();
    expect(screen.getByLabelText("Nivel")).toHaveValue(3);
    expect(screen.getByLabelText("Fuerza")).toHaveValue(16);
    expect(screen.queryByRole("button", { name: /Editar/ })).not.toBeInTheDocument();
  });

  it("sin la hoja derivada no se inventa un modificador: se dice que no hay", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={qc}>
        <IdentidadEditable
          campaignId="c1"
          characterId="ch1"
          character={{ id: "ch1", level: 1, str: 10 } as never}
          sheet={null}
          puedeEditar
        />
      </QueryClientProvider>,
    );

    expect(screen.getAllByText("sin calcular").length).toBe(6);
  });
});

// D-CF-66: el nivel lo fija el DM. La casilla se deshabilita con su motivo, nunca se esconde.
describe("FichaEditable — D-CF-66, el nivel es DM-only", () => {
  const montarFicha = (esDM: boolean) => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={qc}>
        <IdentidadEditable
          campaignId="c1"
          characterId="ch1"
          character={
            {
              id: "ch1",
              level: 3,
              raceKey: "dwarf",
              subraceKey: null,
              classKey: "fighter",
              str: 16,
              dex: 12,
              con: 14,
              int: 10,
              wis: 10,
              cha: 8,
            } as never
          }
          sheet={null}
          puedeEditar
          esDM={esDM}
        />
      </QueryClientProvider>,
    );
  };

  it("el dueño (no DM) ve «Nivel» deshabilitado con el motivo a la vista", () => {
    montarFicha(false);
    const campo = screen.getByLabelText("Nivel");
    expect(campo).toBeDisabled();
    expect(screen.getByTitle("El nivel lo fija el DM")).toBeInTheDocument();
  });

  it("el DM ve «Nivel» editable", () => {
    montarFicha(true);
    expect(screen.getByLabelText("Nivel")).not.toBeDisabled();
  });
});

describe("las dos reglas de la identidad que solo se ven al usarla", () => {
  const montar = async (over: Record<string, unknown>, sheet: unknown) => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={qc}>
        <IdentidadEditable
          campaignId="c1"
          characterId="ch1"
          character={
            {
              id: "ch1",
              level: 1,
              raceKey: "elf",
              subraceKey: "elf-high",
              classKey: "wizard",
              str: 10,
              dex: 14,
              con: 12,
              int: 16,
              wis: 10,
              cha: 8,
              ...over,
            } as never
          }
          sheet={sheet as never}
          puedeEditar
        />
      </QueryClientProvider>,
    );
  };

  it("cambiar de raza BORRA la subraza en la misma escritura", async () => {
    // Un elfo alto que deja de ser elfo es un dato huérfano: nadie lo borra, y reaparece
    // semanas después como un aviso que nadie entiende.
    // Se espía la función de API y no el hook: `IdentidadEditable` importa el hook por nombre,
    // así que un espía sobre el módulo no lo intercepta. `hooks.ts` sí llama a la API por
    // espacio de nombres — es la trampa de vitest documentada en `docs/04-convenciones.md`.
    const api = await import("../api");
    // Sin catálogo, el selector no tiene a dónde cambiar y el evento no hace nada: hay que
    // sembrarlo. Es el mismo motivo por el que las opciones salen de `GET /catalog`.
    vi.spyOn(api, "fetchCatalog").mockResolvedValue({
      races: [
        { key: "elf", name: "Elfo", subraces: [{ key: "elf-high", name: "Alto elfo" }] },
        { key: "dwarf", name: "Enano", subraces: [] },
      ],
      classes: [{ key: "wizard", name: "Mago", hitDie: 6, subclasses: [] }],
      armor: [],
    });
    const espia = vi.spyOn(api, "updateSheet").mockResolvedValue({} as never);

    await montar({}, null);
    await screen.findByRole("option", { name: "Enano" });
    fireEvent.change(screen.getByLabelText("Raza"), { target: { value: "dwarf" } });

    await waitFor(() =>
      expect(espia).toHaveBeenCalledWith(
        "c1",
        "ch1",
        expect.objectContaining({ race: { source: "SRD", key: "dwarf" }, subrace: null }),
      ),
    );
    vi.restoreAllMocks();
  });

  it("con la hoja derivada, el modificador SE PINTA pegado a su puntuación", async () => {
    // La mutación que puso «sin calcular» siempre no ponía nada rojo: solo había prueba del
    // caso sin hoja. La mitad que importa —el número al lado de su causa— no estaba cubierta.
    const derived: Record<string, unknown> = {};
    for (const a of ["str", "dex", "con", "int", "wis", "cha"]) {
      derived[`abilityMod.${a}`] = {
        key: `abilityMod.${a}`,
        total: a === "int" ? 3 : 0,
        steps: [
          {
            op: "base",
            amount: a === "int" ? 3 : 0,
            sourceType: "ability",
            sourceKey: a,
            labelKey: `abilityMod.${a}`,
          },
        ],
      };
    }

    await montar({}, { derived });

    expect(screen.queryByText("sin calcular")).not.toBeInTheDocument();
    // Con la maqueta adoptada el modificador es la cifra GRANDE de la casilla y lleva su signo
    // («+3»), que es como se usa en la mesa: no se dice «tres de Inteligencia», se suma +3.
    expect(screen.getByText("+3")).toBeInTheDocument();
    // Y **sigue sin afordancia de edición**: es un párrafo, no un campo ni un botón. La
    // puntuación pequeña de debajo es la que se toca.
    const modificador = screen.getByText("+3");
    expect(modificador.tagName).toBe("P");
    expect(modificador.closest("button")).toBeNull();
    // Y lleva la marca por la que lo señala la prueba de navegador, que es la única capaz de
    // medir que se lee MÁS GRANDE que la puntuación (jsdom no tiene tamaños). Sin esta línea,
    // renombrar el atributo dejaba la unitaria en verde y la de navegador buscando un elemento
    // que ya no existe — un fallo que solo aparecería en la siguiente corrida de Playwright.
    expect(modificador.getAttribute("data-derivado")).toBe("abilityMod.int");
  });
});

// Ola de arreglos 1 (I-2) — bajo una regla que no sea LIBRE, el servidor exige las seis juntas a
// TODO el mundo; así que las casillas de una en una no le sirven a nadie y el bloque de abajo se
// pinta para el dueño Y para el DM (spec §7, «dueño o DM»). El DM ve sus casillas apagadas con su
// propio motivo — nunca una casilla que parece editable y devuelve 400 al soltar.
describe("las características bajo una regla de la mesa que no es LIBRE (I-2)", () => {
  const seis = { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 };
  const campana = (tableRules: unknown) =>
    ({
      id: "c1",
      name: "Mesa",
      description: null,
      ownerId: "dm",
      createdAt: "2026-09-13T00:00:00Z",
      tableRules,
    }) as never;

  const montar = (esDM: boolean, character: Record<string, unknown> = seis) => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={qc}>
        <Caracteristicas
          campaignId="c1"
          characterId="ch1"
          character={{ id: "ch1", level: 1, ...character } as never}
          sheet={null}
          puedeEditar
          esDM={esDM}
        />
      </QueryClientProvider>,
    );
  };

  it("MATRIZ, DM: el bloque de asignar está, y las seis casillas van apagadas con el motivo «se cambian juntas, abajo»", async () => {
    vi.spyOn(campaignsApi, "fetchCampaign").mockResolvedValue(
      campana({ abilities: { metodo: "MATRIZ" } }),
    );

    montar(true);

    expect(
      await screen.findByRole("button", { name: "Fijar características" }),
    ).toBeInTheDocument();
    // Dos «Fuerza»: la casilla apagada de la hoja y el desplegable del bloque. La casilla es el
    // spinbutton.
    const casilla = screen.getByRole("spinbutton", { name: "Fuerza" });
    expect(casilla).toBeDisabled();
    expect(casilla).toHaveAttribute("title", "Bajo esta regla las seis se cambian juntas, abajo");
  });

  it("MATRIZ, dueño: el bloque está y la casilla dice que las fija la regla de la mesa", async () => {
    vi.spyOn(campaignsApi, "fetchCampaign").mockResolvedValue(
      campana({ abilities: { metodo: "MATRIZ" } }),
    );

    montar(false);

    expect(
      await screen.findByRole("button", { name: "Fijar características" }),
    ).toBeInTheDocument();
    const casilla = screen.getByRole("spinbutton", { name: "Fuerza" });
    expect(casilla).toBeDisabled();
    expect(casilla).toHaveAttribute("title", "Las características las fija la regla de la mesa");
  });

  it("DADOS sin intento elegido, DM: ve «Tirar características» — tira por el jugador", async () => {
    vi.spyOn(campaignsApi, "fetchCampaign").mockResolvedValue(
      campana({
        abilities: { metodo: "DADOS", expresion: "3d6", intentos: 2, asignacionLibre: true },
      }),
    );
    vi.spyOn(characterSheetApi, "fetchAbilityRolls").mockResolvedValue([]);

    montar(true, { str: null, dex: null, con: null, int: null, wis: null, cha: null });

    expect(
      await screen.findByRole("button", { name: "Tirar características" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Fuerza" })).toBeDisabled();
  });

  it("LIBRE: nada cambia — seis casillas editables y ningún bloque", async () => {
    vi.spyOn(campaignsApi, "fetchCampaign").mockResolvedValue(campana({}));

    montar(true);

    expect(await screen.findByRole("spinbutton", { name: "Fuerza" })).not.toBeDisabled();
    expect(screen.queryByRole("button", { name: "Fijar características" })).not.toBeInTheDocument();
  });
});
