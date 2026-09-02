// Deuda S1, cerrada — la atribución del SRD 5.1 vista desde la aplicación.
//
// **Por qué esto no es un adorno.** La CC BY 4.0 exige la atribución **en la obra distribuida**,
// no solo en el repositorio. `NOTICE.md` cumple con quien lee el código; esto cumple con quien
// usa el producto, que es el que de verdad recibe la obra. Estaba anotado como S1 en
// `docs/06-pendientes.md` con una fecha implícita: **deja de ser opcional en cuanto una pantalla
// pinte datos del SRD**, y la hoja de personaje (2A.10) los va a pintar.
//
// **Y la nota de modificación importa tanto como la atribución.** Traducir al español *es* una
// modificación, y la licencia obliga a decirlo. Omitir esa frase es incumplir igual que omitir
// el nombre del autor.

import { Link } from "react-router-dom";

/** El enlace al SRD y a la licencia, que la atribución tiene que llevar. */
export const SRD_URL = "https://dnd.wizards.com/resources/systems-reference-document";
export const CC_BY_URL = "https://creativecommons.org/licenses/by/4.0/legalcode";

/**
 * El aviso legal en inglés, **tal cual lo pide la licencia**. No se traduce: es el texto de
 * atribución, y traducirlo sería modificar justo lo que da fe de la modificación.
 */
export const SRD_ATTRIBUTION_EN =
  'This work includes material taken from the System Reference Document 5.1 ("SRD 5.1") by ' +
  "Wizards of the Coast LLC, available at " +
  `${SRD_URL}. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 ` +
  `International License, ${CC_BY_URL}.`;

/** La nota de modificación, en español porque describe lo que hicimos nosotros. */
export const SRD_MODIFICATION_ES =
  "Modificaciones: los nombres y textos de reglas se han traducido al español y reorganizado " +
  "como datos estructurados.";

/**
 * El pie que va en toda pantalla con sesión.
 *
 * Es deliberadamente pequeño y callado —`text-chrome-xs`, `text-muted`— porque **cumplir no es
 * lo mismo que interrumpir**: la licencia pide que la atribución esté y sea visible, no que
 * compita con el contenido. Quien quiera el texto entero tiene el enlace.
 */
export function LegalNotice() {
  return (
    <footer className="mt-s6 border-t border-copper/40 pt-s3 font-chrome text-chrome-xs text-muted">
      <p>
        Contenido de reglas del{" "}
        <a
          href={SRD_URL}
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-accent-text"
        >
          System Reference Document 5.1
        </a>{" "}
        de Wizards of the Coast LLC, bajo licencia{" "}
        <a
          href={CC_BY_URL}
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-accent-text"
        >
          CC BY 4.0
        </a>
        , traducido al español y reorganizado.{" "}
        <Link to="/acerca-de" className="underline hover:text-accent-text">
          Acerca de
        </Link>
      </p>
    </footer>
  );
}
