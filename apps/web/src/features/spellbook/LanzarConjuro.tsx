import { useRef, useState } from "react";
import type { SpellbookEntry, SpellbookResponse } from "@dnd/shared";
import { NOMBRE_NIVEL_CONJURO } from "../../dominio/conjuros";
import { NOMBRE_VEREDICTO } from "../character-sheet/vocabulario";
import { useCharacters } from "../characters/hooks";
import { useNpcs } from "../bestiario/hooks";
import { useCombatientesDelEncuentro, useUsarActividad } from "../character-sheet/hooks";
import { useInventory } from "../inventory/hooks";
import { Button } from "../../ui/Button";
import { GrupoDeRadios } from "../../ui/GrupoDeRadios";
import { PanelFlotante } from "../../ui/PanelFlotante";

// Tarea 7 de 3A.2 («elegir, lanzar y usar») — el botón «Lanzar» de la pestaña Conjuros. Ocupa el
// hueco `accionPrincipal` que la Task 6 dejó en `FilaDeConjuro.tsx`.
//
// **Tres decisiones que la actividad ya trae resueltas, y esta pantalla solo lee** (nunca las
// vuelve a decidir): `entrada.objetivos` («ninguno»/«uno»/«varios», de `objetivosDe`, según la
// mecánica del conjuro), `entrada.escalaPorEspacio` y `espacios` (de `useSpellbook`). Un truco
// (nivel 0) nunca gasta espacio — el SRD no lo pide — así que el selector de espacio solo puede
// aparecer con `entrada.level >= 1`.
//
// **`objetivos: "uno"` dispara al elegir** (un solo clic elige Y lanza — la lista es de botones,
// no de casillas); **`"varios"` pide marcar y pulsar «Lanzar sobre N»** — son dos mecánicas
// reales distintas del SRD (Descarga de fuego apunta a UNO; Proyectil mágico reparte sus dardos
// entre varios), no una preferencia de esta pantalla.
//
// **Fuera de combate, la lista de objetivos no es `useCombatientesDelEncuentro`** (que sin
// encuentro `ACTIVE` siempre devuelve `[]` — ver su comentario en `character-sheet/hooks.ts`):
// aquí sí hace falta poder lanzar «Escudo» sobre un aliado en plena conversación, así que fuera de
// combate la lista sale de `useCharacters` + `useNpcs` (los PNJ que este jugador ve — el servidor
// ya filtra por `canView`), más uno mismo (Ruling, ver el informe).
//
// **Y «Tú mismo» también en combate, salvo para un `ataque`** (ola de arreglos, web I-2).
// `useCombatientesDelEncuentro` excluye al propio personaje porque nació para los ataques con
// arma, donde el servidor rechaza atacarse con un 400; para `dados`, `salvacion` y `utilidad` el
// servidor acepta al propio actor (D-CF-128: la curación y el daño a uno mismo siguen directos),
// y una clériga lanzándose «Curar heridas» en pleno combate es el uso más frecuente de la
// mecánica. Un `ataque` sigue sin ofrecerlo, dentro y fuera de combate: sería el botón que el
// servidor rechaza.

export interface AudienciaDeLanzamiento {
  id: string;
  nombre: string;
}

/**
 * Fix round 3 — **sin `escalaPorEspacio`, TODAS las opciones dicen «igual que a nivel N»,
 * incluida la propia.** La primera versión saltaba esa frase para `nivel === entrada.level`
 * («quedan X» a secas) razonando que un conjuro «igual a sí mismo» no dice nada — pero eso
 * confundía «esta opción no cambia nada» (cierto para CUALQUIER nivel de un conjuro que no
 * escala, el propio incluido) con «esta opción es el valor por defecto». El orquestador pidió el
 * texto uniforme; con él, la fila entera de opciones se lee de corrido sin tener que adivinar por
 * qué la primera calla lo que las demás sí dicen.
 */
function fraseDeEspacio(entrada: SpellbookEntry, nivel: number, actual: number): string {
  const cantidad = `(quedan ${actual})`;
  if (!entrada.escalaPorEspacio) return `igual que a nivel ${entrada.level} ${cantidad}`;
  if (nivel === entrada.level) return cantidad;
  return `escala con el espacio ${cantidad}`;
}

