// Erzeugt alle Bilder aus prompts.json ueber die OpenAI Images API.
// Drei Anfragen gleichzeitig, Ergebnisse landen direkt im richtigen Ordner.
// Bereits vorhandene Dateien werden uebersprungen — der Lauf ist also
// jederzeit abbrechbar und wiederaufnehmbar.
//
// Vorbereitung:  export OPENAI_API_KEY="sk-..."
// Aufruf:        node bilder/generate-images.mjs
// Testlauf:      node bilder/generate-images.mjs --limit 3

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(dir, "generiert");
const CONCURRENCY = 3;          // drei gleichzeitig, wie gewuenscht
const SIZE = "1536x1024";       // Querformat, reicht fuer alle Ansichten der Seite
const QUALITY = "medium";       // "low" | "medium" | "high"

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("Fehlt: OPENAI_API_KEY. Setzen mit  export OPENAI_API_KEY=\"sk-...\"");
  process.exit(1);
}

const limitArg = process.argv.indexOf("--limit");
const limit = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity;

const prompts = JSON.parse(fs.readFileSync(path.join(dir, "prompts.json"), "utf8"));

// Nur das erzeugen, was noch fehlt
const todo = prompts
  .filter((p) => !fs.existsSync(path.join(OUT, p.file)))
  .slice(0, limit);

console.log(`${prompts.length} Prompts gesamt, ${todo.length} noch offen.`);
if (!todo.length) process.exit(0);

let done = 0;
let failed = [];

async function generate(entry) {
  const target = path.join(OUT, entry.file);
  fs.mkdirSync(path.dirname(target), { recursive: true });

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-image-1",
          prompt: entry.prompt,
          size: SIZE,
          quality: QUALITY,
          n: 1,
          output_format: "png",
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        // Bei Rate-Limit warten und erneut versuchen
        if (res.status === 429 || res.status >= 500) {
          const wait = attempt * 8000;
          console.warn(`  ${entry.file}: ${res.status}, warte ${wait / 1000}s …`);
          await new Promise((r) => setTimeout(r, wait));
          continue;
        }
        throw new Error(`${res.status} ${text.slice(0, 200)}`);
      }

      const data = await res.json();
      const b64 = data?.data?.[0]?.b64_json;
      if (!b64) throw new Error("Keine Bilddaten in der Antwort");

      fs.writeFileSync(target, Buffer.from(b64, "base64"));
      done++;
      console.log(`  [${done}/${todo.length}] ${entry.file}`);
      return;
    } catch (err) {
      if (attempt === 3) {
        failed.push({ file: entry.file, error: String(err.message || err) });
        console.error(`  FEHLER ${entry.file}: ${err.message || err}`);
      }
    }
  }
}

// Einfache Warteschlange mit fester Parallelitaet
async function run() {
  const queue = [...todo];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const entry = queue.shift();
      await generate(entry);
    }
  });
  await Promise.all(workers);

  console.log(`\nFertig: ${done} erzeugt, ${failed.length} fehlgeschlagen.`);
  if (failed.length) {
    fs.writeFileSync(path.join(dir, "fehlgeschlagen.json"), JSON.stringify(failed, null, 2));
    console.log("Fehlerliste: bilder/fehlgeschlagen.json — Skript einfach erneut starten.");
  }
}

run();
