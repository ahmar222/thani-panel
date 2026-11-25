/* ===== UI v2: chrome (sidebar, header, search), dashboard, flats + drawer ===== */
(function(){
/* ---------- chrome ---------- */
const NAV=[['dashboard','grid','Dashboard'],0,['Operations'],['tenants','users','Tenants & Ejari'],['contracts','sign','Contracts'],['flats','building','Flats'],['Finance'],['cheques','file','Cheque register'],['receipts','inbox','Receipts'],['overdue','clock','Overdue & penalties'],['ledger','book','Ledger'],['bank','bank','Bank check'],['Admin'],['partners','pie','Partners'],['costs','wrench','Expenses & staff'],['settings','sliders','Settings']];
$('#side').innerHTML=`<div class="brand"><i>${svgi('building',20,2)}</i><span class="t">Thani Real Estate</span></div>`+NAV.map(n=>!n?'':n.length===1?`<div class="grp"><span class="t">${n[0]}</span></div>`:`<a href="#/${n[0]}" data-r="${n[0]}" title="${n[2]}">${svgi(n[1],20,1.9)}<span class="t">${n[2]}</span>${n[0]==='receipts'?'<span id="inboxbadge" hidden></span>':''}</a>`).join('');
$('#app > div').firstElementChild.outerHTML=`<header class="top"><button class="btn icon" id="menu" aria-label="Menu">${svgi('menu',20)}</button><span class="mtitle">Thani</span>
 <button class="searchbtn" id="searchBtn" data-act="openSearch">${svgi('search',18)}<span class="ph-t">Search tenants, flats, cheques…</span><kbd>⌘K</kbd></button><span class="sp"></span>
 <span id="syncchip" class="sync"></span>
 <div class="prof"><button class="avatar" id="avatar" data-act="profMenu" aria-label="Account">T</button><div class="pmenu" id="pmenu" hidden><div class="who"><b id="whoami"></b><span class="muted xs">Signed in</span></div>
  <a href="#/settings" data-act="profMenu">${svgi('sliders',16)} Settings</a><button data-act="printSnapshot">${svgi('print',16)} Export PDF snapshot</button><button id="signout" data-act="signout" hidden>${svgi('logout',16)} Sign out</button></div></div></header>`;
$('#tabbar').innerHTML=`<a href="#/dashboard" data-r="dashboard">${svgi('home',22,1.9)}Home</a><a href="#/flats" data-r="flats">${svgi('building',22,1.9)}Flats</a><button class="fab" data-act="quickAdd" aria-label="Add">${svgi('plus',28,2.4)}</button><a href="#/partners" data-r="partners">${svgi('pie',22,1.9)}Partners</a><button class="tb" id="moreBtn">${svgi('menu',22,1.9)}More</button>`;
document.body.insertAdjacentHTML('beforeend','<aside id="drawer" aria-live="polite"></aside><div id="searchlayer"></div>');
document.querySelector('main').insertAdjacentHTML('beforebegin','<div class="printhead"><b>Thani Real Estate</b> · Executive snapshot · <span id="phdate"></span></div>');
actions.profMenu=()=>{$('#pmenu').hidden=!$('#pmenu').hidden};
document.addEventListener('click',e=>{if(!e.target.closest('.prof'))$('#pmenu').hidden=true});
actions.printSnapshot=()=>{$('#pmenu').hidden=true;$('#phdate').textContent=todayLong();window.print()};
const todayLong=()=>new Date(TODAY+'T12:00:00').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

/* ---------- state ---------- */
F.dash=F.dash||{unit:'',range:'1Y'};F.flats=F.flats||{b:'',st:''};
const SK=[['occupied','Occupied','var(--occ)'],['ending','Expiring soon','var(--end)'],['overdue','Overdue','var(--od)'],['vacant','Vacant','var(--vac)']];
const STC={occupied:'Occupied',ending:'Expiring soon',overdue:'Rent overdue',vacant:'Vacant'};
const cur=()=>route().r==='flats'?F.flats:F.dash;
actions.flatFilter=d=>{const f=cur(),k=route().r==='flats'?'st':'unit';f[k]=f[k]===d.s?'':d.s;refresh()};
actions.flatBuilding=d=>{F.flats.b=d.b;refresh()};
actions.goFlats=d=>{F.flats.st=d.s||'';F.flats.b='';location.hash='#/flats'};
actions.dashRange=d=>{F.dash.range=d.r;refresh()};

/* ---------- unit tiles ---------- */
const floorOf=no=>/^SHOP/i.test(no)?[0,'Shops']:/^G/i.test(no)?[1,'Ground']:/^\d/.test(no)?[+no[0]+1,'Floor '+no[0]]:[9,'Other'];
const monthly=t=>Math.round((t.annual||0)/12);
function unitCard(s,filter){
  const t=s.t,dim=filter&&filter!==s.st;let l1,l2,tip;
  if(t){const od=CC.ten[t.id].insts.filter(i=>i.status==='overdue').reduce((q,i)=>q+i.bal,0);
    l1=esc(t.tenant);
    l2=s.st==='overdue'?`Overdue AED ${money(od,0)}`:s.days<0?`Ended ${-s.days}d ago`:`AED ${money(monthly(t),0)} · ${s.days}d left`;
    tip=`${s.u.no} · ${STC[s.st]}\n${t.tenant}\nAED ${money(monthly(t),0)}/month · ends ${fd(t.end)}`;
  }else{const dv=s.vacantSince?daysBetween(s.vacantSince,TODAY):null;
    l1=`<span class="cta" data-act="newTenant" data-u="${esc(s.u.id)}">${svgi('plus',13,2.4)} Assign tenant</span>`;
    l2=dv!=null?`${dv}d vacant`:'Vacant';tip=`${s.u.no} · Vacant${s.past?'\nLast: '+s.past.tenant:''}`}
  return `<div class="unit ${s.st} ${dim?'dim':''}" role="button" tabindex="0" data-act="unitTap" data-u="${esc(s.u.id)}" data-tip="${esc(tip)}"><b>${esc(s.u.no)}</b><span class="n">${l1}</span><span class="m">${l2}</span></div>`;
}
function unitMap(bid,states,filter){
  const L=states.filter(s=>s.u.building===bid);if(!L.length)return '';
  const fl={};L.forEach(s=>{const [k,n]=floorOf(s.u.no);(fl[k]=fl[k]||{n,items:[]}).items.push(s)});
  return `<div class="bsec"><h4>${esc(bname(bid))}</h4><div class="map">${Object.keys(fl).map(Number).sort((a,b)=>a-b).map(k=>`<div class="floor"><b>${fl[k].n}</b><div class="units">${fl[k].items.sort((a,b)=>a.u.no.localeCompare(b.u.no,undefined,{numeric:true})).map(s=>unitCard(s,filter)).join('')}</div></div>`).join('')}</div></div>`;
}
const stateCounts=L=>({all:L.length,occupied:L.filter(s=>s.st==='occupied').length,ending:L.filter(s=>s.st==='ending').length,overdue:L.filter(s=>s.st==='overdue').length,vacant:L.filter(s=>s.st==='vacant').length});
const pills=(cnt,active)=>`<div class="pills">${[['','All','var(--ink)']].concat(SK).map(([k,l,c])=>`<button class="pill-f ${active===k?'on':''}" data-act="flatFilter" data-s="${k}"><i style="background:${c}"></i>${l}<b>${k===''?cnt.all:cnt[k]}</b></button>`).join('')}</div>`;

/* ---------- drawer ---------- */
let DR=null;
actions.unitTap=d=>{DR=d.u;drawer()};
actions.closeDrawer=()=>{DR=null;$('#drawer').classList.remove('open');$('#drawer').innerHTML=''};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&DR)actions.closeDrawer()});
function drawer(){
  const el=$('#drawer');if(!DR||!D){el.classList.remove('open');return}
  const s=unitStates(CC).find(x=>x.u.id===DR);if(!s)return;const u=s.u,t=s.t;let body;
  if(t){const x=CC.ten[t.id],od=x.insts.filter(i=>i.status==='overdue');
    body=`<div class="dsec"><span class="chip ${s.st==='overdue'?'red':s.st==='ending'?'amber':'green'}">${STC[s.st]}</span><h3>${esc(t.tenant)}</h3><div class="muted">${esc(t.type||u.type||'')}${t.mobile?' · '+esc(t.mobile):''}</div></div>
     <div class="dgrid"><div><span>Monthly rent</span><b>AED ${money(monthly(t),0)}</b></div><div><span>Annual</span><b>AED ${money(t.annual,0)}</b></div><div><span>Contract</span><b>${fdt(t.start)} → ${fdt(t.end)}</b></div><div><span>${s.days<0?'Ended':'Ends in'}</span><b class="${s.days<=30?'bad':''}">${Math.abs(s.days)} days${s.days<0?' ago':''}</b></div><div><span>Owing now</span><b class="${od.length?'bad':''}">AED ${money(od.reduce((q,i)=>q+i.bal,0),0)}</b></div><div><span>Deposit held</span><b>AED ${money(x.depHeld,0)}</b></div></div>
     <div class="dact"><button class="btn primary" data-act="goTenant" data-id="${t.id}">Open tenant</button><button class="btn" data-act="payInst" data-t="${t.id}">Receive payment</button><button class="btn danger" data-act="openMoveOut" data-id="${t.id}">Moved out…</button></div>
     <p class="hint">Tenant already left? Choose <b>Moved out</b> – you can back-date the move-out and cancel the remaining cheques.</p>`;
  }else{const dv=s.vacantSince?daysBetween(s.vacantSince,TODAY):null,lr=s.past?monthly(s.past):0;
    body=`<div class="dsec"><span class="chip">Vacant</span><h3>${dv!=null?dv+' days vacant':'Vacant'}</h3><div class="muted">${s.past?'Since '+fd(s.vacantSince):'No previous tenant on record'}</div></div>
     <div class="dgrid">${s.past?`<div><span>Last tenant</span><b>${esc(s.past.tenant)}</b></div><div><span>Last rent</span><b>AED ${money(lr,0)}/month</b></div>`:''}${dv!=null&&lr?`<div class="wide"><span>Rent not earned since</span><b class="bad">≈ AED ${money(lr/30*dv,0)}</b></div>`:''}</div>
     <div class="dact"><button class="btn primary" data-act="newTenant" data-u="${esc(u.id)}">${svgi('plus',16,2.2)} Assign tenant</button></div><p class="hint">Pick this flat's tenant details or read an Ejari – the flat is filled in for you.</p>`}
  el.innerHTML=`<div class="dhd"><div><b>${esc(bshort(u.building))} · ${esc(u.no)}</b><div class="muted xs">${esc(u.type||'')}</div></div><button class="x" data-act="closeDrawer" aria-label="Close">×</button></div><div class="dbd">${body}</div>`;
  el.classList.add('open');
}
actions.goTenant=d=>{actions.closeDrawer();closeModal();location.hash='#/tenant/'+d.id};

