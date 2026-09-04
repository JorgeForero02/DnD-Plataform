import { useState } from "react";
import type { Character } from "../../characters/api";
import { descriptorDePersonaje } from "../../characters/descriptor";
import {
  useCharacterSheet,
  useChangeHp,
  useConditions,
  useGameClock,
} from "../../character-sheet/hooks";
import { HojaCalculada } from "../../character-sheet/HojaCalculada";
import { nombreCondicion } from "../../character-sheet/vocabulario";
import { describirRestante } from "../../character-sheet/duraciones";
import { IconoEspada, IconoEscudo, IconoOjo } from "./iconos";
import { Button } from "../../../ui/Button";
import { Dialog } from "../../../ui/Dialog";
import { PonerCondicion } from "./PonerCondicion";
import { PonerDano } from "./PonerDano";

/**
 * Un personaje en la mesa: retrato, quién lo lleva, puntos de golpe, condiciones y —solo para el
 * DM— sus mandos.
 *
 * **Cada ficha pide su hoja y sus condiciones por separado**, y eso es a propósito: son los dos
 * endpoints que ya existen, los dos filtran por `canView` en el servidor, y un personaje que un
 * jugador no puede ver ni siquiera llega a esta lista. Una consulta por personaje en una mesa de
 * cinco es barata; inventar un endpoint agregado sería tocar la API para ahorrar cuatro peticiones.
 *
 * **Los mandos son del DM y de nadie más** (maqueta: `FichaDeElenco.tsx:120-143`, prop
 * `conMandos`). El comentario que vivía aquí decía que «el DM abre las fichas ajenas desde el
 * elenco» y **no había ningún `onClick`**: era una promesa escrita en un comentario. Ahora el
 * ojo abre de verdad la hoja del personaje, en el mismo cajón lateral que usa el rail.
 *
 * **Sobre el retrato de otro jugador no van botones**, y la razón la dio el autor: *«en BG3 es un
 * jugador manejando varios; acá somos varios manejando uno propio»*. El personaje de otro no es
 * tuyo, así que su retrato es información, no un mando. El DM sí los tiene porque él sí maneja a
 * muchos. Esconderlos **no es control de acceso** —el servidor exige dueño o DM igual, y por eso
 * la regla se cumple aunque alguien fabrique la petición—: es no prometer lo que va a dar 403.
 */
