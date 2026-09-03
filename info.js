// Informationsseiten (Footer-Links). Alle Inhalte liegen hier zentral,
// damit kein Footer-Link ins Leere zeigt.

const INFO_PAGES = {
  studie: {
    title: "Hintergrund der Studie",
    body: `
      <p>Voyara ist keine echte Buchungsplattform, sondern ein Prototyp für eine wissenschaftliche Abschlussarbeit. Untersucht wird, wie Menschen mit KI-Agenten umgehen, die im Onlinehandel eigenständig Aufgaben übernehmen — von der Recherche bis zur Auswahl.</p>
      <h3>Worum geht es genau?</h3>
      <p>Der Reiseagent im linken Panel kann für dich suchen, filtern und Vorschläge machen. Uns interessiert unter anderem, wie viel Kontrolle Nutzerinnen und Nutzer abgeben möchten, wie sie die Vorschläge des Agenten prüfen und wovon ihr Vertrauen abhängt.</p>
      <h3>Sind die Angebote echt?</h3>
      <p>Nein. Alle Hotels, Ferienwohnungen, Mietwagen, Flüge, Preise und Bewertungen sind erfunden. Es können keine echten Buchungen ausgelöst werden und es fließt kein Geld.</p>`,
  },
  team: {
    title: "Forschungsteam",
    body: `
      <p>Die Studie entsteht im Rahmen einer Bachelorarbeit an einer deutschen Hochschule.</p>
      <h3>Kontakt</h3>
      <p>Bei Fragen zur Studie, zur Teilnahme oder zum Datenschutz erreichst du uns unter <a href="mailto:studie@voyara.example">studie@voyara.example</a>.</p>
      <h3>Betreuung</h3>
      <p>Die Arbeit wird von einem Lehrstuhl für Marketing und digitale Geschäftsmodelle betreut. Die Kontaktdaten der betreuenden Person findest du im Einwilligungsdokument.</p>`,
  },
  ablauf: {
    title: "Studienablauf",
    body: `
      <p>Die Teilnahme dauert ungefähr zehn bis fünfzehn Minuten und läuft in drei Schritten ab.</p>
      <h3>1. Kurze Einführung</h3>
      <p>Du erhältst eine Aufgabe, zum Beispiel: eine passende Unterkunft für einen bestimmten Zeitraum finden.</p>
      <h3>2. Nutzung der Plattform</h3>
      <p>Du bewegst dich frei auf Voyara. Der Reiseagent steht dir zur Verfügung, du kannst aber jederzeit auch selbst suchen, filtern und vergleichen.</p>
      <h3>3. Fragebogen</h3>
      <p>Zum Schluss beantwortest du einige Fragen zu deinem Erleben. Danach klären wir dich vollständig über Zweck und Aufbau der Studie auf.</p>`,
  },
  faq: {
    title: "Häufige Fragen",
    body: `
      <h3>Wie funktioniert der Reiseagent?</h3>
      <p>Du beschreibst im Panel links, was du suchst. Der Agent durchsucht den Katalog und schlägt dir passende Angebote vor. Je nach Einstellung fragt er vorher nach oder handelt direkt.</p>
      <h3>Kann ich die Vorschläge des Agenten ändern?</h3>
      <p>Ja, jederzeit. Die gesamte Seite bleibt frei bedienbar, unabhängig davon, was der Agent gerade tut.</p>
      <h3>Kostet die Nutzung etwas?</h3>
      <p>Nein. Der Vergleich und der Agent sind kostenlos, es entstehen keine Gebühren.</p>
      <h3>Woher kommen die Bewertungen?</h3>
      <p>Die Bewertungen sind für diesen Prototyp erfunden. In der Darstellung orientieren sie sich an gängigen Buchungsportalen, inklusive Teilnoten für Lage, Sauberkeit, Service und weitere Kategorien.</p>
      <h3>Was passiert mit meinen Eingaben?</h3>
      <p>Für die Auswertung werden ausschließlich anonymisierte Nutzungsdaten erfasst. Details stehen unter <a href="info.html?p=datenschutz">Datenschutz &amp; Einwilligung</a>.</p>`,
  },
  datenschutz: {
    title: "Datenschutz & Einwilligung",
    body: `
      <p>Die Teilnahme an der Studie ist freiwillig. Du kannst sie jederzeit ohne Angabe von Gründen abbrechen.</p>
      <h3>Welche Daten werden erhoben?</h3>
      <p>Erfasst werden ausschließlich anonymisierte Nutzungsdaten: welche Seiten aufgerufen werden, welche Filter gesetzt werden, wie mit dem Agenten interagiert wird und die Antworten im abschließenden Fragebogen.</p>
      <h3>Was wird nicht erhoben?</h3>
      <p>Keine Klarnamen, keine IP-Adressen, keine Zahlungsdaten. Eine Anmeldung auf dieser Seite ist eine reine Demo-Funktion — die Eingaben bleiben lokal in deinem Browser und werden nicht übertragen.</p>
      <h3>Speicherung</h3>
      <p>Die Daten werden ausschließlich für die wissenschaftliche Auswertung verwendet und nach Abschluss der Arbeit gelöscht. Eine Weitergabe an Dritte findet nicht statt.</p>`,
  },
  impressum: {
    title: "Impressum",
    body: `
      <p><strong>Angaben gemäß § 5 TMG</strong></p>
      <p>Voyara ist ein nicht-kommerzieller Studienprototyp im Rahmen einer Bachelorarbeit.<br>
      Verantwortlich für den Inhalt: die studierende Person der zugehörigen Hochschule.</p>
      <h3>Kontakt</h3>
      <p>E-Mail: <a href="mailto:studie@voyara.example">studie@voyara.example</a></p>
      <h3>Haftungshinweis</h3>
      <p>Sämtliche Angebote, Preise, Bewertungen und Unternehmen auf dieser Seite sind frei erfunden. Es besteht keine Verbindung zu real existierenden Reiseanbietern. Über diese Seite können keine Verträge geschlossen werden.</p>`,
  },
  agb: {
    title: "Allgemeine Geschäftsbedingungen",
    body: `
      <p>Diese Seite dient ausschließlich Forschungszwecken. Es kommt kein Vertragsverhältnis zustande.</p>
      <h3>1. Geltungsbereich</h3>
      <p>Voyara stellt eine simulierte Buchungsumgebung bereit. Alle dargestellten Leistungen sind fiktiv.</p>
      <h3>2. Keine Buchungen</h3>
      <p>Über die Schaltflächen dieser Seite werden keine Reisen gebucht, keine Zahlungen ausgelöst und keine Reservierungen vorgenommen.</p>
      <h3>3. Nutzung</h3>
      <p>Die Nutzung ist kostenlos. Es entstehen keinerlei Verpflichtungen für Teilnehmende.</p>`,
  },
  cookies: {
    title: "Cookie-Einstellungen",
    body: `
      <p>Voyara setzt keine Tracking- oder Werbe-Cookies ein.</p>
      <h3>Technisch notwendig</h3>
      <p>Für Merkzettel und die Demo-Anmeldung wird der lokale Speicher deines Browsers genutzt. Diese Daten verlassen dein Gerät nicht und lassen sich jederzeit löschen.</p>
      <p><button type="button" class="btn btn-ghost btn-sm" id="clearLocal">Lokale Daten dieser Seite löschen</button></p>`,
  },
  kontakt: {
    title: "Kontakt",
    body: `
      <p>Fragen zur Studie, zur Bedienung oder zum Datenschutz beantworten wir gern.</p>
      <h3>E-Mail</h3>
      <p><a href="mailto:studie@voyara.example">studie@voyara.example</a></p>
      <h3>Während der Nutzung</h3>
      <p>Der Reiseagent im linken Panel hilft dir bei Fragen zur Suche. Für technische Probleme nutze bitte die E-Mail-Adresse oben.</p>`,
  },
};

