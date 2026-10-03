/* Die FAQ-Seite.
   ==================================================================
   Eine Seite, die ein Mensch lesen und der Agent durchsuchen kann.
   Beide sehen dasselbe: Der Agent faehrt beim Nachschlagen sichtbar
   zum Eintrag und hebt ihn hervor, statt die Antwort aus dem Nichts zu
   nennen - dieselbe Regel wie bei den Bewertungen.

   `?frage=<id>` oeffnet die Seite direkt beim passenden Eintrag; das
   benutzt der Agent, und es funktioniert auch als Link im Chat. */
/* Dieselben Linien-Icons wie in Kopfzeile und Karten. Vorher standen
   hier Emojis, die je nach System bunt oder grau erschienen und neben
   den Symbolen der Seite fremd wirkten. */
const FAQ_ICONS = { buchung: ICONS.check, aendern: ICONS.clock, unterkunft: ICONS.bed,
  flug: ICONS.plane, reisende: ICONS.users, preise: ICONS.tag, seite: ICONS.chat, daten: ICONS.shield };

function faqEintrag(e, offen = false) {
  return `
    <details class="faq-eintrag" id="${e.id}" ${offen ? "open" : ""}>
      <summary>${e.frage}</summary>
      <p>${e.antwort}</p>
    </details>`;
}

function faqRendern(filter = "") {
  const ziel = document.getElementById("faqInhalt");
  if (!ziel) return;
  const suche = String(filter).toLowerCase().trim();
  const passt = (e) => !suche
    || e.frage.toLowerCase().includes(suche)
    || e.antwort.toLowerCase().includes(suche)
    || (e.stichworte || []).some((w) => w.includes(suche));

  const gezeigt = FAQ.filter(passt);
  const hervor = new URLSearchParams(location.search).get("frage") || "";

  if (!gezeigt.length) {
    ziel.innerHTML = `<p class="faq-leer">Dazu steht hier nichts. Versuch ein anderes Stichwort,
      oder frag den Reise-Assistenten unten links.</p>`;
    return;
  }

  ziel.innerHTML = FAQ_THEMEN.map((t) => {
    const eintraege = gezeigt.filter((e) => e.thema === t.id);
    if (!eintraege.length) return "";
    return `
      <section class="faq-gruppe">
        <h2><span aria-hidden="true">${FAQ_ICONS[t.id] || ""}</span> ${t.label}</h2>
        ${eintraege.map((e) => faqEintrag(e, e.id === hervor)).join("")}
      </section>`;
  }).join("");

  // Beim Aufruf mit ?frage= direkt dorthin - und sichtbar markieren
  if (hervor && !suche) {
    const el = document.getElementById(hervor);
    if (el) {
      el.classList.add("faq-treffer");
      requestAnimationFrame(() => el.scrollIntoView({ block: "center", behavior: "auto" }));
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  mountChrome("faq");
  faqRendern();
  const feld = document.getElementById("faqSuche");
  feld?.addEventListener("input", () => faqRendern(feld.value));
  const zeile = document.getElementById("faqSubline");
  if (zeile && typeof FAQ !== "undefined") {
    zeile.textContent = `${FAQ.length} Antworten zu Buchung, Unterkunft, Flug und Service.`;
  }
});
