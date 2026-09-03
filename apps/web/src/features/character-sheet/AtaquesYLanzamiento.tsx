import type { DerivedValue } from "@dnd/shared";
import type { CalculatedSheet } from "./api";
import { TirarBoton } from "./TirarBoton";
import { formulaDeUnaLinea } from "./formula";
import { PROSA_DE_VITELA, ROTULO_DE_CASILLA, RotuloDeSeccion } from "./Vitela";

// **«Ataques y lanzamiento» es una tabla** — la decisión de la maqueta de Figma, adoptada.
//
// Antes eran cuatro casillas sueltas en la columna derecha, cada una con su rótulo largo
// («Ataque cuerpo a cuerpo»), su fórmula y su recuadro. Una tabla dice lo mismo en una cuarta
// parte del alto y hace lo que una casilla no puede: **alinear las columnas**, que es
// exactamente por qué la hoja impresa dibuja ahí una rejilla y no cuatro cuadros.
//
// **Lo que la maqueta pone y nosotros todavía no tenemos: el arma.** Sus filas son «Estoque ·
// +5 · 1d8+3 perforante · Sutil, ataque furtivo +3d6». Las nuestras son los tres bonificadores
// que el motor deriva hoy —cuerpo a cuerpo, a distancia y de conjuro—, porque el daño y el
// nombre del arma salen del inventario, que llega en la fase 2B. La columna de daño existe y
// dice que está vacía **a propósito**: es el mismo criterio que el hueco del inventario, un
// sitio anunciado se enchufa y un sitio que no existe se improvisa donde quepa.

interface FilaDeAtaque {
  clave: string;
  nombre: string;
  valor: DerivedValue;
}

export function AtaquesYLanzamiento({
  campaignId,
  characterId,
  sheet,
}: {
  campaignId: string;
  characterId: string;
  sheet: CalculatedSheet;
}) {
  const filas: FilaDeAtaque[] = [
    { clave: "melee", nombre: "Cuerpo a cuerpo", valor: sheet.derived["attack.melee"] },
    { clave: "ranged", nombre: "A distancia", valor: sheet.derived["attack.ranged"] },
  ];
  if (sheet.derived["attack.spell"]) {
    filas.push({ clave: "spell", nombre: "De conjuro", valor: sheet.derived["attack.spell"] });
  }

  return (
    <section aria-label="ataques y lanzamiento">
      <RotuloDeSeccion>Ataques y lanzamiento</RotuloDeSeccion>
      {/* Una tabla ancha se desplaza **dentro de su contenedor**; la página nunca se desplaza en
          horizontal. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-copper">
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
            {filas.map((fila) => (
              <tr key={fila.clave} className="border-b border-[color:var(--copper-rule)]">
                <th
                  scope="row"
                  className="py-s2 pr-s3 text-left font-world text-[length:var(--text-world-sm)] font-normal text-text"
                >
                  {fila.nombre}
                </th>
                <td className="py-s2 pr-s3 font-data text-chrome-md text-text">
                  {fila.valor.total >= 0 ? "+" : "−"}
                  {Math.abs(fila.valor.total)}
                </td>
                <td className={`py-s2 pr-s3 ${PROSA_DE_VITELA}`}>
                  <span aria-hidden="true">&mdash;</span>
                  <span className="sr-only">sin arma equipada</span>
                </td>
                <td className={`py-s2 pr-s3 ${PROSA_DE_VITELA}`}>
                  {formulaDeUnaLinea(fila.valor)}
                </td>
                <td className="py-s2 align-middle">
                  <TirarBoton
                    campaignId={campaignId}
                    characterId={characterId}
                    etiqueta={`Ataque ${fila.nombre.toLowerCase()}`}
                    modificador={fila.valor.total}
                    derivado={fila.valor}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className={`mt-s2 ${PROSA_DE_VITELA}`}>
        La columna de daño se rellena con el arma equipada, en la fase 2B. Hasta entonces la hoja
        sabe con cuánto aciertas y no con cuánto pegas.
      </p>

      <ul className="mt-s2 flex flex-wrap gap-s2">
        {sheet.attacksPerAction > 1 && (
          <li className="rounded-radius-sm border border-copper px-s2 py-1 font-world text-[length:var(--text-world-sm)] text-text">
            {sheet.attacksPerAction} ataques por acción
          </li>
        )}
        {sheet.derived.spellSaveDc && (
          <li className="rounded-radius-sm border border-copper px-s2 py-1 font-world text-[length:var(--text-world-sm)] text-text">
            CD de salvación de conjuro {sheet.derived.spellSaveDc.total}
          </li>
        )}
      </ul>
    </section>
  );
}
