import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Link } from "react-router-dom";
import { LoginPage } from "../pages/LoginPage";
import { FlashJanitor } from "../App";
import { useAuthStore } from "../store/auth.store";

function renderLoginHarness({
  strict = false,
  janitor = true,
}: { strict?: boolean; janitor?: boolean } = {}) {
  const tree = (
    <MemoryRouter initialEntries={["/login"]}>
      {janitor && <FlashJanitor />}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<Link to="/login">volver</Link>} />
      </Routes>
    </MemoryRouter>
  );
  return render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
}

describe("LoginPage", () => {
  it("renders email + password fields and submit", () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText(/correo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /entrar/i })).toBeInTheDocument();
  });

  // Fix round 1 (Task 10), Critical: el flash es de un solo uso y debe callarse cuando el
  // usuario se va sin llegar a entrar, pero limpiarlo con un `useEffect` de limpieza EN EL
  // DESMONTAJE de `LoginPage` se disparaba también al MONTAR bajo `React.StrictMode` (monta →
  // efecto → limpieza → efecto otra vez — la app entera vive dentro de `<React.StrictMode>` en
  // `main.tsx`), así que el aviso nunca llegaba a pintarse ni en desarrollo ni en Playwright. El
  // limpiado correcto es por CAMBIO DE RUTA (`FlashJanitor`, montado en `App.tsx` dentro de
  // `<BrowserRouter>`), que es idempotente bajo StrictMode: montar dos veces la misma ruta no
  // cambia `pathname`.
  describe("el flash de un solo uso", () => {
    beforeEach(() => {
      useAuthStore.setState({ flash: null });
    });

    it("bajo React.StrictMode, el flash SÍ se ve en /login", () => {
      useAuthStore.setState({ flash: "Se cerró tu sesión" });

      renderLoginHarness({ strict: true });

      expect(screen.getByRole("status")).toHaveTextContent("Se cerró tu sesión");
    });

    it("navegar a /register lo limpia, y al volver a /login no reaparece", () => {
      useAuthStore.setState({ flash: "Se cerró tu sesión" });

      renderLoginHarness();

      expect(screen.getByRole("status")).toHaveTextContent("Se cerró tu sesión");

      // Navega a otra pantalla sin haber entrado.
      fireEvent.click(screen.getByRole("link", { name: "Crear una" }));
      expect(useAuthStore.getState().flash).toBeNull();

      // Vuelve a /login.
      fireEvent.click(screen.getByRole("link", { name: "volver" }));
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
  });
});
