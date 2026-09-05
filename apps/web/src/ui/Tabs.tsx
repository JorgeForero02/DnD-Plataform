import { useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
  /**
   * El dibujo que acompaña al rótulo, **en las dos disposiciones**. **Opcional y decorativo**:
   * va `aria-hidden`, porque el nombre accesible de la pestaña es su rótulo y meterle el icono
   * dentro obligaría a cualquier búsqueda por nombre a conocerlo.
   *
   * Ola 2 (2026-09-04): hasta hoy **solo lo pintaba `layout="sidebar"`**. El taller del DM
   * (`features/sessions/taller/TallerDelDM.tsx`) usa la tira y le pasa tres iconos, así que sus
   * tres solapas salían sin dibujo contra la maqueta y uno de los tres SVG no llegaba nunca al
   * documento. La tira ahora también lo pinta.
   */
  icon?: ReactNode;
  /**
   * Reseño 2026-09-02 — audit B4: ten tabs sat in one flat strip, so "Sesiones" — the thing
   * that happens every week — carried exactly the weight of "Documentos". A group name puts
   * the world on one side and the table on the other. Items with no group come first,
   * ungrouped.
   */
  group?: string;
  /** A short count or mark shown after the label, in the figures voice. */
  badge?: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  /** Uncontrolled by default (first item active); pass both to control it from outside. */
  active?: string;
  onChange?: (id: string) => void;
  /**
   * "sidebar" puts the tablist in a column beside its panel instead of a strip above it, and
   * switches the arrow keys to Up/Down accordingly (WAI-ARIA: a vertical tablist declares
   * aria-orientation and swaps the axis; Left/Right keep working so muscle memory survives).
   * The roles, the roving tabindex and every existing assertion in Tabs.test.tsx are identical
   * in both layouts — this is layout, not a second component.
   */
  layout?: "strip" | "sidebar";
}

