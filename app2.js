/* ===== Thani Real Estate - UI part 2: cheques, receipts, ledger, partners, costs, settings, login ===== */
const csv=(rows)=>rows.map(r=>r.map(c=>{c=c==null?'':String(c);return /[",\n]/.test(c)?'"'+c.replace(/"/g,'""')+'"':c}).join(',')).join('\n');
function download(name,text,type='text/plain'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click()}

/* ---------- cheque register ---------- */
PAGES.cheques=()=>`<div class="ph"><h2>Cheque register</h2><div class="row"><button class="btn primary" data-act="newTenant">+ Cheques from a new tenant</button><button class="btn" data-act="chqCsv">Export CSV</button></div></div>
 <p class="muted">Every tenant cheque (one row per instalment). To add cheques for an existing tenant open the tenant → <b>Edit / cheques</b>.</p>
 <div class="filters"><select data-f="cheques.when">${opt([['upcoming','Not yet paid'],['overdue','Overdue'],['week','Due in 7 days'],['month','Due in 30 days'],['all','Everything']],F.cheques.when)}</select>
 <select data-f="cheques.b">${bOpts(F.cheques.b,'All buildings')}</select>
 <select data-f="cheques.st">${opt([['held','In hand'],['deposited','Deposited'],['cleared','Cleared'],['bounced','Bounced'],['none','No cheque details']],F.cheques.st,'Any cheque status')}</select>
 <input data-f="cheques.q" value="${esc(F.cheques.q)}" placeholder="Search tenant, flat, cheque no…"></div><div id="tbl"></div>`;
function chequeRows(){
  const f=F.cheques,q=f.q.toLowerCase(),L=[];
  D.tenancies.filter(t=>t.status==='active').forEach(t=>{if(f.b&&t.building!==f.b)return;CC.ten[t.id].insts.forEach(i=>{
    const cs=i.cheque?(i.cheque.status||'held'):'none';
    if(f.st&&cs!==f.st)return;
    const dl=daysBetween(TODAY,i.due);
    if(f.when==='upcoming'&&i.done)return;if(f.when==='overdue'&&!(i.openLate>0))return;if(f.when==='week'&&(i.done||dl>7))return;if(f.when==='month'&&(i.done||dl>30))return;
    if(q&&!(t.tenant+' '+t.units.join(' ')+' '+(i.cheque?.no||'')+' '+(i.cheque?.bank||'')).toLowerCase().includes(q))return;
    L.push(i)})});
  return L.sort((a,b)=>a.due<b.due?-1:a.due>b.due?1:0);
}
window._draw.cheques=()=>{
  const L=chequeRows(),tot=L.reduce((s,i)=>s+chqFace(i),0);
  $('#tbl').innerHTML=`<div class="muted">${L.length} cheque(s) · total ${aed(tot)}</div><div class="scroll"><table class="tbl"><thead><tr><th>Cheque date</th><th>Bldg</th><th>Flat</th><th>Tenant</th><th>#</th><th>Cheque no.</th><th>Bank</th><th class="num">Amount</th><th>Cheque</th><th>Rent status</th><th></th></tr></thead><tbody>${L.map(i=>{const cs=i.cheque?CHQ_ST[i.cheque.status||'held']:null,[sl,sc]=ST_CHIP[i.status];
    return `<tr><td>${fd(i.due)}</td><td>${esc(bshort(i.t.building))}</td><td><b>${esc(i.t.units.join('+')||'?')}</b></td><td><a href="#/tenant/${i.tid}">${esc(i.t.tenant)}</a></td><td>${i.no}</td><td>${esc(i.cheque?.no||'')}</td><td>${esc(i.cheque?.bank||'')}</td><td class="num">${money(chqFace(i))}${i.deposit?`<div class="muted xs">incl. ${money(i.deposit,0)} deposit</div>`:''}</td><td>${cs?chip(cs[0],cs[1]):'<span class="muted">—</span>'}</td><td>${chip(sl,sc)}</td><td class="num nowrap">${i.done?'':`<button class="btn sm" data-act="payInst" data-t="${i.tid}" data-n="${i.no}">Receive</button> `}<button class="btn sm" data-act="chqEdit" data-t="${i.tid}" data-n="${i.no}">Edit</button></td></tr>`}).join('')||'<tr><td colspan="11" class="muted">Nothing here.</td></tr>'}</tbody></table></div>`;
};
actions.chqCsv=()=>download('cheques.csv',csv([['Date','Building','Flat','Tenant','Instalment','Cheque no','Bank','Amount','Cheque status','Rent status'],...chequeRows().map(i=>[i.due,bshort(i.t.building),i.t.units.join('+'),i.t.tenant,i.no,i.cheque?.no||'',i.cheque?.bank||'',chqFace(i),i.cheque?.status||'',i.status])]),'text/csv');

/* ---------- receipts inbox ---------- */
PAGES.receipts=()=>{
  const P=CC.pending,rec=D.entries.filter(e=>e.file&&e.status!=='pending').sort((a,b)=>a.date<b.date?1:-1).slice(0,15);
  return `<div class="ph"><h2>Receipts</h2><div class="row"><button class="btn" data-act="addReceipt">+ Enter manually</button></div></div>
  <section class="card"><h3>Upload receipts</h3><p class="muted">Drop bank-transfer PDFs or photos of receipts / cash-deposit slips. PDFs are read automatically (amount, date, payer, reference). They land below until you pick the building & flat – because the bank receipt doesn't say which flat it is for.</p>
  <label class="drop" id="drop">📥 Click to choose files (or drag & drop here)<input type="file" multiple accept="application/pdf,image/*" hidden data-act-change="ingest"></label></section>
  <section class="card"><h3>Waiting to be assigned (${P.length})</h3>${P.length?`<div class="scroll"><table class="tbl"><thead><tr><th>Date</th><th>Description</th><th>Reference</th><th class="num">Amount</th><th>Hint</th><th></th></tr></thead><tbody>${P.map(e=>`<tr><td>${fdt(e.date)}</td><td>${esc(e.kind==='payout'?'PAYOUT to '+(partnerById(e.partnerId)?.short||'?')+' – ':'')}${esc(e.desc||'')} ${e.file?`<a href="#" data-act="openFile" data-p="${esc(e.file.path)}" data-n="${esc(e.file.name)}">📎</a>`:''}</td><td class="xs">${esc(e.ref||'')}</td><td class="num">${money(e.amount)}</td><td class="xs muted">${esc(e.hint||'')}</td><td class="num nowrap">${e.kind==='payout'?`<button class="btn sm primary" data-act="postPayout" data-id="${e.id}">Record payout</button>`:`<button class="btn sm primary" data-act="assignPending" data-id="${e.id}">Assign flat…</button>`} <button class="btn sm danger" data-act="delEntry" data-id="${e.id}">×</button></td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">Nothing waiting. 🎉</p>'}</section>
  <section class="card"><h3>Recently recorded with attachments</h3>${rec.length?`<table class="tbl"><tbody>${rec.map(e=>`<tr><td>${fdt(e.date)}</td><td>${esc(e.unitLabel||'')} ${esc(catName(e))}</td><td class="num">${money(e.amount)}</td><td><a href="#" data-act="openFile" data-p="${esc(e.file.path)}" data-n="${esc(e.file.name)}">📎 ${esc(e.file.name)}</a></td></tr>`).join('')}</tbody></table>`:'<p class="muted">None yet.</p>'}</section>`;
};
actions.assignPending=d=>{const e=D.entries.find(x=>x.id===d.id);openPay({pendingId:e.id,date:e.date,amount:e.amount||'',ref:e.ref,payer:e.payer||'',mode:e.mode,cat:e.cat,file:e.file})};
actions.delEntry=d=>confirmBox('Delete this entry?',()=>{D.entries=D.entries.filter(e=>e.id!==d.id);closeModal();save()},'Delete');
actions.postPayout=d=>{const e=D.entries.find(x=>x.id===d.id);e.status='posted';delete e.hint;save();toast('Payout recorded','ok')};
async function ingestFiles(files){
  let made=0;
  for(const file of files){
    let info={};
    if(file.type==='application/pdf'){try{info=Parse.parseReceipt(await pdfText(file))}catch(e){toast('Could not read '+file.name+' automatically – fill it in by hand','err')}}
    if(info.ref&&D.entries.some(e=>e.ref===info.ref)){toast(`Skipped ${file.name}: reference ${info.ref} is already recorded`,'');continue}
    let meta;try{meta=await storeFile(file,'Receipt')}catch(e){toast(e.message,'err');continue}
    const e={id:uid('e'),status:'pending',date:info.date||TODAY,amount:info.amount||0,ref:info.ref||'',mode:'bank transfer',file:meta,building:null};
    if(info.direction==='out'){
      const nm=(info.to||'').toLowerCase(),p=D.partners.find(p=>(info.iban&&p.iban===info.iban)||nm.includes(p.short.toLowerCase())||(p.short==='Fatma'&&nm.includes('fatima')));
      if(p){Object.assign(e,{kind:'payout',cat:'payout',partnerId:p.id,desc:'transfer to '+p.short.toLowerCase()+' rashed',hint:'Outgoing transfer receipt – matches partner '+p.short});D.entries.push(e);made++;continue}
    }
    Object.assign(e,{kind:'income',cat:'rent',payer:info.from||'',desc:(info.from?'From '+info.from:file.name)+(info.purpose?' – '+info.purpose:'')});
    if(!info.ok)e.hint='Could not read amount/date from this file – open it and enter the details when you assign it.';
    D.entries.push(e);made++;
  }
  if(made){save();toast(made+' receipt(s) added to the waiting list','ok')}
}

/* ---------- ledger ---------- */
PAGES.ledger=()=>`<div class="ph"><h2>Ledger</h2><div class="row"><button class="btn primary" data-act="addExpense">+ Expense</button><button class="btn" data-act="addReceipt">+ Receipt</button><button class="btn" data-act="ledCsv">Export CSV</button></div></div>
 <div class="filters"><input data-f="ledger.q" value="${esc(F.ledger.q)}" placeholder="Search description, flat, ref…"><select data-f="ledger.kind">${opt([['income','Money in'],['expense','Expenses'],['payout','Partner payouts']],F.ledger.kind,'All types')}</select>
 <select data-f="ledger.cat">${opt([...Object.entries(INC_CATS),...Object.entries(EXP_CATS)].filter((v,i,a)=>a.findIndex(x=>x[0]===v[0])===i),F.ledger.cat,'All categories')}</select><select data-f="ledger.b">${bOpts(F.ledger.b,'All buildings')}</select>
 <input type="date" data-f="ledger.from" value="${F.ledger.from}"><input type="date" data-f="ledger.to" value="${F.ledger.to}"></div><div id="tbl"></div>`;
function ledgerRows(){const f=F.ledger,q=f.q.toLowerCase();
  return D.entries.filter(e=>(!f.kind||e.kind===f.kind)&&(!f.cat||e.cat===f.cat)&&(!f.b||e.building===f.b)&&(!f.from||e.date>=f.from)&&(!f.to||e.date<=f.to)&&(!q||((e.desc||'')+' '+(e.unitLabel||'')+' '+(e.ref||'')+' '+(e.payer||'')+' '+(partnerById(e.partnerId)?.short||'')).toLowerCase().includes(q))).sort((a,b)=>a.date<b.date?1:a.date>b.date?-1:0)}
window._draw.ledger=()=>{
  const L=ledgerRows(),tin=r2(L.filter(e=>e.kind==='income'&&e.status!=='pending').reduce((s,e)=>s+e.amount,0)),tex=r2(L.filter(e=>e.kind==='expense').reduce((s,e)=>s+e.amount,0)),tpo=r2(L.filter(e=>e.kind==='payout').reduce((s,e)=>s+e.amount,0));
  $('#tbl').innerHTML=`<div class="muted">${L.length} entries · in <b>${money(tin)}</b> · expenses <b>${money(tex)}</b> · payouts <b>${money(tpo)}</b></div><div class="scroll"><table class="tbl"><thead><tr><th>Date</th><th>Type</th><th>Bldg</th><th>Flat</th><th>Description</th><th>Mode</th><th>Ref</th><th class="num">In</th><th class="num">Out</th><th></th></tr></thead><tbody>${L.slice(0,400).map(e=>`<tr class="${e.status==='pending'?'pend':''}"><td>${fdt(e.date)}</td><td>${esc(catName(e))}${e.prior?' <span class="muted xs">(prior period)</span>':''}${e.status==='pending'?' '+chip('pending','amber'):''}</td><td>${esc(bshort(e.building))}</td><td>${esc(e.unitLabel||'')}${e.instNo?' #'+e.instNo:''}</td><td>${esc(e.kind==='payout'?(partnerById(e.partnerId)?.short||'')+' – ':'')}${esc(e.desc||'')}${e.file?` <a href="#" data-act="openFile" data-p="${esc(e.file.path)}" data-n="${esc(e.file.name)}">📎</a>`:''}</td><td class="xs">${esc(e.mode||'')}</td><td class="xs">${esc(e.ref||'')}</td><td class="num">${e.kind==='income'?money(e.amount):''}</td><td class="num">${e.kind!=='income'?money(e.amount):''}</td><td class="num"><button class="btn sm" data-act="editEntry" data-id="${e.id}">Edit</button></td></tr>`).join('')}</tbody></table></div>${L.length>400?'<p class="muted">Showing 400 most recent – narrow the filters.</p>':''}`;
};
actions.ledCsv=()=>download('ledger.csv',csv([['Date','Type','Category','Building','Flat','Cheque#','Description','Mode','Ref','In','Out','Status'],...ledgerRows().map(e=>[e.date,e.kind,catName(e),bshort(e.building),e.unitLabel||'',e.instNo||'',e.desc||'',e.mode||'',e.ref||'',e.kind==='income'?e.amount:'',e.kind!=='income'?e.amount:'',e.status])]),'text/csv');
actions.addExpense=(d)=>openEntry(null,{kind:'expense',cat:d&&d.cat||'maintenance'});
function openEntry(id,pre){
  const e=id?D.entries.find(x=>x.id===id):{kind:'expense',cat:'maintenance',date:TODAY,mode:'bank transfer',amount:'',building:'',...pre};
  window._ent={id,e};
  const cats=e.kind==='income'?INC_CATS:e.kind==='expense'?EXP_CATS:{payout:'Partner payout'};
  modal({wide:1,title:id?'Edit entry':'New '+(e.kind==='expense'?'expense':'entry'),body:`<form data-form="entry"><div class="fg">
   <label>Date<input type="date" name="date" required value="${e.date}"></label><label>Type<select name="kind" ${id?'':'disabled'}>${opt([['income','Money in'],['expense','Expense'],['payout','Partner payout']],e.kind)}</select></label>
   <label>Category<select name="cat">${opt(Object.entries(cats),e.cat)}</select></label><label>Amount (AED)<input type="number" step="0.01" name="amount" required value="${e.amount}"></label>
   <label>Building<select name="building">${opt([...D.buildings.map(b=>[b.id,b.name]),['both','Both buildings']],e.building||'','— none —')}</select></label>
   <label>Tenant / flat<select name="tid">${opt(D.tenancies.map(t=>[t.id,(bshort(t.building)+' '+(t.units.join('+')||'?')+' – '+t.tenant)+(t.status==='ended'?' (ended)':'')]),e.tenancyId||'','— none —')}</select></label>
   <label>Cheque # (rent)<input type="number" name="instNo" value="${e.instNo||''}"></label><label>Partner (payouts)<select name="partnerId">${opt(D.partners.map(p=>[p.id,p.short]),e.partnerId||'','—')}</select></label>
   <label class="wide2">Description / payee<input name="desc" value="${esc(e.desc||'')}"></label><label>Mode<select name="mode">${opt(MODES,e.mode||'bank transfer')}</select></label><label>Reference<input name="ref" value="${esc(e.ref||'')}"></label>
   <label>Status<select name="status">${opt([['posted','Posted'],['pending','Pending (not counted)']],e.status||'posted')}</select></label><label>Salary months <span class="muted xs">(YYYY-MM, comma)</span><input name="sal" value="${(e.salaryMonths||[]).join(', ')}"></label>
   <label class="chk"><input type="checkbox" name="prior" ${e.prior?'checked':''}> Prior-period payout (not deducted from today's shares)</label>
   <label>Attach receipt<input type="file" name="file" accept="image/*,application/pdf"></label></div>
   ${e.file?`<div class="muted">Attached: <a href="#" data-act="openFile" data-p="${esc(e.file.path)}" data-n="${esc(e.file.name)}">${esc(e.file.name)}</a></div>`:''}
   <div class="row between">${id?`<button type="button" class="btn danger" data-act="delEntry" data-id="${id}">Delete</button>`:'<span></span>'}<div class="row"><button type="button" class="btn" data-act="closeModal">Cancel</button><button class="btn primary">Save</button></div></div></form>`});
  const f=$('#modal form');f.kind.onchange=()=>{const k=f.kind.value,c=k==='income'?INC_CATS:k==='expense'?EXP_CATS:{payout:'Partner payout'};f.cat.innerHTML=opt(Object.entries(c),Object.keys(c)[0])};
}
forms.entry=async f=>{
  const {id,e:old}=window._ent,form=$('#modal form');const kind=id?f.get('kind'):old.kind;
  const e={...old,kind,date:f.get('date'),cat:f.get('cat'),amount:+f.get('amount'),building:f.get('building')||null,tenancyId:f.get('tid')||undefined,instNo:f.get('instNo')?+f.get('instNo'):undefined,partnerId:f.get('partnerId')||undefined,desc:f.get('desc'),mode:f.get('mode'),ref:f.get('ref').trim(),status:f.get('status'),prior:!!f.get('prior')||undefined};
  const sal=f.get('sal').split(',').map(s=>s.trim()).filter(Boolean);if(sal.length)e.salaryMonths=sal;else delete e.salaryMonths;
  if(e.tenancyId){const t=tenById(e.tenancyId);e.unitLabel=t.units.join('+');if(!e.building)e.building=t.building}
  if(kind==='payout'&&!e.partnerId)return toast('Choose the partner for a payout','err');
  const fi=form.file.files[0];if(fi){try{e.file=await storeFile(fi,'Receipt')}catch(er){return toast(er.message,'err')}}
  if(e.ref&&D.entries.some(x=>x.ref===e.ref&&x.id!==id)&&!confirm('Another entry already has reference '+e.ref+'. Save anyway?'))return;
  Object.keys(e).forEach(k=>e[k]===undefined&&delete e[k]);
  if(id)D.entries[D.entries.findIndex(x=>x.id===id)]=e;else{e.id=uid('e');D.entries.push(e)}
  closeModal();save();toast('Saved','ok');
};

/* ---------- partners ---------- */
PAGES.partners=()=>{
  const C=CC,S=D.settings,pays=D.entries.filter(e=>e.kind==='payout'&&e.status!=='pending'&&!e.prior).sort((a,b)=>a.date<b.date?1:-1);
  const diff=r2(C.cash-S.reserve-C.owedTotal);
  return `<div class="ph"><h2>Partners – who is owed what, today</h2><div class="row"><button class="btn primary" data-act="distribute">Distribute / pay partners…</button><button class="btn" data-act="copyShares">Copy summary</button><button class="btn" onclick="window.print()">Print</button></div></div>
  <div class="kpis"><div class="kpi"><div class="kl">Bank balance (books)</div><div class="kv">${aed(C.cash)}</div></div><div class="kpi"><div class="kl">Distributable pool</div><div class="kv">${aed(C.pool)}</div><div class="ks">all income − all expenses${S.holdDeposits?' (excl. deposits)':''}</div></div>
   <div class="kpi"><div class="kl">Management fee ${S.mgmtPct}%</div><div class="kv">${aed(C.mg)}</div><div class="ks">to ${esc(D.partners.find(p=>p.manager)?.short||'manager')}</div></div><div class="kpi"><div class="kl">Reserve kept</div><div class="kv">${aed(S.reserve)}</div></div></div>
  ${!S.holdDeposits&&C.depHeld>0?`<div class="note amber">The pool currently <b>includes ${aed(C.depHeld)} of tenant security deposits</b> (as in your old sheet). If you'd rather keep deposits aside until tenants move out, switch it on in <a href="#/settings">Settings</a> – shares update immediately.</div>`:''}
  <section class="card"><div class="scroll"><table class="tbl"><thead><tr><th>Partner</th><th class="num">Area m²</th><th class="num">Share</th><th class="num">Entitlement</th><th class="num">Already paid</th><th class="num">DUE NOW</th><th>Bank / IBAN</th></tr></thead><tbody>
  ${C.partners.map(x=>`<tr class="click" data-act="pStmt" data-id="${x.p.id}"><td><b>${esc(x.p.short)}</b><div class="muted xs">${esc(x.p.name)}</div></td><td class="num">${x.area.toFixed(2)}</td><td class="num">${(x.share*100).toFixed(2)}%</td><td class="num">${money(x.entl)}${x.fee?`<div class="muted xs">incl. ${money(x.fee)} mgmt fee</div>`:''}</td><td class="num">${money(x.paid)}</td><td class="num big ${x.owed<0?'bad':''}">${money(x.owed)}</td><td class="xs">${esc(x.p.bank||'')}<br>${esc(x.p.iban||'')}</td></tr>`).join('')}
  <tr class="tot"><td>Total</td><td class="num">${C.totArea.toFixed(2)}</td><td class="num">100%</td><td class="num">${money(C.partners.reduce((s,x)=>s+x.entl,0))}</td><td class="num">${money(C.partners.reduce((s,x)=>s+x.paid,0))}</td><td class="num big">${money(C.owedTotal)}</td><td></td></tr></tbody></table></div>
  <p class="muted xs">Check: bank balance − reserve − total due = ${money(diff)} ${Math.abs(diff)<0.02?'<span class="ok">✓ balanced</span>':'(difference = money in the bank not counted, e.g. entries marked pending, or earlier unrecorded movements)'} · Receipts waiting to be assigned (${aed(C.pendingAmt)}) are <b>not</b> counted until assigned.</p></section>
  <section class="card"><h3>Payout history (this period)</h3>${pays.length?`<table class="tbl"><thead><tr><th>Date</th><th>Partner</th><th>Mode</th><th>Ref</th><th class="num">Amount</th></tr></thead><tbody>${pays.map(e=>`<tr><td>${fdt(e.date)}</td><td>${esc(partnerById(e.partnerId)?.short||'?')}</td><td class="xs">${esc(e.mode||'')}</td><td class="xs">${esc(e.ref||'')}</td><td class="num">${money(e.amount)}</td></tr>`).join('')}</tbody></table>`:'<p class="muted">No payouts yet.</p>'}</section>`;
};
actions.pStmt=d=>{const x=CC.partners.find(y=>y.p.id===d.id),p=x.p,pays=D.entries.filter(e=>e.kind==='payout'&&e.partnerId===p.id).sort((a,b)=>a.date<b.date?-1:1);
  modal({title:esc(p.name),body:`<div class="kvs"><div><span>Share</span><b>${(x.share*100).toFixed(3)}% (${x.area.toFixed(2)} m²)</b></div><div><span>Share of distributable pool</span><b>${aed(x.share_amt)}</b></div>${x.fee?`<div><span>Management fee</span><b>${aed(x.fee)}</b></div>`:''}<div><span>Total entitlement</span><b>${aed(x.entl)}</b></div><div><span>Paid this period</span><b>${aed(x.paid)}</b></div><div><span>Due now</span><b>${aed(x.owed)}</b></div><div><span>Bank</span><b>${esc(p.bank||'')} · ${esc(p.iban||'')}</b></div>${p.note?`<div><span>Note</span><b>${esc(p.note)}</b></div>`:''}</div>
   <h4>All payouts</h4><table class="tbl sm"><tbody>${pays.map(e=>`<tr><td>${fdt(e.date)}</td><td>${e.prior?'prior period':''}</td><td>${esc(e.desc||'')}</td><td class="num">${money(e.amount)}</td></tr>`).join('')||'<tr><td>None</td></tr>'}</tbody></table>`})};
actions.copyShares=()=>{const C=CC;const t=`Partner shares as of ${fd(TODAY)}\nBank balance (books): AED ${money(C.cash)} | Reserve: AED ${money(D.settings.reserve)}\n`+C.partners.map(x=>`${x.p.short}: ${(x.share*100).toFixed(2)}% | due now AED ${money(x.owed)}`).join('\n')+`\nTotal due: AED ${money(C.owedTotal)}`;navigator.clipboard.writeText(t).then(()=>toast('Copied','ok'))};
function distCalc(){
  const f=$('#modal form'),total=+f.total.value||0,rnd=+f.rnd.value||1,rows=CC.partners.map((x,i)=>({x,inc:f['inc'+i].checked,w:Math.max(x.owed,0)}));
  const W=rows.filter(r=>r.inc).reduce((s,r)=>s+r.w,0);
  rows.forEach((r,i)=>{r.amt=r.inc&&W>0?Math.floor(total*r.w/W/rnd)*rnd:0;const el=f['amt'+i];if(document.activeElement!==el)el.value=r.amt||''});
  return rows;
}
actions.distribute=()=>{
  const C=CC,avail=Math.max(0,r2(C.cash-D.settings.reserve));
  modal({wide:1,title:'Distribute to partners',body:`<form data-form="dist"><div class="note">Bank balance <b>${aed(C.cash)}</b> · reserve ${aed(D.settings.reserve)} · total due to partners <b>${aed(C.owedTotal)}</b>. ${C.owedTotal>avail+1?'<span class="bad">Due amounts exceed the cash available – amounts below are capped.</span>':''}</div>
  <div class="fg"><label>Total to pay out now (AED)<input type="number" step="1" name="total" value="${Math.min(Math.max(C.owedTotal,0),avail)}"></label><label>Round each transfer down to<select name="rnd">${opt([[1,'1 AED'],[100,'100 AED'],[500,'500 AED'],[1000,'1,000 AED']],1)}</select></label><label>Date of transfer<input type="date" name="date" value="${TODAY}"></label></div>
  <table class="tbl"><thead><tr><th></th><th>Partner</th><th class="num">Due now</th><th class="num">Transfer</th><th>IBAN</th><th></th></tr></thead><tbody>${C.partners.map((x,i)=>`<tr><td><input type="checkbox" name="inc${i}" checked></td><td><b>${esc(x.p.short)}</b><div class="muted xs">${esc(x.p.bank||'')}</div></td><td class="num">${money(x.owed)}</td><td class="num"><input type="number" step="0.01" name="amt${i}" class="w110"></td><td class="xs">${esc(x.p.iban||'')}</td><td><button type="button" class="btn sm" data-act="copyIban" data-i="${esc(x.p.iban||'')}">Copy IBAN</button></td></tr>`).join('')}</tbody></table>
  <div id="distSum" class="b"></div><textarea id="distMsg" rows="6" readonly></textarea>
  <div class="row between"><button type="button" class="btn" data-act="copyDist">Copy message</button><div class="row"><button type="button" class="btn" data-act="closeModal">Close</button><button class="btn primary">I have made these transfers – record them</button></div></div></form>`});
  const f=$('#modal form');const upd=()=>{distCalc();distMsg()};f.addEventListener('input',e=>{if(e.target.name&&e.target.name.startsWith('amt'))distMsg();else upd()});upd();
};
function distMsg(){
  const f=$('#modal form');const rows=CC.partners.map((x,i)=>({x,i,inc:f['inc'+i].checked,amt:+f['amt'+i].value||0})).filter(r=>r.inc&&r.amt>0),tot=rows.reduce((s,r)=>s+r.amt,0);
  $('#distSum').innerHTML=`Total transfers: ${aed(tot)} · left in account after: ${aed(CC.cash-tot)}${tot>CC.cash?' <span class="bad">– more than the bank balance!</span>':''}`;
  $('#distMsg').value=`Partner transfers – ${fd(f.date.value)}\n`+rows.map(r=>`${r.x.p.short}: AED ${money(r.amt,0)} → ${r.x.p.bank||''} ${r.x.p.iban||''}`).join('\n')+`\nTotal: AED ${money(tot,0)}`;
}
actions.copyIban=d=>navigator.clipboard.writeText(d.i).then(()=>toast('IBAN copied','ok'));
actions.copyDist=()=>navigator.clipboard.writeText($('#distMsg').value).then(()=>toast('Copied','ok'));
forms.dist=f=>{
  const rows=CC.partners.map((x,i)=>({x,inc:f.get('inc'+i),amt:+f.get('amt'+i)||0})).filter(r=>r.inc&&r.amt>0);
  if(!rows.length)return toast('Nothing to record','err');const tot=rows.reduce((s,r)=>s+r.amt,0);
  confirmBox(`Record ${rows.length} payout(s) totalling <b>${aed(tot)}</b> dated ${fd(f.get('date'))}? Only do this once the transfers have been made.`,()=>{
    rows.forEach(r=>D.entries.push({id:uid('e'),kind:'payout',cat:'payout',date:f.get('date'),amount:r.amt,partnerId:r.x.p.id,desc:'transfer to '+r.x.p.short.toLowerCase()+' rashed',mode:'bank transfer',status:'posted',building:null}));save();toast('Payouts recorded','ok');celebrate('Partners paid')},'Record payouts');
};

/* ---------- expenses, staff, contracts ---------- */
PAGES.costs=()=>{
  const C=CC,pm=paidSalaryMonths(),cur=monthKey(TODAY);
  const ex=D.entries.filter(e=>e.kind==='expense'&&e.status!=='pending'),cats={};
  ex.forEach(e=>{const k=catName(e);cats[k]=cats[k]||{baraha:0,muraqabat:0,both:0,none:0};cats[k][e.building||'none']+=e.amount});
  const recent=ex.sort((a,b)=>a.date<b.date?1:-1).slice(0,12);
  return `<div class="ph"><h2>Expenses, staff & contracts</h2><div class="row"><button class="btn primary" data-act="addExpense">+ Expense</button></div></div>
  ${D.staff.map(s=>{const months=[];let m=s.startMonth;while(m<=cur){months.push(m);m=monthKey(addMonths(m+'-01',1))}
   return `<section class="card"><div class="row between"><h3>${esc(s.name)} – ${esc(s.role)} · ${aed(s.salary)} / month</h3><button class="btn sm" data-act="staffEdit" data-id="${s.id}">Edit</button></div>${s.note?`<p class="muted xs">${esc(s.note)}</p>`:''}
   <form data-form="payroll"><input type="hidden" name="sid" value="${s.id}"><div class="chips">${months.map(k=>pm[k]?`<span class="chip green" title="Paid ${fd(pm[k].date)} · ${money(pm[k].amount)}">${monthLabel(k)} ✓</span>`:`<label class="chip amber btnchip"><input type="checkbox" name="m" value="${k}"> ${monthLabel(k)}</label>`).join('')}</div>
   <div class="row wrap" style="margin-top:10px"><label>Date paid<input type="date" name="date" value="${TODAY}"></label><label>Total paid (AED) <span class="muted xs">(blank = salary × months)</span><input type="number" step="0.01" name="amt"></label><label>Note (e.g. + flat maintenance)<input name="note"></label><button class="btn primary">Record salary payment</button></div></form></section>`}).join('')}
  <section class="card"><div class="row between"><h3>Lift & service contracts</h3><button class="btn sm" data-act="contractEdit">+ Add contract</button></div>
  <div class="scroll"><table class="tbl"><thead><tr><th>Contract</th><th>Vendor</th><th>Building</th><th class="num">Amount</th><th>Last paid</th><th>Renewal</th><th>Notes</th><th></th></tr></thead><tbody>${D.contracts.map(c=>{const d=c.renewal?daysBetween(TODAY,c.renewal):null;return `<tr><td>${esc(c.type)}</td><td>${esc(c.vendor)}</td><td>${esc(bshort(c.building))}</td><td class="num">${money(c.amount)}</td><td>${fdt(c.lastPaid)}</td><td>${fdt(c.renewal)} ${d!=null?(d<0?chip('overdue','red'):d<=45?chip(d+' days','amber'):''):''}</td><td class="xs">${esc(c.notes||'')}</td><td class="num nowrap"><button class="btn sm" data-act="contractPay" data-id="${c.id}">Record payment</button> <button class="btn sm" data-act="contractEdit" data-id="${c.id}">Edit</button></td></tr>`}).join('')||'<tr><td colspan="8" class="muted">None</td></tr>'}</tbody></table></div></section>
  <section class="card"><h3>Expenses by category (all time in system)</h3><div class="scroll"><table class="tbl"><thead><tr><th>Category</th><th class="num">Baraha</th><th class="num">Muraqabat</th><th class="num">Both / unassigned</th><th class="num">Total</th></tr></thead><tbody>${Object.entries(cats).sort((a,b)=>(b[1].baraha+b[1].muraqabat+b[1].both+b[1].none)-(a[1].baraha+a[1].muraqabat+a[1].both+a[1].none)).map(([k,v])=>`<tr><td>${esc(k)}</td><td class="num">${money(v.baraha)}</td><td class="num">${money(v.muraqabat)}</td><td class="num">${money(v.both+v.none)}</td><td class="num b">${money(v.baraha+v.muraqabat+v.both+v.none)}</td></tr>`).join('')}</tbody></table></div></section>
  <section class="card"><h3>Latest expenses</h3><table class="tbl"><tbody>${recent.map(e=>`<tr><td>${fdt(e.date)}</td><td>${esc(catName(e))}</td><td>${esc(bshort(e.building))}</td><td>${esc(e.desc||'')}</td><td class="num">${money(e.amount)}</td><td class="num"><button class="btn sm" data-act="editEntry" data-id="${e.id}">Edit</button></td></tr>`).join('')}</tbody></table></section>`;
};
forms.payroll=f=>{const s=D.staff.find(x=>x.id===f.get('sid')),ms=f.getAll('m');if(!ms.length)return toast('Tick the month(s) you are paying','err');
  const amt=f.get('amt')?+f.get('amt'):s.salary*ms.length;D.entries.push({id:uid('e'),kind:'expense',cat:'salary',date:f.get('date'),amount:amt,desc:`${s.name} salary ${ms.map(monthLabel).join(', ')}${f.get('note')?' + '+f.get('note'):''}`,mode:'bank transfer',status:'posted',building:s.building==='both'?'both':s.building,salaryMonths:ms.sort()});save();toast('Salary recorded','ok')};
actions.staffEdit=d=>{const s=D.staff.find(x=>x.id===d.id);modal({small:1,title:'Edit staff',body:`<form data-form="staff"><input type="hidden" name="id" value="${s.id}"><label>Name<input name="name" value="${esc(s.name)}"></label><label>Role<input name="role" value="${esc(s.role)}"></label><label>Monthly salary<input type="number" name="salary" value="${s.salary}"></label><label>Salary counted from (YYYY-MM)<input name="startMonth" value="${s.startMonth}"></label><label>Note<input name="note" value="${esc(s.note||'')}"></label><div class="row end"><button class="btn primary">Save</button></div></form>`})};
forms.staff=f=>{const s=D.staff.find(x=>x.id===f.get('id'));Object.assign(s,{name:f.get('name'),role:f.get('role'),salary:+f.get('salary'),startMonth:f.get('startMonth'),note:f.get('note')});closeModal();save()};
actions.contractEdit=d=>{const c=d&&d.id?D.contracts.find(x=>x.id===d.id):{type:'Lift AMC',vendor:'',building:'',amount:'',lastPaid:'',renewal:'',notes:''};
  modal({title:c.id?'Edit contract':'New contract',body:`<form data-form="contract"><input type="hidden" name="id" value="${c.id||''}"><div class="fg"><label>Type<input name="type" value="${esc(c.type)}"></label><label>Vendor<input name="vendor" value="${esc(c.vendor)}"></label><label>Building<select name="building">${bOpts(c.building,'—')}</select></label><label>Amount per renewal<input type="number" step="0.01" name="amount" value="${c.amount}"></label><label>Last paid<input type="date" name="lastPaid" value="${c.lastPaid||''}"></label><label>Next renewal<input type="date" name="renewal" value="${c.renewal||''}"></label><label class="wide2">Notes (contract no., contact…)<input name="notes" value="${esc(c.notes||'')}"></label></div><div class="row between">${c.id?`<button type="button" class="btn danger" data-act="contractDel" data-id="${c.id}">Delete</button>`:'<span></span>'}<button class="btn primary">Save</button></div></form>`})};
forms.contract=f=>{const o={type:f.get('type'),vendor:f.get('vendor'),building:f.get('building'),amount:+f.get('amount')||0,lastPaid:f.get('lastPaid'),renewal:f.get('renewal'),notes:f.get('notes')};
  if(f.get('id'))Object.assign(D.contracts.find(x=>x.id===f.get('id')),o);else D.contracts.push({id:uid('c'),...o});closeModal();save()};
actions.contractDel=d=>confirmBox('Delete this contract record?',()=>{D.contracts=D.contracts.filter(c=>c.id!==d.id);save()},'Delete');
actions.contractPay=d=>{const c=D.contracts.find(x=>x.id===d.id);modal({small:1,title:`Record payment – ${esc(c.type)}`,body:`<form data-form="cpay"><input type="hidden" name="id" value="${c.id}"><label>Date<input type="date" name="date" value="${TODAY}"></label><label>Amount<input type="number" step="0.01" name="amt" value="${c.amount}"></label><label>Next renewal date<input type="date" name="renewal" value="${addMonths(TODAY,12)}"></label><label>Reference<input name="ref"></label><div class="row end"><button class="btn primary">Save</button></div></form>`})};
forms.cpay=f=>{const c=D.contracts.find(x=>x.id===f.get('id'));D.entries.push({id:uid('e'),kind:'expense',cat:'lift',date:f.get('date'),amount:+f.get('amt'),desc:`${c.vendor} ${c.type} renewal`,building:c.building||null,mode:'bank transfer',ref:f.get('ref'),status:'posted'});c.lastPaid=f.get('date');c.renewal=f.get('renewal');c.amount=+f.get('amt');closeModal();save();toast('Recorded','ok')};

/* ---------- settings ---------- */
PAGES.settings=()=>{const S=D.settings;
  return `<div class="ph"><h2>Settings</h2></div>
  <section class="card"><h3>Money rules</h3><form data-form="settings"><div class="fg">
   <label>Management fee % (paid to manager)<input type="number" step="0.01" name="mgmtPct" value="${S.mgmtPct}"></label><label>Reserve kept in account (AED)<input type="number" step="0.01" name="reserve" value="${S.reserve}"></label>
   <label>Standard late penalty (AED)<input type="number" name="penalty" value="${S.penalty}"></label><label>Grace days before "late"<input type="number" name="graceDays" value="${S.graceDays}"></label>
   <label>Ask about penalties only for payments from<input type="date" name="penaltyFrom" value="${S.penaltyFrom}"></label><label>Default security deposit %<input type="number" step="0.1" name="depositPct" value="${S.depositPct}"></label>
   <label>Rounding tolerance for "paid" (AED)<input type="number" name="tol" value="${S.tol}"></label>
   <label>Opening bank balance (AED)<input type="number" step="0.01" name="openingCash" value="${S.openingCash}"></label><label>…as of<input type="date" name="openingDate" value="${S.openingDate}"></label>
   <label>Last bank-statement date<input type="date" name="vDate" value="${S.lastVerified?.date||''}"></label><label>…statement balance (AED)<input type="number" step="0.01" name="vBal" value="${S.lastVerified?.balance??''}"></label>
   <label class="chk wide2"><input type="checkbox" name="holdDeposits" ${S.holdDeposits?'checked':''}> Keep tenant security deposits out of partner shares (hold until tenants leave)</label></div><div class="row end"><button class="btn primary">Save settings</button></div></form></section>
  <section class="card"><h3>Partners & shares</h3><p class="muted">Share % = (Muraqabat m² + Baraha m²) ÷ total m², exactly as in your sheet.</p><form data-form="partners"><div class="scroll"><table class="tbl sm"><thead><tr><th>Short</th><th>Full name</th><th>Muraqabat m²</th><th>Baraha m²</th><th>Bank</th><th>IBAN</th><th>Manager?</th></tr></thead><tbody>${D.partners.map((p,i)=>`<tr><td><input name="short${i}" value="${esc(p.short)}" size="9"></td><td><input name="name${i}" value="${esc(p.name)}" size="30"></td><td><input type="number" step="0.01" name="aM${i}" value="${p.areaM}" class="w90"></td><td><input type="number" step="0.01" name="aB${i}" value="${p.areaB}" class="w90"></td><td><input name="bank${i}" value="${esc(p.bank||'')}" size="14"></td><td><input name="iban${i}" value="${esc(p.iban||'')}" size="26"></td><td><input type="radio" name="mgr" value="${i}" ${p.manager?'checked':''}></td></tr>`).join('')}</tbody></table></div><div class="row end"><button class="btn primary">Save partners</button></div></form></section>
  <section class="card"><h3>Units</h3>${D.buildings.map(b=>`<div><b>${esc(b.name)}</b>: ${D.units.filter(u=>u.building===b.id).map(u=>`<span class="chip">${esc(u.no)} <span class="muted xs">${esc(u.type)}</span> <button class="x sm" data-act="unitDel" data-id="${esc(u.id)}">×</button></span>`).join(' ')}</div>`).join('')}
   <form data-form="unit" class="row wrap" style="margin-top:10px"><select name="b">${bOpts('')}</select><input name="no" placeholder="Flat no." required size="8"><input name="type" placeholder="2BHK" size="8"><button class="btn sm">Add unit</button></form></section>
  <section class="card"><h3>Data & account</h3><div class="row wrap"><button class="btn" data-act="backup">Download full backup (JSON)</button><label class="btn">Restore from backup…<input type="file" accept=".json" hidden onchange="restoreBackup(this)"></label>${MODE==='cloud'?'<button class="btn" data-act="signout">Sign out</button>':''}</div>
   <p class="muted xs">${MODE==='cloud'?`Cloud: data saved in your private GitHub repo <b>${esc(GHC.owner)}/${esc(GHC.repo)}</b> (every change is a commit = full history/undo). Signed in as ${esc(GHC.email||'')}.`:'<b>Local mode</b> – data lives only in this browser. Deploy with setup.html to get cloud storage + login.'} · Revision ${D.rev}</p></section>`;
};
forms.settings=f=>{const S=D.settings;['mgmtPct','reserve','penalty','graceDays','depositPct','tol','openingCash'].forEach(k=>S[k]=+f.get(k));S.penaltyFrom=f.get('penaltyFrom');S.openingDate=f.get('openingDate');S.holdDeposits=!!f.get('holdDeposits');
  S.lastVerified=f.get('vDate')&&f.get('vBal')!==''?{date:f.get('vDate'),balance:+f.get('vBal')}:null;save();toast('Saved','ok')};
forms.partners=f=>{D.partners.forEach((p,i)=>{p.short=f.get('short'+i);p.name=f.get('name'+i);p.areaM=+f.get('aM'+i);p.areaB=+f.get('aB'+i);p.bank=f.get('bank'+i);p.iban=f.get('iban'+i).replace(/\s+/g,'');p.manager=f.get('mgr')==String(i)||undefined});save();toast('Saved','ok')};
forms.unit=(f,form)=>{const id=f.get('b')+':'+f.get('no').trim();if(D.units.some(u=>u.id===id))return toast('Already exists','err');D.units.push({id,building:f.get('b'),no:f.get('no').trim(),type:f.get('type')});save()};
actions.unitDel=d=>{if(D.tenancies.some(t=>t.units.includes(d.id.split(':')[1])&&t.building===d.id.split(':')[0]&&t.status==='active'))return toast('That unit has an active tenant','err');D.units=D.units.filter(u=>u.id!==d.id);save()};
actions.backup=()=>download(`thani-backup-${TODAY}.json`,JSON.stringify(D,null,1),'application/json');
window.restoreBackup=inp=>{const f=inp.files[0];if(!f)return;f.text().then(t=>{try{const d=JSON.parse(t);if(!d.entries||!d.tenancies)throw 0;confirmBox('Replace ALL current data with this backup?',()=>{D=d;migrate();save();toast('Restored','ok')},'Replace')}catch(e){toast('Not a valid backup file','err')}})};

/* ---------- boot / login ---------- */
function migrate(){D.lateFees=D.lateFees||[];D.contracts=D.contracts||[];D.staff=D.staff||[];D.files=D.files||[];D.units=D.units||[];D.settings.tol??=10}
function showApp(){$('#login').hidden=true;$('#app').hidden=false;$('#whoami').textContent=MODE==='cloud'?(GHC.email||''):'local mode';$('#signout').hidden=MODE!=='cloud';migrate();if(!location.hash)location.hash='#/dashboard';refresh();setSync(MODE==='cloud'?'ok':'local')}
actions.signout=()=>{localStorage.removeItem(LS_CRED);sessionStorage.removeItem(LS_CRED);localStorage.removeItem(LS_DATA);location.reload()};
async function connect(cfg){
  GHC=cfg;MODE='cloud';
  let remote=await ghLoad();
  let cache=null;try{cache=JSON.parse(localStorage.getItem(LS_DATA)||'null')}catch(e){}
  if(!remote){
    $('#login').innerHTML=loginShell(`<h2>Cloud repository is empty</h2><p>No <code>data.json</code> found in <b>${esc(cfg.owner)}/${esc(cfg.repo)}</b>. Load your starter data file (<code>starter-data-PRIVATE.json</code> from the package) or start empty.</p><label class="btn primary">Load starter data file…<input type="file" accept=".json" hidden id="seedfile"></label> <button class="btn" id="emptybtn">Start empty</button>`);
    $('#seedfile').onchange=async e=>{D=JSON.parse(await e.target.files[0].text());showApp();save()};
    $('#emptybtn').onclick=()=>{D=emptyData();showApp();save()};return;
  }
  D=remote;
  if(cache&&cache.dirty&&cache.d&&cache.d.rev>remote.rev){D=cache.d;showApp();push();toast('Recovered unsynced changes from this device','ok');return}
  showApp();
}
const emptyData=()=>({version:1,rev:1,settings:{owner:'',openingCash:0,openingDate:TODAY,mgmtPct:5,reserve:2000,penalty:5000,graceDays:0,penaltyFrom:TODAY,depositPct:5,holdDeposits:false,tol:10,lastVerified:null},buildings:[{id:'baraha',name:'Al Baraha'},{id:'muraqabat',name:'Al Muraqqabat'}],partners:[],units:[],tenancies:[],entries:[],lateFees:[],staff:[],contracts:[],files:[]});
const loginShell=inner=>`<div class="lbox"><div class="logo">🏢 Thani Real Estate</div>${inner}</div>`;
async function boot(){
  if(!window.CFG){
    MODE='local';let c=null;try{c=JSON.parse(localStorage.getItem(LS_DATA)||'null')}catch(e){}
    if(c&&c.d){D=c.d;return showApp()}
    $('#login').innerHTML=loginShell(`<h2>Welcome</h2><p class="muted">Local mode (no cloud configured) – data stays in this browser only.</p><label class="btn primary">Load starter data file…<input type="file" accept=".json" hidden id="seedfile"></label> <button class="btn" id="emptybtn">Start empty</button>`);
    $('#seedfile').onchange=async e=>{D=JSON.parse(await e.target.files[0].text());showApp();save()};$('#emptybtn').onclick=()=>{D=emptyData();showApp();save()};return;
  }
  const saved=localStorage.getItem(LS_CRED)||sessionStorage.getItem(LS_CRED);
  if(saved){try{await connect(JSON.parse(saved));return}catch(e){localStorage.removeItem(LS_CRED);sessionStorage.removeItem(LS_CRED)}}
  $('#login').innerHTML=loginShell(`<form id="lf"><h2>Sign in</h2><label>Email<input type="email" name="email" required autocomplete="username"></label><label>Password<input type="password" name="pw" required autocomplete="current-password"></label><label class="chk"><input type="checkbox" name="rem" checked> Stay signed in on this device</label><button class="btn primary wide">Sign in</button><div id="lerr" class="bad"></div></form>`);
  $('#lf').onsubmit=async ev=>{ev.preventDefault();const f=new FormData(ev.target);$('#lerr').textContent='';const b=ev.target.querySelector('button');b.disabled=true;b.textContent='Checking…';
    try{const cfg=await decryptCfg(f.get('pw'),f.get('email'));cfg.email=f.get('email').trim();(f.get('rem')?localStorage:sessionStorage).setItem(LS_CRED,JSON.stringify(cfg));await connect(cfg)}
    catch(e){$('#lerr').textContent=(e&&e.name==='OperationError')?'Wrong email or password.':('Could not sign in: '+(e.message||e));b.disabled=false;b.textContent='Sign in'}};
}
document.addEventListener('DOMContentLoaded',()=>{
  $('#menu').onclick=()=>$('#side').classList.toggle('open');
  const dz=document.body;['dragover','drop'].forEach(ev=>dz.addEventListener(ev,e=>{if(e.target.closest&&e.target.closest('#drop')){e.preventDefault();if(ev==='drop')ingestFiles([...e.dataTransfer.files])}}));
  boot();
});
