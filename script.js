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
const saveLocal=()=>{try{localStorage.setItem("sj1",JSON.stringify(S))}catch(e){}};
const save=()=>{saveLocal();queuePush()};
let view="plan",mode="Flight",sel=R[0],J=null,subject="",custom="",arrived=null;
const $=s=>document.querySelector(s);
const fmt=ms=>{ms=Math.max(0,Math.ceil(ms/1000));const h=Math.floor(ms/3600),m=Math.floor(ms%3600/60),s=ms%60;return (h?h+":"+String(m).padStart(2,"0"):m)+":"+String(s).padStart(2,"0")};
const hm=m=>m>=60?Math.floor(m/60)+"h "+(m%60?m%60+"m":""):m+"m";
const clock=t=>new Date(t).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

// ---------- optional account: cloud backup & sync (the app works fully without it) ----------
let ACC=null,acctMsg="",acctOk=false,acctBusy=false,acctUser="",acctEmail="",acctMode="",resetTok="",mailEdit=false,ME=null,LB=[],pushT=0;
try{ACC=JSON.parse(localStorage.getItem("sj_acct")||"null")}catch(e){}
function setAcc(a){ACC=a;try{a?localStorage.setItem("sj_acct",JSON.stringify(a)):localStorage.removeItem("sj_acct")}catch(e){}}
async function api(path,method,body){
 const r=await fetch("/api/"+path,{method:method||"GET",headers:{"Content-Type":"application/json",...(ACC?{Authorization:"Bearer "+ACC.token}:{})},body:body?JSON.stringify(body):undefined});
 let j=null;try{j=await r.json()}catch(e){}
 if(r.status===401&&ACC&&path!=="login"&&path!=="register"){setAcc(null);acctMsg="Your session expired. Please log in again."}
 return{ok:r.ok,status:r.status,body:j||{}};
}
// Same rule as the server: stamps only grow, so a stale device can never erase progress.
function mergeServer(p){
 if(!p)return;
 for(const c of Object.keys(p.stamps||{})){const b=p.stamps[c],a=S.stamps[c];
  S.stamps[c]=!a?{...b}:{n:Math.max(a.n,b.n),min:Math.max(a.min,b.min),f:a.f||b.f,last:(b.n>a.n?b.last:a.last)||b.last||""}}
 for(const c of Object.keys(p.friends||{}))if(p.friends[c]&&!S.friends[c])S.friends[c]=p.friends[c];
 S.dly=Math.max(S.dly||0,p.dly||0);S.tdl=Math.max(S.tdl||0,p.tdl||0);
  S.st=S.st||{};for(const k of Object.keys(p.st||{}))S.st[k]=Math.max(S.st[k]||0,p.st[k]);
  S.md=S.md||{};for(const k of Object.keys(p.md||{}))if(!S.md[k]||p.md[k]<S.md[k])S.md[k]=p.md[k];
  checkMedals();
 saveLocal();
}
function queuePush(){if(!ACC)return;clearTimeout(pushT);pushT=setTimeout(push,1500)}
async function push(){
 if(!ACC)return false;
 try{const r=await api("passport","PUT",{passport:{stamps:S.stamps,friends:S.friends,dly:S.dly||0,tdl:S.tdl||0,st:S.st||{},md:S.md||{}}});
  if(r.ok){mergeServer(r.body.passport);return true}}catch(e){}
 return false;
}
async function pull(){
 if(!ACC)return;
 try{const r=await api("passport");if(r.ok){mergeServer(r.body.passport);await push()}}catch(e){}
 try{const m=await api("me");if(m.ok)ME=m.body.user}catch(e){}
 try{const l=await api("leaderboard");if(l.ok)LB=l.body.leaderboard||[]}catch(e){}
 if(view==="pass")render();
}
const okMail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
function acct(){
 const msg=acctMsg?`<p class="sub" role="status" style="color:var(--${acctOk?"ok":"warn"});margin:10px 0 0">${esc(acctMsg)}</p>`:"";
 const head=`<h1 style="font-size:20px;margin-top:22px">Account <span class="badge ok">Recommended</span></h1>`;
 const dis=acctBusy?" disabled":"";
 if(acctMode==="reset")return head+`<p class="sub">Choose a new password for your account.</p>
 <div class="pass"><div class="in"><label for="rp">New password</label><input id="rp" type="password" autocomplete="new-password" placeholder="At least 8 characters">
 <label for="rp2">Repeat new password</label><input id="rp2" type="password" autocomplete="new-password">${msg}
 <div class="row" style="gap:8px;margin-top:12px"><button class="btn" id="aReset"${dis}>Save new password</button><button class="btn alt" id="aBack" style="width:auto">Cancel</button></div></div></div>`;
 if(!ACC&&acctMode==="forgot")return head+`<p class="sub">Forgot your password? Enter the email you added to your account and we’ll send you a link to choose a new one.</p>
 <div class="pass"><div class="in"><label for="ae">Email</label><input id="ae" type="email" autocomplete="email" value="${esc(acctEmail)}" placeholder="you@example.com">${msg}
 <div class="row" style="gap:8px;margin-top:12px"><button class="btn" id="aSend"${dis}>Send reset link</button><button class="btn alt" id="aBack" style="width:auto">Back</button></div></div></div>`;
 if(!ACC)return head+`<p class="sub">Optional. A free account backs up your passport and lets you use it on any device. Adding an email lets you reset your password if you forget it. Study Flight works fine without an account.</p>
 <div class="pass"><div class="in"><label for="au">Username</label><input id="au" autocomplete="username" maxlength="20" value="${esc(acctUser)}" placeholder="3 to 20 letters, numbers or _">
 <label for="ap">Password</label><input id="ap" type="password" autocomplete="current-password" placeholder="At least 8 characters">
 <label for="ae">Email (recommended, for password recovery)</label><input id="ae" type="email" autocomplete="email" value="${esc(acctEmail)}" placeholder="you@example.com">${msg}
 <div class="row" style="gap:8px;margin-top:12px"><button class="btn" id="aReg"${dis}>Create account</button><button class="btn alt" id="aLog"${dis}>Log in</button></div>
 <button class="btn alt" id="aForgot" style="width:auto;margin-top:10px;padding:8px 12px;font-size:14px">Forgot password?</button></div></div>`;
 const lb=LB.length?`<p class="sub" style="margin:14px 0 6px">Top travellers</p>`+LB.slice(0,5).map((u,i)=>`<div class="row" style="padding:4px 0"><span>${i+1}. ${esc(u.username)}</span><span class="sub" style="margin:0">${hm(u.minutes)} · ${u.countries} countr${u.countries===1?"y":"ies"}</span></div>`).join(""):"";
 const em=ME?(ME.email?`Recovery email: <b>${esc(ME.email)}</b>`:`No recovery email yet. Add one so you can reset your password if you forget it.`):"";
 const mailBox=!ME?"":mailEdit?`<label for="ne">Email</label><input id="ne" type="email" autocomplete="email" placeholder="you@example.com"><label for="np">Current password (to confirm it’s you)</label><input id="np" type="password" autocomplete="current-password">
 <div class="row" style="gap:8px;margin-top:10px"><button class="btn" id="aMail"${dis}>Save email</button><button class="btn alt" id="aMailNo" style="width:auto">Cancel</button></div>`:`<button class="btn alt" id="aMailEdit" style="width:auto;margin-top:8px;padding:8px 12px;font-size:14px">${ME.email?"Change email":"Add recovery email"}</button>`;
 return head+`<p class="sub">Signed in as <b>${esc(ACC.user)}</b>. Your passport is backed up automatically.</p>
 <div class="pass"><div class="in">${msg||`<p class="sub" style="margin:0">Changes sync a moment after you make them.</p>`}
 ${em?`<p class="sub" style="margin:12px 0 0">${em}</p>`:""}${mailBox}${lb}
 <div class="row" style="gap:8px;margin-top:12px"><button class="btn alt" id="aOut" style="width:auto">Log out</button><button class="btn alt" id="aDel" style="width:auto">Delete account</button></div></div></div>`;
}
async function authGo(kind){
 const u=$("#au").value.trim(),pw=$("#ap").value,em=$("#ae")?$("#ae").value.trim():"";acctUser=u;acctEmail=em;acctOk=false;
 if(!u||!pw){acctMsg="Enter a username and password.";return render()}
 if(kind==="register"&&em&&!okMail(em)){acctMsg="That email address doesn’t look right.";return render()}
 acctBusy=true;acctMsg=kind==="register"?"Creating your account…":"Logging in…";render();
 try{
  const r=await api(kind,"POST",kind==="register"?{username:u,password:pw,email:em}:{username:u,password:pw});
  if(!r.ok){acctMsg=r.status===404||r.status===405?"Accounts only work on the deployed website, not when opening the file directly.":(r.body.error||"Something went wrong.")}
  else{setAcc({token:r.body.token,user:r.body.user.username});ME=r.body.user;acctMsg="";acctUser="";acctEmail="";acctBusy=false;await pull();return render()}
 }catch(e){acctMsg="Can’t reach the server. Check your connection. Your passport still works offline."}
 acctBusy=false;render();
}
async function sendReset(){
 const em=$("#ae").value.trim();acctEmail=em;acctOk=false;
 if(!okMail(em)){acctMsg="Enter a valid email address.";return render()}
 acctBusy=true;acctMsg="Sending…";render();
 try{
  const r=await api("forgot","POST",{email:em});
  if(r.ok){acctOk=true;acctMsg="If that email belongs to an account, a reset link is on its way. Check your inbox and spam folder. The link works for 1 hour."}
  else acctMsg=r.status===404||r.status===405?"Password reset only works on the deployed website.":(r.body.error||"Something went wrong.");
 }catch(e){acctMsg="Can’t reach the server. Check your connection."}
 acctBusy=false;render();
}
async function saveNewPassword(){
 const a=$("#rp").value,b=$("#rp2").value;acctOk=false;
 if(a.length<8){acctMsg="Use at least 8 characters.";return render()}
 if(a!==b){acctMsg="The two passwords don’t match.";return render()}
 acctBusy=true;acctMsg="Saving…";render();
 try{
  const r=await api("reset","POST",{token:resetTok,password:a});
  if(r.ok){setAcc({token:r.body.token,user:r.body.user.username});ME=r.body.user;acctMode="";resetTok="";acctBusy=false;acctOk=true;acctMsg="Password updated. You’re signed in.";await pull();return render()}
  acctMsg=r.body.error||"Something went wrong.";
 }catch(e){acctMsg="Can’t reach the server. Check your connection."}
 acctBusy=false;render();
}
async function saveEmail(){
 const em=$("#ne").value.trim(),pw=$("#np").value;acctOk=false;
 if(!okMail(em)){acctMsg="Enter a valid email address.";return render()}
 if(!pw){acctMsg="Enter your current password to confirm.";return render()}
 acctBusy=true;acctMsg="Saving…";render();
 try{
  const r=await api("me","PUT",{email:em,password:pw});
  if(r.ok){ME=r.body.user;mailEdit=false;acctOk=true;acctMsg="Recovery email saved."}
  else if(ACC)acctMsg=r.body.error||"Something went wrong.";
 }catch(e){acctMsg="Can’t reach the server."}
 acctBusy=false;render();
}
function bindAcct(){
 const r=$("#aReg"),l=$("#aLog"),o=$("#aOut"),d=$("#aDel");
 if(r)r.onclick=()=>authGo("register");
 if(l)l.onclick=()=>authGo("login");
 const ap=$("#ap");if(ap)ap.onkeydown=e=>{if(e.key==="Enter")authGo("login")};
 const fg=$("#aForgot");if(fg)fg.onclick=()=>{acctUser=$("#au").value.trim();acctEmail=$("#ae").value.trim();acctMode="forgot";acctMsg="";acctOk=false;render();const i=$("#ae");if(i)i.focus()};
 const bk=$("#aBack");if(bk)bk.onclick=()=>{acctMode="";resetTok="";acctMsg="";acctOk=false;render()};
 const sd=$("#aSend");if(sd){sd.onclick=sendReset;const i=$("#ae");if(i)i.onkeydown=e=>{if(e.key==="Enter")sendReset()}}
 const rs=$("#aReset");if(rs){rs.onclick=saveNewPassword;const i=$("#rp2");if(i)i.onkeydown=e=>{if(e.key==="Enter")saveNewPassword()}}
 const me=$("#aMailEdit");if(me)me.onclick=()=>{mailEdit=true;acctMsg="";acctOk=false;render();const i=$("#ne");if(i)i.focus()};
 const mn=$("#aMailNo");if(mn)mn.onclick=()=>{mailEdit=false;acctMsg="";render()};
 const ms=$("#aMail");if(ms)ms.onclick=saveEmail;
 if(o)o.onclick=async()=>{
  if(!(await push())){acctOk=false;acctMsg="Couldn’t back up your passport right now, so you’re still signed in. Try again when you’re online.";return render()}
  S={stamps:{},friends:{}};saveLocal();setAcc(null);LB=[];ME=null;mailEdit=false;acctOk=false;acctMsg="Logged out. Your passport is saved in your account; log in to get it back.";render()};
 if(d)d.onclick=async()=>{
  if(!confirm("Delete your account and its cloud backup? Your passport on this device is kept."))return;
  acctOk=false;
  try{const x=await api("me","DELETE");if(x.ok){setAcc(null);LB=[];ME=null;acctMsg="Account deleted.";return render()}acctMsg=x.body.error||"Couldn’t delete the account."}
  catch(e){acctMsg="Can’t reach the server."}render()};
}

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
const XY={};
function pt(n){if(XY[n])return XY[n];if(CITY[n])return CITY[n];const k=CT.find(c=>c[0]===n);if(k)return [k[2],k[3]];let h=0;for(const c of n)h=(h*31+c.charCodeAt(0))%1000;return [(h%120)-50,((h*7)%300)-150]}
const LAND0=["-168,66 -140,70 -95,72 -80,68 -62,58 -55,48 -70,42 -76,35 -81,25 -97,26 -97,20 -88,16 -83,9 -92,14 -105,20 -117,32 -124,40 -125,49 -135,58 -165,60","-80,8 -62,10 -50,0 -35,-6 -40,-22 -48,-28 -58,-38 -66,-46 -70,-54 -74,-48 -72,-30 -77,-12 -81,-5","-10,36 -9,43 -2,48 -5,50 5,53 8,58 5,62 15,69 30,71 60,70 100,77 140,72 170,68 180,66 165,60 160,52 142,52 140,45 130,42 122,40 122,30 120,22 108,20 106,10 100,13 98,8 104,1 98,16 92,22 88,22 80,14 77,8 72,20 66,25 57,26 50,30 48,27 56,24 59,22 52,16 43,13 35,28 36,36 27,37 26,41 20,40 12,42 16,38 8,44 3,42 -2,37","-17,21 -10,35 10,37 32,31 35,28 43,12 51,12 40,-3 40,-15 33,-26 20,-35 12,-17 9,-1 8,4 -8,4 -17,14","114,-22 122,-18 136,-12 142,-11 146,-19 153,-26 150,-37 140,-38 130,-32 115,-34","-55,60 -45,60 -20,70 -20,82 -60,82 -70,76","-5,50 1,51 -2,56 -5,58 -6,55","130,31 135,34 141,38 142,45 140,42 133,35"];
const proj=s=>s.split(" ").map(p=>{const [lo,la]=p.split(",");return (+lo+180)+","+(90-la)}).join(" ");
let MAP={},DOTS="";
function dots(){
 if(!DOTS){const polys=LAND.map(l=>l.split(" ").map(p=>p.split(",").map(Number)));
  const inP=(x,y,P)=>{let c=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const [a,b]=P[i],[e,f]=P[j];if((b>y)!==(f>y)&&x<(e-a)*(y-b)/(f-b)+a)c=!c}return c};
  for(let lo=-180;lo<180;lo+=3)for(let la=-60;la<=84;la+=3)if(polys.some(P=>inP(lo,la,P)))DOTS+=`M${lo+180} ${90-la}h0`}
 return `<path d="${DOTS}" stroke="#2f4e72" stroke-width="1.6" stroke-linecap="round" fill="none"/>`;
}
function mapSVG(a,b){
 const [la1,lo1]=pt(a),[la2,lo2]=pt(b),x1=lo1+180,y1=90-la1,x2=lo2+180,y2=90-la2;
 let w=Math.max(Math.abs(x2-x1)*1.7,90),h=Math.max(Math.abs(y2-y1)*1.7,45);
 if(w/2<h)w=h*2;w=Math.min(w,360);h=w/2;
 const vx=Math.max(0,Math.min(360-w,(x1+x2)/2-w/2)),vy=Math.max(0,Math.min(180-h,(y1+y2)/2-h/2));
 const mx=(x1+x2)/2,my=(y1+y2)/2-Math.hypot(x2-x1,y2-y1)*.18,k=w/100;
 MAP={x1,y1,mx,my,x2,y2};
 const d=`M${x1} ${y1}Q${mx} ${my} ${x2} ${y2}`;
 return `<svg class="map" viewBox="${vx} ${vy} ${w} ${h}" role="img" aria-label="Flight map from ${esc(a)} to ${esc(b)}">`+
 dots()+
 `<path d="${d}" fill="none" stroke="#5b7fa6" stroke-width="${k*.3}" stroke-dasharray="${k} ${k}"/>`+
 `<path id="fl" pathLength="100" d="${d}" fill="none" stroke="#ff6b57" stroke-linecap="round" stroke-width="${k*.7}" stroke-dasharray="0 100" style="filter:drop-shadow(0 0 2px #ff6b57)"/>`+
 [[x1,y1,a],[x2,y2,b]].map(([x,y,n])=>`<circle cx="${x}" cy="${y}" r="${k*.9}" fill="#5aa3ee"/><text x="${x}" y="${y-k*1.8}" font-size="${k*3.2}" text-anchor="middle" fill="#e8f0f7" font-weight="700">${esc(n)}</text>`).join("")+
 `<text id="pl" font-size="${k*7}" text-anchor="middle" dominant-baseline="central" transform="translate(${x1} ${y1})">${J.r.m}</text></svg>`;
}
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
"Afghanistan,AF,34.5,69.2;Albania,AL,41.3,19.8;Algeria,DZ,36.8,3.1;Andorra,AD,42.5,1.5;Angola,AO,-8.8,13.2;Antigua and Barbuda,AG,17.1,-61.8;Armenia,AM,40.2,44.5;Azerbaijan,AZ,40.4,49.9;Bahamas,BS,25.1,-77.3;Bahrain,BH,26.2,50.6;Bangladesh,BD,23.8,90.4;Barbados,BB,13.1,-59.6;Belarus,BY,53.9,27.6;Belize,BZ,17.3,-88.8;Benin,BJ,6.5,2.6;Bhutan,BT,27.5,89.6;Bolivia,BO,-16.5,-68.1;Bosnia and Herzegovina,BA,43.9,18.4;Botswana,BW,-24.7,25.9;Brunei,BN,4.9,114.9;Bulgaria,BG,42.7,23.3;Burkina Faso,BF,12.4,-1.5;Burundi,BI,-3.4,29.4;Cabo Verde,CV,14.9,-23.5;Cambodia,KH,11.6,104.9;Cameroon,CM,3.9,11.5;Central African Republic,CF,4.4,18.6;Chad,TD,12.1,15;Comoros,KM,-11.7,43.3;Republic of the Congo,CG,-4.3,15.3;Democratic Republic of the Congo,CD,-4.3,15.3;Costa Rica,CR,9.9,-84.1;Croatia,HR,45.8,16;Cuba,CU,23.1,-82.4;Cyprus,CY,35.2,33.4;Czechia,CZ,50.1,14.4;Denmark,DK,55.7,12.6;Djibouti,DJ,11.6,43.1;Dominica,DM,15.3,-61.4;Dominican Republic,DO,18.5,-69.9;Ecuador,EC,-0.2,-78.5;El Salvador,SV,13.7,-89.2;Equatorial Guinea,GQ,3.75,8.8;Eritrea,ER,15.3,38.9;Estonia,EE,59.4,24.7;Eswatini,SZ,-26.3,31.1;Ethiopia,ET,9,38.7;Fiji,FJ,-18.1,178.4;Finland,FI,60.2,24.9;Gabon,GA,0.4,9.5;Gambia,GM,13.5,-16.6;Georgia,GE,41.7,44.8;Ghana,GH,5.6,-0.2;Grenada,GD,12.1,-61.7;Guatemala,GT,14.6,-90.5;Guinea,GN,9.5,-13.7;Guinea-Bissau,GW,11.9,-15.6;Guyana,GY,6.8,-58.2;Haiti,HT,18.6,-72.3;Honduras,HN,14.1,-87.2;Hungary,HU,47.5,19;Iceland,IS,64.1,-21.9;Iran,IR,35.7,51.4;Iraq,IQ,33.3,44.4;Israel,IL,31.8,35.2;Ivory Coast,CI,6.8,-5.3;Jamaica,JM,18,-76.8;Jordan,JO,31.9,35.9;Kazakhstan,KZ,51.2,71.4;Kiribati,KI,1.45,173;Kosovo,XK,42.7,21.2;Kuwait,KW,29.4,48;Kyrgyzstan,KG,42.9,74.6;Laos,LA,18,102.6;Latvia,LV,56.95,24.1;Lebanon,LB,33.9,35.5;Lesotho,LS,-29.3,27.5;Liberia,LR,6.3,-10.8;Libya,LY,32.9,13.2;Liechtenstein,LI,47.1,9.5;Lithuania,LT,54.7,25.3;Luxembourg,LU,49.6,6.1;Madagascar,MG,-18.9,47.5;Malawi,MW,-14,33.8;Malaysia,MY,3.1,101.7;Maldives,MV,4.2,73.5;Mali,ML,12.6,-8;Malta,MT,35.9,14.5;Marshall Islands,MH,7.1,171.4;Mauritania,MR,18.1,-16;Mauritius,MU,-20.2,57.5;Micronesia,FM,6.9,158.2;Moldova,MD,47,28.9;Monaco,MC,43.7,7.4;Mongolia,MN,47.9,106.9;Montenegro,ME,42.4,19.3;Mozambique,MZ,-26,32.6;Myanmar,MM,19.75,96.1;Namibia,NA,-22.6,17.1;Nauru,NR,-0.5,166.9;Nicaragua,NI,12.1,-86.3;Niger,NE,13.5,2.1;North Korea,KP,39,125.75;North Macedonia,MK,42,21.4;Oman,OM,23.6,58.4;Palau,PW,7.5,134.6;Palestine,PS,31.9,35.2;Panama,PA,9,-79.5;Papua New Guinea,PG,-9.4,147.2;Paraguay,PY,-25.3,-57.6;Philippines,PH,14.6,121;Qatar,QA,25.3,51.5;Romania,RO,44.4,26.1;Rwanda,RW,-1.95,30.1;Saint Kitts and Nevis,KN,17.3,-62.7;Saint Lucia,LC,14,-61;Saint Vincent and the Grenadines,VC,13.2,-61.2;Samoa,WS,-13.8,-171.8;San Marino,SM,43.9,12.45;Sao Tome and Principe,ST,0.3,6.7;Senegal,SN,14.7,-17.5;Serbia,RS,44.8,20.5;Seychelles,SC,-4.6,55.5;Sierra Leone,SL,8.5,-13.2;Slovakia,SK,48.1,17.1;Slovenia,SI,46.05,14.5;Solomon Islands,SB,-9.4,160;Somalia,SO,2.05,45.3;South Sudan,SS,4.85,31.6;Sudan,SD,15.6,32.5;Suriname,SR,5.85,-55.2;Syria,SY,33.5,36.3;Taiwan,TW,25,121.5;Tajikistan,TJ,38.6,68.8;Tanzania,TZ,-6.2,35.7;Timor-Leste,TL,-8.6,125.6;Togo,TG,6.1,1.2;Tonga,TO,-21.1,-175.2;Trinidad and Tobago,TT,10.65,-61.5;Tunisia,TN,36.8,10.2;Turkmenistan,TM,37.95,58.4;Tuvalu,TV,-8.5,179.2;Uganda,UG,0.3,32.6;Ukraine,UA,50.45,30.5;Uruguay,UY,-34.9,-56.2;Uzbekistan,UZ,41.3,69.3;Vanuatu,VU,-17.7,168.3;Vatican City,VA,41.9,12.45;Venezuela,VE,10.5,-66.9;Yemen,YE,15.35,44.2;Zambia,ZM,-15.4,28.3;Zimbabwe,ZW,-17.8,31.05".split(";").forEach(s=>{const a=s.split(",");CT.push([a[0],a[1],+a[2],+a[3]])});
CT.sort((a,b)=>a[0].localeCompare(b[0]));
const ALIAS={burma:"myanmar","czech republic":"czechia","cote d'ivoire":"ivory coast","côte d’ivoire":"ivory coast",drc:"democratic republic of the congo",congo:"republic of the congo",swaziland:"eswatini",turkiye:"turkey",holland:"netherlands",korea:"south korea","east timor":"timor-leste",vatican:"vatican city","cape verde":"cabo verde",uk:"united kingdom",england:"united kingdom","united states":"usa",us:"usa",america:"usa",uae:"united arab emirates",dubai:"united arab emirates"};
const flag=cc=>String.fromCodePoint(...[...cc].map(c=>127397+c.charCodeAt(0)));
// Windows Chrome shows flag emoji as two letters, so draw flags as small images instead.
const fi=f=>{const a=[...(f||"")].map(c=>c.codePointAt(0));if(a.length===2&&a.every(x=>x>=127462&&x<=127487)){const cc=a.map(x=>String.fromCharCode(x-127397)).join("").toLowerCase();return `<img class="flag" src="https://flagcdn.com/w40/${cc}.png" srcset="https://flagcdn.com/w80/${cc}.png 2x" alt="${cc.toUpperCase()}" onerror="this.replaceWith(document.createTextNode(this.alt))">`}return f||""};
// ---------- where you are now: every trip starts from your current location, for every kind of transport ----------
const HOME={b:"Paris",c:"France",f:"🇫🇷",cc:"FR"};
const here=()=>S.at||HOME;
const cn=c=>({UK:"United Kingdom",UAE:"United Arab Emirates"})[c]||c;
const ck=n=>({"United Kingdom":"UK","United Arab Emirates":"UAE"})[n]||n; // keeps passport stamp names consistent
const dkm=(p,q)=>{const D=Math.PI/180,h=x=>Math.sin(x/2)**2,a=h((q[0]-p[0])*D)+Math.cos(p[0]*D)*Math.cos(q[0]*D)*h((q[1]-p[1])*D);return 12742*Math.asin(Math.sqrt(a))};
// continent of every country (E Europe, A Asia, F Africa, N North America, S South America, O Oceania) and a famous city for each
const CONT={},CAP={};
"E:AD,AL,AT,BA,BE,BG,BY,CH,CY,CZ,DE,DK,EE,ES,FI,FR,GB,GR,HR,HU,IE,IS,IT,LI,LT,LU,LV,MC,MD,ME,MK,MT,NL,NO,PL,PT,RO,RS,RU,SE,SI,SK,SM,UA,VA,XK;A:AE,AF,AM,AZ,BD,BH,BN,BT,CN,GE,ID,IL,IN,IQ,IR,JO,JP,KG,KH,KP,KR,KW,KZ,LA,LB,LK,MM,MN,MV,MY,NP,OM,PH,PK,PS,QA,SA,SG,SY,TH,TJ,TL,TM,TR,TW,UZ,VN,YE;F:AO,BF,BI,BJ,BW,CD,CF,CG,CI,CM,CV,DJ,DZ,EG,ER,ET,GA,GH,GM,GN,GQ,GW,KE,KM,LR,LS,LY,MA,MG,ML,MR,MU,MW,MZ,NA,NE,NG,RW,SC,SD,SL,SN,SO,SS,ST,SZ,TD,TG,TN,TZ,UG,ZA,ZM,ZW;N:AG,BB,BS,BZ,CA,CR,CU,DM,DO,GD,GT,HN,HT,JM,KN,LC,MX,NI,PA,SV,TT,US,VC;S:AR,BO,BR,CL,CO,EC,GY,PE,PY,SR,UY,VE;O:AU,FJ,KI,MH,FM,NR,NZ,PG,PW,SB,TO,TV,VU,WS".split(";").forEach(s=>{const[k,v]=s.split(":");v.split(",").forEach(c=>CONT[c]=k)});
"AF:Kabul;AL:Tirana;DZ:Algiers;AD:Andorra la Vella;AO:Luanda;AG:St. John's;AR:Buenos Aires;AM:Yerevan;AU:Sydney;AT:Vienna;AZ:Baku;BS:Nassau;BH:Manama;BD:Dhaka;BB:Bridgetown;BY:Minsk;BE:Brussels;BZ:Belmopan;BJ:Porto-Novo;BT:Thimphu;BO:La Paz;BA:Sarajevo;BW:Gaborone;BR:Brasília;BN:Bandar Seri Begawan;BG:Sofia;BF:Ouagadougou;BI:Gitega;CV:Praia;KH:Phnom Penh;CM:Yaoundé;CA:Ottawa;CF:Bangui;TD:N'Djamena;CL:Santiago;CN:Beijing;CO:Bogotá;KM:Moroni;CR:San José;HR:Zagreb;CU:Havana;CY:Nicosia;CZ:Prague;CD:Kinshasa;DK:Copenhagen;DJ:Djibouti;DM:Roseau;DO:Santo Domingo;EC:Quito;EG:Cairo;SV:San Salvador;GQ:Malabo;ER:Asmara;EE:Tallinn;SZ:Mbabane;ET:Addis Ababa;FJ:Suva;FI:Helsinki;FR:Paris;GA:Libreville;GM:Banjul;GE:Tbilisi;DE:Berlin;GH:Accra;GR:Athens;GD:St. George's;GT:Guatemala City;GN:Conakry;GW:Bissau;GY:Georgetown;HT:Port-au-Prince;HN:Tegucigalpa;HU:Budapest;IS:Reykjavik;IN:Delhi;ID:Jakarta;IR:Tehran;IQ:Baghdad;IE:Dublin;IL:Jerusalem;IT:Rome;CI:Yamoussoukro;JM:Kingston;JP:Tokyo;JO:Amman;KZ:Astana;KE:Nairobi;KI:Tarawa;XK:Pristina;KW:Kuwait City;KG:Bishkek;LA:Vientiane;LV:Riga;LB:Beirut;LS:Maseru;LR:Monrovia;LY:Tripoli;LI:Vaduz;LT:Vilnius;LU:Luxembourg;MG:Antananarivo;MW:Lilongwe;MY:Kuala Lumpur;MV:Malé;ML:Bamako;MT:Valletta;MH:Majuro;MR:Nouakchott;MU:Port Louis;MX:Mexico City;FM:Palikir;MD:Chișinău;MC:Monaco;MN:Ulaanbaatar;ME:Podgorica;MA:Rabat;MZ:Maputo;MM:Naypyidaw;NA:Windhoek;NR:Yaren;NP:Kathmandu;NL:Amsterdam;NZ:Wellington;NI:Managua;NE:Niamey;NG:Abuja;KP:Pyongyang;MK:Skopje;NO:Oslo;OM:Muscat;PK:Islamabad;PW:Ngerulmud;PS:Ramallah;PA:Panama City;PG:Port Moresby;PY:Asunción;PE:Lima;PH:Manila;PL:Warsaw;PT:Lisbon;QA:Doha;CG:Brazzaville;RO:Bucharest;RU:Moscow;RW:Kigali;KN:Basseterre;LC:Castries;VC:Kingstown;WS:Apia;SM:San Marino;ST:São Tomé;SA:Riyadh;SN:Dakar;RS:Belgrade;SC:Victoria;SL:Freetown;SG:Singapore;SK:Bratislava;SI:Ljubljana;SB:Honiara;SO:Mogadishu;ZA:Pretoria;KR:Seoul;SS:Juba;ES:Madrid;LK:Colombo;SD:Khartoum;SR:Paramaribo;SE:Stockholm;CH:Bern;SY:Damascus;TW:Taipei;TJ:Dushanbe;TZ:Dodoma;TH:Bangkok;TL:Dili;TG:Lomé;TO:Nukuʻalofa;TT:Port of Spain;TN:Tunis;TR:Ankara;TM:Ashgabat;TV:Funafuti;UG:Kampala;UA:Kyiv;AE:Dubai;GB:London;UY:Montevideo;US:New York;UZ:Tashkent;VU:Port Vila;VA:Vatican City;VE:Caracas;VN:Hanoi;YE:Sana'a;ZM:Lusaka;ZW:Harare".split(";").forEach(s=>{const i=s.indexOf(":");CAP[s.slice(0,i)]=s.slice(i+1)});
const ISL=new Set("GB IE IS CY MT JP PH ID LK TW CU JM BS BB AG DM GD KN LC VC TT DO HT KM MG MU SC CV ST FJ KI MH FM NR PW PG WS SB TO TV VU NZ AU BN TL MV".split(" "));
const LL=new Set("AD AT AM AZ BY BT BO BW BF BI CF TD CZ SZ ET HU KZ XK KG LA LS LI LU MW ML MD MN NP NE MK PY RW SM RS SK SS TJ TM UG UZ VA ZM ZW AF".split(" "));
const GBPART=new Set("FR BE NL LU DE CH".split(" ")); // reachable from the UK by Channel Tunnel
const FAM="ES IT GB PT GR TR EG MA US CA MX BR AR AE IN TH SG JP KR CN AU NZ ZA KE IS NO SE DK CH AT PL RU SA ID VN CL PE CO".split(" ");
const MODES={Flight:{m:"\u2708\ufe0f",spd:850,pad:30,lo:450,hi:1e5,n:8},Train:{m:"🚆",spd:130,pad:30,lo:60,hi:1500,n:6},Bus:{m:"🚌",spd:70,pad:30,lo:40,hi:1200,n:6},Car:{m:"🚗",spd:85,pad:15,lo:40,hi:1300,n:5},Ferry:{m:"\u26f4\ufe0f",spd:35,pad:45,lo:30,hi:1000,n:5}};
const ccOf=h=>h.cc||((findC(cn(h.c))||[])[1])||"";
const lg=c=>CONT[c]==="E"||CONT[c]==="A"?"EA":CONT[c];
function landOK(a,b){ // can you drive, bus or take a train between these two countries?
 if(!a||!b||a===b)return false;
 if(a==="GB"||b==="GB")return GBPART.has(a==="GB"?b:a);
 if(ISL.has(a)||ISL.has(b))return false;
 return lg(a)===lg(b);
}
const seaOK=(a,b)=>!!a&&!!b&&a!==b&&!LL.has(a)&&!LL.has(b)&&(ISL.has(a)||ISL.has(b)||CONT[a]!==CONT[b]);
function spread(L,n){ // always keep the nearest few, then spread the rest from medium to longest trips
 if(L.length<=n)return L;
 const k=Math.min(3,n-1),rest=L.slice(k),m=n-k,o=L.slice(0,k);
 for(let i=0;i<m;i++)o.push(rest[Math.round(i*(rest.length-1)/(m-1))]);
 return o.filter((x,i)=>o.indexOf(x)===i);
}
function mkRoute(k,o,h,c){
 const M=MODES[k],b=CAP[c[1]]||c[0],km=dkm(o,[c[2],c[3]]);
 if(!CITY[b]&&!XY[b])XY[b]=[c[2],c[3]];
 return{m:M.m,k,a:h.b,b,c:ck(c[0]),f:flag(c[1]),cc:c[1],min:Math.max(25,Math.round(km/M.spd*60+M.pad)),xy:[o,pt(b)]};
}
let RTkey="",RT=R;
function routes(){
 const h=here(),key=h.b+"|"+h.c;
 if(key===RTkey)return RT;
 RTkey=key;delete XY.Hotel;delete XY.Library;
 if(h.xy)XY[h.b]=h.xy;
 const o=pt(h.b),oc=ccOf(h),out=[];
 const pool=CT.filter(c=>c[1]!==oc&&cn(c[0])!==cn(h.c)).map(c=>({c,km:dkm(o,[c[2],c[3]])}));
 for(const k of ["Flight","Train","Bus","Car","Ferry"]){
  const M=MODES[k];
  const L=pool.filter(x=>x.km>=M.lo&&x.km<=M.hi&&(k==="Flight"?FAM.includes(x.c[1]):k==="Ferry"?seaOK(oc,x.c[1]):landOK(oc,x.c[1]))).sort((p,q)=>p.km-q.km);
  out.push(...spread(L,M.n).map(x=>mkRoute(k,o,h,x.c)));
 }
 if(S.at){XY.Hotel=o;XY.Library=[o[0]+.1,o[1]+.1];out.push({m:"🚲",k:"Short hop",a:"Hotel",b:"Library",c:h.c,f:h.f,cc:oc,min:25})}
 else out.push(R.find(r=>r.k==="Short hop"));
 RT=out;return RT;
}
function pickRoute(){const L=routes();return L.find(r=>r.k===mode)||{c:"",k:mode,min:0}}
function emptyMsg(m,h){return m==="Ferry"&&LL.has(ccOf(h))?`${h.b} is landlocked, so there are no ferries from here. Try a train, bus or car.`:`No ${m.toLowerCase()} routes from ${h.b} are close enough. Try a flight or a custom trip.`}
const findC=s=>{s=(s||"").trim().toLowerCase();s=ALIAS[s]||s;return CT.find(c=>c[0].toLowerCase()===s)};
function est(c){const D=Math.PI/180,[la,lo]=pt(here().b),h=(x)=>Math.sin(x/2)**2,dl=(c[2]-la)*D,dn=(c[3]-lo)*D;const a=h(dl)+Math.cos(la*D)*Math.cos(c[2]*D)*h(dn);const km=12742*Math.asin(Math.sqrt(a));return Math.max(25,Math.round(km/850*60+30))}
let note="",fix=0,ccIn="";
function board(force){
 subject=$("#sj").value;
 const q=findC($("#cc").value),m=+$("#cm").value;custom=$("#cm").value;ccIn=$("#cc").value;
 if(!q){note="Pick a country from the list so the flight time can be checked.";fix=0;return render()}
 if(cn(q[0])===cn(here().c)){note=`You’re already in ${q[0]}. Pick a different country.`;fix=0;return render()}
 if(!m||m<1){note="Enter how many minutes you want to study.";fix=0;return render()}
 const e=est(q);
 if(!force&&Math.abs(m-e)>Math.max(e*.3,15)){note=`${here().b} to ${q[0]} takes about ${hm(e)} by plane. You entered ${hm(m)}.`;fix=e;return render()}
 Object.assign(sel,{a:here().b,c:ck(q[0]),b:q[0],f:flag(q[1]),cc:q[1],min:m,xy:[pt(here().b),[q[2],q[3]]]});note="";fix=0;start();
}
let LP={},G={lo:0,la:0},GP=0,GR=270;
const SEAS=["47,45 50,47 53,46.5 53,44 51,42 52.5,40 53.8,37 51,36.7 49,38 49,40 48,41.5 47.5,43"];
const LAND=[
"-166,68.5 -156,71.3 -141,69.7 -128,70 -115,68.5 -108,68 -98,68.5 -95,71 -90,69 -86,68 -82,66 -81,63 -90,64 -94,60 -93,57 -88,56.5 -85,55.3 -82.3,53 -80,51.3 -79,53 -77,56 -78,60 -78,62.3 -73,62 -69,60.5 -67,58.5 -64.5,60.3 -62,57.5 -60,55.5 -57,52.5 -60,50.2 -66,50.2 -70,47 -64.5,49 -64.2,48.8 -65.5,47.5 -64.8,46 -63,45.7 -60,46 -61.5,45 -66,43.5 -67,44.8 -70,43.5 -70.5,41.8 -72,41.2 -74,40.5 -74,39.3 -75.5,38 -76,37 -75.7,35.3 -77.9,33.9 -80.9,32 -81.4,30.5 -80.4,27.5 -80.1,25.8 -80.9,25.2 -81.8,26.2 -82.8,27.8 -83.7,29.9 -85.3,29.7 -87.5,30.3 -89.2,30.2 -89.4,29 -91,29.2 -93.8,29.7 -95,29.2 -97.2,27.8 -97.2,25.9 -97.8,22.3 -97.2,20.6 -96.1,19.2 -94.5,18.2 -92,18.6 -91,19.2 -90.5,21 -88,21.5 -86.8,21.2 -87.5,18.5 -88.3,16.5 -86,15.9 -83.3,15 -83.5,12 -83.7,10.9 -82.5,9.5 -81.5,8.8 -79.6,9.6 -77.4,8.6 -78.2,7.5 -80,7.3 -82.9,8.2 -85.7,10 -87.7,13 -90.5,13.8 -92.2,14.5 -94.5,16.2 -96.5,15.7 -99.9,16.8 -102,17.9 -105.5,20 -105.5,23 -106.8,24.6 -109.4,26 -110.6,27.9 -112.8,31 -114.7,31.7 -113.2,29.3 -111.2,25.8 -109.5,23.2 -112,24.5 -114.5,27.5 -116,30.4 -117.1,32.5 -118.5,34 -120.6,34.5 -121.9,36.6 -122.5,37.8 -123.8,39.4 -124.4,40.4 -124.1,43 -124,46.2 -124.7,48.4 -123,48.2 -122.8,49 -125,50.2 -128,52.5 -130,54.7 -133,57.3 -135.5,59.2 -139,60 -144,60.1 -149.5,59.8 -151,59.3 -151.5,61.1 -153.5,59.5 -156,57.3 -160,55.7 -164.5,54.6 -162,56 -158.5,58 -161,58.7 -165,60.5 -166,62 -164.5,63.5 -161,64.5 -166,64.6 -168,65.6 -164,66.5",
"-77.4,8.6 -75.5,10.7 -72,12 -71.3,10.8 -69.5,11.5 -66,10.6 -62,10.7 -60.5,8.5 -57,6 -52,5 -51,4 -50,1 -50,-0.5 -48,-1 -44.5,-2.5 -40,-2.9 -37,-4.8 -35,-5.5 -34.8,-8 -36,-10.5 -38.5,-13 -39,-17 -40,-20 -41,-22 -43,-23 -45,-23.8 -48.5,-26 -48.7,-28.5 -51,-31 -53.4,-33.7 -55,-35 -57,-34.8 -58.5,-34 -57,-36.5 -57.5,-38.2 -62,-39 -62.3,-41 -65,-41 -64.5,-42.5 -65.5,-45 -67.5,-46.5 -66,-48 -68.5,-50.2 -69,-52.2 -68.4,-54.1 -66,-55 -71,-54.9 -74,-52.5 -75.5,-49 -73.8,-44 -73.5,-40 -73.5,-37 -71.7,-33 -71.5,-30 -70.4,-23.5 -70.2,-18.5 -75,-15.5 -77.2,-12 -79.5,-8 -81.3,-6 -80.2,-3.4 -81,-1 -80.1,0.8 -78.8,1.8 -77.4,4 -77.5,7",
"-9.3,37 -9.5,39 -8.9,41.5 -9.2,43 -8,43.7 -4,43.4 -1.8,43.4 -1.2,46 -2.5,47.3 -4.5,48 -1.5,48.7 -1.2,49.6 1.5,50.2 3,51 4.5,52.8 8,53.7 8.6,55.5 8.2,57 10.5,57.7 10.6,56 9.8,54.8 11,54 13.8,54.2 18.5,54.8 21,55.3 21,57.5 24,57.2 24.4,59.4 28,59.5 30,60 25,60.4 22.5,60.2 21.5,61.5 21.5,63.5 25,65 24.5,65.8 21.5,65.3 17.5,62.8 17.2,60.8 18.8,60 16.8,57 14.5,56 12.8,55.5 12.8,56.9 11.2,58.2 10,59 8,58.1 5.5,58.7 5,61 7,62.8 11.5,64.3 14.5,66.5 17,69 20,70 25,71 30,70.4 33,69.5 40.5,67.5 41,66.2 34,66.7 33,64.5 37,64 40.5,64.6 44,66.2 44,68.4 53,68.6 60,69.2 66,69 68,72 72,72.8 73,68.7 80,72.5 87,74.3 100,77 105,77.7 112,75.5 113.5,73.8 128,73 130,71 140,72.8 150,71.5 160,69.7 170,70.2 180,68.8 180,65 177,64.7 170,60 163,59.5 163,56 162,54 160,52.5 156.7,50.9 156,53 156,57 160,59.5 154,59.3 150,59.6 143,59.3 140.5,57.8 137.5,54 141,53.5 141.5,52.5 140.4,50 140.3,48.5 138,46.5 135.5,43.5 133,42.7 131,42.5 129.8,41 129.5,40.7 128,38.5 129.4,36.5 129.2,35.1 126.5,34.5 126.5,37 125,38 125.2,39.5 124.3,39.9 121.5,40.5 121,38.9 118,39.2 119,37.2 122.5,37.2 120,35 120.9,32 121.9,30.9 122,29.8 121,28 120,26 118.5,24.5 116.5,22.8 114,22.3 111,21.4 110.2,20.3 108.5,21.7 106.7,20.5 105.8,19 108.5,15.5 109.3,12 107,10.4 105,8.7 104.8,10 102.5,12 100.9,13.4 100,12.5 99.2,10 100.3,7 101,6.3 102.3,6.1 103.4,4.5 103.5,2.5 104.2,1.4 103.3,1.5 101.2,2.8 100.4,5 100.2,6.5 98.3,8 98.5,10 98.7,12 97.7,16.5 95.5,16 94.2,18.5 93,20 92,21.3 91.3,22.7 90.5,22.3 88.8,21.7 87,21 86.5,19.8 84.5,18.2 82,16.3 80.3,15.5 80.2,13 79.8,10.3 78.3,8.9 77.5,8.1 76.3,9.8 75,12.5 74,15 72.8,19 72.8,21 70,21 68.8,23.2 66.5,25.4 62,25.2 57.5,25.7 56.5,27 54,26.7 51.5,27.9 49,30 48,30 50,27 50.2,26 51.3,24.6 51.5,24.2 54,24.2 56.3,26.2 56.5,24.5 58.7,23.6 59.8,22.3 58.7,20.5 57.7,19 55.5,17.3 52.5,16.2 49,14.5 45,12.8 43.3,12.7 42.8,15.2 42.7,16.7 41,19 39,21.5 38,24 35.5,27.5 34.9,29.5 34.3,31.3 35,33.5 35.8,35 36,36.6 33.5,36.1 30.5,36.5 28.5,36.7 27,37.9 26.3,39.5 26.4,40.2 29,40.9 29,41.2 31,41.1 35,42 38,40.9 41.7,41.5 41.6,42.6 40,43.4 39,44 37.5,44.7 36.6,45.4 35,45 33.5,44.4 32.5,45.3 33.7,46 31.5,46.6 30.5,46.4 29.7,45.2 28.6,44.2 28,42.5 27.8,41.7 29,41.2 28.1,41 26.2,40.6 24,40.8 23,40.2 22.9,39 24,38 23,36.5 21.5,36.8 21.2,38 20.1,39.5 19.4,41 18.5,42.4 15.5,44.2 14,45.2 12.4,45.4 12.5,44 14,42.5 16,41.8 18.5,40.1 17,39 16.5,38 15.7,40 14.5,41 12,42 10.5,43 8.8,44.4 7,43.7 4.5,43.4 3,42.6 3,41.8 0.8,41 -0.2,39.5 0,38.6 -0.7,37.6 -2.2,36.7 -4.5,36.7 -5.4,36 -6.3,36.8 -7.4,37.2",
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
 const inP=(x,y,P)=>{let c=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const [a,b]=P[i],[e,f]=P[j];if((b>y)!==(f>y)&&x<(e-a)*(y-b)/(f-b)+a)c=!c}return c};
 const spans=(PS,y)=>{const r=[];for(const P of PS){const xs=[];for(let i=0,j=P.length-1;i<P.length;j=i++){const [a,b]=P[i],[e,f]=P[j];if((b>y)!==(f>y))xs.push((e-a)*(y-b)/(f-b)+a)}xs.sort((m,n)=>m-n);for(let i=0;i+1<xs.length;i+=2)r.push([xs[i],xs[i+1]])}return r};
 for(let la=-58;la<=84;la+=st){const L=spans(polys,la),S=spans(seas,la);for(let lo=-180;lo<180;lo+=st)if(L.some(s=>lo>=s[0]&&lo<=s[1])&&!S.some(s=>lo>=s[0]&&lo<=s[1]))out.push([Math.cos(la*D)*Math.cos(lo*D),Math.cos(la*D)*Math.sin(lo*D),Math.sin(la*D)])}
 return out;
}
function drawGlobe(p){
 const cv=$("#globe");if(!cv)return;
 const g=cv.getContext("2d"),C=300,D=Math.PI/180,[a1,o1]=pt(J.r.a),[a2,o2]=pt(J.r.b);
 const v=(la,lo)=>[Math.cos(la*D)*Math.cos(lo*D),Math.cos(la*D)*Math.sin(lo*D),Math.sin(la*D)];
 const A=v(a1,o1),B=v(a2,o2),om=Math.acos(Math.max(-1,Math.min(1,A[0]*B[0]+A[1]*B[1]+A[2]*B[2])))||1e-6,sn=Math.sin(om);
 const at=t=>{const x=Math.sin((1-t)*om)/sn,y=Math.sin(t*om)/sn;return [x*A[0]+y*B[0],x*A[1]+y*B[1],x*A[2]+y*B[2]]};
 const Pc0=at(p),lat0=Math.max(-1.45,Math.min(1.45,Math.asin(Pc0[2])+G.la)),lon0=Math.atan2(Pc0[1],Pc0[0])+G.lo,Pc=[Math.cos(lat0)*Math.cos(lon0),Math.cos(lat0)*Math.sin(lon0),Math.sin(lat0)];GP=p;
 const z=Math.max(1,Math.min(3,5000/(om*6371))),R=270*z;GR=R;
 const ex=[-Math.sin(lon0),Math.cos(lon0)],ey=[-Math.sin(lat0)*Math.cos(lon0),-Math.sin(lat0)*Math.sin(lon0),Math.cos(lat0)];
 const P=u=>({x:C+R*(u[0]*ex[0]+u[1]*ex[1]),y:C-R*(u[0]*ey[0]+u[1]*ey[1]+u[2]*ey[2]),d:u[0]*Pc[0]+u[1]*Pc[1]+u[2]*Pc[2]});
 g.clearRect(0,0,600,600);
 const gr=g.createRadialGradient(C-70,C-70,20,C,C,R);gr.addColorStop(0,"#1a3a66");gr.addColorStop(1,"#091422");
 g.fillStyle=gr;g.beginPath();g.arc(C,C,R,0,7);g.fill();g.strokeStyle="rgba(90,163,238,.55)";g.lineWidth=4;g.stroke();
 const st=z>1.4?1:2,s=Math.max(2.5,R*st*.0175*.58);
 for(const u of landPts(st)){const q=P(u);if(q.d>0){g.fillStyle=`rgba(125,175,230,${.2+.7*q.d})`;g.fillRect(q.x-s/2,q.y-s/2,s,s)}}
 let prev=null;
 for(let i=0;i<=90;i++){const t=i/90,q=P(at(t));
  if(prev&&q.d>0&&prev.d>0){g.beginPath();g.moveTo(prev.x,prev.y);g.lineTo(q.x,q.y);
   if(t<=p){g.strokeStyle="#ff6b57";g.lineWidth=5;g.shadowColor="#ff6b57";g.shadowBlur=12;g.setLineDash([])}
   else{g.strokeStyle="rgba(200,225,255,.75)";g.lineWidth=3;g.shadowBlur=0;g.setLineDash([4,8])}
   g.stroke()}
  prev=q}
 g.shadowBlur=0;g.setLineDash([]);g.textAlign="center";g.textBaseline="middle";
 for(const [u,n] of [[A,J.r.a],[B,J.r.b]]){const q=P(u);if(q.d>0){g.fillStyle="#5aa3ee";g.strokeStyle="#fff";g.lineWidth=3;g.beginPath();g.arc(q.x,q.y,9,0,7);g.fill();g.stroke();g.fillStyle="#e8f0f7";g.font="700 24px system-ui,sans-serif";g.fillText(n,q.x,q.y-24)}}
 const q0=P(at(Math.max(0,p-.02))),q2=P(at(Math.min(1,p+.02)));
 const qp=P(at(p));if(qp.d<=0)return;g.save();g.translate(qp.x,qp.y);if(J.r.m==="\u2708\ufe0f")g.rotate(Math.atan2(q2.y-q0.y,q2.x-q0.x)+Math.PI/4);
 g.font="48px serif";g.fillText(J.r.m,0,0);g.restore();
}
let AC=null;
function unlock(){try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();if(AC.state==="suspended")AC.resume()}catch(e){}}
function chime(){try{if(!AC)return;[[659,0],[784,.18],[1047,.36]].forEach(([f,t])=>{const o=AC.createOscillator(),g=AC.createGain();o.type="sine";o.frequency.value=f;o.connect(g);g.connect(AC.destination);const s=AC.currentTime+t;g.gain.setValueAtTime(0,s);g.gain.linearRampToValueAtTime(.25,s+.03);g.gain.exponentialRampToValueAtTime(.001,s+.9);o.start(s);o.stop(s+1)})}catch(e){}}
function start(){
 unlock();G.lo=0;G.la=0;
 const mins=sel.custom?+custom:sel.min;
 if(!mins||mins<1)return;
 if(sel.xy){XY[sel.a]=sel.xy[0];XY[sel.b]=sel.xy[1]}
 J={r:{...sel,min:mins},total:mins*60000,done:0,delay:0,pauses:0,paused:false,last:Date.now(),pausedAt:0,subject};
 view="trip";render();
}
function pause(){
 if(J.paused){const n=Date.now();J.delay+=n-J.pausedAt+PEN;J.total+=PEN;J.paused=false;J.last=n}
 else{J.paused=true;J.pausedAt=Date.now();J.pauses++}
 render();
}
function land(){
  const r=J.r,c=r.c,mins=Math.round(J.done/60000),delayMin=Math.round(J.delay/60000);
  chime();document.title="Landed! ✈️ · Study Flight";
  const st=S.stamps[c]||{n:0,min:0,f:r.f,last:""};
  st.n++;st.min+=mins;st.last=new Date().toLocaleDateString();st.f=r.f;
  if(r.k!=="Short hop"){S.at=(r.b===HOME.b&&r.c===HOME.c)?null:{b:r.b,c:r.c,f:r.f,cc:r.cc||(findC(cn(r.c))||[])[1]||"",xy:pt(r.b)}}
  S.stamps[c]=st;S.dly=(S.dly||0)+(J.delay>0?1:0);S.tdl=(S.tdl||0)+delayMin;
  recordStats(r,delayMin,J.pauses,mins);const medals=checkMedals();save();
  arrived={r,delay:J.delay,pauses:J.pauses,medals};J=null;sel=pickRoute();clearTrip();view="trip";render();
 }
 function abandon(){if(confirm("Cancel this trip? You won’t earn a stamp.")){J=null;clearTrip();view="plan";render()}}

