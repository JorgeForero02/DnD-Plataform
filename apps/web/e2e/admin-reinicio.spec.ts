import { test, expect, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import path from "node:path";

// Ficha D8 (D-CF-18): la contraseña olvidada la reinicia un administrador desde su cuenta.
// Recorrido real: el administrador pone una temporal, el afectado —que estaba dentro— pierde la
// sesión, entra con la temporal y la cambia. Y quien no es administrador no ve el bloque.

function nuevaCuenta(prefijo: string) {
  const n = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;
  return { email: `${prefijo}${n}@b.com`, password: "password123", displayName: prefijo };
}

async function registrarse(page: Page, cuenta: ReturnType<typeof nuevaCuenta>) {
  await page.goto("/register");
  await page.getByLabel("Nombre").fill(cuenta.displayName);
  await page.getByLabel("Correo").fill(cuenta.email);
  await page.getByLabel("Contraseña").fill(cuenta.password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("heading", { name: "Tus crónicas" })).toBeVisible();
}

/** `isAdmin` se concede a mano en la base (D-CF-7); aquí, igual, por el CLI de Prisma sin shell —
 * la ruta del repositorio lleva `&` y un `shell: true` tropieza con ella (ficha `db:slot`). */
function concederAdmin(email: string) {
  const url = process.env.E2E_DATABASE_URL;
  if (!url) throw new Error("E2E_DATABASE_URL no está: la fija playwright.config.ts");
  const prisma = path.resolve(
    __dirname,
    "..",
    "..",
    "api",
    "node_modules",
    "prisma",
    "build",
    "index.js",
  );
  execFileSync(process.execPath, [prisma, "db", "execute", "--url", url, "--stdin"], {
    input: `UPDATE "User" SET "isAdmin" = true WHERE "email" = '${email}';`,
    cwd: path.resolve(__dirname, "..", "..", "api"),
    stdio: ["pipe", "ignore", "ignore"],
  });
}

test("quien no es administrador no ve el bloque de reinicio en su cuenta", async ({ page }) => {
  await registrarse(page, nuevaCuenta("normal"));
  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "Contraseña" })).toBeVisible();
  await expect(page.getByText("Reiniciar la contraseña de una cuenta")).toHaveCount(0);
});

test("el administrador reinicia la contraseña de otra cuenta, y esa cuenta entra con la temporal", async ({
  browser,
}) => {
  const admin = nuevaCuenta("admin");
  const amigo = nuevaCuenta("amigo");

  // El amigo, con sesión abierta en su propio navegador.
  const ctxAmigo = await browser.newContext();
  const pageAmigo = await ctxAmigo.newPage();
  await registrarse(pageAmigo, amigo);

  // El administrador: se registra, se le concede el permiso en la base, y recarga para que
  // `/auth/me` lo traiga.
  const ctxAdmin = await browser.newContext();
  const pageAdmin = await ctxAdmin.newPage();
  await registrarse(pageAdmin, admin);
  concederAdmin(admin.email);
  await pageAdmin.goto("/account");
  await expect(pageAdmin.getByText("Reiniciar la contraseña de una cuenta")).toBeVisible();

  // El bloque se mide, no solo se lee: cabe en la columna y no se sale de la ventana.
  const bloque = pageAdmin.getByText("Reiniciar la contraseña de una cuenta").locator("..");
  const caja = await bloque.boundingBox();
  const ventana = pageAdmin.viewportSize()!;
  expect(caja).not.toBeNull();
  expect(caja!.x + caja!.width).toBeLessThanOrEqual(ventana.width);

  await pageAdmin.getByLabel("Correo de la cuenta").fill(amigo.email);
  await pageAdmin.getByLabel("Contraseña temporal").fill("temporal-123");
  await pageAdmin.getByRole("button", { name: "Poner la temporal" }).click();
  await expect(pageAdmin.getByRole("status")).toContainText(amigo.email);

  // El amigo pierde la sesión en su siguiente petición…
  await pageAmigo.goto("/");
  await expect(pageAmigo).toHaveURL(/\/login/);
  // …y entra con la temporal.
  await pageAmigo.getByLabel("Correo").fill(amigo.email);
  await pageAmigo.getByLabel("Contraseña").fill("temporal-123");
  await pageAmigo.getByRole("button", { name: "Entrar" }).click();
  await expect(pageAmigo.getByRole("heading", { name: "Tus crónicas" })).toBeVisible();

  await ctxAmigo.close();
  await ctxAdmin.close();
});
