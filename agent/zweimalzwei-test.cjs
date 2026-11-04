/* Pruefung der 2x2-Auslosung (02.11.2026).
 *
 *   node agent/zweimalzwei-test.cjs          jetziger Stand, erwartet 0 falsch
 *   node agent/zweimalzwei-test.cjs --alt    Gegenprobe gegen
 *                                            _backup/2026-11-02-vor-randomisierung/
 *
 * Geprueft wird dreierlei:
 *   1. Ohne Angabe in der Adresse wird der Arm ausgelost, und zwar nur
 *      zwischen schublade und fenster. Eine Angabe in der Adresse schlaegt
 *      die Auslosung weiter - sonst waere kein schnelles Testen moeglich.
 *   2. Die Kennzeichnung wird ueber genau zwei Stufen gelost (ohne,
 *      etikett). Die dritte Stufe "text" darf nicht vorkommen, sonst
 *      waere die Matrix 2x3.
 *   3. Beide Faktoren landen im Export, dazu die Zelle. Eine Auslosung,
 *      die nicht in den Daten steht, waere wertlos.
 */
const fs=require("fs"),vm=require("vm");
const B="/Users/tom-gabrielmielicki/Desktop/Bachelor Arbeit/Website/";
const alt=process.argv.includes("--alt");
const q=alt?B+"_backup/2026-11-02-vor-randomisierung/":B;

let gut=0,schlecht=0;
const pruefe=(name,ist,soll)=>{const a=JSON.stringify(ist),b=JSON.stringify(soll);
  if(a===b)gut++;else{schlecht++;console.log(`  FEHLT: ${name}\n    ist  ${a}\n    soll ${b}`);}};
console.log(alt?"GEGENPROBE am alten Stand":"NEUER Stand");

// --- 1. Wird der Arm ausgelost, wenn der Link keinen nennt? ------------
function armLauf(suche, gespeichert){
  const speicher={};
  if(gespeichert) speicher["voyara_agent_gruppe"]=JSON.stringify(gespeichert);
  const ctx={console,
    window:{}, document:{documentElement:{classList:{add(){},remove(){},contains:()=>false}},
      body:{classList:{add(){},remove(){},toggle(){},contains:()=>false}},
      addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>({classList:{add(){}},style:{},setAttribute(){},appendChild(){}}),head:{appendChild(){}}},
    location:{search:suche,href:"http://x/"+suche},
    sessionStorage:{getItem:(k)=>speicher[k]??null,setItem:(k,v)=>{speicher[k]=v;},removeItem:(k)=>{delete speicher[k];}},
    localStorage:{getItem:()=>null,setItem(){},removeItem(){}},
    setTimeout,clearTimeout,setInterval,clearInterval,
    requestAnimationFrame:(f)=>setTimeout(f,0), cancelAnimationFrame:()=>{},
    fetch:()=>Promise.reject(new Error("kein Netz")),navigator:{userAgent:"t"},matchMedia:()=>({matches:false,addEventListener(){}}),
    URLSearchParams, performance:{now:()=>Date.now()}, crypto:{getRandomValues:(a)=>a}};
  ctx.globalThis=ctx;ctx.self=ctx;
  vm.createContext(ctx);
  /* kern.js laeuft in diesem Stand bis zu einer Browserfunktion durch, die
     es hier nicht gibt. Der Auslosungsblock steht davor, also ist der Wert
     nach dem Abbruch bereits gesetzt - genau das wird gemessen. */
  try{ vm.runInContext(fs.readFileSync(q+"agent/kern.js","utf8"),ctx,{filename:"kern.js"}); }
  catch(e){ /* erwartet, siehe oben */ }
  vm.runInContext("this.S=typeof STELLSCHRAUBEN!=='undefined'?STELLSCHRAUBEN:null;",ctx);
  return { zugang: ctx.S?.zugang, gespeichert: speicher["voyara_agent_gruppe"] };
}
const ohneLink=[]; for(let i=0;i<60;i++){ const r=armLauf("",null); ohneLink.push(r.zugang); }
const verteilung={}; ohneLink.forEach(z=>verteilung[z]=(verteilung[z]||0)+1);
const nurArme=Object.keys(verteilung).every(z=>["schublade","fenster"].includes(z));
pruefe("ohne Link wird nur zwischen A und B gelost", nurArme, true);
pruefe("beide Arme kommen vor", Object.keys(verteilung).sort(), ["fenster","schublade"]);
pruefe("Link schlaegt die Auslosung (schublade)", armLauf("?zugang=schublade",null).zugang, "schublade");
pruefe("Link schlaegt die Auslosung (fenster)", armLauf("?zugang=fenster",null).zugang, "fenster");
pruefe("neutraler Blick bleibt moeglich", armLauf("?zugang=seitenleiste",null).zugang, "seitenleiste");
pruefe("gespeicherter Arm bleibt ueber Seitenwechsel", armLauf("",{zugang:"fenster"}).zugang, "fenster");

