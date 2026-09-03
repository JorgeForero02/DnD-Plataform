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

/**
 * Los nueve campos que este componente pinta, y ni uno más.
 *
 * **Sigue siendo la variante revelada**: una tirada a ciegas no trae ninguno de ellos, así que el
 * compilador tampoco deja pintarla aquí por descuido — que era el motivo entero de que el tipo
 * fuera estrecho. Lo que cambia (2C.2) es que ya no exige `eventId` ni `audience`, que este
 * componente nunca lee: el registro de tiradas trae exactamente estos nueve campos dentro del
 * `payload` de un `ABILITY_ROLL` y **no** trae los otros dos, y rellenarlos con un valor
 * inventado para satisfacer al tipo habría sido escribir una mentira para poder compilar.
 */
export type DesgloseDeTirada = Pick<
  RollResultRevealed,
  | "expression"
  | "rolls"
  | "kept"
  | "dropped"
  | "modifier"
  | "total"
  | "dc"
  | "natural"
  | "outcome"
  // Ficha C2C-5. **Va DENTRO de este componente y no al lado, y la elección tiene motivo.**
  //
  //  · La tabla que dispara un natural es *parte del resultado de esa tirada*, no un suceso
  //    aparte: lo que la desencadenó es el mismo d20 que se está pintando dos líneas más arriba,
  //    y separarla en otra caja obligaría a repetir el contexto («esto salió de aquella tirada»)
  //    o a dejar al lector emparejándolas de memoria.
  //  · Y sobre todo, **así llega a los cuatro sitios que ya pintan un resultado sin tocar
  //    ninguno**: el panel de dados, el panel de la hoja, las tiradas pedidas y los ataques le
  //    pasan el `RollResultRevealed` entero. Un componente hermano habría que acordarse de
  //    colocarlo cuatro veces, y el sitio donde se olvidara callaría la regla en silencio — que
  //    es exactamente el defecto que esta ficha viene a cerrar.
  //
  // Es **opcional**, y el registro de tiradas nunca la trae: el `payload` de un `ABILITY_ROLL`
  // (`game-event.schema.ts`) no tiene este campo, así que en el log no se pinta nada. Eso es
  // correcto y no un hueco: la tabla dejó su propio suceso (`eventId`) y la línea de tiempo lo
  // cuenta por su cuenta.
  | "houseTable"
>;

export function ResultadoDeTirada({
  resultado,
  etiqueta,
  derivado,
}: {
  resultado: DesgloseDeTirada;
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

      {/* **La tabla de la casa que disparó este natural** (ficha C2C-5).
          Se dice **que es de la casa** antes que nada, y no es cortesía: el SRD 5.1 **no trae
          ninguna tabla de críticos ni de pifias** —un crítico duplica los dados del daño y se
          acabó—, así que enseñar «Te desarmas» sin decir de dónde sale enseñaría como regla del
          manual algo que se inventó esta mesa. Es el mismo defecto que el proyecto prohíbe
          cuando el texto explica una regla y no coincide con quien la aplica. El interruptor que
          la enciende es de la campaña (`Campaign.houseTablesEnabled`), y con él apagado este
          bloque no existe porque el servidor no manda nada. */}
      {resultado.houseTable && (
        <div data-tabla-de-la-casa className="mt-1 border-t border-copper pt-1">
          <p className="font-chrome text-chrome-xs uppercase tracking-[0.14em] text-copper-text">
            Regla de la casa
          </p>
          <p className="font-chrome text-chrome-sm text-text">
            {resultado.houseTable.tableName}{" "}
            <span className="font-data text-chrome-xs text-muted">
              d{resultado.houseTable.die} → {resultado.houseTable.roll}
            </span>
          </p>
          <p className="font-chrome text-chrome-sm text-text">{resultado.houseTable.text}</p>
          <p className="mt-0.5 font-chrome text-chrome-xs leading-snug text-muted">
            No es del manual: el SRD no trae tablas de críticos ni de pifias. La pone esta mesa.
          </p>
        </div>
      )}
    </div>
  );
}
