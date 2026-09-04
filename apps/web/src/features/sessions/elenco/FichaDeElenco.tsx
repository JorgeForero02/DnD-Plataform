import type { Character } from "../../characters/api";
import { descriptorDePersonaje } from "../../characters/descriptor";
import { useCharacterSheet, useChangeHp, useConditions } from "../../character-sheet/hooks";
import { nombreCondicion } from "../../character-sheet/vocabulario";
import { IconoPuntosDeGolpe } from "../iconos";
import { Button } from "../../../ui/Button";

/**
 * Un personaje en la mesa: retrato, quién lo lleva, puntos de golpe y condiciones.
 *
 * **Cada ficha pide su hoja y sus condiciones por separado**, y eso es a propósito: son los dos
 * endpoints que ya existen, los dos filtran por `canView` en el servidor, y un personaje que un
 * jugador no puede ver ni siquiera llega a esta lista. Una consulta por personaje en una mesa de
 * cinco es barata; inventar un endpoint agregado sería tocar la API para ahorrar cuatro peticiones.
 *
 * **Ola 0: movida aquí sin cambiar de forma.** El carril del elenco es quien le pone los mandos
 * de la maqueta («Daño», «Condición», el ojo) y la barra por tramos.
 */
export function FichaDeElenco({
  campaignId,
  personaje,
  dueno,
  puedeCambiarPg,
  destacado = false,
}: {
  campaignId: string;
  personaje: Character;
  dueno?: string;
  puedeCambiarPg: boolean;
  /** El tuyo, en la disposición del jugador: filete de acento y algo más de aire. */
  destacado?: boolean;
}) {
  const { data: hoja } = useCharacterSheet(campaignId, personaje.id);
  const { data: condiciones } = useConditions(campaignId, personaje.id);
  const cambiarPg = useChangeHp(campaignId, personaje.id);

  const actual = hoja?.hp.current ?? null;
  const maximo = hoja?.hp.max ?? null;
  const descriptor = descriptorDePersonaje(personaje);

  return (
    <li
      className={[
        "rounded-radius-sm bg-bg",
        destacado ? "border border-accent p-s3" : "border border-muted p-s2",
      ].join(" ")}
    >
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
      </div>

      <BarraDePuntosDeGolpe nombre={personaje.name} actual={actual} maximo={maximo} />

      {puedeCambiarPg && maximo !== null && (
        // Dos golpes, no un formulario. La corrección exacta se hace en la hoja, con su control
        // de concurrencia; aquí solo está el gesto que se repite treinta veces por sesión.
        //
        // **Deuda conocida y del carril, no de esta mudanza:** esto manda `{ delta }` a secas.
        // `changeHp` acepta además `damageType`, y sin él las resistencias, vulnerabilidades e
        // inmunidades de 2.5.1 **no se ejecutan nunca** (auditoría 2026-09-04, §8.2).
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
              No se pudo.
            </span>
          )}
        </div>
      )}

      <ul className="mt-s2 flex flex-wrap gap-1.5">
        {(condiciones ?? []).length === 0 ? (
          <li className="font-chrome text-chrome-xs text-muted">Sin condiciones</li>
        ) : (
          (condiciones ?? []).map((c) => (
            <li
              key={c.id}
              className="rounded-radius-sm border border-warning px-1.5 py-0.5 font-chrome text-chrome-xs text-warning-text"
            >
              {nombreCondicion(c.key)}
              {c.level !== null && ` ${c.level}`}
            </li>
          ))
        )}
      </ul>
    </li>
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
 * lo dice una tercera vez. La barra cambia de tono por debajo de un tercio porque en la mesa eso
 * es lo que se mira de reojo, pero quien no distinga los tonos lee la fracción igual.
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
  const tono = actual === 0 ? "bg-danger" : proporcion <= 1 / 3 ? "bg-warning" : "bg-accent";

  return (
    <div className="mt-s2">
      <p className="flex items-center justify-between gap-s2 font-data text-chrome-xs text-text">
        <span className="flex items-center gap-1 text-muted">
          <IconoPuntosDeGolpe />
          PG
        </span>
        <span>
          {actual}/{maximo}
        </span>
      </p>
      <div
        role="img"
        aria-label={`${nombre}: ${actual} de ${maximo} puntos de golpe`}
        className="mt-1 h-1.5 w-full overflow-hidden rounded-radius-sm border border-muted bg-surface"
      >
        <div className={`h-full ${tono}`} style={{ width: `${(proporcion * 100).toFixed(1)}%` }} />
      </div>
    </div>
  );
}