// Task 1.19 — WAI-ARIA tabs pattern: one tab is Tab-reachable at a time (roving tabindex),
// Left/Right (and Home/End) move focus AND selection between tabs, matching the "automatic
// activation" variant of the pattern. Tabs.test.tsx exercises ArrowRight/ArrowLeft/Home/End;
// revert the roving-tabindex/onKeyDown wiring below and those assertions fail while a mouse
// click on each tab still works.
export function Tabs({ items, active: controlledActive, onChange, layout = "strip" }: TabsProps) {
  const [uncontrolledActive, setUncontrolledActive] = useState(items[0]?.id);
  const active = controlledActive ?? uncontrolledActive;
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  function select(id: string) {
    setUncontrolledActive(id);
    onChange?.(id);
  }

  function focusAndSelect(id: string) {
    select(id);
    tabRefs.current[id]?.focus();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | null = null;
    // Both axes move in both layouts: the vertical list declares aria-orientation so assistive
    // tech announces it correctly, but a person who reaches for Right on a sidebar still gets
    // the next tab rather than nothing.
    const forward = e.key === "ArrowRight" || (layout === "sidebar" && e.key === "ArrowDown");
    const back = e.key === "ArrowLeft" || (layout === "sidebar" && e.key === "ArrowUp");
    if (forward) nextIndex = (index + 1) % items.length;
    else if (back) nextIndex = (index - 1 + items.length) % items.length;
    else if (e.key === "Home") nextIndex = 0;
    else if (e.key === "End") nextIndex = items.length - 1;

    if (nextIndex !== null) {
      e.preventDefault();
      focusAndSelect(items[nextIndex].id);
    }
  }

  const activeItem = items.find((item) => item.id === active);

  // Groups, in the order their first member appears. Ungrouped items keep their place at the
  // front, so a list with no groups at all renders exactly as it always did.
  const groups: { name?: string; items: TabItem[] }[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.name === item.group) last.items.push(item);
    else groups.push({ name: item.group, items: [item] });
  }

  const indexOf = (item: TabItem) => items.indexOf(item);

  const tabButton = (item: TabItem) => {
    const isActive = item.id === active;
    const index = indexOf(item);
    const sidebar = layout === "sidebar";
    return (
      <button
        key={item.id}
        ref={(el) => {
          tabRefs.current[item.id] = el;
        }}
        role="tab"
        type="button"
        id={`tab-${item.id}`}
        aria-selected={isActive}
        aria-controls={`tabpanel-${item.id}`}
        tabIndex={isActive ? 0 : -1}
        onClick={() => select(item.id)}
        onKeyDown={(e) => handleKeyDown(e, index)}
        className={[
          "font-chrome text-chrome-sm font-semibold",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          sidebar
            ? // Maqueta 2026-09-03: la fila del carril respira. 1,5 px de relleno vertical
              // apretaba catorce entradas en una columna donde ninguna se distinguía de la
              // siguiente, y el icono quedaba pegado al rótulo.
              "flex w-full items-center gap-s3 rounded-radius-sm border-l-2 px-s3 py-s2 text-left"
            : // `inline-flex` y `gap-s2` para que el dibujo se siente en la misma línea que el
              // rótulo. Sin icono el resultado es idéntico al de antes: un botón con un solo
              // hijo en línea mide lo mismo en flujo que en `inline-flex`, y las pantallas que
              // usan la tira sin iconos (`rules/PanelDeReglas`, `pages/DesignTokensPage`) no
              // cambian de aspecto.
              "inline-flex items-center gap-s2 border-b-2 px-3 py-1.5",
          // border-accent (3:1, graphical) stays as-is; the label text uses --accent-text —
          // fix round 1, Critical 2: plain --accent text is only 4.5:1+ against --bg, and drops
          // under it against --surface (4.26:1 dark). --accent-text clears every dark surface.
          isActive
            ? sidebar
              ? "border-accent bg-[color:var(--accent-tint)] text-accent-text"
              : "border-accent text-accent-text"
            : "border-transparent text-muted hover:text-text",
        ].join(" ")}
      >
        {item.icon && (
          // El tamaño no es el mismo en las dos disposiciones, y sale de medir la maqueta:
          //
          //  · Carril (`sidebar`): 1em, porque el icono acompaña a un rótulo dentro de una
          //    lista de catorce entradas y tiene que crecer y menguar con el texto.
          //  · Tira (`strip`): 16 px (`size-4`), que es literalmente lo que escribe
          //    `prototipo/src/ui/Tabs.tsx:29` — `[&>svg]:size-4`. El rótulo de la tira va en
          //    `text-chrome-sm` (`--text-sm`, 0,8125rem = 13 px), así que 1em dejaría el
          //    dibujo tres píxeles por debajo de lo que la maqueta pinta. Se copia el número
          //    de la maqueta, no se reinterpreta.
          //
          // El `[&>svg]` es necesario porque los iconos de `ui/Iconos.tsx` traen su propio
          // `width="1em" height="1em"` en el SVG: dimensionar solo el `span` no los cambiaría.
          //
          // **Medido en Chromium** (2026-09-04, con el CSS emitido por `vite build`, porque
          // `jsdom` no maqueta y esto solo se ve maquetado), sobre las tres solapas del taller:
          //   · los tres dibujos salen a 16 x 16 px, que es el `size-4` de la maqueta;
          //   · el rotulo mide 13 px, o sea que 1em habria dejado el icono 3 px mas pequeno;
          //   · el boton mide 33,5 px de alto **con icono y sin icono**, y la tira entera 34,5
          //     en los dos casos: las pantallas que usan `strip` sin iconos
          //     (`rules/PanelDeReglas`, `pages/DesignTokensPage`) no se mueven ni un pixel.
          <span
            aria-hidden="true"
            className={
              sidebar
                ? "flex h-[1em] w-[1em] shrink-0 items-center"
                : "flex shrink-0 items-center [&>svg]:h-4 [&>svg]:w-4"
            }
          >
            {item.icon}
          </span>
        )}
        <span className={sidebar ? "flex-1 truncate" : "truncate"}>{item.label}</span>
        {item.badge !== undefined && (
          // aria-hidden on purpose: without it the tab's accessible name becomes "PNJ 12", so
          // assistive tech announces a number as part of the section's NAME and every
          // name-based query (ours and a user's) has to know the count to find the tab. The
          // figure is a visual convenience that duplicates what the panel itself shows once
          // opened, so hiding it from the accessibility tree loses nothing and fixes both.
          <span aria-hidden="true" className="font-data text-chrome-xs text-muted">
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  const panel = activeItem && (
    <div
      role="tabpanel"
      id={`tabpanel-${activeItem.id}`}
      aria-labelledby={`tab-${activeItem.id}`}
      tabIndex={0}
      className={layout === "sidebar" ? "min-w-0 flex-1" : "pt-3"}
    >
      {activeItem.content}
    </div>
  );

  if (layout === "sidebar") {
    return (
      // Maqueta 2026-09-03: el carril es una columna con su propio filete, no una lista
      // flotando a la izquierda del contenido. La línea vertical es lo que convierte dos
      // bloques sueltos en una pantalla con navegación propia — en la maqueta llega de arriba
      // abajo, y aquí llega hasta donde llegue el más alto de los dos, que es lo que un
      // `flex` da sin fingir alturas.
      <div className="flex flex-col gap-s5 md:flex-row md:items-stretch md:gap-s5">
        <div
          role="tablist"
          aria-orientation="vertical"
          className="flex shrink-0 flex-col gap-s5 md:w-56 md:border-r md:border-muted md:pr-s4"
        >
          {groups.map((group, gi) => (
            <div key={group.name ?? `sin-grupo-${gi}`} className="flex flex-col gap-0.5">
              {group.name && (
                <p className="mb-s2 px-s3 font-chrome text-chrome-xs uppercase tracking-[0.16em] text-copper-text">
                  {group.name}
                </p>
              )}
              {group.items.map(tabButton)}
            </div>
          ))}
        </div>
        {panel}
      </div>
    );
  }

  return (
    <div>
      <div role="tablist" className="flex flex-wrap gap-1 border-b border-muted">
        {items.map(tabButton)}
      </div>
      {panel}
    </div>
  );
}
