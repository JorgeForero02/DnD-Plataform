import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import type { GameEventPayload, SessionNoteKind } from "@dnd/shared";
import type { GameEventRow } from "../log-api";
import { useStampNote } from "../hooks";
import { ICONO_SELLO, NOMBRE_SELLO, SELLOS_EN_ORDEN } from "../vocabulario";
import { IconoBajarAlFondo, IconoRegistro } from "../iconos";
import { fraseDeLoPerdido, loQueTePerdiste, marcarVisto, ultimoVisto } from "../reincorporarse";
import { PanelDeMesa } from "../PanelDeMesa";
import { useMembers } from "../../campaigns/members";
import type { Member } from "../../campaigns/members";
import { Button } from "../../../ui/Button";
import { MensajeDelHilo } from "./MensajeDelHilo";
import { IconoPluma } from "../../../ui/Iconos";

// **El hilo de la sesión: los cinco tipos de mensaje de la maqueta, no una lista plana.**
//
// La Ola 0 movió aquí el registro que vivía en `MesaDeSesion.tsx` y lo dejó scrollando por
// dentro, con el compositor fuera del scroll. Lo que hace esta tanda es lo que faltaba, y es el
// §1 de la auditoría del 2026-09-04: la lista de chip + frase + autor + hora se sustituye por
// **narración con capitular, personaje con su color de voz, sistema en cursiva, sello con reglas
// de cobre y tirada incrustada con «De dónde sale»**, copiados de
// `prototipo/src/features/HiloDeSesion.tsx` y `TiradaIncrustada.tsx`. La forma de cada uno vive
// en `MensajeDelHilo.tsx`; qué forma le toca a cada suceso, en `tipo-de-mensaje.ts`.
//
// **Y el sello sin texto ya no se manda DESDE EL HILO.** Era el defecto de
// `MesaDeSesion.tsx:793-805`: pulsar «Nota» escribía en el registro una entrada que decía «Nota»,
// porque el texto viajaba como `undefined` y nadie lo impedía. Los seis botones son el envío
// —cada uno manda con su clase—, así que se deshabilitan sin texto, que es lo que hace la maqueta
// con su botón de enviar.
//
// **Este no era el único compositor, y decir que cerraba la puerta entera era falso.** La
// auditoría daba dos direcciones —`:793-805` **y** `:886-901`— y aquí se leyó una: `BarraDeSesion`
// tiene su propio «Anotar», se pinta en toda pantalla de campaña y hacía exactamente lo mismo.
// Ese lo cerró el ensamblado, con su prueba. Lo que arregla este fichero es su mitad.
//
// **Lo que NO se toca**, porque son datos de comportamiento probados y no maquetación: la franja
// de «esto te perdiste» con su `role="separator"` y su marca congelada al montar, el `data-suceso`
// de cada línea, el aviso de «ver como», y las puertas de datos (`hooks.ts`, `log-api.ts`).
//
// **Tres sitios donde esto no copia la maqueta**, y se declaran en vez de darse por acordados:
//
//  1. El filete del compositor es `border-t border-muted`; la maqueta pone `border-muted/20`.
//  2. El texto de ayuda del campo es `placeholder:text-muted`; la maqueta pone `text-muted/60`.
//  3. La franja de no leído sigue pintada en **cobre**; la maqueta la pinta con el acento.
//
// Las tres son cosméticas y las tres van en la dirección de conservar lo que ya había — la franja,
// además, es marcado probado que este carril tenía orden de no tocar. **Ninguna es por
// imposibilidad técnica**: las opacidades sueltas compilan desde B0 (la escala se abrió a los cien
// pasos justo para esto), así que copiar la maqueta al pie de la letra es una línea en cada sitio
// el día que se decida que se quiere.
//
// **D1 (2026-09-05): el hilo se lee como una conversación, lo último abajo.** Palabras del autor:
// *«esto es el chat de mesa que muestra el historial, se supone que lo último siempre va en línea
// como si fuera una conversación»*. Tres cosas que hay que entender de cómo está resuelto:
//
//  1. **Se invierte al PINTAR, no al pedir.** El servidor sigue mandando el más reciente primero
//     y no se toca: `nextCursor` sale de la última fila traída, así que invertir la consulta
//     rompería la paginación por cursor. Lo que se pinta es `[...eventos].reverse()` — **una
//     copia**, porque `reverse` muta y el array llega de la caché de TanStack Query, donde
//     mutarlo corrompe lo que ven otros componentes sin fallar de forma visible.
//  2. **La marca de leído sigue saliendo de `eventos[0].id`**, el original, que sigue siendo el
//     más reciente. Escribirla desde el array invertido daría el mismo suceso por un rodeo que
//     es un sitio donde equivocarse.
//  3. **`loQueTePerdiste` no se ha tocado.** Devuelve el más ANTIGUO de los no leídos, y con el
//     orden nuevo ese suceso es justo por donde hay que seguir leyendo: la franja queda con lo
//     no leído **por debajo**, que es lo que su comentario decía querer y el orden viejo le
//     negaba.
//
// **El anclaje es la mitad delicada y el corazón del plan.** Se baja al fondo al montar y cuando
// llega algo nuevo, pero **solo si el lector ya estaba al fondo** (`TOLERANCIA_FONDO`). Si estaba
// leyendo más arriba no se mueve nada y se le ofrece un aviso pulsable: un chat que te arrastra
// mientras lees es peor que uno que no se mueve. Nada de esto se puede probar en `jsdom`, que no
// maqueta y devuelve `scrollHeight` y `clientHeight` a cero — **cualquier prueba de anclaje
// pasaría siempre**. Se mide en `apps/web/e2e/mesa-mide.spec.ts`.

