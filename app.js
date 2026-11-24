/* ===== Thani Real Estate - UI part 1: shell, dashboard, tenants, payments ===== */
const actions={},forms={},F={ledger:{q:'',kind:'',cat:'',b:'',from:'',to:''},tenants:{b:'',q:'',st:'active'},cheques:{b:'',q:'',st:'',when:'upcoming'}};
let CC=null;
const INC_CATS={rent:'Rent',deposit:'Security deposit',penalty:'Late penalty',other:'Other income',carry:'Opening carry-forward'};
const EXP_CATS={maintenance:'Maintenance / repairs',dewa:'DEWA (electricity / water)',lift:'Lift (AMC / repairs)',salary:'Watchman salary',staff:'Staff visa / other staff',waste:'Waste removal',cleaning:'Cleaning',insurance:'Insurance',legal:'Legal / govt / Ejari fees',deposit_refund:'Security deposit refund',other:'Other'};
const catName=e=>e.kind==='payout'?'Partner payout':e.kind==='income'?(INC_CATS[e.cat]||e.cat):(EXP_CATS[e.cat]||e.cat);
const MODES=['bank transfer','cash deposit','cheque','cash','card','other'];
const CHQ_ST={returned:['Returned','dim'],held:['In hand','blue'],deposited:['Deposited','amber'],cleared:['Cleared','green'],bounced:['Bounced','red'],replaced:['Replaced','']};
const ST_CHIP={cancelled:['Cancelled',''],paid:['Paid','green'],settled:['Settled','green'],partial:['Part paid','amber'],overdue:['Overdue','red'],soon:['Due soon','blue'],upcoming:['Upcoming','']};
const chip=(t,c='')=>`<span class="chip ${c}">${esc(t)}</span>`;
const opt=(arr,sel,withBlank)=>(withBlank?`<option value="">${withBlank}</option>`:'')+arr.map(a=>{const [v,l]=Array.isArray(a)?a:[a,a];return `<option value="${esc(v)}" ${String(v)===String(sel)?'selected':''}>${esc(l)}</option>`}).join('');
const bOpts=(sel,blank)=>opt(D.buildings.map(b=>[b.id,b.name]),sel,blank);
const tenById=id=>D.tenancies.find(t=>t.id===id);
const partnerById=id=>D.partners.find(p=>p.id===id);

/* ---------- modal / router ---------- */
function modal({title,body,wide,small}){$('#modal').innerHTML=`<div class="ov"><div class="dlg ${wide?'wide':''} ${small?'small':''}"><div class="dh"><h3>${title}</h3><button class="x" data-act="closeModal" aria-label="Close">×</button></div><div class="db">${body}</div></div></div>`;const f=$('#modal input:not([type=hidden]):not([readonly]),#modal select');}
function closeModal(){$('#modal').innerHTML=''}
actions.closeModal=closeModal;actions.useRemote=useRemote;actions.forcePush=forcePush;
function confirmBox(msg,onYes,btn='Confirm'){window._yes=onYes;modal({title:'Please confirm',small:1,body:`<p>${msg}</p><div class="row end"><button class="btn" data-act="closeModal">Cancel</button><button class="btn primary" data-act="yes">${btn}</button></div>`})}
actions.yes=()=>{const f=window._yes;closeModal();f&&f()};
const PAGES={};
function route(){const [,r,arg]=location.hash.split('/');return {r:r||'dashboard',arg}}
window.refresh=function(){
  if(!D)return;CC=calc();const {r,arg}=route(),y=window.scrollY;
  const pg=PAGES[r]||PAGES.dashboard;$('#main').innerHTML=pg(arg);
  $$('#side a').forEach(a=>a.classList.toggle('on',a.dataset.r===(r==='tenant'?'tenants':r)));
  const pend=CC.pending.length;$('#inboxbadge').textContent=pend||'';$('#inboxbadge').hidden=!pend;
  if(window._draw&&window._draw[r])window._draw[r]();
  window.scrollTo(0,y);setSync(SYNC.state,SYNC.msg);if(window.afterRender)afterRender(r);
};
window.addEventListener('hashchange',()=>{window.scrollTo(0,0);$('#side').classList.remove('open');refresh()});
document.addEventListener('click',e=>{const a=e.target.closest('[data-act]');if(!a)return;const f=actions[a.dataset.act];if(f){e.preventDefault();f(a.dataset,a,e)}});
document.addEventListener('submit',e=>{const f=e.target.dataset.form;if(f&&forms[f]){e.preventDefault();forms[f](new FormData(e.target),e.target)}});
document.addEventListener('input',e=>{const t=e.target;if(t.dataset.f){const [pg,k]=t.dataset.f.split('.');F[pg][k]=t.value;window._draw[pg]()}});
document.addEventListener('change',e=>{const t=e.target;if(t.dataset.f){const [pg,k]=t.dataset.f.split('.');F[pg][k]=t.value;window._draw[pg]()}});
window._draw={};

