// Deuda S1, cerrada — la atribución del SRD 5.1 vista desde la aplicación.
//
// **Por qué esto no es un adorno.** La CC BY 4.0 exige la atribución **en la obra distribuida**,
// no solo en el repositorio. `NOTICE.md` cumple con quien lee el código; esto cumple con quien
// usa el producto, que es el que de verdad recibe la obra. Estaba anotado como S1 en
// `docs/06-pendientes.md` con una fecha implícita: **deja de ser opcional en cuanto una pantalla
// pinte datos del SRD**, y la hoja de personaje (2A.10) los va a pintar.
//
// **Y la nota de modificación importa tanto como la atribución.** La licencia obliga a declarar
// lo que se ha cambiado, y omitir esa frase incumple igual que omitir el nombre del autor.
//
// **Lo que declara cambió el 2026-09-02.** Decía que los nombres «se han traducido al español»,
// como modificación nuestra; desde que el catálogo usa la **traducción oficial al español que
// publica Wizards** —bajo la misma CC BY— eso es falso. Nuestra modificación es reorganizar y
// seleccionar, y es lo único que se declara. Y la línea de atribución pasa a ser **la española**,
// que es la edición que de verdad se está usando: Wizards la da literalmente en su PDF y añade
// que no se incluya ningún otro reconocimiento aparte del suyo.

import { Link } from "react-router-dom";

/** El enlace al SRD y a la licencia, que la atribución tiene que llevar. */
export const SRD_URL = "https://dnd.wizards.com/es/resources/systems-reference-document";
export const CC_BY_URL = "https://creativecommons.org/licenses/by/4.0/legalcode.es";

/**
 * El aviso legal **tal cual lo da Wizards en la edición española del SRD**, palabra por palabra.
 * No se reescribe: es el texto de atribución, y tocarlo sería modificar justo lo que da fe.
 */
export const SRD_ATTRIBUTION_ES =
  'Esta obra incluye materiales extraídos del Documento de referencia del sistema 5.1 ("SRD 5.1") ' +
  "de Wizards of the Coast LLC, que está disponible en " +
  `${SRD_URL}. El SRD 5.1 tiene la licencia Creative Commons Atribución/Reconocimiento 4.0 ` +
  `Licencia Pública Internacional, que está disponible en ${CC_BY_URL}.`;

/** La nota de modificación: lo que hicimos NOSOTROS, que ya no incluye traducir. */
export const SRD_MODIFICATION_ES =
  "Modificaciones: el material se ha reorganizado como datos estructurados y se ha seleccionado " +
  "un subconjunto. Los nombres son los de la traducción oficial al español de Wizards.";

/**
 * El pie que va en toda pantalla con sesión.
 *
 * Es deliberadamente pequeño y callado —`text-chrome-xs`, `text-muted`— porque **cumplir no es
 * lo mismo que interrumpir**: la licencia pide que la atribución esté y sea visible, no que
 * compita con el contenido. Quien quiera el texto entero tiene el enlace.
 */
export function LegalNotice() {
  return (
    <footer className="mt-s6 border-t border-copper pt-s3 font-chrome text-chrome-xs text-muted">
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
        , reorganizado como datos estructurados.{" "}
        <Link to="/acerca-de" className="underline hover:text-accent-text">
          Acerca de
        </Link>
      </p>
    </footer>
  );
}
