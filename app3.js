/* ===== Thani Real Estate - UI part 3: bento dashboard, building map, move-out, partners tiles, mobile bits ===== */
(function(){
const dd=(...a)=>a.join('');
const unitById=id=>D.units.find(u=>u.id===id);
const monthStart=d=>d.slice(0,7)+'-01';
const todayLong=()=>new Date(TODAY+'T12:00:00').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
const STC={occupied:'Occupied',ending:'Ending soon',overdue:'Rent overdue',vacant:'Vacant'};

/* ---------- building map ---------- */
const floorOf=no=>/^SHOP/i.test(no)?[0,'Shops']:/^G/i.test(no)?[1,'Ground']:/^\d/.test(no)?[+no[0]+1,'Floor '+no[0]]:[9,'Other'];
function unitMap(bid,states){
  const L=states.filter(s=>s.u.building===bid);if(!L.length)return '';
  const fl={};L.forEach(s=>{const [k,n]=floorOf(s.u.no);(fl[k]=fl[k]||{n,items:[]}).items.push(s)});
  const rows=Object.keys(fl).map(Number).sort((a,b)=>a-b).map(k=>{const f=fl[k];
    return `<div class="floor"><b>${f.n}</b><div class="units">${f.items.sort((a,b)=>a.u.no.localeCompare(b.u.no,undefined,{numeric:true})).map(s=>{
      const sub=s.t?esc(s.t.tenant):(s.vacantSince?`Vacant ${daysBetween(s.vacantSince,TODAY)}d`:'Vacant');
      const tip=`${s.u.no} · ${STC[s.st]}${s.t?`\n${s.t.tenant}\nEnds ${fd(s.t.end)}`:s.past?`\nLast: ${s.past.tenant}`:''}`;
      return `<button class="unit ${s.st}" data-act="unitTap" data-u="${esc(s.u.id)}" data-tip="${esc(tip)}"><b>${esc(s.u.no)}</b><span>${sub}</span></button>`}).join('')}</div></div>`}).join('');
  const nOcc=L.filter(s=>s.t).length;
  return `<div class="bsec"><h4>${esc(bname(bid))} <span class="muted xs">${nOcc} of ${L.length} let</span></h4><div class="map">${rows}</div></div>`;
}
const mapLegend=()=>`<div class="legend"><span><i style="background:${COL.occ}"></i>Occupied</span><span><i style="background:${COL.end}"></i>Contract ending</span><span><i style="background:${COL.od}"></i>Rent overdue</span><span><i style="background:transparent;border:2px dashed ${COL.vac}"></i>Vacant</span></div>`;
actions.goTenant=d=>{closeModal();location.hash='#/tenant/'+d.id};
actions.unitTap=d=>{
  const s=unitStates().find(x=>x.u.id===d.u);if(!s)return;const u=s.u,t=s.t;
  if(!t){
    modal({small:1,title:`${esc(bshort(u.building))} ${esc(u.no)} · ${esc(u.type||'')}`,body:`${empty('keys','This flat is vacant')}
      ${s.past?`<div class="note"><b>Vacant since ${fd(s.vacantSince)}</b> (${daysBetween(s.vacantSince,TODAY)} days)<br>Last tenant: <a href="#/tenant/${s.past.id}" data-act="goTenant" data-id="${s.past.id}">${esc(s.past.tenant)}</a></div>`:''}
      <button class="btn primary wide" data-act="newTenant" data-u="${esc(u.id)}">Move in a new tenant</button>`});
    return;
  }
  const x=CC.ten[t.id],od=x.insts.filter(i=>i.status==='overdue');
  modal({small:1,title:`${esc(bshort(u.building))} ${esc(u.no)} · ${esc(t.tenant)}`,body:`<div class="kvs"><div><span>Status</span><b>${STC[s.st]}</b></div><div><span>Contract</span><b>${fd(t.start)} → ${fd(t.end)}</b></div><div><span>Annual rent</span><b>${aed(t.annual)}</b></div><div><span>Owing now</span><b class="${od.length?'bad':''}">${aed(od.reduce((q,i)=>q+i.bal,0))}</b></div></div>
   <div style="display:grid;gap:10px;margin-top:16px"><button class="btn primary" data-act="goTenant" data-id="${t.id}">Open tenant</button><button class="btn" data-act="payInst" data-t="${t.id}">Receive payment</button><button class="btn danger" data-act="openMoveOut" data-id="${t.id}">Moved out…</button></div>`});
};

/* ---------- dashboard ---------- */
function monthRent(){
  let due=0,got=0;const ms=TODAY.slice(0,7);
  D.tenancies.filter(t=>t.status==='active').forEach(t=>CC.ten[t.id].insts.forEach(i=>{if(!i.cancelled&&i.due.slice(0,7)===ms){due+=i.amount;got+=Math.min(i.paid,i.amount)}}));
  return {due:r2(due),got:r2(got)};
}
function expBreak(){
  const from=addMonths(TODAY.slice(0,7)+'-01',-11),m={};
  D.entries.filter(e=>e.status!=='pending'&&e.kind==='expense'&&e.date>=from&&e.cat!=='deposit_refund').forEach(e=>{const k=EXP_CATS[e.cat]||e.cat;m[k]=(m[k]||0)+e.amount});
  return Object.entries(m).sort((a,b)=>b[1]-a[1]);
}
PAGES.dashboard=()=>{
  const C=CC,S=D.settings,A=alerts(C),v=S.lastVerified,states=unitStates(C),ser=series12();
  const vc=v?cashAsOf(v.date):null,vok=v&&Math.abs(vc-v.balance)<0.015;
  const odAmt=r2(C.overdue.reduce((s,i)=>s+i.bal,0));
  const stale=C.lastEntry&&daysBetween(C.lastEntry,TODAY)>21;
  const cnt=k=>states.filter(s=>s.st===k).length,let_=states.filter(s=>s.t).length;
  const mr=monthRent(),eb=expBreak(),ebT=eb.reduce((s,x)=>s+x[1],0);
  const top=eb.slice(0,5).map(([l,v])=>({label:l.split(' (')[0].split(' /')[0],v,tip:l+': AED '+money(v,0)}));if(eb.length>5)top.push({label:'Other',v:eb.slice(5).reduce((s,x)=>s+x[1],0)});
  const pb=C.partners.slice().sort((a,b)=>b.owed-a.owed).map(x=>({label:x.p.short,v:x.owed,tip:`${x.p.name}\nShare ${(x.share*100).toFixed(2)}%`}));
  const arrAmt=r2(C.arrears.reduce((s,i)=>s+i.bal,0));
  return `<div class="ph"><div><h2>Hello, Mr Thani</h2><div class="sub">${todayLong()}</div></div><div class="row"><button class="btn primary" data-act="addReceipt">+ Receipt</button><button class="btn" data-act="addExpense">+ Expense</button></div></div>
  ${stale?`<div class="note amber">Latest entry in the books is <b>${fd(C.lastEntry)}</b> – ${daysBetween(C.lastEntry,TODAY)} days ago. Add newer receipts so overdue and shares are accurate.</div>`:''}
  <div class="bento">
   <div class="tile hero s7"><span class="glow"></span><div class="cap">Owed to partners today</div><div class="big-n"><small>AED</small>${cn(C.owedTotal)}</div>
     <div class="cap" style="margin-top:6px">Bank balance ${aed(C.cash)} · reserve ${aed(S.reserve)} kept${v?(vok?' · <b style="color:#9ff0bd">✓ matches bank</b>':' · <b style="color:#ffc2bd">⚠ differs from statement</b>'):''}</div>
     <div style="margin-top:10px">${spark(ser.map(s=>s.cash),'#ff8a5c')}</div>
     <div class="row" style="margin-top:6px"><button class="btn primary" data-act="distribute">Distribute to partners</button><a class="btn ghost-w" href="#/partners">See shares</a></div></div>
   <div class="tile s5"><h3>Rent this month</h3><div class="row" style="gap:18px;flex-wrap:nowrap">${ring(mr.due?mr.got/mr.due:0,mr.due&&mr.got>=mr.due?COL.occ:COL.in,{size:150,sub:'collected'})}<div><div class="mid-n"><small>AED</small>${cn(mr.got)}</div><div class="cap">of ${aed(mr.due)} due in ${MON[+TODAY.slice(5,7)-1]}</div>${odAmt?`<div class="chip red" style="margin-top:8px">${aed(odAmt)} overdue</div>`:'<div class="chip green" style="margin-top:8px">Nothing overdue</div>'}</div></div></div>

   <div class="tile s4"><h3>Flats</h3><div class="donutwrap">${donut([{v:cnt('occupied'),color:COL.occ,label:'Occupied'},{v:cnt('ending'),color:COL.end,label:'Ending soon'},{v:cnt('overdue'),color:COL.od,label:'Rent overdue'},{v:cnt('vacant'),color:COL.vac,label:'Vacant'}],{size:150,center:`${let_}/${states.length}`,sub:'let'})}
     <div class="legend"><span><i style="background:${COL.occ}"></i>${cnt('occupied')} occupied</span><span><i style="background:${COL.end}"></i>${cnt('ending')} ending soon</span><span><i style="background:${COL.od}"></i>${cnt('overdue')} overdue</span><span><i style="background:${COL.vac}"></i>${cnt('vacant')} vacant</span></div></div></div>
   <div class="tile s8"><h3>Money in and out</h3><div class="cap">Last 12 months, excluding the opening balance</div>${bars12(ser)}</div>

   <div class="tile s3 half ${C.overdue.length?'alert':''}"><div class="cap">Overdue cheques</div><div class="mid-n">${C.overdue.length}</div><div class="cap">${aed(odAmt)}</div></div>
   <div class="tile s3 half ${C.pending.length?'warn':''}"><div class="cap">Receipts to assign</div><div class="mid-n">${C.pending.length}</div><div class="cap">${aed(C.pendingAmt)}</div>${C.pending.length?'<a class="btn sm" href="#/receipts">Assign</a>':''}</div>
   <div class="tile s3 half"><div class="cap">Deposits held</div><div class="mid-n"><small>AED</small>${cn(C.depHeld)}</div><div class="cap">${S.holdDeposits?'kept out of shares':'counted in shares'}</div></div>
   <div class="tile s3 half"><div class="cap">Cheques in hand</div><div class="mid-n"><small>AED</small>${cn(C.chqHeld)}</div><div class="cap">${C.chqHeldN} to come</div></div>

   <div class="tile s6"><h3>Needs attention</h3>${A.length?`<ul class="alerts">${A.slice(0,8).map(a=>`<li class="${a.lvl}"><a href="${a.link}">${esc(a.txt)}</a></li>`).join('')}</ul>${A.length>8?`<p class="muted">+ ${A.length-8} more</p>`:''}`:empty('check','All clear')}</div>
   <div class="tile s6"><div class="row between"><h3>Each partner is owed</h3><a class="btn sm" href="#/partners">Details</a></div>${hbars(pb,{color:COL.in})}</div>

   <div class="tile s12"><div class="row between"><h3>Your buildings</h3><a class="btn sm" href="#/tenants">Tenants</a></div><div class="cap">Tap a flat to receive rent, move someone in, or record a move-out.</div><div style="margin-top:14px">${D.buildings.map(b=>unitMap(b.id,states)).join('')}${mapLegend()}</div></div>

   <div class="tile s6"><h3>Where the money went</h3><div class="cap">Last 12 months · ${aed(ebT)}</div>${top.length?hbars(top,{color:COL.out}):empty('inbox','No expenses yet')}</div>
   <div class="tile s6"><div class="row between"><h3>Overdue cheques</h3><a class="btn sm" href="#/overdue">All &amp; penalties</a></div>${overdueTable(C.overdue.slice(0,6))}${arrAmt>0?`<div class="note red" style="margin-top:10px">Ex-tenants still owe <b>${aed(arrAmt)}</b> (${C.arrears.length} cheque(s))</div>`:''}</div>
  </div>`;
};
const _ot=overdueTable;overdueTable=(L,s)=>L.length?_ot(L,s):empty('check',s?'Nothing due in the next 30 days':'Nothing overdue');

/* ---------- tenants: map or list ---------- */
F.tenants.view=F.tenants.view||'map';
const _tenOld=PAGES.tenants,_drawOld=window._draw.tenants;
PAGES.tenants=()=>{
  const f=F.tenants;if(f.view==='list'){return _tenOld().replace('<div class="ph"><h2>Tenants</h2>',`<div class="ph"><div><h2>Tenants</h2><div class="sub">${segHtml()}</div></div>`)}
  const st=unitStates(),vac=st.filter(s=>!s.t).length;
  return `<div class="ph"><div><h2>Tenants</h2><div class="sub">${segHtml()}</div></div><div class="row"><button class="btn primary" data-act="newTenant">+ New tenant</button><label class="btn">📄 Read Ejari<input type="file" accept="application/pdf,image/*" hidden data-act-change="ejari"></label></div></div>
   <div class="bento"><div class="tile s12"><h3>${vac?`${vac} vacant flat${vac>1?'s':''}`:'Every flat is let'}</h3><div class="cap">Tap a flat. Left already? Tap it, then <b>Moved out</b> – you can back-date it.</div><div style="margin-top:14px">${D.buildings.map(b=>unitMap(b.id,st)).join('')}${mapLegend()}</div></div></div>`;
};
const segHtml=()=>`<div class="seg"><button class="${F.tenants.view==='map'?'on':''}" data-act="tenView" data-v="map">Map</button><button class="${F.tenants.view==='list'?'on':''}" data-act="tenView" data-v="list">List</button></div>`;
actions.tenView=d=>{F.tenants.view=d.v;refresh()};
window._draw.tenants=()=>{if(F.tenants.view==='list'&&$('#tbl'))_drawOld()};

/* ---------- partners ---------- */
PAGES.partners=()=>{
  const C=CC,S=D.settings,pays=D.entries.filter(e=>e.kind==='payout'&&e.status!=='pending'&&!e.prior).sort((a,b)=>a.date<b.date?1:-1);
  const diff=r2(C.cash-S.reserve-C.owedTotal),mgr=D.partners.find(p=>p.manager);
  const sh=C.partners.slice().sort((a,b)=>b.share-a.share).map(x=>({label:x.p.short,v:+(x.share*100).toFixed(2),tip:`${x.p.name}\n${x.area.toFixed(2)} m²`}));
  return `<div class="ph"><div><h2>Partners</h2><div class="sub">Who is owed what, live</div></div><div class="row"><button class="btn primary" data-act="distribute">Distribute / pay</button><button class="btn" data-act="copyShares">Copy summary</button></div></div>
  <div class="bento">
   <div class="tile hero s6"><span class="glow"></span><div class="cap">Total due now</div><div class="big-n"><small>AED</small>${cn(C.owedTotal)}</div><div class="cap" style="margin-top:6px">Bank ${aed(C.cash)} − reserve ${aed(S.reserve)}</div></div>
   <div class="tile s3 half"><div class="cap">Pool to split</div><div class="mid-n"><small>AED</small>${cn(C.pool)}</div><div class="cap">income − expenses</div></div>
   <div class="tile s3 half"><div class="cap">Management fee ${S.mgmtPct}%</div><div class="mid-n"><small>AED</small>${cn(C.mg)}</div><div class="cap">to ${esc(mgr?.short||'manager')}</div></div>
   <div class="tile s5"><h3>Ownership share</h3>${hbars(sh,{color:COL.in,fmt:v=>v.toFixed(2)+'%'})}</div>
   <div class="tile s7"><h3>Due now, per partner</h3><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px">
    ${C.partners.map(x=>`<button class="unit" style="background:#f7f2f6;border-color:${x.owed<0?COL.od:COL.in};color:var(--ink);min-height:96px" data-act="pStmt" data-id="${x.p.id}"><b>${esc(x.p.short)}</b><span class="muted">${(x.share*100).toFixed(2)}% · paid ${money(x.paid,0)}</span><b style="font-size:22px;${x.owed<0?'color:var(--red)':''}">AED ${money(x.owed)}</b></button>`).join('')}</div></div>
  </div>
  ${!S.holdDeposits&&C.depHeld>0?`<div class="note amber">The pool includes <b>${aed(C.depHeld)}</b> of tenant security deposits (as in your old sheet). To keep deposits aside until tenants move out, turn it on in <a href="#/settings">Settings</a>.</div>`:''}
  <section class="card"><div class="scroll"><table class="tbl"><thead><tr><th>Partner</th><th class="num">Area m²</th><th class="num">Share</th><th class="num">Entitlement</th><th class="num">Already paid</th><th class="num">Due now</th><th>Bank / IBAN</th></tr></thead><tbody>
  ${C.partners.map(x=>`<tr class="click" data-act="pStmt" data-id="${x.p.id}"><td><b>${esc(x.p.short)}</b><div class="muted xs">${esc(x.p.name)}</div></td><td class="num">${x.area.toFixed(2)}</td><td class="num">${(x.share*100).toFixed(2)}%</td><td class="num">${money(x.entl)}${x.fee?`<div class="muted xs">incl. ${money(x.fee)} fee</div>`:''}</td><td class="num">${money(x.paid)}</td><td class="num big ${x.owed<0?'bad':''}">${money(x.owed)}</td><td class="xs">${esc(x.p.bank||'')}<br>${esc(x.p.iban||'')}</td></tr>`).join('')}
  <tr class="tot"><td>Total</td><td class="num">${C.totArea.toFixed(2)}</td><td class="num">100%</td><td class="num">${money(C.partners.reduce((s,x)=>s+x.entl,0))}</td><td class="num">${money(C.partners.reduce((s,x)=>s+x.paid,0))}</td><td class="num big">${money(C.owedTotal)}</td><td></td></tr></tbody></table></div>
  <p class="muted xs">Check: bank − reserve − total due = ${money(diff)} ${Math.abs(diff)<0.02?'<span class="ok">✓ balanced</span>':'(money in the bank not counted, e.g. pending receipts or unrecorded movements)'} · Receipts waiting to be assigned (${aed(C.pendingAmt)}) are not counted until assigned.</p></section>
  <section class="card"><h3>Payout history</h3>${pays.length?`<table class="tbl"><thead><tr><th>Date</th><th>Partner</th><th>Mode</th><th>Ref</th><th class="num">Amount</th></tr></thead><tbody>${pays.map(e=>`<tr><td>${fdt(e.date)}</td><td>${esc(partnerById(e.partnerId)?.short||'?')}</td><td class="xs">${esc(e.mode||'')}</td><td class="xs">${esc(e.ref||'')}</td><td class="num">${money(e.amount)}</td></tr>`).join('')}</tbody></table>`:empty('inbox','No payouts recorded yet')}</section>`;
};

/* ---------- move-out wizard ---------- */
const REASONS=['Contract ended','Left before contract end','Evicted','Moved to another flat','Other'];
actions.openMoveOut=d=>openMoveOut(d.id);
actions.editMoveOut=d=>openMoveOut(d.id,true);
function openMoveOut(id,edit){
  const t=tenById(id),x=CC.ten[id],mo=t.moveOut||{};
  const date=edit?(mo.date||t.vacatedOn||t.endedOn||TODAY):TODAY;
  const unpaid=edit?[]:x.insts.filter(i=>!i.done&&!i.cancelled);
  const held=x.depHeld;
  window._mo={id,edit,held};
  modal({wide:1,title:edit?`Move-out details – ${esc(t.tenant)}`:`Moved out – ${esc(tenLabel(t))}`,body:`<form data-form="moveout">
   <div class="fg"><label>Date they moved out<input type="date" name="date" required value="${date}"></label>
   <label>Reason<select name="reason">${opt(REASONS,mo.reason||(daysBetween(date,t.end)>30?'Left before contract end':'Contract ended'))}</select></label>
   <label class="wide2">Note<input name="note" value="${esc(mo.note||'')}" placeholder="e.g. keys returned, final DEWA cleared"></label></div>
   ${unpaid.length?`<h4>Cheques not paid yet</h4><p class="muted sm">Remaining cheques the tenant took back are cancelled. Anything they still owe for time they lived there stays as arrears.</p><div id="moinst">${unpaid.map(i=>`<div class="mo-inst"><div><b>#${i.no}</b> · due ${fd(i.due)} · <b>${aed(i.bal)}</b>${i.cheque?.no?` <span class="muted xs">cheque ${esc(i.cheque.no)}</span>`:''}</div>
     <select name="i${i.no}" data-due="${i.due}"><option value="cancel">Cancel – cheque returned</option><option value="keep">Keep as owed (arrears)</option><option value="off">Write off</option></select></div>`).join('')}</div>`:(edit?'':'<p class="muted">No unpaid cheques.</p>')}
   ${held>0.5?`<h4>Security deposit held: ${aed(held)}</h4><div class="fg"><label>Refund to tenant (AED)<input type="number" step="0.01" min="0" name="refund" value="${edit?'':held}"></label><label>Keep for damages / dues (AED)<input type="number" step="0.01" min="0" name="deduct" value="0"></label><label>Refund date<input type="date" name="rdate" value="${date}"></label></div><div id="modep" class="muted sm"></div>`:`<p class="muted">${t.moveOut?.deduction?`Deposit kept for dues: ${aed(t.moveOut.deduction)}`:'No security deposit held.'}</p>`}
   <div class="row between" style="margin-top:14px"><div id="mosum" class="b"></div><div class="row"><button type="button" class="btn" data-act="closeModal">Cancel</button><button class="btn primary">${edit?'Save':'Confirm move-out'}</button></div></div></form>`});
  const f=$('#modal form'),dflt=()=>{$$('#moinst select',f).forEach(s=>{if(!s.dataset.touched)s.value=s.dataset.due<=f.date.value?'keep':'cancel'})};
  $$('#moinst select',f).forEach(s=>s.addEventListener('change',()=>{s.dataset.touched=1;moSum()}));
  f.date.addEventListener('input',()=>{dflt();if(f.rdate)f.rdate.value=f.date.value;moSum()});
  f.addEventListener('input',moSum);dflt();moSum();
}
function moSum(){
  const f=$('#modal form');if(!f)return;const M=window._mo;const t=tenById(M.id),x=CC.ten[M.id];
  const sel=$$('#moinst select',f),cnt=v=>sel.filter(s=>s.value===v).length;
  const owed=r2(sel.filter(s=>s.value==='keep').reduce((q,s)=>q+x.insts.find(i=>i.no==s.name.slice(1)).bal,0));
  const rf=+f.refund?.value||0,dc=+f.deduct?.value||0,left=r2(M.held-rf-dc);
  const bits=[];if(sel.length)bits.push(`${cnt('cancel')} cancelled${cnt('keep')?`, ${aed(owed)} stays owed`:''}${cnt('off')?`, ${cnt('off')} written off`:''}`);
  if(M.held>0.5)bits.push(left<-0.01?'<span class="bad">refund + kept is more than the deposit</span>':left>0.5?`${aed(left)} of deposit still held`:'deposit fully settled');
  $('#mosum').innerHTML=bits.join(' · ');
  const dp=$('#modep');if(dp)dp.textContent=rf>0?`A refund of ${aed(rf)} is recorded as an expense on the refund date.`:'';
}
forms.moveout=f=>{
  const M=window._mo,t=tenById(M.id),x=CC.ten[M.id],date=f.get('date');if(!date)return;
  const rf=r2(+f.get('refund')||0),dc=r2(+f.get('deduct')||0);
  if(rf+dc>M.held+0.01)return toast('Refund + kept amount is more than the deposit held','err');
  const prev=t.moveOut||{};
  if(!M.edit){
    t.installments.forEach(i=>{const v=f.get('i'+i.no);if(!v||v==='keep')return;i.cancelled=true;if(v==='off')i.off=true;if(i.cheque){i.cheque.prevStatus=i.cheque.status||'held';i.cheque.status='returned'}});
    t.status='ended';
  }
  t.vacatedOn=date;t.endedOn=date;
  const mo={...prev,date,reason:f.get('reason'),note:f.get('note')||'',refund:r2((prev.refund||0)+rf),deduction:r2((prev.deduction||0)+dc)};
  mo.cancelled=M.edit?(prev.cancelled||[]):t.installments.filter(i=>i.cancelled&&!i.settled).map(i=>i.no);
  if(rf>0){const e={id:uid('e'),kind:'expense',cat:'deposit_refund',date:f.get('rdate')||date,amount:rf,desc:`Deposit refund – ${t.tenant} (${t.units.join('+')})`,mode:'bank transfer',status:'posted',building:t.building,tenancyId:t.id};D.entries.push(e);(mo.refundIds=mo.refundIds||[]).push(e.id)}
  t.moveOut=mo;
  const heldAfter=r2(M.held-rf-dc);t.depositSettled=heldAfter<=D.settings.tol;
  closeModal();save();celebrate(M.edit?'Updated':`${t.units.join('+')||'Flat'} is now vacant`);
};
actions.reopenTenant=d=>{
  const t=tenById(d.id);
  confirmBox(`Re-open <b>${esc(t.tenant)}</b>? Cancelled cheques come back${t.moveOut?.refund?`. The ${aed(t.moveOut.refund)} refund entry stays in the ledger – delete it there if it was a mistake`:''}.`,()=>{
    t.status='active';const mo=t.moveOut||{};
    t.installments.forEach(i=>{if(i.cancelled&&(mo.cancelled||[]).includes(i.no)){delete i.cancelled;delete i.off;if(i.cheque&&i.cheque.status==='returned'){i.cheque.status=i.cheque.prevStatus||'held';delete i.cheque.prevStatus}}});
    delete t.moveOut;delete t.vacatedOn;delete t.endedOn;delete t.depositSettled;save();toast('Tenant re-opened','ok')},'Re-open');
};
/* banner on an ended tenant's page */
const _tenPage=PAGES.tenant;
PAGES.tenant=id=>{
  let h=_tenPage(id);const t=tenById(id);if(!t||t.status==='active')return h;
  const x=CC.ten[id],mo=t.moveOut||{},ar=x.insts.filter(i=>!i.done&&!i.cancelled),arT=r2(ar.reduce((s,i)=>s+i.bal,0));
  const ban=`<div class="bento"><div class="tile s12" style="background:#f1e8ef"><div class="row between"><div><h3>Moved out ${fd(t.vacatedOn||t.endedOn||t.end)}</h3><div class="cap">${esc(mo.reason||'Tenancy ended')}${mo.note?' · '+esc(mo.note):''}</div></div><div class="row">${ar.length?`<button class="btn primary" data-act="payInst" data-t="${id}">Receive owed rent</button>`:''}${x.depHeld>0.5?`<button class="btn" data-act="editMoveOut" data-id="${id}">Settle deposit</button>`:''}</div></div>
   <div class="row" style="gap:28px;margin-top:10px">${ar.length?`<div><div class="cap">Still owes</div><div class="mid-n bad">${aed(arT)}</div></div>`:''}<div><div class="cap">Deposit held</div><div class="mid-n">${aed(x.depHeld)}</div></div>${mo.refund?`<div><div class="cap">Refunded</div><div class="mid-n">${aed(mo.refund)}</div></div>`:''}${mo.deduction?`<div><div class="cap">Kept for dues</div><div class="mid-n">${aed(mo.deduction)}</div></div>`:''}</div></div></div>`;
  const k=h.indexOf('<div class="kpis">');return k<0?ban+h:h.slice(0,k)+ban+h.slice(k);
};

/* ---------- quick add ---------- */
actions.quickAdd=()=>modal({small:1,title:'Add something',body:`<div class="qa"><button data-act="qaReceipt"><span class="em">💰</span>Receipt</button><button data-act="qaExpense"><span class="em">🧾</span>Expense</button><button data-act="qaTenant"><span class="em">🔑</span>New tenant</button><button data-act="qaMove"><span class="em">📦</span>Moved out</button></div>`});
actions.qaReceipt=()=>{closeModal();openPay({})};actions.qaExpense=()=>{closeModal();actions.addExpense({})};actions.qaTenant=()=>{closeModal();actions.newTenant({})};
actions.qaMove=()=>{
  const L=D.tenancies.filter(t=>t.status==='active').sort((a,b)=>(a.building||'').localeCompare(b.building||'')||(a.units[0]||'').localeCompare(b.units[0]||'',undefined,{numeric:true}));
  modal({small:1,title:'Who moved out?',body:`<div style="display:grid;gap:8px">${L.map(t=>`<button class="btn" style="justify-content:space-between" data-act="openMoveOut" data-id="${t.id}"><b>${esc(bshort(t.building))} ${esc(t.units.join('+')||'?')}</b><span class="muted">${esc(t.tenant)}</span></button>`).join('')}</div>`});
};

/* ---------- hooks ---------- */
const _modal=modal;modal=function(o){_modal(o);mobilize($('#modal'))};
const _oldRefresh=window.afterRender;
window.afterRender=function(r){
  $$('#tabbar a').forEach(a=>a.classList.toggle('on',a.dataset.r===(r==='tenant'?'tenants':r)));
  mobilize($('#main'));countUp($('#main'));
};
new MutationObserver(()=>mobilize($('#main'))).observe(document.addEventListener&&document.body,{childList:true,subtree:true});
document.addEventListener('DOMContentLoaded',()=>{
  const mb=$('#moreBtn');if(mb)mb.onclick=e=>{e.stopPropagation();$('#side').classList.toggle('open')};
});
document.addEventListener('click',e=>{const s=$('#side');if(s&&s.classList.contains('open')&&!e.target.closest('#side')&&!e.target.closest('#moreBtn'))s.classList.remove('open')});
const _pay=forms.pay;forms.pay=async function(...a){await _pay.apply(this,a);if(!$('#modal').innerHTML.trim())celebrate('Payment saved')};
})();