export function LanzarConjuro({
  campaignId,
  characterId,
  entrada,
  espacios,
}: {
  campaignId: string;
  characterId: string;
  entrada: SpellbookEntry;
  espacios: SpellbookResponse["espacios"];
}) {
  const usar = useUsarActividad(campaignId, characterId);
  const combate = useCombatientesDelEncuentro(campaignId, characterId);
  // Fuera de combate hacen falta los nombres de todo el mundo; en combate ya los trae
  // `combate.combatientes`, así que estas dos consultas solo se usan en esa rama — pero pedirlas
  // siempre es barato (React Query comparte la consulta por clave con quien ya la tenga abierta,
  // el mismo razonamiento que documenta `useCombatientesDelEncuentro`) y así el hueco no depende
  // de un `enabled` que tuviera que adivinar si hay combate ANTES de saberlo.
  const personajesQ = useCharacters(campaignId);
  const npcsQ = useNpcs(campaignId);
  // T15 (3A.2) — un encantamiento (`entrada.encanta`) no apunta a una criatura: apunta a un
  // arma del inventario. **Solo las del propio personaje** (Ruling, ver el informe): no hay hoy
  // un hook que traiga el inventario de un aliado sin pedirlo personaje por personaje, y montar
  // ese hueco es más que "sin esfuerzo" — queda como límite conocido, no como un selector que
  // finge ofrecer más de lo que ofrece.
  const inventarioQ = useInventory(campaignId, characterId);
  const armasEquipadas = (inventarioQ.data?.items ?? []).filter(
    (fila) => fila.location === "EQUIPPED" && fila.item.weapon !== undefined,
  );

  const [abierto, setAbierto] = useState(false);
  const [objetivosVarios, setObjetivosVarios] = useState<ReadonlySet<string>>(new Set());
  const disparador = useRef<HTMLButtonElement>(null);

  const nivelesDisponibles = espacios
    .filter((e) => e.nivel >= entrada.level && e.actual > 0)
    .sort((a, b) => a.nivel - b.nivel);
  // **El selector aparece por haber un espacio superior con usos, nunca por `escalaPorEspacio`.**
  // Elegir un espacio mayor sin escalado sigue siendo legal y a veces necesario (sin espacios de
  // nivel 1, se lanza con uno de nivel 2) — `escalaPorEspacio` solo decide QUÉ DICE cada opción
  // (`fraseDeEspacio`), nunca si el grupo se pinta. Fix round 3, D-CF (Proyectil mágico): el
  // conversor del catálogo no captura «un dardo más por nivel», así que `escalaPorEspacio` es
  // `false` para un conjuro que en el SRD sí escala — un motivo más para no usarlo aquí como
  // condición de visibilidad, solo como condición de texto.
  const mostrarSelectorDeEspacio =
    entrada.level >= 1 && espacios.some((e) => e.nivel > entrada.level && e.actual > 0);
  // **El nivel efectivo se deriva en cada render, no se guarda una vez** (ola de arreglos, web
  // I-1). `nivelDeEspacio` solo recuerda lo que el jugador ELIGIÓ; si ese nivel ya no tiene usos
  // (gastó el último, o nunca los tuvo), manda el propio del conjuro si le quedan y, si no, el
  // primero por encima que sí tenga. Sin esto, con la fila sin desmontar (`key={entrada.key}`),
  // agotar el nivel 1 dejaba un radio sin marcar y «Lanzar» mandaba `nivelDeEspacio: 1` →
  // SIN_ESPACIO. Es el patrón «derivar durante el render» de React (nada de `useEffect`), el
  // mismo que `TiraDeIniciativa` usa para reiniciar su aviso.
  const [nivelDeEspacio, setNivelDeEspacio] = useState<number | null>(null);
  const nivelEfectivo =
    nivelDeEspacio !== null && nivelesDisponibles.some((n) => n.nivel === nivelDeEspacio)
      ? nivelDeEspacio
      : (nivelesDisponibles.find((n) => n.nivel === entrada.level)?.nivel ??
        nivelesDisponibles[0]?.nivel ??
        entrada.level);
  // El propio agotado se ENSEÑA, marcado como agotado y no elegible («un valor guardado que un
  // selector no ofrece se muestra marcado y no seleccionable», 04-convenciones): así se lee por
  // qué la opción marcada es otra.
  const propioAgotado = espacios.find((e) => e.nivel === entrada.level && e.actual === 0);
  const opcionesDeEspacio = Object.fromEntries([
    ...(propioAgotado
      ? [
          [
            String(propioAgotado.nivel),
            {
              etiqueta: NOMBRE_NIVEL_CONJURO(propioAgotado.nivel),
              frase: "no quedan",
              deshabilitada: true,
            },
          ],
        ]
      : []),
    ...nivelesDisponibles.map((n) => [
      String(n.nivel),
      {
        etiqueta: NOMBRE_NIVEL_CONJURO(n.nivel),
        frase: fraseDeEspacio(entrada, n.nivel, n.actual),
      },
    ]),
  ]) as Record<string, { etiqueta: string; frase: string; deshabilitada?: boolean }>;

  const necesitaObjetivo = entrada.objetivos !== "ninguno";
  // T15 (3A.2) — un encantamiento siempre necesita el panel: hay que elegir el arma, aunque no
  // haya selector de espacio (`entrada.objetivos` es "ninguno" para el `utilidad` sintético).
  const necesitaPanel = necesitaObjetivo || mostrarSelectorDeEspacio || entrada.encanta;

  const puedeApuntarseASiMismo = entrada.mecanica !== "ataque";
  const unoMismo: AudienciaDeLanzamiento[] = puedeApuntarseASiMismo
    ? [{ id: characterId, nombre: "Tú mismo" }]
    : [];
  const objetivosDisponibles: AudienciaDeLanzamiento[] = combate.enCombate
    ? [...unoMismo, ...combate.combatientes.map((c) => ({ id: c.characterId, nombre: c.nombre }))]
    : [
        ...unoMismo,
        ...(personajesQ.data ?? [])
          .filter((p) => p.id !== characterId)
          .map((p) => ({ id: p.id, nombre: p.name })),
        ...(npcsQ.data ?? []).map((n) => ({ id: n.id, nombre: n.name })),
      ];

  const cerrar = () => {
    setAbierto(false);
    setObjetivosVarios(new Set());
  };

  const lanzar = (objetivos?: string[], itemId?: string) => {
    // Las invalidaciones (libro/espacios, hilo, inventario si `itemId`) viven en
    // `useUsarActividad` (fix round 3 de la ola): un `onSuccess` pasado a `mutate` no corre si
    // el componente ya no está montado cuando llega la respuesta.
    usar.mutate({
      activityKey: `spell:${entrada.key}`,
      input: {
        ...(objetivos && objetivos.length > 0 ? { objetivos } : {}),
        ...(itemId ? { itemId } : {}),
        ...(mostrarSelectorDeEspacio ? { nivelDeEspacio: nivelEfectivo } : {}),
      },
    });
    cerrar();
  };

  const alPulsarLanzar = () => {
    if (!necesitaPanel) {
      lanzar();
      return;
    }
    setAbierto((v) => !v);
  };

  const alternarObjetivo = (id: string) => {
    setObjetivosVarios((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });
  };

  // **El nivel de espacio que de verdad se usó**, para el mensaje de «sin espacio» — no el
  // `nivelDeEspacio` del estado actual, que puede haber cambiado (o desaparecido, si el panel se
  // cerró) entre que se mandó la petición y que llegó la respuesta.
  const nivelUsado = (usar.variables?.input?.nivelDeEspacio as number | undefined) ?? entrada.level;
  const sinEspacio = usar.data?.fueraDeRegla?.includes("SIN_ESPACIO");
  const sinPreparar = usar.data?.fueraDeRegla?.includes("NO_PREPARADO");

  return (
    <span className="inline-flex shrink-0 flex-col items-end gap-1">
      <span className="inline-flex shrink-0">
        <Button
          ref={disparador}
          type="button"
          variant="primary"
          disabled={usar.isPending}
          aria-expanded={necesitaPanel ? abierto : undefined}
          aria-label={`Lanzar ${entrada.nameEs}`}
          onClick={alPulsarLanzar}
        >
          Lanzar
        </Button>

        {necesitaPanel && (
          <PanelFlotante
            abierto={abierto}
            disparador={disparador}
            onCerrar={cerrar}
            etiqueta={`Lanzar ${entrada.nameEs}`}
          >
            <p className="mb-s2 font-chrome text-chrome-sm font-semibold text-text">
              {entrada.nameEs}
            </p>

            {/* Ola de arreglos (web I-4): `ui/GrupoDeRadios`, no una cuarta copia del mismo DOM
                — PE-1 lo subió a `ui/` para acabar con tres. */}
            {mostrarSelectorDeEspacio && (
              <GrupoDeRadios
                legend="¿Con qué espacio?"
                name={`nivel-de-espacio-${entrada.key}`}
                opciones={opcionesDeEspacio}
                valor={String(nivelEfectivo)}
                onChange={(v) => setNivelDeEspacio(Number(v))}
                className="mb-s3 rounded-radius-sm border border-muted p-s3"
              />
            )}

            {/* T15 (3A.2) — encantar: el objetivo es un ARMA, no una criatura. Un solo clic
                elige y lanza, igual que `objetivos === "uno"`: es la misma mecánica de mesa
                (tocas el arma), solo que apunta al inventario en vez de a la lista de la mesa. */}
            {entrada.encanta && (
              <ul
                role="listbox"
                aria-label={`Arma de ${entrada.nameEs}`}
                className="flex flex-col gap-1"
              >
                {armasEquipadas.length === 0 && (
                  <li className="font-chrome text-chrome-xs text-muted">
                    No llevas ningún arma equipada.
                  </li>
                )}
                {armasEquipadas.map((fila) => (
                  <li key={fila.id} role="presentation">
                    <Button
                      type="button"
                      variant="ghost"
                      role="option"
                      aria-selected="false"
                      disabled={usar.isPending}
                      onClick={() => lanzar(undefined, fila.id)}
                      className="!flex w-full justify-start text-left font-normal hover:bg-[color:var(--accent-tint)]"
                    >
                      {fila.item.name}
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            {entrada.objetivos === "uno" && (
              <ul
                role="listbox"
                aria-label={`Objetivo de ${entrada.nameEs}`}
                className="flex flex-col gap-1"
              >
                {objetivosDisponibles.map((o) => (
                  <li key={o.id} role="presentation">
                    <Button
                      type="button"
                      variant="ghost"
                      role="option"
                      aria-selected="false"
                      disabled={usar.isPending}
                      onClick={() => lanzar([o.id])}
                      className="!flex w-full justify-start text-left font-normal hover:bg-[color:var(--accent-tint)]"
                    >
                      {o.nombre}
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            {entrada.objetivos === "varios" && (
              <>
                <ul className="flex flex-col gap-1" aria-label={`Objetivos de ${entrada.nameEs}`}>
                  {objetivosDisponibles.map((o) => (
                    <li key={o.id}>
                      <label className="flex items-center gap-s2 rounded-radius-sm px-s2 py-1 font-chrome text-chrome-sm text-text hover:bg-bg">
                        <input
                          type="checkbox"
                          className="accent-[var(--accent)]"
                          checked={objetivosVarios.has(o.id)}
                          onChange={() => alternarObjetivo(o.id)}
                        />
                        {o.nombre}
                      </label>
                    </li>
                  ))}
                </ul>
                <div className="mt-s2">
                  <Button
                    type="button"
                    variant="primary"
                    disabled={objetivosVarios.size === 0 || usar.isPending}
                    // D-CF-121: apagado con motivo (ola de arreglos, m-2).
                    title={objetivosVarios.size === 0 ? "Marca al menos un objetivo" : undefined}
                    onClick={() => lanzar([...objetivosVarios])}
                  >
                    Lanzar sobre {objetivosVarios.size}
                  </Button>
                </div>
              </>
            )}

            {entrada.objetivos === "ninguno" && !entrada.encanta && mostrarSelectorDeEspacio && (
              <div className="mt-s2">
                <Button
                  type="button"
                  variant="primary"
                  disabled={usar.isPending}
                  onClick={() => lanzar()}
                >
                  Lanzar
                </Button>
              </div>
            )}
          </PanelFlotante>
        )}
      </span>

      {usar.isError && (
        <p role="alert" className="font-chrome text-chrome-xs text-danger-text">
          No se ha podido lanzar: {(usar.error as Error).message}
        </p>
      )}

      {usar.isSuccess && sinEspacio && (
        <p role="alert" className="font-chrome text-chrome-xs text-danger-text">
          Sin espacios de nivel {nivelUsado} — no se lanzó.
        </p>
      )}
      {usar.isSuccess && !sinEspacio && sinPreparar && (
        <p className="font-chrome text-chrome-xs text-warning-text">
          Se lanza igual, sin tenerlo preparado.
        </p>
      )}
      {/* Con SIN_ESPACIO el servidor manda también su `aviso` («Sin usos de …»): la frase de
          arriba ya lo dice, así que no se repite (ola de arreglos, m-1). */}
      {usar.isSuccess && !sinEspacio && usar.data.aviso && (
        <p className="font-chrome text-chrome-xs text-warning-text">{usar.data.aviso}</p>
      )}
      {usar.isSuccess && usar.data.verdict && (
        <p
          data-veredicto={usar.data.verdict}
          className={`font-chrome text-chrome-sm font-semibold ${
            usar.data.verdict === "MISS" ? "text-muted" : "text-accent-text"
          }`}
        >
          {NOMBRE_VEREDICTO[usar.data.verdict]}
        </p>
      )}
    </span>
  );
}
