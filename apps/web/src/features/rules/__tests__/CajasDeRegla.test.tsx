import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { ruleConditionSchema, ruleEffectSchema, ruleTriggerSchema } from "@dnd/shared";
import { CajaColocada, CarrilDeCajas, PaletaDeCajas } from "../CajasDeRegla";
import { tipoDeArrastre } from "../partes";
import { DISPARADORES_SIN_MOTOR, nombreDePieza } from "../vocabulario";

// Tarea R1 — la paleta, los carriles y la caja colocada.
//
// **`jsdom` no arrastra.** Lo que se prueba aquí es la ruta de teclado —que es la que tiene que
// existir para que alguien sin ratón pueda escribir una regla— y el rechazo de un arrastre
// ajeno, que sí se puede simular porque depende de los *tipos* del `DataTransfer` y no de
// mover el puntero. El gesto de arrastrar de verdad se mide en `apps/web/e2e/reglas.spec.ts` y
// en `apps/web/e2e/reglas-arrastrar.spec.ts`.

// **Actualizado el 2026-09-04 (auditoría de la mesa, §8.3).** La paleta ofrecía los doce
// sucesos del esquema, y cuatro de ellos —`ENTITY_COMMENTED`, `DM_EXECUTED`, `ENTITY_ATTACKED`,
// `MEMBER_JOINED`— **no los dispara el motor**: `game-event-triggers.ts` no tiene `case` para
// ninguno, así que una regla armada sobre ellos se guardaba y no se ejecutaba jamás. Se retiran
// de la oferta y el esquema los conserva, para no romper las reglas ya guardadas.
//
// Lo que estas pruebas siguen comprobando es exactamente lo mismo de antes: que la paleta ofrece
// **el vocabulario cerrado y nada más**, derivado del esquema compartido y no de una lista a
// mano — solo que ahora el conjunto es «los del esquema que el motor sí dispara».
const CLAVES = {
  SUCESO: ruleTriggerSchema.options
    .map((o) => o.shape.kind.value)
    .filter((k) => !(DISPARADORES_SIN_MOTOR as string[]).includes(k)),
  ESTADO: ruleConditionSchema.options.map((o) => o.shape.kind.value),
  ACCION: ruleEffectSchema.options.map((o) => o.shape.kind.value),
};

function nombresDelGrupo(etiqueta: string) {
  const grupo = screen.getByRole("region", { name: etiqueta });
  return within(grupo)
    .getAllByRole("button")
    .map((b) => b.getAttribute("data-clave"));
}

describe("la paleta", () => {
  it("ofrece exactamente el vocabulario cerrado, agrupado por parte y todo visible a la vez", () => {
    render(<PaletaDeCajas onColocar={vi.fn()} />);

    expect(nombresDelGrupo("Piezas de tipo Suceso")).toEqual(CLAVES.SUCESO);
    expect(nombresDelGrupo("Piezas de tipo Estado")).toEqual(CLAVES.ESTADO);
    expect(nombresDelGrupo("Piezas de tipo Acción")).toEqual(CLAVES.ACCION);
    // Nada de desplegables: las 28 piezas son botones.
    expect(screen.queryAllByRole("combobox")).toHaveLength(0);
  });

  it("es una sola tarjeta rotulada, con los tres grupos dentro y su glosa en el rótulo", () => {
    // Reseño 2026-09-03 — la maqueta manda en la forma: un cajón de piezas con nombre, no tres
    // bloques sueltos flotando encima de sus carriles. Lo que esto vigila es la **estructura**
    // (jsdom no maqueta): que exista la tarjeta, que los tres grupos estén dentro de ella, y que
    // el rótulo de cada grupo lleve su glosa entre paréntesis y el carril al que va.
    render(<PaletaDeCajas onColocar={vi.fn()} />);

    const paleta = screen.getByRole("region", { name: "Paleta de piezas" });
    expect(within(paleta).getByRole("heading", { name: "Paleta" })).toBeVisible();
    for (const parte of ["Suceso", "Estado", "Acción"]) {
      expect(within(paleta).getByRole("region", { name: `Piezas de tipo ${parte}` })).toBeVisible();
    }

    const grupo = screen.getByRole("region", { name: "Piezas de tipo Suceso" });
    expect(grupo).toHaveTextContent("(un instante) → carril «Cuando»");
    // Y el párrafo largo se ha ido de aquí: lo dice el carril vacío y lo repite la caja colocada.
    // Tres copias de la misma frase alejaban cada pieza de su ranura, que es lo único que este
    // editor no se puede permitir.
    expect(grupo).not.toHaveTextContent("Pasa en un instante y despierta la regla");
  });

  it("ninguna pieza enseña el valor del enum, y todas dicen a qué carril van", () => {
    render(<PaletaDeCajas onColocar={vi.fn()} />);

    for (const clave of CLAVES.SUCESO) {
      const pieza = screen.getByRole("button", {
        name: `${nombreDePieza(clave)} — poner en el carril Cuando`,
      });
      expect(pieza.textContent).toBe(nombreDePieza(clave));
      expect(pieza.textContent).not.toContain(clave);
    }
  });

  it("cada pieza se puede arrastrar Y activar: la ruta de teclado no es un extra", () => {
    const onColocar = vi.fn();
    render(<PaletaDeCajas onColocar={onColocar} />);

    const pieza = screen.getByRole("button", {
      name: "Empieza una sesión — poner en el carril Cuando",
    });
    expect(pieza).toHaveAttribute("draggable", "true");

    // **Es un `<button>` de verdad, y no un `div` con `onClick`.** Ésa es toda la diferencia:
    // el navegador activa un botón con Enter y con Espacio, y le da foco en el orden del
    // documento, sin que este código tenga que escribir un solo manejador de teclado. `jsdom`
    // no sintetiza esa activación nativa, así que la prueba comprueba las dos mitades: que el
    // elemento es el que la trae puesta, y que su activación coloca la pieza.
    expect(pieza.tagName).toBe("BUTTON");
    expect(pieza).toBeEnabled();
    fireEvent.click(pieza);
    expect(onColocar).toHaveBeenCalledWith("SUCESO", "SESSION_STARTED");
  });

  it("con el carril lleno la paleta lo dice y retira sus piezas, en vez de callarse", () => {
    render(
      <PaletaDeCajas topes={{ ESTADO: "Diez condiciones es el tope." }} onColocar={vi.fn()} />,
    );

    expect(screen.getByText("Diez condiciones es el tope.")).toBeVisible();
    const grupo = screen.getByRole("region", { name: "Piezas de tipo Estado" });
    expect(within(grupo).queryAllByRole("button")).toHaveLength(0);
    // Los otros dos carriles siguen enteros.
    expect(nombresDelGrupo("Piezas de tipo Suceso")).toEqual(CLAVES.SUCESO);
  });
});

