import { useId, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AwardXpInput, XpPropuesto } from "@dnd/shared";
import { vdLegible } from "@dnd/shared";
import { Button, Field, fieldControlClass, GrupoDeRadios } from "../../../ui";
import { ApiError } from "../../../lib/api";
import { useCharacters, charactersKey } from "../../characters/hooks";
import { awardXp } from "../../characters/api";
import { useNpcs } from "../../bestiario/hooks";

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
// **Y para que se enseñe hace falta que llegue.** `GET /characters` es «quién se sienta a la
// mesa» y filtra `statblockRef: null` a propósito (2D.6), así que con esa lista sola los PNJ no
// estaban bloqueados: estaban escondidos, y la casilla bloqueada era código muerto (ola de
// arreglos 1). El elenco se completa con `GET /npcs` —la misma segunda lista que ya usa la tira de
// iniciativa para no llamar «Alguien» a un goblin—, y cada PNJ con statblock sale marcado con su
// motivo.
//
// **Tras dar, se dice y se vacía.** Sin confirmación, el formulario seguía abierto con las mismas
// casillas y la misma cantidad: la receta para un doble reparto, que el servidor no idempotiza
// (dos POST = doble XP). Ahora el éxito pinta «Dados N PX a X, Y», vacía la elección y la
// cantidad, y avisa al padre con esa misma frase (`onHecho`).
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
    frase:
      "La cantidad es el total de la mesa; se divide entre los elegidos, sin decimales (el resto se pierde).",
  },
};

function mensajeDeError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "No se pudo dar la experiencia.";
}

/**
 * Agrupa el desglose del combate por criatura idéntica: «2 Goblin · VD 1/4», no una línea por
 * cada uno de los dos goblins — es la misma lectura que ya hace la tira de iniciativa con los
 * combatientes que comparten posición. La cifra delante y el nombre tal cual, como en un recuento
 * («2 Goblin, 1 Klarg»), no un plural pegando una «s»: «lobo huargos» no es castellano y «espectro
 * de las cavernass» tampoco. Sin «×»: es un glifo de fuente haciendo de icono, y esos están
 * prohibidos (`ui/__tests__/Iconos.test.tsx`).
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
    .map((g) => `${g.cantidad} ${g.nombre} · VD ${vdLegible(g.cr)}`)
    .join(", ");
}

/** Una fila del elenco al que se puede dar XP: personaje de la mesa o PNJ instanciado. */
interface FilaDelElenco {
  id: string;
  name: string;
  statblockRef?: string | null;
}

/**
 * La frase de confirmación: «Dados 100 PX a Thora, Brann» — o «Quitados» si el DM corrigió a la
 * baja. Se pinta aquí y se entrega al padre tal cual, para que el bloque del combate pueda
 * sustituir el formulario por ella.
 */
