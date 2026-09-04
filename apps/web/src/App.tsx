import { BrowserRouter, Routes, Route, useMatch } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { CampaignDetailPage } from "./pages/CampaignDetailPage";
import { EntityDetailPage } from "./pages/EntityDetailPage";
import { CharacterDetailPage } from "./pages/CharacterDetailPage";
import { SesionPage } from "./pages/SesionPage";
import { AccountPage } from "./pages/AccountPage";
import { JoinPage } from "./pages/JoinPage";
import { DesignTokensPage } from "./pages/DesignTokensPage";
import { AcercaDePage } from "./pages/AcercaDePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthGate } from "./features/auth/AuthGate";
import { ThemeToggle } from "./ui/ThemeToggle";

// Ola 0 (2026-09-04) — **el conmutador fijo se retira de la mesa, y solo de ahí.**
//
// `ThemeToggle` se monta `fixed right-2 top-2` para toda la aplicación. La mesa pasó a ocupar la
// ventana entera y a llevar su propia banda superior, así que ahí el control fijo se le montaba
// encima. El mismo componente entra **dentro** de la banda (`variante="en-banda"`), y aquí se
// deja de pintar el fijo en esa única ruta. Dos alternadores del mismo tema serían dos estados de
// una sola cosa, y uno de los dos acabaría mintiendo.
function TemaFueraDeLaMesa() {
  const enLaMesa = useMatch("/campaigns/:id/sesion");
  if (enLaMesa) return null;
  return <ThemeToggle />;
}

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
      <TemaFueraDeLaMesa />
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
          {/* Sin ProtectedRoute a proposito: una atribucion que exige iniciar sesion no esta
              en la obra distribuida, esta detras de ella. La CC BY la pide accesible. */}
          <Route path="/acerca-de" element={<AcercaDePage />} />
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
          {/* Reseño 2026-09-02 — audit A3: an entity's name looked like a link and behaved
              like nothing at all, because there was no page to go to. Now there is, and the
              row is a real link to it. The path is in Spanish like the rest of the interface;
              /campaigns stays as it is because links to it already exist in the wild. */}
          {/* La mesa: la pantalla que se mira mientras se juega. Ruta propia para que el DM
              pueda tenerla en una pestaña aparte mientras navega el mundo en otra. */}
          <Route
            path="/campaigns/:id/sesion"
            element={
              <ProtectedRoute>
                <SesionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/campaigns/:id/entidades/:entityId"
            element={
              <ProtectedRoute>
                <EntityDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/campaigns/:id/personajes/:characterId"
            element={
              <ProtectedRoute>
                <CharacterDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <AccountPage />
              </ProtectedRoute>
            }
          />
          {/* Task 1.18b, hallazgo 6 — the wildcard this route list never had. Every path above
              is matched first (react-router tries them in order and this is last), so this only
              ever catches what none of them do: an invented URL, a stale bookmark, a typo. */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthGate>
    </BrowserRouter>
  );
}
