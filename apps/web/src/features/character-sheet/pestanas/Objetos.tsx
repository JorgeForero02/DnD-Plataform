import { PaginaDeInventario } from "../../inventory/PaginaDeInventario";
import type { PropsDePestana } from "./tipos";

// Tarea 7 (spec 2026-09-11, «la hoja a página completa») — la pestaña `Objetos`: el inventario
// entero, montado como lo montaba `HojaCalculada.tsx` a todo lo ancho bajo la rejilla.
//
// **El hueco del inventario, relleno (fase 2B).** Aquí hubo un recuadro punteado que decía
// «llega en la fase 2B». Lo que se enchufa es el inventario entero, y **dentro de la hoja y no
// en otra pantalla**: equipar algo cambia la CA de la cabecera delante de quien lo hace, y esa
// relación —que es lo que hace útil a esta herramienta— se pierde con una navegación por medio.
//
// **La bolsa se pinta una sola vez, y la pinta el inventario.** Hubo una tarjeta de solo lectura
// con las cinco monedas en la columna derecha; con el inventario debajo, la misma hoja enseñaba
// el dinero dos veces —una para leer y otra para mover—, que es la clase de duplicado que acaba
// discrepando en cuanto uno de los dos se actualiza y el otro no. Se queda el que deja hacer algo.
//
// `disposicion` y `puedeEditar` no se usan todavía: la Tarea 9 le da al inventario su rejilla
// por disposición. `PaginaDeInventario` decide por su cuenta quién edita (D-CF-15, `useMyRole`).
export function Objetos({ campaignId, characterId }: PropsDePestana) {
  return (
    <div data-pestana="objetos" className="flex min-w-0 flex-col gap-s4">
      <PaginaDeInventario campaignId={campaignId} characterId={characterId} />
    </div>
  );
}
