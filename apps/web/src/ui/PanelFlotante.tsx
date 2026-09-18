import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

// Desbordes (spec 2026-09-13, E-DB-1..5). **Un panel que se despliega vive en el `body`**, no
// dentro del contenedor que lo abre: un `absolute` dentro de un `overflow-*` queda recortado en
// los dos ejes aunque solo se pidiera recorte horizontal (§2.1: la lista de objetivos al atacar,
// 71 px fuera de `AtaquesYLanzamiento.tsx`; y el menú «…» del elenco, 79 px fuera de
// `PanelDeMesa.tsx`). El portal sale de cualquier recorte por construcción; la posición se calcula
// desde el rectángulo del disparador y se recalcula en scroll y resize.

const MARGEN = 16; // px hasta el borde de la ventana
const SEPARACION = 4; // px entre disparador y panel (el `top-[calc(100%+0.25rem)]` de antes)

export interface PanelFlotanteProps {
  abierto: boolean;
  /** El botón que lo abre: de su rectángulo sale la posición, y recibe el foco al cerrar. */
  disparador: RefObject<HTMLElement>;
  onCerrar: () => void;
  /** Sustituye al cierre por defecto con Escape (E-DB-3: cierres anidados). */
  onEscape?: () => void;
  role?: "group" | "menu" | "dialog";
  /**
   * `aria-label` del panel. Se ignora si `sinRol` es `true` (el hijo directo ya trae su propio
   * `role`/`aria-label` — dos nombres accesibles anidados con el mismo prefijo confundirían más
   * de lo que ayudan, ver `MenuDeAcciones`).
   */
  etiqueta: string;
  ancho?: string; // clases Tailwind de ancho, p. ej. "w-[21rem] max-w-[calc(100vw-2rem)]"
  alinear?: "derecha" | "izquierda"; // borde del disparador con el que se alinea; por defecto "derecha"
  className?: string;
  /**
   * El panel no pinta `role`/`aria-label` propios: solo aporta el portal, la posición fija y el
   * teclado/click-fuera/foco. Para cuando el contenido ya trae su propio nodo accesible (el
   * `ul[role="menu"]` de `MenuDeAcciones`) y un segundo nombre en el `div` envolvente duplicaría
   * el árbol de accesibilidad.
   */
  sinRol?: boolean;
  children: ReactNode;
}