// ---------- medals: from common to legendary ----------
const localISO=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const stv=k=>(S.st&&S.st[k])||0;
const nTrips=()=>Object.values(S.stamps||{}).reduce((a,x)=>a+x.n,0);
const nMin=()=>Object.values(S.stamps||{}).reduce((a,x)=>a+x.min,0);
const nCty=()=>Object.keys(S.stamps||{}).length;
const nFr=()=>Object.values(S.friends||{}).filter(Boolean).length;
const nConts=()=>new Set(Object.keys(S.stamps||{}).map(n=>CONT[(findC(cn(n))||[])[1]]).filter(Boolean)).size;
const nModes=()=>["Flight","Train","Bus","Car","Ferry"].filter(k=>stv("m_"+k)>0).length;
const MEDALS=[
 {id:"first",i:"🎫",n:"First Boarding",d:"Land your first trip",r:"Common",g:1,v:nTrips},
 {id:"cty3",i:"🧭",n:"Passport Pages",d:"Visit 3 countries",r:"Common",g:3,v:nCty},
 {id:"h1",i:"⏱️",n:"Warm-up",d:"Study for 1 hour in total",r:"Common",g:60,u:"min",v:nMin},
 {id:"trips10",i:"🧳",n:"Frequent Flyer",d:"Land 10 trips",r:"Common",g:10,v:nTrips},
 {id:"clean3",i:"🛬",n:"Smooth Landing",d:"Land 3 trips in a row without pausing",r:"Common",g:3,v:()=>stv("best")},
 {id:"turb",i:"🌩️",n:"Turbulence Survivor",d:"Land a trip after 30+ minutes of delay",r:"Common",g:1,v:()=>stv("turb")},
 {id:"day3",i:"🔥",n:"On a Roll",d:"Study 3 days in a row",r:"Common",g:3,v:()=>stv("dbest")},
 {id:"ferry",i:"⚓",n:"Sea Legs",d:"Take your first ferry",r:"Common",g:1,v:()=>stv("m_Ferry")},
 {id:"cty10",i:"🗺️",n:"Explorer",d:"Visit 10 countries",r:"Rare",g:10,v:nCty},
 {id:"h10",i:"📚",n:"Bookworm",d:"Study for 10 hours in total",r:"Rare",g:600,u:"min",v:nMin},
 {id:"owl",i:"🦉",n:"Night Owl",d:"Land a trip between midnight and 5 am",r:"Rare",g:1,v:()=>stv("owl")},
 {id:"lark",i:"🐦",n:"Early Bird",d:"Land a trip between 5 and 8 am",r:"Rare",g:1,v:()=>stv("lark")},
 {id:"day7",i:"📆",n:"Week Warrior",d:"Study 7 days in a row",r:"Rare",g:7,v:()=>stv("dbest")},
 {id:"rail",i:"🚉",n:"Rail Rider",d:"Take 5 train trips",r:"Rare",g:5,v:()=>stv("m_Train")},
 {id:"fr5",i:"🤝",n:"Welcome Committee",d:"Add friends in 5 countries",r:"Rare",g:5,v:nFr},
 {id:"cont3",i:"🌏",n:"Continent Hopper",d:"Visit 3 continents",r:"Rare",g:3,v:nConts},
 {id:"cty25",i:"🌐",n:"Globetrotter",d:"Visit 25 countries",r:"Epic",g:25,v:nCty},
 {id:"h50",i:"🧠",n:"Deep Thinker",d:"Study for 50 hours in total",r:"Epic",g:3000,u:"min",v:nMin},
 {id:"trips50",i:"🛩️",n:"Jet Setter",d:"Land 50 trips",r:"Epic",g:50,v:nTrips},
 {id:"clean10",i:"🎯",n:"Autopilot",d:"Land 10 trips in a row without pausing",r:"Epic",g:10,v:()=>stv("best")},
 {id:"long8",i:"🛫",n:"Long-Haul Hero",d:"Finish a trip of 8 hours or more",r:"Epic",g:480,u:"min",v:()=>stv("long")},
 {id:"modes",i:"🎒",n:"All Aboard",d:"Finish a trip by flight, train, bus, car and ferry",r:"Epic",g:5,v:nModes},
 {id:"cty50",i:"🏆",n:"Citizen of the World",d:"Visit 50 countries",r:"Legendary",g:50,v:nCty},
 {id:"h100",i:"👑",n:"Centurion",d:"Study for 100 hours in total",r:"Legendary",g:6000,u:"min",v:nMin},
 {id:"iron",i:"💎",n:"Iron Focus",d:"Finish a 12 hour trip without pausing",r:"Legendary",g:1,v:()=>stv("iron")},
 {id:"day30",i:"⚡",n:"Unstoppable",d:"Study 30 days in a row",r:"Legendary",g:30,v:()=>stv("dbest")},
 {id:"cont6",i:"🪐",n:"Every Continent",d:"Visit all 6 continents",r:"Legendary",g:6,v:nConts}
];
function recordStats(r,delayMin,pauses,mins){
 const now=new Date(),h=now.getHours(),iso=localISO(now),st=S.st=S.st||{};
 const key="m_"+({"Short hop":"Bike",Custom:"Flight"}[r.k]||r.k);
 st[key]=(st[key]||0)+1;
 if(pauses===0){S.run=(S.run||0)+1;if(mins>=720)st.iron=(st.iron||0)+1}else S.run=0;
 st.best=Math.max(st.best||0,S.run||0);
 st.long=Math.max(st.long||0,mins);
 if(delayMin>=30)st.turb=(st.turb||0)+1;
 if(h<5)st.owl=(st.owl||0)+1;else if(h<8)st.lark=(st.lark||0)+1;
 if(S.day!==iso){const y=new Date(now);y.setDate(y.getDate()-1);S.ds=S.day===localISO(y)?(S.ds||0)+1:1;S.day=iso}
 st.dbest=Math.max(st.dbest||0,S.ds||1);
}
function checkMedals(){ // returns the medals that were just unlocked
 const iso=localISO(new Date()),out=[];S.md=S.md||{};
 for(const m of MEDALS)if(!S.md[m.id]&&m.v()>=m.g){S.md[m.id]=iso;out.push(m)}
 return out;
}
function streakNow(){
 if(!S.day||!S.ds)return 0;
 const t=new Date(),y=new Date(t);y.setDate(y.getDate()-1);
 return S.day===localISO(t)||S.day===localISO(y)?S.ds:0;
}
function medalHTML(m,done,cur){
 const val=m.u==="min"?hm(cur)+" / "+hm(m.g):cur+" / "+m.g;
 return `<div class="medal${done?"":" locked"}" data-r="${m.r}"><span class="mi" aria-hidden="true">${done?m.i:"🔒"}</span><b>${esc(m.n)}</b><span class="rar">${m.r}</span><small>${esc(m.d)}</small>${done?(S.md&&S.md[m.id]?`<small>Earned ${esc(S.md[m.id])}</small>`:""):`<div class="mp"><i style="width:${Math.round(cur/m.g*100)}%"></i></div><small>${val}</small>`}</div>`;
}
function medalsHTML(){
 const rank={Common:0,Rare:1,Epic:2,Legendary:3};
 const L=MEDALS.map(m=>{const v=m.v();return{m,cur:Math.min(v,m.g),done:!!(S.md&&S.md[m.id])||v>=m.g}});
 const got=L.filter(x=>x.done).sort((a,b)=>rank[b.m.r]-rank[a.m.r]),todo=L.filter(x=>!x.done).sort((a,b)=>b.cur/b.m.g-a.cur/a.m.g);
 const top=got.length?`Rarest so far: ${got[0].m.i} <b>${esc(got[0].m.n)}</b> (${got[0].m.r})`:"Finish a trip to start collecting medals.";
 return `<h1 style="font-size:20px;margin-top:22px">Medals</h1><p class="sub">${got.length} of ${MEDALS.length} unlocked · ${top}</p><div class="medals">${[...got,...todo].map(x=>medalHTML(x.m,x.done,x.cur)).join("")}</div>`;
}
// ---------- change where you are (so you can start a trip from anywhere) ----------
let locEdit=false,locNote="";
const MIC={Flight:"\u2708\ufe0f",Train:"🚆",Bus:"🚌",Car:"🚗",Ferry:"\u26f4\ufe0f","Short hop":"🚲",Custom:"🧭"};
function setLoc(){
 const q=findC($("#lc").value);
 if(!q){locNote="Pick a country from the list.";return render()}
 locNote="";locEdit=false;const sj=$("#sj");if(sj)subject=sj.value;
 if(q[1]==="FR")S.at=null;
 else{const b=CAP[q[1]]||q[0];if(!CITY[b])XY[b]=[q[2],q[3]];S.at={b,c:ck(q[0]),f:flag(q[1]),cc:q[1],xy:pt(b)}}
 save();sel=pickRoute();render();
}
function bindLoc(){
 const e=$("#lcEdit"),ok=$("#lcOk"),no=$("#lcNo"),lc=$("#lc");
 if(e)e.onclick=()=>{const sj=$("#sj");if(sj)subject=sj.value;locEdit=true;locNote="";render();const i=$("#lc");if(i)i.focus()};
 if(ok)ok.onclick=setLoc;
 if(no)no.onclick=()=>{locEdit=false;locNote="";render()};
 if(lc)lc.onkeydown=ev=>{if(ev.key==="Enter")setLoc()};
}

