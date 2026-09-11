import { useEffect, useId, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Button } from "./Button";
import { IconoCerrar } from "./Iconos";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /**
   * Las tres anchuras de la maqueta, con sus nombres de siempre para no tocar 24 llamadas:
   * `sm` = estrecha (26rem) · `lg` = media (40rem) · `xl` = ancha (58rem).
   */
  size?: "sm" | "lg" | "xl";
  /** Debajo del título, en la voz de la interfaz. La maqueta lo trae como ranura propia. */
  subtitulo?: ReactNode;
  /** Pie fijo del cajón: los botones que confirman. No scrollea con el contenido. */
  acciones?: ReactNode;
  /** Vitela: para leer prosa del mundo, no para operar formularios. */
  pergamino?: boolean;
  /**
   * **Hay algo escrito sin guardar** (ficha U8, plan 14).
   *
   * Cuando vale `true`, las **tres** salidas —`Escape`, el clic en el velo y el aspa— dejan de
   * cerrar directamente y preguntan primero. Con el cuerpo de una ficha dentro, cerrar sin avisar
   * es perder trabajo, y las tres salidas son igual de fáciles de rozar sin querer.
   *
   * **Solo avisa si de verdad hay cambios**, y de eso responde quien monta el cajón: un aviso que
   * salta siempre se aprende a descartar sin leer en dos días, y entonces tampoco protege el día
   * que importa. Por eso es un booleano que el consumidor calcula comparando **valores**, no un
   * «este cajón tiene formulario».
   */
  hayCambiosSinGuardar?: boolean;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// **El cajón lateral, y por qué esto cambió de forma entera (Ola 0, 2026-09-04).**
