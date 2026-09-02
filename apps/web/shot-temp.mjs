import { chromium } from "@playwright/test";
const OUT = process.argv[2];
const CID = "cmtjq0gq600042as32b3wcvai";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.goto("https://dnd.supportive.pro/login", { waitUntil: "networkidle" });
await p.fill('input[type="email"]', "forero07andres@gmail.com");
await p.fill('input[type="password"]', "369582aE@");
await p.click('button[type="submit"]');
await p.waitForTimeout(2500);
await p.goto(`https://dnd.supportive.pro/campaigns/${CID}`, { waitUntil: "networkidle" });
await p.waitForTimeout(1200);
for (const tab of ["NPCs", "Sesiones", "Personajes"]) {
  await p
    .getByRole("tab", { name: tab })
    .click()
    .catch(async () => {
      await p.getByText(tab, { exact: true }).click();
    });
  await p.waitForTimeout(1400);
  await p.screenshot({ path: `${OUT}/tab-${tab}.png`, fullPage: true });
  console.log("tab", tab);
}
// entrar a una entidad
await p
  .getByRole("tab", { name: "NPCs" })
  .click()
  .catch(() => {});
await p.waitForTimeout(1000);
await p
  .getByText("Maestra Ilvara Duskryn")
  .first()
  .click()
  .catch((e) => console.log("no clic", e.message));
await p.waitForTimeout(1800);
await p.screenshot({ path: `${OUT}/entidad-detalle.png`, fullPage: true });
console.log("entidad ->", p.url());
await b.close();