const INFO_GROUPS = [
  { label: "Über das Projekt", keys: ["studie", "team", "ablauf", "faq"] },
  { label: "Rechtliches", keys: ["datenschutz", "impressum", "agb", "cookies", "kontakt"] },
];

document.addEventListener("DOMContentLoaded", () => {
  mountChrome(null);

  const key = new URLSearchParams(window.location.search).get("p") || "studie";
  const page = INFO_PAGES[key] || INFO_PAGES.studie;

  document.title = `${page.title} — Voyara`;
  document.getElementById("breadcrumb").innerHTML =
    `<a href="index.html">Startseite</a> › <span>${page.title}</span>`;

  document.getElementById("infoNav").innerHTML = INFO_GROUPS.map((g) => `
    <div class="info-nav-group">
      <h4>${g.label}</h4>
      ${g.keys.map((k) => `<a href="info.html?p=${k}" class="${k === key ? "active" : ""}">${INFO_PAGES[k].title}</a>`).join("")}
    </div>`).join("");

  document.getElementById("infoContent").innerHTML = `<h1 style="font-size:1.4rem;color:var(--brand-900);margin-bottom:14px">${page.title}</h1>${page.body}`;

  document.getElementById("clearLocal")?.addEventListener("click", () => {
    localStorage.removeItem(Wishlist.key);
    localStorage.removeItem(Account.key);
    Wishlist.updateBadge();
    Account.refresh();
    toast("Lokale Daten gelöscht");
  });
});
