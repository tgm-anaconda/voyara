/* Pruefung der Tracking-Spalten zur Filterkombination (01.11.2026).
 *
 *   node agent/tracking-test.cjs          jetziger Stand, erwartet 0 falsch
 *   node agent/tracking-test.cjs --alt    Gegenprobe gegen
 *                                         _backup/2026-11-02-vor-tracking/
 *
 * Gespielt wird ein Protokoll, in dem jemand sich von 41 auf 3 Haeuser
 * heruntergefiltert hat, zweimal einen Engstellen-Hinweis bekam, einmal
 * gefragt wurde und einmal eine Region genannt hat, die der Richtung
 * widersprach. Genau diese Faelle soll die Auswertung spaeter
 * unterscheiden koennen.
 */
const fs=require("fs"),vm=require("vm");
const B="/Users/tom-gabrielmielicki/Desktop/Bachelor Arbeit/Website/";
const alt=process.argv.includes("--alt");
const quelle=alt?B+"_backup/2026-11-02-vor-tracking/":B;
const src=fs.readFileSync(B+"agent/fragebogen.js","utf8")+"\n"+fs.readFileSync(B+"agent/aufgaben.js","utf8")+"\n"+fs.readFileSync(quelle+"agent/studie.js","utf8");
const ctx={console,window:{},document:{addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],body:{classList:{add(){},remove(){},contains:()=>false}}},
  location:{search:"",href:""},localStorage:{getItem:()=>null,setItem(){}},sessionStorage:{getItem:()=>null,setItem(){}},
  setTimeout,clearTimeout,fetch:()=>Promise.reject(new Error("kein Netz")),navigator:{userAgent:"t"}};
ctx.globalThis=ctx;vm.createContext(ctx);
vm.runInContext(src,ctx,{filename:"studie.js"});
vm.runInContext("this.ST=typeof Studie!=='undefined'?Studie:null;",ctx);
const ST=ctx.ST;
if(!ST){console.log("Studie nicht geladen");process.exit(2);}

const protokoll=[
 {ereignis:"suche",weg:"katalog",treffer:41,filter:"Oktober, 2 Erwachsene, Halbpension"},
 {ereignis:"engstelle_hinweis",feld:"strand",treffer:8,ohne:41},
 {ereignis:"suche",weg:"seite",treffer:8,filter:"Oktober, 2 Erwachsene, Halbpension, Strand bis 1 km"},
 {ereignis:"engstelle_hinweis",feld:"strand",treffer:3,ohne:18},
 {ereignis:"engstelle_rueckfrage",feld:"strand",treffer:3},
 {ereignis:"widerspruch_rueckfrage",ziel:"mallorca",richtung:"kalt"},
 {ereignis:"ziel_vorgemerkt",ziel:"mallorca",richtung:"kalt"},
 {ereignis:"suche",weg:"seite",treffer:3,filter:"Oktober, 2 Erwachsene, Halbpension, Strand bis 1 km, kalte Regionen"},
];
const jetzt=Date.now();
protokoll.forEach((e,i)=>{e.t=jetzt+i*1000;});
ST.daten={teilnehmerId:"t_test",erstellt:jetzt,phase:1,reihenfolge:["a"],einstieg:{hinweisSekunden:0,freigabe:{}},ereignisse:[],
  durchlaeufe:[{aufgabe:"a",gestartet:jetzt,beendet:jetzt+60000,protokoll,verlauf:[],zwischenfragen:{}}],
  fragebogen:{},gruppe:{},start:jetzt,ende:jetzt+60000};
let sp={};
try{ sp=ST.auswertung("test")||{}; }catch(e){ console.log("auswertung wirft:",e.message.slice(0,100)); }
const neu=Object.keys(sp).filter(k=>/filterKombination|trefferMinimum|trefferZuletzt|suchlaeufe|engstelle|widerspruchFragen|regionVorgemerkt/.test(k));
console.log(alt?"GEGENPROBE am alten Stand":"NEUER Stand");
console.log("neue Spalten:",neu.length);
neu.sort().forEach(k=>console.log("  "+k+" = "+JSON.stringify(sp[k])));
const soll={a1_filterKombination:"Oktober, 2 Erwachsene, Halbpension, Strand bis 1 km, kalte Regionen",
  a1_suchlaeufe:3,a1_trefferZuletzt:3,a1_trefferMinimum:3,a1_engstelleHinweise:2,a1_engstelleEngsteZahl:3,
  a1_engstelleFelder:"strand",a1_engstelleFragen:1,a1_widerspruchFragen:1,a1_regionVorgemerkt:"mallorca"};
