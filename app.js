const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
// progress
addEventListener('scroll',()=>{const h=document.documentElement;$('#progress').style.width=(h.scrollTop/(h.scrollHeight-innerHeight)*100)+'%'},{passive:true});
// reveal
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.15});
$$('.reveal').forEach(el=>io.observe(el));
try{ // legacy sections (story/turns/center/gallery) — removed from the page in v6; guarded
// scroll story
const shots=$$('#screens img'),steps=$$('.step'),dots=$('#dots');
steps.forEach(()=>dots.appendChild(document.createElement('i')));
const setStep=i=>{shots.forEach((s,k)=>s.classList.toggle('on',k==i));steps.forEach((s,k)=>s.classList.toggle('on',k==i));[...dots.children].forEach((d,k)=>d.classList.toggle('on',k==i))};
const so=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)setStep(+e.target.dataset.i)}),{rootMargin:'-45% 0px -45% 0px'});
steps.forEach(s=>so.observe(s));setStep(0);
// turn-taking demo
const N={muse:'Muse',grokbot:'Grok Bot',grok:'Grok',chatgpt:'ChatGPT',codex:'Codex'};
const S={'muse|grokbot':['Plan a Saturday in Phoenix for two.','Morning hike at Camelback, then brunch nearby. Want me to check tables?','Yes. Keep it under $60.','Found a 10:30 table for two, about $48. Holding it for you.','Perfect. I\'ll add it to the calendar.'],
'chatgpt|grok':['Draft a launch tweet for BotBar.','"Your AIs finally talk to each other, right from your keyboard."','Punchier?','"Two AIs. One key. Zero copy-paste."','Shipping that one.'],
'codex|muse':['The login page has a bug on step 2.','I can see it on screen. The button stays disabled.','Patch: re-check the form on input.','Re-tested in Kloudy Browser. It works now.','Nice teamwork.']};
let pair='muse|grokbot',t=0,busy=false;
const reset=()=>{t=0;$('#bA').innerHTML='';$('#bB').innerHTML='';const[a,b]=pair.split('|');$('#whoA').textContent=N[a];$('#whoB').textContent=N[b];$$('.pane').forEach(p=>p.classList.remove('live'));$('#key').classList.add('pulse')};
$$('#pair .chip').forEach(c=>c.onclick=()=>{$$('#pair .chip').forEach(x=>x.classList.remove('active'));c.classList.add('active');pair=c.dataset.pair;reset()});
const say=txt=>new Promise(r=>{if(!$('#voice').checked||!('speechSynthesis'in window)){setTimeout(r,900);return}const u=new SpeechSynthesisUtterance(txt);u.rate=1.08;u.onend=r;u.onerror=r;speechSynthesis.speak(u);setTimeout(r,6000)});
$('#key').onclick=async()=>{if(busy)return;const L=S[pair];if(t>=L.length)reset();busy=true;$('#key').classList.remove('pulse');
 const side=t%2?'B':'A',box=$('#b'+side),pane=$('.pane.'+side.toLowerCase());$$('.pane').forEach(p=>p.classList.remove('live'));pane.classList.add('live');$('#wave').classList.add('on');
 const ty=document.createElement('div');ty.className='bub typing';ty.textContent='•••';box.appendChild(ty);await new Promise(r=>setTimeout(r,650));
 ty.className='bub';ty.textContent=L[t];await say(L[t]);t++;$('#wave').classList.remove('on');busy=false;if(t<L.length)$('#key').classList.add('pulse')};
