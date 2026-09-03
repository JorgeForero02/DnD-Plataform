import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NumeroEditable, SelectorEditable, TextoEditable } from "../EdicionEnSitio";

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

    expect(screen.getByRole("button", { name: "Guardar" })).not.toBeDisabled();
  });
});

describe("la hoja ya no tiene botones de «Editar»", () => {
  // Era el encargo literal del autor: «la hoja de personaje tiene 2 botones de editar y
  // sinceramente me gustaría que fuera dinámica». Los dos han desaparecido — el de la identidad
  // (raza, clase, características) y el del nombre y la historia.

  it("IdentidadEditable pinta selectores y números, no un botón que abre un diálogo", async () => {
    const { IdentidadEditable } = await import("../IdentidadEditable");
    const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
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
    const { IdentidadEditable } = await import("../IdentidadEditable");
    const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
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

describe("las dos reglas de la identidad que solo se ven al usarla", () => {
  const montar = async (over: Record<string, unknown>, sheet: unknown) => {
    const { IdentidadEditable } = await import("../IdentidadEditable");
    const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
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
      classes: [{ key: "wizard", name: "Mago", hitDie: 6 }],
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
