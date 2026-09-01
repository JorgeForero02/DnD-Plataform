import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { CampaignDetailPage } from "./pages/CampaignDetailPage";
import { JoinPage } from "./pages/JoinPage";
import { ProtectedRoute } from "./components/ProtectedRoute";

export function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}
