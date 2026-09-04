import { useState } from "react";
import { IconSol, IconLuna, IconLibro } from "./Logo";
import { ETIQUETA_DE_TEMA, TEMAS, esTema, getPreferredTheme, setTheme, type Theme } from "./theme";

function currentTheme(): Theme {
  const stamped = document.documentElement.getAttribute("data-theme");
  return esTema(stamped) ? stamped : getPreferredTheme();
}

const ICONO: Record<Theme, (p: { className?: string }) => JSX.Element> = {
  dark: IconLuna,
  light: IconSol,
  reading: IconLibro,
};

// **Qué hace cada tema**, escrito al lado de la opción y no en un texto de ayuda flotante.
// Es la mitad que la regla vinculante exige y que un alternador no puede dar: «cada una lleva
// la frase que explica qué hace» (docs/04-convenciones.md).
const PARA_QUE: Record<Theme, string> = {
  dark: "El instrumento: pizarra naval, para operar la mesa.",
  light: "Papel de día, para leer con luz alrededor.",
  reading: "Vitela cálida, para la prosa larga del mundo.",
};

// Task 1.19, fix round 1, Important 8: el tema claro existía y nada en la aplicación podía
// llegar a él — el único que llamaba a `setTheme` era el parámetro `?theme=` de
// `/design-tokens`, una ruta que no visita ningún jugador ni ningún DM. Este control es el
// acceso, montado una vez en `App.tsx`.
//
// B0 (2026-09-04): pasa de **alternador de dos** a **grupo de tres**, y no por gusto. Al
// entrar el tema «Lectura» las opciones dejaron de ser un interruptor para ser una elección
// con significado, y ahí manda la regla vinculante de `docs/04-convenciones.md`: pocas
// opciones que quieren decir cosas distintas van **visibles a la vez**, con su frase, nunca
// escondidas detrás de un control que solo enseña la siguiente. Con dos era discutible; con
// tres, un alternador obliga a pulsar a ciegas para descubrir qué hay.
//
// **Y un compromiso declarado, porque se midió.** Las tres opciones están visibles; sus
// RÓTULOS, no: van en el nombre accesible y en el título. Con los rótulos puestos el grupo
// medía más que el hueco que la cabecera le reserva y **tapaba «Salir»** — lo cazó
// `e2e/campana.spec.ts`, que hace clic ahí. Un control que impide cerrar sesión es peor que
// uno sin rótulos. El ancho es fijo (`w-[6.5rem]`) para que no dependa de cuándo cargue la
// tipografía, y `e2e/armazon.spec.ts` mide que no se solapa con la navegación. La versión con
// rótulos vuelve en B1, dentro de la banda de estado, que es donde el prototipo la pone y
// donde sí hay sitio.
// B1 / Ola 0 — **la variante «en banda»**, que es la deuda que este propio fichero se dejó
// escrita: *«La versión con rótulos vuelve en B1, dentro de la banda de estado, que es donde el
// prototipo la pone y donde sí hay sitio.»* La mesa a pantalla completa no puede llevar un
// control `fixed` en la esquina —se le pondría encima a la banda—, así que el conmutador entra
// **dentro** de la banda y `App.tsx` deja de montar el fijo en esa ruta. Es el mismo componente:
// dos alternadores serían dos estados del mismo tema, y uno de los dos acabaría mintiendo.
export function ThemeToggle({ variante = "fija" }: { variante?: "fija" | "en-banda" } = {}) {
  // Inicializador perezoso, no `useEffect` + `setState`: `index.html` y `main.tsx` ya han
  // sellado `[data-theme]` cuando esto monta, así que no hay nada asíncrono que sincronizar.
  const [theme, setThemeState] = useState<Theme>(currentTheme);

  function elegir(siguiente: Theme) {
    setTheme(siguiente);
    setThemeState(siguiente);
  }

  return (
    <div
      role="radiogroup"
      aria-label="Tema"
      className={[
        "flex items-center justify-between rounded-radius-md border border-muted/30 bg-surface p-s1",
        variante === "fija" ? "fixed right-2 top-2 z-40 w-[6.5rem]" : "shrink-0 gap-s1",
      ].join(" ")}
    >
      {TEMAS.map((t) => {
        const Icono = ICONO[t];
        const puesto = t === theme;
        return (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={puesto}
            title={`${ETIQUETA_DE_TEMA[t]} — ${PARA_QUE[t]}`}
            aria-label={ETIQUETA_DE_TEMA[t]}
            onClick={() => elegir(t)}
            className={[
              "flex items-center justify-center rounded-radius-sm px-s2 py-s1 transition-colors",
              puesto
                ? "bg-accent/10 text-accent-text"
                : "text-muted hover:bg-muted/20 hover:text-text",
            ].join(" ")}
          >
            {/* Dibujados, nunca un glifo de fuente: regla vinculante. */}
            <Icono className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
