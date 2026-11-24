/* Browserpruefungen ohne sichtbares Fenster (24.11.2026)
 *
 *   node agent/unsichtbar.cjs <lauf.js> [arm] [basis] [von] [bis]
 *
 * Ben: Die Testfenster poppen staendig auf und stoeren bei der Arbeit.
 * Faehrt dieselben Laeufe (altfehler-lauf.js, drehbuch-lauf.js) im
 * installierten Chrome ohne Fenster und mit leerem Profil. */
const fs = require("fs"), os = require("os"), path = require("path");
const npx = path.join(os.homedir(), ".npm/_npx");
const ort = fs.readdirSync(npx).map((d) => path.join(npx, d, "node_modules/playwright")).find((d) => fs.existsSync(d));
const { chromium } = require(ort);
(async () => {
  const [datei, arm = "schublade", basis = "http://localhost:8777/", von = "0", bis = "999"] = process.argv.slice(2);
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const src = fs.readFileSync(datei, "utf8")
    .replace('const BASIS = "http://localhost:8777/"', `const BASIS = "${basis}"`)
    .replace('const ARM = "schublade"', `const ARM = "${arm}"`)
    .replace("Object.keys(SZENEN);", `Object.keys(SZENEN).slice(${+von}, ${+bis});`);
  globalThis.__drehbuchBasis = basis; globalThis.__drehbuchArm = arm;
  if (process.env.NUR) globalThis.__drehbuchNur = process.env.NUR.split(",");
  try { const r = await (0, eval)("(" + src + ")")(page); console.log(typeof r === "string" ? r : JSON.stringify(r, null, 1)); }
  finally { await browser.close(); }
})().catch((e) => { console.error("ABBRUCH", e.message); process.exit(1); });
