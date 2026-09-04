import { useState } from "react";
import { useStartEncounter } from "./hooks";
import type { Character } from "../characters/api";
import { Button } from "../../ui/Button";
import { Dialog } from "../../ui/Dialog";
import { descriptorDePersonaje } from "../characters/descriptor";

// Tarea 2.5.6 — **entrar en combate es un momento, no una pantalla.**
//
// §5 del reseño lo dice así, y por eso esto es un botón en la mesa y un diálogo de una pregunta:
// quiénes combaten. Nada más. **La iniciativa la tira el servidor** —el jugador manda a quién
// representa, no un resultado (2.5.2)— y los PNJ idénticos se agrupan solos por su `statblockRef`,
// que también decide el servidor: *«Tu GM hará una única tirada para todo un grupo de criaturas
// idénticas»*.
//
// **Solo el DM.** No es esconder un botón: `EncountersService.start` exige DM, y esta pantalla
// enseña lo que el servidor permite en vez de prometer lo que va a rechazar.

export function EmpezarCombate({
  campaignId,
  sessionId,
  personajes,
}: {
  campaignId: string;
  sessionId: string;
  personajes: Character[];
}) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className="px-2 py-0.5 text-chrome-xs"
        disabled={personajes.length === 0}
        title={
          personajes.length === 0
            ? "No hay ningún personaje en esta campaña con el que combatir."
            : undefined
        }
        onClick={() => setAbierto(true)}
      >
        Entrar en combate
      </Button>
      {abierto && (
        <DialogoDeCombate
          campaignId={campaignId}
          sessionId={sessionId}
          personajes={personajes}
          onClose={() => setAbierto(false)}
        />
      )}
    </>
  );
}

function DialogoDeCombate({
  campaignId,
  sessionId,
  personajes,
  onClose,
}: {
  campaignId: string;
  sessionId: string;
  personajes: Character[];
  onClose: () => void;
}) {
  const empezar = useStartEncounter(campaignId, sessionId);
  const [elegidos, setElegidos] = useState<string[]>([]);

  const alternar = (id: string) =>
    setElegidos((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <Dialog open onClose={onClose} title="Entrar en combate" size="lg">
      <p className="font-chrome text-chrome-sm text-muted">
        Elige quién combate. La iniciativa la tira el servidor, y las criaturas idénticas actúan a
        la vez con una sola tirada.
      </p>

      <ul className="mt-s3 flex max-h-[50vh] flex-col gap-s1 overflow-y-auto">
        {personajes.map((c) => (
          <li key={c.id}>
            <label className="flex items-center gap-s2 rounded-radius-sm px-s2 py-s1 font-chrome text-chrome-sm text-text hover:bg-bg">
              <input
                type="checkbox"
                className="accent-[var(--accent)]"
                checked={elegidos.includes(c.id)}
                onChange={() => alternar(c.id)}
              />
              <span className="min-w-0 flex-1 truncate">{c.name}</span>
              {/* El descriptor traducido del catálogo, nunca la clave: es la misma función que
                  usa el elenco, no una segunda forma de decir lo mismo. */}
              <span className="shrink-0 font-chrome text-chrome-xs text-muted">
                {descriptorDePersonaje(c)}
              </span>
            </label>
          </li>
        ))}
      </ul>

      {empezar.isError && (
        <p role="alert" className="mt-s2 font-chrome text-chrome-xs text-danger-text">
          {(empezar.error as Error).message}
        </p>
      )}

      <div className="mt-s4 flex items-center justify-between gap-s3">
        <span className="font-chrome text-chrome-xs text-muted">
          {elegidos.length === 0
            ? "Nadie elegido todavía"
            : `${elegidos.length} ${elegidos.length === 1 ? "combatiente" : "combatientes"}`}
        </span>
        <span className="flex gap-s3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={elegidos.length === 0 || empezar.isPending}
            onClick={() => empezar.mutate(elegidos, { onSuccess: onClose })}
          >
            Tirar iniciativa
          </Button>
        </span>
      </div>
    </Dialog>
  );
}