function fraseDeHecho(amount: number, nombres: string[]): string {
  const verbo = amount >= 0 ? "Dados" : "Quitados";
  return `${verbo} ${Math.abs(amount)} PX a ${nombres.join(", ")}`;
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
  /** Se llama tras un envío con éxito, con la frase de confirmación («Dados 100 PX a Thora»).
   * `CapaDeCombate` lo usa para retirar el bloque de la propuesta y dejar esa frase en su lugar. */
  onHecho?: (resumen: string) => void;
}) {
  const idMotivo = useId();
  const idMotivoDeBloqueo = useId();
  const qc = useQueryClient();
  const personajes = useCharacters(campaignId);
  const pnjs = useNpcs(campaignId);

  const [elegidos, setElegidos] = useState<string[]>(
    propuesta ? propuesta.destinatarios.map((d) => d.characterId) : [],
  );
  const [cantidad, setCantidad] = useState(propuesta ? String(propuesta.porCabeza) : "");
  const [reparto, setReparto] = useState<Reparto>("CADA_UNO");
  const [motivo, setMotivo] = useState("");
  const [errorDePersonajes, setErrorDePersonajes] = useState<string | null>(null);
  const [errorDeCantidad, setErrorDeCantidad] = useState<string | null>(null);
  const [errorDelServidor, setErrorDelServidor] = useState<string | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);

  // El elenco entero: los de `GET /characters` y, detrás, los PNJ instanciados que esa lista no
  // trae. Por `id`, para que un PNJ jugable que ya viniera en la primera no salga dos veces.
  const filas: FilaDelElenco[] = [
    ...(personajes.data ?? []),
    ...(pnjs.data ?? []).filter((n) => !(personajes.data ?? []).some((c) => c.id === n.id)),
  ];

  const dar = useMutation({
    mutationFn: (input: AwardXpInput) => awardXp(campaignId, input),
    onSuccess: (_res, input) => {
      setErrorDelServidor(null);
      void qc.invalidateQueries({ queryKey: charactersKey(campaignId) });
      void qc.invalidateQueries({ queryKey: ["campaigns", campaignId, "events"] });
      const nombres = input.characterIds.map(
        (id) => filas.find((f) => f.id === id)?.name ?? "Alguien",
      );
      const resumen = fraseDeHecho(input.amount, nombres);
      setHecho(resumen);
      // Se vacía lo que se acaba de mandar: volver a pulsar no repite el reparto por accidente.
      setElegidos([]);
      setCantidad("");
      setMotivo("");
      onHecho?.(resumen);
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
    // **El botón nunca se deshabilita** (docs/04-convenciones.md): el error se dice en línea y lo
    // tecleado se conserva. Un decimal no se trunca en silencio —«300.7» no son 300 PX—, se dice.
    if (cantidad.trim() === "" || !Number.isInteger(cantidadNumero)) {
      setErrorDeCantidad("La cantidad tiene que ser un número entero de PX.");
      return;
    }
    // `Math.trunc`, hacia cero: −100 entre 3 son −33 cada uno, no −34. El «redondeado abajo» de
    // la frase del radio es en valor absoluto, que es lo que un DM entiende por repartir.
    const amount =
      reparto === "A_REPARTIR" ? Math.trunc(cantidadNumero / elegidos.length) : cantidadNumero;
    if (amount === 0) {
      setErrorDeCantidad("La cantidad no puede ser cero.");
      return;
    }
    setErrorDeCantidad(null);
    setErrorDelServidor(null);
    setHecho(null);

    const motivoRecortado = motivo.trim();
    dar.mutate({
      characterIds: elegidos,
      amount,
      ...(motivoRecortado ? { reason: motivoRecortado } : {}),
    });
  }

  return (
    <div className="flex flex-col gap-s3">
      {propuesta && (
        <p className="rounded-radius-sm border border-copper px-s2 py-1.5 font-chrome text-chrome-sm text-copper-text">
          Propuesto por el combate: {propuesta.total} PX
          {propuesta.desglose.length > 0 && ` (${resumenDeDesglose(propuesta.desglose)})`}
        </p>
      )}
      {/* Los enemigos cuyo VD no tiene fila en la tabla del SRD (un «2,5» escrito en el editor):
          el servidor no los suma al total y los lista para que el DM los añada a mano. Callarlos
          sería proponer menos XP de los que hubo sin decir por qué. */}
      {propuesta?.sinTabla && propuesta.sinTabla.length > 0 && (
        <p className="font-chrome text-chrome-xs text-warning-text">
          Sin fila en la tabla del SRD, no cuentan en la propuesta — añádelos a mano:{" "}
          {propuesta.sinTabla.map((e) => `${e.name} (VD ${vdLegible(e.cr)})`).join(", ")}.
        </p>
      )}

      <fieldset className="min-w-0" disabled={dar.isPending}>
        <legend className="mb-1 font-chrome text-chrome-xs uppercase tracking-[0.14em] text-muted">
          A quién
        </legend>
        {(personajes.isLoading || pnjs.isLoading) && (
          <p className="font-chrome text-chrome-xs text-muted">Cargando los personajes…</p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {filas.map((personaje) => {
            const marcado = elegidos.includes(personaje.id);
            const bloqueado = Boolean(personaje.statblockRef);
            const idDelMotivo = `${idMotivoDeBloqueo}-${personaje.id}`;
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
                    aria-describedby={bloqueado ? idDelMotivo : undefined}
                    onChange={() => alternar(personaje.id, personaje.statblockRef)}
                    className="accent-[var(--accent)]"
                  />
                  <span className="font-chrome text-chrome-sm text-text">{personaje.name}</span>
                </label>
                {bloqueado && (
                  <p id={idDelMotivo} className="font-chrome text-chrome-xs text-muted">
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

      <GrupoDeRadios
        legend="Reparto"
        name="dar-xp-reparto"
        opciones={NOMBRE_REPARTO}
        valor={reparto}
        onChange={setReparto}
      />

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
      {hecho && (
        <p role="status" className="font-chrome text-chrome-sm text-copper-text">
          {hecho}
        </p>
      )}
    </div>
  );
}
