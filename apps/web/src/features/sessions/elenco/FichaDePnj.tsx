import { useId, useState } from "react";
import type { CombatantSide, DamageType } from "@dnd/shared";
import type { NpcEnLaMesa } from "../../bestiario/api";
import { useCharacterSheet, useConditions } from "../../character-sheet/hooks";
import { HojaCalculada } from "../../character-sheet/HojaCalculada";
import { SelectorDeTipoDeDano } from "../../character-sheet/AplicarDano";
import { IconoEscudo, IconoEspada, IconoOjo } from "../../../ui/Iconos";
import { Dialog } from "../../../ui/Dialog";
import { NOMBRE_BANDO } from "../../../dominio/combate";
import { Retrato, BarraDePuntosDeGolpe, Condiciones } from "./FichaDeElenco";
import { PonerCondicion } from "./PonerCondicion";
import { PonerDano } from "./PonerDano";

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
 */
export function FichaDePnj({
  campaignId,
  pnj,
  bando,
  esDm,
  turnoActual = false,
  enCombate = false,
}: {
  campaignId: string;
  pnj: NpcEnLaMesa;
  /** El bando de este combatiente EN ESTE encuentro (`Combatant.side`), no una propiedad suya. */
  bando: CombatantSide;
  esDm: boolean;
  turnoActual?: boolean;
  enCombate?: boolean;
}) {
  const { data: hoja } = useCharacterSheet(campaignId, pnj.id);
  const { data: condiciones } = useConditions(campaignId, pnj.id);
  const [panel, setPanel] = useState<"dano" | "condicion" | "hoja" | null>(null);
  const [tipoDeDano, setTipoDeDano] = useState<DamageType | "">("");
  const idTipoDeDano = useId();

  const actual = hoja?.hp.current ?? pnj.currentHp ?? null;
  const maximo = hoja?.hp.max ?? null;
  const ca = hoja?.sheet?.derived.ac?.total ?? null;

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

      {esDm && (
        <div className="mt-s2 flex items-center gap-s1">
          <button
            type="button"
            onClick={() => setPanel("dano")}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-radius-sm border border-danger px-1 py-1 font-chrome text-chrome-xs text-danger-text hover:bg-[color:var(--danger-tint)]"
          >
            <IconoEspada className="h-3.5 w-3.5" />
            Daño
            <span className="sr-only"> a {pnj.name}</span>
          </button>
          <button
            type="button"
            onClick={() => setPanel("condicion")}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-radius-sm border border-warning px-1 py-1 font-chrome text-chrome-xs text-warning-text hover:bg-[color:var(--warning-tint)]"
          >
            Condición
            <span className="sr-only"> a {pnj.name}</span>
          </button>
          <button
            type="button"
            onClick={() => setPanel("hoja")}
            aria-label={`Abrir la ficha de ${pnj.name}`}
            className="rounded-radius-sm border border-muted p-1 text-muted hover:text-text"
          >
            <IconoOjo className="h-4 w-4" />
          </button>
        </div>
      )}

      {esDm && (
        <>
          <PonerDano
            campaignId={campaignId}
            characterId={pnj.id}
            nombre={pnj.name}
            abierto={panel === "dano"}
            onCerrar={() => {
              setPanel(null);
              setTipoDeDano("");
            }}
            tipoDeDano={tipoDeDano || undefined}
            ranuraTipoDeDano={
              <div className="mt-s3 flex items-center gap-s2">
                <label
                  className="font-chrome text-chrome-sm text-text"
                  htmlFor={`${idTipoDeDano}-tipo`}
                >
                  De qué tipo
                </label>
                <SelectorDeTipoDeDano
                  id={`${idTipoDeDano}-tipo`}
                  value={tipoDeDano}
                  onChange={setTipoDeDano}
                />
              </div>
            }
          />
          <PonerCondicion
            campaignId={campaignId}
            characterId={pnj.id}
            nombre={pnj.name}
            abierto={panel === "condicion"}
            enCombate={enCombate}
            onCerrar={() => setPanel(null)}
          />
          <Dialog
            open={panel === "hoja"}
            onClose={() => setPanel(null)}
            title={pnj.name}
            subtitulo="Su hoja, sin salir de la mesa."
            size="xl"
          >
            {panel === "hoja" && (
              <HojaCalculada campaignId={campaignId} characterId={pnj.id} puedeEditar />
            )}
          </Dialog>
        </>
      )}
    </li>
  );
}
