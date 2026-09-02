import { chromium } from "@playwright/test";
const OUT = process.argv[2];
const CID = "cmtjq0gq600042as32b3wcvai";
const b = await chromium.launch();
for (const theme of ["dark", "light"]) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.addInitScript((t) => localStorage.setItem("dnd-theme", t), theme);
  await p.goto("https://dnd.supportive.pro/login", { waitUntil: "networkidle" });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${OUT}/n-${theme}-login.png`, fullPage: true });
  await p.getByLabel("Correo").fill("forero07andres@gmail.com");
  await p.getByLabel("Contraseña").fill("369582aE@");
  await p.getByRole("button", { name: "Entrar" }).click();
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `${OUT}/n-${theme}-panel.png`, fullPage: true });
  await p.goto(`https://dnd.supportive.pro/campaigns/${CID}`, { waitUntil: "networkidle" });
  await p.waitForTimeout(1800);
  await p.screenshot({ path: `${OUT}/n-${theme}-campana.png`, fullPage: true });
  await p.getByRole("tab", { name: "PNJ" }).click();
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${OUT}/n-${theme}-pnj.png`, fullPage: true });
  console.log(theme, "listo");
  await ctx.close();
}
await b.close();