//
// Hasta hoy esta primitiva era un CUADRO CENTRADO —`items-center justify-center`, `max-h-[85vh]`,
// un panel flotando en mitad de la pantalla— y la maqueta nunca lo fue: es un **cajón que entra
// por la derecha**, a altura completa, con `border-l` de cobre. La auditoría del 2026-09-04 lo
// puso en números: **24 pantallas heredaban el patrón equivocado**, y el efecto en la mesa es el
// que el autor describió — todo «interrumpe», porque un cuadro centrado tapa el sitio donde
// estabas en vez de ponerse a su lado.
//
// La diferencia no es estética. El reseño de la mesa (§4) define el estrato superpuesto como
// *«se abre encima, Escape cierra, y vuelves exactamente donde estabas»*: con un cajón, «donde
// estabas» **sigue visible** mientras el panel está abierto. Con un cuadro centrado, no.
//
// **Lo que NO cambia**, y es lo que estas líneas defienden desde 1.19: `role="dialog"`,
// `aria-modal`, el foco atrapado dentro, Escape que cierra, y el foco devuelto al control que lo
// abrió. Dialog.test.tsx ejercita las cuatro; quitar cualquiera de ellas rompe una aserción
// mientras el marcado sigue pintándose igual.
export function Dialog({
  open,
  onClose,
  title,
  children,
  size = "sm",
  subtitulo,
  acciones,
  pergamino = false,
  hayCambiosSinGuardar = false,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);
  const titleId = useId();
  // U8 — la confirmación de salida. Vive dentro del propio cajón y no en otro superpuesto: dos
  // capas apiladas se llevarían el atrapa-foco por delante.
  const [preguntandoSalida, setPreguntandoSalida] = useState(false);

  /**
   * **La única puerta de salida.** Las tres —Escape, velo y aspa— pasan por aquí, porque si una
   * sola se saltara la pregunta bastaría con rozarla para perder lo escrito, y sería justo la que
   * nadie prueba.
   */
  const pedirCierre = () => {
    if (hayCambiosSinGuardarRef.current) {
      setPreguntandoSalida(true);
      return;
    }
    onCloseRef.current();
  };
  // Se actualiza en un efecto, no durante el render: tocar un ref mientras se pinta es
  // exactamente lo que la regla `react-hooks` prohíbe, y aquí no hace falta — el efecto del
  // teclado lee `pedirCierreRef.current` cuando alguien pulsa, siempre después del render.
  const pedirCierreRef = useRef(pedirCierre);

  // Fix round 1, Important 3: every consumer passes an inline arrow for onClose, so the
  // original `useEffect(..., [open, onClose])` tore the effect down and rebuilt it on every
  // parent re-render while the dialog was open — the cleanup yanked focus back to the trigger,
  // then the effect immediately refocused the dialog's first control. A user typing in the
  // second field of a dialog form lost focus to the first control on every keystroke that
  // re-rendered the parent. onClose now lives in a ref that's kept current on every render;
  // the effect itself depends on [open] only, so it mounts once per open/close cycle no matter
  // how many times the parent re-renders in between. Dialog.test.tsx — "keeps focus in place
  // across a parent re-render while open" — fails on the old deps array.
  const onCloseRef = useRef(onClose);
  // Misma razón que `onCloseRef`: el efecto del teclado se monta una vez con `[open]`, así que
  // leer el booleano directamente lo congelaría en el valor que tuviera al abrir — y el cajón se
  // abre siempre **sin** cambios.
  const hayCambiosSinGuardarRef = useRef(hayCambiosSinGuardar);
  useEffect(() => {
    onCloseRef.current = onClose;
    hayCambiosSinGuardarRef.current = hayCambiosSinGuardar;
    pedirCierreRef.current = pedirCierre;
  });

  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement;

    const dialogEl = dialogRef.current;
    // **El foco entra en el CONTENIDO, no en la aspa.** El cajón añade un botón de cerrar en su
    // cabecera, que en orden del DOM va antes que todo lo demás; si el foco cayera ahí, abrir un
    // formulario dejaría el cursor sobre «Cerrar» y la primera pulsación de Enter cerraría el
    // panel que acabas de abrir. Se busca el primer foco del cuerpo y solo si no hay ninguno se
    // usa el aspa, y si tampoco, el propio cajón.
    const cuerpo = dialogEl?.querySelector<HTMLElement>("[data-dialog-cuerpo]");
    const first =
      cuerpo?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ??
      dialogEl?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ??
      dialogEl;
    first?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        pedirCierreRef.current();
        return;
      }
      if (e.key !== "Tab" || !dialogEl) return;

      const nodes = Array.from(dialogEl.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (nodes.length === 0) return;
      const firstEl = nodes[0];
      const lastEl = nodes[nodes.length - 1];

      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      // Focus returns to the trigger even if the dialog is unmounted rather than closed via
      // onClose (e.g. the parent conditionally rendering it away on some other state change).
      if (triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus();
      }
    };
  }, [open]);

  if (!open) return null;

  // Los nombres de la maqueta y sus tres medidas literales
  // (`prototipo/src/ui/Dialog.tsx:88-92`). `sm`/`lg`/`xl` se conservan como llaves porque son
  // lo que escriben las 24 llamadas; lo que cambia es a cuánto miden.
  const ancho = { sm: "max-w-[26rem]", lg: "max-w-[40rem]", xl: "max-w-[58rem]" }[size];

  return (
    <div
      role="presentation"
      // El velo: `bg-[color:var(--veil)]`, un token declarado, y no `bg-bg/70`.
      //
      // **Corrección de un comentario que mentía, y conviene que quede escrito por qué.** Aquí
      // ponía que las clases de opacidad de Tailwind «no compilan en este proyecto». Eso fue
      // cierto —y por eso los diálogos salieron meses sin oscurecido detrás, solo con el
      // desenfoque—, pero **dejó de serlo en B0**: `tailwind.config.js:29-45` declara los canales
      // como `rgb(var(--x-ch) / <alpha-value>)` y `:93-95` abre la escala de opacidad entera de 0
      // a 100, porque la maqueta escribe `/15`, `/45` y `/62` y ninguno está en la lista corta que
      // Tailwind trae de fábrica. Hoy `bg-bg/70` se pintaría.
      //
      // La frase caducada estuvo a punto de costar caro: se copió a los encargos de dos carriles
      // como si fuera una restricción viva, y dos revisiones tuvieron que desmentirla midiendo el
      // CSS emitido. Es el caso exacto de «documentación que miente es peor que ausente».
      //
      // El token se queda igualmente, y ahora por su motivo de verdad: `--veil` se redefine por
      // tema, así que el velo sigue al tema en vez de ser siempre el fondo del tema oscuro.
      //
      // `justify-end` + `items-stretch`: el cajón se pega a la derecha y ocupa toda la altura.
      // Sin `p-s4`: un cajón no flota, se apoya en el borde.
      className="anim-surge fixed inset-0 z-40 flex items-stretch justify-end bg-[color:var(--veil)] backdrop-blur-[2px]"
      onClick={pedirCierre}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        // Ronda 1 de revisión (2026-09-11), hallazgo 10 — el cajón `pergamino` pinta
        // `bg-vellum text-vellum-ink` pero, sin este atributo, ninguna paleta de sheet por tema
        // (`[data-theme="reading"] [data-tone="vellum"]`, `ui/tokens.css`) llegaba a alcanzarlo:
        // en Lectura habría sido un pliego claro con todo el contenido en tinta de cromo. Sin
        // consumidor hoy (`grep` no encuentra ningún `pergamino` en uso), pero es la misma
        // trampa que ya se cerró en `Panel.tsx`, un componente al lado.
        data-tone={pergamino ? "vellum" : undefined}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        // **Dentro del cajón no hay cabecera de aplicación, así que no hay escalón.** El cajón se
        // pinta dentro del `<main>` de `AppShell`, que declara `--tira-fija-top: 4rem` para que
        // una tira `sticky` no se meta debajo de su cabecera; aquí esa cabecera no existe y
        // heredar su altura deja la tira flotando 64px por debajo del borde. Se reponen a cero
        // **aquí y no en cada contenido**: quien abre un cajón no tiene por qué saber que dentro
        // cambian las reglas de lo que se pega.
        style={{ "--tira-fija-top": "0px", "--tira-fija-pull": "0px" } as CSSProperties}
        className={[
          // `relative` para que el aviso de U8 se ancle al cajón y no al documento.
          "relative flex h-full w-full flex-col border-l border-copper font-chrome text-chrome-sm shadow-2xl outline-none",
          // `bg-vellum` / `text-vellum-ink` son los tokens que ya viste la vitela en `Panel`;
          // la TEXTURA (las dos manchas radiales de la maqueta) es de la capa visual y entra
          // con su carril.
          pergamino ? "bg-vellum font-world text-vellum-ink" : "bg-surface text-text",
          ancho,
        ].join(" ")}
      >
        <header className="flex items-start justify-between gap-s4 border-b border-muted px-s5 py-s4">
          <div className="min-w-0">
            <h2
              id={titleId}
              className={`font-title text-chrome-lg ${pergamino ? "text-copper-text" : "text-text"}`}
            >
              {title}
            </h2>
            {subtitulo && <div className="mt-s1 text-chrome-xs text-muted">{subtitulo}</div>}
          </div>
          <button
            type="button"
            onClick={pedirCierre}
            aria-label="Cerrar (Escape)"
            className="shrink-0 rounded-radius-sm p-s1 text-muted transition-colors hover:text-text"
          >
            {/* Dibujado, nunca un glifo de fuente: regla vinculante de docs/04-convenciones.md. */}
            <IconoCerrar className="h-5 w-5" />
          </button>
          {/* **El aviso de U8, dentro del propio cajón.** Va aquí y no en un segundo superpuesto
              porque dos capas apiladas se pelean por el atrapa-foco, que es exactamente el defecto
              que este componente existe para no tener.

              `alertdialog` y no `dialog`: interrumpe para pedir una decisión, y un lector de
              pantalla tiene que anunciarlo entero al aparecer.

              **Y nunca dice «¿estás seguro?»**: nombra lo que se pierde. «Seguro» se pulsa sin
              leer, y además tranquiliza justo cuando no toca. */}
          {preguntandoSalida && (
            <div
              role="alertdialog"
              aria-label="Hay cambios sin guardar"
              className="absolute inset-x-0 top-0 z-10 border-b border-warning bg-surface p-s3"
            >
              <p className="font-chrome text-chrome-sm text-text">
                Lo que has escrito aquí <strong>no se ha guardado</strong>. Si sales ahora, se
                pierde.
              </p>
              <div className="mt-s2 flex flex-wrap gap-s2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setPreguntandoSalida(false);
                    onCloseRef.current();
                  }}
                >
                  Salir y perderlo
                </Button>
                <Button type="button" variant="primary" onClick={() => setPreguntandoSalida(false)}>
                  Seguir escribiendo
                </Button>
              </div>
            </div>
          )}
        </header>

        {/* El cuerpo es lo único que scrollea. La cabecera y el pie se quedan quietos, que es
            justamente lo que un cuadro con `max-h-[85vh] overflow-y-auto` no podía dar: allí el
            título se iba hacia arriba al bajar por un formulario largo. */}
        <div data-dialog-cuerpo className="scroll-quiet min-h-0 flex-1 overflow-y-auto px-s5 py-s4">
          {children}
        </div>

        {acciones && (
          <footer className="flex items-center justify-end gap-s2 border-t border-muted px-s5 py-s3">
            {acciones}
          </footer>
        )}
      </div>
    </div>
  );
}
