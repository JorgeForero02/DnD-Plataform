import { useState } from "react";
import { useCreateInvite } from "./hooks";
import { translateInviteError } from "./api";

export function InvitePanel({ campaignId }: { campaignId: string }) {
  const create = useCreateInvite(campaignId);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const link = create.data ? `${window.location.origin}/join/${create.data.token}` : null;

  const onGenerate = () => {
    setCopyError(null);
    setCopied(false);
    create.mutate();
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
    <div className="rounded bg-slate-800 p-4">
      <h3 className="text-sm font-semibold">Invitar jugador</h3>
      <p className="mt-1 text-xs text-slate-400">
        Cada enlace sirve para una sola persona: si quieres invitar a varios jugadores, genera un
        enlace nuevo para cada uno.
      </p>
      <button
        onClick={onGenerate}
        disabled={create.isPending}
        className="mt-3 rounded bg-indigo-600 px-3 py-1 text-sm font-semibold disabled:opacity-50"
      >
        Generar invitación
      </button>
      {create.isError && (
        <p className="mt-2 text-sm text-red-400">
          {translateInviteError((create.error as Error).message)}
        </p>
      )}
      {link && (
        <div className="mt-3">
          {/* Server has no revocation for a link that's already out (docs/06-pendientes.md):
              generating a new one leaves the old token valid and unlisted, so the DM needs to
              know pressing this button again is not a "refresh". */}
          <p className="text-xs text-amber-400">
            Generar otro enlace no anula este ni los anteriores: todos siguen siendo válidos hasta
            que alguien los use.
          </p>
          <label htmlFor="invite-link" className="mt-2 block text-sm">
            Enlace de invitación
          </label>
          <input
            id="invite-link"
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded bg-slate-900 p-2 text-sm"
          />
          <button
            type="button"
            onClick={onCopy}
            className="mt-2 rounded bg-slate-700 px-3 py-1 text-sm"
          >
            Copiar enlace
          </button>
          {copied && <p className="mt-1 text-xs text-emerald-400">Copiado.</p>}
          {copyError && <p className="mt-1 text-xs text-red-400">{copyError}</p>}
        </div>
      )}
    </div>
  );
}
