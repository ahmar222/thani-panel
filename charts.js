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
/* vector line icons (Lucide-style, 24px, 2px stroke) */
const LUC={sign:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
 wallet:'<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2"/><path d="M21 12h-5a2 2 0 0 0 0 4h5z"/>',
 calendar:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
 chart:'<path d="M3 3v18h18"/><path d="M7 16v-5M12 16V7M17 16v-3"/>',
 bell:'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
 clock:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
 file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
 cash:'<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
 building:'<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
 check:'<circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/>',
 pin:'<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
 inbox:'<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11"/>',
 key:'<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3"/>',
 scan:'<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/>',
 upload:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/>',
 search:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
 info:'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 x:'<path d="M18 6 6 18M6 6l12 12"/>',
 alert:'<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/>',
 home:'<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
 users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
 grid:'<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
 book:'<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
 bank:'<path d="M3 21h18M5 21V10M19 21V10M9 21V10M15 21V10M2 10l10-7 10 7"/>',
 pie:'<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
 wrench:'<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z"/>',
 sliders:'<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
 menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
 print:'<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
 logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>'
};
const svgi=(n,s=20,w=2)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${LUC[n]||''}</svg>`;
const I3MAP={'money-bag':'wallet','calender':'calendar','chart':'chart','bell':'bell','clock':'clock','file-text':'file','wallet':'wallet','money':'cash','key':'building','tick':'check','map-pin':'pin'};
const i3=(name,cls='')=>`<span class="lic ${cls}">${svgi(I3MAP[name]||name,cls.includes('hero-i')?28:cls.includes('sm')?20:24,1.8)}</span>`;
const EMP={keys:'building',inbox:'inbox',check:'check',building:'building'};
const empty=(kind,text)=>`<div class="empty"><span class="elic">${svgi(EMP[kind]||'check',34,1.6)}</span><div>${text}</div></div>`;

/* phones: turn every table into stacked cards (CSS does the rest at <=860px) */
function mobilize(root=document){
  root.querySelectorAll('table.tbl').forEach(t=>{
    const heads=[...t.querySelectorAll('thead th')].map(h=>h.textContent.trim());if(!heads.length)return;
    t.classList.add('stack');
    t.querySelectorAll('tbody tr').forEach(tr=>{[...tr.children].forEach((td,k)=>{if(td.tagName==='TD'&&!td.hasAttribute('data-l'))td.setAttribute('data-l',heads[k]||'')})});
  });
}

/* single segmented ring: rounded caps, 2px gaps, clickable */
donut=function(segs,{size=170,center='',sub='',thick=20,active=''}={}){
  const live=segs.filter(x=>x.v>0),tot=live.reduce((s,x)=>s+x.v,0)||1,R=(size-thick-6)/2,C=2*Math.PI*R,cx=size/2;let off=0;
  const arcs=live.map(x=>{
    const L=x.v/tot*C,single=live.length===1,vis=single?C:Math.max(.1,L-thick-2),st=single?0:off+thick/2+1,on=active===x.key,dim=active&&!on;
    const e=`<circle class="arc ${on?'on':''}" cx="${cx}" cy="${cx}" r="${R}" fill="none" stroke="${x.color}" stroke-width="${on?thick+4:thick}" stroke-linecap="${single?'butt':'round'}" stroke-dasharray="${vis} ${C}" stroke-dashoffset="${-st}" transform="rotate(-90 ${cx} ${cx})" opacity="${dim?.28:1}" data-act="flatFilter" data-s="${x.key||''}" data-tip="${esc(x.label)}: ${x.v}" tabindex="0" role="button" aria-label="${esc(x.label)} ${x.v}"/>`;off+=L;return e}).join('');
  return `<svg class="chart donut" style="width:${size}px;height:${size}px;flex:none" viewBox="0 0 ${size} ${size}" role="img" aria-label="${esc(center+' '+sub)}">${arcs}
   <text x="${cx}" y="${cx+(sub?2:10)}" text-anchor="middle" font-size="${size*.24}" font-weight="700" fill="${COL.ink}">${esc(center)}</text>${sub?`<text x="${cx}" y="${cx+size*.15}" text-anchor="middle" font-size="${size*.085}" fill="${COL.mut}">${esc(sub)}</text>`:''}</svg>`;
};
/* sparkline with axis labels and hover points */
spark=function(vals,color='#fff',{w=360,h=120,tips=[],xl=[],fmt=v=>kfmt(v)}={}){
  if(vals.length<2)return '';const mn=Math.min(...vals),mx=Math.max(...vals),rng=mx-mn||1,L=38,B=20,T=8,pw=w-L-8,ph=h-B-T;
  const xs=k=>L+k*pw/(vals.length-1),ys=v=>T+ph-(v-mn)/rng*ph;
  const d=vals.map((v,k)=>(k?'L':'M')+xs(k).toFixed(1)+' '+ys(v).toFixed(1)).join('');
  const pts=vals.map((v,k)=>`<g class="pt"><circle class="hit" cx="${xs(k)}" cy="${ys(v)}" r="13" fill="transparent" data-tip="${esc(tips[k]||'')}"/><circle class="dot" cx="${xs(k)}" cy="${ys(v)}" r="4.5" fill="${color}" stroke="rgba(0,0,0,.35)" stroke-width="2"/></g>`).join('');
  const gl=[mn,(mn+mx)/2,mx].map(v=>`<line x1="${L}" x2="${w-8}" y1="${ys(v)}" y2="${ys(v)}" stroke="rgba(255,255,255,.14)" stroke-dasharray="3 4"/><text x="${L-6}" y="${ys(v)+4}" text-anchor="end" font-size="11" fill="rgba(255,255,255,.65)">${fmt(v)}</text>`).join('');
  const xt=[0,Math.floor((vals.length-1)/2),vals.length-1].map((k,i)=>`<text x="${xs(k)}" y="${h-4}" text-anchor="${i==0?'start':i==2?'end':'middle'}" font-size="11" fill="rgba(255,255,255,.65)">${xl[k]||''}</text>`).join('');
  return `<svg class="chart spk" viewBox="0 0 ${w} ${h}" role="img" aria-label="Bank balance trend">${gl}<path d="${d} L${xs(vals.length-1)} ${T+ph} L${xs(0)} ${T+ph} Z" fill="${color}" opacity=".14"/><path d="${d}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>${xt}${pts}</svg>`;
};
