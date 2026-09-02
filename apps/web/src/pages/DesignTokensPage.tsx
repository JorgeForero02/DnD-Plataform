import { useLayoutEffect, useState } from "react";
import type { Visibility } from "@dnd/shared";
import { Button } from "../ui/Button";
import { Field, fieldControlClass } from "../ui/Field";
import { Panel } from "../ui/Panel";
import { Badge } from "../ui/Badge";
import { Dialog } from "../ui/Dialog";
import { Tabs } from "../ui/Tabs";
import { ThemeToggle } from "../ui/ThemeToggle";
import { setTheme, type Theme } from "../ui/theme";
import { Markdown } from "../features/entities/Markdown";

const VISIBILITIES: Visibility[] = ["PUBLIC", "PLAYERS", "SPECIFIC_PLAYERS", "OWNER_DM", "DM_ONLY"];

const VELLUM_SAMPLE_MARKDOWN =
  "## La Posada del Pony Pisador\n\n" +
  "Un fuego bajo templado arde en la chimenea de piedra. El aire huele a estofado de venado " +
  "y a cerveza rancia. Ver el [mapa de Phandalin](#) para llegar, o preguntar por `Toblen " +
  "Stonehill` en la barra.";

// Task 1.19 — not a screen a player ever sees. This route exists so the Playwright contrast
// spec (e2e/tokens-contrast.spec.ts) has a stable page that renders every primitive and every
// visibility level at once, in whichever theme the URL asks for
// (?theme=dark|light, applied via ui/theme.ts before paint). No auth, no data dependency —
// it has to be reachable on its own so the contrast measurement never depends on seeded data.
//
// Fix round 1, Critical 2 + Important 6: the first version measured every pair against a
// convenient background (mostly --bg) and never rendered a link inside vellum or a ghost
// button inside a chrome Panel — exactly the two pairs that turned out to fail. This version
// renders the real Markdown component (not a hand-built substitute) so the link and inline
// code measured here are byte-identical to what CampaignDetailPage actually paints, adds a
// ghost button nested inside a chrome Panel, and a badge row on the same bg-slate-800 the
// real, untouched CampaignDetailPage entity rows still use (see the coverage note in the
// report — this page still doesn't cover everything the app can paint).
//
// Fix round 2: ThemeToggle mounts HERE, not app-wide (see App.tsx) — every real screen is
// still hard-pinned dark, so a global toggle would advertise a mode the app doesn't
// functionally have yet. This is the one page where flipping the theme is safe and useful:
// it is what the contrast spec's ?theme= parameter is standing in for manually when a human
// opens this route.
export function DesignTokensPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  useLayoutEffect(() => {
    const requestedTheme = new URLSearchParams(window.location.search).get("theme");
    if (requestedTheme === "dark" || requestedTheme === "light") {
      setTheme(requestedTheme as Theme);
    }
  }, []);

  return (
    <div className="min-h-screen bg-bg p-6 text-text">
      <ThemeToggle />
      <h1 className="mb-4 text-chrome-xl font-bold">Tokens — vista de control</h1>

      <section aria-label="botones" className="mb-6 flex flex-wrap gap-2">
        <Button variant="primary">Guardar</Button>
        <Button variant="secondary">Cancelar</Button>
        <Button variant="ghost">Ver más</Button>
        <Button variant="danger">Borrar</Button>
        <Button variant="primary" disabled title="Solo el DM puede crear.">
          Nuevo
        </Button>
        <Button variant="danger" disabled title="Solo el DM o quien lo creó puede editarlo.">
          Expulsar
        </Button>
      </section>

      {/* Critical 2's second pair: a ghost button's TEXT is --accent-text, but it sits on
          whatever background surrounds it — this is the case (inside a chrome Panel, i.e. on
          --surface, not --bg) that the first version never rendered anywhere. */}
      <section aria-label="ghost dentro de panel chrome" className="mb-6">
        <Panel tone="chrome">
          <Button variant="ghost">Ver detalle</Button>
        </Panel>
      </section>

      <section aria-label="badges de visibilidad" className="mb-6 flex flex-wrap gap-2">
        {VISIBILITIES.map((v) => (
          <Badge key={v} visibility={v} />
        ))}
      </section>

      {/* Important 6: the real Badge on CampaignDetailPage.tsx sits on that screen's untouched
          `bg-slate-800` row, not on --bg or --surface — a badge measured only against our own
          tokens describes a surface the badge never actually appears on in the product. This
          literal is a deliberate exception: it exists only to replicate that pre-existing,
          out-of-scope background for the measurement, not as styling choice of this page. */}
      <section aria-label="badges sobre la fila real de CampaignDetailPage" className="mb-6">
        {/* Fix round 2, item 5: the one literal Tailwind colour class in this task's own code.
            bg-slate-800 is CampaignDetailPage.tsx's real, untouched row background (entity and
            session rows, e.g. CampaignDetailPage.tsx around the entity <li> — that screen was
            never converted to tokens, on purpose, per the brief's "not a redesign" rule). It is
            copied here verbatim, not approximated with a token, because the whole point of this
            block is to measure the Badge against the EXACT colour it actually sits on in the
            product — a token stand-in would measure a surface the badge never appears on. */}
        <div className="flex flex-wrap gap-2 rounded bg-slate-800 p-3">
          {VISIBILITIES.map((v) => (
            <Badge key={`row-${v}`} visibility={v} />
          ))}
        </div>
      </section>

      <section aria-label="campo" className="mb-6 max-w-sm">
        <Field label="Nombre" error="Este campo es obligatorio.">
          <input className={fieldControlClass} />
        </Field>
      </section>

      <section aria-label="panel chrome" className="mb-6">
        <Panel tone="chrome">Panel de instrumento — listas, formularios, controles.</Panel>
      </section>

      {/* Critical 2's first pair + Important 6's inline-code pair: the real Markdown
          component, not a hand-built stand-in, so the link and the inline code measured here
          are exactly what CampaignDetailPage's entity bodies render. */}
      <section aria-label="panel vellum con markdown real" className="mb-6">
        <Markdown text={VELLUM_SAMPLE_MARKDOWN} />
      </section>

      <section aria-label="tabs" className="mb-6">
        <Tabs
          items={[
            { id: "resumen", label: "Resumen", content: <p>Contenido de resumen.</p> },
            { id: "npcs", label: "NPCs", content: <p>Contenido de NPCs.</p> },
          ]}
        />
      </section>

      <section aria-label="dialog">
        <Button variant="secondary" onClick={() => setDialogOpen(true)}>
          Abrir diálogo
        </Button>
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Confirmar borrado">
          <p className="mb-3">¿Seguro que quieres borrar este NPC?</p>
          <div className="flex gap-2">
            <Button variant="danger" onClick={() => setDialogOpen(false)}>
              Sí, borrar
            </Button>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
          </div>
        </Dialog>
      </section>
    </div>
  );
}
