import { useId, useRef, useState } from "react";
import {
  loVeLaMesa,
  type AttackVerdict,
  type RollAudience,
  type RollMode,
  type RollResult,
} from "@dnd/shared";
import type { AttackDto } from "./api";
import { useCombatientesDelEncuentro, useResolveAttack, useRollAttack } from "./hooks";
import { DadoDibujado } from "../rolls/DadoDibujado";
import { SelectorDeVentaja } from "../rolls/SelectorDeVentaja";
import { SelectorDeAudiencia } from "../rolls/SelectorDeAudiencia";
import { GastarInspiracion } from "../rolls/panel/GastarInspiracion";
import { ResultadoDeTirada } from "../rolls/ResultadoDeTirada";
import { TiradaACiegas } from "../rolls/TiradaACiegas";
import { Button } from "../../ui/Button";
import { PanelFlotante } from "../../ui/PanelFlotante";
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
//
// **Ronda de arreglo 1 (2026-09-06)** cerró un crítico (la carrera de carga podía disparar la
// tirada suelta sin objetivo mientras el encuentro todavía no se conocía — ver `cargando` en
// `useCombatientesDelEncuentro`), corrigió el orden de la lista (el bando contrario es el de
// QUIEN ATACA, no una tabla fija) y dejó el veredicto del servidor como única fuente del crítico
// cuando lo hay.

