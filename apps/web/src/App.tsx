import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { CampaignDetailPage } from "./pages/CampaignDetailPage";
import { JoinPage } from "./pages/JoinPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthGate } from "./features/auth/AuthGate";

export function App() {
  return (
    <BrowserRouter>
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