/* ---------- Flats page ---------- */
const tenHead=view=>`<div class="ph"><div><h2>${view==='map'?'Flats':'Tenants'}</h2></div><div class="toolbar"><div class="seg"><a class="${view==='map'?'on':''}" href="#/flats">Map</a><a class="${view==='list'?'on':''}" href="#/tenants">List</a></div><button class="btn primary" data-act="newTenant">${svgi('plus',16,2.2)} New tenant</button><label class="btn">${svgi('scan',18,1.9)} Read Ejari<input type="file" accept="application/pdf,image/*" hidden data-act-change="ejari"></label><label class="btn">${svgi('file',18,1.9)} Link many Ejari<input type="file" accept="application/pdf" multiple hidden data-act-change="ejariBulk"></label></div></div>`;
PAGES.flats=()=>{
  const f=F.flats,all=unitStates(CC),inB=all.filter(s=>!f.b||s.u.building===f.b),cnt=stateCounts(inB);
  const lost=Math.round(inB.filter(s=>!s.t&&s.past).reduce((q,s)=>q+monthly(s.past),0));
  const bs=D.buildings.map(b=>{const L=all.filter(s=>s.u.building===b.id),n=L.filter(s=>s.t).length,p=L.length?Math.round(n/L.length*100):0;
    return `<button class="bpill ${f.b===b.id?'on':''}" data-act="flatBuilding" data-b="${b.id}"><span class="bn">${esc(b.name)}</span><span class="bs">${n}/${L.length} let · ${p}%</span><span class="bar"><i style="width:${p}%"></i></span></button>`}).join('');
  return tenHead('map')+`<div class="bento"><div class="tile s12">
   <div class="bswitch"><button class="bpill ${!f.b?'on':''}" data-act="flatBuilding" data-b=""><span class="bn">All buildings</span><span class="bs">${all.filter(s=>s.t).length}/${all.length} let · ${all.length?Math.round(all.filter(s=>s.t).length/all.length*100):0}%</span><span class="bar"><i style="width:${all.length?Math.round(all.filter(s=>s.t).length/all.length*100):0}%"></i></span></button>${bs}</div>
   <div class="row between" style="margin:16px 0 14px">${pills(cnt,f.st)}<div class="row" style="gap:10px">${lost?`<span class="chip amber" data-tip="Estimated from the last rent of each vacant flat">Vacancy costs ≈ AED ${money(lost,0)}/month</span>`:''}<span class="infoic" data-tip="Green: rent up to date\nAmber: contract ends within 60 days\nRed: a cheque is overdue\nDashed: vacant\nTap a flat for details – or to record a move-out.">${svgi('info',18)}</span></div></div>
   ${D.buildings.filter(b=>!f.b||b.id===f.b).map(b=>unitMap(b.id,all,f.st)).join('')}</div></div>`;
};
PAGES.tenants=()=>{const h=_tenOld();return tenHead('list')+h.slice(h.indexOf('<div class="filters">'))};
window._draw.tenants=()=>{if($('#tbl'))_tenDrawOld()};

