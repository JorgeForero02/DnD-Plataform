import { test, expect, type Page } from "@playwright/test";

// Task 1.18b — the one behaviour a unit test with a mock cannot honestly cover: PATCH
// /auth/password (auth.controller.ts) invalidates every token issued before the call
// (User.passwordChangedAt, docs/07-historial.md 1.18a) for REAL, server-side. A component test
// mocks the module and can only assert AccountPage.tsx *called* changePassword and rendered the
// right thing after — it can never prove the OLD TOKEN stopped working.
//
// Fix round 1 (post-1.18b review), Important 3: the first version of this file proved the old
// PASSWORD no longer logs in, which is true of any password change and would still pass with
// passwordChangedAt ripped out of jwt.strategy.ts entirely — the old token itself was never
// exercised, because the UI deletes it before the test ever touches the API again. This version
// captures the real token BEFORE the change and uses it directly against the real API
// afterwards — the one check that actually depends on invalidation, not just on the new
// password working.
function nuevaCuenta() {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `cuenta-e2e-${marca}@example.com`,
    password: "password123",
    displayName: `Cuenta E2E ${marca}`,
  };
}

async function registrarse(page: Page, cuenta: ReturnType<typeof nuevaCuenta>) {
  await page.goto("/register");
  await page.getByLabel("Nombre").fill(cuenta.displayName);
  await page.getByLabel("Email").fill(cuenta.email);
  await page.getByLabel("Password").fill(cuenta.password);
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page.getByRole("heading", { name: "Mis campañas" })).toBeVisible();
}

test("cambiar la contraseña invalida el token viejo de verdad, contra la API real", async ({
  page,
}) => {
  const cuenta = nuevaCuenta();
  await registrarse(page, cuenta);

  const tokenViejo = await page.evaluate(() => localStorage.getItem("dnd_token"));
  expect(tokenViejo).toBeTruthy();

  await page.getByRole("link", { name: "Cuenta" }).click();
  await expect(page.getByRole("heading", { name: "Cuenta" })).toBeVisible();

  const nuevaPassword = "password456";
  await page.getByLabel("Contraseña actual").fill(cuenta.password);
  await page.getByLabel("Contraseña nueva").fill(nuevaPassword);
  await page.getByRole("button", { name: "Cambiar contraseña" }).click();

  // Fix round 1, Critical 1: no click required for the token to die — it's already gone from
  // localStorage (and the request below proves the SERVER already killed it too) by the time
  // this screen has even finished navigating away.
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByText("Contraseña actualizada. Inicia sesión otra vez con tu contraseña nueva."),
  ).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("dnd_token"))).toBeNull();

  // THE proof: the token captured before the change, used directly, against the real API — not
  // inferred from the new password working. Revert passwordChangedAt's enforcement in
  // jwt.strategy.ts and this goes from 401 to 200.
  const respuestaConTokenViejo = await page.request.get("/api/auth/me", {
    headers: { Authorization: `Bearer ${tokenViejo}` },
  });
  expect(respuestaConTokenViejo.status()).toBe(401);

  // The old password is really dead too.
  await page.getByLabel("Email").fill(cuenta.email);
  await page.getByLabel("Password").fill(cuenta.password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mis campañas" })).not.toBeVisible();

  // And the new one really works.
  await page.getByLabel("Password").fill(nuevaPassword);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: "Mis campañas" })).toBeVisible();
});

test("la contraseña actual equivocada no cambia nada y no cierra la sesión", async ({ page }) => {
  const cuenta = nuevaCuenta();
  await registrarse(page, cuenta);

  const tokenAntes = await page.evaluate(() => localStorage.getItem("dnd_token"));

  await page.getByRole("link", { name: "Cuenta" }).click();
  await page.getByLabel("Contraseña actual").fill("esta-no-es-la-contraseña");
  await page.getByLabel("Contraseña nueva").fill("password456");
  await page.getByRole("button", { name: "Cambiar contraseña" }).click();

  // Fix round 1, Important 4: the raw English server string must not reach the screen.
  await expect(page.getByRole("alert")).toHaveText("La contraseña actual no es correcta.");
  // The session is untouched: same token, still on /account, still usable without a fresh
  // login.
  expect(await page.evaluate(() => localStorage.getItem("dnd_token"))).toBe(tokenAntes);
  await expect(page).toHaveURL(/\/account$/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Cuenta" })).toBeVisible();
});

test("una ruta inventada muestra la pantalla 404 con un camino de vuelta, no una pantalla en blanco", async ({
  page,
}) => {
  const cuenta = nuevaCuenta();
  await registrarse(page, cuenta);

  await page.goto("/esto-no-existe-en-ninguna-parte");
  await expect(page.getByRole("heading", { name: "Esta página no existe" })).toBeVisible();
  await expect(page.getByText("/esto-no-existe-en-ninguna-parte")).toBeVisible();

  await page.getByRole("button", { name: "Volver a mis campañas" }).click();
  await expect(page.getByRole("heading", { name: "Mis campañas" })).toBeVisible();
});

// Fix round 1 (post-1.18b review), Important 12: /campaigns/:id matches ANY segment —
// /campaigns/no-soy-un-uuid never reaches the 404 route at all (App.tsx's wildcard is ranked
// last and this route wins on specificity), it renders CampaignDetailPage with an empty <h1>
// and a tab strip of failing panels instead. This is the realistic "lost user" URL (a stale
// link, a mistyped id) the 404 route doesn't cover — CampaignDetailPage.tsx now says so itself
// when useCampaign errors.
test("un id de campaña inexistente dice que no existe, no un título vacío", async ({ page }) => {
  const cuenta = nuevaCuenta();
  await registrarse(page, cuenta);

  await page.goto("/campaigns/no-existe-esta-campana");
  await expect(
    page.getByText("Esta campaña no existe o no tienes acceso.", { exact: false }),
  ).toBeVisible();
});
