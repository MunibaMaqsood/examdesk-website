/* ExamDesk extras 2: colour theme picker + Student/Teacher tabs on the sign-in card.
   Load it AFTER extras.js. */
(()=>{
const A={orange:null,forest:'#14532d',maroon:'#7a1f3d',purple:'#4c1d95',teal:'#0f5f66'};
const K='examdesk-accent';let cur='orange';try{cur=localStorage.getItem(K)||'orange'}catch(e){}
if(!(cur in A))cur='orange';
const css=document.createElement('style');document.head.appendChild(css);
const ring=on=>on?'0 0 0 3px var(--card),0 0 0 5px var(--ink)':'none';
const paint=n=>{cur=n;try{localStorage.setItem(K,n)}catch(e){}const c=A[n];
 const dk=`--acc:color-mix(in srgb,${c} 55%,#fff);--fill:color-mix(in srgb,${c} 55%,#fff);--navy:color-mix(in srgb,${c} 45%,#000);--acc-ink:#0b1122;--fill-ink:#0b1122`;
 css.textContent=c?`:root:root{--acc:${c};--fill:${c};--navy:${c};--acc-ink:#fff;--fill-ink:#fff}@media(prefers-color-scheme:dark){:root:root:not([data-theme=light]){${dk}}}:root:root[data-theme=dark]{${dk}}`:''};
const sw=()=>Object.entries(A).map(([n,c])=>`<button class="swb" data-n="${n}" onclick="exAccent('${n}')" aria-label="${n} theme" style="width:30px;height:30px;border-radius:50%;border:0;cursor:pointer;margin-right:.5rem;background:${c||'#e5530f'};box-shadow:${ring(n===cur)}"></button>`).join('');
window.exAccent=n=>{paint(n);document.querySelectorAll('.swb').forEach(b=>b.style.boxShadow=ring(b.dataset.n===n))};
paint(cur);

let who='student';
const tab=(k,l)=>`<button onclick="exWho('${k}')" style="flex:1;border:0;border-radius:9px;padding:.6rem;font-weight:700;font-size:.95rem;font-family:inherit;cursor:pointer;color:var(--ink);background:${who===k?'var(--card)':'transparent'};box-shadow:${who===k?'0 1px 4px rgba(0,0,0,.2)':'none'}">${l}</button>`;
const apply=()=>{const w=document.getElementById('who');if(w)w.innerHTML=tab('student','Student')+tab('teacher','Teacher');
 const tc=document.getElementById('tc');if(tc){const show=who==='teacher';tc.style.display=show?'':'none';const lb=document.querySelector('label[for=tc]');if(lb)lb.style.display=show?'':'none';if(!show)tc.value=''}};
window.exWho=k=>{who=k;apply()};
const addAuth=()=>{const card=document.querySelector('#app .card');if(!card)return;
 card.insertAdjacentHTML('afterbegin','<div id="who" style="display:flex;gap:4px;padding:4px;background:var(--bg);border-radius:12px;margin-bottom:1rem"></div>');
 card.insertAdjacentHTML('beforeend',`<div style="margin-top:1rem"><div class="mute sm" style="margin-bottom:.5rem">Colour theme</div>${sw()}</div>`);apply()};

const base=render;
render=async function(){await base();
 if(view==='auth')addAuth();
 if(view==='settings')document.getElementById('app').insertAdjacentHTML('beforeend',`<div class="card" style="max-width:460px"><b>Colour theme</b><div style="margin-top:.8rem">${sw()}</div></div>`)};
})();
