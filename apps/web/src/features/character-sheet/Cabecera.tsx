import { useLayoutEffect, useRef } from "react";
import { Retrato } from "../sessions/elenco/FichaDeElenco";
import { descriptorDePersonaje } from "../characters/descriptor";
import { ValorDerivado } from "./Traza";
import { Condiciones } from "./Condiciones";
import { Avisos } from "./Avisos";
import { EleccionesPendientes } from "./EleccionesPendientes";
import { AvisoDeDm } from "./AvisoDeDm";
import { useEsVistaDeDm } from "./hooks";
import { BotonSubirNivel } from "../level-up/BotonSubirNivel";
import { Casilla } from "./Casilla";
import type { PropsDePestana } from "./pestanas/tipos";
import type { SheetResponse } from "./api";
import { frasesDeXp } from "./vocabulario";

// Tarea 3 (spec 2026-09-11, «la hoja a página completa») — la cabecera fija de la hoja: lo que
// cambia el turno, en cualquier disposición y fuera de todas las pestañas. Vivía dentro de
// `HojaCalculada.tsx`; se mueve a su propio componente para que las pestañas que vienen después
// (Tarea 4+) puedan compartirla sin que cada una tenga que volver a montarla.
//
// **Es HERMANA del cuerpo, nunca su padre**: `sticky` se pega dentro de su padre, y envolverla
// soltaría la tira sin que ninguna unitaria se enterase (lo mide el punto 7 de
// `e2e/hoja.spec.ts`). Quien monta `Cabecera` tiene que colocarla como hermana del resto de la
// hoja, no como envoltorio.
export function Cabecera({
  campaignId,
  characterId,
  data,
  puedeEditar,
  disposicion,
  esDM = false,
  onAlto,
}: PropsDePestana & {
  /**
   * Anexo #6/#17 — el alto REAL de la banda, en píxeles, para quien fije un `sticky` debajo de
   * ella (`DetalleDeObjeto.tsx`). La medida encontró que `--tira-fija-top` (el escalón de
   * `AppShell`) no basta: la banda mide más que ese escalón, y un sticky que solo sumara el
   * escalón se metía 60px bajo ella. Se reporta con `ResizeObserver` porque el alto cambia con
   * los avisos activos, la envoltura de la fila y el tamaño de fuente — nunca es una constante.
   */
  onAlto?: (px: number) => void;
}) {
  const { sheet, hp, character } = data;
  const bandaRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = bandaRef.current;
    if (!el || !onAlto) return;
    onAlto(el.getBoundingClientRect().height);
    // jsdom no trae `ResizeObserver`: sin esta guarda, cada prueba de RTL que monta la cabecera
    // lanzaría un `ReferenceError` antes de llegar a su propia aserción.
    if (typeof ResizeObserver === "undefined") return;
    // `getBoundingClientRect` y no `entry.contentRect`: la banda lleva `border-b` y padding, y
    // el consumidor (el `top` del sticky de al lado) necesita el alto de caja completa, el mismo
    // que ya se reportó en la llamada inicial de arriba.
    const observador = new ResizeObserver(() => {
      onAlto(el.getBoundingClientRect().height);
    });
    observador.observe(el);
    return () => observador.disconnect();
  }, [onAlto]);
  // La velocidad de la cabecera es la **efectiva** —la que ya tiene en cuenta las condiciones—,
  // que calcula el servidor. Si la respuesta no la trae (una mutación, que no la manda), se pinta
  // la base sin traza en vez de recalcular aquí una regla del juego que vive en la API.
  const velocidad = data.effectiveSpeeds?.walk ?? { total: sheet.speeds.walk ?? 0, steps: [] };
  const descripcion = descriptorDePersonaje(character);
  // HP-7 (2026-09-12) — **la fila de avisos se decide aquí, con los mismos datos que usan los
  // cuatro avisos**, y no con `empty:hidden` sobre un `<div>` siempre montado. Aquello dependía
  // de que `Avisos`, `EleccionesPendientes`, `AvisoDeDm` y el botón devolvieran `null` cuando
  // no tenían nada que decir: un envoltorio que devolviera un `<div>` vacío habría vuelto a
  // pintar la fila con su hueco. Las cuatro condiciones, una por aviso, en el mismo orden en que
  // se pintan; la del DM cuelga de una consulta y por eso es un hook compartido con el aviso.
  const esVistaDeDm = useEsVistaDeDm(campaignId);
  const hayAvisos =
    sheet.warnings.length > 0 ||
    sheet.pendingChoices.length > 0 ||
    esVistaDeDm ||
    puedeEditar ||
    // Puerta de efectos §5 bis (E-PE-10): el marcador de PX se pinta aunque no haya ningún otro
    // aviso — un jugador que solo mira su ficha (ni DM, ni puede editar) sigue queriendo ver
    // «1 250 / 2 700 PX» en modo XP.
    Boolean(data.xp);
  // El botón «Subir a nivel N» vive dentro de este contenedor cuando `puedeEditar` lo monta; el
  // aviso de la DM lo enfoca en vez de enlazarlo con un ancla — `BotonSubirNivel` es de
  // `features/level-up`, fuera de esta frontera, así que no se le añade un `id` propio.
  const contenedorDelBoton = useRef<HTMLDivElement>(null);
  const enfocarSubirNivel = () => {
    contenedorDelBoton.current?.querySelector<HTMLButtonElement>("button")?.focus();
  };

  return (
    <>
      {/* **El escalón lo declara quien lo tiene, no esta hoja.** `AppShell` pone
          `--tira-fija-top: 4rem` porque su cabecera mide `h-16`, y `--tira-fija-pull: -1.5rem`
          para subir la tira a la banda del nombre. Dentro de un cajón no hay ninguna de las dos
          cosas y las variables valen **cero**: escribir `top-16` aquí hacía que la tira se
          parase 64px por debajo del borde del cajón y **se solapase 72px con su propio cuerpo**. */}
      <section
        ref={bandaRef}
        aria-label="resumen de combate"
        className="sticky top-[var(--tira-fija-top,0px)] z-20 mx-[var(--tira-fija-mx,0px)] mt-[var(--tira-fija-pull,0px)] border-b border-muted bg-[color:var(--tira-fija-bg,var(--chrome-veil))] px-s2 py-s2 backdrop-blur"
      >
        <div className="flex flex-wrap items-start gap-s3">
          <Retrato personaje={character} />
          {/* El nombre y la descripción solo en la mesa: en la página ya los pinta `PageHeader`
            (fuera de la frontera de esta tarea), y repetirlos aquí sería el mismo dato en dos
            sitios. */}
          {disposicion === "mesa" && (
            <div className="min-w-0">
              <p className="truncate font-title text-chrome-md text-text">{character.name}</p>
              {descripcion && <p className="font-world text-chrome-sm text-muted">{descripcion}</p>}
            </div>
          )}
          <div className="ml-auto flex flex-wrap items-start justify-end gap-s2">
            <ValorDerivado variante="compacta" etiqueta="CA" valor={sheet.derived.ac} />
            <ValorDerivado
              variante="compacta"
              etiqueta="Inic."
              etiquetaLarga="Iniciativa"
              valor={sheet.derived.initiative}
              signo
            />
            {/* Ronda de arreglo (2026-09-12): «Vel. (pies)» partía línea a 4,75rem (el ancho de
              casilla que se abandonó por eso); 6rem es la corrección, no el problema. La unidad
              baja a la tercera línea de la casilla —la misma que reserva «+N temporales»— en vez
              de vivir pegada al rótulo. */}
            <ValorDerivado
              variante="compacta"
              etiqueta="Vel."
              etiquetaLarga="Velocidad efectiva en pies"
              nota="pies"
              valor={{ key: "speed.walk", total: velocidad.total, steps: velocidad.steps }}
            />
            {/* Los PG de la cabecera son **solo lectura**: el delta —recibo daño, me curo— se
              aplica en su tarjeta, que es donde está la acción. Repetir aquí el control sería el
              mismo dato en dos sitios, que es como se acaba con uno de los dos mintiendo. */}
            <Casilla rotulo="PG" nota={hp.temp > 0 ? `+${hp.temp} temporales` : undefined}>
              {hp.current ?? "—"} / {hp.max ?? "—"}
            </Casilla>
            {sheet.derived.proficiencyBonus && (
              <ValorDerivado
                variante="compacta"
                etiqueta="Comp."
                etiquetaLarga="Competencia"
                valor={sheet.derived.proficiencyBonus}
                signo
              />
            )}
          </div>
        </div>
        <div className="mt-s2 flex flex-col gap-s2 empty:hidden">
          <Condiciones
            campaignId={campaignId}
            characterId={characterId}
            puedeEditar={false}
            variante="chips"
          />
        </div>
      </section>
      {/* **Los avisos van DEBAJO de la banda fija, no dentro** (Tarea 10, decisión del controlador
        sobre §4/§9 de la spec, 2026-09-12). En la banda solo se queda lo que cambia cada turno:
        retrato, identidad, los cinco números y los chips de condición. Las advertencias, las
        elecciones pendientes, la vista de DM y el botón de subir de nivel se leen una vez y no
        hace falta llevarlos pegados al desplazar; medidos dentro de la banda, con un guerrero de
        nivel 1 del DM la tira fija ocupaba **412 px** de una ventana de 720
        (`e2e/hoja.spec.ts`, «la cabecera entera cabe…»). Siguen siendo de la cabecera —se pintan
        antes que cualquier pestaña—, pero son hermanos de la `section`, así que ni se pegan ni
        entran en la región «resumen de combate». Solo se monta si `hayAvisos` (HP-7); sin
        `empty:hidden`, que era la muleta que esta decisión sustituye — con ella, un aviso que
        devolviera un envoltorio vacío habría pasado desapercibido detrás de la clase. */}
      {hayAvisos && (
        <div className="flex flex-col gap-s2">
          <Avisos warnings={sheet.warnings} />
          <EleccionesPendientes
            campaignId={campaignId}
            characterId={characterId}
            pendingChoices={sheet.pendingChoices}
            choicesActuales={character.choices ?? {}}
          />
          <AvisoDeDm campaignId={campaignId} />
          {data.xp && (
            <MarcadorDeXp
              xp={data.xp}
              level={character.level}
              esDM={esDM}
              onIrASubirNivel={enfocarSubirNivel}
            />
          )}
          {puedeEditar && (
            <div ref={contenedorDelBoton}>
              <BotonSubirNivel
                campaignId={campaignId}
                characterId={characterId}
                level={character.level}
                esDM={esDM}
              />
            </div>
          )}
        </div>
      )}
    </>
  );
}

