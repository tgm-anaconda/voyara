/* Alles pruefen (25.11.2026) - ein Befehl vor jedem Commit.
 *
 *   node agent/alles-pruefen.cjs           alle kostenlosen Suiten
 *   node agent/alles-pruefen.cjs --seite   dazu Browserlaeufe ohne Fenster
 *                                          (lokaler Server auf 8777 noetig)
 *
 * Ben (25.11.): "Dann wird das, was wir behoben haben, wieder kaputt gemacht."
 * Deshalb zaehlt eine Aenderung erst, wenn hier nichts rot ist - auch die
 * gespeicherten Antworten des echten Modells (modellbank). */
const { execFileSync } = require("child_process"), path = require("path");
const lauf = (datei, ...args) => { try { return { aus: execFileSync("node", [path.join(__dirname, datei), ...args], { encoding: "utf8", maxBuffer: 6e7, timeout: 580000 }), code: 0 }; } catch (e) { return { aus: String(e.stdout || "") + String(e.stderr || ""), code: e.status || 1 }; } };
const zahl = (re) => (t) => { const m = t.match(re); return m ? m.slice(1).map(Number) : null; };
const voll = (t, re) => [...t.matchAll(re)].length > 0 && [...t.matchAll(re)].every((m) => m[1] === m[2]);
const SUITEN = [
  ["Modellbank (echte Antworten)", "modellbank-test.cjs", (r) => r.code === 0, /GESAMT .*/],
  ["Chips und Schreibweisen", "chip-test.cjs", (r) => voll(r.aus, /(\d+)\/(\d+)/g), /Chip allein.*/],
  ["Kern-Haertetest", "kernhaerte-test.cjs", (r) => r.code === 0 && voll(r.aus, /(\d+)\/(\d+)/g), /frage \d.*/],
  ["Annahme (Modell richtig)", "annahme-test.cjs", (r) => { const z = zahl(/GESAMT (\d+)\/(\d+)/)(r.aus); return !!z && z[0] >= 1353; }, /GESAMT .*/],
  ["Muster", "muster-test.cjs", (r) => r.code === 0, /^\d+\/\d+/m],
  ["Luecken", "luecken-test.cjs", (r) => voll(r.aus, /^(\d+)\/(\d+)/gm), /^\d+\/\d+/m],
  ["Satzbank", "satzbank-test.cjs", (r) => /GESAMT\s+96\s+\d+\s+96\s+\+0\s+96\s+9\/9/.test(r.aus) && /16\/16/.test(r.aus), /GESAMT.*/],
  ...["durchgang", "befunde", "katalog", "regionsfilter", "tracking", "zweimalzwei", "auswahlregel", "regeln", "leser", "ablehnung"].map((n) => [n, `${n}-test.cjs`, (r) => { const z = zahl(/(\d+) richtig, (\d+) falsch/)(r.aus) || (/(\d+) richtig/.test(r.aus) ? [1, 0] : null); return !!z && z[1] === 0; }, /\d+ richtig.*/]),
];
let rot = 0;
for (const [name, datei, gut, zeile] of SUITEN) {
  const r = lauf(datei), ok = gut(r); if (!ok) rot++;
  console.log(`${ok ? "OK  " : "ROT "} ${name.padEnd(30)} ${(r.aus.match(zeile) || ["keine Zahl"])[0].slice(0, 110)}`);
}
if (process.argv.includes("--seite")) for (const arm of ["schublade", "fenster"]) {
  const r = lauf("unsichtbar.cjs", path.join(__dirname, "altfehler-lauf.js"), arm); let d = null; try { d = JSON.parse(r.aus); } catch { d = null; }
  const ok = d && d.gut === d.gesamt; if (!ok) rot++;
  console.log(`${ok ? "OK  " : "ROT "} ${("Altfehler, " + arm).padEnd(30)} ${d ? `${d.gut}/${d.gesamt} ${d.schlecht.map((x) => x.n + ": " + x.verstoss[0]).join("; ")}` : r.aus.slice(0, 120)}`);
}
console.log(rot ? `\n${rot} ROT - nicht committen` : "\nAlles gruen");
process.exitCode = rot ? 1 : 0;
