/* Lokale Vorschau. python3 -m http.server scheitert am Arbeitsverzeichnis,
   darum ein Server, der seine Wurzel selbst kennt. */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const WURZEL = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const TYPEN = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".svg": "image/svg+xml", ".webp": "image/webp", ".ico": "image/x-icon",
};

createServer(async (anfrage, antwort) => {
  const pfad = decodeURIComponent(new URL(anfrage.url, "http://x").pathname);
  const datei = join(WURZEL, normalize(pfad === "/" ? "/index.html" : pfad));
  if (!datei.startsWith(WURZEL)) { antwort.writeHead(403).end(); return; }
  try {
    const inhalt = await readFile(datei);
    antwort.writeHead(200, { "Content-Type": TYPEN[extname(datei)] || "application/octet-stream" });
    antwort.end(inhalt);
  } catch {
    antwort.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("nicht gefunden");
  }
}).listen(8777, () => console.log("Vorschau auf http://localhost:8777"));
