/* Google Apps Script fuer die Datenablage der Voyara-Studie
   (liegt bewusst nicht unter api/ - dort wuerde Vercel versuchen, es
   als Serverfunktion zu bauen)
   ====================================================================
   Einrichtung (einmalig):

     1. Ein leeres Google Sheet anlegen.
     2. Erweiterungen -> Apps Script, diesen Code einfuegen, speichern.
     3. Bereitstellen -> Neue Bereitstellung -> Typ "Web-App":
          Ausfuehren als: ich
          Zugriff: jeder
        Bereitstellen, Zugriff bestaetigen, die Web-App-URL kopieren.
     4. Die URL bei Vercel als Umgebungsvariable SHEETS_URL hinterlegen
        (Projekt -> Settings -> Environment Variables), dann neu deployen.

   Was das Script macht
   -------------------------------------------------------------------
   Zwei Blaetter, die es selbst anlegt:

     Daten       eine Zeile je Person, Spalte "teilnehmerId" als
                 Schluessel. Kommt ein Datensatz mit bekannter Nummer,
                 wird die Zeile UEBERSCHRIEBEN - so bleibt je Person
                 der letzte Stand, nicht drei Versionen.
     Verlosung   Zeitpunkt und Mail. Ohne Nummer, absichtlich.

   Neue Spalten legt es selbst an, wenn ein Datensatz Kennzahlen
   mitbringt, die es noch nicht kennt. Die Reihenfolge der Spalten ist
   die Reihenfolge ihres ersten Auftretens.

   Gleichzeitige Zugriffe
   -------------------------------------------------------------------
   Jeder Schreibzugriff holt sich zuerst die Script-Sperre. Zwei
   Personen, die in derselben Sekunde abschliessen, werden nacheinander
   geschrieben statt uebereinander. Das ist die Vorkehrung, die bei
   VERDEA fehlte. Ohne Sperre kann appendRow bei gleichzeitigen
   Aufrufen Zeilen verlieren oder vermischen.
   ================================================================== */

function doPost(e) {
  var lock = LockService.getScriptLock();
  var hatSperre = lock.tryLock(20000);        // bis zu 20 s warten
  if (!hatSperre) return antwort({ ok: false, fehler: "Sperre nicht bekommen." });

  try {
    var daten = JSON.parse(e.postData.contents);
    if (daten.art === "verlosung") return antwort(verlosungEintragen(daten));
    if (daten.art === "daten") return antwort(datenSchreiben(daten));
    return antwort({ ok: false, fehler: "Unbekannte Art." });
  } catch (fehler) {
    return antwort({ ok: false, fehler: String(fehler) });
  } finally {
    lock.releaseLock();
  }
}

// Damit die Web-App auch im Browser eine Antwort zeigt, statt einer
// Fehlerseite - hilfreich beim Einrichten
function doGet() {
  return antwort({ ok: true, hinweis: "Voyara-Datenablage laeuft. Daten kommen per POST." });
}

function antwort(objekt) {
  return ContentService.createTextOutput(JSON.stringify(objekt))
    .setMimeType(ContentService.MimeType.JSON);
}

function blatt(name, kopf) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(kopf);
    sh.setFrozenRows(1);
  }
  return sh;
}

function verlosungEintragen(daten) {
  var sh = blatt("Verlosung", ["zeit", "mail"]);
  sh.appendRow([daten.zeit || new Date().toISOString(), daten.mail]);
  return { ok: true };
}

function datenSchreiben(daten) {
  var sh = blatt("Daten", ["teilnehmerId", "aktualisiert", "punkt"]);
  var spalten = daten.spalten || {};
  spalten.json = daten.json || "";

  // Kopfzeile lesen, fehlende Spalten anhaengen
  var breite = Math.max(sh.getLastColumn(), 1);
  var kopf = sh.getRange(1, 1, 1, breite).getValues()[0].map(String);
  var neu = [];
  Object.keys(spalten).forEach(function (k) {
    if (kopf.indexOf(k) === -1) { kopf.push(k); neu.push(k); }
  });
  if (neu.length) sh.getRange(1, kopf.length - neu.length + 1, 1, neu.length).setValues([neu]);

  // Zeile der Person finden - oder anhaengen
  var zeile = 0;
  var letzte = sh.getLastRow();
  if (letzte > 1) {
    var ids = sh.getRange(2, 1, letzte - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === String(daten.teilnehmerId)) { zeile = i + 2; break; }
    }
  }
  if (!zeile) zeile = letzte + 1;

  var werte = kopf.map(function (k) {
    if (k === "teilnehmerId") return daten.teilnehmerId;
    var v = spalten[k];
    return v === undefined || v === null ? "" : v;
  });
  sh.getRange(zeile, 1, 1, kopf.length).setValues([werte]);
  return { ok: true, zeile: zeile };
}