export function TirarAtaqueBoton({
  campaignId,
  characterId,
  ataque,
  visibilidadDelPersonaje,
}: {
  campaignId: string;
  characterId: string;
  ataque: AttackDto;
  /** Ver `loVeLaMesa` (`@dnd/shared`): siembra el valor inicial del selector de audiencia. */
  visibilidadDelPersonaje: string;
}) {
  const tirar = useRollAttack(campaignId, characterId);
  const resolver = useResolveAttack(campaignId, characterId);
  // Tarea 13 — **los objetivos salen del encuentro en marcha, nunca de `useCharacters`**: esa
  // lista es «quién se sienta a la mesa» y un PNJ, el objetivo natural de un ataque, no sale
  // nunca en ella. Ver el comentario de `useCombatientesDelEncuentro` en `hooks.ts`.
  const {
    combatientes,
    enCombate,
    // **I-2, ronda de arreglo 1.** Mientras esto es `true`, `enCombate` todavía no distingue «no
    // hay combate» de «no se sabe todavía»: el botón se desactiva hasta saberlo, para no caer en
    // la tirada suelta por una carrera de carga.
    cargando,
  } = useCombatientesDelEncuentro(campaignId, characterId);
  const [abierto, setAbierto] = useState(false);
  const [objetivoAbierto, setObjetivoAbierto] = useState(false);
  const [modoAtaque, setModoAtaque] = useState<RollMode>("NORMAL");
  // Task 26 (I10) — **la misma decisión que ya tiene el panel de dados general** (`PanelDeDados`,
  // `SelectorDeAudiencia`), que este botón no ofrecía: las tres tiradas de aquí mandaban
  // `audience: "PUBLIC"` fijo. El servidor ya deriva una audiencia por defecto sensata de la
  // visibilidad del personaje (`character-sheet.service.ts`, `audienciaPorDefecto`), pero un DM
  // que quiere ocultar un ataque puntual —el suyo, o el de un PNJ que sí es público— no tenía
  // cómo pedirlo desde aquí.
  //
  // **Ronda de arreglo 1 — el valor inicial ya no es `"PUBLIC"` a secas.** Sembrarlo así
  // contradecía en pantalla, desde el primer render, la audiencia que el servidor iba a usar de
  // verdad si nadie tocaba el selector: un PNJ `DM_ONLY` enseñaba «Pública» marcada mientras el
  // servidor, sin audiencia explícita, iba a tirar en `DM_PRIVATE`. `useState(() => …)` —función,
  // no valor— para no recalcular `loVeLaMesa` en cada render sin necesidad.
  const [audiencia, setAudiencia] = useState<RollAudience>(() =>
    loVeLaMesa(visibilidadDelPersonaje) ? "PUBLIC" : "DM_PRIVATE",
  );
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
  //
  // **Solo para el camino SIN objetivo** (`tirarAtaque`, que nunca trae veredicto). Con
  // objetivo, el servidor ya manda `verdict: "CRITICAL"` en la misma respuesta —ver
  // `criticoMostrado`, más abajo— y recalcularlo aquí es la misma regla escrita dos veces: el
  // día que exista otra vía de crítico (rango ampliado de pícaro o campeón) que no sea un 20
  // natural, esta cuenta discreparía del veredicto en el mismo panel (I-3, ronda de arreglo 1).
  const criticoDeLaTirada =
    resultadoAtaque?.revealed === true && resultadoAtaque.natural === "TWENTY";
  /** Lo que de verdad se enseña: el veredicto del servidor si lo hay, la cuenta local si no. */
  const criticoMostrado = veredicto ? veredicto === "CRITICAL" : criticoDeLaTirada;
  const dado = useRef<HTMLButtonElement>(null);
  const grupoMano = useId();
  const idBase = useId();
  const idCargando = `${idBase}-cargando`;
  const idEnviando = `${idBase}-enviando`;
  const [gastarInspiracion, setGastarInspiracion] = useState(false);

  const cerrar = () => {
    setAbierto(false);
    // Menor, ronda de arreglo 1: sin esto, la lista de objetivos quedaba abierta en el estado y
    // reaparecía ya desplegada —con su `aria-expanded` heredado— la próxima vez que se abriera
    // el panel, aunque nadie hubiera vuelto a pulsar «Atacar». El foco al disparador ya lo
    // devuelve `PanelFlotante` al cerrarse.
    setObjetivoAbierto(false);
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
          audience: audiencia,
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
          audience: audiencia,
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
   *
   * **Mientras `cargando` sea `true`, el botón está desactivado** (más abajo) y esto no debería
   * poder dispararse — se deja la comprobación aquí también, por si acaso, para que la carrera de
   * carga (I-2) no pueda colarse por un camino que no sea el `disabled`.
   */
  const alPulsarAtacar = () => {
    if (cargando) return;
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
          audience: audiencia,
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
    <span className="inline-flex shrink-0">
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

      <PanelFlotante
        abierto={abierto}
        disparador={dado}
        onCerrar={cerrar}
        // Menor, ronda de arreglo 1: con la lista de objetivos abierta, Escape la cierra a ELLA
        // — un cierre a la vez, como cualquier menú anidado — y solo cierra el panel entero en
        // la segunda pulsación, cuando ya no hay nada más pequeño que cerrar.
        onEscape={() => (objetivoAbierto ? setObjetivoAbierto(false) : cerrar())}
        etiqueta={`Tirada de ${ataque.name}`}
        ancho="w-[21rem] max-w-[calc(100vw-2rem)]"
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
          {/* Task 26 — la misma audiencia para el ataque, el objetivo resuelto y el daño: es
                un solo gesto de mesa (ocultar ESTE golpe), no tres decisiones sueltas. */}
          <div className="mt-s2">
            <SelectorDeAudiencia
              value={audiencia}
              onChange={setAudiencia}
              disabled={tirar.isPending || resolver.isPending}
            />
          </div>
          <div className="mt-s2">
            <Button
              type="button"
              variant="primary"
              onClick={alPulsarAtacar}
              disabled={tirar.isPending || resolver.isPending || cargando}
              aria-expanded={enCombate && combatientes.length > 0 ? objetivoAbierto : undefined}
              aria-label={`Atacar con ${ataque.name}`}
              aria-describedby={
                [
                  cargando ? idCargando : null,
                  tirar.isPending || resolver.isPending ? idEnviando : null,
                ]
                  .filter((x): x is string => x !== null)
                  .join(" ") || undefined
              }
            >
              Atacar
            </Button>
            {/* **El botón que se apaga dice su motivo, asociado** (regla vinculante de
                  interfaz) — no un botón mudo mientras la carrera de carga (I-2) todavía no sabe
                  si hay combate. */}
            <span id={idCargando} className="sr-only">
              Comprobando si hay combate en marcha.
            </span>
            <span id={idEnviando} className="sr-only">
              Enviando la tirada.
            </span>
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
                // `role="presentation"` — el `<li>` no es un hijo ARIA válido de `listbox`; el
                // hijo válido es el `option` de dentro, y esto lo saca de en medio sin cambiar
                // el marcado semántico HTML (menor, ronda de arreglo 1).
                <li key={c.characterId} role="presentation">
                  {/* `Button` y no un `<button>` a mano: **aria-disabled, no `disabled`**
                        (ficha U9, `ui/Button.tsx`) — un botón desactivado sale del recorrido de
                        teclado con el atributo nativo, y esto es exactamente el mismo apagado
                        temporal que ya usa «Atacar» mientras vuela la mutación. */}
                  <Button
                    type="button"
                    variant="ghost"
                    role="option"
                    aria-selected="false"
                    onClick={() => atacarObjetivo(c.characterId)}
                    disabled={resolver.isPending}
                    aria-describedby={resolver.isPending ? idEnviando : undefined}
                    className="!flex w-full items-baseline justify-between gap-s2 text-left font-normal hover:bg-[color:var(--accent-tint)]"
                  >
                    <span>{c.nombre}</span>
                    <span className="text-chrome-xs text-muted">{NOMBRE_BANDO[c.side]}</span>
                  </Button>
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
          {/* La audiencia no se elige dos veces: es la misma decisión de arriba, en
                «Ataque», y este texto lo dice donde se lee el daño — no solo en un comentario
                que nadie ve en pantalla. */}
          <p className={`mb-s2 ${PROSA_DE_HOJA}`}>
            Se publica con la misma audiencia que el ataque, elegida arriba.
          </p>

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
              : veredicto
                ? // Con objetivo, lo dice el veredicto del servidor — no un 20 natural recalculado
                  // aquí, que un día podría discrepar (I-3, ronda de arreglo 1).
                  criticoMostrado
                  ? "El servidor dice que fue crítico: el daño duplicará los dados. El modificador no cambia."
                  : "El servidor dice que no fue crítico, así que el daño va sin duplicar."
                : criticoMostrado
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
                <ResultadoDeTirada resultado={resultadoDano} etiqueta={`Daño de ${ataque.name}`} />
              ) : (
                <TiradaACiegas
                  etiqueta={`Daño de ${ataque.name}`}
                  expresion={resultadoDano.expression}
                />
              )}
            </div>
          )}
        </section>
      </PanelFlotante>
    </span>
  );
}
