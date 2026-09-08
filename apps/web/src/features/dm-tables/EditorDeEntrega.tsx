import { useMemo, useState } from "react";
import type { CoinKey, ContentRefInput, EntregaInput } from "@dnd/shared";
import { COIN_KEYS } from "@dnd/shared";
import { Button } from "../../ui/Button";
import { Dialog } from "../../ui/Dialog";
import { Field, fieldControlClass } from "../../ui/Field";
import { IconoQuitar } from "../../ui/Iconos";
import { useCampaignItems } from "../campaign-items/hooks";
import { useCatalogItems } from "../inventory/hooks";
import {
  NOMBRE_MONEDA,
  NOMBRE_PROCEDENCIA,
  type ProcedenciaObjeto,
} from "../inventory/vocabulario";
import { IconoEntrega } from "./iconos";
import { resumenDeEntrega } from "./vocabulario";

// **Ficha P2-2 — lo que una fila entrega, redactado desde la pantalla.**
//
// El servidor sabe guardar una `entrega` y resolverla al tirar desde que existe la columna; lo que
// faltaba era el primer eslabón. Hasta hoy la única forma de sembrar una fila con botín era un
// `curl`, y sobre una tabla sembrada así se declaró terminado el plan del botín.
//
// ## Las tres decisiones de forma, y por qué
//
// **1 · Editor secundario por fila, no en línea.** La fila ya lleva tres campos (desde, hasta,
// resultado) y una entrega es una estructura anidada: una lista de objetos con cantidad más cinco
// campos de moneda. En línea, cada fila se vuelve enorme y una tabla de veinte filas deja de
// caber; esta mesa ya tiene deuda abierta por repartir mal a lo ancho a 390 px. **Y el botón dice
// lo que hay dentro sin abrirlo**, que es lo que hace que el editor secundario no esconda nada.
//
// **2 · Objetos Y monedas a la vez.** Lo dice el esquema y no una preferencia: el `.refine` de
// `entregaSchema` solo prohíbe que la entrega esté **vacía** —cierra las tres formas de estarlo—,
// no que las dos mitades coexistan. Un selector de «o una cosa o la otra» sería una pantalla
// afirmando una regla que el servidor no tiene.
//
// **3 · No se escribe un segundo catálogo.** `SelectorDeObjeto` (`features/inventory`) **no
// encaja**: no es un selector sino un formulario de «añadir al inventario» —exige `characterId`,
// llama a `useAddInventoryItem` al confirmar y no devuelve nada a quien lo monta, lleva un campo
// de Zona que aquí no significa nada, y ofrece hasta 9999 unidades cuando `entregaObjetoSchema`
// para en 999—. Lo que se reutiliza es lo caro, su **capa de datos**: los mismos hooks
// (`useCatalogItems`, `useCampaignItems`) y el mismo vocabulario. Lo que se escribe aquí es solo
// el trozo que no existía, elegir-y-devolver una `ContentRefInput`. Extraer un selector de verdad
// reutilizable es mejor ingeniería y toca dos pantallas más: queda dicho en el historial.
//
// ## Los topes son los del esquema, no unos parecidos
//
// Regla vinculante (`docs/04-convenciones.md`): si el texto explica una regla del servidor y
// discrepan, **miente el texto**. Cantidad de un objeto entre 1 y 999 (`entregaObjetoSchema`),
// cada moneda entre 0 y 1.000.000 (`monedasSchema`). Si el esquema cambia, estos números cambian
// con él — y hay una prueba que los compara.

/** Las cinco monedas mientras se teclean: texto, porque son entradas controladas. */
type MonedasEnEdicion = Partial<Record<CoinKey, string>>;

interface FilaDelCatalogo {
  /** Clave de React y de filtrado — no viaja al servidor. */
  id: string;
  name: string;
  procedencia: ProcedenciaObjeto;
  ref: ContentRefInput;
}

function aTexto(entrega: EntregaInput | undefined): MonedasEnEdicion {
  const monedas: MonedasEnEdicion = {};
  for (const clave of COIN_KEYS) {
    const valor = entrega?.monedas?.[clave];
    if (valor !== undefined && valor > 0) monedas[clave] = String(valor);
  }
  return monedas;
}

/**
 * El botón de una fila y su panel.
 *
 * **El estado vive aquí y solo sale al confirmar**: cerrar el panel sin guardar deja la fila como
 * estaba, que es lo que un editor secundario tiene que hacer para no ser una trampa.
 */
