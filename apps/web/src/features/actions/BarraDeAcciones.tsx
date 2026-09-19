import { useId, useRef, useState, type ComponentType } from "react";
import type { AccionDisponible, GrupoDeAccion } from "@dnd/shared";
import { useAcciones } from "./hooks";
import { useObjetivoStore } from "../sessions/objetivo.store";
import {
  NOMBRE_COSTE,
  NOMBRE_GRUPO,
  ORDEN_DE_GRUPOS,
  VERBO_DE_GRUPO,
  fraseDeMecanica,
  fraseDeMotivos,
  fraseDeRecurso,
} from "../../dominio/acciones";
import { PanelFlotante } from "../../ui/PanelFlotante";
import { Button } from "../../ui/Button";
import {
  IconoAptitud,
  IconoBasica,
  IconoConjuro,
  IconoD20,
  IconoPocion,
  IconoQuitar,
} from "../../ui/Iconos";
import { useSpellbook } from "../spellbook/hooks";
import { LanzarConjuro } from "../spellbook/LanzarConjuro";
import { AyudarA } from "../sessions/elenco/AyudarA";
import {
  useCombatientesDelEncuentro,
  useResolveAttack,
  useRollAttack,
  useUsarActividad,
} from "../character-sheet/hooks";
import { useConsumeInventoryItem } from "../inventory/hooks";
import { useCharacters } from "../characters/hooks";

// Task 4 de 3A.3 (T22) — **la barra de acciones bajo el marco.** Cinco menús que suben desde la
// lista única del servidor (`GET …/actions`, Task 1/T21): quien juega no vuelve a decidir «dónde
// está esto» —la pestaña Conjuros, el cuadro de ataques, el inventario— porque el servidor ya lo
// agrupó. La barra solo pinta `AccionesResponse` y manda cada fila a la puerta que le toca.
//
// **Reutiliza, no duplica.** `LanzarConjuro` (spellbook) resuelve el lanzamiento entero, con el
// nuevo `objetivoInicial` de esta misma tarea; `useUsarActividad`, `useResolveAttack`,
// `useRollAttack` y `useCombatientesDelEncuentro` (character-sheet) son los mismos ganchos que ya
// usan `TirarAtaqueBoton` y `Actividades.tsx` — no una segunda mutación con el mismo cuerpo. Lo
// único nuevo de verdad es el envoltorio: qué fila abre qué panel.

export function BarraDeAcciones({
  campaignId,
  characterId,
  nombre,
}: {
  campaignId: string;
  characterId: string;
  nombre: string;
}) {
  const { data } = useAcciones(campaignId, characterId);
  const objetivo = useObjetivoStore((s) => s.objetivo);
  const quitarObjetivo = useObjetivoStore((s) => s.quitar);

  // Mientras no haya respuesta, no hay nada honesto que pintar — igual que el resto de la mesa,
  // que prefiere no mostrar nada a mostrar cinco botones con contadores en cero inventados.
  if (!data) return null;

  return (
    <div
      role="region"
      aria-label="Barra de acciones"
      className="flex flex-wrap items-center gap-s2 rounded-radius-sm border border-muted bg-surface px-s3 py-s2"
    >
      <p className="shrink-0 font-chrome text-chrome-sm font-semibold text-text">
        {nombre}
        {data.esMiTurno === true && <span className="font-normal text-muted"> · le toca</span>}
      </p>

      <ChipDeObjetivo objetivo={objetivo} onQuitar={quitarObjetivo} />

      <div className="flex flex-1 flex-wrap items-center gap-s2">
        {ORDEN_DE_GRUPOS.map((grupo) => (
          <BotonDeGrupo
            key={grupo}
            campaignId={campaignId}
            characterId={characterId}
            grupo={grupo}
            acciones={data.grupos[grupo]}
          />
        ))}
      </div>
    </div>
  );
}

/** El icono de cada uno de los cinco grupos — dibujado, nunca un glifo (regla vinculante). */
const ICONO_DE_GRUPO: Record<GrupoDeAccion, ComponentType<{ className?: string }>> = {
  ATAQUES: IconoD20,
  CONJUROS: IconoConjuro,
  APTITUDES: IconoAptitud,
  OBJETOS: IconoPocion,
  BASICAS: IconoBasica,
};

/**
 * El chip «apuntas a Klarg ×». **Sin tecla** (brief): la X solo se pulsa con ratón o Enter/Espacio
 * con el foco encima, como cualquier botón — no hay atajo global que la dispare.
 */
