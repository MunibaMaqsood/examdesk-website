/* ExamDesk extras: Dashboard, Students, Analytics, Settings, theme switch, read-aloud, voice answers.
   Loads after the main script in builder.html and adds to it without changing it. */
(()=>{
const K='examdesk-theme';
const L='--bg:#eef1f8;--card:#fff;--ink:#14213f;--mute:#5a6585;--line:#d9dfec;--acc:#e5530f;--acc-ink:#fff;--navy:#16254a;--fill:#16254a;--fill-ink:#fff;--ok:#14794f;--ok-bg:#e1f4ea;--bad:#b3261e;--bad-bg:#fbe8e6;color-scheme:light';
const D='--bg:#0b1122;--card:#141c36;--ink:#e8ecf8;--mute:#a0abc8;--line:#2a3558;--acc:#ff8a4c;--acc-ink:#1a0c02;--navy:#0a0f1f;--fill:#ff8a4c;--fill-ink:#1a0c02;--ok:#52d39b;--ok-bg:#12332a;--bad:#ff8e86;--bad-bg:#3a1d1c;color-scheme:dark';
const st=document.createElement('style');st.textContent=`:root[data-theme=light]{${L}}:root[data-theme=dark]{${D}}`;document.head.appendChild(st);
const setTheme=t=>{try{localStorage.setItem(K,t)}catch(e){}t==='auto'?document.documentElement.removeAttribute('data-theme'):document.documentElement.dataset.theme=t};
let saved='auto';try{saved=localStorage.getItem(K)||'auto'}catch(e){}
setTheme(saved);
window.exTheme=setTheme;
window.exFlip=()=>{const dark=document.documentElement.dataset.theme?document.documentElement.dataset.theme==='dark':matchMedia('(prefers-color-scheme:dark)').matches;setTheme(dark?'light':'dark')};

/* data helpers */
const att=async()=>{let q=sb.from('attempts').select('score,total,pct,passed,submitted_at,exams(title),profiles(name)').order('submitted_at',{ascending:false});if(P.role!=='teacher')q=q.eq('student_id',P.id);const {data,error}=await q;if(error)throw error;return data||[]};
const avg=a=>a.length?Math.round(a.reduce((s,r)=>s+r.pct,0)/a.length):0;
const rate=a=>a.length?Math.round(a.filter(r=>r.passed).length/a.length*100):0;
const stat=(n,l)=>`<div class="card"><div style="font:700 2.4rem Fraunces,Georgia,serif">${n}</div><div class="mute">${l}</div></div>`;
const bar=p=>`<div style="height:8px;border-radius:99px;background:var(--line);min-width:90px"><div style="width:${p}%;height:100%;border-radius:99px;background:var(--acc)"></div></div>`;
const empty=t=>`<div class="card">${t}</div>`;
const group=(a,f)=>{const m={};a.forEach(r=>{const k=f(r)||'Unknown';(m[k]=m[k]||[]).push(r)});return Object.entries(m)};

/* extra pages */
const X={
async dash(){const T=P.role==='teacher',a=await att();let n=0;
 if(T){const {count}=await sb.from('exams').select('id',{count:'exact',head:true}).eq('teacher_id',P.id);n=count||0}
 const rows=a.slice(0,5).map(r=>`<tr>${T?`<td>${esc(r.profiles&&r.profiles.name)}</td>`:''}<td>${esc(r.exams&&r.exams.title)}</td><td>${r.pct}%</td><td class="${r.passed?'ok-t':'bad-t'}">${r.passed?'Passed':'Not passed'}</td><td>${new Date(r.submitted_at).toLocaleDateString()}</td></tr>`).join('');
 return `<h2>Welcome, ${esc(P.name)}</h2><div class="grid">${T?stat(n,'Exams created'):''}${stat(a.length,T?'Submissions':'Exams taken')}${stat(avg(a)+'%','Average score')}${stat(rate(a)+'%','Pass rate')}</div><h3 style="margin-top:1.6rem">Recent activity</h3>`+(a.length?`<div class="card wrap"><table><tr>${T?'<th>Student</th>':''}<th>Exam</th><th>Score</th><th>Outcome</th><th>Date</th></tr>${rows}</table></div>`:empty('Nothing yet. '+(T?'Create an exam and share the site with your students.':'Open Exams and start one.')))},
async students(){const a=await att();if(!a.length)return '<h2>Students</h2>'+empty('No students have submitted an exam yet.');
 const rows=group(a,r=>r.profiles&&r.profiles.name).map(([n,l])=>[n,l.length,avg(l),rate(l),new Date(l[0].submitted_at).toLocaleDateString()]).sort((x,y)=>y[2]-x[2]).map(r=>`<tr><td>${esc(r[0])}</td><td>${r[1]}</td><td>${r[2]}%</td><td>${r[3]}%</td><td>${r[4]}</td></tr>`).join('');
 return `<h2>Students</h2><div class="card wrap"><table><tr><th>Name</th><th>Exams taken</th><th>Average</th><th>Pass rate</th><th>Last submitted</th></tr>${rows}</table></div>`},
async stats(){const a=await att();if(!a.length)return '<h2>Analytics</h2>'+empty('Analytics appear after the first submission.');
 const rows=group(a,r=>r.exams&&r.exams.title).map(([n,l])=>`<tr><td>${esc(n)}</td><td>${l.length}</td><td>${avg(l)}% ${bar(avg(l))}</td><td>${rate(l)}%</td></tr>`).join('');
 return `<h2>Analytics</h2><div class="grid">${stat(a.length,'Submissions')}${stat(avg(a)+'%','Average score')}${stat(rate(a)+'%','Pass rate')}</div><h3 style="margin-top:1.6rem">By exam</h3><div class="card wrap"><table><tr><th>Exam</th><th>Submissions</th><th>Average score</th><th>Pass rate</th></tr>${rows}</table></div>`},
async settings(){return `<h2>Settings</h2><div class="card" style="max-width:460px"><p><b>${esc(P.name)}</b> <span class="pill">${esc(P.role)}</span></p><label for="th">Appearance</label><select id="th" onchange="exTheme(this.value)"><option value="auto" ${saved==='auto'?'selected':''}>Match my device</option><option value="light">Light</option><option value="dark">Dark</option></select><p class="mute sm" style="margin-top:1rem">During an exam you can use Read aloud on each question and, for short answers, Speak answer.</p></div>`}
};

/* new menu */
nav=function(){$('#nav').innerHTML=!P||S?'':[['dash','Dashboard'],['exams','Exams'],...(P.role==='teacher'?[['create','Create exam'],['students','Students']]:[]),['results',P.role==='teacher'?'Results':'My results'],...(P.role==='teacher'?[['stats','Analytics']]:[]),['settings','Settings']].map(([k,l])=>`<button class="${view===k?'on':''}" onclick="go('${k}')">${l}</button>`).join('')+`<button onclick="exFlip()" aria-label="Switch light or dark">Light/Dark</button><button onclick="logout()">Sign out (${esc(P.name)})</button>`};

/* read aloud and voice answers during an exam */
window.readQ=()=>{const q=S.e.questions[S.i];const o=q.type==='short'?'':'. Options: '+optsOf(q).map((x,i)=>'Option '+(i+1)+', '+x).join('. ');speechSynthesis.cancel();speechSynthesis.speak(new SpeechSynthesisUtterance(q.q+o))};
window.speakA=()=>{const R=window.SpeechRecognition||window.webkitSpeechRecognition;if(!R)return alert('Voice answers need Chrome or Edge.');const r=new R();r.lang='en-US';r.onresult=e=>{const t=e.results[0][0].transcript.replace(/\.$/,'');const q=S.e.questions[S.i];S.ans[q.id]=t;const i=$('#sa');if(i)i.value=t;pal()};r.onerror=()=>alert('Could not hear you. Check the microphone permission.');r.start()};
const addVoice=()=>{const h=document.querySelector('.exam .card h3');if(!h||!S)return;const q=S.e.questions[S.i];h.insertAdjacentHTML('afterend',`<div class="row" style="margin:.3rem 0 .6rem"><button class="b g" onclick="readQ()">Read aloud</button>${q.type==='short'?'<button class="b g" onclick="speakA()">Speak answer</button>':''}</div>`)};

/* hook into the main render */
const base=render;let landed=false;
render=async function(){
 if(view==='exams'&&P&&!landed){landed=true;view='dash'}
 if(!X[view]){await base();if(view==='take')addVoice();return}
 nav();let h;try{h=await X[view]()}catch(e){h='<div class="card">Something went wrong: '+esc(e.message||e)+'</div>'}
 $('#app').innerHTML=h;window.scrollTo(0,0);const t=document.getElementById('th');if(t)t.value=(document.documentElement.dataset.theme||'auto')};
})();