export function EditorDeEntrega({
  campaignId,
  indice,
  entrega,
  onCambiar,
}: {
  campaignId: string;
  /** Base 1, el mismo número que ve el DM en «Quitar la fila N». */
  indice: number;
  entrega: EntregaInput | undefined;
  onCambiar: (entrega: EntregaInput | undefined) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [objetos, setObjetos] = useState(entrega?.objetos ?? []);
  const [monedas, setMonedas] = useState<MonedasEnEdicion>(() => aTexto(entrega));
  const [texto, setTexto] = useState("");
  const [elegido, setElegido] = useState<FilaDelCatalogo | null>(null);
  const [cantidad, setCantidad] = useState("1");

  // **Con `enabled: abierto`**, igual que el catálogo de `SelectorDeObjeto` y que el selector de
  // «Dar…»: este mando vive en cada fila de la tabla, y traer el catálogo al montarse sería una
  // petición por fila cada vez que alguien abre el formulario, aunque no vaya a dar nada.
  const catalogo = useCatalogItems({ enabled: abierto });
  const objetosDeLaCampana = useCampaignItems(campaignId, { enabled: abierto });

  const filas = useMemo<FilaDelCatalogo[]>(() => {
    const delCatalogo: FilaDelCatalogo[] = (catalogo.data ?? []).map((item) => ({
      id: item.ref,
      name: item.name,
      procedencia: "SRD",
      ref: { source: "SRD", key: item.ref.replace(/^SRD:/, "") },
    }));
    // La lista de la campaña ya llega filtrada por `canView` desde el servidor: aquí no se
    // reimplementa ese filtro, solo se pinta lo que decidió mandar.
    const deLaCampana: FilaDelCatalogo[] = (objetosDeLaCampana.data ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      procedencia: "CAMPAIGN",
      ref: { source: "CAMPAIGN", id: item.id },
    }));
    return [...delCatalogo, ...deLaCampana].sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [catalogo.data, objetosDeLaCampana.data]);

  const filtradas = useMemo(() => {
    const buscado = texto.trim().toLowerCase();
    if (!buscado) return filas;
    return filas.filter((fila) => fila.name.toLowerCase().includes(buscado));
  }, [filas, texto]);

  const catalogoCargando = catalogo.isPending || objetosDeLaCampana.isPending;

  /**
   * El nombre de una `ref` ya añadida, para no enseñar la referencia cruda en la lista.
   *
   * **Cargando no es lo mismo que ausente**, y confundirlos era una mentira medible: con el
   * catálogo todavía en vuelo, una espada corta perfectamente viva salía como «un objeto que el
   * catálogo ya no encuentra». La regla vinculante es justo ésa —si el texto y el servidor
   * discrepan, miente el texto—, y aquí discrepaban durante el primer segundo de cada apertura.
   * Lo encontró la prueba de que ninguna clave llega a pantalla, mirando el panel a medio cargar.
   */
  function nombreDe(ref: ContentRefInput): string {
    const fila = filas.find(
      (f) =>
        (ref.source === "SRD" && f.ref.source === "SRD" && f.ref.key === ref.key) ||
        (ref.source === "CAMPAIGN" && f.ref.source === "CAMPAIGN" && f.ref.id === ref.id),
    );
    if (fila) return fila.name;
    // **Nunca la `ref`.** Enseñar `SRD:short-sword` sería exactamente el fallo de la clave de
    // enumeración en pantalla, así que las dos ramas se dicen con palabras.
    return catalogoCargando
      ? "Buscando en el catálogo…"
      : "Un objeto que el catálogo ya no encuentra";
  }

  function cerrar() {
    setAbierto(false);
    setElegido(null);
    setTexto("");
    setCantidad("1");
  }

  function anadirObjeto() {
    if (!elegido) return;
    const cuantas = Math.max(1, Math.min(999, Number(cantidad) || 1));
    setObjetos((previos) => [...previos, { ref: elegido.ref, cantidad: cuantas }]);
    setElegido(null);
    setCantidad("1");
    setTexto("");
  }

  function guardar() {
    const monedasNumericas: Partial<Record<CoinKey, number>> = {};
    for (const clave of COIN_KEYS) {
      const valor = Number(monedas[clave] ?? "");
      if (Number.isFinite(valor) && valor > 0) monedasNumericas[clave] = valor;
    }
    const hayObjetos = objetos.length > 0;
    const hayMonedas = Object.keys(monedasNumericas).length > 0;
    // **Una entrega vacía no se manda, se quita.** El `.refine` del esquema la rechazaría, y
    // mandar `{}` para que el servidor conteste que no vale sería pedirle que nos diga lo que ya
    // sabemos. Vaciar la entrega **es** la forma de quitarla.
    onCambiar(
      hayObjetos || hayMonedas
        ? {
            ...(hayObjetos ? { objetos } : {}),
            ...(hayMonedas ? { monedas: monedasNumericas } : {}),
          }
        : undefined,
    );
    cerrar();
  }

  const resumen = resumenDeEntrega(entrega);

  if (!abierto) {
    return (
      <Button
        type="button"
        variant="ghost"
        aria-label={`Entrega de la fila ${indice}: ${resumen}`}
        onClick={() => setAbierto(true)}
      >
        <IconoEntrega className="h-4 w-4" />
        Entrega…
        <span className="ml-1 font-chrome text-chrome-xs text-muted">{resumen}</span>
      </Button>
    );
  }

  return (
    <Dialog
      open
      onClose={cerrar}
      title={`Entrega de la fila ${indice}`}
      size="sm"
      subtitulo="Lo que se lleva quien saque este resultado. Puede dar objetos, monedas o las dos cosas."
      acciones={
        <>
          <Button type="button" variant="ghost" onClick={cerrar}>
            Cancelar
          </Button>
          {/* Nunca deshabilitado (docs/04-convenciones.md): guardar sin nada dentro **quita** la
              entrega, que es un resultado legítimo y no un error. */}
          <Button type="button" variant="primary" onClick={guardar}>
            Guardar la entrega
          </Button>
        </>
      }
    >
      <fieldset className="rounded-radius-sm border border-muted p-s2">
        <legend className="px-1 font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
          Objetos
        </legend>

        {objetos.length === 0 ? (
          <p className="font-chrome text-chrome-sm text-muted">Todavía no da ningún objeto.</p>
        ) : (
          <ul className="mb-s2 space-y-1">
            {objetos.map((objeto, i) => (
              <li key={i} className="flex items-center gap-s2">
                <span className="min-w-0 flex-1 truncate font-chrome text-chrome-sm text-text">
                  {/* **Sin el aspa de multiplicar**, que es un glifo y la regla de esta pantalla
                      es que los iconos se dibujan: el barrido de `Iconos` lo caza, y lo cazó — la
                      primera versión de esta línea lo llevaba. En una lista de botín «2 unidades»
                      se lee mejor de todos modos. */}
                  {nombreDe(objeto.ref)}
                  {objeto.cantidad > 1 ? ` · ${objeto.cantidad} unidades` : ""}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={`Quitar ${nombreDe(objeto.ref)} de la entrega`}
                  onClick={() => setObjetos((previos) => previos.filter((_, j) => j !== i))}
                >
                  <IconoQuitar className="h-4 w-4" />
                  Quitar
                </Button>
              </li>
            ))}
          </ul>
        )}

        <Field label="Buscar en el catálogo">
          <input
            type="search"
            className={fieldControlClass}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar objeto por nombre…"
          />
        </Field>

        {catalogoCargando ? (
          <p className="mt-s2 font-chrome text-chrome-sm text-muted">Cargando el catálogo…</p>
        ) : filtradas.length === 0 ? (
          <p className="mt-s2 font-chrome text-chrome-sm text-muted">
            Ningún objeto coincide con «{texto}».
          </p>
        ) : (
          <ul className="mt-s2 max-h-48 overflow-y-auto rounded-radius-sm border border-muted">
            {filtradas.map((fila) => (
              <li key={`${fila.procedencia}:${fila.id}`}>
                <button
                  type="button"
                  aria-pressed={elegido?.id === fila.id}
                  onClick={() => setElegido(fila)}
                  className={[
                    "flex w-full items-center gap-s2 border-b border-muted px-s3 py-s2 text-left last:border-b-0",
                    elegido?.id === fila.id
                      ? "bg-[color:var(--accent-tint)]"
                      : "hover:bg-bg focus-visible:bg-bg",
                  ].join(" ")}
                >
                  <span className="min-w-0 flex-1 truncate font-chrome text-chrome-sm text-text">
                    {fila.name}
                  </span>
                  <span className="shrink-0 rounded-radius-sm border border-muted px-1.5 py-px font-chrome text-chrome-xs text-muted">
                    {NOMBRE_PROCEDENCIA[fila.procedencia]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-s2 flex flex-wrap items-end gap-s2">
          <div className="w-24">
            {/* 1 a 999: los de `entregaObjetoSchema`, no unos parecidos. */}
            <Field label="Cuántas">
              <input
                type="number"
                min={1}
                max={999}
                className={fieldControlClass}
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
              />
            </Field>
          </div>
          <Button type="button" variant="secondary" onClick={anadirObjeto}>
            Añadir a la entrega
          </Button>
        </div>
      </fieldset>

      <fieldset className="mt-s3 rounded-radius-sm border border-muted p-s2">
        <legend className="px-1 font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
          Monedas
        </legend>
        {/* **Cinco enteros y no un total** (D-2B-5, igual que la bolsa de un personaje):
            normalizar aquí y desnormalizar allí inventaría una segunda verdad para el mismo
            dinero. Y con su nombre legible: `NOMBRE_MONEDA` se escribe una vez, en
            `features/inventory/vocabulario.ts`, y se importa. */}
        <div className="flex flex-wrap gap-s2">
          {COIN_KEYS.map((clave) => (
            <div key={clave} className="w-28">
              <Field label={NOMBRE_MONEDA[clave]}>
                <input
                  type="number"
                  min={0}
                  max={1000000}
                  className={fieldControlClass}
                  value={monedas[clave] ?? ""}
                  onChange={(e) =>
                    setMonedas((previas) => ({ ...previas, [clave]: e.target.value }))
                  }
                />
              </Field>
            </div>
          ))}
        </div>
      </fieldset>
    </Dialog>
  );
}