function ChipDeObjetivo({
  objetivo,
  onQuitar,
}: {
  objetivo: { id: string; nombre: string } | null;
  onQuitar: () => void;
}) {
  if (!objetivo) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-radius-sm border border-accent bg-[color:var(--accent-tint)] px-s2 py-0.5 font-chrome text-chrome-xs text-accent-text">
      apuntas a {objetivo.nombre}
      <button
        type="button"
        onClick={onQuitar}
        aria-label={`Dejar de apuntar a ${objetivo.nombre}`}
        className="rounded-radius-sm p-0.5 hover:bg-[color:var(--accent-tint)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      >
        <IconoQuitar className="h-3 w-3" />
      </button>
    </span>
  );
}

/**
 * Un botón de la barra («Ataques 3», «Conjuros 6 [2]», …) con su `MenuQueSube`.
 *
 * **El contador extra de Conjuros** (el `[N]` del prototipo) es «espacios disponibles del menor
 * nivel con espacio» — la única lectura que el brief fija. Los otros cuatro grupos no tienen una
 * segunda cifra definida en ningún sitio (el brief la menciona para Aptitudes sin decir qué
 * significa) y esta tarea prefiere no inventar un número que el servidor no manda — Ruling, ver
 * el informe.
 */
function BotonDeGrupo({
  campaignId,
  characterId,
  grupo,
  acciones,
}: {
  campaignId: string;
  characterId: string;
  grupo: GrupoDeAccion;
  acciones: AccionDisponible[];
}) {
  const [abierto, setAbierto] = useState(false);
  const disparador = useRef<HTMLButtonElement>(null);
  const Icono = ICONO_DE_GRUPO[grupo];

  // Solo CONJUROS pide el libro — para el espacio disponible del contador y para resolver cada
  // fila contra su `SpellbookEntry` real (`FilaDeConjuroDeLaBarra`, más abajo). Pedirlo siempre
  // sería una consulta de más en las otras cuatro pestañas de la barra.
  const espaciosQ = useSpellbook(campaignId, characterId);
  const menorNivelConEspacio =
    grupo === "CONJUROS"
      ? [...(espaciosQ.data?.espacios ?? [])]
          .filter((e) => e.actual > 0)
          .sort((a, b) => a.nivel - b.nivel)[0]
      : undefined;

  return (
    <span className="inline-flex shrink-0 flex-col items-end">
      <Button
        ref={disparador}
        type="button"
        variant="secondary"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-label={`${NOMBRE_GRUPO[grupo]}: ${acciones.length}`}
        className="!flex items-center gap-1.5"
      >
        <Icono className="h-4 w-4" />
        {NOMBRE_GRUPO[grupo]} {acciones.length}
        {menorNivelConEspacio && (
          <span className="text-muted">[{menorNivelConEspacio.actual}]</span>
        )}
      </Button>

      {/* **`MenuQueSube`**: el mismo `PanelFlotante` que ya usan `TirarAtaqueBoton` y
          `LanzarConjuro`, sin alinear a la izquierda porque la barra vive al fondo de la
          pantalla y estos botones están repartidos a lo ancho — `colocar()` ya lo abre hacia
          arriba en cuanto no cabe debajo, que es el caso normal aquí. */}
      <PanelFlotante
        abierto={abierto}
        disparador={disparador}
        onCerrar={() => setAbierto(false)}
        etiqueta={NOMBRE_GRUPO[grupo]}
        ancho="w-[24rem] max-w-[calc(100vw-2rem)]"
      >
        <p className="mb-s2 font-chrome text-chrome-sm font-semibold text-text">
          {NOMBRE_GRUPO[grupo]}
        </p>
        {acciones.length === 0 ? (
          <p className="font-chrome text-chrome-xs text-muted">Nada en este grupo todavía.</p>
        ) : (
          <ul className="flex flex-col">
            {acciones.map((accion) => (
              <FilaDeAccion
                key={accion.key}
                campaignId={campaignId}
                characterId={characterId}
                accion={accion}
              />
            ))}
          </ul>
        )}
      </PanelFlotante>
    </span>
  );
}

/** La fila común: nombre, coste, recurso y mecánica — y, a la derecha, el control que le toca a
 *  su grupo (o, si el servidor la apaga, un botón sin función con el motivo). */
