import { useState } from "react";
import { MAX_ATTUNED_ITEMS, type CoinKey } from "@dnd/shared";
import { ApiError } from "../../lib/api";
import type { InventoryRow } from "./api";
import {
  useCambiarUbicacion,
  useChangeMoney,
  useConsumeInventoryItem,
  useInventory,
  useRemoveInventoryItem,
} from "./hooks";
import { AvisoDeEquipar } from "./AvisoDeEquipar";
import { ElegirMano } from "./ElegirMano";
import type { EquipSlot } from "@dnd/shared";
import type { AvisoEquiparInfo } from "./AvisoDeEquipar";
import { ConfirmarSoltar } from "./ConfirmarSoltar";
import { PanelCarga } from "./PanelCarga";
import { PanelMonedas } from "./PanelMonedas";
import { FilaObjeto } from "./FilaObjeto";
import { SelectorDeObjeto } from "./SelectorDeObjeto";
import { ZonaDeObjetos } from "./ZonaDeObjetos";
import { accionesDeObjeto, type ManosDeObjeto } from "./accionesDeObjeto";
import { DetalleDeObjeto } from "./DetalleDeObjeto";
import { FiltrosDeObjetos } from "./FiltrosDeObjetos";
import { filtrarObjetos, SIN_FILTRO, type FiltroDeObjetos } from "./filtrarObjetos";
import { useMyRole } from "../campaigns/members";
import type { Disposicion } from "../character-sheet/pestanas/tipos";

// Carril B1 — la pantalla de inventario (pantalla 20 del prototipo, revisión obligatoria).
// **Tres zonas rotuladas**, un aviso de confirmación arriba al equipar, carga y monedas en la
// columna derecha, filas de una línea. Exporta también las piezas sueltas por si el orquestador
// las quiere recomponer en otro sitio; `PaginaDeInventario` es el montaje completo.

function mensajeDeError(error: unknown): string {
  // La misma regla que el resto de la hoja: `apiFetch` ya convierte el cuerpo del error del
  // servidor en una frase legible en español (`ApiError.message`); un error de red o cualquier
  // otro no trae esa garantía, así que se enseña algo en vez de nada.
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Algo ha ido mal. Vuelve a intentarlo.";
}

