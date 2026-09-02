import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { CampaignDetailPage } from "./pages/CampaignDetailPage";
import { JoinPage } from "./pages/JoinPage";
import { DesignTokensPage } from "./pages/DesignTokensPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthGate } from "./features/auth/AuthGate";

export function App() {
  return (
    <BrowserRouter>
      {/* Fix round 2: ThemeToggle is deliberately NOT mounted here. Every real screen is
          hard-pinned bg-slate-900/text-slate-100 (untouched, out of this task's authority),
          so a click here would change nothing a user can see except the visibility Badge —
          which, on CampaignDetailPage's untouched bg-slate-800 row, actually gets WORSE in
          light (PUBLIC/OWNER_DM 1.10:1, the others 2.12–2.35:1; the toggle itself would sit at
          2.87:1 in light, its own way back out). A global toggle would advertise a mode this
          app does not functionally have yet and hand back a regression. ThemeToggle is still
          built, tested, and mounted on /design-tokens (see DesignTokensPage.tsx) — 1.19b
          mounts it app-wide in the same commit that makes the real screens follow the theme.
          See the report for the full reasoning. */}
      {/* AuthGate wraps every route, not just the protected ones: it's what turns a token
          that survives a reload in localStorage back into a user in memory
          (auth.store.ts, docs/01-arquitectura.md), and a token that no longer resolves can
          be discovered while sitting on any screen. It renders children immediately either
          way — see the comment in AuthGate.tsx for why that doesn't flicker. */}
      <AuthGate>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          {/* Not behind ProtectedRoute: JoinPage.tsx handles "no session yet" itself, one of
              the three paths this route has to cover. */}
          <Route path="/join/:token" element={<JoinPage />} />
          {/* Not behind ProtectedRoute either: task 1.19's token layer showcase. No player
              or DM ever navigates here — it exists for the Playwright contrast spec (see
              e2e/tokens-contrast.spec.ts). */}
          <Route path="/design-tokens" element={<DesignTokensPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/campaigns/:id"
            element={
              <ProtectedRoute>
                <CampaignDetailPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthGate>
    </BrowserRouter>
  );
}
