const R=[
{m:"✈️",k:"Flight",a:"Paris",b:"Delhi",c:"India",f:"🇮🇳",min:510},
{m:"✈️",k:"Flight",a:"Paris",b:"New York",c:"USA",f:"🇺🇸",min:490},
{m:"✈️",k:"Flight",a:"Paris",b:"Tokyo",c:"Japan",f:"🇯🇵",min:720},
{m:"✈️",k:"Flight",a:"Paris",b:"Dubai",c:"UAE",f:"🇦🇪",min:405},
{m:"✈️",k:"Flight",a:"Paris",b:"Sydney",c:"Australia",f:"🇦🇺",min:1260},
{m:"🚆",k:"Train",a:"Paris",b:"London",c:"UK",f:"🇬🇧",min:140},
{m:"🚆",k:"Train",a:"Paris",b:"Amsterdam",c:"Netherlands",f:"🇳🇱",min:200},
{m:"🚆",k:"Train",a:"Paris",b:"Milan",c:"Italy",f:"🇮🇹",min:420},
{m:"🚌",k:"Bus",a:"Paris",b:"Brussels",c:"Belgium",f:"🇧🇪",min:190},
{m:"🚌",k:"Bus",a:"Paris",b:"Barcelona",c:"Spain",f:"🇪🇸",min:600},
{m:"🚌",k:"Bus",a:"Paris",b:"Berlin",c:"Germany",f:"🇩🇪",min:600},
{m:"🚲",k:"Short hop",a:"Home",b:"Library",c:"France",f:"🇫🇷",min:25}
];
const PEN=5*60000; // each pause adds 5 min extra study
let S={stamps:{},friends:{}};
try{const x=localStorage.getItem("sj1");if(x)S=JSON.parse(x)}catch(e){}
const save=()=>{try{localStorage.setItem("sj1",JSON.stringify(S))}catch(e){}};
let view="plan",mode="Flight",sel=R[0],J=null,subject="",custom="",arrived=null;
let account={token:localStorage.getItem("sf_token")||"",user:null,busy:false,message:"",mode:"login"};
const api=async(path,opts={})=>{const headers={"Content-Type":"application/json",...(account.token?{Authorization:"Bearer "+account.token}:{})};const res=await fetch(path,{...opts,headers:{...headers,...(opts.headers||{})}});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||"Request failed");return data};
async function syncPassport(){if(!account.token)return;try{const data=await api("/api/passport",{method:"PUT",body:JSON.stringify({passport:S})});S={...S,...data.passport};save()}catch(e){if(/log in|token/i.test(e.message)){account.token="";account.user=null;localStorage.removeItem("sf_token")}}}
async function loadAccount(){if(!account.token)return;try{const d=await api("/api/me");account.user=d.user;await syncPassport();const p=await api("/api/passport");S={...S,...p.passport};save();if(view==="account")render()}catch(e){account.token="";account.user=null;localStorage.removeItem("sf_token")}}

const $=s=>document.querySelector(s);
const fmt=ms=>{ms=Math.max(0,Math.ceil(ms/1000));const h=Math.floor(ms/3600),m=Math.floor(ms%3600/60),s=ms%60;return (h?h+":"+String(m).padStart(2,"0"):m)+":"+String(s).padStart(2,"0")};
const hm=m=>m>=60?Math.floor(m/60)+"h "+(m%60?m%60+"m":""):m+"m";
const clock=t=>new Date(t).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