export function PaginaDeInventario({
  campaignId,
  characterId,
  disposicion = "mesa",
}: {
  campaignId: string;
  characterId: string;
  /**
   * Tarea 9 (spec 2026-09-11, «la hoja a página completa») — a `"pagina"` el inventario va en
   * dos columnas, con la fila seleccionada abierta en un panel de detalle a la derecha; en la
   * `"mesa"` (el valor por defecto, que es lo que montaba todo hasta ahora) no hay detalle: la
   * ficha de la mesa es estrecha y la fila de una línea ya dice lo que hace falta en un turno.
   * Los filtros existen en las dos: son baratos y en la mesa también se busca «la poción».
   */
  disposicion?: Disposicion;
}) {
  const inventario = useInventory(campaignId, characterId);
  // D-CF-15 — solo el DM identifica. Igual que en `RecursosYDescansos.tsx`: mientras el rol no
  // se sabe, se trata como «no DM» — no lo sé nunca es sí.
  const { role } = useMyRole(campaignId);
  const esDM = role === "DM";
  const cambiarUbicacion = useCambiarUbicacion(campaignId, characterId);
  const removerObjeto = useRemoveInventoryItem(campaignId, characterId);
  const cambiarDinero = useChangeMoney(campaignId, characterId);
  const gastarObjeto = useConsumeInventoryItem(campaignId, characterId);

  const [aviso, setAviso] = useState<AvisoEquiparInfo | null>(null);
  /**
   * **Equipar un arma pregunta la mano** (paso 1, tarea 11). El servidor acepta `slot` desde 2B
   * (`updateInventoryItemSchema`) y el motor lo usa —`rules/attacks.ts` mira `OFF_HAND` para la
   * mano ocupada y para el arma ligera de la izquierda— y **la pantalla no lo ofrecía**: grep de
   * `slot` en este fichero daba cero. Consecuencia: **un pícaro con dos dagas no existía**.
   */
  const [manoPara, setManoPara] = useState<string | null>(null);
  const [manoElegida, setManoElegida] = useState<EquipSlot>("MAIN_HAND");

  const [filaEnVuelo, setFilaEnVuelo] = useState<string | null>(null);
  const [erroresPorFila, setErroresPorFila] = useState<Record<string, string>>({});
  const [filaASoltar, setFilaASoltar] = useState<InventoryRow | null>(null);
  const [errorMoneda, setErrorMoneda] = useState<{ key: CoinKey; mensaje: string } | undefined>();
  const [monedaEnVuelo, setMonedaEnVuelo] = useState<CoinKey | null>(null);
  const [filtro, setFiltro] = useState<FiltroDeObjetos>(SIN_FILTRO);
  // El id, no la fila: la fila cambia con cada respuesta del servidor (equipar, sintonizar) y
  // la selección tiene que sobrevivir a eso. Si el filtro la esconde, cae a la primera visible.
  const [seleccionadaId, setSeleccionadaId] = useState<string | null>(null);

  // **La región con su nombre existe también mientras carga y cuando falla.** Si el envoltorio
  // solo apareciera con datos, el sitio del inventario dentro de la hoja se movería de golpe al
  // llegar la respuesta, y quien navega con lector de pantalla no tendría a dónde ir mientras
  // tanto.
  if (inventario.isPending) {
    return (
      <section id="inventario" aria-label="inventario">
        <p className="font-chrome text-chrome-sm text-muted">Cargando inventario…</p>
      </section>
    );
  }
  if (inventario.isError || !inventario.data) {
    return (
      <section id="inventario" aria-label="inventario">
        <p role="alert" className="font-chrome text-chrome-sm text-danger-text">
          {mensajeDeError(inventario.error)}
        </p>
      </section>
    );
  }

  const { items, purse, totalWeightOz, carryCapacityOz, encumbrance } = inventario.data;
  const aPagina = disposicion === "pagina";
  // Las tres zonas se alimentan de lo filtrado; el contador de sintonía, del total: el tope de
  // tres cuenta lo que hay, no lo que se está mirando.
  const visibles = filtrarObjetos(items, filtro);
  const equipados = visibles.filter((r) => r.location === "EQUIPPED");
  const encima = visibles.filter((r) => r.location === "CARRIED");
  const guardados = visibles.filter((r) => r.location === "STORED");
  const sintonizados = items.filter((r) => r.attuned).length;
  const seleccionada = aPagina
    ? (visibles.find((r) => r.id === seleccionadaId) ?? visibles[0] ?? null)
    : null;

  const cambiarZona = (row: InventoryRow, destino: "EQUIPPED" | "CARRIED", slot?: EquipSlot) => {
    setErroresPorFila((e) => ({ ...e, [row.id]: "" }));
    setFilaEnVuelo(row.id);
    cambiarUbicacion.mutate(
      { rowId: row.id, input: { location: destino, ...(slot ? { slot } : {}) } },
      {
        onSuccess: (resultado) => {
          setFilaEnVuelo(null);
          setManoPara(null);
          const { acAntes, acDespues } = resultado;
          if (acAntes != null && acDespues != null && acAntes !== acDespues) {
            setAviso({
              verbo: destino === "EQUIPPED" ? "Equipaste" : "Quitaste",
              nombreObjeto: row.item.name,
              acAntes,
              acDespues,
            });
          } else {
            setAviso(null);
          }
        },
        onError: (error) => {
          setFilaEnVuelo(null);
          setErroresPorFila((e) => ({ ...e, [row.id]: mensajeDeError(error) }));
        },
      },
    );
  };

  /**
   * Gastar tiene sentido en un consumible, o en una pila de varios: una antorcha que se quema,
   * un paquete de flechas que se acaba. En una espada no.
   */
  const sePuedeGastar = (row: InventoryRow) =>
    row.item.kind === "CONSUMABLE" || row.item.kind === "GEAR" || row.quantity > 1;

  const gastar = (row: InventoryRow) => {
    setErroresPorFila((e) => ({ ...e, [row.id]: "" }));
    setFilaEnVuelo(row.id);
    gastarObjeto.mutate(
      { rowId: row.id, amount: 1 },
      {
        onSuccess: () => setFilaEnVuelo(null),
        onError: (error: unknown) => {
          setFilaEnVuelo(null);
          setErroresPorFila((e) => ({ ...e, [row.id]: mensajeDeError(error) }));
        },
      },
    );
  };

  /**
   * Sintonizar o desintonizar. **Es la misma mutación que mover de zona** —`PATCH` con una sola
   * frase, como el servidor— y por eso reutiliza el mismo carril de «fila en vuelo» y de error
   * por fila: el rechazo del servidor se pinta **tal cual** debajo de la fila, y no en un aviso
   * genérico, porque su texto dice cuáles son los tres objetos que ya ocupan las ranuras.
   */
  const alternarSintonia = (row: InventoryRow) => {
    setErroresPorFila((e) => ({ ...e, [row.id]: "" }));
    setFilaEnVuelo(row.id);
    cambiarUbicacion.mutate(
      { rowId: row.id, input: { attuned: !row.attuned } },
      {
        onSuccess: () => setFilaEnVuelo(null),
        onError: (error) => {
          setFilaEnVuelo(null);
          setErroresPorFila((e) => ({ ...e, [row.id]: mensajeDeError(error) }));
        },
      },
    );
  };

  /**
   * Identificar o esconder un objeto (D-CF-15). **Misma mutación, mismo carril de error por
   * fila** que sintonizar y mover de zona: el servidor es quien de verdad decide si esto se
   * puede (403 si quien lo pide no es el DM), y el rechazo se pinta tal cual debajo de la fila.
   */
  const identificar = (
    row: InventoryRow,
    input: { identified?: boolean; unidentifiedName?: string | null },
  ) => {
    setErroresPorFila((e) => ({ ...e, [row.id]: "" }));
    setFilaEnVuelo(row.id);
    cambiarUbicacion.mutate(
      { rowId: row.id, input },
      {
        onSuccess: () => setFilaEnVuelo(null),
        onError: (error) => {
          setFilaEnVuelo(null);
          setErroresPorFila((e) => ({ ...e, [row.id]: mensajeDeError(error) }));
        },
      },
    );
  };

  const confirmarSoltar = () => {
    if (!filaASoltar) return;
    removerObjeto.mutate(filaASoltar.id, {
      onSuccess: () => setFilaASoltar(null),
    });
  };

  const aplicarDelta = (key: CoinKey, delta: number) => {
    setErrorMoneda(undefined);
    setMonedaEnVuelo(key);
    cambiarDinero.mutate(
      { [key]: delta },
      {
        onSuccess: () => setMonedaEnVuelo(null),
        onError: (error) => {
          setMonedaEnVuelo(null);
          setErrorMoneda({ key, mensaje: mensajeDeError(error) });
        },
      },
    );
  };

  /**
   * Las cuatro manos de una fila, según la zona en la que vive. **Una sola función**: la fila y
   * el panel de detalle la comparten, así que no pueden ofrecer cosas distintas ni cablear ids
   * distintos —que es lo que tres copias inline por zona permitían.
   */
  const manosDe = (row: InventoryRow): ManosDeObjeto => {
    switch (row.location) {
      case "EQUIPPED":
        return {
          onAccionPrincipal: () => cambiarZona(row, "CARRIED"),
          onSoltar: () => setFilaASoltar(row),
          // **Solo donde el servidor la acepta**: equipado y que el objeto la pida. En «Encima»
          // o «Guardado» el botón devolvería «Para sintonizar un objeto, primero hay que
          // llevarlo puesto», que es un rechazo evitable.
          onSintonizar: row.item.requiresAttunement ? () => alternarSintonia(row) : undefined,
        };
      case "CARRIED":
        return {
          // **Un arma pregunta la mano; lo demás va a su ranura de siempre.** Preguntarla para
          // una armadura sería un paso que no decide nada.
          onAccionPrincipal: () =>
            esArma(row)
              ? (setManoElegida("MAIN_HAND"), setManoPara(row.id))
              : cambiarZona(row, "EQUIPPED"),
          onSoltar: () => setFilaASoltar(row),
          onGastar: sePuedeGastar(row) ? () => gastar(row) : undefined,
        };
      case "STORED":
        return {
          onAccionPrincipal: () => cambiarZona(row, "CARRIED"),
          onSoltar: () => setFilaASoltar(row),
        };
    }
  };

  /** Lo que cada `FilaObjeto` recibe además de sus manos; la selección solo existe a página. */
  const propsDeFila = (row: InventoryRow) => ({
    row,
    ocupado: filaEnVuelo === row.id,
    error: erroresPorFila[row.id] || undefined,
    esDM,
    onIdentificar: (input: { identified?: boolean; unidentifiedName?: string | null }) =>
      identificar(row, input),
    ...manosDe(row),
    ...(aPagina
      ? {
          seleccionada: row.id === seleccionada?.id,
          onSeleccionar: () => setSeleccionadaId(row.id),
        }
      : {}),
  });

  const columnaDeCargaYMonedas = (
    <div
      className={
        aPagina ? "flex flex-col gap-s4" : "flex w-full flex-col gap-s4 lg:w-72 lg:shrink-0"
      }
    >
      <PanelCarga
        totalWeightOz={totalWeightOz}
        carryCapacityOz={carryCapacityOz}
        encumbrance={encumbrance}
      />
      <PanelMonedas
        key={Object.values(purse).join("-")}
        purse={purse}
        onCambiar={aplicarDelta}
        aplicando={monedaEnVuelo}
        error={errorMoneda}
      />
    </div>
  );

  return (
    // **Una región con nombre, no un `<div>` suelto y no un `<h1>`.** Esta pantalla se monta
    // dentro de la hoja de personaje, que ya tiene su titular: un segundo `<h1>` deja a quien
    // navega con lector de pantalla con dos títulos de página en la misma página.
    <section
      id="inventario"
      aria-label="inventario"
      className={
        aPagina
          ? "grid gap-s4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start"
          : "flex flex-col gap-s4 lg:flex-row lg:items-start"
      }
    >
      <div className="min-w-0 flex-1">
        <h2 className="mb-s4 font-title text-chrome-lg text-text">Inventario</h2>
        {aviso && <AvisoDeEquipar aviso={aviso} />}
        <SelectorDeObjeto campaignId={campaignId} characterId={characterId} esDM={esDM} />

        {/* «Sintonización: {usadas} de {tope}», como en `hoja/SeccionEquipo.tsx` del prototipo.
            **El tope sale de `@dnd/shared`** (`MAX_ATTUNED_ITEMS`), que es el mismo número que
            comprueba el servidor: escribir «3» aquí sería la segunda fuente de una regla. Y el
            conteo se hace sobre lo que llega, no se guarda: desequipar quita la sintonización en
            el servidor, así que una cuenta local se desincronizaría. */}
        <p className="mb-s2 font-chrome text-chrome-xs text-muted" data-testid="contador-sintonia">
          Sintonización: {sintonizados} de {MAX_ATTUNED_ITEMS}
        </p>

        <FiltrosDeObjetos filtro={filtro} onCambiar={setFiltro} />

        <ZonaDeObjetos ubicacion="EQUIPPED" vacia={equipados.length === 0}>
          {equipados.map((row) => (
            <FilaObjeto key={row.id} {...propsDeFila(row)} />
          ))}
        </ZonaDeObjetos>

        <ZonaDeObjetos ubicacion="CARRIED" vacia={encima.length === 0}>
          {encima.map((row) => (
            <FilaObjeto key={row.id} {...propsDeFila(row)}>
              {manoPara === row.id && (
                <ElegirMano
                  nombre={row.item.name}
                  aDosManos={aDosManos(row)}
                  valor={manoElegida}
                  onElegir={setManoElegida}
                  onConfirmar={() => cambiarZona(row, "EQUIPPED", manoElegida)}
                  onCancelar={() => setManoPara(null)}
                />
              )}
            </FilaObjeto>
          ))}
        </ZonaDeObjetos>

        <ZonaDeObjetos ubicacion="STORED" vacia={guardados.length === 0}>
          {guardados.map((row) => (
            <FilaObjeto key={row.id} {...propsDeFila(row)} />
          ))}
        </ZonaDeObjetos>

        {/* A página, carga y monedas cierran la columna de la lista; la derecha es del detalle. */}
        {aPagina && columnaDeCargaYMonedas}
      </div>

      {aPagina ? (
        <DetalleDeObjeto
          row={seleccionada}
          acciones={seleccionada ? accionesDeObjeto(seleccionada, manosDe(seleccionada)) : []}
          esDM={esDM}
          onIdentificar={seleccionada ? (input) => identificar(seleccionada, input) : undefined}
          ocupado={seleccionada !== null && filaEnVuelo === seleccionada.id}
        />
      ) : (
        columnaDeCargaYMonedas
      )}

      {filaASoltar && (
        <ConfirmarSoltar
          nombreObjeto={filaASoltar.item.name}
          open={Boolean(filaASoltar)}
          confirmando={removerObjeto.isPending}
          error={removerObjeto.isError ? mensajeDeError(removerObjeto.error) : undefined}
          onCancelar={() => setFilaASoltar(null)}
          onConfirmar={confirmarSoltar}
        />
      )}
    </section>
  );
}

/** Un arma es lo único que pregunta la mano: una armadura va a su ranura y no decide nada. */
function esArma(row: InventoryRow): boolean {
  return row.item.kind === "WEAPON";
}

/**
 * **A dos manos según lo que declara el arma**, no según su nombre. `TWO_HANDED` es una propiedad
 * del catálogo (`item.schema.ts`), y es la que el motor mira para decidir el daño versátil.
 */
function aDosManos(row: InventoryRow): boolean {
  return (row.item.weapon?.properties ?? []).includes("TWO_HANDED");
}
