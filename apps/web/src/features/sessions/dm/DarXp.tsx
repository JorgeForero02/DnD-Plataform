import { useId, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AwardXpInput, XpPropuesto } from "@dnd/shared";
import { vdLegible } from "@dnd/shared";
import { Button, Field, fieldControlClass } from "../../../ui";
import { ApiError } from "../../../lib/api";
import { useCharacters, charactersKey } from "../../characters/hooks";
import { awardXp } from "../../characters/api";

// Puerta de efectos §5 bis (E-PE-8/E-PE-9, D-CF-68/D-CF-69, 2026-09-13) — «Dar XP», la séptima
// herramienta del DM.
//
// **Por qué un PNJ de statblock se enseña bloqueado, no oculto.** `docs/04-convenciones.md`: un
// valor que no se puede elegir se muestra marcado y no seleccionable, CON su motivo — nunca se
// esconde. `XpService.award` (`characters/xp.service.ts`) responde 400 si algún `characterId`
// tiene `statblockRef`: sin nivel al que subir, acumular XP no significa nada para él. Esta
// pantalla no reimplementa esa regla — solo evita ofrecer un botón que el servidor va a rechazar,
// y lo dice en voz alta en vez de callarlo.
//
// **Por qué «a repartir» no es lo mismo que mandar el total.** El servidor reparte por CABEZA:
// `amount` en `awardXpSchema` es cuánto se lleva CADA personaje, no la bolsa entera. Con «a cada
// uno» el número que teclea el DM ES `amount`; con «a repartir entre los elegidos» el número es
// el TOTAL de la mesa y esta pantalla hace la división antes de mandar nada — igual que
// `EncountersService.end()` ya calculó `porCabeza` para la propuesta del combate.

type Reparto = "CADA_UNO" | "A_REPARTIR";

/** Cómo se lee cada modo de reparto, con su frase — igual patrón que `campaigns/reglas.ts`. */
const NOMBRE_REPARTO: Record<Reparto, { etiqueta: string; frase: string }> = {
  CADA_UNO: {
    etiqueta: "A cada uno",
    frase: "La cantidad es lo que se lleva cada elegido.",
  },
  A_REPARTIR: {
    etiqueta: "A repartir entre los elegidos",
    frase: "La cantidad es el total de la mesa; se divide entre los elegidos (redondeado abajo).",
  },
};

function mensajeDeError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "No se pudo dar la experiencia.";
}

/**
 * Agrupa el desglose del combate por criatura idéntica: «2 goblins · VD 1/4», no una línea por
 * cada uno de los dos goblins — es la misma lectura que ya hace la tira de iniciativa con los
 * combatientes que comparten posición.
 */
function resumenDeDesglose(desglose: XpPropuesto["desglose"]): string {
  const grupos = new Map<string, { cantidad: number; cr: number; nombre: string }>();
  for (const d of desglose) {
    const clave = `${d.name}|${d.cr}`;
    const existente = grupos.get(clave);
    if (existente) existente.cantidad += 1;
    else grupos.set(clave, { cantidad: 1, cr: d.cr, nombre: d.name });
  }
  return [...grupos.values()]
    .map((g) => {
      const nombre = g.nombre.toLowerCase();
      return `${g.cantidad} ${g.cantidad === 1 ? nombre : `${nombre}s`} · VD ${vdLegible(g.cr)}`;
    })
    .join(", ");
}

