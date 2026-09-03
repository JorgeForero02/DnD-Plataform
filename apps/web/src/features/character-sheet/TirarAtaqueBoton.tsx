import { useEffect, useId, useRef, useState } from "react";
import type { RollMode, RollResult } from "@dnd/shared";
import type { AttackDto } from "./api";
import { useRollAttack } from "./hooks";
import { DadoDibujado } from "../rolls/DadoDibujado";
import { SelectorDeVentaja } from "../rolls/SelectorDeVentaja";
import { ResultadoDeTirada } from "../rolls/ResultadoDeTirada";
import { TiradaACiegas } from "../rolls/TiradaACiegas";
import { Button } from "../../ui/Button";
import { PROSA_DE_HOJA, ROTULO_DE_CASILLA } from "./Tarjeta";

// Carril B3 (fase 2B/2C) — el dado de una fila del cuadro de ataques.
//
// **No es `TirarBoton`.** Aquel tira un `1d20+mod` con tres modos y nada más; un arma tira DOS
// cosas distintas —el ataque y el daño— y el daño tiene dos decisiones propias que ninguna
// salvación ni habilidad tiene: **con qué mano** (un arma versátil) y **si es crítico**. Meter
// las dos tiradas en un solo panel es la misma idea que ya defendió `PanelDeTirada.tsx` —la
// decisión aparece una vez, donde se toma, no en cada fila— aplicada a dos decisiones que viven
// en el mismo sitio de la hoja: la fila del arma.
//
// **La expresión la compone siempre el servidor** (`character-sheet.service.ts`, comentario de
// cabecera de `rollAttackSchema`): esta pantalla nunca manda `1d8+3`, solo `part`, `mode`,
// `versatile` y `critical`. Un cliente que montara la expresión podría decir que ataca con una
// daga y tirar `1d12`.
//
// **El daño no tiene ventaja.** El servidor ignora `mode` para `part: "DAMAGE"` — la ventaja es
// del d20, no de los dados de daño —, así que aquí no se le ofrece el selector de tres estados:
// ofrecerlo mentiría sobre lo que hace.