function FilaDeAccion({
  campaignId,
  characterId,
  accion,
}: {
  campaignId: string;
  characterId: string;
  accion: AccionDisponible;
}) {
  const idMotivo = useId();
  const detalle = [
    NOMBRE_COSTE[accion.coste],
    accion.recurso ? fraseDeRecurso(accion.recurso) : null,
    accion.mecanica ? fraseDeMecanica(accion.mecanica) : null,
  ]
    .filter((x): x is string => Boolean(x))
    .join(" · ");

  return (
    // Ayudar (`basic:help`) monta el formulario entero de `AyudarA` (selector + botón + «¿Qué
    // hace?»): dentro de un menú de ~26rem no cabe a la derecha del nombre, y un ítem de flex sin
    // `min-w-0` se salía del panel sobre el registro (captura del autor, 2026-09-18). La fila
    // envuelve y el formulario ocupa su propia línea (`basis-full`); los demás controles siguen
    // a la derecha sin encoger.
    <li className="flex flex-wrap items-center justify-between gap-s2 border-b border-muted/30 py-s2 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="truncate font-chrome text-chrome-sm text-text">{accion.name}</p>
        <p className="truncate font-chrome text-chrome-xs text-muted">{detalle}</p>
        {!accion.disponible && (
          <p id={idMotivo} className="font-chrome text-chrome-xs text-muted">
            {fraseDeMotivos(accion.motivos)}
          </p>
        )}
        {accion.disponible && accion.motivos.length > 0 && (
          // D-CF-126: `NO_PREPARADO` es un AVISO, no un apagón — la fila sigue activa y el
          // motivo se lee igual, en gris, sin `aria-disabled`.
          <p className="font-chrome text-chrome-xs text-muted">{fraseDeMotivos(accion.motivos)}</p>
        )}
      </div>
      <div className={accion.key === "basic:help" ? "min-w-0 basis-full" : "shrink-0"}>
        {!accion.disponible ? (
          <Button type="button" variant="ghost" disabled aria-describedby={idMotivo}>
            {VERBO_DE_GRUPO[accion.grupo]}
          </Button>
        ) : (
          <ControlDeFila campaignId={campaignId} characterId={characterId} accion={accion} />
        )}
      </div>
    </li>
  );
}

/** El control de una fila DISPONIBLE, uno por grupo. */
function ControlDeFila({
  campaignId,
  characterId,
  accion,
}: {
  campaignId: string;
  characterId: string;
  accion: AccionDisponible;
}) {
  switch (accion.grupo) {
    case "ATAQUES":
      return <ControlDeAtaque campaignId={campaignId} characterId={characterId} accion={accion} />;
    case "CONJUROS":
      return <ControlDeConjuro campaignId={campaignId} characterId={characterId} accion={accion} />;
    case "OBJETOS":
      return <ControlDeObjeto campaignId={campaignId} characterId={characterId} accion={accion} />;
    case "APTITUDES":
      return (
        <ControlDeActividad campaignId={campaignId} characterId={characterId} accion={accion} />
      );
    case "BASICAS":
      return <ControlDeBasica campaignId={campaignId} characterId={characterId} accion={accion} />;
  }
}

/**
 * Ola post-revisión de 3A.3 (I1) — **un error del servidor se lee en la fila.** La barra no
 * pintaba ningún `isError` de sus mutaciones: un 400 («No se puede atacar al propio personaje»),
 * un 404 (el objetivo salió del combate, una actividad que el catálogo no conoce — C1) o una
 * fila `disponible` caducada entre sondeos se veían como «pulso y no pasa nada». La doctrina
 * de la casa ya está escrita en `TiraDeIniciativa`: un botón que falla en silencio es peor que
 * uno que no existe. Mismo patrón que `BandejaDeDano`: `role="alert"` con el mensaje tal cual
 * lo manda el servidor (ya viene en español, es la frase de la excepción).
 */
function ErrorDeControl({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <p role="alert" className="mt-1 max-w-[16rem] font-chrome text-chrome-xs text-danger-text">
      {(error as Error).message}
    </p>
  );
}

/**
 * ATAQUES — **el mismo flujo que `TirarAtaqueBoton`**: con el chip puesto, resuelve directo
 * contra ese objetivo (`useResolveAttack`); sin chip y en combate, abre la lista de combatientes
 * (`useCombatientesDelEncuentro`, el mismo bando-contrario-primero); sin combate, tira suelta
 * (`useRollAttack`). No se reimporta el componente entero: son los mismos cuatro ganchos, en un
 * envoltorio más corto porque aquí no hace falta el panel de daño ni el de ventaja — eso lo
 * enseña el hilo cuando la tirada llega.
 */