/* ---------- alert strip ---------- */
const DIS_KEY='thani_strip';const dismissed=()=>{try{return JSON.parse(localStorage.getItem(DIS_KEY)||'{}')}catch(e){return {}}};
actions.stripX=d=>{const m=dismissed();m[d.id]=TODAY;try{localStorage.setItem(DIS_KEY,JSON.stringify(m))}catch(e){}refresh()};
function strip(C){
  const A=[];
  const ending=D.tenancies.filter(t=>t.status==='active'&&daysBetween(TODAY,t.end)<=30);
  if(ending.length)A.push({id:'end',lvl:'amber',icon:'calendar',txt:`<b>${ending.length}</b> Ejari contract${ending.length>1?'s':''} ending within 30 days`,act:'data-act="goFlats" data-s="ending"',cta:'Review'});
  let pn=0,pa=0;D.tenancies.filter(t=>t.status==='active').forEach(t=>CC.ten[t.id].insts.forEach(i=>{const dl=daysBetween(TODAY,i.due);if(!i.done&&!i.cancelled&&i.cheque&&(i.cheque.status||'held')==='held'&&dl>=0&&dl<=7){pn++;pa+=chqFace(i)}}));
  if(pn)A.push({id:'pdc',lvl:'blue',icon:'cash',txt:`<b>${pn}</b> post-dated cheque${pn>1?'s':''} (AED ${money(pa,0)}) to deposit within 7 days`,href:'#/cheques',cta:'Open cheques',pre:'week'});
  const esc30=C.overdue.filter(i=>i.openLate>=30);
  if(esc30.length)A.push({id:'esc',lvl:'red',icon:'alert',txt:`<b>${esc30.length}</b> cheque${esc30.length>1?'s':''} overdue 30+ days (AED ${money(esc30.reduce((q,i)=>q+i.bal,0),0)}) – escalate`,href:'#/overdue',cta:'Escalate'});
  const dis=dismissed();const L=A.filter(a=>dis[a.id]!==TODAY);
  return L.length?`<div class="strip">${L.map(a=>`<div class="sitem ${a.lvl}">${svgi(a.icon,18)}<span>${a.txt}</span>${a.href?`<a class="sa" href="${a.href}" ${a.pre?`data-act="chqPre" data-w="${a.pre}"`:''}>${a.cta}</a>`:`<a class="sa" href="#/flats" ${a.act}>${a.cta}</a>`}<button class="sx" data-act="stripX" data-id="${a.id}" aria-label="Dismiss">${svgi('x',14,2.2)}</button></div>`).join('')}</div>`:'';
}
actions.chqPre=d=>{F.cheques.tab='week'};

