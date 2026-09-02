import { chromium } from "@playwright/test";
const OUT = process.argv[2];
const CID = "cmtjq0gq600042as32b3wcvai";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 950 } });
const p = await ctx.newPage();
await p.addInitScript(() => localStorage.setItem("dnd-theme", "dark"));
await p.goto("https://dnd.supportive.pro/login", { waitUntil: "networkidle" });
await p.getByLabel("Correo").fill("forero07andres@gmail.com");
await p.getByLabel("Contraseña").fill("369582aE@");
await p.getByRole("button", { name: "Entrar" }).click();
await p.waitForTimeout(2500);
await p.goto(`https://dnd.supportive.pro/campaigns/${CID}?seccion=NPC`, {
  waitUntil: "networkidle",
});
await p.waitForTimeout(1500);
await p.screenshot({ path: `${OUT}/f-lista.png`, fullPage: true });
await p.getByRole("link", { name: /Maestra Ilvara/ }).click();
await p.waitForTimeout(2000);
await p.screenshot({ path: `${OUT}/f-ficha.png`, fullPage: true });
await p.goto(`https://dnd.supportive.pro/campaigns/${CID}?seccion=characters`, {
  waitUntil: "networkidle",
});
await p.waitForTimeout(1500);
await p.getByRole("link", { name: /Thorn/ }).click();
await p.waitForTimeout(2000);
await p.screenshot({ path: `${OUT}/f-hoja.png`, fullPage: true });
console.log("listo", p.url());
await b.close();
