import { useState } from "react";
import type { CombatantSide } from "@dnd/shared";
import { useStartEncounter } from "./hooks";
import type { Character } from "../characters/api";
import type { NpcEnLaMesa } from "../bestiario/api";
import { Button } from "../../ui/Button";
import { Dialog } from "../../ui/Dialog";
import { descriptorDePersonaje } from "../characters/descriptor";
import { BANDOS } from "../../dominio/combate";

// Tarea 2.5.6 — **entrar en combate es un momento, no una pantalla.**
//
// §5 del reseño lo dice así, y por eso esto es un botón en la mesa y un diálogo de una pregunta:
// quiénes combaten y de qué lado está cada uno. Los PNJ idénticos se agrupan solos por su
// `statblockRef`, que decide el servidor: *«Tu GM hará una única tirada para todo un grupo de
// criaturas idénticas»*.
//
// **Solo el DM.** No es esconder un botón: `EncountersService.start` exige DM, y esta pantalla
// enseña lo que el servidor permite en vez de prometer lo que va a rechazar.
//
// Tarea 7 (2026-09-05, iniciativa y bando) — **el servidor ya no tira la iniciativa: cada jugador
// tira la suya.** Este diálogo decía lo contrario desde que se escribió, y hoy además manda el
// bando: `startEncounterSchema` acepta `sides` desde el plan 02 y lo rechaza si trae una clave que
// no combate (`packages/shared/src/encounter.schema.ts`). El bando de cada uno es una propuesta
// visible y editable, derivada de dónde vive cada candidato — el grupo entra aliado, los PNJ de
// la mesa entran enemigos — nunca un valor oculto: el servidor no puede adivinarlo (no hay dato del
// que deducirlo) y por eso lo dice quien empieza el encuentro.

