/* Pruefung der beiden Regionsfelder zieleAuswahl und zieleAus (01.11.2026).
 *
 * Laeuft ohne Browser und ohne Modellaufruf:
 *   node agent/regionsfilter-test.cjs          der jetzige Stand, erwartet 0 falsch
 *   node agent/regionsfilter-test.cjs --alt    Gegenprobe am Stand vor der Aenderung
 *                                              (_backup/2026-11-01-vor-regionsfilter/)
 *
 * Die Gegenprobe gehoert dazu: Ohne sie waere nicht zu sehen, ob die
 * Pruefung ueberhaupt etwas merkt. Am alten Stand fallen 13 der 17 Punkte
 * durch, die uebrigen vier sind dort nur deshalb richtig, weil es die
 * Felder nicht gibt und also auch nichts verloren gehen kann.
 */
const fs=require("fs"),vm=require("vm"),path=require("path");
const B="/Users/tom-gabrielmielicki/Desktop/Bachelor Arbeit/Website/";
const alt=process.argv.includes("--alt");
const quelle=alt?B+"_backup/2026-11-01-vor-regionsfilter/":B;

const ctx={console, window:{}, document:{querySelectorAll:()=>[],querySelector:()=>null,body:{classList:{contains:()=>false,add(){},remove(){},toggle(){}}},documentElement:{classList:{add(){},remove(){}}},addEventListener(){}},
  location:{search:"",href:""}, localStorage:{getItem:()=>null,setItem(){},removeItem(){}},
  sessionStorage:{getItem:()=>null,setItem(){}}, setTimeout, clearTimeout, fetch:()=>Promise.reject(new Error("kein Netz")),
  navigator:{userAgent:"test"}, matchMedia:()=>({matches:false,addEventListener(){}})};
ctx.globalThis=ctx; ctx.self=ctx;
vm.createContext(ctx);
for(const f of ["data/ziele.js","data/hotels.js","data/inventory.js","agent/politik.js","agent/werkzeugkasten.js"]){
  const pfad=(f.startsWith("agent/")?quelle:B)+f;
  try{ vm.runInContext(fs.readFileSync(pfad,"utf8"),ctx,{filename:f}); }
  catch(e){ console.log("LADEFEHLER",f,e.message.slice(0,120)); process.exit(2); }
}
vm.runInContext("this.PK=typeof Politik!=='undefined'?Politik:null;this.WK=typeof Werkzeugkasten!=='undefined'?Werkzeugkasten:null;",ctx);
const {PK,WK}=ctx;
if(!PK||!WK){console.log("Politik oder Werkzeugkasten nicht geladen");process.exit(2);}

let gut=0,schlecht=0;
const pruefe=(name,ist,soll)=>{
  const a=JSON.stringify(ist),b=JSON.stringify(soll);
  if(a===b){gut++;} else {schlecht++;console.log(`  FEHLT: ${name}\n    ist  ${a}\n    soll ${b}`);}
};

console.log(alt?"GEGENPROBE am alten Code":"NEUER Code");

// --- zielPasst ---------------------------------------------------------
const zp=(p,id)=>typeof PK.zielPasst==="function"?PK.zielPasst(p,id):"keine Funktion";
pruefe("ohne Angabe passt jede Region", zp({}, "mallorca"), true);
pruefe("festes Ziel schliesst andere aus", zp({zielId:"mallorca"}, "kreta"), false);
pruefe("Auswahl laesst genannte zu", zp({zieleAuswahl:["mallorca","kreta"]}, "kreta"), true);
pruefe("Auswahl schliesst ungenannte aus", zp({zieleAuswahl:["mallorca","kreta"]}, "wien"), false);
pruefe("Ausschluss wirkt ohne alles andere", zp({zieleAus:["marrakesch"]}, "marrakesch"), false);
pruefe("Ausschluss laesst den Rest zu", zp({zieleAus:["marrakesch"]}, "mallorca"), true);
pruefe("Ausschluss schlaegt die Auswahl", zp({zieleAuswahl:["mallorca","kreta"],zieleAus:["kreta"]}, "kreta"), false);

// --- filterWerte: was in der Spalte angehakt wird ----------------------
const fw=(p)=>{try{return (WK.filterWerte(p).ziele||[]).slice().sort();}catch(e){return "Fehler: "+e.message;}};
pruefe("ohne Angabe keine Haken", fw({}), []);
pruefe("festes Ziel: ein Haken", fw({zielId:"kreta"}), ["kreta"]);
pruefe("Auswahl: genau diese Haken", fw({zieleAuswahl:["mallorca","kreta"]}), ["kreta","mallorca"]);
const ohneMarrakesch=fw({zieleAus:["marrakesch"]});
pruefe("Ausschluss: alle anderen angehakt", Array.isArray(ohneMarrakesch)&&ohneMarrakesch.length>=17&&!ohneMarrakesch.includes("marrakesch"), true);
pruefe("Ausschluss aus einer Auswahl", fw({zieleAuswahl:["mallorca","kreta","marrakesch"],zieleAus:["marrakesch"]}), ["kreta","mallorca"]);