// --- 2. Kennzeichnung: zwei Stufen, beide kommen vor -------------------
function losLauf(){
  const ctx={console,window:{},document:{addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],
    body:{classList:{add(){},remove(){},contains:()=>false}}},
    location:{search:"",href:""},localStorage:{getItem:()=>null,setItem(){}},
    sessionStorage:{getItem:()=>null,setItem(){}},setTimeout,clearTimeout,
    fetch:()=>Promise.reject(new Error("kein Netz")),navigator:{userAgent:"t"},
    STELLSCHRAUBEN:{kennzeichnung:"zufall",partner:"beste",einladung:null}};
  ctx.globalThis=ctx;vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(B+"agent/fragebogen.js","utf8"),ctx,{filename:"fragebogen.js"});
  vm.runInContext(fs.readFileSync(B+"agent/aufgaben.js","utf8"),ctx,{filename:"aufgaben.js"});
  vm.runInContext(fs.readFileSync(q+"agent/studie.js","utf8"),ctx,{filename:"studie.js"});
  vm.runInContext("this.ST=typeof Studie!=='undefined'?Studie:null;",ctx);
  return ctx.ST;
}
const ST=losLauf();
const stufen={}; for(let i=0;i<80;i++){ const g=ST.auslosen(["a1"]); stufen[g.kennzeichnung]=(stufen[g.kennzeichnung]||0)+1; }
pruefe("Kennzeichnung wird ueber zwei Stufen gelost", Object.keys(stufen).sort(), ["etikett","ohne"]);
pruefe("die dritte Stufe kommt nicht vor", !("text" in stufen), true);

// --- 3. Landen beide Faktoren im Export? ------------------------------
const jetzt=Date.now();
ST.daten={teilnehmerId:"t_test",erstellt:jetzt,phase:1,reihenfolge:["a1"],
  einstieg:{hinweisSekunden:0,freigabe:{}},ereignisse:[],
  durchlaeufe:[{aufgabe:"a1",gestartet:jetzt,beendet:jetzt+1000,protokoll:[],verlauf:[],zwischenfragen:{}}],
  fragebogen:{},gruppe:{kennzeichnung:"ohne",offenlegung:"log",partnerBesteIn:"beide"},
  umgebung:{zugang:"fenster"},start:jetzt};
let sp={}; try{ sp=ST.auswertung("test")||{}; }catch(e){ console.log("  auswertung wirft:",e.message.slice(0,80)); }
pruefe("Spalte gruppeKennzeichnung", sp.gruppeKennzeichnung, "ohne");
pruefe("Spalte armZugang", sp.armZugang, "fenster");
pruefe("Spalte zelle", sp.zelle, "fenster|ohne");

console.log(`${gut} richtig, ${schlecht} falsch`);
process.exit(schlecht?1:0);