reset();
// command center
const B=[['Muse','#3ee0ff','Paying the electric bill','Step 3 of 5: confirming amount. You can pause any time.','Pause'],['Grok Bot','#d34bff','Watching 4 price drops','Headphones fell 12%. A card is waiting in the tray.','Send card'],['Grok','#7a5cff','Summarizing a long thread','42 messages down to 5 bullet points.','Send card'],['ChatGPT','#5cffb0','Drafting a reply','Draft ready. Tap to drop it into the chat.','Insert'],['Codex','#ffb14a','Fixing a form bug','Patch tested in Kloudy Browser.','Send card'],['Imagine','#ff5ca8','Rendering 3 images','2 of 3 done. Insert straight from the media bar.','Send card']];
const spark=c=>{let p='';for(let i=0;i<24;i++)p+=`${i*10},${18+Math.sin(i*.7+Math.random())*10+Math.random()*6} `;return`<svg class="spark" viewBox="0 0 230 36" preserveAspectRatio="none"><polyline fill="none" stroke="${c}" stroke-width="2" points="${p}"/></svg>`};
$('#tiles').innerHTML=B.map((b,i)=>`<div class="tile" style="--tc:${b[1]}" data-i="${i}"><h4><span class="ring"></span>${b[0]}</h4><div class="st">${b[2]}</div>${spark(b[1])}<div class="more">${b[3]}<br><button>${b[4]}</button></div></div>`).join('');
let n=0;const addCard=b=>{n++;$('#trayCount').textContent=n;const c=document.createElement('div');c.className='card';c.innerHTML=`<b>${b[0]}</b>${b[3]}`;$('#cards').prepend(c)};
$$('.tile').forEach(el=>{el.onmousemove=e=>{const r=el.getBoundingClientRect();el.style.setProperty('--x',e.clientX-r.left+'px');el.style.setProperty('--y',e.clientY-r.top+'px')};
 el.onclick=e=>{if(e.target.tagName=='BUTTON'){addCard(B[el.dataset.i]);e.target.textContent='Sent ✓';return}$$('.tile').forEach(x=>x!=el&&x.classList.remove('open'));el.classList.toggle('open')}});