describe("un carril", () => {
  it("vacío, dice qué pide en vez de quedarse en blanco", () => {
    render(
      <CarrilDeCajas parte="SUCESO" vacio onSoltar={vi.fn()}>
        {null}
      </CarrilDeCajas>,
    );
    const carril = screen.getByRole("region", { name: "Carril Cuando" });
    expect(carril).toHaveTextContent("Arrastra aquí el suceso que despierta la regla");
    expect(carril).toHaveTextContent("Solo cabe uno");
  });

  it("acepta lo suyo y **rechaza lo ajeno mientras se arrastra**, no al soltarlo", () => {
    const onSoltar = vi.fn();
    render(
      <CarrilDeCajas parte="ESTADO" vacio onSoltar={onSoltar}>
        {null}
      </CarrilDeCajas>,
    );
    const carril = screen.getByRole("region", { name: "Carril Si" });

    // Un suceso sobre el carril de los estados: el carril NO cancela el evento, y sin cancelarlo
    // el navegador no deja soltar. `fireEvent` devuelve false cuando sí se canceló.
    const propio = tipoDeArrastre("ESTADO");
    const ajeno = tipoDeArrastre("SUCESO");
    const seCancelo = (tipos: string[]) =>
      !fireEvent.dragOver(carril, {
        dataTransfer: { types: tipos, dropEffect: "none", getData: () => "" },
      });

    expect(seCancelo([ajeno])).toBe(false);
    expect(carril).toHaveAttribute("data-encima", "no");

    expect(seCancelo([propio])).toBe(true);
    expect(carril).toHaveAttribute("data-encima", "si");

    // Y soltar lo ajeno tampoco coloca nada, aunque el navegador lo permitiera.
    fireEvent.drop(carril, {
      dataTransfer: { types: [ajeno], getData: () => "SESSION_STARTED" },
    });
    expect(onSoltar).not.toHaveBeenCalled();

    fireEvent.drop(carril, {
      dataTransfer: { types: [propio], getData: () => "NEVER_FIRED" },
    });
    expect(onSoltar).toHaveBeenCalledWith("NEVER_FIRED");
  });
});

describe("una caja colocada dice de qué parte es — R4", () => {
  it("un suceso se presenta como un instante, no como algo que se comprueba", () => {
    render(
      <ul>
        <CajaColocada parte="SUCESO" clave="FLAG_SET" onQuitar={vi.fn()}>
          <p>campos</p>
        </CajaColocada>
      </ul>,
    );
    const caja = screen.getByText("Se pone o se quita una marca").closest("li")!;
    expect(caja).toHaveTextContent("Es un suceso.");
    expect(caja).toHaveTextContent("Ocurrió algo.");
    // Y avisa de la condición con la que se confunde, nombrándola.
    expect(caja).toHaveTextContent("No es «Una marca está puesta (o quitada)», que es un estado.");
  });

  it("una condición se presenta como un estado que se comprueba", () => {
    render(
      <ul>
        <CajaColocada parte="ESTADO" clave="FLAG_IS" onQuitar={vi.fn()}>
          <p>campos</p>
        </CajaColocada>
      </ul>,
    );
    const caja = screen.getByText("Una marca está puesta (o quitada)").closest("li")!;
    expect(caja).toHaveTextContent("Es un estado.");
    expect(caja).toHaveTextContent("Algo es verdad.");
    expect(caja).toHaveTextContent("No es «Se pone o se quita una marca», que es un suceso.");
  });
});