/**
 * Cuánto puede haberse separado del fondo el lector y aun así contar como «está al fondo», en
 * píxeles. No es un número de gusto: sin holgura, media línea de desplazamiento —o un redondeo
 * del navegador con `zoom` puesto— dejaría de anclar y el chat se congelaría solo. Ochenta es
 * poco más de una línea del hilo y bastante menos que un mensaje.
 */
const TOLERANCIA_FONDO = 80;

/** Si al lector le queda menos que la tolerancia por debajo, está leyendo lo último. */
function estaAlFondo(el: HTMLElement): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight < TOLERANCIA_FONDO;
}

/**
 * El registro en vivo, y debajo lo que se usa para escribirlo.
 *
 * Es el centro de la pantalla porque es la partida.
 *
 * **Los sellos los pone cualquier miembro**, no solo el DM: un registro que solo escribe el DM se
 * queda vacío, y es la crítica más repetida a estas herramientas.
 */
export function HiloDeSesion({
  campaignId,
  eventos,
  esDm,
  comoUsuario,
}: {
  campaignId: string;
  eventos: GameEventRow[];
  esDm: boolean;
  comoUsuario: string;
}) {
  const { data: miembros } = useMembers(campaignId);
  const sellar = useStampNote(campaignId);
  const [texto, setTexto] = useState("");
  const [soloDm, setSoloDm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nombreDe = new Map((miembros ?? []).map((m: Member) => [m.userId, m.displayName]));

  // **La marca se congela al montar, a propósito.** Si se releyera en cada sondeo, la franja
  // desaparecería a los quince segundos —justo cuando alguien vuelve a la mesa y todavía no ha
  // leído nada—. Se lee una vez al llegar y se queda mientras estés en la pantalla; lo que se
  // actualiza en el almacenamiento es el suceso más reciente, para la PRÓXIMA vez que vuelvas.
  const [marca] = useState(() => ultimoVisto(campaignId));
  const perdido = loQueTePerdiste(eventos, marca);

  useEffect(() => {
    if (eventos.length > 0) marcarVisto(campaignId, eventos[0].id);
  }, [campaignId, eventos]);

  // **Qué es «nuevo» para la animación de entrada**: lo que pasó DESPUÉS del registro que ya
  // estaba cuando llegaste. Ese no surge —treinta mensajes surgiendo a la vez al abrir dejarían de
  // significar «esto acaba de pasar»—; lo que trae el sondeo de los quince segundos, sí.
  //
  // **Los dos lados de la comparación salen del reloj del SERVIDOR**, y esa es la corrección que
  // trajo la revisión de cierre. La primera versión comparaba `createdAt` —servidor— contra
  // `Date.now()` congelado al montar —navegador—: con el reloj del servidor adelantado unos
  // segundos, o el del portátil atrasado, **animaban todos los sucesos a la vez al abrir**, que
  // es exactamente lo que este comentario dice querer evitar. Comparando `createdAt` contra el
  // `createdAt` del suceso más reciente que había al llegar, no hay dos relojes que cuadrar.
  //
  // La referencia se congela en **el primer lote que trae algo**, no en el primer pintado: la
  // mesa monta el hilo con la lista vacía mientras el registro carga (`MesaDeSesion.tsx:81`,
  // `log?.events ?? []`), así que sembrarla en el montaje la dejaría vacía para siempre y no
  // animaría nunca nada. Se siembra ajustando el estado durante el pintado —el patrón que React
  // documenta para «un estado que se deriva de una prop que cambia»—, y no desde un efecto ni
  // desde una referencia, que es lo que prohíben `react-hooks/set-state-in-effect` y
  // `react-hooks/refs`. En el pintado que la siembra `desde` todavía es `null`, así que ese
  // primer lote no anima: correcto, ya estaba ahí cuando llegaste.
  //
  // El peor caso de verdad: si el registro llega paginado y la primera página que se ve no es la
  // más reciente, un suceso podría animar una vez de más. No hay ninguno en que anime de menos.
  const [desde, setDesde] = useState<string | null>(null);
  // `eventos` llega del servidor **más reciente primero** (`reincorporarse.ts:51`), así que el
  // corte es el primero de la lista.
  const masReciente = eventos[0]?.createdAt ?? null;
  if (desde === null && masReciente !== null) setDesde(masReciente);
  const esNuevo = (creadoEn: string) => desde !== null && creadoEn > desde;

  // Un ataque no trae números propios: los toma de la tirada que lo produjo, si esa tirada está
  // en la ventana del registro que se ha pedido y este espectador puede verla.
  const porId = new Map<string, GameEventPayload>(eventos.map((e) => [e.id, e.payload]));
  const tiradaLigada = (p: GameEventPayload) =>
    p.type === "ATTACK_RESOLVED" ? (porId.get(p.rollEventId) ?? null) : null;

  // **Lo último abajo**: se pinta sobre una COPIA invertida. `eventos` no se toca nunca.
  const enOrden = [...eventos].reverse();

  // --- El anclaje al fondo ---
  //
  // `alFondo` vive en una referencia y no en un estado a propósito: se actualiza en cada píxel de
  // desplazamiento y volver a pintar el hilo entero por eso sería tirar la máquina. Lo que sí es
  // estado es el aviso, porque se ve.
  const listaRef = useRef<HTMLOListElement>(null);
  const alFondoRef = useRef(true);
  const [hayNuevoAbajo, setHayNuevoAbajo] = useState(false);

  const bajarAlFondo = useCallback(() => {
    const el = listaRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    alFondoRef.current = true;
    setHayNuevoAbajo(false);
  }, []);

  // El efecto se dispara con el id del más reciente, no con el array: la caché devuelve un array
  // nuevo en cada sondeo aunque no haya llegado nada, y anclar por eso movería la vista sin
  // motivo.
  const idMasReciente = eventos[0]?.id ?? null;
  useEffect(() => {
    const el = listaRef.current;
    if (!el || idMasReciente === null) return;
    // **Esta condición es el corazón del plan.** Si el lector se ha ido hacia arriba, no se
    // mueve nada: se le avisa y baja él si quiere.
    if (!alFondoRef.current) {
      setHayNuevoAbajo(true);
      return;
    }
    // Dos veces, y no por superstición: en el commit las medidas ya son buenas, pero una
    // tipografía que llega tarde de Google Fonts cambia la altura después de este momento y
    // dejaría el hilo un par de líneas por encima del fondo. El cuadro siguiente lo remata.
    const anclar = () => {
      el.scrollTop = el.scrollHeight;
    };
    anclar();
    const cuadro = requestAnimationFrame(anclar);
    return () => cancelAnimationFrame(cuadro);
  }, [idMasReciente]);

  const alDesplazar = (e: React.UIEvent<HTMLOListElement>) => {
    const fondo = estaAlFondo(e.currentTarget);
    alFondoRef.current = fondo;
    if (fondo) setHayNuevoAbajo(false);
  };

  const hayTexto = texto.trim().length > 0;

  const poner = async (kind: SessionNoteKind) => {
    setError(null);
    try {
      await sellar.mutateAsync({
        kind,
        text: texto.trim(),
        visibility: soloDm ? "DM_ONLY" : "PLAYERS",
      });
      setTexto("");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <PanelDeMesa
      etiqueta="Registro de la sesión"
      titulo="Registro en vivo"
      icono={<IconoRegistro className="h-4 w-4" />}
      cuerpoClassName="flex min-h-0 flex-col"
    >
      {esDm && comoUsuario && (
        <p className="mx-s3 mt-s3 shrink-0 rounded-radius-sm border border-copper px-s2 py-1 font-chrome text-chrome-xs text-copper-text">
          Estás viendo lo que ve ese jugador. No es una simulación: el servidor filtra igual que
          para él, así que ves <strong>menos</strong>, nunca más.
        </p>
      )}

      {/* Con nombre accesible a propósito: los seis botones de sellar repiten los mismos
          nombres que los títulos de los sellos del hilo, así que sin una lista que se pueda
          nombrar una prueba no distingue «el sello dice Hallazgo» de «hay un botón de
          Hallazgo». Esa confusión dejó pasar una mutación real. */}
      {/* El envoltorio existe para el aviso: flota sobre el pie del hilo, así que necesita un
          ancestro posicionado que NO sea el contenedor que scrollea —dentro se iría con el
          texto—. No lleva `aria-label` a propósito: no es una región, es una costura. */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        <ol
          ref={listaRef}
          onScroll={alDesplazar}
          aria-label="Sucesos de la sesión"
          className="scroll-quiet flex min-h-0 flex-1 flex-col overflow-y-auto px-s5 py-s4"
        >
          {enOrden.length === 0 && (
            <li className="font-chrome text-chrome-sm text-muted">
              Todavía no ha pasado nada en esta sesión.
            </li>
          )}
          {enOrden.map((e) => {
            // La franja va **encima** del primer suceso que no viste, así que se pinta antes de
            // su línea. Con el orden de conversación eso deja lo no leído **por debajo**, que es
            // exactamente lo que `loQueTePerdiste` decía querer y el orden viejo le negaba: su
            // `desde` es el más ANTIGUO de los nuevos, o sea por donde hay que seguir leyendo.
            // `role="separator"` y no un `<li>` de texto: es una marca de lectura, no un suceso
            // más de la partida, y confundirlos en la lista sería mentir sobre lo que pasó en la
            // mesa.
            const franja =
              perdido.desde === e.id ? (
                <li
                  key={`${e.id}-franja`}
                  role="separator"
                  aria-label={fraseDeLoPerdido(perdido.cuantos)}
                >
                  <p className="my-s2 flex items-center gap-s2 font-chrome text-chrome-xs uppercase tracking-widest text-copper-text">
                    <span aria-hidden="true" className="h-px flex-1 bg-copper" />
                    {fraseDeLoPerdido(perdido.cuantos)}
                    <span aria-hidden="true" className="h-px flex-1 bg-copper" />
                  </p>
                </li>
              ) : null;
            return (
              <Fragment key={e.id}>
                {franja}
                <MensajeDelHilo
                  evento={e}
                  autor={nombreDe.get(e.actorUserId) ?? "Alguien"}
                  ligada={tiradaLigada(e.payload)}
                  nuevo={esNuevo(e.createdAt)}
                />
              </Fragment>
            );
          })}
        </ol>

        {/* El aviso, y por qué existe: cuando llega algo nuevo y el lector está más arriba, la
            vista NO se mueve. Sin este botón, lo nuevo estaría fuera de pantalla sin decirlo.
            Va en `--accent`, que es el color de «esto se puede pulsar», y sobre `bg-surface`
            opaco para que se lea encima del texto del hilo. */}
        {hayNuevoAbajo && (
          <button
            type="button"
            onClick={bajarAlFondo}
            className="absolute bottom-s3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-radius-sm border border-accent bg-surface px-s3 py-1 font-chrome text-chrome-xs text-accent-text"
          >
            <IconoBajarAlFondo className="h-4 w-4" />
            Hay algo nuevo abajo
          </button>
        )}
      </div>

      {/* El compositor: **fuera del scroll**, siempre a la vista, y con la pluma delante como en
          la maqueta. Los seis botones son el envío, uno por clase de sello. */}
      <form
        className="shrink-0 border-t border-muted px-s5 py-s3"
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="flex items-end gap-s2">
          <IconoPluma className="mb-s2 h-5 w-5 shrink-0 text-copper-text" />
          <textarea
            aria-label="Qué anotar"
            placeholder="…y en dos palabras, qué pasó"
            rows={1}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className="scroll-quiet max-h-28 min-h-[2.4rem] min-w-0 flex-1 resize-none rounded-radius-sm border border-muted/30 bg-bg px-s3 py-s2 font-world text-world-base text-text placeholder:text-muted focus:border-accent"
          />
          <label className="mb-s2 flex shrink-0 items-center gap-1.5 font-chrome text-chrome-xs text-muted">
            <input
              type="checkbox"
              checked={soloDm}
              onChange={(e) => setSoloDm(e.target.checked)}
              className="accent-[var(--accent)]"
            />
            Solo el DM
          </label>
        </div>
        <div className="mt-s2 flex flex-wrap items-center gap-1.5">
          {SELLOS_EN_ORDEN.map((kind) => {
            const Icono = ICONO_SELLO[kind];
            return (
              <Button
                key={kind}
                type="button"
                variant="ghost"
                className="flex items-center gap-1.5 px-2 py-1 text-chrome-xs"
                disabled={sellar.isPending || !hayTexto}
                onClick={() => void poner(kind)}
              >
                <Icono className="h-4 w-4" />
                {NOMBRE_SELLO[kind]}
              </Button>
            );
          })}
        </div>
        {error && (
          <p role="alert" className="mt-1 font-chrome text-chrome-xs text-danger-text">
            {error}
          </p>
        )}
      </form>
    </PanelDeMesa>
  );
}
