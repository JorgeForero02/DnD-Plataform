import type { CombatantSide } from "@dnd/shared";
import type { NpcEnLaMesa } from "../../bestiario/api";
import { useCharacterSheet, useConditions } from "../../character-sheet/hooks";
import { IconoEscudo } from "../../../ui/Iconos";
import { NOMBRE_BANDO } from "../../../dominio/combate";
import { Retrato, BarraDePuntosDeGolpe, Condiciones } from "./FichaDeElenco";
import { MandosDeCombatiente } from "./MandosDeCombatiente";
import { CorregirBando } from "./CorregirBando";

/**
 * Un PNJ combatiente en el elenco (tarea 9b, 2026-09-06 — «no veo cómo quitarles vida»).
 *
 * **La queja original era literal**: `useCharacters` es «quién se sienta a la mesa» a propósito
 * (`characters.service.ts`, `statblockRef: null`), así que un PNJ nunca ha estado en `ColumnaElenco`.
 * El dato ya lo traía `MesaDeSesion.tsx` (`useNpcs`) para el orden de turnos y el diálogo de
 * combate, y esta ficha es la tercera pantalla que lo consume — no una segunda consulta.
 *
 * **Un PNJ ES una fila de `Character`** (fase 2D, `schema.prisma`), así que su hoja, sus
 * condiciones y su daño se piden y se escriben por los mismos hooks que usa `FichaDeElenco`
 * (`useCharacterSheet`, `useConditions`, `PonerDano`, `PonerCondicion`): no hay una segunda API de
 * PNJ que mantener sincronizada con la de personajes. Lo que SÍ falta en `NpcEnLaMesa` —raza,
 * clase, nivel, dueño— es exactamente lo que un statblock no tiene, así que esta ficha no finge
 * esos campos: no hay descriptor de raza/clase, no hay nivel, y no hay «Ayudar» ni los ±5 del
 * jugador, porque un PNJ no es el personaje de nadie.
 *
 * **Solo el DM lleva mandos.** No es esconder un botón — el servidor exige DM en `PATCH hp` y en
 * `POST conditions` igual que para un personaje ajeno (`requireEditable`) — es no prometerle a un
 * jugador un botón que el servidor va a rechazar con 403, la misma razón que ya da `FichaDeElenco`
 * para el resto del grupo.
 *
 * **El bando se dice con palabra, nunca con color** (regla vinculante de `docs/04-convenciones.md`):
 * `NOMBRE_BANDO` traduce `CombatantSide`, y el único color que se admite es `--warning` para
 * `ENEMY` — no hay `--success` para `ALLY`, así que un aliado se distingue por la palabra sola.
 *
 * **Los PG máximos y la CA exacta no se enseñan a un jugador** (ronda de arreglo 1 sobre la
 * tarea 9b, I-2): `NpcEnLaMesa` omite `maxHp` A PROPÓSITO (`bestiario/api.ts`: «derivarlo en dos
 * sitios discreparía en cuanto hubiera agotamiento», y hasta ahora los PG de un PNJ solo se veían
 * en pantallas del DM), y la CA exacta de un enemigo es precisamente el oráculo que D-OP-11
 * decidió no dar. Que `useCharacterSheet` los entregue igual —el servidor no distingue rol para
 * ESTE endpoint— no convierte enseñarlos en una decisión tomada: se colaron porque la ficha los
 * leía sin mirar quién pregunta. Con `!esDm` no se pasa el máximo —`BarraDePuntosDeGolpe`
 * degrada sola a «Sin puntos de golpe en la hoja.» cuando falta— ni se pinta la CA; el DM sigue
 * viendo los dos.
 *
 * **El bando también se corrige aquí (C-1, misma ronda).** El caso principal del bando es el
 * enemigo, y el enemigo casi siempre es un PNJ: sin este mando, el DM podía convertir a un
 * personaje de jugador en enemigo pero no podía tocar el bando del goblin — la funcionalidad
 * nacía coja. `CorregirBando` es el mismo componente que usa `FichaDeElenco`, no una segunda
 * copia (ver I-3 de esta misma ronda).
 */