let falsch=0;
for(const k of Object.keys(soll)){ if(JSON.stringify(sp[k])!==JSON.stringify(soll[k])){falsch++;console.log(`  FALSCH ${k}: ist ${JSON.stringify(sp[k])}, soll ${JSON.stringify(soll[k])}`);} }

/* Jeder gezaehlte Ereignisname muss auch geschrieben werden (15.11.2026).
   ====================================================================
   Gefunden beim Durchgang am 15.11.2026: `warumKlicks` zaehlte
   `"warum"`, der Kern notiert aber `"warum_gefragt"`. Die Spalte stand
   bei JEDER Person auf 0, und das faellt nicht auf - eine Null ist ein
   plausibler Wert. Genau dieselbe Form wie der Tippfehler im
   Leer-Zustands-Selektor drei Tage vorher: zwei Stellen, die
   uebereinstimmen muessen, und nur eine wurde gepflegt.

   Also nachgesehen statt gehofft: Jeder Name, den `auswertung` zaehlt,
   muss irgendwo im Projekt als Ereignis geschrieben werden. Geprueft
   wird gegen den Quelltext, weil die Schreibstellen ueber sechs Dateien
   verteilt sind und in vier Formen vorkommen (notieren, melden,
   Studie.notieren, direkter Push ins Protokoll). */
{
  /* ALLE Dateien, nicht eine gepflegte Liste.
     ------------------------------------------------------------------
     Erster Versuch hatte elf Dateien fest eingetippt, `fluege.js` fehlte,
     und die Pruefung meldete zwei Ereignisse als tot, die es nicht sind.
     Eine Wache gegen "zwei Stellen muessen uebereinstimmen", die selbst
     eine zweite Stelle pflegt, ist keine. */
  const sammeln = (ordner) => fs.readdirSync(ordner, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".js") && !e.name.includes("-test"))
    .map((e) => ordner + "/" + e.name);
  const quellen = [...sammeln(B.replace(/\/$/, "")), ...sammeln(B + "agent")]
    .filter((q) => !q.includes("_backup"));
  let text = "";
  for (const q of quellen) { try { text += fs.readFileSync(q, "utf8"); } catch { /* Datei fehlt */ } }
  const st = fs.readFileSync(B + "agent/studie.js", "utf8");
  const gezaehlt = new Set();
  for (const m of st.matchAll(/zaehle\(\s*\w+\s*,\s*"([a-z0-9_]+)"/g)) gezaehlt.add(m[1]);
  /* Gesucht wird die SCHREIBSTELLE, nicht das blosse Vorkommen.
     ------------------------------------------------------------------
     Erster Versuch fragte nur, ob der Name irgendwo als Zeichenkette
     steht. Damit bestand die Pruefung auch mit dem wieder eingebauten
     Fehler: "warum" steht als Stoppwort in politik.js und faq.js. Eine
     Wache, die auf jedes Vorkommen anspringt, prueft nichts.

     Ereignisse werden in vier Formen geschrieben, alle hier abgedeckt:
     notieren("x"), melden("x"), Studie.notieren?.("x") und der direkte
     Push mit ereignis: "x". */
  const schreibt = (name) => {
    const n = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?:notieren|melden|notieren\\?\\.)\\(\\s*["'\`]${n}["'\`]`).test(text)
      || new RegExp(`ereignis:\\s*["'\`]${n}["'\`]`).test(text);
  };
  const tot = [];
  for (const name of gezaehlt) if (!schreibt(name)) tot.push(name);
  if (tot.length) { falsch += tot.length; console.log("  FALSCH gezaehlte Ereignisse, die nie geschrieben werden: " + tot.join(", ")); }
  else console.log(`  ${gezaehlt.size} gezaehlte Ereignisnamen, alle werden auch geschrieben`);
}
console.log(`${Object.keys(soll).length-falsch} richtig, ${falsch} falsch`);
process.exit(falsch?1:0);
