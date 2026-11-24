/* ===== Thani Real Estate - tiny SVG chart kit, animations, mobile helpers ===== */
const COL={in:'#2a78d6',out:'#eb6834',occ:'#008300',end:'#eda100',od:'#e34948',vac:'#a9a3b2',ink:'#2a1a26',mut:'#7a6a76',grid:'#ece5eb'};
const kfmt=n=>Math.abs(n)>=1e6?(n/1e6).toFixed(1).replace(/\.0$/,'')+'M':Math.abs(n)>=1e3?Math.round(n/1e3)+'k':String(Math.round(n));
const mlab=m=>MON[+m.slice(5,7)-1];

function donut(segs,{size=170,center='',sub='',thick=22}={}){
  const tot=segs.reduce((s,x)=>s+x.v,0)||1,R=(size-thick)/2,C=2*Math.PI*R,cx=size/2;let off=0;
  const arcs=segs.filter(x=>x.v>0).map(x=>{const len=x.v/tot*C,gap=segs.filter(z=>z.v>0).length>1?3:0;
    const e=`<circle class="bar" cx="${cx}" cy="${cx}" r="${R}" fill="none" stroke="${x.color}" stroke-width="${thick}" stroke-dasharray="${Math.max(len-gap,.5)} ${C}" stroke-dashoffset="${-off}" transform="rotate(-90 ${cx} ${cx})" data-tip="${esc(x.label)}: ${x.v}"/>`;off+=len;return e}).join('');
  return `<svg class="chart" style="width:${size}px;height:${size}px;flex:none" viewBox="0 0 ${size} ${size}" role="img" aria-label="${esc(center+' '+sub)}"><circle cx="${cx}" cy="${cx}" r="${R}" fill="none" stroke="#f1e8ef" stroke-width="${thick}"/>${arcs}
   <text x="${cx}" y="${cx+(sub?4:12)}" text-anchor="middle" font-size="${size*.24}" font-weight="700" fill="${COL.ink}">${esc(center)}</text>${sub?`<text x="${cx}" y="${cx+size*.14}" text-anchor="middle" font-size="${size*.085}" fill="${COL.mut}">${esc(sub)}</text>`:''}</svg>`;
}
function ring(pct,color,{size=150,center,sub}={}){
  pct=Math.max(0,Math.min(1,pct));const th=18,R=(size-th)/2,C=2*Math.PI*R,cx=size/2;
  return `<svg class="chart" style="width:${size}px;height:${size}px" viewBox="0 0 ${size} ${size}" role="img" aria-label="${Math.round(pct*100)} percent"><circle cx="${cx}" cy="${cx}" r="${R}" fill="none" stroke="#f1e8ef" stroke-width="${th}"/>
   <circle cx="${cx}" cy="${cx}" r="${R}" fill="none" stroke="${color}" stroke-width="${th}" stroke-linecap="round" stroke-dasharray="${C*pct} ${C}" transform="rotate(-90 ${cx} ${cx})"><animate attributeName="stroke-dasharray" from="0 ${C}" to="${C*pct} ${C}" dur=".9s" fill="freeze"/></circle>
   <text x="${cx}" y="${cx+8}" text-anchor="middle" font-size="${size*.24}" font-weight="700" fill="${COL.ink}">${center??Math.round(pct*100)+'%'}</text>${sub?`<text x="${cx}" y="${cx+size*.2}" text-anchor="middle" font-size="${size*.088}" fill="${COL.mut}">${esc(sub)}</text>`:''}</svg>`;
}
function bars12(S){
  const W=660,H=250,L=44,B=28,T=10,iw=W-L-6,ih=H-B-T,mx=Math.max(1,...S.flatMap(s=>[s.inn,s.out])),top=Math.ceil(mx/ (10**(String(Math.floor(mx)).length-1)))*(10**(String(Math.floor(mx)).length-1)),step=iw/S.length,bw=Math.min(18,step/2.6);
  const y=v=>T+ih-v/top*ih;
  let g='';for(let k=0;k<=3;k++){const v=top*k/3;g+=`<line x1="${L}" x2="${W-6}" y1="${y(v)}" y2="${y(v)}" stroke="${COL.grid}" stroke-width="1"/><text x="${L-8}" y="${y(v)+4}" text-anchor="end" font-size="12" fill="${COL.mut}">${kfmt(v)}</text>`}
  const bars=S.map((s,k)=>{const x=L+step*k+step/2,tip=`${mlab(s.m)} ${s.m.slice(0,4)}\nIn: AED ${money(s.inn,0)}\nOut: AED ${money(s.out,0)}`;
    const r=(v,xx,c)=>v>0?`<path d="M${xx} ${y(0)} V${y(v)+4} q0 -4 4 -4 h${bw-8} q4 0 4 4 V${y(0)} Z" fill="${c}"/>`:'';
    return `<g class="bar" data-tip="${esc(tip)}"><rect x="${x-step/2}" y="${T}" width="${step}" height="${ih+B}" fill="transparent"/>${r(s.inn,x-bw-1,COL.in)}${r(s.out,x+1,COL.out)}<text x="${x}" y="${H-8}" text-anchor="middle" font-size="12" fill="${COL.mut}">${mlab(s.m)}</text></g>`}).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Money in and out, last 12 months">${g}${bars}</svg><div class="legend"><span><i style="background:${COL.in}"></i>Money in</span><span><i style="background:${COL.out}"></i>Money out</span></div>`;
}
function spark(vals,color='#fff',{w=300,h=70,fill=true}={}){
  if(vals.length<2)return '';const mn=Math.min(...vals),mx=Math.max(...vals),rng=mx-mn||1,p=h-14,xs=k=>6+k*(w-12)/(vals.length-1),ys=v=>7+p-(v-mn)/rng*p;
  const d=vals.map((v,k)=>(k?'L':'M')+xs(k).toFixed(1)+' '+ys(v).toFixed(1)).join('');
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="height:${h}px" aria-hidden="true">${fill?`<path d="${d} L${xs(vals.length-1)} ${h} L${xs(0)} ${h} Z" fill="${color}" opacity=".16"/>`:''}<path d="${d}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${xs(vals.length-1)}" cy="${ys(vals[vals.length-1])}" r="5" fill="${color}"/></svg>`;
}
function hbars(items,{color=COL.in,fmt=v=>money(v,0)}={}){
  const mx=Math.max(1,...items.map(i=>i.v));
  return items.map(i=>`<div class="hbar" data-tip="${esc(i.tip||i.label)}"><span class="sm b">${esc(i.label)}</span><span class="t"><b style="width:${Math.max(2,i.v/mx*100)}%;background:${i.color||color}"></b></span><span class="v">${fmt(i.v)}</span></div>`).join('');
}

/* tooltip */
(function(){
  const tip=()=>document.getElementById('tip');
  const show=(t,x,y)=>{const el=tip();if(!el)return;el.textContent=t;el.style.whiteSpace='pre-line';el.style.display='block';const w=el.offsetWidth;el.style.left=Math.max(6,Math.min(innerWidth-w-6,x+12))+'px';el.style.top=Math.max(6,y-el.offsetHeight-12)+'px'};
  document.addEventListener('mousemove',e=>{const t=e.target.closest&&e.target.closest('[data-tip]');if(t)show(t.dataset.tip,e.clientX,e.clientY);else{const el=tip();if(el)el.style.display='none'}});
  document.addEventListener('touchstart',e=>{const t=e.target.closest&&e.target.closest('[data-tip]');if(t){const p=e.touches[0];show(t.dataset.tip,p.clientX,p.clientY);setTimeout(()=>{const el=tip();if(el)el.style.display='none'},2200)}},{passive:true});
})();

/* count-up numbers: <span data-count="1234.5" data-dec="0"> */
function countUp(root=document){
  const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
  root.querySelectorAll('[data-count]').forEach(el=>{
    const to=+el.dataset.count,dec=+(el.dataset.dec||0),fmt=v=>money(v,dec);
    if(reduce||!isFinite(to)||Math.abs(to)<1){el.textContent=fmt(to||0);return}
    const t0=performance.now(),dur=800;
    const step=t=>{const k=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-k,3);el.textContent=fmt(to*e);if(k<1)requestAnimationFrame(step);else el.textContent=fmt(to)};
    requestAnimationFrame(step);
  });
}
const cn=(v,dec=0)=>`<span data-count="${v}" data-dec="${dec}">${money(v,dec)}</span>`;

/* success moment */
function celebrate(msg='Saved'){
  const d=document.createElement('div');d.className='celebrate';
  d.innerHTML=`<div class="cb"><svg width="84" height="84" viewBox="0 0 84 84"><circle cx="42" cy="42" r="38" fill="#0b7a3b"/><path class="ck" d="M24 43 l12 12 l24 -26" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg><div>${esc(msg)}</div></div>`;
  document.body.appendChild(d);
  if(!matchMedia('(prefers-reduced-motion:reduce)').matches){const cols=['#e95420','#2a78d6','#eda100','#008300','#e87ba4','#6250d6'];
    for(let k=0;k<46;k++){const c=document.createElement('i');c.className='confetti';c.style.left=Math.random()*100+'vw';c.style.background=cols[k%cols.length];c.style.animationDelay=Math.random()*.4+'s';c.style.animationDuration=1.2+Math.random()*.9+'s';document.body.appendChild(c);setTimeout(()=>c.remove(),2600)}}
  setTimeout(()=>d.remove(),1250);
}

/* friendly empty states */
const ILL={
  keys:'<svg viewBox="0 0 120 90"><g class="bob"><circle cx="40" cy="40" r="20" fill="none" stroke="#e95420" stroke-width="8"/><path d="M58 40 H104 M90 40 v14 M100 40 v10" stroke="#e95420" stroke-width="8" stroke-linecap="round" fill="none"/></g><ellipse cx="60" cy="80" rx="34" ry="5" fill="#e6dfe5"/></svg>',
  inbox:'<svg viewBox="0 0 120 90"><g class="bob"><path d="M18 50 l16 -26 h52 l16 26 v26 h-84 Z" fill="#f1e8ef" stroke="#5e2750" stroke-width="5" stroke-linejoin="round"/><path d="M18 50 h28 q4 12 14 12 t14 -12 h28" fill="none" stroke="#5e2750" stroke-width="5" stroke-linejoin="round"/></g></svg>',
  check:'<svg viewBox="0 0 120 90"><g class="bob"><circle cx="60" cy="42" r="30" fill="#dff3e6"/><path d="M45 43 l11 11 l21 -24" fill="none" stroke="#0b7a3b" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></g><ellipse cx="60" cy="80" rx="30" ry="5" fill="#e6dfe5"/></svg>',
  building:'<svg viewBox="0 0 120 90"><g class="bob"><rect x="30" y="14" width="60" height="62" rx="6" fill="#f1e8ef" stroke="#5e2750" stroke-width="5"/><g fill="#e95420"><rect x="40" y="26" width="12" height="12" rx="2"/><rect x="68" y="26" width="12" height="12" rx="2"/><rect x="40" y="48" width="12" height="12" rx="2"/></g><rect x="66" y="50" width="14" height="26" rx="2" fill="#5e2750"/></g></svg>'
};
/* 3dicons (CC0) - loaded from their public CDN; falls back to the drawn SVG if it can't load */
const I3_IK='https://ik.imagekit.io/3dicons/tr:w-256,h-256/v1/',I3_DO='https://3dicons.sgp1.cdn.digitaloceanspaces.com/v1/';
const i3=(name,cls='',alt='')=>{const p=`iso/color/${name}-iso-color.png`;return `<img class="i3d ${cls}" src="${I3_IK}${p}" data-p="${p}" data-k="${cls}" alt="${alt}" loading="lazy" decoding="async" onerror="i3err(this)">`};
function i3err(el){if(!el.dataset.f){el.dataset.f=1;el.src=I3_DO+el.dataset.p}else el.remove()}
const I3K={keys:'map-pin',inbox:'file-text',check:'tick',building:'map-pin'};
const empty=(kind,text)=>`<div class="empty"><div class="eimg">${ILL[kind]||''}${I3K[kind]?`<img class="i3d big bob" src="${I3_IK}iso/color/${I3K[kind]}-iso-color.png" alt="" loading="lazy" onload="this.parentNode.firstChild.style.display='none'" onerror="this.remove()">`:''}</div><div>${text}</div></div>`;

/* phones: turn every table into stacked cards (CSS does the rest at <=860px) */
function mobilize(root=document){
  root.querySelectorAll('table.tbl').forEach(t=>{
    const heads=[...t.querySelectorAll('thead th')].map(h=>h.textContent.trim());if(!heads.length)return;
    t.classList.add('stack');
    t.querySelectorAll('tbody tr').forEach(tr=>{[...tr.children].forEach((td,k)=>{if(td.tagName==='TD'&&!td.hasAttribute('data-l'))td.setAttribute('data-l',heads[k]||'')})});
  });
}