export function TirarAtaqueBoton({
  campaignId,
  characterId,
  ataque,
}: {
  campaignId: string;
  characterId: string;
  ataque: AttackDto;
}) {
  const tirar = useRollAttack(campaignId, characterId);
  const [abierto, setAbierto] = useState(false);
  const [modoAtaque, setModoAtaque] = useState<RollMode>("NORMAL");
  const [dosManos, setDosManos] = useState(false);
  const [critico, setCritico] = useState(false);
  const [resultadoAtaque, setResultadoAtaque] = useState<RollResult | null>(null);
  const [resultadoDano, setResultadoDano] = useState<RollResult | null>(null);
  const [errorAtaque, setErrorAtaque] = useState<string | null>(null);
  const [errorDano, setErrorDano] = useState<string | null>(null);
  const dado = useRef<HTMLButtonElement>(null);
  const caja = useRef<HTMLDivElement>(null);
  const grupoMano = useId();

  useEffect(() => {
    if (abierto) caja.current?.focus();
  }, [abierto]);

  const cerrar = () => {
    setAbierto(false);
    dado.current?.focus();
  };

  const tirarAtaque = () =>
    tirar.mutate(
      {
        attackKey: ataque.key,
        input: {
          part: "ATTACK",
          mode: modoAtaque,
          versatile: false,
          critical: false,
          audience: "PUBLIC",
        },
      },
      {
        onSuccess: (r) => {
          setErrorAtaque(null);
          setResultadoAtaque(r);
        },
        onError: (err) => {
          setResultadoAtaque(null);
          setErrorAtaque((err as Error).message);
        },
      },
    );

  const tirarDano = () =>
    tirar.mutate(
      {
        attackKey: ataque.key,
        input: {
          part: "DAMAGE",
          mode: "NORMAL",
          versatile: dosManos,
          critical: critico,
          audience: "PUBLIC",
        },
      },
      {
        onSuccess: (r) => {
          setErrorDano(null);
          setResultadoDano(r);
        },
        onError: (err) => {
          setResultadoDano(null);
          setErrorDano((err as Error).message);
        },
      },
    );

  return (
    <span className="relative inline-flex shrink-0">
      <button
        ref={dado}
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-label={`Tirada de ${ataque.name}`}
        title={`Tirar con ${ataque.name}`}
        className="rounded-radius-sm p-0.5 text-chrome-sm text-accent-text hover:bg-[color:var(--accent-tint)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
      >
        <DadoDibujado />
      </button>

      {abierto && (
        <div
          ref={caja}
          tabIndex={-1}
          role="group"
          aria-label={`Tirada de ${ataque.name}`}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              cerrar();
            }
          }}
          className="absolute right-0 top-[calc(100%+0.25rem)] z-30 w-[21rem] max-w-[calc(100vw-2rem)] rounded-radius-md border border-accent bg-surface p-s3 text-left shadow-[0_18px_40px_-24px_var(--sheet-shadow)]"
        >
          <div className="mb-s2 flex items-baseline justify-between gap-s2">
            <p className="font-chrome text-chrome-sm font-semibold text-text">{ataque.name}</p>
            <Button type="button" variant="ghost" onClick={cerrar}>
              Cerrar
            </Button>
          </div>

          <section aria-label={`Ataque con ${ataque.name}`} className="mb-s3">
            <p className={`mb-1 ${ROTULO_DE_CASILLA}`}>Ataque</p>
            <SelectorDeVentaja
              value={modoAtaque}
              onChange={setModoAtaque}
              etiqueta={`ataque con ${ataque.name}`}
              disabled={tirar.isPending}
            />
            <div className="mt-s2">
              <Button
                type="button"
                variant="primary"
                onClick={tirarAtaque}
                disabled={tirar.isPending}
                aria-label={`Tirar ataque con ${ataque.name}`}
              >
                Tirar ataque
              </Button>
            </div>
            {errorAtaque && (
              <p role="alert" className="mt-s2 font-chrome text-chrome-xs text-danger-text">
                {errorAtaque}
              </p>
            )}
            {resultadoAtaque && (
              <div className="mt-s2">
                {resultadoAtaque.revealed ? (
                  <ResultadoDeTirada
                    resultado={resultadoAtaque}
                    etiqueta={`Ataque con ${ataque.name}`}
                    derivado={ataque.attackBonus}
                  />
                ) : (
                  <TiradaACiegas
                    etiqueta={`Ataque con ${ataque.name}`}
                    expresion={resultadoAtaque.expression}
                  />
                )}
              </div>
            )}
          </section>

          <section aria-label={`Daño de ${ataque.name}`} className="border-t border-muted pt-s2">
            <p className={`mb-1 ${ROTULO_DE_CASILLA}`}>Daño</p>

            {/* **Las dos manos, como radios con su explicación** (regla vinculante de interfaz):
                un arma versátil ofrece las dos, no un desplegable ni un checkbox que se adivina. */}
            {ataque.versatileDamage && (
              <fieldset className="mb-s2" disabled={tirar.isPending}>
                <legend className="sr-only">Con cuántas manos empuñas {ataque.name}</legend>
                <div className="flex flex-col gap-1">
                  {(
                    [
                      { manos: false, texto: "Una mano", dado: ataque.damage.dice },
                      { manos: true, texto: "A dos manos", dado: ataque.versatileDamage.dice },
                    ] as const
                  ).map((opcion) => {
                    const id = `${grupoMano}-${opcion.manos ? "dos" : "una"}`;
                    return (
                      <div
                        key={id}
                        className={[
                          "flex items-baseline gap-s2 rounded-radius-sm border px-s2 py-1",
                          dosManos === opcion.manos
                            ? "border-accent bg-[color:var(--accent-tint)]"
                            : "border-muted",
                        ].join(" ")}
                      >
                        <input
                          id={id}
                          type="radio"
                          name={grupoMano}
                          checked={dosManos === opcion.manos}
                          onChange={() => setDosManos(opcion.manos)}
                          className="accent-[var(--accent)]"
                        />
                        <label
                          htmlFor={id}
                          className="cursor-pointer font-chrome text-chrome-sm text-text"
                        >
                          {opcion.texto}
                        </label>
                        <span className="font-data text-chrome-xs text-muted">{opcion.dado}</span>
                      </div>
                    );
                  })}
                </div>
              </fieldset>
            )}

            <label className="flex items-center gap-s2 font-chrome text-chrome-sm text-text">
              <input
                type="checkbox"
                checked={critico}
                disabled={tirar.isPending}
                onChange={() => setCritico((v) => !v)}
                className="accent-[var(--accent)]"
              />
              Crítico
            </label>
            <p className={`mt-1 ${PROSA_DE_HOJA}`}>
              Duplica los dados de daño; el modificador no cambia.
            </p>

            <div className="mt-s2">
              <Button
                type="button"
                variant="primary"
                onClick={tirarDano}
                disabled={tirar.isPending}
                aria-label={`Tirar daño de ${ataque.name}`}
              >
                Tirar daño
              </Button>
            </div>
            {errorDano && (
              <p role="alert" className="mt-s2 font-chrome text-chrome-xs text-danger-text">
                {errorDano}
              </p>
            )}
            {resultadoDano && (
              <div className="mt-s2">
                {resultadoDano.revealed ? (
                  <ResultadoDeTirada
                    resultado={resultadoDano}
                    etiqueta={`Daño de ${ataque.name}`}
                  />
                ) : (
                  <TiradaACiegas
                    etiqueta={`Daño de ${ataque.name}`}
                    expresion={resultadoDano.expression}
                  />
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </span>
  );
}
