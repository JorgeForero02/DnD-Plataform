import type { MoneyDto } from "./api";
import { NOMBRE_MONEDA } from "./vocabulario";
import { ROTULO_DE_CASILLA, TarjetaDeHoja } from "./Tarjeta";

// Carril B3 (fase 2B) — la bolsa: las cinco monedas del SRD, agrupadas y legibles.
//
// **Sin editor.** Mover dinero es del inventario —vender, comprar, repartir el botín entre la
// mesa—, que es otro carril de trabajo en marcha a la vez que este. Esta tarjeta solo lee lo que
// `GET .../sheet` ya trae (`money`, calcado del `Character` de la base): las cinco columnas de
// moneda, siempre presentes aunque valgan cero, para que la ausencia de una moneda se lea como
// «cero» y no como un hueco que hace preguntarse si faltó por cargar.

const ORDEN: (keyof MoneyDto)[] = ["pp", "gp", "ep", "sp", "cp"];

export function Bolsa({ money }: { money: MoneyDto }) {
  return (
    <TarjetaDeHoja titulo="Bolsa" etiqueta="bolsa">
      <div className="grid grid-cols-5 gap-s2">
        {ORDEN.map((clave) => (
          <div key={clave} className="text-center">
            <p className={ROTULO_DE_CASILLA}>{NOMBRE_MONEDA[clave]}</p>
            <p className="mt-0.5 font-data text-chrome-lg leading-none text-text">{money[clave]}</p>
          </div>
        ))}
      </div>
    </TarjetaDeHoja>
  );
}