function tick(){
 if(!J)return;
 const n=Date.now();
 if(!J.paused){J.done+=n-J.last}
 J.last=n;
 if(J.done>=J.total&&!J.paused){land();return}
 try{localStorage.setItem("sj_trip",JSON.stringify(J))}catch(e){}
 if(!J.paused)document.title=fmt(J.total-J.done)+" left · Study Flight";
 if(view==="trip")paint();
}
const CITY={Paris:[48.9,2.35],Delhi:[28.6,77.2],"New York":[40.7,-74],Tokyo:[35.7,139.7],Dubai:[25.2,55.3],Sydney:[-33.9,151.2],London:[51.5,-0.1],Amsterdam:[52.4,4.9],Milan:[45.5,9.2],Brussels:[50.8,4.4],Barcelona:[41.4,2.2],Berlin:[52.5,13.4],Home:[48.85,2.3],Library:[48.9,2.4]};
function pt(n){if(CITY[n])return CITY[n];const k=CT.find(c=>c[0]===n);if(k)return [k[2],k[3]];let h=0;for(const c of n)h=(h*31+c.charCodeAt(0))%1000;return [(h%120)-50,((h*7)%300)-150]}
const LATE=["We have a passenger running {d} minutes late. That’s slower than a sloth ordering coffee.","Our captain reports a {d} minute delay. A snail with a backpack would have overtaken us by now.","This flight has more breaks than a phone at 1% battery. Currently {d} minutes behind.","We’re {d} minutes late. A shopping trolley with one bad wheel is outrunning this plane.","Someone onboard is {d} minutes delayed, about how long it takes to choose a show on Netflix."];
const HABIT=["One of our regular passengers has a lot of delayed flights. Their focus has more gaps than Wi-Fi in a tunnel.","Crew note: this passenger’s delay record is longer than a group chat deciding where to eat.","Our records show many delayed flights from one seat. Even Monday mornings arrive more punctually."];
const ACE=["We have a frequent flyer onboard who finishes flights more reliably than a pigeon finds a sandwich.","Crew note: one passenger has landed so many flights that the runway knows them by name.","This passenger focuses harder than a cat watching a laser pointer. A round of applause, please."];
function crew(live){
 const n=Object.values(S.stamps).reduce((a,s)=>a+s.n,0),dl=S.dly||0,td=S.tdl||0;
 const d=live&&J?Math.round((J.delay+(J.paused?Date.now()-J.pausedAt:0))/60000):0;
 if(d>=10)return LATE[(n+dl+Math.floor(d/10))%LATE.length].replace("{d}",d);
 if((n>=3&&dl/n>=.5)||td>=30)return HABIT[(n+dl)%HABIT.length];
 if(n>=5)return ACE[n%ACE.length];
 return "";
}
const CT="France,FR,48.9,2.35;United Kingdom,GB,51.5,-0.1;Ireland,IE,53.3,-6.3;Spain,ES,40.4,-3.7;Portugal,PT,38.7,-9.1;Italy,IT,41.9,12.5;Germany,DE,52.5,13.4;Netherlands,NL,52.4,4.9;Belgium,BE,50.8,4.4;Switzerland,CH,46.9,7.4;Austria,AT,48.2,16.4;Greece,GR,38,23.7;Turkey,TR,39.9,32.9;Sweden,SE,59.3,18.1;Norway,NO,59.9,10.7;Poland,PL,52.2,21;Russia,RU,55.8,37.6;Egypt,EG,30,31.2;Morocco,MA,34,-6.8;Kenya,KE,-1.3,36.8;South Africa,ZA,-25.7,28.2;Nigeria,NG,9.1,7.5;United Arab Emirates,AE,25.2,55.3;Saudi Arabia,SA,24.7,46.7;India,IN,28.6,77.2;Pakistan,PK,33.7,73.1;Nepal,NP,27.7,85.3;Sri Lanka,LK,6.9,79.9;China,CN,39.9,116.4;Japan,JP,35.7,139.7;South Korea,KR,37.6,127;Thailand,TH,13.8,100.5;Vietnam,VN,21,105.8;Singapore,SG,1.35,103.8;Indonesia,ID,-6.2,106.8;Australia,AU,-33.9,151.2;New Zealand,NZ,-41.3,174.8;Canada,CA,45.4,-75.7;USA,US,38.9,-77;Mexico,MX,19.4,-99.1;Brazil,BR,-15.8,-47.9;Argentina,AR,-34.6,-58.4;Chile,CL,-33.4,-70.7;Colombia,CO,4.7,-74.1;Peru,PE,-12,-77".split(";").map(s=>{const a=s.split(",");return [a[0],a[1],+a[2],+a[3]]});
"Afghanistan,AF,34.5,69.2;Albania,AL,41.3,19.8;Algeria,DZ,36.8,3.1;Andorra,AD,42.5,1.5;Angola,AO,-8.8,13.2;Antigua and Barbuda,AG,17.1,-61.8;Armenia,AM,40.2,44.5;Azerbaijan,AZ,40.4,49.9;Bahamas,BS,25.1,-77.3;Bahrain,BH,26.2,50.6;Bangladesh,BD,23.8,90.4;Barbados,BB,13.1,-59.6;Belarus,BY,53.9,27.6;Belize,BZ,17.3,-88.8;Benin,BJ,6.5,2.6;Bhutan,BT,27.5,89.6;Bolivia,BO,-16.5,-68.1;Bosnia and Herzegovina,BA,43.9,18.4;Botswana,BW,-24.7,25.9;Brunei,BN,4.9,114.9;Bulgaria,BG,42.7,23.3;Burkina Faso,BF,12.4,-1.5;Burundi,BI,-3.4,29.3;Cabo Verde,CV,14.9,-23.5;Cambodia,KH,11.6,104.9;Cameroon,CM,3.9,11.5;Central African Republic,CF,4.4,18.6;Chad,TD,12.1,15;Comoros,KM,-11.7,43.3;Republic of the Congo,CG,-4.3,15.3;Democratic Republic of the Congo,CD,-4.3,15.3;Costa Rica,CR,9.9,-84.1;Croatia,HR,45.8,16;Cuba,CU,23.1,-82.4;Cyprus,CY,35.2,33.4;Czechia,CZ,50.1,14.4;Denmark,DK,55.7,12.6;Djibouti,DJ,11.6,43.1;Dominica,DM,15.3,-61.4;Dominican Republic,DO,18.5,-69.9;Ecuador,EC,-0.2,-78.5;El Salvador,SV,13.7,-89.2;Equatorial Guinea,GQ,3.75,8.8;Eritrea,ER,15.3,38.9;Estonia,EE,59.4,24.7;Eswatini,SZ,-26.3,31.1;Ethiopia,ET,9,38.7;Fiji,FJ,-18.1,178.4;Finland,FI,60.2,24.9;Gabon,GA,0.4,9.5;Gambia,GM,13.5,-16.6;Georgia,GE,41.7,44.8;Ghana,GH,5.6,-0.2;Grenada,GD,12.1,-61.7;Guatemala,GT,14.6,-90.5;Guinea,GN,9.5,-13.7;Guinea-Bissau,GW,11.9,-15.6;Guyana,GY,6.8,-58.2;Haiti,HT,18.6,-72.3;Honduras,HN,14.1,-87.2;Hungary,HU,47.5,19;Iceland,IS,64.1,-21.9;Iran,IR,35.7,51.4;Iraq,IQ,33.3,44.4;Israel,IL,31.8,35.2;Ivory Coast,CI,6.8,-5.3;Jamaica,JM,18,-76.8;Jordan,JO,31.9,35.9;Kazakhstan,KZ,51.2,71.4;Kiribati,KI,1.45,173;Kosovo,XK,42.7,21.2;Kuwait,KW,29.4,48;Kyrgyzstan,KG,42.9,74.6;Laos,LA,18,102.6;Latvia,LV,56.95,24.1;Lebanon,LB,33.9,35.2;Lesotho,LS,-29.3,27.5;Liberia,LR,6.3,-10.8;Libya,LY,32.9,13.2;Liechtenstein,LI,47.1,9.5;Lithuania,LT,54.7,25.3;Luxembourg,LU,49.6,6.1;Madagascar,MG,-18.9,47.5;Malawi,MW,-14,33.8;Malaysia,MY,3.1,101.7;Maldives,MV,4.2,73.5;Mali,ML,12.6,-8;Malta,MT,35.9,14.5;Marshall Islands,MH,7.1,171.4;Mauritania,MR,18.1,-16;Mauritius,MU,-20.2,57.5;Micronesia,FM,6.9,158.2;Moldova,MD,47,28.9;Monaco,MC,43.7,7.4;Mongolia,MN,47.9,106.9;Montenegro,ME,42.4,19.3;Mozambique,MZ,-26,32.6;Myanmar,MM,19.75,96.1;Namibia,NA,-22.6,17.1;Nauru,NR,-0.5,166.9;Nicaragua,NI,12.1,-86.3;Niger,NE,13.5,2.1;North Korea,KP,39,125.75;North Macedonia,MK,42,21.4;Oman,OM,23.6,58.4;Palau,PW,7.5,134.6;Palestine,PS,31.9,35.2;Panama,PA,9,-79.5;Papua New Guinea,PG,-9.4,147.2;Paraguay,PY,-25.3,-57.6;Philippines,PH,14.6,121;Qatar,QA,25.3,51.5;Romania,RO,44.4,26.1;Rwanda,RW,-1.95,30.1;Saint Kitts and Nevis,KN,17.3,-62.7;Saint Lucia,LC,14,-61;Saint Vincent and the Grenadines,VC,13.2,-61.2;Samoa,WS,-13.8,-171.8;San Marino,SM,43.9,12.45;Sao Tome and Principe,ST,0.3,6.7;Senegal,SN,14.7,-17.5;Serbia,RS,44.8,20.5;Seychelles,SC,-4.6,55.5;Sierra Leone,SL,8.5,-13.2;Slovakia,SK,48.1,17.1;Slovenia,SI,46.05,14.5;Solomon Islands,SB,-9.4,160;Somalia,SO,2.05,45.3;South Sudan,SS,4.85,31.6;Sudan,SD,15.6,32.5;Suriname,SR,5.85,-55.2;Syria,SY,33.5,36.3;Taiwan,TW,25,121.5;Tajikistan,TJ,38.6,68.8;Tanzania,TZ,-6.2,35.7;Timor-Leste,TL,-8.6,125.6;Togo,TG,6.1,1.2;Tonga,TO,-21.1,-175.2;Trinidad and Tobago,TT,10.65,-61.5;Tunisia,TN,36.8,10.2;Turkmenistan,TM,37.95,58.4;Tuvalu,TV,-8.5,179.2;Uganda,UG,0.3,32.6;Ukraine,UA,50.45,30.5;Uruguay,UY,-34.9,-56.2;Uzbekistan,UZ,41.3,69.3;Vanuatu,VU,-17.7,168.3;Vatican City,VA,41.9,12.45;Venezuela,VE,10.5,-66.9;Yemen,YE,15.35,44.2;Zambia,ZM,-15.4,28.3;Zimbabwe,ZW,-17.8,31.05".split(";").forEach(s=>{const a=s.split(",");CT.push([a[0],a[1],+a[2],+a[3]])});
CT.sort((a,b)=>a[0].localeCompare(b[0]));
const ALIAS={burma:"myanmar","czech republic":"czechia","cote d'ivoire":"ivory coast","côte d’ivoire":"ivory coast",drc:"democratic republic of the congo",congo:"republic of the congo",swaziland:"eswatini",turkiye:"turkey",holland:"netherlands",korea:"south korea","east timor":"timor-leste",vatican:"vatican city","cape verde":"cabo verde",uk:"united kingdom",england:"united kingdom","united states":"usa",us:"usa",america:"usa",uae:"united arab emirates",dubai:"united arab emirates"};
const flag=cc=>String.fromCodePoint(...[...cc].map(c=>127397+c.charCodeAt(0)));
const findC=s=>{s=(s||"").trim().toLowerCase();s=ALIAS[s]||s;return CT.find(c=>c[0].toLowerCase()===s)};
function est(c){const D=Math.PI/180,[la,lo]=CITY.Paris,h=(x)=>Math.sin(x/2)**2,dl=(c[2]-la)*D,dn=(c[3]-lo)*D;const a=h(dl)+Math.cos(la*D)*Math.cos(c[2]*D)*h(dn);const km=12742*Math.asin(Math.sqrt(a));return Math.max(25,Math.round(km/850*60+30))}
let note="",fix=0,ccIn="";
function board(force){
 subject=$("#sj").value;
 const q=findC($("#cc").value),m=+$("#cm").value;custom=$("#cm").value;ccIn=$("#cc").value;
 if(!q){note="Pick a country from the list so the flight time can be checked.";fix=0;return render()}
 if(!m||m<1){note="Enter how many minutes you want to study.";fix=0;return render()}
 const e=est(q);
 if(!force&&Math.abs(m-e)>Math.max(e*.3,15)){note=`Paris to ${q[0]} takes about ${hm(e)} by plane. You entered ${hm(m)}.`;fix=e;return render()}
 Object.assign(sel,{c:q[0],b:q[0],f:flag(q[1]),min:m});note="";fix=0;start();
}
let LP={},G={lo:0,la:0,z:1,vx:0,vy:0,px:0,py:0},GP=0,GR=270;
const SEAS=["47,45 50,47 53,46.5 53,44 51,42 52.5,40 53.8,37 51,36.7 49,38 49,40 48,41.5 47.5,43"];
const LAND=[
"-166,68.5 -156,71.3 -141,69.7 -128,70 -115,68.5 -108,68 -98,68.5 -95,71 -90,69 -86,68 -82,66 -81,63 -90,64 -94,60 -93,57 -88,56.5 -85,55.3 -82.3,53 -80,51.3 -79,53 -77,56 -78,60 -78,62.3 -73,62 -69,60.5 -67,58.5 -64.5,60.3 -62,57.5 -60,55.5 -57,52.5 -60,50.2 -66,50.2 -70,47 -64.5,49 -64.2,48.8 -65.5,47.5 -64.8,46 -63,45.7 -60,46 -61.5,45 -66,43.5 -67,44.8 -70,43.5 -70.5,41.8 -72,41.2 -74,40.5 -74,39.3 -75.5,38 -76,37 -75.7,35.3 -77.9,33.9 -80.9,32 -81.4,30.5 -80.4,27.5 -80.1,25.8 -80.9,25.2 -81.8,26.2 -82.8,27.8 -83.7,29.9 -85.3,29.7 -87.5,30.3 -89.2,30.2 -89.4,29 -91,29.2 -93.8,29.7 -95,29.2 -97.2,27.8 -97.2,25.9 -97.8,22.3 -97.2,20.6 -96.1,19.2 -94.5,18.2 -92,18.6 -91,19.2 -90.5,21 -88,21.5 -86.8,21.2 -87.5,18.5 -88.3,16.5 -86,15.9 -83.3,15 -83.5,12 -83.7,10.9 -82.5,9.5 -81.5,8.8 -79.6,9.6 -77.4,8.6 -78.2,7.5 -80,7.3 -82.9,8.2 -85.7,10 -87.7,13 -90.5,13.8 -92.2,14.5 -94.5,16.2 -96.5,15.7 -99.9,16.8 -102,17.9 -105.5,20 -105.5,23 -106.8,24.6 -109.4,26 -110.6,27.9 -112.8,31 -114.7,31.7 -113.2,29.3 -111.2,25.8 -109.5,23.2 -112,24.5 -114.5,27.5 -116,30.4 -117.1,32.5 -118.5,34 -120.6,34.5 -121.9,36.6 -122.5,37.8 -123.8,39.4 -124.4,40.4 -124.1,43 -124,46.2 -124.7,48.4 -123,48.2 -122.8,49 -125,50.2 -128,52.5 -130,54.7 -133,57.3 -135.5,59.2 -139,60 -144,60.1 -149.5,59.8 -151,59.3 -151.5,61.1 -153.5,59.5 -156,57.3 -160,55.7 -164.5,54.6 -162,56 -158.5,58 -161,58.7 -165,60.5 -166,62 -164.5,63.5 -161,64.5 -166,64.6 -168,65.6 -164,66.5",
"-77.4,8.6 -75.5,10.7 -72,12 -71.3,10.8 -69.5,11.5 -66,10.6 -62,10.7 -60.5,8.5 -57,6 -52,5 -51,4 -50,1 -50,-0.5 -48,-1 -44.5,-2.5 -40,-2.9 -37,-4.8 -35,-5.5 -34.8,-8 -36,-10.5 -38.5,-13 -39,-17 -40,-20 -41,-22 -43,-23 -45,-23.8 -48.5,-26 -48.7,-28.5 -51,-31 -53.4,-33.7 -55,-35 -57,-34.8 -58.5,-34 -57,-36.5 -57.5,-38.2 -62,-39 -62.3,-41 -65,-41 -64.5,-42.5 -65.5,-45 -67.5,-46.5 -66,-48 -68.5,-50.2 -69,-52.2 -68.4,-54.1 -66,-55 -71,-54.9 -74,-52.5 -75.5,-49 -73.8,-44 -73.5,-40 -73.5,-37 -71.7,-33 -71.5,-30 -70.4,-23.5 -70.2,-18.5 -75,-15.5 -77.2,-12 -79.5,-8 -81.3,-6 -80.2,-3.4 -81,-1 -80.1,0.8 -78.8,1.8 -77.4,4 -77.5,7",
"-9.3,37 -9.5,39 -8.9,41.5 -9.2,43 -8,43.7 -4,43.4 -1.8,43.4 -1.2,46 -2.5,47.3 -4.5,48 -1.5,48.7 -1.2,49.6 1.5,50.2 3,51 4.5,52.8 8,53.7 8.6,55.5 8.2,57 10.5,57.7 10.6,56 9.8,54.8 11,54 13.8,54.2 18.5,54.8 21,55.3 21,57.5 24,57.2 24.4,59.4 28,59.5 30,60 25,60.4 22.5,60.2 21.5,61.5 21.5,63.5 25,65 24.5,65.8 21.5,65.3 17.5,62.8 17.2,60.8 18.8,60 16.8,57 14.5,56 12.8,55.5 12.8,56.9 11.2,58.2 10,59 8,58.1 5.5,58.7 5,61 7,62.8 11.5,64.3 14.5,66.5 17,69 20,70 25,71 30,70.4 33,69.5 40.5,67.5 41,66.2 34,66.7 33,64.5 37,64 40.5,64.6 44,66.2 44,68.4 53,68.6 60,69.2 66,69 68,72 72,72.8 73,68.7 80,72.5 87,74.3 100,77 105,77.7 112,75.5 113.5,73.8 128,73 131,71 140,72.8 150,71.5 160,69.7 170,70.2 180,68.8 180,65 177,64.7 170,60 163,59.5 163,56 162,54 160,52.5 156.7,50.9 156,53 156,57 160,59.5 154,59.3 150,59.6 143,59.3 140.5,57.8 137.5,54 141,53.5 141.5,52.5 140.4,50 140.3,48.5 138,46.5 135.5,43.5 133,42.7 131,42.5 129.8,41 129.5,40.7 128,38.5 129.4,36.5 129.2,35.1 126.5,34.5 126.5,37 125,38 125.2,39.5 124.3,39.9 121.5,40.5 121,38.9 118,39.2 119,37.2 122.5,37.2 120,35 120.9,32 121.9,30.9 122,29.8 121,28 120,26 118.5,24.5 116.5,22.8 114,22.3 111,21.4 110.2,20.3 108.5,21.7 106.7,20.5 105.8,19 108.5,15.5 109.3,12 107,10.4 105,8.7 104.8,10 102.5,12 100.9,13.4 100,12.5 99.2,10 100.3,7 101,6.3 102.3,6.1 103.4,4.5 103.5,2.5 104.2,1.4 103.3,1.5 101.2,2.8 100.4,5 100.2,6.5 98.3,8 98.5,10 98.7,12 97.7,16.5 95.5,16 94.2,18.5 93,20 92,21.3 91.3,22.7 90.5,22.3 88.8,21.7 87,21 86.5,19.8 84.5,18.2 82,16.3 80.3,15.5 80.2,13 79.8,10.3 78.3,8.9 77.5,8.1 76.3,9.8 75,12.5 74,15 72.8,19 72.8,21 70,21 68.8,23.2 66.5,25.4 62,25.2 57.5,25.7 56.5,27 54,26.7 51.5,27.9 49,30 48,30 50,27 50.2,26 51.3,24.6 51.5,24.2 54,24.2 56.3,26.2 56.5,24.5 58.7,23.6 59.8,22.3 58.7,20.5 57.7,19 55.5,17.3 52.5,16.2 49,14.5 45,12.8 43.3,12.7 42.8,15.2 42.7,16.7 41,19 39,21.5 38,24 35.5,27.5 34.9,29.5 34.3,31.3 35,33.5 35.8,35 36,36.6 33.5,36.1 30.5,36.5 28.5,36.7 27,37.9 26.3,39.5 26.4,40.2 29,40.9 29,41.2 31,41.1 35,42 38,40.9 41.7,41.5 41.6,42.6 40,43.4 39,44 37.5,44.7 36.6,45.4 35,45 33.5,44.4 32.5,45.3 33.7,46 31.5,46.6 30.5,46.4 29.7,45.2 28.6,44.2 28,42.5 27.8,41.7 29,41.2 28.1,41 26.2,40.6 24,40.8 23,40.2 22.9,39 24,38 23,36.5 21.5,36.8 21.2,38 20.1,39.5 19.4,41 18.5,42.4 15.5,44.2 14,45.2 12.4,45.4 12.5,44 14,42.5 16,41.8 18.5,40.1 17,39 16.5,38 15.7,40 14.5,41 12,42 10.5,43 8.8,44.4 7,43.7 4.5,43.4 3,42.6 3,41.8 0.8,41 -0.2,39.5 0,38.6 -0.7,37.6 -2.2,36.7 -4.5,36.7 -5.4,36 -6.3,36.8 -7.4,37.2",
"-5.9,35.8 -2.9,35.3 0,35.8 3,36.8 8,37 10.2,37.3 11,36.8 10.5,35.2 11,33.5 11.5,33 15,32.3 19,30.3 20,32 22,32.9 25,32.6 29,30.9 31,31.6 32.3,31.2 32.5,29.9 33.5,28 34.2,27.8 35.5,24 36.8,22 38.5,18 39.5,15.5 41.5,13.7 43.2,12.5 45,10.4 48,11.2 51.2,11.8 51,10.4 50,8 48,4.5 45,2 42,-0.8 40.2,-2.8 39.2,-5 39.5,-8 40.5,-10.5 40.5,-15 37,-17.9 34.8,-19.8 35.5,-23.8 33,-25.5 32.8,-26.9 32.5,-28.5 31,-30 29,-32.5 27,-33.7 24.5,-34.1 22,-34.1 20,-34.8 18.5,-34.1 18.3,-32 16.5,-28.6 15,-26.5 14.5,-22.5 13.3,-20 11.8,-17.2 13.5,-12.5 13.3,-9 12.3,-6 12,-5 9.5,-1 9,1 9.8,3.6 8.5,4.5 6,4.3 4.5,6.3 1.8,6.2 -1.5,5 -4,5.2 -7.5,4.4 -9.5,5.5 -11.5,7 -13.3,8.8 -15,10.9 -16.7,12.5 -17.5,14.7 -16.5,16.5 -16.2,19 -17,21 -16.2,23.7 -14.5,26 -13,27.7 -10,29.7 -9.7,31.2 -8.6,33 -6.8,34",
"49.3,-12 50.5,-15.5 49.5,-17.5 48,-22 47,-25 45,-25.5 43.3,-23 44,-20 44.4,-16.2 46,-15.7 47.5,-14.5",
"113.5,-22 114.2,-26 115,-30 115.5,-33.5 118,-35 121.5,-33.8 124,-33.5 129,-31.6 131.5,-31.5 134,-32.7 135.8,-34.9 137.5,-33.2 138,-35.5 139.5,-36 140.7,-38 143.5,-38.8 146,-39 147.5,-38.2 150,-37.5 151,-34.5 153,-30.5 153.5,-27 152.5,-24.5 150,-22.5 148,-20 146.2,-18.8 145.5,-15 143.5,-13.5 142.5,-10.7 141.5,-13 141.5,-16 140,-17.7 137,-15.7 135.5,-14.7 136.8,-12.3 133,-11.5 131,-12.2 129.5,-14.8 127,-14 125,-15.5 122.2,-17.5 121,-19.5 118.5,-20.3 116,-20.8",
"144.7,-40.7 148.3,-40.9 148,-43.2 146.2,-43.6 145.2,-42.2",
"172.7,-34.5 174.5,-36 175.5,-37 177.5,-37.7 178.5,-37.7 177,-39.3 175.5,-41.6 174.8,-41.3 174.6,-39.5 173.8,-39.3 174.6,-37.2 173,-35.2",
"172.7,-40.5 174.2,-41.5 172.8,-43.9 171,-44.5 170.5,-46 169,-46.6 166.5,-46 168,-44 170.5,-43 171.5,-41.7",
"-55,60 -43,60 -40,64 -33,68 -22,70.5 -19,75 -19,80 -30,83.5 -50,82.5 -62,81.5 -72,78.5 -66,76 -58,75.5 -55,72 -52,69.5 -53,67 -50,63",
"-5.7,50 1.4,51.1 1.7,52.7 -0.2,53.5 -1.7,55.5 -2.5,56.2 -1.8,57.5 -3.5,57.7 -3,58.6 -5,58.6 -5.8,57.5 -5.5,56 -4.8,55 -3.2,54.8 -3,53.5 -4.5,53.3 -4.2,52.2 -5.3,51.8 -3,51.4 -4.5,50.3",
"-10,52 -6.2,52.2 -6,53.6 -5.5,54.5 -7.2,55.2 -8.5,54.3 -10,53.8",
"-24,65.5 -22,66.4 -16,66.5 -13.5,65 -15,64.2 -19,63.4 -22.5,63.8",
"130.9,34 132.5,35.4 135,35.7 137.5,37 139.5,38.8 140,40.5 141.5,41 141.9,39 141,36.5 139.8,35 137.2,34.6 135.2,33.5 134.2,34.4 132.5,34.2",
"140,42 140.5,43.3 141.5,45.4 145.4,44 143.3,42 141,42.6",
"129.8,33.2 131,33.9 131.7,32.5 131,31.2 130.2,31.3 129.7,32.5",
"121,25.2 122,25 121,22 120.1,23",
"79.8,9.2 81.8,7.5 81.2,6.2 80,6 79.7,7.5",
"95.3,5.6 97.5,5.2 98.7,3.7 100.4,2.2 102,1.5 103.7,0.5 104.5,-1.5 106,-3.2 105.8,-5.8 104.5,-5.9 102.3,-4.5 100.8,-2.2 99.5,0 97.8,2 95.8,3.8",
"105.2,-6.8 108,-6.3 111,-6.5 114.4,-7.7 114.5,-8.7 110,-8.2 106,-7.3",
"109,1.5 111,1.7 113,3.2 115,5 117.5,7 119,5.2 117.8,1 116.5,-1.5 116.2,-3.5 114.5,-4 111.5,-3.3 110,-1.8 109.2,-0.5",
"119.5,-5.5 119.5,-2 120,0.5 125,1.5 123,-1 122,-4.8 121,-3 120.5,-5",
"131,-0.8 134.5,-0.8 138,-1.7 141,-2.6 145,-4.5 147.5,-6 148,-8.2 150.5,-10.5 147,-10 144,-7.8 141,-9.2 138.5,-8.3 137.5,-5.5 133.5,-4 132,-2.8",
"120.5,18.5 122.2,18.5 122.3,16 124,13 121.5,13.8 120.6,14.5 120,16.5",
"122,7.2 123.5,8.7 125.5,9.7 126.5,8 126.2,6.3 125.3,5.7 124.2,6.8 122.2,6.9",
"-84.9,21.9 -82,23.1 -79,22.5 -77,21.5 -74.2,20.2 -75.5,19.9 -77.7,19.9 -78.5,21.5 -81.5,22.3 -84,22",
"-74.4,18.5 -72.8,19.9 -70,19.8 -68.4,18.6 -70,18.2 -71.8,17.8",
"-59.3,47.6 -57,50.6 -55.5,51.5 -53.5,49.8 -52.7,47.5 -55.8,46.9",
"-80,73.5 -72,71.5 -67,69.5 -62,66.5 -64,64 -66,62 -72,63.5 -78,64.5 -74,67.5 -80,69.5 -88,70.5 -88,73",
"-118,71 -105,73 -101,69.5 -113,68.5",
"-90,76.5 -78,76.5 -76,79 -62,82 -70,83 -92,81.5",
"-125,71.5 -120,74.5 -116,73 -119,71",
"11,78.5 17,80 27,80 22,77.5 16,76.7",
"52,71 56,75 60,76.5 68,77 60,73 57,70.5",
"142,46 143.5,49 143,54 142,53 142,49.5",
"12.5,38 15.5,38.2 15,36.7",
"8.2,41 9.7,41 9.5,39 8.5,39"
];
function landPts(st){
 if(LP[st])return LP[st];const out=LP[st]=[],seas=SEAS.map(l=>l.split(" ").map(p=>p.split(",").map(Number))),D=Math.PI/180,polys=LAND.map(l=>l.split(" ").map(p=>p.split(",").map(Number)));
 const spans=(PS,y)=>{const r=[];for(const P of PS){const xs=[];for(let i=0,j=P.length-1;i<P.length;j=i++){const [a,b]=P[i],[e,f]=P[j];if((b>y)!==(f>y))xs.push((e-a)*(y-b)/(f-b)+a)}xs.sort((m,n)=>m-n);for(let i=0;i+1<xs.length;i+=2)r.push([xs[i],xs[i+1]])}return r};
 for(let la=-58;la<=84;la+=st){const L=spans(polys,la),S=spans(seas,la);for(let lo=-180;lo<180;lo+=st)if(L.some(s=>lo>=s[0]&&lo<=s[1])&&!S.some(s=>lo>=s[0]&&lo<=s[1]))out.push([Math.cos(la*D)*Math.cos(lo*D),Math.cos(la*D)*Math.sin(lo*D),Math.sin(la*D)])}
 return out;
}
const h1=i=>{const x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x)};
const STARS=Array.from({length:90},(_,i)=>[h1(i)*600,h1(i+99)*600,h1(i+7)*1.3+.4,h1(i+31)*.5+.3]);
const GROUND=["\u{1F686}","\u{1F68C}","\u{1F6B2}"];
function sunVec(){const n=new Date(),doy=(n-new Date(n.getFullYear(),0,0))/864e5,dec=23.44*Math.sin(2*Math.PI*(doy-81)/365)*Math.PI/180,hr=n.getUTCHours()+n.getUTCMinutes()/60,lo=-(hr-12)*15*Math.PI/180;return [Math.cos(dec)*Math.cos(lo),Math.cos(dec)*Math.sin(lo),Math.sin(dec)]}
function drawPlane(g,s){g.beginPath();g.moveTo(s,0);g.lineTo(s*.3,-s*.14);g.lineTo(-s*.2,-s*.85);g.lineTo(-s*.42,-s*.85);g.lineTo(-s*.12,-s*.12);g.lineTo(-s*.62,-s*.1);g.lineTo(-s*.78,-s*.38);g.lineTo(-s*.9,-s*.38);g.lineTo(-s*.78,0);g.lineTo(-s*.9,s*.38);g.lineTo(-s*.78,s*.38);g.lineTo(-s*.62,s*.1);g.lineTo(-s*.12,s*.12);g.lineTo(-s*.42,s*.85);g.lineTo(-s*.2,s*.85);g.lineTo(s*.3,s*.14);g.closePath();g.fill()}
const curP=()=>J?Math.min(1,(J.done+(J.paused?0:Date.now()-J.last))/J.total):0;
let lastF=0;
function loop(t){
 requestAnimationFrame(loop);
 if(!J||view!=="trip"||document.hidden||t-lastF<45)return;
 lastF=t;
 if(Math.abs(G.vx)>1e-4||Math.abs(G.vy)>1e-4){G.lo+=G.vx;G.la=Math.max(-1.4,Math.min(1.4,G.la+G.vy));G.vx*=.92;G.vy*=.92}
 drawGlobe(curP());
}
function drawGlobe(p){
 const cv=$("#globe");if(!cv)return;
 const g=cv.getContext("2d"),C=300,D=Math.PI/180,[a1,o1]=pt(J.r.a),[a2,o2]=pt(J.r.b);
 g.setTransform(cv.width/600,0,0,cv.width/600,0,0);
 const v=(la,lo)=>[Math.cos(la*D)*Math.cos(lo*D),Math.cos(la*D)*Math.sin(lo*D),Math.sin(la*D)];
 const A=v(a1,o1),B=v(a2,o2),om=Math.acos(Math.max(-1,Math.min(1,A[0]*B[0]+A[1]*B[1]+A[2]*B[2])))||1e-6,sn=Math.sin(om),km=om*6371;
 const at=t=>{const x=Math.sin((1-t)*om)/sn,y=Math.sin(t*om)/sn;return [x*A[0]+y*B[0],x*A[1]+y*B[1],x*A[2]+y*B[2]]};
 const P0=at(p),lat0=Math.max(-1.45,Math.min(1.45,Math.asin(P0[2])+G.la)),lon0=Math.atan2(P0[1],P0[0])+G.lo;
 const Pc=[Math.cos(lat0)*Math.cos(lon0),Math.cos(lat0)*Math.sin(lon0),Math.sin(lat0)];GP=p;
 const R=250*Math.max(1,Math.min(8,5000/km))*G.z;GR=R;
 const ex=[-Math.sin(lon0),Math.cos(lon0)],ey=[-Math.sin(lat0)*Math.cos(lon0),-Math.sin(lat0)*Math.sin(lon0),Math.cos(lat0)];
 const P=u=>({x:C+R*(u[0]*ex[0]+u[1]*ex[1]),y:C-R*(u[0]*ey[0]+u[1]*ey[1]+u[2]*ey[2]),d:u[0]*Pc[0]+u[1]*Pc[1]+u[2]*Pc[2]});
 const S=sunVec(),dayOf=u=>u[0]*S[0]+u[1]*S[1]+u[2]*S[2];
 g.fillStyle="#050b16";g.fillRect(0,0,600,600);
 for(const [x,y,r,a] of STARS){g.fillStyle=`rgba(255,255,255,${a})`;g.fillRect(x,y,r,r)}
 const ag=g.createRadialGradient(C,C,R*.96,C,C,R*1.14);ag.addColorStop(0,"rgba(90,163,238,.5)");ag.addColorStop(1,"rgba(90,163,238,0)");
 g.fillStyle=ag;g.beginPath();g.arc(C,C,R*1.14,0,7);g.fill();
 g.save();g.beginPath();g.arc(C,C,R,0,7);g.clip();
 const og=g.createRadialGradient(C-R*.3,C-R*.3,R*.1,C,C,R*1.05);og.addColorStop(0,"#1f4f8a");og.addColorStop(1,"#0a1d36");
 g.fillStyle=og;g.fillRect(0,0,600,600);
 g.strokeStyle="rgba(140,190,255,.13)";g.lineWidth=1;
 for(let la=-60;la<=60;la+=30){g.beginPath();let on=false;for(let lo=-180;lo<=180;lo+=6){const q=P(v(la,lo));if(q.d>0){on?g.lineTo(q.x,q.y):g.moveTo(q.x,q.y);on=true}else on=false}g.stroke()}
 for(let lo=-180;lo<180;lo+=30){g.beginPath();let on=false;for(let la=-90;la<=90;la+=6){const q=P(v(la,lo));if(q.d>0){on?g.lineTo(q.x,q.y):g.moveTo(q.x,q.y);on=true}else on=false}g.stroke()}
 const sx=S[0]*ex[0]+S[1]*ex[1],sy=-(S[0]*ey[0]+S[1]*ey[1]+S[2]*ey[2]),sd=S[0]*Pc[0]+S[1]*Pc[1]+S[2]*Pc[2];
 g.save();g.translate(C,C);g.rotate(Math.atan2(sy,sx));g.fillStyle="rgba(2,8,22,.5)";g.beginPath();
 if(Math.hypot(sx,sy)<1e-4){if(sd<0)g.arc(0,0,R,0,7)}
 else if(sd>=0){g.arc(0,0,R,-Math.PI/2,Math.PI/2,true);g.ellipse(0,0,Math.max(.1,R*sd),R,0,Math.PI/2,Math.PI*1.5,false)}
 else{g.arc(0,0,R,-Math.PI/2,Math.PI/2,true);g.ellipse(0,0,R*-sd,R,0,Math.PI/2,-Math.PI/2,true)}
 g.fill();g.restore();
 const st=R>1000?.5:R>380?1:2,s=Math.max(2,R*st*.0175*.5);
 for(const u of landPts(st)){const q=P(u);if(q.d<=0||q.x<-20||q.x>620||q.y<-20||q.y>620)continue;
  const t=Math.max(0,Math.min(1,(dayOf(u)+.1)/.25));
  g.fillStyle=`rgba(${70+t*50|0},${105+t*100|0},${165-t*25|0},${(.3+.6*q.d)*(.55+.45*t)})`;g.fillRect(q.x-s/2,q.y-s/2,s,s)}
 for(const c of CT){const u=v(c[2],c[3]),q=P(u);if(q.d>.05&&dayOf(u)<-.05){g.fillStyle="rgba(255,205,110,.22)";g.beginPath();g.arc(q.x,q.y,5,0,7);g.fill();g.fillStyle="rgba(255,225,150,.95)";g.beginPath();g.arc(q.x,q.y,1.8,0,7);g.fill()}}
 let prev=null;
 for(let i=0;i<=120;i++){const t=i/120,q=P(at(t));
  if(prev&&q.d>0&&prev.d>0){g.beginPath();g.moveTo(prev.x,prev.y);g.lineTo(q.x,q.y);
   if(t<=p){g.strokeStyle="#ff6b57";g.lineWidth=5;g.shadowColor="#ff6b57";g.shadowBlur=12;g.setLineDash([])}
   else{g.strokeStyle="rgba(200,225,255,.8)";g.lineWidth=3;g.shadowBlur=0;g.setLineDash([4,8])}
   g.stroke()}
  prev=q}
 g.shadowBlur=0;g.setLineDash([]);g.textAlign="center";g.textBaseline="middle";
 for(const [u,n,dest] of [[A,J.r.a,0],[B,J.r.b,1]]){const q=P(u);if(q.d>0){const ly=Math.hypot(P(A).x-P(B).x,P(A).y-P(B).y)<80&&!dest?34:-26;
  if(dest){const ph=(Date.now()%1600)/1600;g.strokeStyle=`rgba(90,163,238,${1-ph})`;g.lineWidth=2;g.beginPath();g.arc(q.x,q.y,9+ph*18,0,7);g.stroke()}
  g.fillStyle="#5aa3ee";g.strokeStyle="#fff";g.lineWidth=3;g.beginPath();g.arc(q.x,q.y,9,0,7);g.fill();g.stroke();
  g.font="700 24px system-ui,sans-serif";g.lineWidth=5;g.strokeStyle="rgba(5,11,22,.85)";g.strokeText(n,q.x,q.y+ly);g.fillStyle="#e8f0f7";g.fillText(n,q.x,q.y+ly)}}
 const lg=g.createRadialGradient(C,C,R*.55,C,C,R);lg.addColorStop(0,"rgba(0,0,0,0)");lg.addColorStop(1,"rgba(0,0,0,.5)");g.fillStyle=lg;g.fillRect(0,0,600,600);
 g.restore();
 g.strokeStyle="rgba(150,205,255,.55)";g.lineWidth=2;g.beginPath();g.arc(C,C,R,0,7);g.stroke();
 const fl=!GROUND.includes(J.r.m),qp=P(at(p)),q0=P(at(Math.max(0,p-.02))),q2=P(at(Math.min(1,p+.02)));
 if(qp.d>0){g.save();g.translate(qp.x,qp.y);g.shadowColor="rgba(255,255,255,.9)";g.shadowBlur=14;g.fillStyle="#fff";
  if(fl){g.rotate(Math.atan2(q2.y-q0.y,q2.x-q0.x));drawPlane(g,20)}
  else{g.shadowBlur=0;g.font="44px serif";g.textAlign="center";g.textBaseline="middle";g.fillText(J.r.m,0,0)}
  g.restore()}
 const rem=Math.round(km*(1-p)),phase=p<.08?"Climbing":p>.92?"Descending":"Cruising",alt=Math.round(36000*Math.min(1,p/.08,(1-p)/.08)/100)*100;
 g.fillStyle="rgba(5,11,22,.72)";g.beginPath();if(g.roundRect)g.roundRect(24,548,552,40,12);else g.rect(24,548,552,40);g.fill();
 g.font="600 20px system-ui,sans-serif";g.textBaseline="middle";g.textAlign="left";g.fillStyle="#e8f0f7";g.fillText(rem.toLocaleString()+" km to go",40,568);
 g.textAlign="right";g.fillStyle="#9fc4ec";g.fillText(fl?phase+" \u00b7 "+alt.toLocaleString()+" ft":J.r.k,560,568);
}
let AC=null;
function unlock(){try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();if(AC.state==="suspended")AC.resume()}catch(e){}}
function chime(){try{if(!AC)return;[[659,0],[784,.18],[1047,.36]].forEach(([f,t])=>{const o=AC.createOscillator(),g=AC.createGain();o.type="sine";o.frequency.value=f;o.connect(g);g.connect(AC.destination);const s=AC.currentTime+t;g.gain.setValueAtTime(0,s);g.gain.linearRampToValueAtTime(.25,s+.03);g.gain.exponentialRampToValueAtTime(.001,s+.9);o.start(s);o.stop(s+1)})}catch(e){}}
let SND=null;
const gv=()=>(S.vol==null?.5:S.vol)*(SND&&SND.kind==="rain"?.25:SND&&SND.kind==="waves"?.6:.55);
function noiseBuf(brown){const n=AC.sampleRate*4,b=AC.createBuffer(1,n,AC.sampleRate),d=b.getChannelData(0);let l=0;for(let i=0;i<n;i++){const w=Math.random()*2-1;if(brown){l=(l+.02*w)/1.02;d[i]=l*3.5}else d[i]=w}return b}
function stopSound(){if(SND){try{SND.src.stop();if(SND.lfo)SND.lfo.stop();if(SND.hum)SND.hum.stop()}catch(e){}SND=null}}
function sound(kind){
 stopSound();S.snd=kind;save();if(kind==="off")return;unlock();if(!AC)return;
 try{
  const src=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();
  src.buffer=noiseBuf(kind!=="rain");src.loop=true;
  if(kind==="rain"){f.type="bandpass";f.frequency.value=3500;f.Q.value=.5}else{f.type="lowpass";f.frequency.value=kind==="cabin"?380:700}
  SND={src,g,lfo:null,hum:null,kind};g.gain.value=gv();
  src.connect(f);f.connect(g);g.connect(AC.destination);
  if(kind==="waves"){const o=AC.createOscillator(),og=AC.createGain();o.frequency.value=.12;og.gain.value=g.gain.value*.7;o.connect(og);og.connect(g.gain);o.start();SND.lfo=o}
  if(kind==="cabin"){const o=AC.createOscillator(),og=AC.createGain(),lp=AC.createBiquadFilter();o.type="sawtooth";o.frequency.value=86;lp.type="lowpass";lp.frequency.value=145;og.gain.value=.035*(S.vol==null?.5:S.vol);o.connect(lp);lp.connect(og);og.connect(AC.destination);o.start();SND.hum=o}
  src.start();
 }catch(e){SND=null}
}
function vol(v){S.vol=v;save();if(SND){SND.g.gain.value=gv()}}
function hist(){
 const L=S.log||[],dk=n=>{const d=new Date();return new Date(d.getFullYear(),d.getMonth(),d.getDate()-n).getTime()};
 const by={};L.forEach(x=>{const d=new Date(x.t),k=new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime();by[k]=(by[k]||0)+x.m});
 const days=[];let wk=0;for(let i=6;i>=0;i--){const k=dk(i),m=by[k]||0;wk+=m;days.push([k,m])}
 let streak=0,n=by[dk(0)]?0:1;while(by[dk(n)]){streak++;n++}
 const tot=L.reduce((a,x)=>a+x.m,0),mx=Math.max(30,...days.map(d=>d[1])),subj={};L.forEach(x=>{subj[x.s]=(subj[x.s]||0)+x.m});
 const sl=Object.entries(subj).sort((a,b)=>b[1]-a[1]).slice(0,6),sm=sl.length?sl[0][1]:1;
 if(!L.length)return `<h1>History</h1><p class="sub">Your study sessions will show up here after your first landing.</p><div class="pass"><div class="in">No flights logged yet. Finish a trip to start your history.</div></div>`;
 return `<h1>History</h1><p class="sub">Time you actually studied, logged when each flight lands.</p>
 <div class="stamps" style="margin-bottom:12px"><div class="stat"><b>${hm(by[dk(0)]||0)||"0m"}</b><small>Today</small></div><div class="stat"><b>${hm(wk)||"0m"}</b><small>Last 7 days</small></div><div class="stat"><b>${streak} day${streak===1?"":"s"}</b><small>Streak</small></div><div class="stat"><b>${hm(tot)}</b><small>Total studied</small></div></div>
 <div class="pass"><div class="in"><b>Last 7 days</b><div class="bars">${days.map(([k,m])=>`<div><span>${m?hm(m):""}</span><i style="height:${Math.round(m/mx*80)}px"></i>${new Date(k).toLocaleDateString([],{weekday:"short"})}</div>`).join("")}</div></div></div>
 <div class="pass"><div class="in"><b>By subject</b>${sl.map(([s,m])=>`<div style="margin-top:10px"><div class="row"><span>${esc(s)}</span><span>${hm(m)}</span></div><div style="height:8px;background:var(--line);border-radius:4px;margin-top:4px"><div style="width:${Math.round(m/sm*100)}%;height:8px;background:var(--acc);border-radius:4px"></div></div></div>`).join("")}</div></div>
 <div class="pass"><div class="in"><b>Recent flights</b>${L.slice(-8).reverse().map(x=>`<div class="row" style="margin-top:10px"><span>${esc(x.a)} to ${esc(x.b)}<small style="display:block;color:var(--mute)">${new Date(x.t).toLocaleDateString()} · ${esc(x.s)}${x.d?" · delayed "+x.d+" min":""}</small></span><b>${hm(x.m)}</b></div>`).join("")}</div></div>`;
}
function start(){
 unlock();G.lo=0;G.la=0;G.z=1;if(S.snd&&S.snd!=="off")sound(S.snd);
 const mins=sel.custom?+custom:sel.min;
 if(!mins||mins<1)return;
 J={r:{...sel,min:mins},total:mins*60000,done:0,delay:0,pauses:0,paused:false,last:Date.now(),pausedAt:0,subject};
 view="trip";render();
}
function pause(){
 if(J.paused){const n=Date.now();J.delay+=n-J.pausedAt+PEN;J.total+=PEN;J.paused=false;J.last=n}
 else{J.paused=true;J.pausedAt=Date.now();J.pauses++}
 render();
}
function land(){
 const r=J.r,c=r.c;
 chime();document.title="Landed! ✈️ · Study Flight";
 const st=S.stamps[c]||{n:0,min:0,f:r.f,last:""};
 st.n++;st.min+=Math.round(J.done/60000);st.last=new Date().toLocaleDateString();st.f=r.f;
 S.stamps[c]=st;S.dly=(S.dly||0)+(J.delay>0?1:0);S.tdl=(S.tdl||0)+Math.round(J.delay/60000);(S.log=S.log||[]).push({t:Date.now(),m:Math.round(J.done/60000),s:(J.subject||"").trim()||"Unlabeled",a:r.a,b:r.b,d:Math.round(J.delay/60000)});if(S.log.length>500)S.log.shift();updateAchievements();save();syncPassport();
 arrived={r,delay:J.delay,pauses:J.pauses};J=null;clearTrip();view="trip";render();
}
function abandon(){if(confirm("Cancel this trip? You won’t earn a stamp.")){J=null;clearTrip();view="plan";render()}}

