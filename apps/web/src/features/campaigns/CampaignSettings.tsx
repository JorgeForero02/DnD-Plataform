import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { DeleteButton } from "../../components/DeleteButton";
import { useCampaign, useDeleteCampaign, useUpdateCampaign } from "./hooks";
import { useMyRole } from "./members";
import { CHECKING_PERMISSIONS, RetryPermissions } from "./PermissionStatus";
import { Button } from "../../ui/Button";
import { Field, fieldControlClass } from "../../ui/Field";
import { Panel } from "../../ui/Panel";

// Fetches its own campaign (useCampaign shares the query cache and key with
// CampaignDetailPage's own call, so this is not a second network request) instead of
// receiving it as a prop that's only defined once loaded — mounting unconditionally, at the
// same time as MembersPanel and InvitePanel, removes ONE way a consumer of
// useMyRole(campaignId) could join the shared members query on a later render than its
// siblings. It doesn't remove every such way: any future useMyRole consumer that still
// mounts conditionally on some other async value would trip the same React Query
// refetchOnMount behaviour on an already-settled (or already-errored) query, independently
// of this component.
export function CampaignSettings({ campaignId }: { campaignId: string }) {
  const navigate = useNavigate();
  const { data: campaign } = useCampaign(campaignId);
  const {
    role,
    isLoading: roleLoading,
    isError: roleError,
    retry: retryRole,
  } = useMyRole(campaignId);
  const isDM = role === "DM";
  const roleUnresolved = roleLoading || roleError;
  const disabledReason = roleUnresolved
    ? CHECKING_PERMISSIONS
    : !isDM
      ? "Solo el DM puede editar la campaña."
      : undefined;
  // Same gate, worded for the action DeleteButton actually performs — "editar" would be
  // wrong on a control that deletes the campaign, not edits it.
  const deleteDisabledReason = roleUnresolved
    ? CHECKING_PERMISSIONS
    : !isDM
      ? "Solo el DM puede borrar la campaña."
      : undefined;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Seeds the form once per campaign, not on every render: campaign arrives asynchronously
  // (this component is mounted before useCampaign has data), so it can't be a plain useState
  // initializer the way EntityEditor/SessionEditor/CharacterEditor seed from a prop that's
  // already loaded by the time they mount. Guarded by campaign.id so a refetch after saving
  // (same id, new object reference) never stomps on what's already showing — the local state
  // already holds the value that was just sent.
  const seededId = useRef<string | null>(null);
  useEffect(() => {
    if (campaign && seededId.current !== campaign.id) {
      setName(campaign.name);
      setDescription(campaign.description ?? "");
      seededId.current = campaign.id;
    }
  }, [campaign]);

  const update = useUpdateCampaign(campaignId);
  const del = useDeleteCampaign();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      // Both keys always travel, never omitted — emptying the description this way sends
      // "" instead of dropping the key, which is what the brief and updateCampaignSchema
      // (packages/shared) require: omitting a key means "don't touch it".
      await update.mutateAsync({ name, description });
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const onConfirmDelete = async () => {
    setDeleteError(null);
    try {
      await del.mutateAsync(campaignId);
      navigate("/");
    } catch (err) {
      setDeleteError((err as Error).message);
    }
  };

  if (!campaign) {
    return (
      <Panel tone="chrome">
        <h3 className="text-chrome-sm font-semibold">Ajustes de la campaña</h3>
        <p className="mt-2 text-muted">Cargando…</p>
      </Panel>
    );
  }

  return (
    <Panel tone="chrome">
      <h3 className="text-chrome-sm font-semibold">Ajustes de la campaña</h3>
      {/* Readable prose view of the description, independent of the disabled/enabled
          <textarea> below — an empty description must still say "Sin descripción."
          somewhere, and a disabled textarea (opacity-60, unreadable-ish for a player on most
          of this screen) isn't that place. Restored after an earlier draft of this task
          dropped it without noticing; see the fix-round note in task-4-report.md. */}
      <p className="mt-1 text-chrome-sm text-muted">{campaign.description || "Sin descripción."}</p>
      <form onSubmit={onSubmit} className="mt-3 space-y-3">
        {disabledReason && <p className="text-chrome-xs text-muted">{disabledReason}</p>}
        {roleError && <RetryPermissions onRetry={retryRole} />}
        <Field label="Nombre">
          <input
            id="campaign-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={roleUnresolved || !isDM}
            className={fieldControlClass}
          />
        </Field>
        <Field label="Descripción">
          <textarea
            id="campaign-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={roleUnresolved || !isDM}
            className={fieldControlClass}
          />
        </Field>
        {error && <p className="text-chrome-sm text-danger-text">{error}</p>}
        <div className="flex items-start justify-between gap-2">
          <div>
            {/* The cascade this warns about is real, not decorative: schema.prisma cascades
                Entity, Session, Character, Invite and CampaignMember (and, through Entity,
                EntityLink/EntityVisibilityGrant/Comment) off Campaign with onDelete:
                Cascade. No counts here — nothing on this screen has them loaded, and the
                brief is explicit that a number not actually on hand must not be invented. */}
            <DeleteButton
              message={`Vas a borrar "${campaign.name}". Se borrarán también sus entradas del mundo, sesiones, personajes, invitaciones y miembros. No se puede deshacer.`}
              onConfirm={onConfirmDelete}
              pending={del.isPending}
              disabled={roleUnresolved || !isDM}
              disabledReason={deleteDisabledReason}
            />
            {/* Fix round 2, IMPORTANT B: DeleteButton only ever puts disabledReason in a
                title= attribute — invisible on touch, unread by a screen reader (the exact
                finding from task 1.16 that this project's "disabled, never hidden, reason
                visible on screen" rule comes from). Putting it here too, in text, is what
                actually satisfies that rule for the delete control specifically; the
                "editar" reason above the form fields doesn't cover it because it names a
                different action. */}
            {deleteDisabledReason && (
              <p className="mt-1 text-chrome-xs text-muted">{deleteDisabledReason}</p>
            )}
          </div>
          <Button type="submit" disabled={update.isPending || roleUnresolved || !isDM}>
            Guardar
          </Button>
        </div>
        {deleteError && <p className="text-chrome-sm text-danger-text">{deleteError}</p>}
      </form>

      <InterruptorDeSobrecarga
        campaignId={campaignId}
        enabled={campaign.encumbranceVariant}
        disabled={roleUnresolved || !isDM}
      />

      <SalaDelTablero
        campaignId={campaignId}
        url={campaign.boardRoomUrl ?? null}
        disabled={roleUnresolved || !isDM}
      />
    </Panel>
  );
}