export function PanelFlotante({
  abierto,
  disparador,
  onCerrar,
  onEscape,
  role = "group",
  etiqueta,
  ancho = "w-[21rem] max-w-[calc(100vw-2rem)]",
  alinear = "derecha",
  className = "",
  sinRol = false,
  children,
}: PanelFlotanteProps) {
  const caja = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const colocar = () => {
    const d = disparador.current?.getBoundingClientRect();
    const p = caja.current?.getBoundingClientRect();
    if (!d || !p) return;
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    let left = alinear === "derecha" ? d.right - p.width : d.left;
    if (left + p.width > vw - MARGEN) left = vw - MARGEN - p.width;
    if (left < MARGEN) left = MARGEN;
    let top = d.bottom + SEPARACION;
    if (top + p.height > vh - MARGEN && d.top - SEPARACION - p.height >= MARGEN) {
      top = d.top - SEPARACION - p.height; // encima si no cabe debajo
    }
    if (top + p.height > vh - MARGEN) top = Math.max(MARGEN, vh - MARGEN - p.height);
    setPos({ top, left });
  };

  useLayoutEffect(() => {
    if (abierto) colocar();
    // `colocar` lee refs (disparador/caja), no estado ni props que cambien de identidad entre
    // renders: meterla en deps la recrearía —y dispararía este efecto— en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, children]);

  useEffect(() => {
    if (!abierto) return;
    // Un consumidor que ya movió el foco a un hijo suyo al abrir (`MenuDeAcciones`, al primer
    // `menuitem`) manda: robárselo para dárselo al propio contenedor es la regresión que
    // `e2e/teclado.spec.ts` cazó — Enter abría el menú, pero el foco real quedaba en el `div`
    // del portal, no en «Condición». Solo se enfoca el contenedor cuando el foco NO está ya
    // dentro (el caso de `TirarAtaqueBoton`, que no mueve el foco por su cuenta). Ver también
    // el efecto de más abajo, keyed en `pos`: esto se repite ahí como red de seguridad —ver su
    // comentario para el porqué.
    if (!caja.current?.contains(document.activeElement)) caja.current?.focus();
    const onScroll = () => colocar();
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", onScroll);
    const onMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (caja.current?.contains(t) || disparador.current?.contains(t)) return;
      // **Fix round 2 de la barra de acciones (T22) — un panel anidado no es «fuera».**
      // `MenuQueSube` (la lista de una fila del grupo) y el panel propio de `LanzarConjuro` (o
      // la lista de objetivos de `TirarAtaqueBoton`) son dos `PanelFlotante` DISTINTOS, cada
      // uno con su propio portal a `document.body` — así que el segundo NO es descendiente del
      // primero en el DOM, aunque lo esté visualmente. Sin esta guarda, pulsar «Lanzar sobre 1»
      // (dentro del panel interno) disparaba TAMBIÉN el `mousedown` del panel EXTERNO —el
      // `<ul>` de la lista de conjuros—, que veía el clic fuera de SU `caja` y cerraba (y
      // desmontaba) el árbol entero antes de que el `click` del botón llegara a disparar
      // `mutate`: el lanzamiento nunca salía. `data-panel-flotante` marca la raíz de CUALQUIER
      // panel; un `target` que cae dentro de uno —el que sea— no es un clic fuera de este.
      if (t instanceof Element && t.closest("[data-panel-flotante]")) return;
      onCerrar();
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      window.removeEventListener("scroll", onScroll, { capture: true } as EventListenerOptions);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("mousedown", onMouseDown);
    };
    // `colocar`/`onCerrar` cierran sobre refs estables y la prop del padre; no hace falta
    // recrear el efecto entero por su identidad.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  // El foco vuelve al disparador al cerrar — lo que `TirarAtaqueBoton.cerrar` hacía a mano.
  const abiertoAntes = useRef(false);
  useEffect(() => {
    if (abiertoAntes.current && !abierto) disparador.current?.focus();
    abiertoAntes.current = abierto;
  }, [abierto, disparador]);

  // Regresión cazada por `e2e/teclado.spec.ts:226` y verificada sobre una foto del DOM: MIENTRAS
  // `pos` es `null` (el primer render, antes de que `colocar` mida el disparador) el panel se
  // pintaba con `visibility: hidden` — y un subárbol oculto así **no puede recibir el foco**:
  // ni `MenuDeAcciones` enfocando su primer `menuitem`, ni el efecto de arriba enfocando el
  // propio contenedor, conseguían nada en ese primer commit, y nadie reintentaba después de que
  // `colocar` fijara `pos` y el panel se volviera visible — el foco se quedaba, en silencio, en
  // el botón que abrió el menú. Por eso el render de abajo ya no usa `visibility: hidden` para
  // el estado "todavía sin colocar" (usa `opacity`/`pointerEvents`, que sí permiten el foco), y
  // este efecto es el reintento: en cuanto `pos` deja de ser `null`, si nadie de dentro se ha
  // quedado con el foco (sigue en el disparador, o en el `body` porque nada lo tomó), se lo
  // damos al contenedor; si ya hay un hijo enfocado (el `menuitem` de `MenuDeAcciones`), no se
  // toca — el hijo manda, igual que en el efecto de arriba.
  useEffect(() => {
    if (!abierto || !pos) return;
    const activo = document.activeElement;
    if (activo === disparador.current || activo === document.body) {
      caja.current?.focus();
    }
  }, [abierto, pos, disparador]);

  if (!abierto) return null;
  // Con `sinRol`, el hijo ya trae su propia caja visual completa (borde, fondo, sombra —
  // `MenuDeAcciones`: el `ul[role="menu"]` no cambia su aspecto al migrar) y este `div` es solo
  // el portal + la posición fija: pintar un segundo marco encima duplicaría el borde y la sombra.
  const claseVisual = sinRol
    ? ""
    : "rounded-radius-md border border-accent bg-surface p-s3 text-left shadow-[0_18px_40px_-24px_var(--sheet-shadow)]";
  return createPortal(
    <div
      ref={caja}
      data-panel-flotante=""
      role={sinRol ? undefined : role}
      aria-label={sinRol ? undefined : etiqueta}
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          (onEscape ?? onCerrar)();
        }
      }}
      // Nunca `visibility: hidden` aquí: oculta así, esta caja (y todo lo que pinte dentro,
      // como el primer `menuitem` de `MenuDeAcciones`) deja de poder recibir el foco por
      // completo, y ese primer commit —antes de que `colocar` mida el disparador y fije
      // `pos`— es exactamente cuando el consumidor intenta enfocar su primer hijo. `opacity: 0`
      // + `pointerEvents: "none"` deja la caja invisible e inerte al ratón sin tocar su
      // focusabilidad, así que ese primer intento de foco ya no cae en el vacío.
      style={
        pos
          ? { position: "fixed", top: pos.top, left: pos.left }
          : { position: "fixed", top: 0, left: 0, opacity: 0, pointerEvents: "none" }
      }
      className={`z-50 ${ancho} ${claseVisual} ${className}`}
    >
      {children}
    </div>,
    document.body,
  );
}
