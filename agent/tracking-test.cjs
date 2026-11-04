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
console.log(`${Object.keys(soll).length-falsch} richtig, ${falsch} falsch`);
process.exit(falsch?1:0);