// --- Lockern: eine Auswahl darf aufgehen, ein Ausschluss nie ----------
const lock=(p)=>{const q=JSON.parse(JSON.stringify(p));try{PK.lockern(q);}catch(e){}return q;};
const nachAuswahl=lock({zieleAuswahl:["wien"],mindestSterne:5,mindestbewertung:4.9,maxStrand:0.2,erwachsene:2,monat:7,naechte:7});
pruefe("Auswahl kann aufgehen", Array.isArray(nachAuswahl.zieleAuswahl), true);
let aus=null;
for(let i=0;i<12;i++){
  const q=aus||{zieleAus:["mallorca"],zieleAuswahl:["kreta"],mindestSterne:5,mindestbewertung:4.9,maxStrand:0.2,erwachsene:2,monat:7,naechte:7};
  try{PK.lockern(q);}catch(e){}
  aus=q;
}
pruefe("Ausschluss bleibt nach zwoelfmal Lockern", aus.zieleAus, ["mallorca"]);

// --- Eckdaten und Stand ----------------------------------------------
const eck=(p)=>PK.eckdaten(p).map(x=>`${x.feld}=${x.wert}`);
pruefe("Eckdaten zeigen die Auswahl", eck({zieleAuswahl:["mallorca","kreta"]}).some(x=>x.startsWith("Ziel=")&&x.includes("Mallorca")), true);
pruefe("Eckdaten zeigen den Ausschluss", eck({zieleAus:["marrakesch"]}).some(x=>x.startsWith("Nicht=")), true);
const aend=PK.aenderungen({},{zieleAus:["marrakesch"]});
pruefe("Aenderung wird vorgelesen", aend.some(x=>/ohne/.test(x)), true);


// --- Widerspruch Richtung gegen Region (01.11.2026) -------------------
const wr=(p,id,lauf)=>typeof WK.widersprichtRichtung==="function"?WK.widersprichtRichtung(p,id,lauf||null):"keine Funktion";
pruefe("Mallorca widerspricht kalt im Dezember", wr({richtung:"kalt",monat:12},"mallorca"), true);
pruefe("Lappland widerspricht kalt nicht", wr({richtung:"kalt",monat:12},"lappland"), false);
pruefe("Lappland widerspricht warm im Juli", wr({richtung:"warm",monat:7},"lappland"), true);
pruefe("ohne Monat kein Widerspruch", wr({richtung:"kalt"},"mallorca"), false);
pruefe("ohne Richtung kein Widerspruch", wr({monat:12},"mallorca"), false);
pruefe("Strand ist keine Temperaturfrage", wr({richtung:"strand",monat:7},"wien"), false);
pruefe("schon gefragt, nicht noch einmal", wr({richtung:"kalt",monat:12},"mallorca",{widerspruchGefragt:{mallorca:true}}), false);

const wf=(p,lauf)=>{const r=typeof WK.widerspruchRueckfrage==="function"?WK.widerspruchRueckfrage(p,lauf):"keine Funktion";
  return r&&r.satz?{ziel:r.ziel,chips:r.chips.length,nenntGrad:/\d+ Grad/.test(r.satz),hebtRichtungAuf:r.wirkung[r.chips[0]].richtung===null}:r;};
pruefe("Rueckfrage zum vorgemerkten Ziel",
  wf({richtung:"kalt",monat:12,zielVorgemerkt:"mallorca"},{}),
  {ziel:"mallorca",chips:2,nenntGrad:true,hebtRichtungAuf:true});
pruefe("ohne Vormerkung keine Rueckfrage", wf({richtung:"kalt",monat:12},{}), null);

// --- Engstelle: Hinweis bei 15, Frage bei 5 ---------------------------
pruefe("Schwelle fuer den Hinweis", WK.ENGSTELLE_GRENZE, 15);
// Am 03.11.2026 von 5 auf 10 angehoben, auf Wunsch des Nutzers: Unter
// acht Objekten entscheidet die Filterkette statt des Partnerlabels, und
// die Ausweitungsfrage selbst ist eine Beobachtung wert.
pruefe("Schwelle fuer die Frage", WK.ENGSTELLE_FRAGE_GRENZE, 10);
const ef=(p,lauf)=>{const r=typeof WK.engstelleRueckfrage==="function"?WK.engstelleRueckfrage(p,lauf):"keine Funktion";
  return r&&r.satz?{grund:r.grund,chips:r.chips.length,istFrage:r.satz.trim().endsWith("?"),lockert:Object.keys(r.wirkung[r.chips[0]])}:r;};
pruefe("bei drei Treffern wird gefragt",
  ef({maxStrand:0.2},{letzteEngstelle:{feld:"strand",ohne:18,jetzt:3}}),
  {grund:"strand",chips:2,istFrage:true,lockert:["maxStrand","strandEgal"]});
pruefe("bei zwoelf Treffern nicht", ef({maxStrand:0.2},{letzteEngstelle:{feld:"strand",ohne:18,jetzt:12}}), null);
pruefe("je Feld nur einmal",
  ef({maxStrand:0.2},{letzteEngstelle:{feld:"strand",ohne:18,jetzt:3},engstelleGefragt:{strand:true}}), null);
pruefe("Gruppengroesse wird nicht zum Lockern angeboten",
  ef({erwachsene:4},{letzteEngstelle:{feld:"gruppe",ohne:20,jetzt:2}}), null);

console.log(`${gut} richtig, ${schlecht} falsch`);
process.exit(schlecht?1:0);
