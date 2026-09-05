import { useState } from "react";
import { useMyRole } from "../campaigns/members";
import { CHECKING_PERMISSIONS, RetryPermissions } from "../campaigns/PermissionStatus";
import { useCreateInvite } from "./hooks";
import { ListaDeInvitaciones } from "./ListaDeInvitaciones";
import { translateInviteError } from "./api";
import { Button } from "../../ui/Button";
import { Field, fieldControlClass } from "../../ui/Field";
import { Panel } from "../../ui/Panel";
import { IconoConfirmacion } from "../../ui/Iconos";

export function InvitePanel({ campaignId }: { campaignId: string }) {
  const create = useCreateInvite(campaignId);
  const {
    role,
    isLoading: roleLoading,
    isError: roleError,
    retry: retryRole,
  } = useMyRole(campaignId);
  const isDM = role === "DM";
  const [copyError, setCopyError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  /**
   * **Cuanto vale el enlace** (plan 11, ficha A3). Siete dias por defecto, que es lo que el plan
   * propone y lo que una mesa hace de verdad: se invita para la sesion de este sabado.
   *
   * «Sin caducidad» sigue existiendo y **no esta escondida**: es como se han comportado todos los
   * enlaces hasta hoy, y quitarla de golpe habria cambiado la costumbre de la mesa sin permiso.
   */
  const [dias, setDias] = useState<string>("7");

  // Generating an invite is DM-only on the server (invites.service.ts, requireDM) — this is
  // honesty, not the enforcement: a player who forces the click still gets the server's 403,
  // this only stops the interface from offering an action it knows will fail. Disabled, not
  // hidden, and consistently so across the four spots this task touches (sessions, characters,
  // entities, invites): a hidden button leaves a player thinking the feature doesn't exist at
  // all, while a disabled one with a reason teaches the permission model. While the role is
  // still unknown (own user id not rehydrated yet, the members list in flight, or the members
  // request failed — arreglo 4 of 1.15-fix: a failed request must read exactly like "still
  // loading", never like "confirmed not the DM", so a legitimate DM isn't told they can't
  // generate invitations on their own campaign) this also disables rather than showing an
  // enabled button that would offer a doomed action, or hiding it and flickering once the real
  // role arrives.
  const roleUnresolved = roleLoading || roleError;
  const disabledReason = roleUnresolved
    ? CHECKING_PERMISSIONS
    : !isDM
      ? "Solo el DM de la campaña puede generar invitaciones."
      : undefined;

  const link = create.data ? `${window.location.origin}/join/${create.data.token}` : null;

  const onGenerate = () => {
    setCopyError(null);
    setCopied(false);
    create.mutate(dias === "" ? undefined : Number(dias));
  };

  const onCopy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setCopyError(null);
    } catch {
      // The clipboard can be blocked by browser permissions; a "copiado" that lied would be
      // worse than no button at all, so the link stays visible and the failure is shown.
      setCopied(false);
      setCopyError("No se pudo copiar. Copia el enlace manualmente.");
    }
  };

  return (
    <Panel tone="chrome">
      <h3 className="text-chrome-sm font-semibold">Invitar jugador</h3>
      <p className="mt-1 text-chrome-xs text-muted">
        Cada enlace sirve para una sola persona: si quieres invitar a varios jugadores, genera un
        enlace nuevo para cada uno.
      </p>
      <div className="mt-3">
        <Field
          label="Caduca en"
          hint="Sin caducidad, el enlace vale hasta que alguien lo use o lo revoques."
        >
          <select
            className={fieldControlClass + " w-48"}
            value={dias}
            onChange={(e) => setDias(e.target.value)}
            disabled={!!disabledReason}
          >
            <option value="1">Un dia</option>
            <option value="7">Siete dias</option>
            <option value="30">Treinta dias</option>
            <option value="">Sin caducidad</option>
          </select>
        </Field>
      </div>
      <Button
        onClick={onGenerate}
        disabled={create.isPending || !!disabledReason}
        title={disabledReason}
        className="mt-3"
      >
        Generar invitación
      </Button>
      {disabledReason && <p className="mt-1 text-chrome-xs text-muted">{disabledReason}</p>}
      {roleError && <RetryPermissions onRetry={retryRole} />}
      {create.isError && (
        <p className="mt-2 text-chrome-sm text-danger-text">
          {translateInviteError((create.error as Error).message)}
        </p>
      )}
      {link && (
        <div className="mt-3">
          {/* **Este aviso decia otra cosa hasta el plan 11, y habia que reescribirlo o pasaria a
              mentir.** Existia PORQUE no se podia revocar. Ahora si: la lista de abajo los ensena
              y los mata. La frase se queda —sigue siendo verdad que generar no es refrescar— y
              **deja de ser un callejon sin salida**: apunta a lo que se puede hacer.

              Sigue en `--warning-text` y no en `--danger`: no hay nada roto ni perdido, es un
              matiz que conviene saber. */}
          <p className="rounded-radius-sm border border-warning bg-bg p-2 text-chrome-xs text-warning-text">
            Generar otro enlace no anula este ni los anteriores: todos siguen siendo válidos hasta
            que alguien los use o los revoques. Los tienes todos abajo.
          </p>
          <Field label="Enlace de invitación">
            <input
              id="invite-link"
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
              className={`mt-2 ${fieldControlClass}`}
            />
          </Field>
          <Button type="button" variant="secondary" onClick={onCopy} className="mt-2">
            Copiar enlace
          </Button>
          {/* Task 1.18b: this was plain --accent-text text, the exact colour of the links
              around it — "Copiado." read as one more link, not as confirmation the click did
              anything. No new success token (see tokens.css): la marca de visto más la palabra
              explícita, sobre el mismo --accent-text, es lo que lo hace leer como confirmación.
              Q1: el icono se dibuja (ui/Iconos.tsx), ya no es un carácter de fuente — y sigue siendo
              la señal que no depende del color. */}
          {copied && (
            <p className="mt-1 text-chrome-xs text-accent-text">
              <IconoConfirmacion className="mr-1" />
              Copiado.
            </p>
          )}
          {copyError && <p className="mt-1 text-chrome-xs text-danger-text">{copyError}</p>}
        </div>
      )}

      {/* **Los enlaces repartidos** (ficha D3b). Solo para el DM: para el resto el servidor
          responde 403, asi que ni se pide. */}
      {isDM && <ListaDeInvitaciones campaignId={campaignId} />}
    </Panel>
  );
}