function render(){
 if(!J&&!arrived)document.title="Study Flight";
 document.querySelectorAll("nav button").forEach(b=>b.setAttribute("aria-current",b.dataset.v===view));
 const a=$("#app");
 if(view==="plan")a.innerHTML=plan();
 else if(view==="trip")a.innerHTML=trip();
 else if(view==="hist")a.innerHTML=hist();
 else if(view==="club")a.innerHTML=club();
 else if(view==="account")a.innerHTML=accountPage();
 else a.innerHTML=pass();
 bind();
}
function plan(){
 const modes=["Flight","Train","Bus","Short hop","Custom"];
 const list=mode==="Custom"?"":R.filter(r=>r.k===mode).map(r=>`<button class="route" data-r="${R.indexOf(r)}" aria-pressed="${sel===r}"><div class="row"><span><b>${r.m} ${r.a} to ${r.b}</b><small>${r.f} ${r.c}${S.friends[r.c]?" · "+esc(S.friends[r.c])+" is waiting":""}</small></span><b>${hm(r.min)}</b></div></button>`).join("");
 const cu=mode==="Custom"?`<div class="pass"><div class="in"><label for="cm">Study length in minutes</label><input id="cm" type="number" min="1" inputmode="numeric" value="${esc(custom)}"><label for="cc">Destination country</label><input id="cc" list="cl" autocomplete="off" value="${esc(ccIn)}" placeholder="e.g. Brazil"><datalist id="cl">${CT.map(c=>`<option value="${c[0]}">`).join("")}</datalist>${note?`<div class="crew" role="alert" style="margin:12px 0 0">${esc(note)}${fix?`<div class="row" style="gap:8px;margin-top:10px"><button class="btn" data-fix="1">Use ${hm(fix)}</button><button class="btn alt" data-keep="1">Keep mine</button></div>`:""}</div>`:""}</div></div>`:"";
 const fr=sel.c&&!(mode==="Custom"&&!sel.c)?`<label for="fr">Friend in ${esc(sel.c)}</label><input id="fr" value="${esc(S.friends[sel.c]||"")}" placeholder="Name of the friend you’ll visit">`:"";
 return `<h1>Where to next?</h1><p class="sub">Pick a trip. The trip time is your study time. Stay focused to land and earn a passport stamp.</p>
 <div class="tabs" role="group" aria-label="Transport">${modes.map(m=>`<button data-m="${m}" aria-pressed="${m===mode}">${m==="Flight"?"✈️":m==="Train"?"🚆":m==="Bus"?"🚌":m==="Short hop"?"🚲":"🧭"}<br>${m}</button>`).join("")}</div>
 ${list}${cu}
 <div class="pass"><div class="in"><label for="sj">What are you studying?</label><input id="sj" value="${esc(subject)}" placeholder="e.g. Organic chemistry">${fr}</div></div>
 ${(()=>{const c=crew(false);return c?`<div class="crew">👩‍✈️ <b>Pre-boarding announcement:</b> ${esc(c)}</div>`:""})()}<button class="btn" id="go">Board now</button>`;
}
function trip(){
 if(arrived){const r=arrived.r,fr=S.friends[r.c];
  return `<div class="modal"><div class="pass"><div class="in"><div class="land">${r.f}</div><h1>Landed in ${esc(r.b)}</h1><div class="slam">ARRIVED</div>
  <p>You studied ${hm(r.min)} by ${r.k.toLowerCase()}${arrived.pauses?`, with ${arrived.pauses} pause${arrived.pauses>1?"s":""} and ${Math.round(arrived.delay/60000)} min of delay`:" with zero delays"}.</p>
  <p><b>${r.c} stamp added to your passport.</b></p>
  ${fr?`<p>🤝 ${esc(fr)} is waiting at arrivals.</p>`:`<p class="sub">Add a friend in ${esc(r.c)} from your passport.</p>`}
  ${(()=>{const c=crew(false);return c?`<div class="crew" style="text-align:left">👩‍✈️ ${esc(c)}</div>`:""})()}<button class="btn" id="ok">Plan next trip</button></div></div></div>`}
 if(!J)return `<h1>No trip in progress</h1><p class="sub">Check in to a trip first.</p><button class="btn" data-go="plan">Choose a trip</button>`;
 return `<h1>${J.r.m} ${esc(J.r.a)} to ${esc(J.r.b)}</h1><p class="sub">${J.subject?esc(J.subject)+" · ":""}${J.r.f} ${esc(J.r.c)}${S.friends[J.r.c]?" · "+esc(S.friends[J.r.c])+" is waiting":""}</p>
 <div class="pass"><div class="in">
 <div class="row"><span id="st"></span><span id="eta"></span></div>
 <canvas id="globe" width="900" height="900" role="img" aria-label="Globe showing your flight" style="width:100%;aspect-ratio:1;display:block;margin-top:12px;border-radius:12px;background:#0a1626;touch-action:none;cursor:grab"></canvas><div class="row" style="margin-top:8px"><small style="color:var(--mute)">Drag to rotate, pinch or scroll to zoom</small><button class="btn alt" id="rc" style="width:auto;padding:6px 12px;font-size:14px">Recenter</button></div>
 <div class="big" id="t" style="margin:14px 0 0"></div><small style="color:var(--mute)">study time remaining</small>
 <div class="track"><i id="bar"></i><span class="veh" id="veh">${J.r.m}</span></div>
 <div class="ends"><span>${esc(J.r.a)}</span><span>${esc(J.r.b)}</span></div></div></div>
 <div class="pass"><div class="in"><div class="tabs" style="margin:0 0 8px" role="group" aria-label="Ambient sound">${[["off","Off"],["cabin","Aircraft cabin"],["rain","Rain"],["waves","Ocean"]].map(([k,n])=>`<button data-snd="${k}" aria-pressed="${(SND?SND.kind:"off")===k}">${n}</button>`).join("")}</div><label for="vol" style="margin:0">Sound volume</label><input id="vol" type="range" min="0" max="1" step="0.05" value="${S.vol==null?.5:S.vol}"></div></div>
 <div class="crew" id="crew" hidden></div><div class="row" style="gap:8px"><button class="btn" id="pz">${J.paused?"Resume flight":"Pause"}</button><button class="btn alt" id="ab" style="width:auto">Cancel</button></div>
 <p class="sub" style="margin-top:12px">Pausing delays your arrival: the time you pause plus a 5 minute penalty is added to the trip.</p>`;
}
function paint(){
 if(!J||!$("#t"))return;
 const rem=J.total-J.done,p=Math.min(100,J.done/J.total*100);
 $("#t").textContent=fmt(rem);
 $("#bar").style.width=p+"%";$("#veh").style.left=p+"%";
 const d=Math.round((J.delay+(J.paused?Date.now()-J.pausedAt:0))/60000);
 $("#st").innerHTML=J.paused?`<span class="badge warn">Held at the gate</span>`:d>0?`<span class="badge warn">Delayed +${d} min</span>`:`<span class="badge ok">On time</span>`;
 $("#eta").textContent=J.paused?"ETA: paused":"Arrives "+clock(Date.now()+rem);
 drawGlobe(p/100);
 const cr=crew(true),ce=$("#crew");
 if(ce){ce.hidden=!cr;if(cr&&ce.dataset.t!==cr){ce.dataset.t=cr;ce.innerHTML="👩‍✈️ <b>Cabin crew:</b> "+esc(cr)}}
}

