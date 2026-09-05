import { test, expect, type Page } from "@playwright/test";

// Plan 14, punto 14.3 — **ficha U7: el ornamento se puede apagar.**
//
// La cuadrícula y el horizonte se pintaban siempre. No se mueven, así que `prefers-reduced-motion`
// no aplica; pero sí molestan a quien lee con dificultad.
//
// **Va al navegador y no a `jsdom`** porque las dos cosas que hay que demostrar son suyas: que el
// adorno **deja de pintarse de verdad** —no que se esconda con una clase— y que **el ajuste
// sobrevive a recargar**, que es una vuelta entera por `localStorage` y por el estampado de
// `<html>` antes del primer pintado.

function nuevaCuenta() {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `ornamento-${marca}@example.com`,
    password: "password123",
    displayName: `Ornamento ${marca}`,
  };
}

async function registrarse(page: Page) {
  const cuenta = nuevaCuenta();
  await page.goto("/register");
  await page.getByLabel("Nombre").fill(cuenta.displayName);
  await page.getByLabel("Correo").fill(cuenta.email);
  await page.getByLabel("Contraseña").fill(cuenta.password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByRole("heading", { name: "Tus crónicas" })).toBeVisible();
}

test("U7 — apagado el ornamento no se pinta, y el ajuste sobrevive a recargar", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await registrarse(page);

  const cuadricula = page.locator('[data-ornamento-pieza="cuadricula"]');

  // --- De partida está, porque el ornamento SE QUIERE: lo que faltaba era poder quitarlo ---
  await expect(cuadricula).toHaveCount(1);
  // Y ocupa sitio de verdad: una capa de cero píxeles no sería el ornamento que la ficha describe.
  const caja = (await cuadricula.boundingBox())!;
  expect(caja.width).toBeGreaterThan(100);
  expect(caja.height).toBeGreaterThan(100);

  // --- Se apaga desde la cuenta ---
  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "Ornamento" })).toBeVisible();
  await page.getByRole("radio", { name: /Sin ornamento/ }).check();

  // **Deja de pintarse**, no se esconde: el nodo no está en el documento. Un adorno que sigue en el
  // DOM sigue costando y sigue pudiendo salir en una captura o en un lector.
  await expect(cuadricula).toHaveCount(0);

  // --- Y sobrevive a recargar, que es la mitad del valor ---
  await page.reload();
  await expect(page.getByRole("heading", { name: "Ornamento" })).toBeVisible();
  await expect(cuadricula).toHaveCount(0);
  await expect(page.getByRole("radio", { name: /Sin ornamento/ })).toBeChecked();
  // El atributo lo estampa `main.tsx` antes del primer pintado: sin él habría un parpadeo con el
  // adorno puesto justo para quien pidió no verlo.
  await expect(page.locator("html")).toHaveAttribute("data-ornamento", "apagado");

  // --- Y se puede volver ---
  await page.getByRole("radio", { name: /Con ornamento/ }).check();
  await page.goto("/");
  await expect(cuadricula).toHaveCount(1);
});
