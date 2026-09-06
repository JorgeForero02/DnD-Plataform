import { useId, useState } from "react";
import type { AttackDto, CalculatedSheet } from "./api";
import { TirarAtaqueBoton } from "./TirarAtaqueBoton";
import { ListaDeTraza } from "./Traza";
import { formulaDeUnaLinea } from "./formula";
import { PROSA_DE_HOJA, ROTULO_DE_CASILLA, TarjetaDeHoja } from "./Tarjeta";
import { nombrePropiedadArma, nombreTipoDano } from "./vocabulario";

// **«Ataques y lanzamiento» es una tabla** — la decisión de la maqueta de Figma, adoptada.
//
// ============================================================================================
// Carril B3 (fase 2B/2C) — el cuadro de ataques de verdad
// ============================================================================================
//
// Hasta hoy esta tarjeta pintaba los tres bonificadores genéricos que deriva el motor —cuerpo a
// cuerpo, a distancia, de conjuro— porque el arma, el daño y sus propiedades llegaban del
// inventario, que no existía todavía. Ahora `GET .../sheet` trae `attacks: Attack[]`
// (`apps/api/src/rules/attacks.ts`): una fila por arma **equipada**, con su bono con traza, su
// expresión de daño ya montada por el servidor y sus propiedades. Los tres bonificadores
// genéricos desaparecen: media mecánica de ataque en pantalla es peor que ninguna, porque parece
// completa (ficha M19 de `docs/06-pendientes.md`).
//
// **El alcance se enseña en metros; la base sigue hablando en pies** — la misma discrepancia
// deliberada que ya explica `HojaCalculada.tsx` para la velocidad de la cabecera: convertir solo
// esta tabla no es un descuido, es que la conversión del resto de la hoja es una decisión de
// producto que no toca este carril.

const PIES_POR_METRO = 1 / 0.3048;

function metros(pies: number): number {
  return Math.round(pies / PIES_POR_METRO);
}

/** El texto de la columna Notas: propiedades traducidas + alcance en metros, cada una una vez. */
function notasDeArma(ataque: AttackDto): string[] {
  const notas = ataque.properties
    .filter((p) => p !== "VERSATILE") // Versátil ya se ve en las dos filas de daño; repetirlo aquí no añade nada.
    .map(nombrePropiedadArma);
  if (ataque.rangeNormalFt !== undefined) {
    const largo = ataque.rangeLongFt !== undefined ? `/${metros(ataque.rangeLongFt)}` : "";
    notas.push(`Alcance ${metros(ataque.rangeNormalFt)}${largo} m`);
  }
  return notas;
}

/** La columna Daño/tipo: una mano, y a dos manos si es versátil — nunca una fila aparte. */
function DanoYTipo({ ataque }: { ataque: AttackDto }) {
  const tipo = nombreTipoDano(ataque.damage.type);
  if (!ataque.versatileDamage) {
    return (
      <span className="font-data text-chrome-sm text-text">
        {ataque.damage.expression} <span className="font-chrome text-muted">{tipo}</span>
      </span>
    );
  }
  return (
    <span className="font-data text-chrome-sm text-text">
      {ataque.damage.dice}
      <span className="font-chrome text-muted"> / </span>
      {ataque.versatileDamage.dice}
      {ataque.damage.modifier !== 0 && (
        <span>
          {ataque.damage.modifier > 0 ? "+" : ""}
          {ataque.damage.modifier}
        </span>
      )}{" "}
      <span className="font-chrome text-muted">{tipo}</span>
    </span>
  );
}

/** El bono al ataque, con su traza desplegable — «como el resto de valores derivados». */
function BonoDeAtaque({ ataque }: { ataque: AttackDto }) {
  const [abierta, setAbierta] = useState(false);
  const listId = useId();
  const valor = ataque.attackBonus;

  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        aria-expanded={abierta}
        aria-controls={listId}
        aria-label={`Bono al ataque con ${ataque.name}: ${valor.total >= 0 ? "+" : ""}${
          valor.total
        }. Ver de dónde sale`}
        className="font-data text-chrome-md text-text hover:text-accent-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {valor.total >= 0 ? "+" : "−"}
        {Math.abs(valor.total)}
      </button>
      {abierta && (
        <div className="mt-1 border-l border-muted pl-s2">
          <p className="font-chrome text-chrome-xs text-muted">{formulaDeUnaLinea(valor)}</p>
          <ListaDeTraza id={listId} steps={valor.steps} />
        </div>
      )}
    </div>
  );
}

