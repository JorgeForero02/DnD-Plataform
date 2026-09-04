// Estrato: SUPERPUESTO — chasis compartido por los paneles que se abren
// ENCIMA de la mesa. role="dialog", aria-modal, foco atrapado, cierre con Escape.
// Al cerrarlo, el llamante vuelve exactamente donde estaba.
import { useEffect, useRef, type ReactNode } from "react";
import { IconCerrar } from "./icons";

export function Dialog({
  titulo,
  subtitulo,
  onClose,
  children,
  anchura = "media",
  pergamino = false,
  acciones,
}: {
  titulo: string;
  subtitulo?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  anchura?: "estrecha" | "media" | "ancha";
  pergamino?: boolean;
  acciones?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null;
    const nodo = ref.current;
    nodo?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !nodo) return;
      const focos = nodo.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      );
      if (focos.length === 0) return;
      const primero = focos[0];
      const ultimo = focos[focos.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previo?.focus();
    };
  }, [onClose]);

  const anchos = {
    estrecha: "max-w-[26rem]",
    media: "max-w-[40rem]",
    ancha: "max-w-[58rem]",
  }[anchura];

  return (
    <div
      className="fixed inset-0 z-40 flex items-stretch justify-end bg-bg/70 backdrop-blur-[2px] anim-surge"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        tabIndex={-1}
        className={`flex h-full w-full ${anchos} flex-col border-l border-copper/30 shadow-2xl outline-none ${
          pergamino ? "vellum-texture" : "bg-surface"
        }`}
      >
        <header className="flex items-start justify-between gap-s4 border-b border-muted/20 px-s5 py-s4">
          <div>
            <h2 className={`font-title text-chrome-lg ${pergamino ? "text-copper-text" : "text-text"}`}>
              {titulo}
            </h2>
            {subtitulo && (
              <div className="mt-s1 text-chrome-xs text-muted vellum-muted">{subtitulo}</div>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar (Escape)"
            className="rounded-radius-sm p-s1 text-muted hover:text-text"
          >
            <IconCerrar className="size-5" />
          </button>
        </header>
        <div className="scroll-quiet min-h-0 flex-1 overflow-y-auto px-s5 py-s4">
          {children}
        </div>
        {acciones && (
          <footer className="flex items-center justify-end gap-s2 border-t border-muted/20 px-s5 py-s3">
            {acciones}
          </footer>
        )}
      </div>
    </div>
  );
}