function countryFlag(country, legacy="") {
 const entry=CT.find(x=>x[0].toLowerCase()===String(country).toLowerCase());
 const code=entry?.[1] || (/^[A-Z]{2}$/.test(String(legacy))?String(legacy):"");
 if(!code)return "🌍";
 return String.fromCodePoint(...[...code].map(ch=>127397+ch.charCodeAt(0)));
}
function leaderboardPanel(){
 return `<section class="pass leaderboard-card"><div class="in">
 <div class="row"><b>Global leaderboard</b><button class="btn alt" id="refresh-board" style="width:auto;padding:7px 10px">Refresh</button></div>
 <p class="sub">Top students ranked by completed study time.</p>
 <div id="leaderboard" aria-live="polite">Loading leaderboard…</div>
 </div></section>`;
}

function pass(){
 const cs=Object.keys(S.stamps),tot=Object.values(S.stamps).reduce((a,s)=>a+s.min,0),trips=Object.values(S.stamps).reduce((a,s)=>a+s.n,0);
 const all=[...new Set([...R.map(r=>r.c),...cs])];
 return `<h1>Passport</h1><p class="sub">${cs.length} countr${cs.length===1?"y":"ies"} · ${trips} trip${trips===1?"":"s"} · ${hm(tot)} studied</p>
 ${cs.length?`<div class="stamps">${cs.map(c=>`<div class="stamp"><span class="f" role="img" aria-label="${esc(c)} flag">${countryFlag(c,S.stamps[c].f)}</span><b>${esc(c)}</b><small>${S.stamps[c].n} visit${S.stamps[c].n>1?"s":""} · ${hm(S.stamps[c].min)}</small><small>${esc(S.stamps[c].last)}</small></div>`).join("")}</div>`:`<div class="pass"><div class="in">Your passport is empty. Finish a trip to get your first stamp.</div></div>`}
 <h1 style="font-size:20px;margin-top:22px">Friends abroad</h1><p class="sub">One friend per country. They’ll greet you when you land.</p>
 <div class="pass"><div class="in">${all.map(c=>`<label for="f-${esc(c)}">${countryFlag(c,(R.find(r=>r.c===c)||{}).f||(S.stamps[c]&&S.stamps[c].f))} ${esc(c)}</label><input id="f-${esc(c)}" data-fc="${esc(c)}" value="${esc(S.friends[c]||"")}" placeholder="Friend’s name">`).join("")}</div></div>${leaderboardPanel()}`;
}