export function FichaDeElenco({
  campaignId,
  personaje,
  dueno,
  puedeCambiarPg,
  destacado = false,
  conMandos = false,
  turnoActual = false,
  enCombate = false,
}: {
  campaignId: string;
  personaje: Character;
  dueno?: string;
  /** Los ±5 del jugador sobre SU personaje. El DM no los lleva: tiene el cajón de «Daño». */
  puedeCambiarPg: boolean;
  /** El tuyo, en la disposición del jugador: filete de acento y algo más de aire. */
  destacado?: boolean;
  /** La disposición del DM: «Daño», «Condición» y el ojo. */
  conMandos?: boolean;
  /** Hay encuentro y le toca a este personaje. */
  turnoActual?: boolean;
  /** Hay encuentro activo: la duración de una condición se puede contar en asaltos. */
  enCombate?: boolean;
}) {
  const { data: hoja } = useCharacterSheet(campaignId, personaje.id);
  const { data: condiciones } = useConditions(campaignId, personaje.id);
  const cambiarPg = useChangeHp(campaignId, personaje.id);
  const [panel, setPanel] = useState<"dano" | "condicion" | "hoja" | null>(null);

  const actual = hoja?.hp.current ?? null;
  const maximo = hoja?.hp.max ?? null;
  const ca = hoja?.sheet?.derived.ac?.total ?? null;
  const descriptor = descriptorDePersonaje(personaje);

  return (
    <li
      className={[
        "relative rounded-radius-sm bg-bg",
        destacado ? "border border-accent p-s3" : "border border-muted p-s2",
        // El anillo del turno. **No es el único portador**: el rótulo «Su turno» de arriba dice
        // lo mismo con palabras, igual que la tira de iniciativa lleva su «Le toca».
        turnoActual ? "ring-2 ring-warning" : "",
      ].join(" ")}
    >
      {turnoActual && (
        <span className="absolute -top-2 left-s3 rounded-radius-sm bg-warning px-1.5 py-px font-chrome text-chrome-xs font-semibold text-bg">
          Su turno
        </span>
      )}
      <div className="flex items-center gap-s2">
        <Retrato nombre={personaje.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-title text-chrome-md leading-tight text-text">
            {personaje.name}
          </p>
          <p className="truncate font-data text-chrome-xs text-muted">
            {[descriptor, `Nivel ${personaje.level}`].filter(Boolean).join(" · ")}
          </p>
          {dueno && (
            <p className="truncate font-chrome text-chrome-xs text-muted">Lo lleva {dueno}</p>
          )}
        </div>
        {ca !== null && (
          <span className="flex shrink-0 items-center gap-1 font-data text-chrome-xs text-muted">
            <IconoEscudo className="h-3.5 w-3.5" />
            <span className="sr-only">Clase de armadura </span>
            {ca}
          </span>
        )}
      </div>

      <BarraDePuntosDeGolpe nombre={personaje.name} actual={actual} maximo={maximo} />

      {puedeCambiarPg && maximo !== null && (
        // Dos golpes, no un formulario. La corrección exacta se hace en la hoja, con su control
        // de concurrencia; aquí solo está el gesto que se repite treinta veces por sesión.
        //
        // **El DM no lleva esto**: lleva el cajón de «Daño», que además admite el crítico y
        // queda preparado para el tipo de daño. Los ±5 se quedan donde la maqueta no pone
        // mandos —el personaje propio de un jugador—, porque quitarlos sería dejarle sin la
        // única forma de anotar un golpe sin abrir la hoja entera.
        <div className="mt-s2 flex items-center gap-s2">
          {[-5, 5].map((delta) => (
            <Button
              key={delta}
              type="button"
              variant="ghost"
              className="px-2 py-0.5 font-data text-chrome-xs"
              disabled={cambiarPg.isPending}
              onClick={() => cambiarPg.mutate({ delta })}
              aria-label={`${delta < 0 ? "Quitar" : "Dar"} ${Math.abs(delta)} puntos de golpe a ${personaje.name}`}
            >
              {delta < 0 ? `−${Math.abs(delta)}` : `+${delta}`}
            </Button>
          ))}
          {cambiarPg.isError && (
            <span role="alert" className="font-chrome text-chrome-xs text-danger-text">
              {(cambiarPg.error as Error).message}
            </span>
          )}
        </div>
      )}

      <Condiciones campaignId={campaignId} condiciones={condiciones ?? []} />

      {conMandos && (
        <div className="mt-s2 flex items-center gap-s1">
          <button
            type="button"
            onClick={() => setPanel("dano")}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-radius-sm border border-danger px-1 py-1 font-chrome text-chrome-xs text-danger-text hover:bg-[color:var(--danger-tint)]"
          >
            <IconoEspada className="h-3.5 w-3.5" />
            Daño
            <span className="sr-only"> a {personaje.name}</span>
          </button>
          <button
            type="button"
            onClick={() => setPanel("condicion")}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-radius-sm border border-warning px-1 py-1 font-chrome text-chrome-xs text-warning-text hover:bg-[color:var(--warning-tint)]"
          >
            Condición
            <span className="sr-only"> a {personaje.name}</span>
          </button>
          <button
            type="button"
            onClick={() => setPanel("hoja")}
            aria-label={`Abrir la ficha de ${personaje.name}`}
            className="rounded-radius-sm border border-muted p-1 text-muted hover:text-text"
          >
            <IconoOjo className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Los tres cajones del mando. **Uno a la vez**, como el estrato superpuesto del reseño:
          `panel` es un solo estado, así que abrir «Condición» cierra «Daño». */}
      {conMandos && (
        <>
          <PonerDano
            campaignId={campaignId}
            characterId={personaje.id}
            nombre={personaje.name}
            abierto={panel === "dano"}
            onCerrar={() => setPanel(null)}
          />
          <PonerCondicion
            campaignId={campaignId}
            characterId={personaje.id}
            nombre={personaje.name}
            abierto={panel === "condicion"}
            enCombate={enCombate}
            onCerrar={() => setPanel(null)}
          />
          <Dialog
            open={panel === "hoja"}
            onClose={() => setPanel(null)}
            title={personaje.name}
            subtitulo="Su hoja, sin salir de la mesa."
            size="xl"
          >
            {panel === "hoja" && (
              // `puedeEditar` va en `true` porque este cajón solo existe en la disposición del
              // DM, y el servidor deja editar a DM o dueño (`requireEditable`). Si algún día se
              // abriera desde otro sitio, el valor tiene que venir de quien sepa el rol.
              <HojaCalculada campaignId={campaignId} characterId={personaje.id} puedeEditar />
            )}
          </Dialog>
        </>
      )}
    </li>
  );
}

/**
 * Las condiciones del retrato, **con lo que les queda**.
 *
 * La maqueta pinta «envenenado · 2 asaltos» en el propio retrato, y ese dato existe: el servidor
 * manda `expiresAtClock` en segundos de SU reloj y marca `expired` él mismo. **Aquí no se calcula
 * nada con un temporizador local** —lo prohíbe la trampa 4 de la auditoría, y con la mesa en
 * cinco navegadores sería mentira en cuatro—: se resta contra el reloj de campaña que el servidor
 * devuelve, exactamente como hace `character-sheet/Condiciones.tsx`.
 *
 * **Una condición vencida se marca, no desaparece.** El servidor la deja en la lista a propósito
 * (decisión D-2C-2) para que nadie vea cambiar sus números sin saber por qué.
 */
function Condiciones({
  campaignId,
  condiciones,
}: {
  campaignId: string;
  condiciones: {
    id: string;
    key: string;
    level: number | null;
    expiresAtClock?: number | null;
    expired?: boolean;
  }[];
}) {
  // El reloj solo se pide si hay algo que contar: una condición viva con caducidad.
  const hayCuentaAtras = condiciones.some((c) => c.expiresAtClock != null && c.expired !== true);
  const { data: reloj } = useGameClock(campaignId, { enabled: hayCuentaAtras });

  return (
    <ul className="mt-s2 flex flex-wrap gap-1.5">
      {condiciones.length === 0 ? (
        <li className="font-chrome text-chrome-xs text-muted">Sin condiciones</li>
      ) : (
        condiciones.map((c) => {
          const vencida = c.expired === true;
          const restante =
            !vencida && c.expiresAtClock != null && reloj ? c.expiresAtClock - reloj.seconds : null;
          return (
            <li
              key={c.id}
              className={[
                "rounded-radius-sm border px-1.5 py-0.5 font-chrome text-chrome-xs",
                vencida ? "border-muted text-muted" : "border-warning text-warning-text",
              ].join(" ")}
            >
              <span className={vencida ? "line-through" : undefined}>
                {nombreCondicion(c.key)}
                {c.level !== null && ` ${c.level}`}
              </span>
              {vencida ? (
                <span className="ml-1">· vencida</span>
              ) : (
                restante != null && (
                  <span className="ml-1 text-muted">· {describirRestante(restante)}</span>
                )
              )}
            </li>
          );
        })
      )}
    </ul>
  );
}

/**
 * El retrato.
 *
 * Todavía no hay imágenes en el modelo, así que la inicial hace de retrato — igual que en la
 * maqueta. **La inicial es texto, no un icono**: la regla que prohíbe los glifos prohíbe usarlos
 * *como dibujo*, y aquí la letra ES el dato. `aria-hidden` porque el nombre entero está al lado.
 */
export function Retrato({ nombre }: { nombre: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-copper bg-surface font-title text-chrome-md text-copper-text"
    >
      {nombre.trim().charAt(0).toUpperCase()}
    </span>
  );
}

/**
 * Los puntos de golpe, con su barra.
 *
 * **El color no es el único portador**: la cifra «42/58» dice lo mismo que la barra, y el ancho
 * lo dice una tercera vez. Los tres tramos son los de la maqueta —hasta un cuarto de la vida en
 * rojo, hasta poco más de la mitad en ámbar, el resto en el acento—, porque en la mesa eso es lo
 * que se mira de reojo; quien no distinga los tonos lee la fracción igual.
 *
 * El ancho va en estilo en línea porque es un valor **calculado**, no una decisión de diseño: no
 * hay clase de Tailwind para «el 72,4 % de la vida que le queda a este personaje».
 */
export function BarraDePuntosDeGolpe({
  nombre,
  actual,
  maximo,
}: {
  nombre: string;
  actual: number | null;
  maximo: number | null;
}) {
  if (actual === null || maximo === null || maximo <= 0) {
    return (
      <p className="mt-s2 font-chrome text-chrome-xs text-muted">Sin puntos de golpe en la hoja.</p>
    );
  }
  const proporcion = Math.max(0, Math.min(1, actual / maximo));
  // Los tramos de la maqueta (`prototipo/src/features/FichaDeElenco.tsx`, `BarraVida`): 25 % y
  // 55 %. Un personaje a 0 entra en el primero por definición.
  const tono = proporcion <= 0.25 ? "bg-danger" : proporcion <= 0.55 ? "bg-warning" : "bg-accent";

  // La forma de la maqueta: la barra y la fracción **en la misma línea**, no un rótulo «PG»
  // encima. La cifra es lo que hace que el color no sea el único portador, y va pegada a la
  // barra para que se lean de un vistazo como una sola cosa.
  return (
    <div className="mt-s2 flex items-center gap-s2">
      <div
        role="img"
        aria-label={`${nombre}: ${actual} de ${maximo} puntos de golpe`}
        className="h-1.5 flex-1 overflow-hidden rounded-radius-sm border border-muted bg-surface"
      >
        <div className={`h-full ${tono}`} style={{ width: `${(proporcion * 100).toFixed(1)}%` }} />
      </div>
      <span className="shrink-0 font-data text-chrome-xs tabular-nums text-text">
        {actual}/{maximo}
      </span>
    </div>
  );
}