/* ---------- dashboard ---------- */
const MONN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const ml=m=>MONN[+m.slice(5,7)-1];
function rangeSeries(){let s=series12(),r=F.dash.range;const ys=D.settings.yearStart;if(ys){const k=s.filter(x=>x.m>=ys.slice(0,7));if(k.length)s=k}return r==='6M'?s.slice(-6):r==='YTD'?s.filter(x=>x.m.startsWith(TODAY.slice(0,4))):s}
function monthRent(){let due=0,got=0;const ms=TODAY.slice(0,7);D.tenancies.filter(t=>t.status==='active').forEach(t=>CC.ten[t.id].insts.forEach(i=>{if(!i.cancelled&&i.due.slice(0,7)===ms){due+=i.amount;got+=Math.min(i.paid,i.amount)}}));return {due:r2(due),got:r2(got)}}
function expBreak(){let from=addMonths(TODAY.slice(0,7)+'-01',-11);const ys0=D.settings.yearStart;if(ys0&&ys0>from)from=ys0;const m={};D.entries.filter(e=>e.status!=='pending'&&e.kind==='expense'&&e.date>=from&&e.cat!=='deposit_refund').forEach(e=>{const k=EXP_CATS[e.cat]||e.cat;m[k]=(m[k]||0)+e.amount});return Object.entries(m).sort((a,b)=>b[1]-a[1])}