function render(){
 routes();
 if(!J&&!arrived)document.title="Study Flight";
 document.querySelectorAll("nav button").forEach(b=>b.setAttribute("aria-current",b.dataset.v===view));
 const a=$("#app");
 if(view==="plan")a.innerHTML=plan();
 else if(view==="trip")a.innerHTML=trip();
 else a.innerHTML=pass();
 bind();
}
function plan(){
 const modes=["Flight","Train","Bus","Car","Ferry","Short hop","Custom"];
 const RL=routes(),h=here();
 const rows=RL.filter(r=>r.k===mode);
 const list=mode==="Custom"?"":(rows.length?"":`<p class="sub">${esc(emptyMsg(mode,h))}</p>`)+rows.map(r=>`<button class="route" data-r="${RL.indexOf(r)}" aria-pressed="${sel===r}"><div class="row"><span><b>${r.m} ${r.a} to ${r.b}</b><small>${fi(r.f)} ${r.c}${S.friends[r.c]?" · "+esc(S.friends[r.c])+" is waiting":""}</small></span><b>${hm(r.min)}</b></div></button>`).join("");
 const cu=mode==="Custom"?`<div class="pass"><div class="in"><label for="cm">Study length in minutes</label><input id="cm" type="number" min="1" inputmode="numeric" value="${esc(custom)}"><label for="cc">Destination country</label><input id="cc" list="cl" autocomplete="off" value="${esc(ccIn)}" placeholder="e.g. Brazil"><datalist id="cl">${CT.map(c=>`<option value="${c[0]}">`).join("")}</datalist>${note?`<div class="crew" role="alert" style="margin:12px 0 0">${esc(note)}${fix?`<div class="row" style="gap:8px;margin-top:10px"><button class="btn" data-fix="1">Use ${hm(fix)}</button><button class="btn alt" data-keep="1">Keep mine</button></div>`:""}</div>`:""}</div></div>`:"";
 const fr=sel.c&&!(mode==="Custom"&&!sel.c)?`<label for="fr">Friend in ${esc(sel.c)}</label><input id="fr" value="${esc(S.friends[sel.c]||"")}" placeholder="Name of the friend you’ll visit">`:"";
 return `<h1>Where to next?</h1><p class="sub">📍 You’re in <b>${fi(h.f)} ${esc(h.b)}</b> <button class="btn alt" id="lcEdit" style="width:auto;padding:4px 10px;font-size:13px;margin-left:6px">Change</button>${S.at?` <button class="btn alt" data-home="1" style="width:auto;padding:4px 10px;font-size:13px;margin-left:6px">Back to ${HOME.b}</button>`:""}${streakNow()>=2?` · 🔥 ${streakNow()}-day streak`:""}</p>${locEdit?`<div class="pass"><div class="in"><label for="lc">Where are you right now?</label><input id="lc" list="cl2" autocomplete="off" placeholder="e.g. Luxembourg"><datalist id="cl2">${CT.map(c=>`<option value="${c[0]}">`).join("")}</datalist>${locNote?`<p class="sub" role="alert" style="color:var(--warn);margin:8px 0 0">${esc(locNote)}</p>`:""}<div class="row" style="gap:8px;margin-top:12px"><button class="btn" id="lcOk">Set location</button><button class="btn alt" id="lcNo" style="width:auto">Cancel</button></div></div></div>`:""}<p class="sub">Pick a trip. The trip time is your study time. Stay focused to land and earn a passport stamp.</p>
 <div class="tabs" role="group" aria-label="Transport">${modes.map(m=>`<button data-m="${m}" aria-pressed="${m===mode}">${MIC[m]}<br>${m}</button>`).join("")}</div>
 ${list}${cu}
 <div class="pass"><div class="in"><label for="sj">What are you studying?</label><input id="sj" value="${esc(subject)}" placeholder="e.g. Organic chemistry">${fr}</div></div>
 ${(()=>{const c=crew(false);return c?`<div class="crew">👩‍✈️ <b>Pre-boarding announcement:</b> ${esc(c)}</div>`:""})()}<button class="btn" id="go">Board now</button>`;
}
function trip(){
 if(arrived){const r=arrived.r,fr=S.friends[r.c];
  return `<div class="modal"><div class="pass"><div class="in"><div class="land">${fi(r.f)}</div><h1>Landed in ${esc(r.b)}</h1><div class="slam">ARRIVED</div>
  <p>You studied ${hm(r.min)} by ${r.k.toLowerCase()}${arrived.pauses?`, with ${arrived.pauses} pause${arrived.pauses>1?"s":""} and ${Math.round(arrived.delay/60000)} min of delay`:" with zero delays"}.</p>
  <p><b>${r.c} stamp added to your passport.</b></p>
   ${arrived.medals&&arrived.medals.length?`<div class="newm"><b>🏅 New medal${arrived.medals.length>1?"s":""} unlocked!</b>${arrived.medals.map(m=>`<div class="medal" data-r="${m.r}"><span class="mi">${m.i}</span><b>${esc(m.n)}</b><span class="rar">${m.r}</span><small>${esc(m.d)}</small></div>`).join("")}</div>`:""}
  ${fr?`<p>🤝 ${esc(fr)} is waiting at arrivals.</p>`:`<p class="sub">Add a friend in ${esc(r.c)} from your passport.</p>`}
  ${(()=>{const c=crew(false);return c?`<div class="crew" style="text-align:left">👩‍✈️ ${esc(c)}</div>`:""})()}<button class="btn" id="ok">Plan next trip</button></div></div></div>`}
 if(!J)return `<h1>No trip in progress</h1><p class="sub">Check in to a trip first.</p><button class="btn" data-go="plan">Choose a trip</button>`;
 return `<h1>${J.r.m} ${esc(J.r.a)} to ${esc(J.r.b)}</h1><p class="sub">${J.subject?esc(J.subject)+" · ":""}${fi(J.r.f)} ${esc(J.r.c)}${S.friends[J.r.c]?" · "+esc(S.friends[J.r.c])+" is waiting":""}</p>
 <div class="pass"><div class="in">
 <div class="row"><span id="st"></span><span id="eta"></span></div>
 <canvas id="globe" width="600" height="600" role="img" aria-label="Globe showing your flight" style="width:100%;aspect-ratio:1;display:block;margin-top:12px;border-radius:12px;background:#0a1626;touch-action:none;cursor:grab"></canvas><div class="row" style="margin-top:8px"><small style="color:var(--mute)">Drag to rotate the globe</small><button class="btn alt" id="rc" style="width:auto;padding:6px 12px;font-size:14px">Recenter</button></div>
 <div class="big" id="t" style="margin:14px 0 0"></div><small style="color:var(--mute)">study time remaining</small>
 <div class="track"><i id="bar"></i><span class="veh" id="veh">${J.r.m}</span></div>
 <div class="ends"><span>${esc(J.r.a)}</span><span>${esc(J.r.b)}</span></div></div></div>
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
 drawGlobe(p/100);const M=MAP,pp=p/100,q=1-pp;
 const px=q*q*M.x1+2*q*pp*M.mx+pp*pp*M.x2,py=q*q*M.y1+2*q*pp*M.my+pp*pp*M.y2;
 const tx=2*q*(M.mx-M.x1)+2*pp*(M.x2-M.mx),ty=2*q*(M.my-M.y1)+2*pp*(M.y2-M.my);
 const pl=$("#pl");if(pl)pl.setAttribute("transform",`translate(${px} ${py})`+(J.r.m==="✈️"?` rotate(${Math.atan2(ty,tx)*180/Math.PI+45})`:""));
 const fl=$("#fl");if(fl)fl.setAttribute("stroke-dasharray",`${p} 100`);
 const cr=crew(true),ce=$("#crew");
 if(ce){ce.hidden=!cr;if(cr&&ce.dataset.t!==cr){ce.dataset.t=cr;ce.innerHTML="👩‍✈️ <b>Cabin crew:</b> "+esc(cr)}}
}
function pass(){
 const cs=Object.keys(S.stamps),tot=Object.values(S.stamps).reduce((a,s)=>a+s.min,0),trips=Object.values(S.stamps).reduce((a,s)=>a+s.n,0);
 const all=[...new Set([...R.map(r=>r.c),...cs])];
 return `<h1>Passport</h1><p class="sub">${cs.length} of ${CT.length} countries · ${trips} trip${trips===1?"":"s"} · ${hm(tot)} studied</p>
 ${cs.length?`<div class="stamps">${cs.map(c=>`<div class="stamp"><span class="f">${fi(S.stamps[c].f)}</span><b>${esc(c)}</b><small>${S.stamps[c].n} visit${S.stamps[c].n>1?"s":""} · ${hm(S.stamps[c].min)}</small><small>${esc(S.stamps[c].last)}</small></div>`).join("")}</div>`:`<div class="pass"><div class="in">Your passport is empty. Finish a trip to get your first stamp.</div></div>`}
 ${medalsHTML()}
 <h1 style="font-size:20px;margin-top:22px">Friends abroad</h1><p class="sub">One friend per country. They’ll greet you when you land.</p>
 <div class="pass"><div class="in">${all.map(c=>`<label for="f-${esc(c)}">${fi((R.find(r=>r.c===c)||{f:S.stamps[c]&&S.stamps[c].f}).f||"")} ${esc(c)}</label><input id="f-${esc(c)}" data-fc="${esc(c)}" value="${esc(S.friends[c]||"")}" placeholder="Friend’s name">`).join("")}</div></div>
 ${acct()}`;
}
function bind(){
 document.querySelectorAll("[data-m]").forEach(b=>b.onclick=()=>{mode=b.dataset.m;sel=mode==="Custom"?{custom:1,m:"🧭",k:"Custom",a:here().b,b:"Destination",c:"",f:"🌍",min:0}:pickRoute();render()});
 document.querySelectorAll("[data-r]").forEach(b=>b.onclick=()=>{subject=$("#sj").value;sel=routes()[+b.dataset.r];render()});
 const hm0=$("[data-home]");if(hm0)hm0.onclick=()=>{subject=$("#sj").value;S.at=null;save();sel=pickRoute();render()};
 const go=$("#go");if(go)go.onclick=()=>{
  subject=$("#sj").value;
  if(sel.custom){board(false);return}
  start()};
 const fr=$("#fr");if(fr)fr.oninput=()=>{S.friends[sel.c]=fr.value.trim();save()};
 document.querySelectorAll("[data-fc]").forEach(i=>i.oninput=()=>{S.friends[i.dataset.fc]=i.value.trim();save()});
 const fx=$("[data-fix]");if(fx)fx.onclick=()=>{custom=String(fix);$("#cm").value=custom;board(true)};
 const kp=$("[data-keep]");if(kp)kp.onclick=()=>board(true);
 const cv=$("#globe");if(cv){let dn=false,lx=0,ly=0;
  cv.onpointerdown=e=>{dn=true;lx=e.clientX;ly=e.clientY;try{cv.setPointerCapture(e.pointerId)}catch(x){}};
  cv.onpointermove=e=>{if(!dn)return;const k=cv.clientWidth/600*GR;G.lo-=(e.clientX-lx)/k;G.la+=(e.clientY-ly)/k;lx=e.clientX;ly=e.clientY;if(J)drawGlobe(GP)};
  cv.onpointerup=cv.onpointercancel=()=>{dn=false};
  const rc=$("#rc");if(rc)rc.onclick=()=>{G.lo=0;G.la=0;if(J)drawGlobe(GP)}}
 const pz=$("#pz");if(pz)pz.onclick=pause;
 const ab=$("#ab");if(ab)ab.onclick=abandon;
 const ok=$("#ok");if(ok)ok.onclick=()=>{arrived=null;view="plan";render()};
 document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>{view=b.dataset.go;render()});
 bindAcct();bindLoc();
 paint();
}
document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>{
 const s=$("#sj");if(s)subject=s.value;
 view=b.dataset.v;render()});
function clearTrip(){try{localStorage.removeItem("sj_trip")}catch(e){}}
try{const t=JSON.parse(localStorage.getItem("sj_trip")||"null");if(t&&t.r&&t.total){J=t;if(J.r.xy){XY[J.r.a]=J.r.xy[0];XY[J.r.b]=J.r.xy[1]}if(!J.paused){J.paused=true;J.pausedAt=J.last||Date.now();J.pauses++}view="trip"}}catch(e){}
if(/^#reset=[a-f0-9]{64}$/.test(location.hash)){resetTok=location.hash.slice(7);try{history.replaceState(null,"",location.pathname+location.search)}catch(e){}acctMode="reset";view="pass"}
setInterval(tick,500);
routes();sel=routes()[0]||sel;
render();
if(ACC)pull();
