/* Luecken-Pruefung (24.11.2026): erfundene Werte, die eine Ziffer aus
   einer frueheren Nachricht durchliess. Gefunden beim Nachspielen der alten
   Fehler.   node agent/luecken-test.cjs   (Gegenprobe: VOYARA_QUELLE=...) */
const { laden } = require("./satzbank-daten.cjs");
const { WK } = laden();
const kern=(p,msgs,frage)=>({lauf:{profil:p,gespraech:msgs.flatMap(m=>[{role:"assistant",content:"Frage"},{role:"user",content:m}]),protokoll:[],annahmeOffen:[],gefragtWie:{},verlauf:[],nachrichtArt:"antwort",runde:1,zugSeit:77,gefragt:frage,zuletztGefragt:frage,gefragtVorher:frage},notieren(e,d){this.lauf.protokoll.push({ereignis:e,...d})},freigabe:()=>"suchen",darf:()=>false,logZeile(){},sagen(){},standAnzeigen(){},sichern(){},standKurz:()=>"",antwortWerten(){},gespraechPush(){},sagenUndMerken(){}});
const J={monat:7,naechte:10,vonPerson:{monat:true,naechte:true}};
const F=[
 ["Alter erfunden nach '10 Nächte'",J,["10 Nächte","ich meine frau und meine zwei kleinen"],"reisende",{erwachsene:2,kinder:2,kinderAlter:[3,5]},p=>!(p.kinderAlter||[]).length],
 ["Alter erfunden, Ziffer in derselben Nachricht",J,["ich, meine frau und 2 kleine"],"reisende",{erwachsene:2,kinder:2,kinderAlter:[3,5]},p=>!(p.kinderAlter||[]).length],
 ["Alter erfunden, 'nächstes Jahr'",J,["wir wollen nächstes jahr weg","ich und meine zwei kinder"],"reisende",{erwachsene:1,kinder:2,kinderAlter:[8,8]},p=>!(p.kinderAlter||[]).length],
 ["Alter richtig in derselben Nachricht",J,["2 erwachsene und kinder 3 und 5"],"reisende",{erwachsene:2,kinder:2,kinderAlter:[3,5]},p=>JSON.stringify(p.kinderAlter)==="[3,5]"],
 ["Alter richtig, 'meine Tochter ist 7 und mein Sohn 12'",J,["ich, meine tochter ist 7 und mein sohn 12"],"reisende",{erwachsene:1,kinder:2,kinderAlter:[7,12]},p=>JSON.stringify(p.kinderAlter)==="[7,12]"],
 ["Alter richtig, 'fünfjährige'",J,["ich und meine fünfjährige tochter"],"reisende",{erwachsene:1,kinder:1,kinderAlter:[5]},p=>JSON.stringify(p.kinderAlter)==="[5]"],
 ["Alter richtig, Baby",J,["wir zwei und unser baby"],"reisende",{erwachsene:2,kinder:1,kinderAlter:[0]},p=>JSON.stringify(p.kinderAlter)==="[0]"],
 ["Alter richtig, Jahrgang",J,["ich und mein sohn, jahrgang 2020"],"reisende",{erwachsene:1,kinder:1,kinderAlter:[6]},p=>JSON.stringify(p.kinderAlter)==="[6]"],
 ["Alter richtig, Altersfrage 'zwei und vier'",{...J,erwachsene:2,kinder:2,personen:4},["zwei und vier"],"kinderAlter",{kinderAlter:[2,4]},p=>JSON.stringify(p.kinderAlter)==="[2,4]"],
 ["Alter richtig, 'die sind 3 und 5 jahre', Nachtrag",J,["ich und zwei kinder","3 und 5 Jahre"],"kinderAlter",{kinder:2,erwachsene:1,kinderAlter:[3,5]},p=>JSON.stringify(p.kinderAlter)==="[3,5]"],
 ["Alter richtig, 'eineinhalb'",J,["ich und mein sohn, anderthalb jahre alt"],"reisende",{erwachsene:1,kinder:1,kinderAlter:[1]},p=>JSON.stringify(p.kinderAlter)==="[1]"],
 ["Naechte erfunden nach Datum",{monat:7,anreise:"2027-07-08",vonPerson:{monat:true,anreise:true}},["am 8. juli","ich und meine frau"],"reisende",{erwachsene:2,kinder:0,naechte:7},p=>!p.naechte],
 ["Naechte erfunden nach 'im März'",{},["im märz mit zwei freunden"],"zeit",{monat:3,personenGesamt:3,naechte:7},p=>!p.naechte],
 ["Naechte richtig nebenbei",{},["im märz für 9 nächte"],"zeit",{monat:3,naechte:9},p=>p.naechte===9],
 ["Naechte richtig nebenbei, 'eine Woche'",{},["im märz für eine woche"],"zeit",{monat:3,naechte:7},p=>p.naechte===7],
 ["Naechte richtig, vom 3. bis 10.",{},["vom 3. bis 10. märz"],"zeit",{monat:3,anreise:"2027-03-03",naechte:7},p=>p.naechte===7],
 ["Naechte richtig, 'langes Wochenende'",{},["ein langes wochenende im mai"],"zeit",{monat:5,naechte:3},p=>p.naechte===3],
 ["Anreise erfunden nach Ziffern",{...J,naechte:undefined},["am 8ten märz vielleicht","nein doch flexibel","eine woche"],"dauer",{naechte:7,anreise:"2027-07-15"},p=>!p.anreise],
 ["55 Personen",J,["55"],"reisende",{personenGesamt:55,erwachsene:55},p=>!(p.personen>12)&&!(p.erwachsene>12)],
 ["22 Personen nur gesamt",J,["22"],"reisende",{personenGesamt:22},p=>!(p.personen>12)],
 ["8 Personen",J,["wir sind 8 erwachsene"],"reisende",{personenGesamt:8,erwachsene:8,kinder:0},p=>p.personen===8],
 ["12 Personen",J,["wir sind 12 erwachsene"],"reisende",{personenGesamt:12,erwachsene:12,kinder:0},p=>p.personen===12],
 ["Hotel aus einer Frage",{...J,erwachsene:2,kinder:0,personen:2},["Wie viele Hotels bietet ihr an?"],"art",{nachricht_art:"frage",frage_beantwortet:"nein",typ:"hotel"},p=>!p.typ],
 ["Hotel echt, als Frage formuliert",{...J,erwachsene:2,kinder:0,personen:2},["hotel bitte, habt ihr da viele?"],"art",{nachricht_art:"frage",frage_beantwortet:"ja",typ:"hotel"},p=>p.typ==="hotel"],
];
(async()=>{let g=0;for(const [n,vor,msgs,frage,args,ok] of F){const p=JSON.parse(JSON.stringify(vor)),k=kern(p,msgs,frage);let f="";try{WK.antwortSelbstLesen(k,frage,msgs[msgs.length-1]);}catch(e){f="L "+e.message}
try{await WK.werkzeuge.stand_merken.call(WK,{nachricht_art:"antwort",frage_beantwortet:"ja",...args},k)}catch(e){f+=" "+e.message}
const r=ok(p);if(r)g++;else console.log("FEHLT",n,JSON.stringify({a:p.kinderAlter,n:p.naechte,an:p.anreise,pers:p.personen,e:p.erwachsene,t:p.typ}),f)}console.log(g+"/"+F.length)})();
