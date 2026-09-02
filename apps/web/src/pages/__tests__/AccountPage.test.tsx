import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AccountPage } from "../AccountPage";
import * as authApi from "../../features/auth/api";
import { useAuthStore } from "../../store/auth.store";
import { ApiError } from "../../lib/api";

// Renders whatever LoginPage.tsx itself reads off the auth store (`flash`) — a stub, not the
// real LoginPage, but the one thing that matters for this file is that AccountPage handed the
// message across, which this makes visible without pulling in the whole login form. Fix round 1
// (post-1.18b review), Critical 1 fix-of-the-fix: this used to read react-router navigation
// state instead — it broke in the real browser (ProtectedRoute's own <Navigate> silently wiped
// it, see auth.store.ts's `flash` field) in a way this exact stub could never have caught,
// because jsdom's MemoryRouter never exercises that race. Reading the store here now matches
// what the real LoginPage.tsx actually does.
function LoginStub() {
  const flash = useAuthStore((s) => s.flash);
  return (
    <div>
      <p>Pantalla de login</p>
      {flash && <p role="status">{flash}</p>}
    </div>
  );
}

function renderAccount() {
  return render(
    <MemoryRouter initialEntries={["/account"]}>
      <Routes>
        <Route path="/account" element={<AccountPage />} />
        <Route path="/login" element={<LoginStub />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AccountPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    useAuthStore.setState({
      token: "tok",
      user: { id: "u1", email: "a@a.com", displayName: "Alicia" },
      flash: null,
    });
    localStorage.setItem("dnd_token", "tok");
  });

  it("saves a new display name and reflects it in the store, not just on screen", async () => {
    const updated = { id: "u1", email: "a@a.com", displayName: "Alicia Renombrada" };
    const spy = vi.spyOn(authApi, "updateDisplayName").mockResolvedValue(updated);
    renderAccount();

    const input = screen.getByLabelText("Nombre") as HTMLInputElement;
    expect(input.value).toBe("Alicia");
    fireEvent.change(input, { target: { value: "Alicia Renombrada" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar nombre" }));

    await waitFor(() => expect(spy).toHaveBeenCalledWith({ displayName: "Alicia Renombrada" }));
    expect(await screen.findByText("Nombre actualizado.")).toBeInTheDocument();
    // Revert the setUser(updated) call in AccountPage.tsx and this still shows the success
    // message (the request DID succeed) but the store — what the rest of the app reads —
    // keeps the stale name.
    expect(useAuthStore.getState().user?.displayName).toBe("Alicia Renombrada");
  });

  // Fix round 1 (post-1.18b review), Important 5: opening /account directly means `user`
  // starts null (rehydration hasn't resolved yet). Revert `values` back to `defaultValues`
  // (captured once at mount) and this fails: the field stays permanently blank even after the
  // user arrives.
  it("fills in the display name once it arrives late from rehydration, not just when it's there at mount", async () => {
    useAuthStore.setState({ token: "tok", user: null });
    renderAccount();
    expect((screen.getByLabelText("Nombre") as HTMLInputElement).value).toBe("");

    act(() => {
      useAuthStore.setState({ user: { id: "u1", email: "a@a.com", displayName: "Alicia" } });
    });

    await waitFor(() =>
      expect((screen.getByLabelText("Nombre") as HTMLInputElement).value).toBe("Alicia"),
    );
  });

  it("shows the wrong-current-password failure, in Spanish, and does not touch the session", async () => {
    vi.spyOn(authApi, "changePassword").mockRejectedValue(
      new ApiError("Current password is incorrect", 401),
    );
    renderAccount();

    fireEvent.change(screen.getByLabelText("Contraseña actual"), {
      target: { value: "wrong" },
    });
    fireEvent.change(screen.getByLabelText("Contraseña nueva"), {
      target: { value: "newpassword123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cambiar contraseña" }));

    // Fix round 1, Important 4: the raw English server string must not reach the screen.
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "La contraseña actual no es correcta.",
    );
    expect(useAuthStore.getState().token).toBe("tok");
    expect(screen.queryByText("Pantalla de login")).not.toBeInTheDocument();
  });

  // Fix round 1, Important 4: the second error this screen can produce — the rate limit both
  // PATCH /auth/me and PATCH /auth/password share — was untested before this round, and its
  // raw message never told anyone to wait.
  it("translates a rate-limit response instead of showing Throttler's raw message", async () => {
    vi.spyOn(authApi, "changePassword").mockRejectedValue(
      new ApiError("ThrottlerException: Too Many Requests", 429),
    );
    renderAccount();

    fireEvent.change(screen.getByLabelText("Contraseña actual"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText("Contraseña nueva"), {
      target: { value: "newpassword123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cambiar contraseña" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Demasiados intentos. Espera un minuto y vuelve a probar.",
    );
  });

  // Fix round 1 (post-1.18b review), CRITICAL 1 — the defect the review found: the previous
  // version deferred logout() to a button click, leaving the token the server had already
  // killed sitting in localStorage (and in the store, so every request kept sending it) for as
  // long as the user stayed on the screen. This is the mechanical check: the instant the
  // request succeeds, the token must be gone from BOTH places, with no click required. Proven
  // by mutation (see the report): deferring logout() to a button turns this red.
  it("CRITICAL: clears the token from the store and localStorage the instant the change succeeds, with no click required", async () => {
    vi.spyOn(authApi, "changePassword").mockResolvedValue({ success: true });
    renderAccount();

    fireEvent.change(screen.getByLabelText("Contraseña actual"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText("Contraseña nueva"), {
      target: { value: "newpassword123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cambiar contraseña" }));

    await waitFor(() => expect(useAuthStore.getState().token).toBeNull());
    expect(localStorage.getItem("dnd_token")).toBeNull();
  });

  it("on a successful change, navigates to /login and carries the explanation across, instead of leaving it behind on a route the guard just unmounted", async () => {
    vi.spyOn(authApi, "changePassword").mockResolvedValue({ success: true });
    renderAccount();

    fireEvent.change(screen.getByLabelText("Contraseña actual"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText("Contraseña nueva"), {
      target: { value: "newpassword123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cambiar contraseña" }));

    expect(await screen.findByText("Pantalla de login")).toBeInTheDocument();
    expect(
      screen.getByText("Contraseña actualizada. Inicia sesión otra vez con tu contraseña nueva."),
    ).toBeInTheDocument();
  });

  it("shows the password rules before the server ever gets a request", () => {
    renderAccount();
    expect(screen.getByText("Al menos 8 caracteres.")).toBeInTheDocument();
  });

  // Password recovery is explicitly out of scope (brief) — there is no email service to send a
  // reset link, so no dead-end "forgot password" affordance belongs on this screen.
  it("offers no forgot-password link", () => {
    renderAccount();
    expect(screen.queryByText(/olvid(é|aste)/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /contraseña/i })).not.toBeInTheDocument();
  });
});