setInterval(()=>$$('.spark polyline').forEach((p,i)=>p.outerHTML=spark(B[i][1]).match(/<polyline[^>]*>/)[0]),2200);
addCard(B[1]);
// gallery
const G=[['img/tandem-browser','concept','Kloudy Browser gathers data for Muse and Grok Bot'],['img/tandem-app-driven','concept','An app driven automatically while Muse narrates'],['img/tandem-media','concept','Grok Bot generates images and video, injected anywhere'],['img/tandem-turns','concept','Muse and Grok Bot take turns through the keyboard'],['img/tandem-command-center','concept','Muse, Grok Bot, app and browser synced in the command center'],['img/tandem-headless','concept','Headless mode: status cards while the bots work'],['img/hero-keyboard','concept','The BotBar keyboard'],['shots/r68-after-system-back','real','Kloudy Browser home'],['img/two-ais-turn-taking','concept','Two AIs taking turns'],['shots/r69-image-open','real','Image Gen panel'],['img/command-center-tiles','concept','Command center tiles'],['shots/r69-mock-bot-page','real','A bot opens a result page'],['img/muse-pays-bill','concept','Muse pays a bill'],['shots/r67-apps-row','real','Apps in Kloudy row'],['img/media-injection','concept','Media injection'],['shots/r69-cards-live','real','Live cards'],['img/vault-login-fill','concept','Logins the AI never sees'],['shots/r69-notes-open','real','Notes panel'],['img/voice-commands','concept','Voice commands'],['shots/r67-browser-open','real','Kloudy Browser splash'],['img/ai-mesh','concept','AIs linked through the keyboard'],['shots/r69-long-text','real','Typing with BotBar'],['img/kloudy-browser-drive','concept','AI drives Kloudy Browser'],['shots/r69-search-submit','real','Search in Kloudy Browser'],['img/bot-store','concept','Bot store (coming soon)']];
$('#grid').innerHTML=G.map(g=>`<figure class="gi reveal" data-k="${g[1]}"><img src="assets/${g[0]}.webp" alt="${g[2]}" loading="lazy"><span>${g[1]=='real'?'From the phone':'Concept'}</span></figure>`).join('');
$$('#grid .reveal').forEach(el=>io.observe(el));
$$('#gfilter .chip').forEach(c=>c.onclick=()=>{$$('#gfilter .chip').forEach(x=>x.classList.remove('active'));c.classList.add('active');$$('.gi').forEach(g=>g.classList.toggle('hide',c.dataset.f!='all'&&g.dataset.k!=c.dataset.f))});
$$('.gi').forEach(g=>g.onclick=()=>{$('#lbImg').src=g.querySelector('img').src;$('#lbCap').textContent=g.querySelector('img').alt;$('#lb').classList.add('on')});
$('#lb').onclick=e=>{if(e.target.id!='lbImg')$('#lb').classList.remove('on')};addEventListener('keydown',e=>e.key=='Escape'&&$('#lb').classList.remove('on'));

}catch(e){}
// action bar
const panels=$$('.panel'),closeP=()=>{panels.forEach(p=>p.classList.remove('on'));$$('#abar button').forEach(b=>b.classList.remove('active'))};
$$('#abar button').forEach(b=>b.onclick=()=>{const p=$('#'+b.dataset.p),was=p.classList.contains('on');closeP();if(!was){p.classList.add('on');b.classList.add('active')}});
$$('.panel .px').forEach(x=>x.onclick=closeP);addEventListener('keydown',e=>e.key=='Escape'&&closeP());
const dlUpd=()=>{const n=$$('#pDl input:checked').length;$('#dlN').textContent=n;$('#dlBatch').classList.toggle('off',!n)};
$$('#pDl input').forEach(i=>i.onchange=dlUpd);
$('#dlBatch').onclick=e=>{e.preventDefault();const sel=$$('#pDl input:checked').map(i=>i.dataset.href);$('#pDl .fine').textContent=sel.length?`Placeholder: would download ${sel.length} item${sel.length>1?'s':''}.`:'Pick at least one item.'};
// ---- BotBar bot face: follows pointer, moods, blink, tap (behavior modeled on kloudy.bot/future) ----
(()=>{const bot=$('#bbface');if(!bot)return;const eyes=bot.querySelector('.bb-eyes'),say=bot.querySelector('.bb-say'),reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,fine=matchMedia('(pointer:fine)').matches;let mood='';
const look=(x,y)=>{const r=bot.getBoundingClientRect(),dx=x-(r.left+r.width/2),dy=y-(r.top+r.height/2),a=Math.atan2(dy,dx),m=Math.min(1,Math.hypot(dx,dy)/260)*4.5;eyes.style.setProperty('--ex',(Math.cos(a)*m).toFixed(2)+'px');eyes.style.setProperty('--ey',(Math.sin(a)*m*.8).toFixed(2)+'px')};
const moodFor=t=>{if(!t||!t.closest)return'';if(t.closest('#bbface'))return'happy';if(t.closest('.vid,.gi,.hero-art,.step-art'))return'excited';if(t.closest('a,button,label'))return'happy';if(t.closest('p,h1,h2,h3,figcaption'))return'curious';return''};
const setMood=m=>{if(m!==mood){mood=m;bot.dataset.mood=m}};
addEventListener('pointermove',e=>{look(e.clientX,e.clientY);setMood(moodFor(e.target))},{passive:true});
document.addEventListener('pointerleave',()=>setMood(''));
const lines=['beep ✦','synced!','hi ✦','tap tap','on it!'];let li=0;
const tap=()=>{bot.classList.remove('tap');void bot.offsetWidth;say.textContent=lines[li++%lines.length];bot.classList.add('tap')};
bot.addEventListener('animationend',e=>{if(e.animationName==='bb-tap')bot.classList.remove('tap')});
bot.addEventListener('click',()=>{tap();if(matchMedia('(max-width:820px)').matches)document.querySelector('.nav').classList.toggle('open');else scrollTo({top:0,behavior:'smooth'})});document.querySelectorAll('.nav nav a').forEach(a=>a.addEventListener('click',()=>document.querySelector('.nav').classList.remove('open')));
addEventListener('pointerdown',e=>{look(e.clientX,e.clientY);if(!e.target.closest('#bbface'))setTimeout(tap,120)},{passive:true});
if(!reduce)setInterval(()=>{bot.classList.add('blink');setTimeout(()=>bot.classList.remove('blink'),140)},3800);
if(!fine)addEventListener('scroll',()=>{look(innerWidth/2,innerHeight*.6);setMood(moodFor(document.elementFromPoint(innerWidth/2,innerHeight/2)))},{passive:true});
})();
// ---- headings: word split; steps: scroll-driven type-in ----
(()=>{const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const split=h=>{let i=0;const walk=n=>{[...n.childNodes].forEach(c=>{if(c.nodeType==3){const f=document.createDocumentFragment();c.nodeValue.split(/(\s+)/).forEach(w=>{if(!w)return;if(/^\s+$/.test(w)){f.append(w);return}const s=document.createElement('span');s.className='w';s.style.setProperty('--i',i++);s.textContent=w;f.append(s)});c.replaceWith(f)}else if(c.nodeType==1&&c.tagName!='BR'){if(c.classList.contains('grad')){c.classList.add('w');c.style.setProperty('--i',i++)}else walk(c)}})};walk(h);h.classList.add('split')};
$$('.hero h1,.step h2,.sec-head h2,.final h2,.feat h3').forEach(split);
const hio=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');hio.unobserve(e.target)}}),{threshold:.3});$$('.split').forEach(h=>hio.observe(h));
// mobile: give each step its own picture (pinned phone hidden)
const shotsSrc=$$('#screens img').map(i=>i.getAttribute('src'));
$$('.step').forEach((s,i)=>{if(!s.querySelector('.step-art')&&shotsSrc[i]){const im=document.createElement('img');im.className='step-art m-art';im.src=shotsSrc[i];im.alt='';im.loading='lazy';s.querySelector('p').after(im)}});
const sio=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add('seen')}),{threshold:.2});$$('.step').forEach(s=>sio.observe(s));
if(reduce)return;
const ps=$$('.step p').map(p=>{const chars=[];const w=document.createTreeWalker(p,NodeFilter.SHOW_TEXT),ns=[];while(w.nextNode())ns.push(w.currentNode);ns.forEach(n=>{const f=document.createDocumentFragment();[...n.nodeValue].forEach(ch=>{const s=document.createElement('span');s.className='ch';s.textContent=ch;f.append(s);chars.push(s)});n.replaceWith(f)});return{p,chars,step:p.closest('.step')}});
const tick=()=>{const vh=innerHeight;ps.forEach(o=>{const r=o.step.getBoundingClientRect();const prog=Math.max(0,Math.min(1,(vh*.85-r.top)/(vh*.45)));const n=Math.round(prog*o.chars.length);o.chars.forEach((c,k)=>c.classList.toggle('on',k<n))})};
addEventListener('scroll',tick,{passive:true});addEventListener('resize',tick);tick();
})();
// ---- route: two scroll-driven stories ----
(()=>{const sec=$('#route');if(!sec)return;
const S=[
 {kick:"s t o r y &nbsp; 1 &nbsp;·&nbsp; b i l l s &nbsp; d a y",nodes:[["🎙","Grok voice"],["⚡","power app"],["📱","phone app"],["💳","card app"],["🌐","Kloudy Browser"]],res:["bills paid","budget updated"],
  title:"Bills paid, budget updated.",inj:"↳ 2 forgotten bills caught",list:["3 bills paid across 3 apps","Budget changed by voice","Item grabbed + money sent","2 forgotten bills caught"],
  st:[["Bills day.","Start a voice chat with Grok right from the keyboard and say what needs paying.",[1]],
   ["Every bill, at once.","Your power, phone and card apps all move together while you watch.",[1,2,3]],
   ["Budget, by voice.","Review the budget across every bill and change it just by saying so.",[1,2,3]],
   ["Grab it. Send it.","At the same time, the browser grabs what you asked for and money goes out.",[1,2,3,4]],
   ["Handoff.","Grok Bot hits its usage limit, and Muse steps in without missing a beat.",[1,2,3,4],"limit"],
   ["Nothing forgotten.","The bots catch two bills you forgot and finish the whole run.",[1,2,3,4],"done"]],
  cards:[[1,"Grok voice","listening on the keyboard"],[2,"Power app","paying $84.20"],[3,"Phone app","paying $65.00"],[3,"Card app","paying $210.00"],[4,"Kloudy Browser","grabbing your item"],[4,"Send money","$40 to Sam"],[6,"Forgotten bills","2 caught: water, streaming"]]},
 {kick:"s t o r y &nbsp; 2 &nbsp;·&nbsp; i d e a &nbsp; t o &nbsp; s t o r e",nodes:[["💡","your idea"],["⚙","BotBoozle"],["🔎","GoDaddy name"],["🖥","Airo site"],["▦","BotBar store"]],res:["in the store","at your price"],
  title:"Your bot, in the store.",inj:"↳ listed in the BotBar store",list:["Bot generated","Name found and bought","Website set up","Listed at your price"],
  st:[["Idea to store.","You have a bot idea. Say it into the keyboard.",[]],
   ["Generate it.","BotBoozle turns your idea into a working bot.",[1]],
   ["Name it.","GoDaddy helps you find the right name and buy it right there.",[1,2]],
   ["Give it a home.","Airo, GoDaddy's AI site builder, sets up your bot's website.",[1,2,3]],
   ["Sell it.","Your bot lands in the BotBar store at the price you pick.",[1,2,3,4],"done"]],
  cards:[[1,"BotBoozle","generating your bot"],[2,"GoDaddy","name found · bought"],[3,"Airo","website ready"],[4,"BotBar store","listed at $4.99"]]}];
const tot=S.reduce((a,x)=>a+x.st.length,0),steps=$('#routeSteps');for(let i=0;i<tot;i++)steps.appendChild(document.createElement('i'));
sec.style.height='auto';sec.classList.add('loop');const SH=[['voice-listen','Grok voice from the keyboard'],['cc-talk','Apps moving together'],['headless-cards','Headless cards while bots work'],['browser-ime','Kloudy Browser, keyboard on top'],['cc-takeover','Muse takes the handoff'],['headless-result','Produced result'],['together','Say the idea'],['bots-home','BotBoozle generates it'],['bots-reserved','Name reserved'],['mock-bot','Bot page in Kloudy Browser'],['bots-store','Listed in the store']];const DUR=3200,t0=performance.now();let pin=0;
const H=$('#rvHeadless'),V=$('#rvVisual'),rc=$('#resultCard'),bub=$('#rBubble');let cs=-1,cg=-1;
const load=k=>{const x=S[k];$('#rKick').innerHTML=x.kick;
 sec.querySelectorAll('.nd').forEach(n=>{const i=+n.dataset.n;if(i>4)return;const t=n.querySelectorAll('text');t[0].textContent=x.nodes[i][0];t[1].textContent=x.nodes[i][1]});
 $('#resL1').textContent=x.res[0];$('#resL2').textContent=x.res[1];$('#resTitle').textContent=x.title;$('#resInj').textContent=x.inj;
 $('#resList').innerHTML=x.list.map((l,i)=>`<li data-i="${i}">${l}</li>`).join('');
 const cards=x.cards.map(c=>`<div class="rc" data-s="${c[0]}"><b>${c[1]}</b><span>${c[2]}</span><i></i></div>`).join('');
 H.innerHTML=cards+(k==0?'<div class="rc warn" data-s="99"><b>Grok Bot</b><span>usage limit reached</span><i></i></div>':'');
 V.innerHTML=x.cards.map(c=>`<div class="rt" data-s="${c[0]}"><b>${c[1]}</b><em></em></div>`).join('')+(k==0?'<div class="rt warn" data-s="99"><b>Grok Bot · limit</b><em></em></div>':'')};
const tick=()=>{const p=((performance.now()-t0)/(DUR*tot))%1;const f=p*tot,g=Math.floor(f),sub=f-g;
 let k=0,j=g;while(j>=S[k].st.length){j-=S[k].st.length;k++}
 if(k!==cs){cs=k;load(k)}const x=S[k],st=x.st[j],act=st[2],ev=st[3]||'',last=j==x.st.length-1;
 sec.querySelectorAll('.nd').forEach(n=>{const i=+n.dataset.n;n.classList.toggle('on',i==0||act.includes(i)||(i==5&&last))});
 sec.querySelectorAll('.lp').forEach(l=>{const n=+l.dataset.n,m=+(l.dataset.m||0);const on=n==5?(last&&1):act.includes(n);l.style.opacity=on?1:0;l.style.strokeDashoffset=on?0:1});
 sec.querySelectorAll('.pk circle').forEach(c=>{const n=+c.dataset.n;c.style.opacity=(n==5?last:act.includes(n))?1:0});
 const stepNo=j+1;
 sec.querySelectorAll('.rc,.rt').forEach(c=>{const s=+c.dataset.s;let run,done;
  if(s==99){const show=k==0&&j>=4;c.style.display=show?'':'none';run=false;done=show}else{run=s==stepNo&&sub<.6&&!last;done=s<stepNo||(s==stepNo&&(sub>=.6||last))}
  c.classList.toggle('run',run);c.classList.toggle('done',done);const em=c.querySelector('em');if(em)em.style.setProperty('--w',(done?100:run?sub*160:0)+'%')});
 sec.classList.toggle('muse',k==0&&j>=4);
 bub.classList.toggle('on',k==0&&j==4);
 rc.classList.toggle('on',last||j>=x.st.length-2);rc.classList.toggle('done',last);
 rc.querySelectorAll('li').forEach((li,i)=>li.classList.toggle('on',last||i<j-1));
 [...steps.children].forEach((d,i)=>d.classList.toggle('on',i<=g));
 if(g!==cg){cg=g;const sh=SH[g];if(sh){$('#rShotImg').src='assets/shots/'+sh[0]+'.webp';$('#rShotCap').textContent='real screen · '+sh[1]}if(!pin){const vis=g%2==1;$$('#rmode .chip').forEach(x=>x.classList.toggle('active',(x.dataset.m=='visual')==vis));H.classList.toggle('on',!vis);V.classList.toggle('on',vis)}$('#rTitle').textContent=st[0];$('#routeLine').textContent=st[1];$('#rTitle').animate([{opacity:0,transform:'translateY(14px)'},{opacity:1,transform:'none'}],{duration:450,easing:'cubic-bezier(.2,.8,.2,1)'})}};
bub.querySelector('span').textContent="Kloudy let me know your Grok Bot was full on usage, so I'm taking the handoff from here and finishing it up.";
const loop=()=>{tick();requestAnimationFrame(loop)};requestAnimationFrame(loop);
$$('#rmode .chip').forEach(c=>c.onclick=()=>{pin=1;setTimeout(()=>pin=0,8000);$$('#rmode .chip').forEach(x=>x.classList.toggle('active',x==c));H.classList.toggle('on',c.dataset.m=='headless');V.classList.toggle('on',c.dataset.m=='visual')});
const od=$('#openDl');if(od)od.onclick=()=>$('#abar button[data-p=pDl]').click();
})();
// ---- bot name search (placeholder) ----
(()=>{const q=$('#nq'),out=$('#nres');if(!q)return;
const render=()=>{const base=(q.value.trim().toLowerCase().replace(/[^a-z0-9-]/g,'')||'yourbot').slice(0,24);
 const rows=[[base,1,'$12/yr'],[base+'-ai',1,'$9/yr'],['get'+base,1,'$9/yr'],[base==='muse'||base==='grok'?base+'-pro':'muse',0,'taken']];
 out.innerHTML=rows.map(r=>`<div class="nr"><b>${r[0]}.botbar</b><em class="${r[1]?'ok':'no'}">${r[1]?'available':'taken'}</em><em>${r[2]}</em><a href="#placeholder-reserve-${r[0]}" class="${r[1]?'':'off'}">Reserve</a></div>`).join('')};
q.addEventListener('input',render);$('#ngo').onclick=render;render();
out.addEventListener('click',e=>{const a=e.target.closest('a');if(a){e.preventDefault();a.textContent='Reserved (placeholder)'}});})();
// ---- devices carousel (scroll-driven horizontal) ----
(()=>{const sec=$('#devices');if(!sec)return;const tr=$('#dvTrack'),dv=$$('#dvTrack .dv'),dots=$('#dvDots');
const T=[["Phone.","The keyboard you already type on."],["Smart glasses.","Muse whispers, Grok Bot shows the route, hands free."],["Watch.","Tiny status cards tick by on your wrist."],["Laptop.","The command center opens up on a big screen."],["Tablet.","A bigger keyboard with room for every bot."]];
dv.forEach(()=>dots.appendChild(document.createElement('i')));let cur=-1;
const tick=()=>{const r=sec.getBoundingClientRect(),p=Math.max(0,Math.min(1,-r.top/(r.height-innerHeight)));const x=p*(dv.length-1);
 tr.style.transform=`translateX(${-x*100}vw)`;const i=Math.round(x);
 if(i!==cur){cur=i;dv.forEach((d,k)=>d.classList.toggle('on',k==i));[...dots.children].forEach((d,k)=>d.classList.toggle('on',k==i));$('#dvTitle').textContent=T[i][0];$('#dvLine').textContent=T[i][1]}};
addEventListener('scroll',tick,{passive:true});addEventListener('resize',tick);tick();})();
// ---- playable video placeholders ----
$$('.vid').forEach(v=>{v.appendChild(Object.assign(document.createElement('span'),{className:'bar'}));v.tabIndex=0;v.setAttribute('role','button');
 const t=()=>{const on=!v.classList.contains('playing');$$('.vid').forEach(x=>x.classList.remove('playing'));if(on){void v.offsetWidth;v.classList.add('playing')}};v.onclick=t;v.onkeydown=e=>(e.key=='Enter'||e.key==' ')&&(e.preventDefault(),t())});
// ---- phone demo: video placeholder ----
(()=>{const b=$('#vphPlay');if(b)b.onclick=()=>{$('#dmNote').textContent='Demo video coming soon.'}})();
// ---- You Need a Bot videos: play buttons ----
$$('.yv').forEach(f=>{const v=f.querySelector('video'),b=f.querySelector('.yplay');b.onclick=()=>{$$('.yv video').forEach(x=>x!==v&&x.pause());v.play()};v.onplay=()=>f.classList.add('playing');v.onpause=()=>f.classList.remove('playing')});
