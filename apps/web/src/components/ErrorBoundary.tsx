import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

// Task 1.18b, hallazgo 6 — "this project has been bitten by a blank screen before" (task
// 1.15's critical finding was permanent, and it was found by reading, not by using). React
// unmounts the whole tree below a throwing RENDER with no fallback of its own; without this,
// that specific failure is a white screen with no way out except reloading and hoping the URL
// still works.
//
// Fix round 1 (post-1.18b review), Important 10 — named honestly instead of left implicit,
// because a codebase whose scar is a blank screen is exactly where the next reader would
// otherwise assume this class of bug is closed. Three things this does NOT catch, because
// React's error boundaries only ever catch render-phase errors:
//   - Errors thrown inside an event handler (onClick, onSubmit, …) — React never routes these
//     here. Every mutation handler in this app catches its own instead (AccountPage.tsx,
//     LoginPage.tsx, InvitePanel.tsx, every *Editor.tsx — try/catch around the request, an
//     inline message on screen).
//   - Errors thrown inside async code (a .then/.catch, a setTimeout) — same reason, same
//     per-call try/catch is this app's only defense against them today.
//   - Server-side rendering — doesn't apply: this is a pure client bundle (Vite, no SSR,
//     docs/01-arquitectura.md). Named only so it isn't silently assumed covered by proxy.
//
// Mounted in main.tsx, around <App/> and OUTSIDE <BrowserRouter> — deliberately, so it still
// catches an error that happens before or during the router mounting, and so its own fallback
// never depends on router context it might not have. That's why "back to the campaign list"
// below navigates with a real `window.location.href` assignment (through the Button primitive,
// Fix round 1 Important 11 — it used to hand-copy Button's secondary-variant classes onto a
// raw <a>, a literal that would silently drift the first time Button changed) instead of a
// react-router Link — a full navigation also fully resets any state that caused the crash.
//
// Must be a class component: getDerivedStateFromError/componentDidCatch have no hook
// equivalent (React's own docs).
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Not swallowed: the brief's explicit requirement. console.error (not .log) so it shows up
    // red in devtools and in whatever collects console output in production, same severity
    // React's own uncaught-error logging would have used before this boundary intercepted it.
    console.error("ErrorBoundary caught a render error:", error, info.componentStack);
  }

  private handleRetry = (): void => {
    // A transient error (bad data from a request that will succeed on retry, a race the next
    // render won't hit) can recover just by re-rendering the same children — clearing state is
    // the whole mechanism, no reload required.
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-bg p-8 text-text">
          <Panel tone="chrome" className="w-full max-w-md text-center">
            <h1 className="text-chrome-xl font-bold">Se produjo un error</h1>
            <p className="mt-2 text-chrome-sm text-muted">
              Esta pantalla no pudo mostrarse. Puedes intentarlo de nuevo o volver a tus campañas.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Button type="button" onClick={this.handleRetry}>
                Reintentar
              </Button>
              {/* Fix round 1, Important 11: this used to hand-copy Button's secondary-variant
                  classes onto a raw <a> — the numbers were fine (13.68:1) but unmeasured
                  against the actual primitive, and would drift silently the first time Button
                  changed. Through Button itself instead: a real navigation via
                  window.location.href (full reload, resets whatever caused the crash), same as
                  a real <a href> would do, but provably the SAME recipe as every other
                  secondary button in the app (already measured — tokens-contrast.spec.ts's
                  "Cancelar" pair) rather than a copy of it. */}
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  window.location.href = "/";
                }}
              >
                Volver a mis campañas
              </Button>
            </div>
          </Panel>
        </div>
      );
    }
    return this.props.children;
  }
}