/**
 * La variante de sobrecarga (SRD 5.1, Variant: Encumbrance; migración 6, D-CF-16). **Va aquí y
 * no junto a `InterruptorDeLaCasa`** (`features/dm-tables/PanelDeTablas.tsx`): esa pantalla
 * escribe con el `PUT` propio de `dm-tables.service.ts`, y esta variante la escribe
 * `PATCH /campaigns/:id` — el mismo endpoint que ya usa el nombre y la descripción de arriba.
 * `campaign` (de `useCampaign`) ya trae el campo, y `useUpdateCampaign` ya invalida esa misma
 * consulta: reutilizar los dos evita una segunda vía de escritura para el mismo dato.
 *
 * **Radio con su frase, no una casilla suelta** (docs/04-convenciones.md, «opciones con
 * significado como radios con explicación»): activarla cambia una regla del juego para toda la
 * mesa, así que el DM tiene que leer qué hace antes de tocarla, igual que con la regla de la
 * casa.
 */
function InterruptorDeSobrecarga({
  campaignId,
  enabled,
  disabled,
}: {
  campaignId: string;
  /** `undefined` solo mientras la campaña carga (o en una respuesta vieja en caché). */
  enabled: boolean | undefined;
  disabled: boolean;
}) {
  const update = useUpdateCampaign(campaignId);
  // Lo que acaba de responder el PATCH gana mientras la campaña se revalida, igual que
  // `InterruptorDeLaCasa`: si no, el radio saltaría a la posición vieja un instante.
  const conocido = update.data?.encumbranceVariant ?? enabled ?? false;

  const opciones: readonly { valor: boolean; etiqueta: string; frase: string }[] = [
    {
      valor: false,
      etiqueta: "Apagada",
      frase: "El peso llevado no cambia nada: ni la velocidad, ni las tiradas.",
    },
    {
      valor: true,
      etiqueta: "Encendida",
      // Fix round 1 (BAJA-3): la cita en inglés del SRD va en el código (`effective-speed.ts`,
      // `suggested-roll-mode.ts`), no en lo que lee el DM. «5x»/«10x» y no «5×»/«10×»: ver el
      // comentario de `vocabulario.ts` junto a `encumbrance.encumbered` sobre por qué.
      frase:
        "Regla opcional del SRD 5.1 (sobrecarga). Por encima de 5x Fuerza (en libras) el personaje va cargado y su velocidad baja 10 pies; por encima de 10x Fuerza va muy cargado, baja 20 pies y tiene desventaja en pruebas, ataques y salvaciones de Fuerza, Destreza o Constitución.",
    },
  ];

  return (
    <fieldset className="mt-4 rounded-radius-sm border border-muted bg-surface p-s3">
      <legend className="px-1 font-chrome text-chrome-sm text-text">
        Variante de sobrecarga, en esta campaña
      </legend>
      <div className="space-y-1">
        {opciones.map((opcion) => {
          const elegida = conocido === opcion.valor;
          return (
            <label
              key={String(opcion.valor)}
              className={[
                "flex cursor-pointer items-start gap-s2 rounded-radius-sm border px-s2 py-1.5 transition-colors",
                elegida
                  ? "border-accent bg-[color:var(--accent-tint)]"
                  : "border-transparent hover:bg-bg",
                disabled ? "cursor-not-allowed opacity-60" : "",
              ].join(" ")}
            >
              <input
                type="radio"
                name="encumbrance-variant"
                checked={elegida}
                disabled={disabled || update.isPending}
                onChange={() => update.mutate({ encumbranceVariant: opcion.valor })}
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
        })}
      </div>
      {update.isError && (
        <p role="alert" className="mt-s2 font-chrome text-chrome-xs text-danger-text">
          {(update.error as Error).message}
        </p>
      )}
    </fieldset>
  );
}

/**
 * C1 bis (2026-09-12) — la partida de PlanarAlly (`tablero.supportive.pro/game/<nombre>`) que la mesa
 * enmarca. Guardar es explícito (escribir es un proceso: Guardar/Quitar), con el mismo
 * `PATCH /campaigns/:id` que el nombre. Solo DM; el servidor lo exige (`requireDM`).
 */
function SalaDelTablero({
  campaignId,
  url,
  disabled,
}: {
  campaignId: string;
  url: string | null;
  disabled: boolean;
}) {
  const update = useUpdateCampaign(campaignId);
  const [valor, setValor] = useState(url ?? "");
  const [error, setError] = useState<string | null>(null);

  // Revisión de fichas, IMPORTANT #1 (docs/04-convenciones.md:460, «el botón de guardar nunca
  // se deshabilita»): un campo vacío no bloquea el botón, se explica con el error del propio
  // `Field` y no llega a llamar al PATCH.
  const onGuardar = () => {
    const siguiente = valor.trim();
    if (siguiente === "") {
      setError("Escribe la dirección de la sala, o pulsa «Quitar la sala».");
      return;
    }
    setError(null);
    update.mutate({ boardRoomUrl: siguiente }, { onError: (e) => setError((e as Error).message) });
  };

  // Minor #3 — un rechazo conserva lo tecleado: el input no se vacía antes de mandar la
  // petición, solo si el PATCH responde bien; si falla, el valor escrito sigue ahí junto al
  // error.
  const onQuitar = () => {
    setError(null);
    update.mutate(
      { boardRoomUrl: null },
      {
        onSuccess: () => setValor(""),
        onError: (e) => setError((e as Error).message),
      },
    );
  };

  return (
    <section aria-label="Sala del tablero" className="mt-s5 border-t border-muted pt-s4">
      <h3 className="font-title text-chrome-md text-text">Sala del tablero</h3>
      <p className="mt-1 font-chrome text-chrome-xs text-muted">
        La dirección de vuestra partida en el tablero (PlanarAlly). Con ella, la mesa enseña el mapa
        en el centro y el registro se pliega abajo. Sin ella, la mesa es la de siempre.
      </p>
      <Field
        label="Dirección de la sala"
        hint="https://tablero.supportive.pro/game/…"
        error={error ?? undefined}
        reservaEspacio
      >
        <input
          type="url"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          disabled={disabled}
          className={fieldControlClass}
        />
      </Field>
      <div className="mt-s2 flex gap-s2">
        <Button type="button" onClick={onGuardar} disabled={disabled}>
          Guardar la sala
        </Button>
        {url && (
          <Button type="button" variant="secondary" onClick={onQuitar} disabled={disabled}>
            Quitar la sala
          </Button>
        )}
      </div>
    </section>
  );
}
