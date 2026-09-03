import { useState } from "react";
import type { CoinKey } from "@dnd/shared";
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
import type { AvisoEquiparInfo } from "./AvisoDeEquipar";
import { ConfirmarSoltar } from "./ConfirmarSoltar";
import { PanelCarga } from "./PanelCarga";
import { PanelMonedas } from "./PanelMonedas";
import { FilaObjeto } from "./FilaObjeto";
import { SelectorDeObjeto } from "./SelectorDeObjeto";
import { ZonaDeObjetos } from "./ZonaDeObjetos";

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
}: {
  campaignId: string;
  characterId: string;
}) {
  const inventario = useInventory(campaignId, characterId);
  const cambiarUbicacion = useCambiarUbicacion(campaignId, characterId);
  const removerObjeto = useRemoveInventoryItem(campaignId, characterId);
  const cambiarDinero = useChangeMoney(campaignId, characterId);
  const gastarObjeto = useConsumeInventoryItem(campaignId, characterId);

  const [aviso, setAviso] = useState<AvisoEquiparInfo | null>(null);
  const [filaEnVuelo, setFilaEnVuelo] = useState<string | null>(null);
  const [erroresPorFila, setErroresPorFila] = useState<Record<string, string>>({});
  const [filaASoltar, setFilaASoltar] = useState<InventoryRow | null>(null);
  const [errorMoneda, setErrorMoneda] = useState<{ key: CoinKey; mensaje: string } | undefined>();
  const [monedaEnVuelo, setMonedaEnVuelo] = useState<CoinKey | null>(null);

  // **La región con su nombre existe también mientras carga y cuando falla.** Si el envoltorio
  // solo apareciera con datos, el sitio del inventario dentro de la hoja se movería de golpe al
  // llegar la respuesta, y quien navega con lector de pantalla no tendría a dónde ir mientras
  // tanto.
  if (inventario.isPending) {
    return (
      <section aria-label="inventario">
        <p className="font-chrome text-chrome-sm text-muted">Cargando inventario…</p>
      </section>
    );
  }
  if (inventario.isError || !inventario.data) {
    return (
      <section aria-label="inventario">
        <p role="alert" className="font-chrome text-chrome-sm text-danger-text">
          {mensajeDeError(inventario.error)}
        </p>
      </section>
    );
  }

  const { items, purse, totalWeightOz, carryCapacityOz } = inventario.data;
  const equipados = items.filter((r) => r.location === "EQUIPPED");
  const encima = items.filter((r) => r.location === "CARRIED");
  const guardados = items.filter((r) => r.location === "STORED");

  const cambiarZona = (row: InventoryRow, destino: "EQUIPPED" | "CARRIED") => {
    setErroresPorFila((e) => ({ ...e, [row.id]: "" }));
    setFilaEnVuelo(row.id);
    cambiarUbicacion.mutate(
      { rowId: row.id, input: { location: destino } },
      {
        onSuccess: (resultado) => {
          setFilaEnVuelo(null);
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

  return (
    // **Una región con nombre, no un `<div>` suelto y no un `<h1>`.** Esta pantalla se monta
    // dentro de la hoja de personaje, que ya tiene su titular: un segundo `<h1>` deja a quien
    // navega con lector de pantalla con dos títulos de página en la misma página.
    <section aria-label="inventario" className="flex flex-col gap-s4 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1">
        <h2 className="mb-s4 font-title text-chrome-lg text-text">Inventario</h2>
        {aviso && <AvisoDeEquipar aviso={aviso} />}
        <SelectorDeObjeto campaignId={campaignId} characterId={characterId} />

        <ZonaDeObjetos ubicacion="EQUIPPED" vacia={equipados.length === 0}>
          {equipados.map((row) => (
            <FilaObjeto
              key={row.id}
              row={row}
              ocupado={filaEnVuelo === row.id}
              error={erroresPorFila[row.id] || undefined}
              onAccionPrincipal={() => cambiarZona(row, "CARRIED")}
              onSoltar={() => setFilaASoltar(row)}
            />
          ))}
        </ZonaDeObjetos>

        <ZonaDeObjetos ubicacion="CARRIED" vacia={encima.length === 0}>
          {encima.map((row) => (
            <FilaObjeto
              key={row.id}
              row={row}
              ocupado={filaEnVuelo === row.id}
              error={erroresPorFila[row.id] || undefined}
              onAccionPrincipal={() => cambiarZona(row, "EQUIPPED")}
              onSoltar={() => setFilaASoltar(row)}
              onGastar={sePuedeGastar(row) ? () => gastar(row) : undefined}
            />
          ))}
        </ZonaDeObjetos>

        <ZonaDeObjetos ubicacion="STORED" vacia={guardados.length === 0}>
          {guardados.map((row) => (
            <FilaObjeto
              key={row.id}
              row={row}
              ocupado={filaEnVuelo === row.id}
              error={erroresPorFila[row.id] || undefined}
              onAccionPrincipal={() => cambiarZona(row, "CARRIED")}
              onSoltar={() => setFilaASoltar(row)}
            />
          ))}
        </ZonaDeObjetos>
      </div>

      <div className="flex w-full flex-col gap-s4 lg:w-72 lg:shrink-0">
        <PanelCarga totalWeightOz={totalWeightOz} carryCapacityOz={carryCapacityOz} />
        <PanelMonedas
          key={Object.values(purse).join("-")}
          purse={purse}
          onCambiar={aplicarDelta}
          aplicando={monedaEnVuelo}
          error={errorMoneda}
        />
      </div>

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