/* ---------- dashboard ---------- */
const kpi=(l,v,sub,cls='')=>`<div class="kpi ${cls}"><div class="kl">${l}</div><div class="kv">${v}</div><div class="ks">${sub||''}</div></div>`;
PAGES.dashboard=()=>{
  const C=CC,S=D.settings,A=alerts(C),v=S.lastVerified;
  const vc=v?cashAsOf(v.date):null,vok=v&&Math.abs(vc-v.balance)<0.015;
  const odAmt=r2(C.overdue.reduce((s,i)=>s+i.bal,0));
  const stale=C.lastEntry&&daysBetween(C.lastEntry,TODAY)>21;
  return `<div class="ph"><h2>Dashboard</h2><div class="row"><button class="btn primary" data-act="addReceipt">+ Add receipt</button><button class="btn" data-act="addExpense">+ Expense</button><a class="btn" href="#/partners">Pay partners</a></div></div>
  ${stale?`<div class="note amber">Latest entry in the books is <b>${fd(C.lastEntry)}</b> – ${daysBetween(C.lastEntry,TODAY)} days ago. Rent received since then isn't in the system yet, so the overdue list below includes cheques that may already be paid. Add the receipts (Receipts page) to catch up.</div>`:''}
  <div class="kpis">
   ${kpi('Bank balance (books)',aed(C.cash),v?(vok?`<span class="ok">✓ matches bank statement ${fdt(v.date)} (${money(v.balance)})</span>`:`<span class="bad">⚠ books say ${money(vc)} on ${fdt(v.date)}, statement says ${money(v.balance)}</span>`):'')}
   ${kpi('Owed to partners now',aed(C.owedTotal),`Reserve kept: ${aed(S.reserve)}`,'hl')}
   ${kpi('Rent overdue',aed(odAmt),`${C.overdue.length} cheque(s)`,C.overdue.length?'warn':'')}
   ${kpi('Security deposits held',aed(C.depHeld),S.holdDeposits?'Excluded from partner shares':'<span class="bad">Currently included in partner shares</span> (Settings)')}
   ${kpi('Receipts to assign',aed(C.pendingAmt),`${C.pending.length} waiting`,C.pending.length?'warn':'')}
   ${kpi('Cheques in hand (future)',aed(C.chqHeld),`${C.chqHeldN} cheque(s) not yet due/deposited`)}
  </div>
  <div class="grid2">
   <section class="card"><h3>Needs attention</h3>${A.length?`<ul class="alerts">${A.map(a=>`<li class="${a.lvl}"><a href="${a.link}">${esc(a.txt)}</a></li>`).join('')}</ul>`:'<p class="muted">Nothing urgent.</p>'}</section>
   <section class="card"><h3>Partner shares today</h3>${partnerMini(C)}<div class="row end"><a class="btn sm" href="#/partners">Open / distribute</a></div></section>
  </div>
  <section class="card"><div class="row between"><h3>Overdue cheques</h3><a href="#/overdue" class="sm">See all & late penalties →</a></div>${overdueTable(C.overdue.slice(0,10))}</section>
  <section class="card"><h3>Due in the next 30 days</h3>${overdueTable(C.soon,true)}</section>`;
};
function partnerMini(C){return `<table class="tbl"><thead><tr><th>Partner</th><th class="num">Share</th><th class="num">Due now</th></tr></thead><tbody>${C.partners.map(x=>`<tr><td>${esc(x.p.short)}</td><td class="num">${(x.share*100).toFixed(2)}%</td><td class="num b">${money(x.owed)}</td></tr>`).join('')}<tr class="tot"><td>Total</td><td class="num">100%</td><td class="num">${money(C.owedTotal)}</td></tr></tbody></table>`}
function overdueTable(L,soon){
  if(!L.length)return '<p class="muted">None.</p>';
  return `<div class="scroll"><table class="tbl"><thead><tr><th>Flat</th><th>Tenant</th><th>Cheque</th><th>Due</th><th>${soon?'In':'Late'}</th><th class="num">Balance</th><th></th></tr></thead><tbody>${L.map(i=>`<tr><td>${esc(bshort(i.t.building))} ${esc(i.t.units.join('+')||'?')}</td><td><a href="#/tenant/${i.tid}">${esc(i.t.tenant)}</a></td><td>#${i.no}${i.cheque?.no?' <span class="muted">('+esc(i.cheque.no)+')</span>':''}</td><td>${fd(i.due)}</td><td>${soon?daysBetween(TODAY,i.due)+' d':'<span class="bad">'+i.openLate+' d</span>'}</td><td class="num">${money(i.bal)}</td><td class="num"><button class="btn sm" data-act="payInst" data-t="${i.tid}" data-n="${i.no}">Receive</button></td></tr>`).join('')}</tbody></table></div>`;
}
actions.payInst=d=>openPay({tenancyId:d.t,instNo:+d.n});
actions.addReceipt=()=>openPay({});
PAGES.overdue=()=>{
  const C=CC;const fees=D.lateFees.map(f=>{const t=tenById(f.tenancyId);const col=D.entries.filter(e=>e.cat==='penalty'&&e.status!=='pending'&&e.tenancyId===f.tenancyId&&e.instNo==f.no).reduce((s,e)=>s+e.amount,0);return {f,t,col}}).filter(x=>x.t);
  const recv=fees.filter(x=>x.f.charged-x.col>0.5);
  return `<div class="ph"><h2>Overdue & late penalties</h2></div>
  <section class="card"><h3>Overdue cheques (${C.overdue.length})</h3>${overdueTable(C.overdue)}</section>
  <section class="card"><h3>Paid late – penalty not decided yet (${C.lateNoDecision.length})</h3><p class="muted">Standard penalty ${aed(D.settings.penalty)} – choose charge, discount or waive. (Only checked for payments from ${fd(D.settings.penaltyFrom)}; change in Settings.)</p>
   ${C.lateNoDecision.length?`<table class="tbl"><thead><tr><th>Flat</th><th>Tenant</th><th>Cheque</th><th>Due</th><th>Paid</th><th>Days late</th><th></th></tr></thead><tbody>${C.lateNoDecision.map(i=>`<tr><td>${esc(i.t.units.join('+'))}</td><td>${esc(i.t.tenant)}</td><td>#${i.no}</td><td>${fd(i.due)}</td><td>${fd(i.paidOn)}</td><td>${i.lateDays}</td><td class="num"><button class="btn sm" data-act="feeDecide" data-t="${i.tid}" data-n="${i.no}">Decide</button></td></tr>`).join('')}</tbody></table>`:'<p class="muted">None.</p>'}</section>
  <section class="card"><h3>Penalties charged but not yet received (${recv.length})</h3>${recv.length?`<table class="tbl"><thead><tr><th>Flat</th><th>Tenant</th><th>Cheque</th><th class="num">Charged</th><th class="num">Received</th><th></th></tr></thead><tbody>${recv.map(x=>`<tr><td>${esc(x.t.units.join('+'))}</td><td>${esc(x.t.tenant)}</td><td>#${x.f.no}</td><td class="num">${money(x.f.charged)}</td><td class="num">${money(x.col)}</td><td class="num"><button class="btn sm" data-act="penReceive" data-t="${x.f.tenancyId}" data-n="${x.f.no}">Receive</button></td></tr>`).join('')}</tbody></table>`:'<p class="muted">None.</p>'}</section>
  <section class="card"><h3>Penalty decisions history</h3>${fees.length?`<table class="tbl"><thead><tr><th>Date</th><th>Flat</th><th>Tenant</th><th>Cheque</th><th class="num">Assessed</th><th class="num">Charged</th><th>Note</th></tr></thead><tbody>${fees.slice().reverse().map(x=>`<tr><td>${fdt(x.f.date)}</td><td>${esc(x.t.units.join('+'))}</td><td>${esc(x.t.tenant)}</td><td>#${x.f.no}</td><td class="num">${money(x.f.assessed)}</td><td class="num">${x.f.charged?money(x.f.charged):'<span class="muted">waived</span>'}</td><td>${esc(x.f.note||'')}</td></tr>`).join('')}</tbody></table>`:'<p class="muted">No decisions recorded yet.</p>'}</section>`;
};
actions.feeDecide=d=>{
  const t=tenById(d.t);modal({title:`Late penalty – ${esc(t.tenant)} cheque #${d.n}`,small:1,body:`<form data-form="fee"><input type="hidden" name="t" value="${d.t}"><input type="hidden" name="n" value="${d.n}">
  <label>Penalty to charge<select name="sel" required><option value="">— choose —</option><option value="${D.settings.penalty}">Standard ${money(D.settings.penalty,0)}</option><option value="2000">2,000 (discounted)</option><option value="1000">1,000 (discounted)</option><option value="0">Not charged (waived)</option><option value="custom">Custom…</option></select></label>
  <label>Custom amount<input type="number" step="0.01" name="custom"></label><label>Note<input name="note" placeholder="e.g. regular tenant, first time"></label>
  <div class="row end"><button class="btn primary">Save decision</button></div></form>`});
};
forms.fee=(fd_)=>{const sel=fd_.get('sel'),amt=sel==='custom'?+fd_.get('custom'):+sel;const t=fd_.get('t'),n=+fd_.get('n');
  D.lateFees=D.lateFees.filter(f=>!(f.tenancyId===t&&f.no==n));D.lateFees.push({id:uid('f'),tenancyId:t,no:n,assessed:D.settings.penalty,charged:amt,date:TODAY,note:fd_.get('note')||''});closeModal();save();toast('Saved');};
actions.penReceive=d=>{const f=D.lateFees.find(f=>f.tenancyId===d.t&&f.no==d.n);openPay({tenancyId:d.t,penaltyOnly:f.charged,instNo:+d.n})};

/* ---------- tenants list ---------- */
const tenStatusChip=t=>{if(t.status!=='active')return chip('Ended','');const d=daysBetween(TODAY,t.end);return d<0?chip('Expired','red'):d<=60?chip(`Ends in ${d}d`,'amber'):chip('Active','green')};
PAGES.tenants=()=>`<div class="ph"><h2>Tenants</h2><div class="row"><button class="btn primary" data-act="newTenant">+ New tenant & cheques</button><label class="btn">📄 Read Ejari…<input type="file" accept="application/pdf,image/*" hidden data-act-change="ejari"></label></div></div>
  <div class="filters"><select data-f="tenants.b">${bOpts(F.tenants.b,'All buildings')}</select><select data-f="tenants.st">${opt([['active','Active'],['ended','Ended'],['all','All']],F.tenants.st)}</select><input data-f="tenants.q" value="${esc(F.tenants.q)}" placeholder="Search name, flat, EID, Ejari no…"></div>
  <div id="tbl"></div><div id="vac"></div>`;
window._draw.tenants=()=>{
  const f=F.tenants,q=f.q.toLowerCase();
  const L=D.tenancies.filter(t=>(!f.b||t.building===f.b)&&(f.st==='all'||t.status===f.st||(f.st==='active'&&t.status==='active'))&&(!q||(t.tenant+' '+t.units.join(' ')+' '+(t.eid||'')+' '+(t.ejari?.contractNo||'')+' '+(t.mobile||'')).toLowerCase().includes(q)))
   .sort((a,b)=>(a.building||'z')<(b.building||'z')?-1:(a.building||'z')>(b.building||'z')?1:(a.units[0]||'').localeCompare(b.units[0]||'',undefined,{numeric:true}));
  $('#tbl').innerHTML=`<div class="scroll"><table class="tbl"><thead><tr><th>Bldg</th><th>Flat</th><th>Tenant</th><th>Contract</th><th class="num">Annual rent</th><th>Cheques</th><th class="num">Outstanding</th><th>Deposit</th><th>Next due</th></tr></thead><tbody>${L.map(t=>{const x=CC.ten[t.id];const done=x.insts.filter(i=>i.done).length;const dep=x.depDue==null?'<span class="muted">n/a</span>':x.depShort>0?`<span class="bad">${money(x.depPaid,0)} / ${money(x.depDue,0)}</span>`:`<span class="ok">${money(x.depHeld,0)} held</span>`;
    return `<tr class="click" onclick="location.hash='#/tenant/${t.id}'"><td>${esc(bshort(t.building))}</td><td><b>${esc(t.units.join('+')||'?')}</b></td><td>${esc(t.tenant)} ${t.ejari?'<span title="Ejari on file">📄</span>':''}</td><td>${fdt(t.start)} → ${fdt(t.end)} ${tenStatusChip(t)}</td><td class="num">${money(t.annual,0)}</td><td>${done}/${x.insts.length} paid</td><td class="num ${x.outstanding>0&&x.next?.openLate?'bad':''}">${money(x.outstanding,0)}</td><td>${dep}</td><td>${x.next?fdt(x.next.due)+' · '+money(x.next.bal,0):'—'}</td></tr>`}).join('')||'<tr><td colspan="9" class="muted">No tenants match.</td></tr>'}</tbody></table></div>`;
  const occ=new Set();D.tenancies.filter(t=>t.status==='active').forEach(t=>t.units.forEach(u=>occ.add(t.building+':'+u)));
  const vac=D.units.filter(u=>!occ.has(u.id)&&(!f.b||u.building===f.b));
  $('#vac').innerHTML=f.st==='ended'?'':`<section class="card"><h3>Vacant units (${vac.length})</h3><div class="chips">${vac.map(u=>`<button class="chip btnchip" data-act="newTenant" data-u="${esc(u.id)}">${esc(bshort(u.building))} ${esc(u.no)} <span class="muted">${esc(u.type)}</span></button>`).join('')||'<span class="muted">None – fully let.</span>'}</div></section>`;
};
document.addEventListener('change',e=>{const t=e.target;if(t.dataset.actChange==='ejari'&&t.files[0]){readEjari(t.files[0]);t.value=''}if(t.dataset.actChange==='ingest'&&t.files.length){ingestFiles([...t.files]);t.value=''}});

/* ---------- tenant detail ---------- */
PAGES.tenant=id=>{
  const t=tenById(id);if(!t)return '<p>Tenant not found. <a href="#/tenants">Back</a></p>';
  const x=CC.ten[id],e=t.ejari;
  const kv=(k,v)=>v?`<div><span>${k}</span><b>${esc(v)}</b></div>`:'';
  const ents=D.entries.filter(en=>en.tenancyId===id).sort((a,b)=>a.date<b.date?1:-1);
  return `<div class="ph"><div><a href="#/tenants" class="sm">← Tenants</a><h2>${esc(t.units.join('+')||'(flat to assign)')} · ${esc(t.tenant)} ${tenStatusChip(t)}</h2><div class="muted">${esc(bname(t.building))} · ${esc(t.type||'')} · Contract ${fd(t.start)} → ${fd(t.end)}</div></div>
   <div class="row"><button class="btn primary" data-act="payInst" data-t="${id}">Receive payment</button><button class="btn" data-act="editTenant" data-id="${id}">Edit / cheques</button><label class="btn">📄 Ejari<input type="file" accept="application/pdf,image/*" hidden data-act-change="ejari"></label><button class="btn" data-act="renewTenant" data-id="${id}">Renew</button>${t.status==='active'?`<button class="btn danger" data-act="openMoveOut" data-id="${id}">Move out…</button>`:`<button class="btn" data-act="editMoveOut" data-id="${id}">Move-out details</button><button class="btn" data-act="reopenTenant" data-id="${id}">Re-open</button>`}</div></div>
  ${t.needsUnit?`<div class="note red">Flat not assigned yet – press <b>Edit / cheques</b> and choose the building & flat.</div>`:''}
  ${t.notes?`<div class="note">${esc(t.notes)}</div>`:''}
  <div class="kpis"><div class="kpi"><div class="kl">Annual rent</div><div class="kv">${aed(t.annual)}</div><div class="ks">${x.insts.length} cheque(s)</div></div><div class="kpi"><div class="kl">Paid so far</div><div class="kv">${aed(x.paid)}</div></div><div class="kpi ${x.outstanding>0&&x.next?.openLate?'warn':''}"><div class="kl">Outstanding</div><div class="kv">${aed(x.outstanding)}</div></div>
   <div class="kpi"><div class="kl">Security deposit</div><div class="kv">${x.depDue==null?'—':aed(x.depDue)}</div><div class="ks">Received ${money(x.depPaid)} · held ${money(x.depHeld)}${x.depShort?` · <span class="bad">short ${money(x.depShort)}</span>`:''}</div></div></div>
  <section class="card"><h3>Cheque schedule</h3><div class="scroll"><table class="tbl"><thead><tr><th>#</th><th>Cheque no.</th><th>Bank</th><th>Due date</th><th class="num">Rent</th><th class="num">Cheque amt</th><th class="num">Paid</th><th class="num">Balance</th><th>Status</th><th>Cheque</th><th>Penalty</th><th></th></tr></thead><tbody>
  ${x.insts.map(i=>{const [sl,sc]=ST_CHIP[i.status];const cs=i.cheque?CHQ_ST[i.cheque.status||'held']:null;
   const pen=i.fee?(i.fee.charged?`${money(i.fee.charged,0)} charged`:'waived'):i.needsFee?'<span class="bad">decide</span>':i.openLate?`<span class="muted">${i.openLate}d late</span>`:i.lateDays?`<span class="muted">${i.lateDays}d late</span>`:'';
   return `<tr><td>${i.no}</td><td>${esc(i.cheque?.no||'')}</td><td>${esc(i.cheque?.bank||'')}</td><td>${fd(i.due)}</td><td class="num">${money(i.amount)}</td><td class="num">${money(chqFace(i))}${i.deposit?`<div class="muted xs">incl. ${money(i.deposit,0)} deposit</div>`:''}</td><td class="num">${money(i.paid)}</td><td class="num">${money(i.bal)}</td><td>${chip(sl,sc)}${i.settled?`<div class="muted xs">${esc(i.settledNote||'')}</div>`:''}</td><td>${cs?chip(cs[0],cs[1]):''}</td><td>${pen}</td>
   <td class="num nowrap">${i.done?'':`<button class="btn sm" data-act="payInst" data-t="${id}" data-n="${i.no}">Receive</button> `}<button class="btn sm" data-act="chqEdit" data-t="${id}" data-n="${i.no}">Cheque</button></td></tr>`}).join('')}</tbody></table></div></section>
  <div class="grid2"><section class="card"><h3>Tenant & Ejari details</h3><div class="kvs">${kv('Mobile',t.mobile)}${kv('Emirates ID',t.eid)}${kv('Passport',t.passport?t.passport+(t.passportExpiry?' (exp '+fd(t.passportExpiry)+')':''):'')}${kv('Visa',t.visaNo?t.visaNo+(t.visaExpiry?' (exp '+fd(t.visaExpiry)+')':''):'')}${kv('Nationality',t.nationality)}${kv('Payer names (for matching receipts)',(t.aliases||[]).join(', '))}
   ${e?`${kv('Ejari contract no.',e.contractNo)}${kv('Registered',e.regDate?fd(e.regDate):'')}${kv('Ejari amount',e.amount?aed(e.amount):'')}${kv('Ejari deposit',e.deposit!=null?aed(e.deposit):'')}${kv('Tenant no.',e.tenantNo)}${kv('Property',[e.propertyNo,e.propType,e.subType,e.usage,e.size&&e.size+' sq.m'].filter(Boolean).join(' · '))}${kv('Building (Ejari)',e.buildingName)}${kv('Plot / DM / Makani',[e.plot,e.dm,e.makani].filter(Boolean).join(' / '))}${kv('DEWA premises no.',e.premises)}`:'<p class="muted">No Ejari uploaded yet – use the 📄 Ejari button.</p>'}</div></section>
   <section class="card"><h3>Documents</h3>${(t.files||[]).length?`<ul class="files">${t.files.map((f,k)=>`<li><a href="#" data-act="openFile" data-p="${esc(f.path)}" data-n="${esc(f.name)}">📎 ${esc(f.label||'File')} – ${esc(f.name)}</a> <span class="muted xs">${fdt(f.added)}</span> <button class="x sm" data-act="delTenFile" data-id="${id}" data-k="${k}" title="Remove">×</button></li>`).join('')}</ul>`:'<p class="muted">No documents.</p>'}
   <label class="btn sm">+ Attach file (Ejari, cheque photo, ID…)<input type="file" hidden data-act-change="" onchange="attachTenFile('${id}',this)"></label></section></div>
  <section class="card"><h3>Payments & entries</h3>${ents.length?`<div class="scroll"><table class="tbl"><thead><tr><th>Date</th><th>Type</th><th>Cheque</th><th>Description</th><th>Mode</th><th class="num">Amount</th><th></th></tr></thead><tbody>${ents.map(en=>`<tr><td>${fdt(en.date)}</td><td>${esc(catName(en))}${en.status==='pending'?' '+chip('pending','amber'):''}</td><td>${en.instNo?'#'+en.instNo:''}</td><td>${esc(en.desc||'')}${en.file?` <a href="#" data-act="openFile" data-p="${esc(en.file.path)}" data-n="${esc(en.file.name)}">📎</a>`:''}</td><td>${esc(en.mode||'')}</td><td class="num ${en.kind==='expense'?'bad':''}">${en.kind==='expense'?'-':''}${money(en.amount)}</td><td class="num"><button class="btn sm" data-act="editEntry" data-id="${en.id}">Edit</button></td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">No payments recorded.</p>'}</section>`;
};
actions.openFile=d=>openFile(d.p,d.n);
window.attachTenFile=async(id,inp)=>{const f=inp.files[0];if(!f)return;try{toast('Uploading…');const m=await storeFile(f,/pdf/.test(f.type)?'Document':'Photo');const t=tenById(id);(t.files=t.files||[]).push(m);save();toast('Attached')}catch(e){toast(e.message,'err')}};
actions.delTenFile=d=>confirmBox('Remove this file from the tenant? (The file stays in the cloud repo history.)',()=>{tenById(d.id).files.splice(+d.k,1);save()},'Remove');
actions.endTenant=d=>{const t=tenById(d.id),x=CC.ten[d.id];confirmBox(`End tenancy of <b>${esc(t.tenant)}</b>?${x.depHeld>0?` Security deposit held: <b>${aed(x.depHeld)}</b> – record the refund separately as an expense (category: Security deposit refund) when you pay it back.`:''}`,()=>{t.status='ended';t.endedOn=TODAY;save()},'End tenancy')};

actions.renewTenant=d=>{const t=tenById(d.id);const n=JSON.parse(JSON.stringify(t));delete n.id;delete n.ejari;delete n.files;n.start=addDays(t.end,1);n.end=addMonths(n.start,12);n.installments=[];openTenantForm(n,{renewOf:t.id})};

/* chq status editor */
actions.chqEdit=d=>{const t=tenById(d.t),i=t.installments.find(x=>x.no==d.n),c=i.cheque||{};
  modal({title:`Cheque #${i.no} – ${esc(t.tenant)}`,small:1,body:`<form data-form="chq"><input type="hidden" name="t" value="${d.t}"><input type="hidden" name="n" value="${d.n}">
  <label>Cheque number<input name="no" value="${esc(c.no||'')}"></label><label>Bank<input name="bank" value="${esc(c.bank||'')}"></label><label>Cheque date (due)<input type="date" name="due" value="${i.due}"></label>
  <label>Cheque amount (face)<input type="number" step="0.01" name="face" value="${chqFace(i)}"></label><label>Status<select name="st">${opt(Object.entries(CHQ_ST).map(([k,v])=>[k,v[0]]),c.status||'held')}</select></label>
  <label class="chk"><input type="checkbox" name="settled" ${i.settled?'checked':''}> Mark as settled outside the books (no bank entry)</label><label>Note<input name="note" value="${esc(i.settledNote||'')}"></label>
  <div class="row between"><button type="button" class="btn danger" data-act="chqClear" data-t="${d.t}" data-n="${d.n}">Remove cheque details</button><button class="btn primary">Save</button></div></form>`});};
forms.chq=f=>{const t=tenById(f.get('t')),i=t.installments.find(x=>x.no==f.get('n'));i.due=f.get('due');
  i.cheque={...(i.cheque||{}),no:f.get('no'),bank:f.get('bank'),status:f.get('st'),amountFace:+f.get('face')};if(f.get('settled')){i.settled=true;i.settledNote=f.get('note')}else{delete i.settled;delete i.settledNote}closeModal();save()};
actions.chqClear=d=>{const i=tenById(d.t).installments.find(x=>x.no==d.n);delete i.cheque;closeModal();save()};

/* ---------- tenant form (with cheque schedule) ---------- */
actions.newTenant=d=>{const pre={building:null,units:[],tenant:'',type:'',start:TODAY,end:addMonths(TODAY,12),annual:'',installments:[],aliases:[]};
  if(d&&d.u){const u=D.units.find(x=>x.id===d.u);pre.building=u.building;pre.units=[u.no];pre.type=u.type}openTenantForm(pre,{})};
actions.editTenant=d=>openTenantForm(tenById(d.id),{edit:true});
function schedRow(i,k){const c=i.cheque||{};return `<tr data-k="${k}"><td>${i.no}</td><td><input name="s_no" value="${esc(c.no||'')}" size="8"></td><td><input name="s_bank" value="${esc(c.bank||'')}" size="12"></td><td><input type="date" name="s_due" value="${i.due||''}"></td><td><input type="number" step="0.01" name="s_amt" value="${i.amount??''}" class="w90"></td><td><input type="number" step="0.01" name="s_dep" value="${i.deposit||''}" class="w70" placeholder="0"></td><td>
  <select name="s_st">${opt(Object.entries(CHQ_ST).map(([k,v])=>[k,v[0]]),c.status||'held')}</select></td><td><button type="button" class="x sm" data-act="rmRow">×</button></td></tr>`}
function openTenantForm(t,ctx){
  window._tf={t,ctx,ejariFile:ctx.ejariFile||null};
  const ub=()=>D.units.filter(u=>u.building===t.building);
  const insts=t.installments&&t.installments.length?t.installments:[];
  modal({wide:1,title:ctx.edit?'Edit tenant & cheques':ctx.renewOf?'Renew tenancy':'New tenant & cheques',body:`<form data-form="tenant" id="tform">
   <div class="fg"><label>Building<select name="building" data-act-sel="tfBuilding">${bOpts(t.building,'— unknown —')}</select></label>
   <label class="wide2">Flat(s) <span class="muted xs">(tick more than one if combined)</span><div class="chips" id="tfUnits">${unitChecks(t.building,t.units,t.id)}</div></label>
   <label>Tenant name<input name="tenant" required value="${esc(t.tenant)}"></label><label>Type / size<input name="type" value="${esc(t.type||'')}" placeholder="2BHK, shop…"></label>
   <label>Contract start<input type="date" name="start" required value="${t.start||''}"></label><label>Contract end<input type="date" name="end" required value="${t.end||''}"></label>
   <label>Annual rent (AED)<input type="number" step="0.01" name="annual" required value="${t.annual??''}"></label>
   <label>Security deposit (AED)<div class="row"><input type="number" step="0.01" name="deposit" value="${t.deposit??''}" placeholder="usually ${D.settings.depositPct}%"><button type="button" class="btn sm" data-act="dep5">${D.settings.depositPct}%</button></div></label>
   <label>Mobile<input name="mobile" value="${esc(t.mobile||'')}"></label><label>Emirates ID<input name="eid" value="${esc(t.eid||'')}"></label>
   <label>Passport no.<input name="passport" value="${esc(t.passport||'')}"></label><label>Passport expiry<input type="date" name="passportExpiry" value="${t.passportExpiry||''}"></label>
   <label>Visa no.<input name="visaNo" value="${esc(t.visaNo||'')}"></label><label>Visa expiry<input type="date" name="visaExpiry" value="${t.visaExpiry||''}"></label>
   <label class="wide2">Payer names on bank transfers <span class="muted xs">(comma separated – used to match receipts automatically)</span><input name="aliases" value="${esc((t.aliases||[]).join(', '))}"></label>
   <label class="wide2">Notes<input name="notes" value="${esc(t.notes||'')}"></label></div>
   <div class="box"><b>Cheque schedule</b> <span class="muted">– tenants pay 1, 2, 3, 4, 6 or 12 cheques</span>
    <div class="row wrap gen"><label>No. of cheques<select id="g_n">${opt([1,2,3,4,6,12],insts.length||4)}</select></label><label>First cheque date<input type="date" id="g_first" value="${insts[0]?.due||t.start||''}"></label>
    <label class="chk"><input type="checkbox" id="g_dep" ${insts[0]?.deposit?'checked':''}> Deposit is inside the 1st cheque</label><button type="button" class="btn" data-act="genSched">Generate / reset rows</button><button type="button" class="btn" data-act="addRow">+ Add row</button></div>
    <div class="scroll"><table class="tbl sm" id="sched"><thead><tr><th>#</th><th>Cheque no.</th><th>Bank</th><th>Cheque date</th><th>Rent amt</th><th>Deposit incl.</th><th>Status</th><th></th></tr></thead><tbody>${insts.map(schedRow).join('')}</tbody></table></div>
    <div class="muted xs" id="schedSum"></div></div>
   <div class="row between"><label class="btn sm">📄 Fill from Ejari…<input type="file" accept="application/pdf,image/*" hidden onchange="tfEjari(this)"></label><div class="row"><button type="button" class="btn" data-act="closeModal">Cancel</button><button class="btn primary">Save</button></div></div></form>`});
  schedSum();
}
function unitChecks(b,sel,tid){
  if(!b)return '<span class="muted">Choose a building first.</span>';
  const occ={};D.tenancies.filter(x=>x.status==='active'&&x.id!==tid).forEach(x=>x.units.forEach(u=>{if(x.building===b)occ[u]=x.tenant}));
  return D.units.filter(u=>u.building===b).map(u=>`<label class="chip btnchip ${occ[u.no]?'dim':''}" title="${occ[u.no]?'Occupied by '+esc(occ[u.no]):''}"><input type="checkbox" name="unit" value="${esc(u.no)}" ${sel.includes(u.no)?'checked':''}> ${esc(u.no)}</label>`).join('');
}
document.addEventListener('change',e=>{const t=e.target;
  if(t.dataset.actSel==='tfBuilding'){window._tf.t.building=t.value||null;const cur=$$('#tfUnits input:checked').map(i=>i.value);$('#tfUnits').innerHTML=unitChecks(t.value,cur,window._tf.t.id)}
  if(t.closest&&t.closest('#sched'))schedSum();});
document.addEventListener('input',e=>{if(e.target.closest&&e.target.closest('#sched'))schedSum()});
function schedSum(){const e=$('#schedSum');if(!e)return;const f=$('#tform');const a=$$('[name=s_amt]',f).reduce((s,i)=>s+(+i.value||0),0),d=$$('[name=s_dep]',f).reduce((s,i)=>s+(+i.value||0),0),an=+f.annual.value||0;
  e.innerHTML=`Rent total <b>${money(a)}</b> vs annual ${money(an)} ${Math.abs(a-an)>0.05?'<span class="bad">– does not match</span>':'<span class="ok">✓</span>'} · deposit inside cheques ${money(d)} · cheques total ${money(a+d)}`}
actions.dep5=()=>{const f=$('#tform');f.deposit.value=r2((+f.annual.value||0)*D.settings.depositPct/100)};
actions.rmRow=(d,el)=>{el.closest('tr').remove();renum();schedSum()};
function renum(){$$('#sched tbody tr').forEach((tr,k)=>tr.firstElementChild.textContent=k+1)}
actions.addRow=()=>{const n=$$('#sched tbody tr').length+1;const last=$$('#sched tbody tr:last-child [name=s_due]')[0]?.value;$('#sched tbody').insertAdjacentHTML('beforeend',schedRow({no:n,due:last?addMonths(last,3):'',amount:''},n));schedSum()};
actions.genSched=()=>{
  const f=$('#tform'),n=+$('#g_n').value,first=$('#g_first').value||f.start.value,annual=+f.annual.value||0,step=12/n,dep=$('#g_dep').checked?(+f.deposit.value||0):0;
  if(!annual||!first)return toast('Enter the annual rent and first cheque date first','err');
  const each=r2(annual/n);let rows='';
  for(let k=0;k<n;k++){const amt=k===n-1?r2(annual-each*(n-1)):each;rows+=schedRow({no:k+1,due:addMonths(first,Math.round(step*k)),amount:amt,deposit:k===0?dep:0},k)}
  $('#sched tbody').innerHTML=rows;schedSum();
};
window.tfEjari=async inp=>{const file=inp.files[0];if(!file)return;try{const info=Parse.parseEjari(await docText(file));const f=$('#tform');
  const set=(n,v)=>{if(v!=null&&v!==''&&f[n])f[n].value=v};
  set('tenant',info.tenant);set('start',info.start);set('end',info.end);set('annual',info.annual||info.amount);set('deposit',info.deposit);set('mobile',info.mobile);set('eid',info.eid);set('passport',info.passport);set('passportExpiry',info.passportExpiry);set('visaNo',info.visaNo);set('visaExpiry',info.visaExpiry);
  if(info.building){f.building.value=info.building;window._tf.t.building=info.building;$('#tfUnits').innerHTML=unitChecks(info.building,info.propertyNo?[info.propertyNo]:[],window._tf.t.id)}
  if(info.propertyNo&&info.subType)f.type.value=info.subType;
  window._tf.ejari=info;window._tf.ejariFile=file;toast('Ejari read – check the details, then set the cheques','ok');schedSum()}catch(e){toast('Could not read this file: '+e.message,'err')}};
forms.tenant=async f=>{
  const T=window._tf,old=T.t,form=$('#tform');
  const units=f.getAll('unit');const building=f.get('building')||null;
  if(!building||!units.length){if(!confirm('No building/flat selected – save anyway as "flat to assign"?'))return}
  const rows=$$('#sched tbody tr',form);
  const prev=old.installments||[];
  const insts=rows.map((tr,k)=>{const g=n=>$(`[name=${n}]`,tr).value;const p=prev[k]||{};
    const dep=+g('s_dep')||0,amt=+g('s_amt')||0;const o={no:k+1,due:g('s_due'),amount:amt};if(dep)o.deposit=dep;
    if(p.settled){o.settled=true;o.settledNote=p.settledNote}
    if(p.cancelled){o.cancelled=true;if(p.off)o.off=true}
    const cno=g('s_no').trim(),bank=g('s_bank').trim();
    if(cno||bank||p.cheque){o.cheque={...(p.cheque||{}),no:cno,bank,status:g('s_st'),amountFace:r2(amt+dep)}}
    return o});
  if(!insts.length&&!confirm('No cheques entered – save without a schedule?'))return;
  const t={...old,building,units,tenant:f.get('tenant').trim(),type:f.get('type'),start:f.get('start'),end:f.get('end'),annual:+f.get('annual'),deposit:f.get('deposit')===''?null:+f.get('deposit'),
    mobile:f.get('mobile'),eid:f.get('eid'),passport:f.get('passport'),passportExpiry:f.get('passportExpiry')||undefined,visaNo:f.get('visaNo'),visaExpiry:f.get('visaExpiry')||undefined,
    aliases:f.get('aliases').split(',').map(s=>s.trim()).filter(Boolean),notes:f.get('notes'),installments:insts,nCheques:insts.length};
  if(building&&units.length)delete t.needsUnit;
  const clash=D.tenancies.find(o=>o.id!==old.id&&o.status==='active'&&o.building===building&&o.units.some(u=>units.includes(u)));
  if(clash&&!confirm(`Flat ${clash.units.join('+')} already has an active tenant (${clash.tenant}). Save anyway?`))return;
  if(!t.id){t.id=uid('t_');t.status='active';D.tenancies.push(t)}else{const k=D.tenancies.findIndex(o=>o.id===t.id);D.tenancies[k]=t}
  if(T.ejari){t.ejari={...(t.ejari||{}),...Object.fromEntries(Object.entries(T.ejari).filter(([k,v])=>v!=null&&!['ok','building'].includes(k)))};if(T.ejari.nationality)t.nationality=T.ejari.nationality}
  if(T.ejariFile){try{const m=await storeFile(T.ejariFile,'Ejari');(t.files=t.files||[]).push(m)}catch(e){toast('Saved, but Ejari file upload failed: '+e.message,'err')}}
  if(T.ctx.renewOf){const o=tenById(T.ctx.renewOf);if(o&&confirm('Mark the old tenancy as ended?')){o.status='ended';o.endedOn=TODAY}}
  closeModal();save();toast('Saved','ok');location.hash='#/tenant/'+t.id;
};

/* ---------- Ejari reader ---------- */
async function readEjari(file){
  try{
    toast('Reading Ejari…');const info=Parse.parseEjari(await docText(file));
    if(!info.contractNo&&!info.tenant)return toast('That does not look like an Ejari certificate. For a photo, try a sharper, straight-on picture.','err');
    const match=D.tenancies.find(t=>t.status==='active'&&t.building===info.building&&t.units.includes(info.propertyNo));
    const same=D.tenancies.find(t=>t.ejari?.contractNo===info.contractNo);
    window._ej={info,file,match:same||match};
    const row=(k,v)=>v!=null&&v!==''?`<tr><td class="muted">${k}</td><td><b>${esc(v)}</b></td></tr>`:'';
    modal({wide:1,title:'Ejari read',body:`${file.type!=='application/pdf'?'<div class="note amber">Read from a photo – please double-check the numbers against the Ejari.</div>':''}${info.missing&&info.missing.length?`<div class="note red">Could not read: <b>${info.missing.join(', ')}</b>. Fill these in on the next screen.</div>`:''}<div class="note ok">Contract <b>${esc(info.contractNo)}</b> · ${esc(info.tenant)} · ${esc(info.buildingName||'')} flat <b>${esc(info.propertyNo||'?')}</b></div>
     <div class="grid2"><table class="tbl sm"><tbody>${row('Tenant',info.tenant)}${row('Nationality',info.nationality)}${row('Mobile',info.mobile)}${row('Emirates ID',info.eid)}${row('Passport',info.passport+' (exp '+fd(info.passportExpiry)+')')}${row('Visa',info.visaNo?info.visaNo+' (exp '+fd(info.visaExpiry)+')':'')}${row('Tenant no.',info.tenantNo)}</tbody></table>
     <table class="tbl sm"><tbody>${row('Contract period',fd(info.start)+' → '+fd(info.end))}${row('Annual rent',info.annual?aed(info.annual):'')}${row('Security deposit',info.deposit!=null?aed(info.deposit):'')}${row('Property',[info.propertyNo,info.propType,info.subType,info.usage,info.size&&info.size+' sq.m'].filter(Boolean).join(' · '))}${row('Plot / DM / Makani',[info.plot,info.dm,info.makani].filter(Boolean).join(' / '))}${row('DEWA premises',info.premises)}${row('Registered',fd(info.regDate))}${row('Ejari fees',info.fees&&aed(info.fees))}</tbody></table></div>
     <div class="row end wrap">${window._ej.match?`<button class="btn primary" data-act="ejApply">Update existing: ${esc(tenLabel(window._ej.match))}</button>`:''}<button class="btn ${window._ej.match?'':'primary'}" data-act="ejNew">Create new tenant from this Ejari</button><button class="btn" data-act="closeModal">Cancel</button></div>`});
  }catch(e){toast('Could not read this file: '+e.message,'err')}
}
actions.ejApply=async()=>{const {info,file,match:t}=window._ej;
  Object.assign(t,{start:info.start,end:info.end,annual:info.annual||t.annual,deposit:info.deposit??t.deposit,mobile:info.mobile||t.mobile,eid:info.eid||t.eid,passport:info.passport||t.passport,passportExpiry:info.passportExpiry||t.passportExpiry,visaNo:info.visaNo||t.visaNo,visaExpiry:info.visaExpiry||t.visaExpiry,nationality:info.nationality||t.nationality});
  if(info.tenant&&t.tenant.toLowerCase()!==info.tenant.toLowerCase())t.notes=((t.notes?t.notes+' · ':'')+'Ejari tenant name: '+info.tenant);
  t.ejari={...(t.ejari||{}),...Object.fromEntries(Object.entries(info).filter(([k,v])=>v!=null&&!['ok','building'].includes(k)))};
  try{const m=await storeFile(file,'Ejari');(t.files=t.files||[]).push(m)}catch(e){toast('File upload failed: '+e.message,'err')}
  closeModal();save();toast('Tenant updated from Ejari','ok');location.hash='#/tenant/'+t.id};
actions.ejNew=()=>{const {info,file}=window._ej;closeModal();
  openTenantForm({building:info.building,units:info.propertyNo?[info.propertyNo]:[],tenant:info.tenant,type:info.subType||'',start:info.start,end:info.end,annual:info.annual||info.amount,deposit:info.deposit,mobile:info.mobile,eid:info.eid,passport:info.passport,passportExpiry:info.passportExpiry,visaNo:info.visaNo,visaExpiry:info.visaExpiry,installments:[],aliases:[],ejari:info},{ejariFile:file});
  window._tf.ejari=info;};

/* ---------- receive payment / receipt ---------- */
function openPay(pre){
  const C=CC;window._pay={pre};
  const tenOpts=b=>D.tenancies.filter(t=>(t.status==='active'||t.id===pre.tenancyId||CC.ten[t.id]?.insts.some(i=>!i.done&&!i.cancelled))&&(!b||t.building===b||!t.building)).sort((a,c)=>(a.units[0]||'').localeCompare(c.units[0]||'',undefined,{numeric:true})).map(t=>[t.id,(t.units.join('+')||'?')+' – '+t.tenant+(t.status==='active'?'':' (moved out)')]);
  const t0=pre.tenancyId?tenById(pre.tenancyId):null;const b0=t0?.building||pre.building||'';
  const pe=pre.pendingId?D.entries.find(e=>e.id===pre.pendingId):null;
  modal({wide:1,title:pre.penaltyOnly?'Receive late penalty':pe?'Assign receipt to a flat':'Add receipt / payment',body:`<form data-form="pay">
   ${pe?.hint?`<div class="note">${esc(pe.hint)}</div>`:''}
   <div class="fg"><label>Date received<input type="date" name="date" required value="${pre.date||TODAY}"></label>
   <label>Total amount received (AED)<input type="number" step="0.01" name="amt" required value="${pre.amount??''}"></label>
   <label>Mode<select name="mode">${opt(MODES,pre.mode||'bank transfer')}</select></label>
   <label>Paid by (name on receipt)<input name="payer" value="${esc(pre.payer||'')}"></label>
   <label>Reference no.<input name="ref" value="${esc(pre.ref||'')}"></label>
   <label>Receipt / cheque photo<input type="file" name="file" accept="image/*,application/pdf"></label></div>
   <div id="sugg"></div>
   <div class="fg"><label>Building<select name="b">${bOpts(b0,'— choose —')}</select></label>
   <label class="wide2">Flat / tenant<select name="tid" required>${opt(tenOpts(b0),pre.tenancyId||'','— choose —')}</select></label></div>
   <div class="box" id="alloc"></div>
   <div class="row between"><div id="unalloc" class="b"></div><div class="row"><button type="button" class="btn" data-act="closeModal">Cancel</button><button class="btn primary">Save</button></div></div></form>`});
  const f=$('#modal form');
  f.b.onchange=()=>{f.tid.innerHTML=opt(tenOpts(f.b.value),'','— choose —');payRefresh(true)};
  f.tid.onchange=()=>{const t=tenById(f.tid.value);if(t&&t.building)f.b.value=t.building;payRefresh(true)};
  ['amt','date'].forEach(n=>f[n].oninput=()=>payRefresh(n==='amt'));
  f.addEventListener('input',e=>{if(e.target.closest('#alloc'))payTotals()});
  f.addEventListener('change',e=>{if(e.target.closest('#alloc'))payTotals()});
  if(pre.penaltyOnly!=null)window._pay.penOnly=pre.penaltyOnly;
  f.file.addEventListener('change',async()=>{const fl=f.file.files[0];if(!fl)return;
    try{const info=await readReceiptFile(fl);
      if(info.amount&&!(+f.amt.value))f.amt.value=info.amount;if(info.date)f.date.value=info.date;if(info.ref&&!f.ref.value)f.ref.value=info.ref;
      if(info.from&&!f.payer.value)f.payer.value=info.from;if(info.mode&&MODES.includes(info.mode))f.mode.value=info.mode;
      payRefresh(true);suggest();toast(info.amount?`Read AED ${money(info.amount)}${info.date?' · '+fd(info.date):''} – please check`:'Could not read this one – type the amount','ok')}
    catch(e){toast('Could not read this file: '+e.message,'err')}});
  payRefresh(true);suggest();
}
function suggest(){
  const f=$('#modal form');if(!f)return;const pre=window._pay.pre,amt=+f.amt.value||0,name=(f.payer.value||pre.payer||'').toUpperCase();
  const sc=[];
  CC&&D.tenancies.filter(t=>t.status==='active').forEach(t=>{
    let s=0,why=[];
    if(name&&(t.aliases||[]).some(a=>a&&(name.includes(a.toUpperCase())||a.toUpperCase().includes(name)))){s+=5;why.push('payer name matches')}
    const x=CC.ten[t.id];const nxt=x.insts.find(i=>!i.done);
    if(nxt&&amt){const faces=[nxt.bal,chqFace(nxt),r2(nxt.amount+(x.depShort||0)),r2(nxt.bal+(x.depShort||0))];if(faces.some(v=>Math.abs(v-amt)<=1)){s+=3;why.push('amount matches cheque #'+nxt.no)}}
    if(amt&&D.entries.some(e=>e.tenancyId===t.id&&e.kind==='income'&&e.status!=='pending'&&Math.abs(e.amount-amt)<0.01)){s+=1;why.push('same amount paid before')}
    if(s>=1)sc.push({t,s,why});
  });
  sc.sort((a,b)=>b.s-a.s);
  $('#sugg').innerHTML=sc.length?`<div class="note"><b>Likely:</b> ${sc.slice(0,4).map(x=>`<button type="button" class="chip btnchip" data-act="pickTen" data-id="${x.t.id}">${esc(bshort(x.t.building))} ${esc(x.t.units.join('+'))} ${esc(x.t.tenant)} <span class="muted xs">(${x.why.join(', ')})</span></button>`).join(' ')}</div>`:'';
}
actions.pickTen=d=>{const f=$('#modal form');const t=tenById(d.id);f.b.value=t.building||'';f.tid.innerHTML=opt(D.tenancies.filter(x=>x.status==='active'&&(!t.building||x.building===t.building)).map(x=>[x.id,x.units.join('+')+' – '+x.tenant]),d.id,'— choose —');f.tid.value=d.id;payRefresh(true)};
function payRefresh(reset){
  const f=$('#modal form');if(!f)return;const t=tenById(f.tid.value),amt=+f.amt.value||0,S=D.settings;
  const box=$('#alloc');
  if(!t){box.innerHTML='<span class="muted">Choose the flat / tenant to split the payment between rent, deposit and penalty.</span>';$('#unalloc').textContent='';return}
  const x=CC.ten[t.id],open=x.insts.filter(i=>!i.done);
  const pre=window._pay.pre;
  const sel=reset?(pre.instNo&&x.insts.find(i=>i.no==pre.instNo)?pre.instNo:(open[0]?.no||'')):($('#a_inst')?.value||'');
  const inst=x.insts.find(i=>i.no==sel);
  const instOpts=x.insts.map(i=>[i.no,`#${i.no} · due ${fdt(i.due)} · ${i.done?'paid':'balance '+money(i.bal)}`]);
  if(reset){
    window._pay.def={};let rent=0,dep=0,rest=amt;
    if(window._pay.penOnly!=null){rent=0}
    else if(inst){rent=Math.min(rest,inst.done?0:inst.bal);if(inst.deposit&&Math.abs(amt-chqFace(inst))<=1){rent=inst.amount-inst.paid>0?Math.min(inst.amount,inst.bal):0;dep=Math.min(inst.deposit,x.depShort||inst.deposit)}
      rest=r2(amt-rent-dep);if(!dep&&x.depShort>0&&rest>0)dep=Math.min(rest,x.depShort);}
    if(pre.cat==='deposit'){rent=0;dep=amt}
    window._pay.def={rent:r2(rent),dep:r2(dep)};
  }
  const d=window._pay.def||{};
  const cur=n=>reset?d[n]:(+$('#a_'+n)?.value||0);
  const late=inst&&!inst.done?daysBetween(inst.due,f.date.value||TODAY):0;
  const needPen=window._pay.penOnly==null&&inst&&late>(S.graceDays||0)&&(f.date.value||TODAY)>=S.penaltyFrom&&!(D.lateFees.some(l=>l.tenancyId===t.id&&l.no==inst.no));
  const penSel=$('#a_pensel')?.value||'';
  box.innerHTML=`<div class="fg">
   ${window._pay.penOnly!=null?'':`<label>Rent for cheque<select id="a_inst"><option value="">Auto (oldest unpaid)</option>${opt(instOpts,sel)}</select></label><label>Rent amount<input id="a_rent" type="number" step="0.01" value="${cur('rent')||''}"></label>
   <label>Security deposit received${x.depDue!=null?` <span class="muted xs">(due ${money(x.depShort)})</span>`:''}<input id="a_dep" type="number" step="0.01" value="${cur('dep')||''}"></label>`}
   ${needPen?`<label>Late penalty – cheque is ${late} days late <span class="bad">(choose)</span><select id="a_pensel" name="pensel" required><option value="">— choose —</option><option value="${S.penalty}">Standard ${money(S.penalty,0)}</option><option value="2000">2,000 (discounted)</option><option value="1000">1,000 (discounted)</option><option value="0">Not charged</option><option value="custom">Custom…</option></select></label>
     <label>Penalty amount (if custom)<input id="a_pencustom" type="number" step="0.01"></label><label class="chk"><input type="checkbox" id="a_penin" checked> Penalty is included in this payment</label>`:''}
   ${window._pay.penOnly!=null?`<label>Penalty received<input id="a_pen" type="number" step="0.01" value="${reset?window._pay.penOnly:($('#a_pen')?.value||'')}"></label>`:''}
   <label>Other income<input id="a_oth" type="number" step="0.01" value="${reset?'':($('#a_oth')?.value||'')}"></label><label>Note<input id="a_note" value="${esc($('#a_note')?.value||'')}"></label></div>`;
  if(needPen&&penSel)$('#a_pensel').value=penSel;
  payTotals();
}
function payAlloc(){
  const g=id=>+($(id)?.value)||0,sel=$('#a_pensel')?.value;let pen=0;
  if(sel){pen=sel==='custom'?g('#a_pencustom'):+sel;if(!$('#a_penin')?.checked)pen=0}
  pen+=g('#a_pen');
  return {rent:g('#a_rent'),dep:g('#a_dep'),pen,oth:g('#a_oth')};
}
function payTotals(){const f=$('#modal form');if(!f)return;const a=payAlloc(),tot=+f.amt.value||0,sum=r2(a.rent+a.dep+a.pen+a.oth),left=r2(tot-sum);
  const e=$('#unalloc');if(!e)return;e.innerHTML=Math.abs(left)<0.005?'<span class="ok">✓ fully allocated</span>':left>0?`<span class="bad">Unallocated: ${money(left)}</span>`:`<span class="bad">Over-allocated by ${money(-left)}</span>`}
forms.pay=async f=>{
  const form=$('#modal form'),pre=window._pay.pre,t=tenById(f.get('tid'));const a=payAlloc(),tot=+f.get('amt');
  if(Math.abs(r2(a.rent+a.dep+a.pen+a.oth)-tot)>0.005)return toast('Split the amount fully between rent / deposit / penalty / other first','err');
  let file=null;const fi=form.file.files[0];
  if(fi){try{file=await storeFile(fi,'Receipt')}catch(e){return toast(e.message,'err')}}
  else if(pre.pendingId){file=D.entries.find(e=>e.id===pre.pendingId)?.file||null}
  else if(pre.file)file=pre.file;
  const ref=f.get('ref').trim();
  if(ref&&D.entries.some(e=>e.ref===ref&&e.id!==pre.pendingId)&&!confirm('A ledger entry with reference '+ref+' already exists – this may be a duplicate. Save anyway?'))return;
  const txn=uid('tx'),unit=t.units.join('+'),instSel=$('#a_inst')?.value;
  const base={date:f.get('date'),mode:f.get('mode'),ref,payer:f.get('payer'),status:'posted',building:t.building,tenancyId:t.id,unitLabel:unit,txn};if(file)base.file=file;
  const note=$('#a_note')?.value||'';
  const push1=(cat,amount,extra)=>{if(amount>0.004)D.entries.push({id:uid('e'),kind:'income',cat,amount:r2(amount),desc:note||`${unit} ${({rent:'rent',deposit:'security deposit',penalty:'late penalty',other:'other'})[cat]}${extra?.instNo?' – cheque '+extra.instNo:''}`,...base,...extra})};
  const x=CC.ten[t.id],autoInst=x.insts.find(i=>!i.done)?.no;
  push1('rent',a.rent,instSel?{instNo:+instSel}:{});push1('deposit',a.dep);
  const pensel=$('#a_pensel')?.value;let penNo=instSel?+instSel:autoInst;
  if(window._pay.penOnly!=null){push1('penalty',a.pen,{instNo:pre.instNo})}
  else if(pensel!==undefined&&pensel!==''){const ch=pensel==='custom'?+($('#a_pencustom').value||0):+pensel;
    D.lateFees=D.lateFees.filter(l=>!(l.tenancyId===t.id&&l.no==penNo));D.lateFees.push({id:uid('f'),tenancyId:t.id,no:penNo,assessed:D.settings.penalty,charged:ch,date:f.get('date'),note:ch<D.settings.penalty?(ch?'discounted':'waived'):''});
    if($('#a_penin')?.checked&&ch>0)push1('penalty',ch,{instNo:penNo})}
  push1('other',a.oth);
  if(pre.pendingId)D.entries=D.entries.filter(e=>e.id!==pre.pendingId);
  const C2=calc();C2.ten[t.id].insts.forEach(i=>{if(i.done&&i.cheque&&['held','deposited'].includes(i.cheque.status)){t.installments.find(z=>z.no==i.no).cheque.status='cleared'}});
  closeModal();save();toast('Recorded '+aed(tot),'ok');
};
actions.editEntry=d=>openEntry(d.id);