export function EmpezarCombate({
  campaignId,
  sessionId,
  personajes,
  pnjs = [],
}: {
  campaignId: string;
  sessionId: string;
  personajes: Character[];
  /**
   * **Los PNJ que ya están en la mesa.** Sin ellos, el diálogo solo ofrecía a los personajes de
   * los jugadores: se podía «entrar en combate» pero **no había con quién combatir**, y el
   * capataz que el DM acababa de sacar del bestiario no aparecía por ninguna parte. Meterlo en el
   * combate solo se podía por la API.
   */
  pnjs?: NpcEnLaMesa[];
}) {
  const [abierto, setAbierto] = useState(false);

  // **Sin personajes no se esconde el botón ni se deshabilita con la explicación en un `title`.**
  // Un botón deshabilitado no recibe foco, así que ese tooltip no lo alcanza nadie con teclado ni
  // con lector de pantalla — es la misma razón por la que `04-convenciones.md` prohíbe deshabilitar
  // el botón de guardar. Se dice la frase, y ya está: no hay nada que pulsar porque no hay nadie
  // con quien combatir, y eso se lee.
  if (personajes.length === 0 && pnjs.length === 0) {
    return (
      <span className="font-chrome text-chrome-xs text-muted">
        No hay ningún personaje en esta campaña con el que combatir.
      </span>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        className="px-2 py-0.5 text-chrome-xs"
        onClick={() => setAbierto(true)}
      >
        Entrar en combate
      </Button>
      {abierto && (
        <DialogoDeCombate
          campaignId={campaignId}
          sessionId={sessionId}
          personajes={personajes}
          pnjs={pnjs}
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
  pnjs,
  onClose,
}: {
  campaignId: string;
  sessionId: string;
  personajes: Character[];
  pnjs: NpcEnLaMesa[];
  onClose: () => void;
}) {
  const empezar = useStartEncounter(campaignId, sessionId);

  // **Todos los candidatos, no solo los elegidos**: hace falta saber quién es «del grupo» para
  // proponerle el bando por defecto, tanto al pintar la fila como al mandar el `POST`.
  const candidatos = [
    ...personajes.map((c) => ({ id: c.id, nombre: c.name, esDelGrupo: true })),
    ...pnjs.map((p) => ({ id: p.id, nombre: p.name, esDelGrupo: false })),
  ];
  const candidatoDe = new Map(candidatos.map((c) => [c.id, c]));

  const [elegidos, setElegidos] = useState<string[]>([]);

  // **La propuesta no se siembra una vez: se deriva en cada pintado.** Un `useState` inicializado
  // con los candidatos del primer render se queda fijo — si la lista de PNJ crece con el diálogo
  // abierto (`useNpcs` se invalida al instanciar uno nuevo), esa fila nueva llegaría sin ningún
  // radio marcado y, si el DM la tocaba, el resultado dependía de qué faltara en el mapa. Aquí
  // `bandos` solo guarda lo que el DM ha cambiado a mano; quien no está en el mapa recibe la
  // propuesta —ALLY para el grupo, ENEMY para los PNJ— calculada en el momento, nunca un valor
  // oculto: el servidor no puede adivinarlo (`encounter.schema.ts` dice que no puede) y por eso
  // lo dice quien empieza el encuentro.
  const [bandos, setBandos] = useState<Record<string, CombatantSide>>({});

  const bandoDe = (id: string): CombatantSide =>
    bandos[id] ?? (candidatoDe.get(id)?.esDelGrupo ? "ALLY" : "ENEMY");

  const alternar = (id: string) =>
    setElegidos((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const cambiarBando = (id: string, side: CombatantSide) =>
    setBandos((prev) => ({ ...prev, [id]: side }));

  // **Solo para quien ya está elegido.** Clasificar a alguien que no va a entrar al combate no
  // tiene destinatario: doce radios para dos combatientes obligaban a leer de más para encontrar
  // los que sí importaban.
  const filaDeBando = (id: string, nombre: string) => (
    <div
      role="radiogroup"
      aria-label={`Bando de ${nombre}`}
      className="mt-s1 flex flex-wrap gap-x-s3 gap-y-s1 pl-s2"
    >
      {BANDOS.map((b) => (
        <label
          key={b.valor}
          className="flex cursor-pointer items-center gap-s1 font-chrome text-chrome-xs text-muted"
        >
          <input
            type="radio"
            name={`bando-${id}`}
            value={b.valor}
            checked={bandoDe(id) === b.valor}
            onChange={() => cambiarBando(id, b.valor)}
            className="accent-[var(--accent)]"
          />
          <span className="text-text">{b.nombre}</span>
          <span>({b.explicacion})</span>
        </label>
      ))}
    </div>
  );

  return (
    <Dialog open onClose={onClose} title="Entrar en combate" size="lg">
      <p className="font-chrome text-chrome-sm text-muted">
        Elige quién combate y de qué lado está. Cada jugador tira la suya; tú tiras la de los tuyos.
        Las criaturas idénticas actúan a la vez con una sola tirada.
      </p>

      {/* **Dos grupos, y separados a propósito.** Un PNJ es una fila de `Character` igual que un
          personaje, pero en esta pregunta no son lo mismo: el DM busca «los míos» y «los suyos».
          Mezclarlos en una lista alfabética obliga a leerla entera para sacar tres goblins. */}
      <ul className="mt-s3 flex max-h-[50vh] flex-col gap-s1 overflow-y-auto">
        {personajes.length > 0 && (
          <li className="px-s2 pt-s1 font-chrome text-chrome-xs uppercase tracking-wide text-muted">
            El grupo
          </li>
        )}
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
            {elegidos.includes(c.id) && filaDeBando(c.id, c.name)}
          </li>
        ))}
        {pnjs.length > 0 && (
          <li className="px-s2 pt-s2 font-chrome text-chrome-xs uppercase tracking-wide text-muted">
            PNJ en la mesa
          </li>
        )}
        {pnjs.map((p) => (
          <li key={p.id}>
            <label className="flex items-center gap-s2 rounded-radius-sm px-s2 py-s1 font-chrome text-chrome-sm text-text hover:bg-bg">
              <input
                type="checkbox"
                className="accent-[var(--accent)]"
                checked={elegidos.includes(p.id)}
                onChange={() => alternar(p.id)}
              />
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              <span className="shrink-0 font-chrome text-chrome-xs text-muted">
                {p.currentHp === null ? "sin PG anotados" : `${p.currentHp} PG`}
              </span>
            </label>
            {elegidos.includes(p.id) && filaDeBando(p.id, p.name)}
          </li>
        ))}
      </ul>

      {empezar.isError && (
        <p role="alert" className="mt-s2 font-chrome text-chrome-xs text-danger-text">
          {(empezar.error as Error).message}
        </p>
      )}

      <div className="mt-s4 flex items-center justify-between gap-s3">
        {/* **Contar «combatientes», no «quién tira».** Esta pantalla no sabe quién es el DM de la
            partida (no llega `ownerId` de los PNJ, y los idénticos comparten una tirada): decir
            «N tirarán su iniciativa» sería la misma mentira que esta tarea vino a quitar del
            párrafo de arriba, solo que ahora en el contador. */}
        <span id="empezar-combate-recuento" className="font-chrome text-chrome-xs text-muted">
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
            aria-describedby={elegidos.length === 0 ? "empezar-combate-recuento" : undefined}
            onClick={() =>
              empezar.mutate(
                {
                  characterIds: elegidos,
                  sides: Object.fromEntries(elegidos.map((id) => [id, bandoDe(id)])),
                },
                { onSuccess: onClose },
              )
            }
          >
            Pedir iniciativa
          </Button>
        </span>
      </div>
    </Dialog>
  );
}