function ControlDeAtaque({
  campaignId,
  characterId,
  accion,
}: {
  campaignId: string;
  characterId: string;
  accion: AccionDisponible;
}) {
  const attackKey = accion.key.replace(/^attack:/, "");
  const objetivo = useObjetivoStore((s) => s.objetivo);
  const resolver = useResolveAttack(campaignId, characterId);
  const tirar = useRollAttack(campaignId, characterId);
  const combate = useCombatientesDelEncuentro(campaignId, characterId);
  const [abierto, setAbierto] = useState(false);
  const disparador = useRef<HTMLButtonElement>(null);

  const atacar = () => {
    if (objetivo) {
      resolver.mutate({
        attackKey,
        input: {
          targetCharacterId: objetivo.id,
          mode: "NORMAL",
          spendInspiration: false,
          audience: "PUBLIC",
        },
      });
      return;
    }
    if (combate.enCombate && combate.combatientes.length > 0) {
      setAbierto((v) => !v);
      return;
    }
    tirar.mutate({
      attackKey,
      input: {
        part: "ATTACK",
        mode: "NORMAL",
        spendInspiration: false,
        versatile: false,
        audience: "PUBLIC",
      },
    });
  };

  return (
    <span className="inline-flex shrink-0">
      <Button
        ref={disparador}
        type="button"
        variant="primary"
        onClick={atacar}
        disabled={resolver.isPending || tirar.isPending || combate.cargando}
        aria-expanded={
          !objetivo && combate.enCombate && combate.combatientes.length > 0 ? abierto : undefined
        }
        aria-label={`Atacar con ${accion.name}`}
      >
        Atacar
      </Button>
      {!objetivo && (
        // **Fix round 3 — `sinRol`, como ya hace `MenuDeAcciones`.** Sin él, este `PanelFlotante`
        // pintaba SU PROPIO `role="group"`/`aria-label="Objetivo del ataque con X"` en el `div`
        // del portal, duplicando el mismo `aria-label` sobre el `<ul role="listbox">` de dentro
        // — dos nodos con el mismo nombre accesible, uno anidado en el otro. Cualquier prueba que
        // busque `[aria-label^="Objetivo del ataque"]` (`desbordes.spec.ts`, que ya mide la MISMA
        // lista de `TirarAtaqueBoton`, cuyo `PanelFlotante` exterior lleva una etiqueta DISTINTA
        // —«Tirada de X»— precisamente para evitar este choque) encontraba dos coincidencias en
        // vez de una: modo estricto de Playwright se queja de ambigüedad, no de que falte. El
        // `<ul>` ya es el único nodo accesible que hace falta; con `sinRol` recupera también el
        // marco visual (borde/fondo/sombra) que el `div` exterior dejaba de pintar.
        <PanelFlotante
          abierto={abierto}
          disparador={disparador}
          onCerrar={() => setAbierto(false)}
          etiqueta={`Objetivo del ataque con ${accion.name}`}
          sinRol
        >
          <ul
            role="listbox"
            aria-label={`Objetivo del ataque con ${accion.name}`}
            className="flex flex-col gap-1 rounded-radius-md border border-accent bg-surface p-s2 text-left shadow-[0_18px_40px_-24px_var(--sheet-shadow)]"
          >
            {combate.combatientes.map((c) => (
              <li key={c.characterId} role="presentation">
                <Button
                  type="button"
                  variant="ghost"
                  role="option"
                  aria-selected="false"
                  disabled={resolver.isPending}
                  onClick={() => {
                    setAbierto(false);
                    resolver.mutate({
                      attackKey,
                      input: {
                        targetCharacterId: c.characterId,
                        mode: "NORMAL",
                        spendInspiration: false,
                        audience: "PUBLIC",
                      },
                    });
                  }}
                  className="!flex w-full justify-start text-left font-normal hover:bg-[color:var(--accent-tint)]"
                >
                  {c.nombre}
                </Button>
              </li>
            ))}
          </ul>
        </PanelFlotante>
      )}
      <ErrorDeControl error={resolver.error ?? tirar.error} />
    </span>
  );
}