const bdg=(n,tone)=>`<span class="ibadge ${tone}">${svgi(n,20,1.9)}</span>`;
const RK={red:0,amber:1,blue:2};
const aid=a=>(a.link.match(/tenant\/(.+)$/)||[])[1];
function rowAct(a){const id=aid(a),t=a.txt;
  if(/^Contract (ended|ends)/.test(t))return `<button class="btn sm" data-act="renewTenant" data-id="${id}">Renew</button>`;
  if(/^Assign a flat/.test(t))return `<a class="btn sm" href="${a.link}">Assign flat</a>`;
  if(/salary/.test(t))return `<a class="btn sm" href="#/costs">Log salary</a>`;
  if(/receipt\(s\) waiting/.test(t))return `<a class="btn sm" href="#/receipts">Assign</a>`;
  if(/deposit still held/.test(t))return `<button class="btn sm" data-act="openMoveOut" data-id="${id}">Settle</button>`;
  if(/late-paid/.test(t))return `<a class="btn sm" href="#/overdue">Decide</a>`;
  if(/bounced/.test(t))return `<a class="btn sm" href="${a.link}">Open</a>`;
  return `<a class="btn sm" href="${a.link}">Open</a>`}
function attention(A){
  if(!A.length)return empty('check','All clear');
  const G=[['red','Critical / expired'],['amber','Expiring soon'],['blue','To do']];
  return G.map(([k,l])=>{const L=A.filter(a=>a.lvl===k);if(!L.length)return '';
    const sh=L.slice(0,k==='red'?6:4);
    return `<div class="agrp ${k}"><div class="ahd"><i></i>${l}<b>${L.length}</b></div>${sh.map(a=>`<div class="arow"><span class="at">${esc(a.txt)}</span>${rowAct(a)}</div>`).join('')}${L.length>sh.length?`<div class="muted xs" style="padding:4px 0 0 4px">+ ${L.length-sh.length} more</div>`:''}</div>`}).join('')}
function pbars(C){
  const L=C.partners.slice().sort((a,b)=>b.owed-a.owed),mx=Math.max(1,...L.map(x=>Math.abs(x.owed)));
  return `<div class="pbars">${L.map(x=>`<div class="pb" data-tip="${esc(x.p.name)}\nShare ${(x.share*100).toFixed(2)}%"><div class="pn"><span>${esc(x.p.short)} <em>${(x.share*100).toFixed(1)}%</em></span><b>AED ${money(x.owed,0)}</b></div><div class="trk"><i style="width:${Math.max(0,x.owed)/mx*100}%"></i></div></div>`).join('')}<div class="ptot"><span>Total owed</span><b>AED ${money(C.owedTotal,0)}</b></div></div>`}

