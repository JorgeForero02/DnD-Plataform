import type { GameEventPayload } from "@dnd/shared";
import type { GameEventRow } from "../log-api";
import { horaDe, lineaDeLog, selloDeSuceso } from "../linea-de-log";
import { NOMBRE_SELLO } from "../vocabulario";
import { Badge } from "../../../ui/Badge";
import { TiradaIncrustada } from "./TiradaIncrustada";
import { datosDeTirada } from "./tirada";
import { colorDeVoz, tipoDeMensaje } from "./tipo-de-mensaje";

// **Los cinco tipos de mensaje de la maqueta**, copiados de
// `prototipo/src/features/HiloDeSesion.tsx` clase a clase: narración con capitular, personaje con
// su color de voz, sistema en cursiva, sello con reglas de cobre a los lados, y tirada incrustada
// con «De dónde sale». Sustituyen a la lista plana de chip + frase + autor + hora que la
// auditoría del 2026-09-04 marcó en el §1.
//
// **Lo que se le añade a la maqueta, y por qué.** El hilo de la maqueta no dice quién escribió
// cada línea ni a qué hora, porque sus datos son de ejemplo y su mesa tiene una sola voz. Aquí sí:
// la firma —quién y a qué hora— y la insignia de visibilidad son datos de la partida que ya
// estaban en el registro, y el §7 de la auditoría es explícito en que sustituir la presentación
// no puede perder lo que la maqueta no contempla. Van pequeñas y apagadas —debajo del mensaje, o
// detrás de él en una intervención de personaje—, nunca compitiendo con él, y la insignia solo
// sale cuando el suceso no es de la mesa entera (ver `Firma`).
//
// **La frase la sigue escribiendo `linea-de-log.ts`.** Este fichero decide la forma, no el texto:
// ningún valor de enumeración se traduce aquí.
//
// **`data-suceso` en cada línea.** El identificador va al DOM porque la marca de lectura vive en
// el navegador y la única forma de comprobar la franja de «te perdiste» en un recorrido es poder
// decir «da por visto ESTE». Es dato, no adorno, y por eso lo llevan las cinco formas.
//
// ---
//
// **Dónde esto NO copia la maqueta**, declarado porque desviarse en silencio y llamarlo acuerdo
// es el fallo que trajo esta tanda entera: **la banda del sello no lleva `role="separator"`**, y
// la de la maqueta sí. A propósito. Un sello **es un suceso de la partida** —alguien lo puso, con
// su hora y su visibilidad—, no una marca de lectura. Ese papel ya lo tiene la franja de «desde
// aquí te perdiste», que es lo único de esta lista que de verdad separa en vez de contar, y
// dárselo también al sello haría que un lector de pantalla no pudiera distinguirlos.
// (Las otras tres desviaciones, las tres cosméticas, se declaran en `HiloDeSesion.tsx`, que es
// donde viven el compositor y la franja.)

/**
 * La firma: quién y cuándo, y solo cuando hace falta, quién puede verlo. Pequeña, apagada, debajo.
 *
 * **La insignia de visibilidad sale únicamente si el suceso NO es de la mesa entera.** Un hilo de
 * sesión es, por definición, lo que ve la mesa: repetir «Jugadores» en cada una de las cuarenta
 * líneas no informa de nada y tapa la prosa, que es justo lo que la auditoría reprocha a la lista
 * plana. Lo que sí importa —y sigue saliendo marcado— es lo que se sale de ahí: lo que solo ve el
 * DM, lo que ven jugadores concretos, lo que es público. Es el mismo razonamiento con el que
 * `ui/Badge.tsx` apagó el tono de «Público» en su segunda pasada.
 */
function Firma({
  autor,
  hora,
  visibility,
  className = "",
}: {
  autor: string;
  hora: string;
  visibility: GameEventRow["visibility"];
  className?: string;
}) {
  return (
    <p
      className={`mt-0.5 flex items-center gap-s2 font-data text-chrome-xs text-muted ${className}`}
    >
      <span>{`${autor} · ${hora}`}</span>
      {visibility !== "PLAYERS" && <Badge visibility={visibility} />}
    </p>
  );
}

/**
 * El título de un sello.
 *
 * Un sello puesto a mano se anuncia con **el nombre de su clase** —«Hallazgo»—, que es lo que se
 * lee de un vistazo sin leer la frase; los cuatro hitos que también son sello (abrir y cerrar la
 * sesión, empezar y terminar el combate) no tienen clase, así que se anuncian con su propia
 * frase, exactamente como el sello de la maqueta («Sesión 14 · El Puerto Viejo, almacén cuatro»).
 */
function tituloDeSello(p: GameEventPayload): string {
  const sello = selloDeSuceso(p);
  return sello ? NOMBRE_SELLO[sello] : lineaDeLog(p);
}

