import { test, expect, type Page } from "@playwright/test";

// Migración 6 (D-CF-16, tickets I4/M2B-5) — la variante de sobrecarga (SRD 5.1, Variant:
// Encumbrance), interruptor por campaña, apagada por defecto.
//
// El recorrido que ninguna unitaria ni ninguna RTL pueden hacer entero: el DM enciende la
// variante en «Ajustes», un personaje con Fuerza 14 se carga de armaduras hasta pasar de
// 10×Fuerza (140 lb), y la hoja **y** el panel de carga tienen que decir lo mismo — «muy
// cargado», la velocidad reducida — sin que nadie haya tecleado esos números a mano.
//
// **NO se ejecuta en esta ficha** (regla del encargo): se escribe siguiendo el estilo de
// `furia.spec.ts` e `inventario.spec.ts` — mismos ayudantes, mismos selectores por rol— y la
// corre el orquestador en la tanda de cierre.

function nuevaCuenta() {
  const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    email: `sob-${marca}@example.com`,
    password: "password123",
    displayName: `Sob ${marca}`,
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
  return cuenta;
}

async function crearPersonajeConFicha(page: Page, nombre: string) {
  await page.getByRole("button", { name: "Nueva campaña" }).first().click();
  await page.getByLabel("Nombre").fill("La mesa de la sobrecarga");
  await page.getByRole("button", { name: "Crear" }).click();
  await page.getByRole("link", { name: "La mesa de la sobrecarga" }).click();

  await page.getByRole("button", { name: "Personajes" }).click();
  await page.getByRole("button", { name: "Nuevo personaje" }).click();
  await page.getByLabel("Nombre").fill(nombre);
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("button", { name: "Guardar" })).toBeHidden();

  await page.getByRole("link", { name: new RegExp(nombre) }).click();
  await expect(page.getByRole("heading", { name: nombre })).toBeVisible();

  await page.getByLabel("Raza", { exact: true }).selectOption("human");
  await page.getByLabel("Clase", { exact: true }).selectOption("fighter");
  // Fuerza 14: cargado desde 70 lb (5×14), muy cargado desde 140 lb (10×14). Dos armaduras de
  // placas (65 lb cada una, SRD 5.1) ya suman 130 lb — cargado; tres, 195 lb — muy cargado.
  const caracteristicas: [string, string][] = [
    ["Fuerza", "14"],
    ["Destreza", "12"],
    ["Constitución", "14"],
    ["Inteligencia", "10"],
    ["Sabiduría", "10"],
    ["Carisma", "8"],
  ];
  for (const [etiqueta, valor] of caracteristicas) {
    const campo = page.getByLabel(etiqueta, { exact: true });
    await campo.fill(valor);
    await campo.blur();
  }
  await expect(page.getByText("Salvaciones", { exact: true })).toBeVisible({ timeout: 15_000 });
}

/**
 * Enciende la variante de sobrecarga desde la pestaña «Ajustes» de la campaña.
 *
 * **Fix round 1 (ALTA-3).** La página del personaje (`CharacterDetailPage.tsx`) no tiene
 * pestañas — solo la miga de pan con el nombre de la campaña (`migas`, línea ~84) —, así que
 * `getByRole("tab", { name: "Ajustes" })` no encontraba nada ahí. Hay que volver a la campaña
 * primero, exactamente como hace `furia.spec.ts:117-118` para llegar a la pestaña «Sesiones».
 */
async function encenderVarianteDeSobrecarga(page: Page) {
  await page.getByRole("link", { name: "La mesa de la sobrecarga" }).click();
  await page.getByRole("tab", { name: "Ajustes" }).click();
  const interruptor = page.getByRole("group", { name: /sobrecarga/i }).first();
  // Fix round 2 (MEDIA-B) — `.check()` se investigó y se descartó, exactamente como en
  // `elegir-camino.spec.ts:104-115`: `InterruptorDeSobrecarga` (`CampaignSettings.tsx`) no ecoa
  // la elección en un estado local optimista — su `checked` sale de `update.data?.
  // encumbranceVariant ?? enabled`, que solo cambia cuando el `PATCH` vuelve del servidor. La
  // verificación de estado que hace `check()` casi en el mismo tick del clic la da por fallida
  // aunque el clic real dispare el cambio; clic + espera explícita es el patrón del directorio.
  await interruptor.getByRole("radio", { name: "Encendida" }).click();
  await expect(interruptor.getByRole("radio", { name: "Encendida" })).toBeChecked();
}

/** Añade `n` copias de un objeto del catálogo del SRD a la mochila. */
async function llevarEnLaMochila(page: Page, nombre: string, cantidad: number) {
  const inventario = page.getByRole("region", { name: "inventario" });
  await inventario.getByRole("button", { name: /Añadir objeto/ }).click();
  await inventario.getByLabel(/Buscar/).fill(nombre);
  await inventario
    .getByRole("button", { name: new RegExp(nombre) })
    .first()
    .click();
  const cantidadCampo = inventario.getByLabel(/Cantidad/i);
  if (await cantidadCampo.isVisible().catch(() => false)) {
    await cantidadCampo.fill(String(cantidad));
  }
  await inventario.getByRole("button", { name: "Añadir", exact: true }).click();
}

test("el DM enciende la variante, y un personaje con demasiado peso sale «muy cargado» con la velocidad reducida", async ({
  page,
}) => {
  await registrarse(page);
  await crearPersonajeConFicha(page, "Borin Mochilas");

  // Antes de encender nada: el panel de carga no habla de sobrecarga.
  const panelDeCarga = page.getByText("Carga", { exact: true }).locator("..");
  await expect(panelDeCarga.getByText(/variante de sobrecarga/i)).toBeHidden();

  await encenderVarianteDeSobrecarga(page);

  // Vuelve a la ficha del personaje: encender la variante no navega solo.
  await page.getByRole("button", { name: "Personajes" }).click();
  await page.getByRole("link", { name: /Borin Mochilas/ }).click();
  await expect(page.getByRole("heading", { name: "Borin Mochilas" })).toBeVisible();

  // Tres armaduras de placas en la mochila: 195 lb, sobre las 140 lb de 10×Fuerza.
  await llevarEnLaMochila(page, "Armadura de placas", 3);

  // El panel de carga dice «muy cargado», con el mismo texto que ya prueba
  // `PanelCarga.test.tsx` a nivel de componente. Acotado al `role="alert"` del panel: la caja
  // de velocidad de la hoja repite la misma frase en su resumen de traza («30 velocidad base
  // −20 muy cargado…»), y son dos nodos a propósito — lo midió la tanda del 2026-09-11.
  await expect(
    page.getByRole("alert").filter({ hasText: /muy cargado: la velocidad baja 20 pies/i }),
  ).toBeVisible({ timeout: 15_000 });

  // Y la velocidad de la hoja lo confirma: 30 pies de base menos 20 son 10, no 30.
  const cajaDeVelocidad = page.getByText("Caminar (pies)", { exact: true }).locator("..");
  await expect(cajaDeVelocidad.getByRole("button", { name: "10" })).toBeVisible();

  // La traza nombra la causa, igual que ya hace con las condiciones (catalog-y-velocidad.e2e-spec.ts).
  await cajaDeVelocidad.getByRole("button", { name: "10" }).click();
  await expect(page.getByText(/muy cargado: la velocidad baja 20 pies/i).last()).toBeVisible();
});