function rampCard(){
  const T=D.tenancies.filter(t=>t.units&&t.units.length&&t.start);if(!T.length)return '';
  const first=T.map(t=>t.start).sort()[0].slice(0,7),cur=TODAY.slice(0,7),N=D.units.length;const rows=[];
  for(let m=first;m<=cur;m=addMonths(m+'-01',1).slice(0,7)){const ref=m===cur?TODAY:addDays(addMonths(m+'-01',1),-1);
    const live=T.filter(t=>t.start<=ref&&(t.end>=ref)&&!(t.endedOn&&t.endedOn<=ref)&&!(t.vacatedOn&&t.vacatedOn<=ref));
    const let_=live.reduce((s,t)=>s+t.units.length,0),rent=Math.round(live.reduce((s,t)=>s+((t.annual||0)-t.installments.reduce((q,i)=>q+(+i.discount||0),0))/12,0));
    const got=r2(D.entries.filter(e=>e.kind==='income'&&e.cat==='rent'&&e.status!=='pending'&&e.date.slice(0,7)===m).reduce((s,e)=>s+e.amount,0));
    rows.push({m,let_,rent,got})}
  const last=rows[rows.length-1],mx=Math.max(1,...rows.map(r=>Math.max(r.rent,r.got))),full=rows.find(r=>r.rent>=last.rent*.7);
  const t12=rows.slice(-12),rcv=r2(t12.reduce((s,r)=>s+r.got,0)),run=last.rent*12;
  return `<div class="tile s12 noprint"><div class="row between"><div><h3>Rent ramp-up</h3><div class="cap">${full?`Rent has been at 70% or more of today's level since <b>${ml(full.m)} ${full.m.slice(0,4)}</b>. Before that the buildings were mostly empty (renovation / first lettings).`:''}</div></div></div>
   <div class="kpis4" style="margin:14px 0"><div class="k4"><span>Flats let now</span><b>${last.let_} of ${N}</b></div><div class="k4"><span>Contracted rent / month</span><b>AED ${money(last.rent,0)}</b></div><div class="k4"><span>Received, last 12 months</span><b>AED ${money(rcv,0)}</b></div><div class="k4"><span>Today's contracts, per year</span><b>AED ${money(run,0)}</b></div></div>
   <div class="tcard"><div class="tscroll"><table><thead><tr><th>Month</th><th class="num">Flats let</th><th class="num">Contracted rent</th><th class="num">Rent received</th><th>Rent level</th></tr></thead><tbody>${rows.map(r=>`<tr><td class="nw"><b>${ml(r.m)} ${r.m.slice(0,4)}</b></td><td class="num">${r.let_} / ${N}</td><td class="num">AED ${money(r.rent,0)}</td><td class="num">AED ${money(r.got,0)}</td><td style="min-width:160px"><div class="trk"><i style="width:${r.rent/mx*100}%;${full&&r.m>=full.m?'':'background:#cbd5e1'}"></i></div></td></tr>`).join('')}</tbody></table></div></div>
   <p class="muted xs" style="margin-top:8px">Contracted rent = yearly rent of every contract running that month ÷ 12. Rent received = rent payments recorded in the ledger that month (cheques land in different months, so it moves up and down).</p></div>`;
}
PAGES.dashboard=()=>{
  const C=CC,S=D.settings,A=alerts(C),v=S.lastVerified,states=unitStates(C),ser12=series12(),f=F.dash;
  const vc=v?cashAsOf(v.date):null,vok=v&&Math.abs(vc-v.balance)<0.015;
  const odAmt=r2(C.overdue.reduce((s,i)=>s+i.bal,0)),stale=C.lastEntry&&daysBetween(C.lastEntry,TODAY)>21;
  const cnt=stateCounts(states),letN=states.filter(s=>s.t).length,mr=monthRent(),eb=expBreak(),ebT=eb.reduce((s,x)=>s+x[1],0);
  const top=eb.slice(0,5).map(([l,v])=>({label:l.split(' (')[0].split(' /')[0],v,tip:l+': AED '+money(v,0)}));if(eb.length>5)top.push({label:'Other',v:eb.slice(5).reduce((s,x)=>s+x[1],0)});
  const pb=C.partners.slice().sort((a,b)=>b.owed-a.owed).map(x=>({label:x.p.short,v:x.owed,tip:`${x.p.name}\nShare ${(x.share*100).toFixed(2)}%`}));
  const arrAmt=r2(C.arrears.reduce((s,i)=>s+i.bal,0)),rs=rangeSeries();
  const segs=SK.map(([k,l,c])=>({key:k,label:l,v:cnt[k],color:COL[{occupied:'occ',ending:'end',overdue:'od',vacant:'vac'}[k]]}));
  return `<div class="ph"><div><h2>Hello, Mr Thani</h2><div class="sub">${todayLong()}</div></div><div class="row"><label class="btn primary upl">${svgi('upload',18,2)} Upload receipt<input type="file" multiple accept="application/pdf,image/*" hidden data-act-change="dashIngest"></label><button class="btn" data-act="addReceipt">+ Receipt</button><button class="btn" data-act="addExpense">+ Expense</button></div></div>
  ${strip(C)}${stale?`<div class="note amber">Latest entry in the books is <b>${fd(C.lastEntry)}</b> – ${daysBetween(C.lastEntry,TODAY)} days ago. Add newer receipts so overdue and shares are accurate.</div>`:''}
  <div class="bento">
   <div class="tile hero s7"><span class="glow"></span>
     <div class="hhead">${i3('wallet','hero-i')}<div><div class="cap">Owed to partners today</div><div class="big-n"><small>AED</small>${cn(C.owedTotal)}</div></div></div>
     <div class="spkwrap">${spark(ser12.map(s=>s.cash),'#3d3066',{tips:ser12.map(s=>`${ml(s.m)} ${s.m.slice(0,4)}: AED ${money(s.cash,0)}`),xl:ser12.map(s=>ml(s.m))})}</div>
     <div class="row hbtns"><button class="btn primary" data-act="distribute">Distribute to partners</button><a class="btn ghost-h" href="#/partners">See shares</a><a class="btn ghost-h" href="#/bank">Bank check</a><button class="btn ghost-h" data-act="closeYear">Close the year</button></div>
     <div class="recon"><div><span>Bank balance</span><b>${aed(C.cash)}</b>${v?(vok?'<em class="ok2">✓ matches statement</em>':'<em class="bad2">⚠ differs from statement</em>'):''}</div><div><span>Reserve kept</span><b>${aed(S.reserve)}</b></div></div>${S.yearStart?`<div class="cap" style="margin-top:8px">Books year started ${fd(S.yearStart)} · <a href="#" data-act="pastYears" style="color:inherit;text-decoration:underline">Past years</a></div>`:(D.closedYears&&D.closedYears.length?'':'')}</div>
   <div class="tile s5">${bdg('calendar','blue')}<h3>Rent this month</h3><div class="row" style="gap:20px;flex-wrap:nowrap;margin-top:6px">${ring(mr.due?mr.got/mr.due:0,mr.due&&mr.got>=mr.due?COL.occ:COL.in,{size:150,sub:'collected'})}<div><div class="mid-n"><small>AED</small>${cn(mr.got)}</div><div class="cap">of ${aed(mr.due)} due in ${MONN[+TODAY.slice(5,7)-1]}</div>${odAmt?`<a class="chip red" href="#/overdue" style="margin-top:10px">Overdue · ${aed(odAmt)} ›</a>`:'<span class="chip green" style="margin-top:10px">Nothing overdue</span>'}</div></div></div>

   <div class="tile s7"><div class="row between"><div><h3>Money in and out</h3><div class="cap">Excluding the opening balance</div></div><div class="seg sm">${['6M','1Y','YTD'].map(r=>`<button class="${f.range===r?'on':''}" data-act="dashRange" data-r="${r}">${r}</button>`).join('')}</div></div>${bars12(rs)}</div>
   <div class="tile s5"><div class="row between"><h3>Flats</h3><a class="sa2" href="#/flats">Open map ›</a></div><div class="donutwrap">${donut(segs,{size:150,thick:20,center:`${letN}/${states.length}`,sub:'let',active:f.unit})}
     <div class="frows">${SK.map(([k,l,c])=>`<button class="frow ${f.unit===k?'on':''}" data-act="flatFilter" data-s="${k}"><i style="background:${c}"></i><span>${l}</span><b>${cnt[k]}</b></button>`).join('')}</div></div></div>

   <a class="tile s6 stat" href="#/overdue">${bdg('clock','red')}<div class="cap">Overdue cheques</div><div class="mid-n"><small>AED</small>${cn(odAmt)}</div><div class="cap">${C.overdue.length} cheque${C.overdue.length===1?'':'s'}</div></a>
   <a class="tile s6 stat" href="#/cheques">${bdg('cash','green')}<div class="cap">Cheques in hand</div><div class="mid-n"><small>AED</small>${cn(C.chqHeld)}</div><div class="cap">${C.chqHeldN} cheque${C.chqHeldN===1?'':'s'} to come</div></a>

   <div class="tile s7 noprint">${bdg('bell','red')}<h3>Needs attention</h3>${attention(A)}</div>
   <div class="tile s5"><div class="row between"><h3>Each partner is owed</h3><a class="sa2" href="#/partners">Details ›</a></div>${pbars(C)}</div>

   ${rampCard()}
   <div class="tile s12 noprint"><div class="row between"><div><h3>Your buildings</h3><div class="cap">${f.unit?`Showing ${STC[f.unit].toLowerCase()} flats – `:''}${f.unit?'<a href="#" data-act="flatFilter" data-s="'+f.unit+'">clear filter</a>':'Tap a flat for details'}</div></div><a class="sa2" href="#/flats">Open Flats ›</a></div><div style="margin-top:14px">${D.buildings.map(b=>unitMap(b.id,states,f.unit)).join('')}</div></div>

   <div class="tile s7 noprint"><div class="row between"><h3>Overdue cheques</h3><a class="sa2" href="#/overdue">All &amp; penalties ›</a></div>${overdueTable(C.overdue.slice(0,6))}${arrAmt>0?`<div class="note red" style="margin-top:10px">Ex-tenants still owe <b>${aed(arrAmt)}</b> (${C.arrears.length} cheque(s))</div>`:''}</div>
   <div class="tile s5"><h3>Where the money went</h3><div class="cap">Last 12 months · ${aed(ebT)}</div>${top.length?hbars(top,{color:COL.out}):empty('inbox','No expenses yet')}</div>
  </div>`;
};

/* ---------- quick search (Cmd/Ctrl+K) ---------- */
let SQ={items:[],i:0};
actions.openSearch=()=>{
  const el=$('#searchlayer');el.innerHTML=`<div class="sov" data-act="closeSearch"><div class="spal" onclick="event.stopPropagation()"><div class="sin">${svgi('search',20)}<input id="sq" placeholder="Search tenant, flat, cheque no., reference…" autocomplete="off"><kbd>esc</kbd></div><div id="sres" class="sres"></div></div></div>`;
  const q=$('#sq');q.focus();q.oninput=()=>runSearch(q.value);runSearch('');
  q.onkeydown=e=>{if(e.key==='ArrowDown'){SQ.i=Math.min(SQ.i+1,SQ.items.length-1);hl();e.preventDefault()}else if(e.key==='ArrowUp'){SQ.i=Math.max(SQ.i-1,0);hl();e.preventDefault()}else if(e.key==='Enter'){pick(SQ.i)}else if(e.key==='Escape')actions.closeSearch()};
};
actions.closeSearch=()=>{$('#searchlayer').innerHTML=''};
actions.pickRes=d=>pick(+d.i);
function runSearch(raw){
  const q=raw.trim().toLowerCase(),items=[];
  const pages=[['Dashboard','#/dashboard'],['Flats','#/flats'],['Tenants','#/tenants'],['Cheque register','#/cheques'],['Receipts','#/receipts'],['Overdue','#/overdue'],['Ledger','#/ledger'],['Bank check','#/bank'],['Partners','#/partners'],['Expenses & staff','#/costs'],['Settings','#/settings']];
  if(!q){pages.slice(0,7).forEach(p=>items.push({g:'Go to',t:p[0],h:p[1]}))}
  else{
    D.tenancies.forEach(t=>{const hay=(t.tenant+' '+t.units.join(' ')+' '+(t.eid||'')+' '+(t.mobile||'')+' '+(t.ejari?.contractNo||'')+' '+bshort(t.building)).toLowerCase();if(hay.includes(q))items.push({g:'Tenants',t:t.tenant,s:`${bshort(t.building)} · ${t.units.join('+')||'?'}${t.status!=='active'?' · moved out':''}`,h:'#/tenant/'+t.id})});
    D.units.forEach(u=>{if((u.no+' '+bshort(u.building)).toLowerCase().includes(q)&&q.length>=2)items.push({g:'Flats',t:`${bshort(u.building)} · ${u.no}`,s:u.type||'',a:u.id})});
    D.tenancies.forEach(t=>t.installments.forEach(i=>{if(i.cheque?.no&&String(i.cheque.no).toLowerCase().includes(q))items.push({g:'Cheques',t:`Cheque ${i.cheque.no}`,s:`${t.tenant} · ${bshort(t.building)} ${t.units.join('+')} · ${fd(i.due)} · AED ${money(chqFace(i),0)}`,h:'#/tenant/'+t.id})}));
    D.entries.forEach(e=>{if(((e.ref||'')+' '+(e.desc||'')+' '+(e.payer||'')).toLowerCase().includes(q)&&q.length>=3)items.push({g:'Ledger',t:(e.desc||e.payer||catName(e)).slice(0,60),s:`${fd(e.date)} · AED ${money(e.amount,0)}`,e:e.id})});
    pages.forEach(p=>{if(p[0].toLowerCase().includes(q))items.push({g:'Go to',t:p[0],h:p[1]})});
  }
  SQ={items:items.slice(0,40),i:0};
  let last='';$('#sres').innerHTML=SQ.items.map((it,k)=>{const g=it.g!==last?`<div class="sg">${it.g}</div>`:'';last=it.g;return g+`<div class="sr" data-act="pickRes" data-i="${k}"><b>${esc(it.t)}</b>${it.s?`<span>${esc(it.s)}</span>`:''}</div>`}).join('')||'<div class="sg">No matches</div>';hl();
}
const hl=()=>{$$('#sres .sr').forEach((e,k)=>e.classList.toggle('on',k===SQ.i));const o=$('#sres .sr.on');if(o)o.scrollIntoView({block:'nearest'})};
function pick(i){const it=SQ.items[i];if(!it)return;actions.closeSearch();if(it.h)location.hash=it.h;else if(it.a){location.hash='#/flats';setTimeout(()=>actions.unitTap({u:it.a}),50)}else if(it.e)openEntry(it.e)}
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#side')&&D&&actions.openSearch()}});

/* ---------- hooks ---------- */
const _after=window.afterRender;
window.afterRender=function(r){_after&&_after(r);drawer();$$('#side a').forEach(a=>a.classList.toggle('on',a.dataset.r===(r==='tenant'?'tenants':r)));$$('#tabbar a').forEach(a=>a.classList.toggle('on',a.dataset.r===r))};
const _qm=actions.qaTenant;
window._uiFlatsDrawer=drawer;
})();