function FilaDeArma({
  campaignId,
  characterId,
  ataque,
}: {
  campaignId: string;
  characterId: string;
  ataque: AttackDto;
}) {
  const notas = notasDeArma(ataque);
  return (
    <tr className="border-b border-muted align-top">
      <th
        scope="row"
        className="py-s2 pr-s3 text-left font-chrome text-chrome-sm font-normal text-text"
      >
        {ataque.name}
      </th>
      <td className="py-s2 pr-s3">
        <BonoDeAtaque ataque={ataque} />
        {/* **Sin competencia, la fila lo dice** — un bono que no incluye competencia y no lo
            explica es una hoja que miente. El aviso `attack_not_proficient` también sale en la
            tarjeta de avisos, pero ahí está lejos de la cifra a la que se refiere. */}
        {!ataque.proficient && (
          <p className="mt-0.5 font-chrome text-chrome-xs text-warning-text">Sin competencia</p>
        )}
      </td>
      <td className="py-s2 pr-s3">
        <DanoYTipo ataque={ataque} />
      </td>
      <td className={`py-s2 pr-s3 ${PROSA_DE_HOJA}`}>
        {notas.length > 0 ? notas.join(", ") : <span aria-hidden="true">&mdash;</span>}
      </td>
      <td className="py-s2 align-middle">
        <TirarAtaqueBoton campaignId={campaignId} characterId={characterId} ataque={ataque} />
      </td>
    </tr>
  );
}

export function AtaquesYLanzamiento({
  campaignId,
  characterId,
  sheet,
  attacks,
}: {
  campaignId: string;
  characterId: string;
  sheet: CalculatedSheet;
  attacks: AttackDto[];
}) {
  return (
    <TarjetaDeHoja titulo="Ataques y lanzamiento" etiqueta="ataques y lanzamiento">
      {attacks.length === 0 ? (
        // **Sin arma equipada, la hoja dice por qué está vacío** — no un hueco mudo. Esta tabla
        // se deriva de lo equipado (`apps/api/src/rules/attacks.ts`, que es el SRD): sin nada
        // equipado no hay nada que derivar, y eso confundió al autor hasta hacerle pensar que su
        // clase no le dejaba elegir ataques. El enlace baja a la bolsa —`id="inventario"` en
        // `PaginaDeInventario.tsx`, montada más abajo en esta misma hoja— en vez de mandar a
        // otra pantalla: equipar cambia la CA de arriba delante de quien lo hace.
        <p className={PROSA_DE_HOJA}>
          No llevas ningún arma equipada, así que no hay nada que calcular todavía. Equipa un arma
          en la{" "}
          <a href="#inventario" className="text-accent-text underline hover:no-underline">
            bolsa
          </a>{" "}
          para que aparezca aquí, con su bono y su daño.
          {sheet.derived["attack.spell"] && " Tu ataque de conjuro no necesita arma y sigue abajo."}
        </p>
      ) : (
        // Una tabla ancha se desplaza **dentro de su contenedor**; la página nunca se desplaza en
        // horizontal.
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-muted">
                <th scope="col" className={`${ROTULO_DE_CASILLA} py-1 pr-s3 font-normal`}>
                  Nombre
                </th>
                <th scope="col" className={`${ROTULO_DE_CASILLA} py-1 pr-s3 font-normal`}>
                  Bonif.
                </th>
                <th scope="col" className={`${ROTULO_DE_CASILLA} py-1 pr-s3 font-normal`}>
                  Daño / tipo
                </th>
                <th scope="col" className={`${ROTULO_DE_CASILLA} py-1 pr-s3 font-normal`}>
                  Notas
                </th>
                <th scope="col" className="w-0 py-1">
                  <span className="sr-only">Tirar</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {attacks.map((ataque) => (
                <FilaDeArma
                  key={ataque.key}
                  campaignId={campaignId}
                  characterId={characterId}
                  ataque={ataque}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ul className="mt-s2 flex flex-wrap gap-s2">
        {sheet.attacksPerAction > 1 && (
          <li className="rounded-radius-sm border border-muted px-s2 py-1 font-chrome text-chrome-sm text-text">
            {sheet.attacksPerAction} ataques por acción
          </li>
        )}
        {/* **El ataque de conjuro no desapareció con los bonos genéricos, y no podía.** La tabla
            de arriba es de armas equipadas, y un lanzador ataca sin llevar ninguna: quitarle la
            cifra al pasar a filas por arma habría dejado a un mago mirando «equipa un arma» con
            su ataque real fuera de la pantalla. Va como marca junto a la CD porque no es una fila
            de la tabla —no tiene daño ni propiedades—, y su traza se lee en la lista de valores
            derivados como cualquier otro. */}
        {sheet.derived["attack.spell"] && (
          <li className="rounded-radius-sm border border-muted px-s2 py-1 font-chrome text-chrome-sm text-text">
            Ataque de conjuro {sheet.derived["attack.spell"].total >= 0 ? "+" : "−"}
            {Math.abs(sheet.derived["attack.spell"].total)}
          </li>
        )}
        {sheet.derived.spellSaveDc && (
          <li className="rounded-radius-sm border border-muted px-s2 py-1 font-chrome text-chrome-sm text-text">
            CD de salvación de conjuro {sheet.derived.spellSaveDc.total}
          </li>
        )}
      </ul>
    </TarjetaDeHoja>
  );
}