/**
 * CONJUROS — busca la `SpellbookEntry` real en `useSpellbook` (la barra solo tiene
 * `AccionDisponible`, que a propósito no trae dados ni objetivos por conjuro — ver la Task 1) y
 * monta `LanzarConjuro` con `objetivoInicial` del chip. Sin entrada encontrada (no debería pasar:
 * el servidor compone los dos grupos de la misma fuente), no se pinta ningún control — la fila ya
 * dice el nombre y el motivo si lo hay.
 */
function ControlDeConjuro({
  campaignId,
  characterId,
  accion,
}: {
  campaignId: string;
  characterId: string;
  accion: AccionDisponible;
}) {
  const spellKey = accion.key.replace(/^spell:/, "");
  const objetivo = useObjetivoStore((s) => s.objetivo);
  const { data } = useSpellbook(campaignId, characterId);
  if (!data) return null;
  const entrada = data.entradas.find((e) => e.key === spellKey);
  if (!entrada) return null;
  return (
    <LanzarConjuro
      campaignId={campaignId}
      characterId={characterId}
      entrada={entrada}
      espacios={data.espacios}
      objetivoInicial={objetivo?.id}
    />
  );
}

/** OBJETOS — el mismo `consume` del inventario que ya usa la pantalla de la bolsa. */
function ControlDeObjeto({
  campaignId,
  characterId,
  accion,
}: {
  campaignId: string;
  characterId: string;
  accion: AccionDisponible;
}) {
  const rowId = accion.key.replace(/^item:/, "");
  const consumir = useConsumeInventoryItem(campaignId, characterId);
  return (
    <span className="inline-flex flex-col items-end">
      <Button
        type="button"
        variant="primary"
        disabled={consumir.isPending}
        onClick={() => consumir.mutate({ rowId })}
      >
        Beber
      </Button>
      <ErrorDeControl error={consumir.error} />
    </span>
  );
}

/**
 * APTITUDES — `useUsarActividad`, la misma puerta que `Actividades.tsx`. **La clave viaja
 * desnuda** (`rage`, no `feature:rage`): el prefijo `feature:` es solo el espacio de nombres de
 * la lista (`actions.service.ts`) y el catálogo del servidor (`actividadCatalogada`) busca la
 * `feature.key` cruda — con el prefijo respondía 404 y, sin `isError` pintado, la pestaña entera
 * parecía muerta (C1 de la revisión final de 3A.3). Mismo recorte que `ControlDeAtaque` hace
 * con `attack:`; `basic:` NO se recorta porque ese prefijo sí lo entiende el catálogo.
 */
function ControlDeActividad({
  campaignId,
  characterId,
  accion,
}: {
  campaignId: string;
  characterId: string;
  accion: AccionDisponible;
}) {
  const activityKey = accion.key.replace(/^feature:/, "");
  const usar = useUsarActividad(campaignId, characterId);
  return (
    <span className="inline-flex flex-col items-end">
      <Button
        type="button"
        variant="primary"
        disabled={usar.isPending}
        onClick={() => usar.mutate({ activityKey })}
      >
        Usar
      </Button>
      <ErrorDeControl error={usar.error} />
    </span>
  );
}

/**
 * BASICAS — siete de las ocho van por `useUsarActividad` (`basic:<key>`, la misma puerta que
 * `activities.module.ts` cableó en la Task 1). **`basic:help` es la excepción**: el servidor la
 * rechaza con 400 a propósito («Ayudar va por su propia puerta») porque ayudar necesita A QUIÉN,
 * y esta fila abre `AyudarA` — el mismo componente de la tarjeta del elenco, no una segunda
 * mutación.
 */
function ControlDeBasica({
  campaignId,
  characterId,
  accion,
}: {
  campaignId: string;
  characterId: string;
  accion: AccionDisponible;
}) {
  const usar = useUsarActividad(campaignId, characterId);
  const { data: personajes } = useCharacters(campaignId);
  const yo = (personajes ?? []).find((p) => p.id === characterId);

  if (accion.key === "basic:help") {
    // `AyudarA` ya trae su propio selector de destino y su propio botón «Ayudar» — se monta tal
    // cual, sin envolver en un segundo botón que dispararía antes de elegir a quién.
    return yo ? <AyudarA campaignId={campaignId} personaje={yo} /> : null;
  }

  return (
    <span className="inline-flex flex-col items-end">
      <Button
        type="button"
        variant="primary"
        disabled={usar.isPending}
        onClick={() => usar.mutate({ activityKey: accion.key })}
      >
        Usar
      </Button>
      <ErrorDeControl error={usar.error} />
    </span>
  );
}
