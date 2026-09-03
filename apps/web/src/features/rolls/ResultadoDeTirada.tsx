import type { DerivedValue, RollResultRevealed } from "@dnd/shared";
import { DadoDibujado } from "./DadoDibujado";
import { dadosDeLaTirada, lineaDeDesglose, sumandosDeLaTirada } from "./desglose";
import { fraseDeResultado, palabraDeNatural, rotuloDeConservacion } from "./vocabulario";

// **Ninguna clase de opacidad de Tailwind compila en este proyecto** (P1 de docs/06-pendientes.md):
// los colores se declaran como `var(--x)` sin `<alpha-value>`, así que Tailwind descarta la
// utilidad ENTERA y el elemento se queda con el `border-color` del preflight — `#e5e7eb` en
// los dos temas. Lo que había aquí, por tanto, no era un borde tenue: era un borde gris claro
// equivocado. Se pone el token entero, que es theme-aware, o se quita la clase cuando lo que
// pedía era un relleno translúcido que ningún token puede dar todavía.

// Tarea F3 — **se pintan los dos dados, con el descartado tachado y a la vista.**
//
// Ver el dado que se cayó es media gracia de tener ventaja: esconderlo convierte una decisión
// interesante en un número anónimo, y quita a la mesa lo único que se puede discutir. El
// servidor ya lo manda —`rolls`, `kept` y `dropped` de `rollResultSchema`, desde 2A.13, con el
// comentario «lo descartado no se pierde: se enseña»—; hasta F3 nadie lo pintaba.
//
// **Aquí no se tira nada.** El azar vive en el servidor (`apps/api/src/rolls/rolls.service.ts`):
// este componente solo enseña el resultado estructurado que le llega.

export function ResultadoDeTirada({
  resultado,
  etiqueta,
  derivado,
}: {
  /**
   * **La variante revelada, y por eso el tipo es más estrecho que `RollResult`.** Una tirada a
   * ciegas no trae desglose: quien la pinte tiene que decidir antes qué enseña, y con este tipo
   * el compilador no le deja olvidarse (`TiradaACiegas` es la otra mitad).
   */
  resultado: RollResultRevealed;
  /** Qué se estaba tirando: «Percepción», «Salvación de Destreza». */
  etiqueta: string;
  /**
   * El valor derivado del que salió el modificador, si la pantalla lo tiene. Con él, el desglose
   * dice de dónde sale cada punto del `+5`; sin él, dice «+5 percepción», que es cierto pero
   * cuenta menos.
   */
  derivado?: DerivedValue;
}) {
  const dados = dadosDeLaTirada(resultado);
  const rotulo = rotuloDeConservacion(resultado.expression);
  const linea = lineaDeDesglose(resultado.total, sumandosDeLaTirada(resultado, etiqueta, derivado));
  const palabra = palabraDeNatural(resultado.natural);
  const frase = fraseDeResultado(resultado);

  return (
    <div
      role="status"
      className="mt-1 rounded-radius-sm border border-muted bg-surface px-s2 py-1.5 text-left"
    >
      <p className="flex flex-wrap items-baseline gap-s2">
        {dados.map((dado, i) => (
          <span
            key={i}
            data-dado={dado.conservado ? "conservado" : "descartado"}
            className={[
              "inline-flex items-baseline gap-1 font-data text-chrome-sm",
              dado.conservado
                ? "text-text"
                : // Tachado y **a la vista**, no escondido. El `line-through` es maquetación, y
                  // jsdom no maqueta: quien comprueba que la raya se pinta de verdad es la
                  // prueba de navegador, leyendo el estilo calculado.
                  "text-muted line-through decoration-[1.5px]",
            ].join(" ")}
          >
            <DadoDibujado />
            {dado.valor}
            {!dado.conservado && <span className="sr-only"> (descartado)</span>}
          </span>
        ))}
        {rotulo && <span className="font-chrome text-chrome-xs text-muted">{rotulo}</span>}
      </p>

      {/* El desglose, siempre. Nunca un número solo. */}
      <p className="font-data text-chrome-xs text-accent-text">{linea}</p>

      {frase && <p className="font-chrome text-chrome-xs text-muted">{frase}</p>}

      {/* Un filete de cobre y una palabra. El cobre significa «esto pertenece al mundo», y por
          eso marca el 20 natural en vez del azul de acción; nada de confeti. */}
      {palabra && (
        <p className="mt-1 border-t border-copper pt-1 font-chrome text-chrome-xs uppercase tracking-[0.14em] text-copper-text">
          {palabra}
        </p>
      )}
    </div>
  );
}