export function DarXp({
  campaignId,
  propuesta,
  onHecho,
}: {
  campaignId: string;
  /** La propuesta que `EncountersService.end()` calculó al terminar el combate (E-PE-9). Cuando
   * llega, precarga a los destinatarios, la cantidad por cabeza y «a cada uno» — el DM confirma
   * o edita, no repite el cálculo a mano. */
  propuesta?: XpPropuesto;
  /** Se llama tras un envío con éxito. `TiraDeIniciativa` lo usa para retirar el bloque. */
  onHecho?: () => void;
}) {
  const idMotivo = useId();
  const qc = useQueryClient();
  const personajes = useCharacters(campaignId);

  const [elegidos, setElegidos] = useState<string[]>(
    propuesta ? propuesta.destinatarios.map((d) => d.characterId) : [],
  );
  const [cantidad, setCantidad] = useState(propuesta ? String(propuesta.porCabeza) : "");
  const [reparto, setReparto] = useState<Reparto>("CADA_UNO");
  const [motivo, setMotivo] = useState("");
  const [errorDePersonajes, setErrorDePersonajes] = useState<string | null>(null);
  const [errorDeCantidad, setErrorDeCantidad] = useState<string | null>(null);
  const [errorDelServidor, setErrorDelServidor] = useState<string | null>(null);

  const dar = useMutation({
    mutationFn: (input: AwardXpInput) => awardXp(campaignId, input),
    onSuccess: () => {
      setErrorDelServidor(null);
      void qc.invalidateQueries({ queryKey: charactersKey(campaignId) });
      void qc.invalidateQueries({ queryKey: ["campaigns", campaignId, "events"] });
      onHecho?.();
    },
    onError: (e) => setErrorDelServidor(mensajeDeError(e)),
  });

  function alternar(characterId: string, statblockRef: string | null | undefined) {
    if (statblockRef) return; // No seleccionable: el servidor lo rechazaría igualmente.
    setElegidos((actuales) =>
      actuales.includes(characterId)
        ? actuales.filter((id) => id !== characterId)
        : [...actuales, characterId],
    );
  }

  function alDar() {
    setErrorDePersonajes(elegidos.length === 0 ? "Elige al menos un personaje." : null);
    if (elegidos.length === 0) return;

    const cantidadNumero = Number(cantidad);
    const amount =
      reparto === "A_REPARTIR"
        ? Math.floor(cantidadNumero / elegidos.length)
        : Math.trunc(cantidadNumero);

    // **El botón nunca se deshabilita** (docs/04-convenciones.md): el error se dice en línea y lo
    // tecleado se conserva.
    if (!Number.isFinite(cantidadNumero) || amount === 0) {
      setErrorDeCantidad("La cantidad no puede ser cero.");
      return;
    }
    setErrorDeCantidad(null);
    setErrorDelServidor(null);

    const motivoRecortado = motivo.trim();
    dar.mutate({
      characterIds: elegidos,
      amount,
      ...(motivoRecortado ? { reason: motivoRecortado } : {}),
    });
  }

  const filas = personajes.data ?? [];

  return (
    <div className="flex flex-col gap-s3">
      {propuesta && (
        <p className="rounded-radius-sm border border-copper px-s2 py-1.5 font-chrome text-chrome-sm text-copper-text">
          Propuesto por el combate: {propuesta.total} PX ({resumenDeDesglose(propuesta.desglose)})
        </p>
      )}

      <fieldset className="min-w-0" disabled={dar.isPending}>
        <legend className="mb-1 font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
          A quién
        </legend>
        {personajes.isLoading && (
          <p className="font-chrome text-chrome-xs text-muted">Cargando los personajes…</p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {filas.map((personaje) => {
            const marcado = elegidos.includes(personaje.id);
            const bloqueado = Boolean(personaje.statblockRef);
            return (
              <div key={personaje.id} className="flex flex-col gap-0.5">
                <label
                  className={[
                    "flex items-baseline gap-s2 rounded-radius-sm border px-s2 py-1 transition-colors",
                    bloqueado ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                    marcado ? "border-accent bg-[color:var(--accent-tint)]" : "border-muted",
                  ].join(" ")}
                >
                  <input
                    type="checkbox"
                    checked={marcado}
                    disabled={bloqueado}
                    onChange={() => alternar(personaje.id, personaje.statblockRef)}
                    className="accent-[var(--accent)]"
                  />
                  <span className="font-chrome text-chrome-sm text-text">{personaje.name}</span>
                </label>
                {bloqueado && (
                  <p className="font-chrome text-chrome-xs text-muted">
                    Un PNJ de statblock no acumula XP
                  </p>
                )}
              </div>
            );
          })}
        </div>
        {errorDePersonajes && (
          <p role="alert" className="mt-1 font-chrome text-chrome-xs text-danger-text">
            {errorDePersonajes}
          </p>
        )}
      </fieldset>

      <fieldset className="rounded-radius-sm border border-muted bg-surface p-s3">
        <legend className="px-1 font-chrome text-chrome-sm text-text">Reparto</legend>
        <div className="space-y-1">
          {(Object.entries(NOMBRE_REPARTO) as [Reparto, { etiqueta: string; frase: string }][]).map(
            ([clave, opcion]) => {
              const elegida = reparto === clave;
              return (
                <label
                  key={clave}
                  className={[
                    "flex cursor-pointer items-start gap-s2 rounded-radius-sm border px-s2 py-1.5 transition-colors",
                    elegida
                      ? "border-accent bg-[color:var(--accent-tint)]"
                      : "border-transparent hover:bg-bg",
                  ].join(" ")}
                >
                  <input
                    type="radio"
                    name="dar-xp-reparto"
                    checked={elegida}
                    onChange={() => setReparto(clave)}
                    className="mt-1 accent-[var(--accent)]"
                  />
                  <span className="min-w-0">
                    <span className="block font-chrome text-chrome-sm text-text">
                      {opcion.etiqueta}
                    </span>
                    <span className="mt-0.5 block font-chrome text-chrome-xs leading-snug text-muted">
                      {opcion.frase}
                    </span>
                  </span>
                </label>
              );
            },
          )}
        </div>
      </fieldset>

      <Field label="Cantidad" error={errorDeCantidad ?? undefined}>
        <input
          type="number"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          className={`${fieldControlClass} font-data`}
        />
      </Field>

      <div>
        <label
          htmlFor={idMotivo}
          className="mb-1 block font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted"
        >
          Motivo (opcional)
        </label>
        <input
          id={idMotivo}
          type="text"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          maxLength={160}
          className={fieldControlClass}
        />
      </div>

      <div className="flex items-center gap-s2">
        <Button type="button" variant="primary" onClick={alDar}>
          Dar experiencia
        </Button>
      </div>

      {errorDelServidor && (
        <p role="alert" className="font-chrome text-chrome-xs text-danger-text">
          {errorDelServidor}
        </p>
      )}
    </div>
  );
}