function accountPage(){
 if(account.user)return `<h1>Your account</h1><p class="sub">Signed in as <b>${esc(account.user.username)}</b>. Your passport and study log sync across devices.</p><div class="pass"><div class="in"><div class="row"><span>Account status</span><b class="ok">Synced account</b></div><p class="sub">Your study sessions are backed up when you finish a trip.</p><button class="btn alt" id="logout">Log out</button></div></div>`;
 return `<h1>Join the crew</h1><p class="sub">Create an account to back up your passport, study history and achievements, and appear on the global leaderboard.</p><div class="pass"><div class="in"><div class="tabs"><button id="show-login" aria-pressed="${account.mode!=="signup"}">Log in</button><button id="show-signup" aria-pressed="${account.mode==="signup"}">Sign up</button></div><form id="auth-form"><label for="auth-user">Username</label><input id="auth-user" autocomplete="username" minlength="3" maxlength="20" required placeholder="3–20 letters, numbers or _"><label for="auth-pass">Password</label><input id="auth-pass" type="password" autocomplete="${account.mode==="signup"?"new-password":"current-password"}" minlength="8" required placeholder="At least 8 characters"><button class="btn" style="margin-top:14px" type="submit">${account.mode==="signup"?"Create account":"Log in"}</button></form>${account.message?`<p role="status">${esc(account.message)}</p>`:""}<p class="sub">Your password is securely hashed on the server. Never share it.</p></div></div>`;
}
function achievementList(){
 const total=(S.log||[]).reduce((a,x)=>a+(x.m||0),0),countries=Object.keys(S.stamps||{}).length;
 const trips=Object.values(S.stamps||{}).reduce((a,x)=>a+x.n,0);
 const days=new Set((S.log||[]).map(x=>new Date(x.t).toDateString())).size;
 return [["first","🛬","First landing","Complete your first study trip",(S.log||[]).length>=1],["hour","⏱️","One-hour focus","Study for 60 minutes total",total>=60],["five","🌍","Globe trotter","Visit 5 countries",countries>=5],["ten","🧭","Frequent flyer","Complete 10 study trips",trips>=10],["streak","🔥","Consistency","Study on 3 separate days",days>=3]];
}
function updateAchievements(){
 S.md=S.md||{};
 for(const a of achievementList())if(a[4]&&!S.md[a[0]])S.md[a[0]]=new Date().toISOString().slice(0,10);
 save();
}
function club(){
 const medals=achievementList();
 return `<h1>Study Flight Club</h1><p class="sub">Your milestones and the global study leaderboard.</p><div class="pass"><div class="in"><b>Achievements</b><div class="stamps" style="margin-top:12px">${medals.map(x=>`<div class="stamp" style="transform:none;opacity:${x[4]?1:.48}"><span class="f">${x[1]}</span><b>${x[2]}</b><small>${x[3]}</small><small>${S.md&&S.md[x[0]]?"Unlocked · "+esc(S.md[x[0]]):"Locked"}</small></div>`).join("")}</div></div></div><div class="pass"><div class="in"><div class="row"><b>Global leaderboard</b><button class="btn alt" id="refresh-board" style="width:auto;padding:7px 10px">Refresh</button></div><p class="sub">Ranked by completed study minutes.</p><div id="leaderboard">Loading leaderboard…</div></div></div>`;
}
async function fillLeaderboard(){const el=$("#leaderboard");if(!el)return;try{const d=await api("/api/leaderboard",{headers:{}});el.innerHTML=d.leaderboard.length?d.leaderboard.map((u,i)=>`<div class="row" style="padding:9px 0;border-bottom:1px solid var(--line)"><span><b>#${i+1}</b> ${esc(u.username)}${account.user&&u.username===account.user.username?" (you)":""}</span><b>${hm(u.minutes)}</b></div>`).join(""):"No completed study trips yet. Be the first!";}catch(e){el.textContent=e.message.includes("not set up")?"Leaderboard will be available once the database is connected.":e.message}}

