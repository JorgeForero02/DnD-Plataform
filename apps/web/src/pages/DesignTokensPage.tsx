import { useLayoutEffect, useState } from "react";
import type { Visibility } from "@dnd/shared";
import { Button } from "../ui/Button";
import { Field, fieldControlClass } from "../ui/Field";
import { Panel } from "../ui/Panel";
import { Badge } from "../ui/Badge";
import { Dialog } from "../ui/Dialog";
import { Tabs } from "../ui/Tabs";
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
// code measured here are byte-identical to what CampaignDetailPage actually paints, and adds
// a ghost button nested inside a chrome Panel (see the coverage note in the report — this
// page still doesn't cover everything the app can paint).
//
// Task 1.19b: ThemeToggle no longer mounts here — it mounts once, app-wide, in App.tsx, now
// that every real screen follows the theme instead of being hard-pinned dark. This route still
// reads ?theme= itself (below), which is what the contrast spec drives directly instead of
// clicking a button; the global toggle renders on this route too, same as on every other.
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
      <h1 className="mb-4 text-chrome-xl font-bold">Tokens — vista de control</h1>

      {/* Reseño 2026-09-02 — the four voices and the copper accent, rendered here so the
          contrast spec measures them the same way it measures everything else. Copper is the
          world's accent, never an action: the spec gates its readable variant at 4.5:1 as
          text, and the plain tone at 3:1 as a rule or a fill. */}
      <section aria-label="voces tipográficas" className="mb-6 space-y-2">
        <p className="font-title text-chrome-xl" data-voice="title">
          Marcellus — títulos grabados
        </p>
        <p className="font-chrome text-chrome-base" data-voice="chrome">
          Public Sans — la voz de la herramienta
        </p>
        <p className="font-world text-world-base" data-voice="world">
          EB Garamond — la voz del mundo
        </p>
        <p className="font-data text-chrome-base" data-voice="data">
          IBM Plex Mono — 18 · CA 16 · 4d6+2
        </p>
      </section>

      <section aria-label="acento de cobre" className="mb-6 space-y-2">
        <p className="text-copper-text text-chrome-base" data-token="copper-text">
          Cobre legible — pertenece al mundo, no es un botón
        </p>
        <hr className="border-t border-copper" data-token="copper-rule" />
      </section>

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

      {/* Task 1.19b: the literal Tailwind-palette exception this section used to carry is gone —
          CampaignDetailPage.tsx's entity/session/character rows are converted (ROW_BUTTON_CLASS,
          CampaignDetailPage.tsx) and now sit on --surface with a --muted border, same as every
          other chrome row in the app. There is no more unconverted row to stand in for, so this
          renders the real token pair instead of a copied literal — still worth its own section
          because it is the one place a Badge sits inside a bordered row rather than directly on
          --bg, and that nesting is exactly what the dark-theme fix round 1 pairs above exist to
          catch. */}
      <section aria-label="badges sobre una fila de la campaña" className="mb-6">
        <div className="flex flex-wrap gap-2 rounded-radius-sm border border-muted bg-surface p-3">
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

      {/* Task 1.18b — the warning token (tokens.css). First block: rendered exactly as
          InvitePanel.tsx uses it (a bordered box that declares its OWN opaque bg-bg — it stays
          on --bg regardless of what surrounds it, since an opaque background wins compositing
          outright) — real pixels, not a convenient stand-in. Second block mirrors
          CampaignDetailPage.tsx's per-row reason: plain text-warning-text right next to a tag
          chip. Fix round 1 (post-1.18b review), Important 7: this used to sit directly on the
          page's own --bg and claimed to be "exactly as the screen paints it" — false for this
          half specifically. The real row (ROW_BUTTON_CLASS, CampaignDetailPage.tsx) is an
          OPAQUE bg-surface container, and neither span here declares its own background, so
          the effective colour it painted against was whatever ancestor supplied one — --bg, not
          --surface. Wrapped in the same bg-surface container the real row uses so the recorded
          number (7.99/5.90) is the one the screen actually paints, not 8.70/5.28. */}
      <section aria-label="advertencia" className="mb-6 max-w-sm space-y-2">
        <p className="rounded-radius-sm border border-warning bg-bg p-2 text-chrome-xs text-warning-text">
          Generar otro enlace no anula este ni los anteriores.
        </p>
        <div className="rounded-radius-sm border border-muted bg-surface p-3 text-chrome-sm">
          <span className="rounded-radius-sm border border-muted bg-surface px-1.5 py-0.5 text-chrome-xs text-muted">
            villano
          </span>
          <span className="ml-2 text-chrome-xs text-warning-text">
            Solo el DM o quien lo creó puede editarlo.
          </span>
        </div>
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