export function MensajeDelHilo({
  evento,
  autor,
  ligada,
  nuevo,
}: {
  evento: GameEventRow;
  /** El nombre de quien lo hizo. El hilo manda «Alguien» si no conoce a ese miembro. */
  autor: string;
  /** La tirada de la que cuelga un ataque, si está en la ventana del registro. */
  ligada?: GameEventPayload | null;
  /** Llegó después de que se abriera la pantalla: entra con `surge`. */
  nuevo: boolean;
}) {
  const p = evento.payload;
  const tipo = tipoDeMensaje(p);
  const linea = lineaDeLog(p);
  const hora = horaDe(evento.createdAt);

  // Lo que envuelve a cualquiera de las cinco formas: `shrink-0` para que la línea no se encoja
  // dentro de la columna con scroll, y `anim-surge` si el suceso acaba de llegar a la mesa.
  const contenedor = `shrink-0 ${nuevo ? "anim-surge" : ""}`;

  if (tipo === "sello") {
    const titulo = tituloDeSello(p);
    // **La banda dice la clase y el cuerpo dice lo que se anotó, sin repetir la palabra.**
    // La primera versión pintaba abajo la frase entera de `lineaDeLog` —«Hallazgo» en la banda y
    // «Hallazgo: media carta con el sello» debajo—, que es leer dos veces lo mismo. `lineaDeLog`
    // no se toca: la compone así para la crónica y para quien lea el registro fuera de la mesa,
    // donde no hay banda que ponga la clase delante. Aquí sí la hay, así que el hilo pinta solo
    // la mitad que la banda no dice ya.
    //
    // Un sello sin texto —los que dejó el defecto de los sellos vacíos— se queda solo con su
    // banda, que es exactamente lo que ese suceso sabe.
    const cuerpo = p.type === "SESSION_NOTE" ? (p.text ?? null) : null;
    return (
      <li data-suceso={evento.id} className={contenedor}>
        <p className="my-s3 flex items-center gap-s3">
          <span aria-hidden="true" className="h-px flex-1 bg-copper/30" />
          <span className="font-title text-chrome-sm uppercase tracking-widest text-copper-text">
            {titulo}
          </span>
          <span aria-hidden="true" className="h-px flex-1 bg-copper/30" />
        </p>
        {cuerpo && (
          <p className="text-center font-world text-world-base leading-snug text-text">{cuerpo}</p>
        )}
        <div className="flex justify-center">
          <Firma autor={autor} hora={hora} visibility={evento.visibility} />
        </div>
      </li>
    );
  }

  if (tipo === "narracion") {
    // Prosa del mundo, medida cómoda de leer, con capitular de cobre.
    return (
      <li data-suceso={evento.id} className={contenedor}>
        <p className="capitular my-s2 max-w-[62ch] font-world text-world-base text-copper-text/90">
          {linea}
        </p>
        {/* `clear-both`: la capitular flota, y sin esto la firma se mete al lado de la letra. */}
        <Firma autor={autor} hora={hora} visibility={evento.visibility} className="clear-both" />
      </li>
    );
  }

  if (tipo === "tirada") {
    const datos = datosDeTirada(p, ligada);
    return (
      <li data-suceso={evento.id} className={contenedor}>
        <p className="font-chrome text-chrome-sm text-muted">{linea}</p>
        {datos && <TiradaIncrustada t={datos} />}
        <Firma autor={autor} hora={hora} visibility={evento.visibility} />
      </li>
    );
  }

  if (tipo === "sistema") {
    return (
      <li data-suceso={evento.id} className={contenedor}>
        <p className="my-s2 font-chrome text-chrome-xs italic text-muted">{linea}</p>
        <Firma autor={autor} hora={hora} visibility={evento.visibility} />
      </li>
    );
  }

  // Personaje: la voz de quien actuó, con su color. El nombre va delante y en el mismo párrafo,
  // como en la maqueta; **la hora va detrás y en la misma línea**, no debajo. Una firma por
  // mensaje partía en dos cada intervención y devolvía al hilo el aspecto de lista que esto
  // viene a quitar. La insignia solo aparece si el suceso no es de la mesa entera.
  const voz = colorDeVoz(evento.actorUserId);
  return (
    <li data-suceso={evento.id} className={contenedor}>
      <p className="my-s1 max-w-[62ch] font-world text-world-base">
        <span className={`font-chrome text-chrome-sm font-semibold ${voz}`}>{autor}</span>{" "}
        <span className={voz}>{linea}</span>{" "}
        <span className="font-data text-chrome-xs text-muted">{hora}</span>
      </p>
      {evento.visibility !== "PLAYERS" && (
        <p className="mt-0.5">
          <Badge visibility={evento.visibility} />
        </p>
      )}
    </li>
  );
}