export function FichaDePnj({
  campaignId,
  pnj,
  bando,
  esDm,
  miId,
  turnoActual = false,
  enCombate = false,
  sessionId,
  encounterId,
  combatanteId,
}: {
  campaignId: string;
  pnj: NpcEnLaMesa;
  /** El bando de este combatiente EN ESTE encuentro (`Combatant.side`), no una propiedad suya. */
  bando: CombatantSide;
  esDm: boolean;
  /**
   * Quién está mirando. **Un PNJ cedido a un jugador es suyo** (paso 1, tarea 15): el servidor ya
   * lo trata así —`requireEditable` le deja cambiarle los PG y ponerle condiciones— y la pantalla
   * era más restrictiva **solo porque `ownerId` no viajaba**.
   */
  miId?: string;
  turnoActual?: boolean;
  enCombate?: boolean;
  /** La sesión del encuentro — la ruta de `setSide` cuelga de ella. */
  sessionId?: string;
  /** El encuentro en marcha. */
  encounterId?: string;
  /** El `Combatant.id` de este PNJ en ese encuentro — no `pnj.id`. */
  combatanteId?: string;
}) {
  const { data: hoja } = useCharacterSheet(campaignId, pnj.id);
  const { data: condiciones } = useConditions(campaignId, pnj.id);

  const actual = hoja?.hp.current ?? pnj.currentHp ?? null;
  // **Solo el DM ve el máximo y la CA exacta** (I-2): `useCharacterSheet` los trae para
  // cualquiera que pueda ver al PNJ —el endpoint no distingue rol—, pero enseñarlos era una
  // decisión que nadie había tomado, solo una lectura que no miraba quién pregunta.
  const maximo = esDm ? (hoja?.hp.max ?? null) : null;
  const ca = esDm ? (hoja?.sheet?.derived.ac?.total ?? null) : null;

  // **Los mandos son del DM o del dueño**, igual que `FichaDeElenco` ya hace con `puedeCambiarPg`.
  // **Esconder el botón no es control de acceso**: la puerta real sigue siendo `requireEditable`
  // en el servidor, y esto es cortesía — enseñar un mando que va a dar 403 es peor que no
  // enseñarlo, y esconderle a alguien uno que sí puede usar es la otra mitad del mismo defecto.
  const puedeManejarlo = esDm || (miId !== undefined && pnj.ownerId === miId);

  return (
    <li
      className={[
        "relative rounded-radius-md border border-muted bg-bg p-s2",
        turnoActual ? "ring-2 ring-warning" : "",
      ].join(" ")}
    >
      {turnoActual && (
        <span className="absolute -top-2 left-s3 rounded-radius-sm bg-warning px-1.5 py-px font-chrome text-chrome-xs font-semibold text-bg">
          Su turno
        </span>
      )}
      <div className="flex items-center gap-s2">
        <Retrato personaje={pnj} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-title text-chrome-md leading-tight text-text">{pnj.name}</p>
          <p
            className={[
              "truncate font-chrome text-chrome-xs",
              bando === "ENEMY" ? "text-warning-text" : "text-muted",
            ].join(" ")}
          >
            PNJ · {NOMBRE_BANDO[bando]}
          </p>
        </div>
        {ca !== null && (
          <span className="flex shrink-0 items-center gap-1 font-data text-chrome-xs text-muted">
            <IconoEscudo className="h-3.5 w-3.5" />
            <span className="sr-only">Clase de armadura </span>
            {ca}
          </span>
        )}
      </div>

      <BarraDePuntosDeGolpe nombre={pnj.name} actual={actual} maximo={maximo} />

      <Condiciones campaignId={campaignId} condiciones={condiciones ?? []} />

      {puedeManejarlo && (
        <MandosDeCombatiente
          campaignId={campaignId}
          characterId={pnj.id}
          nombre={pnj.name}
          enCombate={enCombate}
          // **`soyDm`, no `puedeManejarlo`** (arreglo de vuelta 1 sobre B4): el jugador dueño de
          // un PNJ cedido maneja este panel sin ser el DM, y con `puedeManejarlo` —o peor, con un
          // `true` fijo— ese jugador vería «Dar» con todo el elenco como destinatarios.
          soyDm={esDm}
        />
      )}

      {esDm && enCombate && sessionId && encounterId && combatanteId && (
        <CorregirBando
          campaignId={campaignId}
          sessionId={sessionId}
          encounterId={encounterId}
          combatanteId={combatanteId}
          bando={bando}
          nombre={pnj.name}
        />
      )}
    </li>
  );
}