function bind(){
 document.querySelectorAll("[data-m]").forEach(b=>b.onclick=()=>{mode=b.dataset.m;sel=mode==="Custom"?{custom:1,m:"🧭",k:"Custom",a:"Home",b:"Destination",c:"",f:"🌍",min:0}:R.find(r=>r.k===mode);render()});
 document.querySelectorAll("[data-r]").forEach(b=>b.onclick=()=>{subject=$("#sj").value;sel=R[+b.dataset.r];render()});
 const go=$("#go");if(go)go.onclick=()=>{
  subject=$("#sj").value;
  if(sel.custom){board(false);return}
  start()};
 const fr=$("#fr");if(fr)fr.oninput=()=>{S.friends[sel.c]=fr.value.trim();save()};
 document.querySelectorAll("[data-fc]").forEach(i=>i.oninput=()=>{S.friends[i.dataset.fc]=i.value.trim();save()});
 const fx=$("[data-fix]");if(fx)fx.onclick=()=>{custom=String(fix);$("#cm").value=custom;board(true)};
 const kp=$("[data-keep]");if(kp)kp.onclick=()=>board(true);
 const cv=$("#globe");if(cv){const ps=new Map();let pd=0;
  cv.onpointerdown=e=>{ps.set(e.pointerId,[e.clientX,e.clientY]);G.vx=G.vy=0;try{cv.setPointerCapture(e.pointerId)}catch(x){}if(ps.size===2){const [a,b]=[...ps.values()];pd=Math.hypot(a[0]-b[0],a[1]-b[1])}};
  cv.onpointermove=e=>{const o=ps.get(e.pointerId);if(!o)return;
   if(ps.size===2){ps.set(e.pointerId,[e.clientX,e.clientY]);const [a,b]=[...ps.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]);if(pd)G.z=Math.max(.5,Math.min(4,G.z*d/pd));pd=d;return}
   const k=cv.clientWidth/600*GR,dx=e.clientX-o[0],dy=e.clientY-o[1];G.lo-=dx/k;G.la=Math.max(-1.4,Math.min(1.4,G.la+dy/k));G.px=-dx/k;G.py=dy/k;ps.set(e.pointerId,[e.clientX,e.clientY])};
  cv.onpointerup=cv.onpointercancel=e=>{ps.delete(e.pointerId);pd=0;G.vx=G.px||0;G.vy=G.py||0;G.px=G.py=0};
  cv.onwheel=e=>{e.preventDefault();G.z=Math.max(.5,Math.min(4,G.z*(e.deltaY<0?1.1:.9)))};
  const rc=$("#rc");if(rc)rc.onclick=()=>{G.lo=0;G.la=0;G.z=1;G.vx=G.vy=0}}
 const pz=$("#pz");if(pz)pz.onclick=pause;
 document.querySelectorAll("[data-snd]").forEach(b=>b.onclick=()=>{sound(b.dataset.snd);render()});
 const vl=$("#vol");if(vl)vl.oninput=()=>vol(+vl.value);
 const ab=$("#ab");if(ab)ab.onclick=abandon;
 const ok=$("#ok");if(ok)ok.onclick=()=>{arrived=null;view="plan";render()};
 const loginTab=$("#show-login");if(loginTab)loginTab.onclick=()=>{account.mode="login";account.message="";render()};
 const signupTab=$("#show-signup");if(signupTab)signupTab.onclick=()=>{account.mode="signup";account.message="";render()};
 const form=$("#auth-form");if(form)form.onsubmit=async e=>{e.preventDefault();const username=$("#auth-user").value.trim(),password=$("#auth-pass").value;account.busy=true;account.message="Please wait…";render();try{const d=await api(account.mode==="signup"?"/api/register":"/api/login",{method:"POST",body:JSON.stringify({username,password})});account.token=d.token;localStorage.setItem("sf_token",d.token);account.user=d.user;await syncPassport();account.message="";view="account";render()}catch(err){account.message=err.message;render()}};
 const logout=$("#logout");if(logout)logout.onclick=()=>{account.token="";account.user=null;localStorage.removeItem("sf_token");view="account";render()};
 const refresh=$("#refresh-board");if(refresh)refresh.onclick=fillLeaderboard;
 if(view==="club"||view==="pass")fillLeaderboard();
 document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>{view=b.dataset.go;render()});
 paint();
}
document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>{
 const s=$("#sj");if(s)subject=s.value;
 view=b.dataset.v;render()});
function clearTrip(){stopSound();try{localStorage.removeItem("sj_trip")}catch(e){}}
try{const t=JSON.parse(localStorage.getItem("sj_trip")||"null");if(t&&t.r&&t.total){J=t;if(!J.paused){J.paused=true;J.pausedAt=J.last||Date.now();J.pauses++}view="trip"}}catch(e){}
requestAnimationFrame(loop);
setInterval(tick,500);
render();