/**
 * Puerta de efectos §5 bis (E-PE-10, D-CF-68) — el marcador «1 250 / 2 700 PX» y, si toca, el
 * aviso de nivel disponible. Mismo tratamiento visual que `AvisoDeDm` (filete de cobre) para el
 * marcador — es información de la mesa, no un error — y el mismo tono de `Avisos` (filete de
 * aviso, texto de aviso) para la notificación, que sí pide atención.
 *
 * **El enlace es del DM.** Solo el DM sube el nivel (D-CF-66), así que solo en su vista el aviso
 * se ofrece como algo que se pulsa — enfoca el botón «Subir a nivel N+1» en vez de repetir el
 * gesto aquí. Para quien no puede editar, el aviso es una frase: el dueño del personaje se
 * entera de que puede subir, pero quien pulsa sigue siendo el DM.
 */
function MarcadorDeXp({
  xp,
  level,
  esDM,
  onIrASubirNivel,
}: {
  xp: NonNullable<SheetResponse["xp"]>;
  level: number;
  esDM: boolean;
  onIrASubirNivel: () => void;
}) {
  const { marcador, aviso } = frasesDeXp(xp, level);
  return (
    <section
      aria-label="experiencia"
      className="rounded-radius-md border border-copper px-s3 py-s2"
    >
      <p className="font-data text-chrome-sm text-copper-text">{marcador}</p>
      {aviso &&
        (esDM ? (
          <button
            type="button"
            onClick={onIrASubirNivel}
            className="mt-1 block text-left font-chrome text-chrome-xs leading-snug text-warning-text underline-offset-2 hover:underline"
          >
            {aviso}
          </button>
        ) : (
          <p className="mt-1 font-chrome text-chrome-xs leading-snug text-warning-text">{aviso}</p>
        ))}
    </section>
  );
}
