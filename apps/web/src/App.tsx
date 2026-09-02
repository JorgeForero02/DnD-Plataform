import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { CampaignDetailPage } from "./pages/CampaignDetailPage";
import { JoinPage } from "./pages/JoinPage";
import { DesignTokensPage } from "./pages/DesignTokensPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthGate } from "./features/auth/AuthGate";
import { ThemeToggle } from "./ui/ThemeToggle";

export function App() {
  return (
    <BrowserRouter>
      {/* Task 1.19b: ThemeToggle now mounts here, app-wide, on every route. 1.19 held it back
          deliberately — every real screen was hard-pinned to a dark Tailwind palette literal, so
          switching to light changed nothing a user could see except the visibility Badge,
          which on the untouched entity row actually got WORSE in light (measured 1.10:1). That
          screen is converted now (CampaignDetailPage.tsx and every consumer in features/ reads
          tokens, not literals), so the toggle does what it claims: the whole product follows,
          not just /design-tokens. Fixed position, outside <Routes> so it survives every
          navigation without remounting or losing its own local state. */}
      <ThemeToggle />
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
