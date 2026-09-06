import { useEffect, useId, useRef, useState } from "react";
import type { AttackVerdict, RollMode, RollResult } from "@dnd/shared";
import type { AttackDto } from "./api";
import { useCombatientesDelEncuentro, useResolveAttack, useRollAttack } from "./hooks";
import { DadoDibujado } from "../rolls/DadoDibujado";
import { SelectorDeVentaja } from "../rolls/SelectorDeVentaja";
import { GastarInspiracion } from "../rolls/panel/GastarInspiracion";
import { ResultadoDeTirada } from "../rolls/ResultadoDeTirada";
import { TiradaACiegas } from "../rolls/TiradaACiegas";
import { Button } from "../../ui/Button";
import { PROSA_DE_HOJA, ROTULO_DE_CASILLA } from "./Tarjeta";
import { NOMBRE_VEREDICTO } from "./vocabulario";
import { NOMBRE_BANDO } from "../../dominio/combate";

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
// `versatile` y, desde el 2026-09-05, el `attackRollEventId` de la tirada que se cobra — **nunca
// un `critical` declarado a mano**. Un cliente que montara la expresión podría decir que ataca con una
// daga y tirar `1d12`.
//
// **El daño no tiene ventaja.** El servidor ignora `mode` para `part: "DAMAGE"` — la ventaja es
// del d20, no de los dados de daño —, así que aquí no se le ofrece el selector de tres estados:
// ofrecerlo mentiría sobre lo que hace.
//
// **Tarea 13 (2026-09-05, iniciativa y bando) — atacar sirve de algo.** Hasta hoy el botón de
// ataque tiraba el dado y nada más, aunque el servidor ya sabía resolver el ataque contra un
// objetivo desde 2.5.3 (`POST .../sheet/attacks/:attackKey/resolve`): el mismo cierre a medias
// que este proyecto ya había declarado cuatro veces. Con un encuentro `ACTIVE`, el botón «Atacar»
// abre la lista de combatientes en vez de tirar directamente; sin combate, sigue igual que
// siempre. La lista propone primero el bando contrario, pero el servidor **no impide** apuntar a
// cualquiera — el mismo criterio que este proyecto ya aplicó al bando en sí.

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
  const resolver = useResolveAttack(campaignId, characterId);
  // Tarea 13 — **los objetivos salen del encuentro en marcha, nunca de `useCharacters`**: esa
  // lista es «quién se sienta a la mesa» y un PNJ, el objetivo natural de un ataque, no sale
  // nunca en ella. Ver el comentario de `useCombatientesDelEncuentro` en `hooks.ts`.
  const { combatientes, enCombate } = useCombatientesDelEncuentro(campaignId, characterId);
  const [abierto, setAbierto] = useState(false);
  const [objetivoAbierto, setObjetivoAbierto] = useState(false);
  const [modoAtaque, setModoAtaque] = useState<RollMode>("NORMAL");
  const [dosManos, setDosManos] = useState(false);
  const [resultadoAtaque, setResultadoAtaque] = useState<RollResult | null>(null);
  const [resultadoDano, setResultadoDano] = useState<RollResult | null>(null);
  const [veredicto, setVeredicto] = useState<AttackVerdict | null>(null);
  const [errorAtaque, setErrorAtaque] = useState<string | null>(null);
  const [errorDano, setErrorDano] = useState<string | null>(null);
  /**
   * **El crítico ya no lo declara nadie: sale de la tirada de ataque de este mismo panel.**
   *
   * Había aquí una casilla «Crítico» que el jugador marcaba a mano, y el servidor se la creía. Con
   * `attackRollEventId` (ficha C2.5-2) la duplicación de dados **cuelga de una tirada real**: el
   * servidor lee el `natural` que quedó escrito en ese suceso, del mismo personaje, la misma
   * campaña y **el mismo ataque**. Aquí solo se enseña lo que ya pasó.
   */
  // `RollResult` es una unión sobre `revealed`: una tirada a ciegas no trae `natural`, y ahí no se
  // puede afirmar nada — decir «no fue crítico» sería tan falso como decir que sí.
  const criticoDeLaTirada =
    resultadoAtaque?.revealed === true && resultadoAtaque.natural === "TWENTY";
  const dado = useRef<HTMLButtonElement>(null);
  const caja = useRef<HTMLDivElement>(null);
  const grupoMano = useId();
  const [gastarInspiracion, setGastarInspiracion] = useState(false);

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
          // I8: el ataque es una de las TRES tiradas del SRD en las que se gasta la inspiración,
          // y el servidor gasta y tira en la misma transacción.
          spendInspiration: gastarInspiracion && modoAtaque !== "DISADVANTAGE",
          versatile: false,
          audience: "PUBLIC",
        },
      },
      {
        onSuccess: (r) => {
          setErrorAtaque(null);
          setVeredicto(null);
          setResultadoAtaque(r);
        },
        onError: (err) => {
          setResultadoAtaque(null);
          setVeredicto(null);
          setErrorAtaque((err as Error).message);
        },
      },
    );

  /**
   * Tarea 13 — el mismo ataque, pero **contra un objetivo**: el servidor tira y compara con su CA,
   * y aquí solo se enseña el veredicto que devuelve (`docs`: la CA nunca viaja, ni aquí ni en el
   * suceso).
   */
  const atacarObjetivo = (targetCharacterId: string) => {
    setObjetivoAbierto(false);
    resolver.mutate(
      {
        attackKey: ataque.key,
        input: {
          targetCharacterId,
          mode: modoAtaque,
          spendInspiration: gastarInspiracion && modoAtaque !== "DISADVANTAGE",
          audience: "PUBLIC",
        },
      },
      {
        onSuccess: (r) => {
          setErrorAtaque(null);
          setResultadoAtaque(r.roll);
          setVeredicto(r.verdict ?? null);
        },
        onError: (err) => {
          setResultadoAtaque(null);
          setVeredicto(null);
          setErrorAtaque((err as Error).message);
        },
      },
    );
  };

  /**
   * **Con combate en marcha, el botón abre la lista de objetivos; sin combate, tira sin más.**
   * Es la misma decisión que ya tomó la tarea: elegir a quién apuntar solo tiene sentido cuando
   * hay un encuentro que sepa quién más está en la mesa.
   */
  const alPulsarAtacar = () => {
    if (enCombate && combatientes.length > 0) {
      setObjetivoAbierto((v) => !v);
    } else {
      tirarAtaque();
    }
  };

  const tirarDano = () =>
    tirar.mutate(
      {
        attackKey: ataque.key,
        input: {
          part: "DAMAGE",
          mode: "NORMAL",
          // **En el daño no.** El SRD la gasta en ataque, salvación o prueba, y el daño no es
          // ninguna; el esquema compartido lo rechaza si alguien lo intenta.
          spendInspiration: false,
          versatile: dosManos,
          // **La tirada que se está cobrando.** Sin ella el servidor no duplica nada: el crítico
          // dejó de ser algo que el cuerpo de la petición pueda declarar. Y la base tiene un
          // índice único sobre este campo, así que **el mismo ataque no se cobra dos veces**.
          ...(resultadoAtaque?.eventId ? { attackRollEventId: resultadoAtaque.eventId } : {}),
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
            <GastarInspiracion
              campaignId={campaignId}
              characterId={characterId}
              modo={modoAtaque}
              value={gastarInspiracion}
              onChange={setGastarInspiracion}
              disabled={tirar.isPending}
            />
            <div className="mt-s2">
              <Button
                type="button"
                variant="primary"
                onClick={alPulsarAtacar}
                disabled={tirar.isPending || resolver.isPending}
                aria-expanded={enCombate && combatientes.length > 0 ? objetivoAbierto : undefined}
                aria-label={`Atacar con ${ataque.name}`}
              >
                Atacar
              </Button>
            </div>

            {/* **Con combate en marcha, elegir objetivo — se propone primero el bando
                contrario, pero cualquiera de la lista se puede pulsar.** El servidor no impide
                atacar a un aliado (confusión, un hechizo que domina, una traición): esta lista
                solo ordena, nunca cierra una opción. */}
            {objetivoAbierto && (
              <ul
                role="listbox"
                aria-label={`Objetivo del ataque con ${ataque.name}`}
                className="mt-s2 flex flex-col gap-1 rounded-radius-sm border border-muted p-1"
              >
                {combatientes.map((c) => (
                  <li key={c.characterId}>
                    <button
                      type="button"
                      role="option"
                      aria-selected="false"
                      onClick={() => atacarObjetivo(c.characterId)}
                      disabled={resolver.isPending}
                      className="flex w-full items-baseline justify-between gap-s2 rounded-radius-sm px-s2 py-1 text-left font-chrome text-chrome-sm text-text hover:bg-[color:var(--accent-tint)] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <span>{c.nombre}</span>
                      <span className="text-chrome-xs text-muted">{NOMBRE_BANDO[c.side]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {errorAtaque && (
              <p role="alert" className="mt-s2 font-chrome text-chrome-xs text-danger-text">
                {errorAtaque}
              </p>
            )}
            {resultadoAtaque && (
              <div className="mt-s2">
                {resultadoAtaque.revealed ? (
                  <>
                    <ResultadoDeTirada
                      resultado={resultadoAtaque}
                      etiqueta={`Ataque con ${ataque.name}`}
                      derivado={ataque.attackBonus}
                    />
                    {veredicto && (
                      <p
                        className={`mt-1 font-chrome text-chrome-sm font-semibold ${
                          veredicto === "MISS" ? "text-muted" : "text-accent-text"
                        }`}
                      >
                        {NOMBRE_VEREDICTO[veredicto]}
                      </p>
                    )}
                  </>
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

            {/* **El crítico se enseña, no se elige.** Era una casilla que el jugador marcaba a
                mano y el servidor se creía; ahora sale del `natural` de la tirada de ataque de
                arriba, leído en el servidor sobre el suceso que esa tirada dejó escrito. */}
            <p className={`mt-1 ${PROSA_DE_HOJA}`}>
              {resultadoAtaque === null
                ? "Tira primero el ataque: el daño se cobra sobre esa tirada, y de ella sale si fue crítico."
                : criticoDeLaTirada
                  ? "Fue un 20 natural: el daño duplicará los dados. El modificador no cambia."
                  : "No fue un 20 natural, así que el daño va sin duplicar."}
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
