/* ===== UI v2 part 2: Cheque register, Receipts, Ledger ===== */
(function(){
const I=(n,s=16,w=1.9)=>svgi(n,s,w);
const pillOf=(t,c)=>`<span class="pill ${c}">${esc(t)}</span>`;
const infoKey='thani_info';const infoOff=k=>{try{return (localStorage.getItem(infoKey)||'').includes('|'+k+'|')}catch(e){return false}};
actions.infoX=d=>{try{localStorage.setItem(infoKey,(localStorage.getItem(infoKey)||'|')+d.k+'|')}catch(e){}refresh()};
actions.infoT=d=>{F.info=F.info||{};F.info[d.k]=!F.info[d.k];refresh()};
const infoBlock=(k,txt)=>`<button class="btn icon-i" style="display:inline-grid;padding:4px;width:30px;height:30px;place-items:center;border-radius:50%" data-act="infoT" data-k="${k}" aria-label="Help">${I('info',18)}</button>`+((F.info&&F.info[k]&&!infoOff(k))?`<div class="inf-note" style="margin-top:10px"><span>${txt}</span><button class="sx" data-act="infoX" data-k="${k}" aria-label="Hide for good">${I('x',14,2.2)}</button></div>`:'');
const flatBadge=t=>`<span class="fb">${esc(bshort(t.building))} · ${esc(t.units.join('+')||'?')}</span>`;

/* ---------- cheque register ---------- */
F.cheques=Object.assign({b:'',q:'',tab:'open',sel:{}},F.cheques||{});
const TABS=[['all','All'],['open','Not yet paid'],['overdue','Overdue'],['week','Due next 7 days'],['cleared','Cleared'],['bounced','Bounced']];
function allCheques(){const L=[];D.tenancies.filter(t=>t.status==='active').forEach(t=>{if(F.cheques.b&&t.building!==F.cheques.b)return;CC.ten[t.id].insts.forEach(i=>{if(!i.cancelled)L.push(i)})});return L}
const inTab=(i,k)=>{const dl=daysBetween(TODAY,i.due),cs=i.cheque?(i.cheque.status||'held'):'none';
  return k==='all'?true:k==='open'?!i.done:k==='overdue'?i.openLate>0:k==='week'?(!i.done&&dl>=0&&dl<=7):k==='cleared'?cs==='cleared':k==='bounced'?cs==='bounced':true};
window.chequeRows=function(){const q=(F.cheques.q||'').toLowerCase();
  return allCheques().filter(i=>inTab(i,F.cheques.tab)&&(!q||(i.t.tenant+' '+i.t.units.join(' ')+' '+(i.cheque?.no||'')+' '+(i.cheque?.bank||'')+' '+bshort(i.t.building)).toLowerCase().includes(q))).sort((a,b)=>a.due<b.due?-1:a.due>b.due?1:0)};
PAGES.cheques=()=>`<div class="ph"><div><h2>Cheque register ${infoBlock('chq','Every tenant cheque, one row per instalment. To change a tenant\'s cheques, open the tenant and choose <b>Edit / cheques</b>.')}</h2></div><div class="toolbar"><button class="btn primary" data-act="addCheques">${I('plus',16,2.2)} Add cheques</button><button class="btn outline" data-act="chqCsv">Export CSV</button></div></div>
 <div class="fbar"><div class="sbox"><input data-f="cheques.q" value="${esc(F.cheques.q)}" placeholder="Search tenant, flat or cheque number…" id="chqq"><button data-act="clrQ" data-k="cheques" aria-label="Clear" ${F.cheques.q?'':'hidden'}>×</button></div><select data-f="cheques.b">${bOpts(F.cheques.b,'All buildings')}</select></div><div id="tbl"></div>`;
actions.clrQ=d=>{F[d.k].q='';refresh()};
function chqRow(i){
  const cs=i.cheque?CHQ_ST[i.cheque.status||'held']:null,[sl,sc]=ST_CHIP[i.status],od=i.openLate>0&&!i.done;
  const tone={green:'green',red:'red',amber:'amber',blue:'blue','':'gray',dim:'gray'};
  const st=od?pillOf('Overdue · '+i.openLate+'d','red'):pillOf(sl,tone[sc]||'gray');
  const cn=i.cheque?.no,bk=i.cheque?.bank;
  return `<tr><td><input type="checkbox" data-sel="${i.tid}|${i.no}" ${F.cheques.sel[i.tid+'|'+i.no]?'checked':''}></td><td class="nw">${fd(i.due)}</td><td>${flatBadge(i.t)}</td><td><a href="#/tenant/${i.tid}">${esc(i.t.tenant)}</a></td><td>${i.no}</td>
  <td class="two">${cn||bk?`<b>${esc(cn||'—')}</b>${bk?`<span>${esc(bk)}</span>`:''}`:'<span class="muted">—</span>'}</td>
  <td class="num"><span class="muted xs">AED</span> ${money(chqFace(i))}${i.deposit?`<div class="muted xs">incl. ${money(i.deposit,0)} deposit</div>`:''}</td><td>${cs?pillOf(cs[0],{blue:'blue',amber:'amber',green:'green',red:'red'}[cs[1]]||'gray'):'<span class="muted">—</span>'}</td><td>${st}</td>
  <td class="num nw">${i.done?'':`<button class="btn sm" data-act="payInst" data-t="${i.tid}" data-n="${i.no}">Receive</button> `}${od?`<button class="btn sm outline" data-act="penaltyNotice" data-t="${i.tid}" data-n="${i.no}" title="Create a late payment notice PDF">Notice</button> `:''}<button class="btn sm" data-act="chqEdit" data-t="${i.tid}" data-n="${i.no}">Edit</button></td></tr>`}
window._draw.cheques=()=>{
  const base=allCheques(),L=chequeRows(),tot=L.reduce((s,i)=>s+chqFace(i),0),n=Object.values(F.cheques.sel).filter(Boolean).length;
  const x=$('[data-act=clrQ]');if(x)x.hidden=!F.cheques.q;
  $('#tbl').innerHTML=`<div class="tabs" style="margin-bottom:12px">${TABS.map(([k,l])=>`<button class="${F.cheques.tab===k?'on':''}" data-act="chqTab" data-k="${k}">${l}<b>${base.filter(i=>inTab(i,k)).length}</b></button>`).join('')}</div>
  <div class="bulk" ${n?'':'hidden'}><b>${n} selected</b><span class="sp" style="flex:1"></span><button class="btn sm" data-act="bulkChq" data-s="deposited">Mark as deposited</button><button class="btn sm" data-act="bulkChq" data-s="cleared">Mark as cleared</button><button class="btn sm" data-act="bulkClear">Clear</button></div>
  <div class="muted xs" style="margin:0 0 8px">${L.length} cheque${L.length===1?'':'s'} · <span class="tnum">AED ${money(tot,2)}</span></div>
  <div class="tcard"><div class="tscroll"><table><thead><tr><th><input type="checkbox" data-selall ${L.length&&L.every(i=>F.cheques.sel[i.tid+'|'+i.no])?'checked':''}></th><th>Cheque date</th><th>Flat</th><th>Tenant</th><th>#</th><th>Cheque no. / Bank</th><th class="num">Amount</th><th>Cheque</th><th>Rent</th><th></th></tr></thead><tbody>${L.map(chqRow).join('')||'<tr><td colspan="10" class="muted" style="padding:24px;text-align:center">Nothing here.</td></tr>'}</tbody></table></div></div>`;
};
actions.chqTab=d=>{F.cheques.tab=d.k;_draw.cheques()};
document.addEventListener('change',e=>{const t=e.target;if(t.dataset&&t.dataset.sel){F.cheques.sel[t.dataset.sel]=t.checked;_draw.cheques()}
  if(t.dataset&&'selall' in t.dataset){chequeRows().forEach(i=>F.cheques.sel[i.tid+'|'+i.no]=t.checked);_draw.cheques()}});
actions.bulkClear=()=>{F.cheques.sel={};_draw.cheques()};
actions.bulkChq=d=>{const keys=Object.keys(F.cheques.sel).filter(k=>F.cheques.sel[k]);let n=0;
  keys.forEach(k=>{const [tid,no]=k.split('|'),t=tenById(tid),i=t&&t.installments.find(z=>String(z.no)===no);if(!i)return;i.cheque=i.cheque||{};i.cheque.prevStatus=i.cheque.status;i.cheque.status=d.s;n++});
  F.cheques.sel={};save();toast(n+' cheque'+(n===1?'':'s')+' marked '+d.s,'ok')};
actions.addCheques=()=>{
  const act=D.tenancies.filter(t=>t.status==='active');
  modal({small:1,title:'Add cheques',body:`<p class="muted">Pick the tenant these cheques belong to – or add a brand-new tenant.</p><label>Existing tenant<select id="acT">${opt(act.map(t=>[t.id,`${bshort(t.building)} ${t.units.join('+')||'?'} – ${t.tenant}`]),'','— choose tenant —')}</select></label><div class="row end" style="margin-top:14px"><button class="btn" data-act="addChqNew">New tenant instead</button><button class="btn primary" data-act="addChqGo">Continue</button></div>`})};
actions.addChqGo=()=>{const id=$('#acT').value;if(!id)return toast('Choose a tenant first','err');closeModal();actions.editTenant({id})};
actions.addChqNew=()=>{closeModal();actions.newTenant({})};

/* ---------- receipts ---------- */
F.receipts=Object.assign({q:'',b:'',m:''},F.receipts||{});
const rec=()=>{const q=(F.receipts.q||'').toLowerCase();return D.entries.filter(e=>e.file&&e.status!=='pending'&&(!F.receipts.b||e.building===F.receipts.b)&&(!F.receipts.m||e.date.slice(0,7)===F.receipts.m)&&(!q||((e.unitLabel||'')+' '+catName(e)+' '+(e.desc||'')+' '+e.file.name).toLowerCase().includes(q))).sort((a,b)=>a.date<b.date?1:-1)};
function matchFor(e){ // guess tenant by payer name and amount
  const act=D.tenancies.filter(t=>t.status==='active'),pay=(e.payer||'').toLowerCase(),words=pay.split(/\s+/).filter(w=>w.length>2);let best=null,sc=0;
  act.forEach(t=>{let s=0,why=[];const nm=(t.tenant+' '+(t.aliases||[]).join(' ')).toLowerCase();
    if(words.length&&words.filter(w=>nm.includes(w)).length>=Math.min(2,words.length)){s+=3;why.push('payer name')}
    CC.ten[t.id].insts.filter(i=>!i.done&&!i.cancelled).slice(0,2).forEach(i=>{if([i.bal,chqFace(i),i.amount].some(v=>Math.abs(v-e.amount)<=1)){s+=3;why.push('amount = cheque #'+i.no)}});
    if(s>sc){sc=s;best={t,why:[...new Set(why)]}}});
  return sc>=3?best:null}
PAGES.receipts=()=>{
  const P=CC.pending,months=[...new Set(D.entries.filter(e=>e.file).map(e=>e.date.slice(0,7)))].sort().reverse();
  return `<div class="ph"><div><h2>Receipts</h2></div><div class="toolbar"><button class="btn outline" data-act="addReceipt">${I('plus',16,2.2)} Enter manually</button></div></div>
  <label class="dz" id="drop"><span class="up">${I('upload',40,1.5)}</span><div style="font-weight:700;font-size:18px;margin-top:6px">Click to choose files, or drag and drop here</div><div class="muted">Bank transfers, cash-deposit slips and photos are read automatically.</div><div class="fmt"><span class="pill gray">PDF</span><span class="pill gray">JPG</span><span class="pill gray">PNG</span></div><input type="file" multiple accept="application/pdf,image/*" hidden data-act-change="ingest"></label>
  ${P.length?`<div class="tile" style="margin-top:20px"><h3>Waiting to be assigned (${P.length})</h3>${P.map(e=>{const m=e.kind==='income'?matchFor(e):null;return `<div class="tcard" style="margin:10px 0;padding:12px 14px"><div class="row between" style="gap:12px"><div><b>AED ${money(e.amount)}</b> <span class="muted">· ${fd(e.date)}</span><div>${esc(e.kind==='payout'?'PAYOUT to '+(partnerById(e.partnerId)?.short||'?')+' – ':'')}${esc(e.desc||'')} ${e.file?`<a href="#" data-act="openFile" data-p="${esc(e.file.path)}" data-n="${esc(e.file.name)}">${I('file',14)}</a>`:''}</div>${e.hint?`<div class="muted xs">${esc(e.hint)}</div>`:''}</div><div class="row" style="gap:8px">${e.kind==='payout'?`<button class="btn sm primary" data-act="postPayout" data-id="${e.id}">Record payout</button>`:`<button class="btn sm ${m?'':'primary'}" data-act="assignPending" data-id="${e.id}">Assign flat…</button>`}<button class="btn sm danger" data-act="delEntry" data-id="${e.id}">×</button></div></div>
   ${m?`<div class="match"><span>${I('check',18,2.2)} Looks like <b>${esc(bshort(m.t.building))} · ${esc(m.t.units.join('+')||'?')}</b> – ${esc(m.t.tenant)} <span class="muted xs">(${m.why.join(', ')})</span></span><button class="btn sm primary" data-act="confirmMatch" data-id="${e.id}" data-t="${m.t.id}">Confirm match</button></div>`:''}</div>`}).join('')}</div>`:`<div class="slim">${I('check',18,2.2)} 0 unassigned receipts</div>`}
  <div class="tile" style="margin-top:20px"><div class="row between" style="margin-bottom:12px"><h3>Recorded with attachments</h3><button class="btn outline sm" data-act="zipReceipts">${I('upload',15)} Download ZIP</button></div>
   <div class="fbar"><div class="sbox"><input data-f="receipts.q" value="${esc(F.receipts.q)}" placeholder="Search flat, category, file…"><button data-act="clrQ" data-k="receipts" ${F.receipts.q?'':'hidden'}>×</button></div><select data-f="receipts.b">${bOpts(F.receipts.b,'All buildings')}</select><select data-f="receipts.m">${opt(months.map(m=>[m,MON[+m.slice(5)-1]+' '+m.slice(0,4)]),F.receipts.m,'All months')}</select></div><div id="tbl"></div></div>`};
window._draw.receipts=()=>{const L=rec().slice(0,60);
  $('#tbl').innerHTML=L.length?`<div class="tcard"><div class="tscroll"><table><thead><tr><th>Date</th><th>Building &amp; unit</th><th>Category</th><th class="num">Amount</th><th>Receipt file</th></tr></thead><tbody>${L.map(e=>`<tr><td class="nw">${fd(e.date)}</td><td>${e.building||e.unitLabel?`<span class="fb">${esc(bshort(e.building))}${e.unitLabel?' · '+esc(e.unitLabel):''}</span>`:'—'}</td><td>${esc(catName(e))}</td><td class="num"><span class="muted xs">AED</span> ${money(e.amount)}</td><td><button class="pill blue" style="border:0;cursor:pointer" data-act="viewFile" data-p="${esc(e.file.path)}" data-n="${esc(e.file.name)}">${/pdf$/i.test(e.file.name)?'View PDF':'View image'}</button></td></tr>`).join('')}</tbody></table></div></div>`:'<p class="muted">No receipts match.</p>'};
actions.confirmMatch=d=>{const e=D.entries.find(x=>x.id===d.id);actions.assignPending({id:e.id});setTimeout(()=>{const f=$('#modal form');if(f&&f.tid){f.tid.value=d.t;f.tid.dispatchEvent(new Event('change',{bubbles:true}))}},60)};
async function blobOf(path,name){if(MODE==='cloud'){const r=await ghApi(path,{q:'?ref='+encodeURIComponent(GHC.branch),raw:1});if(!r.ok)throw new Error(r.status);return await r.blob()}return await IDB.get(path)}
actions.viewFile=async d=>{try{const b=await blobOf(d.p,d.n);if(!b)throw new Error('file not found');const ext=d.n.split('.').pop().toLowerCase(),type=b.type||({pdf:'application/pdf',png:'image/png'}[ext]||'image/jpeg'),u=URL.createObjectURL(new Blob([b],{type}));
  const e=D.entries.find(x=>x.file&&x.file.path===d.p);
  modal({wide:1,title:esc(d.n),body:`<div class="split">${type==='application/pdf'?`<iframe src="${u}"></iframe>`:`<img src="${u}" alt="">`}<div>${e?`<div class="dgrid"><div><span>Date</span><b>${fd(e.date)}</b></div><div><span>Amount</span><b>AED ${money(e.amount)}</b></div><div><span>Flat</span><b>${esc(e.unitLabel||'—')}</b></div><div><span>Category</span><b>${esc(catName(e))}</b></div><div class="wide"><span>Description</span><b>${esc(e.desc||'')}</b></div></div><button class="btn" data-act="editEntry" data-id="${e.id}">Edit entry</button> `:''}<a class="btn" href="${u}" target="_blank">Open in new tab</a></div></div>`})}catch(err){toast('Could not open file: '+err.message,'err')}};
actions.zipReceipts=async()=>{const L=rec();if(!L.length)return toast('No receipts to download','err');
  try{if(!window.JSZip)await new Promise((ok,no)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';s.onload=ok;s.onerror=()=>no(new Error('ZIP library could not load (offline?)'));document.head.appendChild(s)});
    const z=new JSZip();let n=0;for(const e of L){try{const b=await blobOf(e.file.path,e.file.name);if(b){z.file(`${e.date}_${(e.unitLabel||'general').replace(/\W+/g,'')}_${e.file.name.replace(/^\d+-/,'')}`,b);n++}}catch(_){}}
    const out=await z.generateAsync({type:'blob'});const a=document.createElement('a');a.href=URL.createObjectURL(out);a.download=`receipts-${F.receipts.m||'all'}.zip`;a.click();toast(n+' files zipped','ok')}catch(e){toast(e.message,'err')}};
document.addEventListener('dragover',e=>{const z=e.target.closest&&e.target.closest('#drop');$$('.dz').forEach(d=>d.classList.toggle('over',!!z))});
document.addEventListener('drop',()=>$$('.dz').forEach(d=>d.classList.remove('over')));
document.addEventListener('dragleave',e=>{if(!e.relatedTarget)$$('.dz').forEach(d=>d.classList.remove('over'))});

/* ---------- ledger ---------- */
F.ledger=Object.assign({q:'',kind:'',cat:'',b:'',from:'',to:'',run:false,pre:'all'},F.ledger||{});
const PRE=[['month','This month'],['quarter','Last quarter'],['ytd','Year to date'],['all','All time']];
actions.ledPre=d=>{const f=F.ledger,y=TODAY.slice(0,4),m=TODAY.slice(0,7);f.pre=d.k;
  if(d.k==='month'){f.from=m+'-01';f.to=addDays(addMonths(m+'-01',1),-1)}
  else if(d.k==='quarter'){const q=Math.floor((+TODAY.slice(5,7)-1)/3),sm=addMonths(y+'-01-01',q*3-3);f.from=sm;f.to=addDays(addMonths(sm,3),-1)}
  else if(d.k==='ytd'){f.from=y+'-01-01';f.to=TODAY}else{f.from='';f.to=''}refresh()};
actions.ledRun=()=>{F.ledger.run=!F.ledger.run;_draw.ledger()};
PAGES.ledger=()=>`<div class="ph"><div><h2>Ledger</h2></div><div class="toolbar"><button class="btn primary" data-act="addReceipt">${I('plus',16,2.2)} Receipt</button><button class="btn" data-act="addExpense">${I('plus',16,2.2)} Expense</button><button class="btn outline" data-act="ledCsv">Export CSV</button><button class="btn outline" data-act="ledgerPdf">Export PDF</button></div></div>
 <div id="kpis"></div>
 <div class="fbar"><div class="sbox" style="min-width:200px"><input data-f="ledger.q" value="${esc(F.ledger.q)}" placeholder="Search description, flat, ref…"></div><select data-f="ledger.old"><option value="">This year only</option><option value="1" ${F.ledger.old?'selected':''}>Include last year's closing payouts</option></select><select data-f="ledger.kind">${opt([['income','Money in'],['expense','Expenses'],['payout','Partner payouts']],F.ledger.kind,'All types')}</select>
 <select data-f="ledger.cat">${opt([...Object.entries(INC_CATS),...Object.entries(EXP_CATS)].filter((v,i,a)=>a.findIndex(x=>x[0]===v[0])===i),F.ledger.cat,'All categories')}</select><select data-f="ledger.b">${bOpts(F.ledger.b,'All buildings')}</select>
 <div class="seg sm">${PRE.map(([k,l])=>`<button class="${F.ledger.pre===k?'on':''}" data-act="ledPre" data-k="${k}">${l}</button>`).join('')}</div><input type="date" data-f="ledger.from" value="${F.ledger.from}" aria-label="From"><span class="muted">→</span><input type="date" data-f="ledger.to" value="${F.ledger.to}" aria-label="To"><label class="btn sm" style="white-space:nowrap"><input type="checkbox" ${F.ledger.run?'checked':''} data-act-change="" onchange="actions.ledRun()"> Running balance</label></div><div id="tbl"></div>`;
window.ledgerRows=function(){const f=F.ledger,q=(f.q||'').toLowerCase();
  const od=D.settings.openingDate||'';return D.entries.filter(e=>(f.old||!(e.prior||(od&&e.date<od)))&&(!f.kind||e.kind===f.kind)&&(!f.cat||e.cat===f.cat)&&(!f.b||e.building===f.b)&&(!f.from||e.date>=f.from)&&(!f.to||e.date<=f.to)&&(!q||((e.desc||'')+' '+(e.unitLabel||'')+' '+(e.ref||'')+' '+(e.payer||'')+' '+(partnerById(e.partnerId)?.short||'')).toLowerCase().includes(q))).sort((a,b)=>a.date<b.date?1:a.date>b.date?-1:0)};
const MODEC=m=>/cheque/i.test(m)?'violet':/cash/i.test(m)?'amber':/transfer|bank/i.test(m)?'blue':'gray';
const KIND={income:['Money in','green'],expense:['Expense','red'],payout:['Payout','blue']};
window._draw.ledger=()=>{
  const L=ledgerRows(),ok=e=>e.status!=='pending',tin=r2(L.filter(e=>e.kind==='income'&&ok(e)).reduce((s,e)=>s+e.amount,0)),cf=r2(L.filter(e=>e.cat==='carry'&&ok(e)).reduce((s,e)=>s+e.amount,0)),dp=r2(L.filter(e=>e.cat==='deposit'&&e.kind==='income'&&ok(e)).reduce((s,e)=>s+e.amount,0)),tex=r2(L.filter(e=>e.kind==='expense').reduce((s,e)=>s+e.amount,0)),tpo=r2(L.filter(e=>e.kind==='payout').reduce((s,e)=>s+e.amount,0));
  $('#kpis').innerHTML=`<div class="kpis4"><div class="k4 in"><span>Received</span><b class="pos">AED ${money(r2(tin-cf),2)}</b>${(cf||dp)?`<small class="muted xs" style="display:block;margin-top:4px">${dp?'incl. deposits AED '+money(dp,0):''}${dp&&cf?' · ':''}${cf?'excl. AED '+money(cf,0)+' brought forward':''}</small>`:''}</div><div class="k4 out"><span>Expenses</span><b>AED ${money(tex,2)}</b></div><div class="k4 po"><span>Partner payouts</span><b>AED ${money(tpo,2)}</b></div><div class="k4 net"><span>Net ledger balance</span><b>AED ${money(r2(tin-tex-tpo),2)}</b></div></div>`;
  let bal=0;const bm={};if(F.ledger.run){[...L].reverse().forEach(e=>{if(ok(e))bal=r2(bal+(e.kind==='income'?e.amount:-e.amount));bm[e.id]=bal})}
  const S=L.slice(0,400);
  $('#tbl').innerHTML=`<div class="muted xs" style="margin-bottom:8px">${L.length} entries${(()=>{if(F.ledger.old)return '';const od=D.settings.openingDate||'',h=D.entries.filter(e=>e.prior||(od&&e.date<od));return h.length?` · ${h.length} entries from before ${fd(od)} (last year\'s closing, AED ${money(h.reduce((x,e)=>x+e.amount,0),0)}) are hidden`:''})()}</div><div class="tcard"><div class="tscroll"><table><thead><tr><th>Date</th><th>Type</th><th>Flat</th><th>Description</th><th>Mode</th><th>Ref</th><th class="num">In</th><th class="num">Out</th>${F.ledger.run?'<th class="num">Balance</th>':''}<th></th></tr></thead><tbody>${S.map(e=>{const k=KIND[e.kind]||['','gray'];const fl=e.building||e.unitLabel?`<span class="fb">${esc(bshort(e.building))}${e.unitLabel?' · '+esc(e.unitLabel):''}</span>`:'';
   return `<tr class="${e.status==='pending'?'pend':''}"><td class="nw">${fdt(e.date)}</td><td>${pillOf(catName(e),k[1])}${e.status==='pending'?' '+pillOf('pending','amber'):''}${e.prior?' <span class="muted xs">prior</span>':''}</td><td>${fl}</td>
   <td>${esc(e.kind==='payout'?(partnerById(e.partnerId)?.short||'')+' – ':'')}${esc(e.desc||'')}${e.instNo?' <span class="muted xs">#'+e.instNo+'</span>':''}${e.file?` <button class="x-att" style="border:0;background:#f1f5f9;border-radius:8px;padding:3px 6px;cursor:pointer;vertical-align:middle" data-act="ledAtt" data-id="${e.id}" aria-label="View attachment">${I('file',14)}</button>`:''}</td>
   <td>${e.mode?pillOf(e.mode,MODEC(e.mode)):''}</td><td class="xs">${esc(e.ref||'')}</td><td class="num pos">${e.kind==='income'?'+'+money(e.amount):''}</td><td class="num neg">${e.kind!=='income'?'−'+money(e.amount):''}</td>${F.ledger.run?`<td class="num">${money(bm[e.id])}</td>`:''}<td class="num"><button class="btn sm" data-act="editEntry" data-id="${e.id}">Edit</button></td></tr>`}).join('')}</tbody></table></div></div>${L.length>400?'<p class="muted">Showing 400 most recent – narrow the filters.</p>':''}`;
};
actions.ledAtt=async d=>{const e=D.entries.find(x=>x.id===d.id);if(!e||!e.file)return;
  try{const b=await blobOf(e.file.path,e.file.name);if(!b)throw new Error('file not found');const t=b.type||(/pdf$/i.test(e.file.name)?'application/pdf':'image/jpeg'),u=URL.createObjectURL(new Blob([b],{type:t}));
   $('#drawer').innerHTML=`<div class="dhd"><div><b>${esc(e.file.name.replace(/^\d+-/,''))}</b><div class="muted xs">AED ${money(e.amount)} · ${fd(e.date)}</div></div><button class="x" data-act="closeDrawer" aria-label="Close">×</button></div><div class="dbd" style="padding:0;flex:1">${t==='application/pdf'?`<iframe src="${u}" style="width:100%;height:100%;border:0"></iframe>`:`<img src="${u}" style="width:100%" alt="">`}</div>`;$('#drawer').classList.add('open');
   window._attOpen=1}catch(err){toast('Could not open file: '+err.message,'err')}};

/* ---------- landlord bank details (Settings) ---------- */
const _ps=PAGES.settings;
PAGES.settings=()=>{const h=_ps(),B=landlordBank(),k=h.indexOf('<section class="card"><h3>Partners');
  const card=`<section class="card"><h3>Landlord bank details</h3><p class="muted">Printed on late payment notices so tenants know where to pay. Change them here if the account ever changes.</p><form data-form="landlordBank"><div class="fg"><label>Bank name<input name="bankName" value="${esc(B.bankName)}"></label><label>Account name<input name="accName" value="${esc(B.accName)}"></label><label>Account number<input name="accNo" value="${esc(B.accNo)}" inputmode="numeric"></label><label>IBAN<input name="iban" value="${esc(B.iban)}" style="text-transform:uppercase"></label></div><div class="row end"><button class="btn primary">Save bank details</button></div></form></section>`;
  return k<0?h+card:h.slice(0,k)+card+h.slice(k)};
forms.landlordBank=f=>{D.settings.landlordBank={bankName:f.get('bankName').trim(),accName:f.get('accName').trim(),accNo:f.get('accNo').replace(/\s+/g,''),iban:f.get('iban').replace(/\s+/g,'').toUpperCase()};save();toast('Bank details saved','ok')};
})();
(function(){
/* ---------- upload from the home page ---------- */
document.addEventListener('change',async e=>{const t=e.target;if(t.dataset&&t.dataset.actChange==='dashIngest'&&t.files.length){const fs=[...t.files];t.value='';if(window.closeModal)try{closeModal()}catch(_){}
  const before=D.entries.length;toast('Reading '+fs.length+' file'+(fs.length>1?'s':'')+'…','');await ingestFiles(fs);if(D.entries.length>before)location.hash='#/receipts'}});

/* ---------- Partners: how the money is split ---------- */
const mgr=()=>D.partners.find(p=>p.manager);
PAGES.partners=()=>{
  const C=CC,S=D.settings,pays=D.entries.filter(e=>e.kind==='payout'&&e.status!=='pending'&&!e.prior).sort((a,b)=>a.date<b.date?1:-1),m=mgr();
  const bal=r2(C.pool-C.mg),entl=r2(C.partners.reduce((s,x)=>s+x.entl,0)),paid=r2(C.partners.reduce((s,x)=>s+x.paid,0)),diff=r2(C.cash-S.reserve-C.owedTotal);
  const sh=C.partners.slice().sort((a,b)=>b.share-a.share).map(x=>({label:x.p.short,v:+(x.share*100).toFixed(2),tip:`${x.p.name}\n${x.area.toFixed(2)} m²`}));
  const W=(l,s,v,k)=>`<div class="wfr ${k||''}"><div><b>${l}</b>${s?`<span>${s}</span>`:''}</div><em>${k==='minus'?'−':k==='plus'?'+':''} AED ${money(Math.abs(v),2)}</em></div>`;
  return `<div class="ph"><div><h2>Partners</h2><div class="sub">Who is owed what, live</div></div><div class="row"><button class="btn primary" data-act="distribute">Distribute / pay</button><button class="btn" data-act="copyShares">Copy summary</button><button class="btn" data-act="partnersPdf">Export PDF</button></div></div>
  <div class="bento">
   <div class="tile s7"><h3>How the money is split</h3><div class="cap">Step by step, from the total down to what each partner receives</div>
    <div class="wf">
     ${W('Total money to split','everything received minus expenses'+(S.holdDeposits?', tenant deposits held aside':''),C.pool)}
     ${W(`Management fee ${S.mgmtPct}%`,`goes to ${esc(m?.short||'the manager')}`,C.mg,'minus')}
     ${W('Balance','',bal,'sub')}
     ${W('Kept for maintenance',C.yearStart?'already kept from last year':'stays in the account',C.resv,'minus')}
     ${W('To share between partners','split by area (m²)',C.dist,'tot')}
    </div>
    <div class="wf two"><div class="cap" style="margin:0 0 4px">Then, what is due today</div>
     ${W('Partners\' area shares','',r2(C.dist),'')}${W(`Management fee to ${esc(m?.short||'manager')}`,'',C.mg,'plus')}${C.bfTotal?W('Brought forward from last year','still unpaid when the year closed',C.bfTotal,'plus'):''}${W('Total entitled','',entl,'sub')}${W('Already paid out','',paid,'minus')}${W('Due now','',C.owedTotal,'tot hero2')}
    </div>
    <p class="muted xs" style="margin-top:12px">Check: bank ${aed(C.cash)} − ${aed(S.reserve)} kept = ${aed(r2(C.cash-S.reserve))} ${Math.abs(diff)<0.02?'<span class="ok">✓ equals the amount due</span>':`(differs from amount due by ${aed(diff)}: pending receipts or unrecorded movements)`}</p></div>
   <div class="tile s5"><h3>Ownership share</h3><div class="osh">${C.partners.slice().sort((a,b)=>b.share-a.share).map(x=>`<div class="osr"><b>${esc(x.p.short)}</b><div class="osb"><i style="width:${(x.share/Math.max(...C.partners.map(y=>y.share))*100).toFixed(1)}%"></i></div><span class="ospct">${(x.share*100).toFixed(2)}%</span><span class="osamt ${x.owed>0?'due':''}">AED ${money(x.owed,0)}</span></div>`).join('')}<div class="osr ost"><b>Total</b><span></span><span class="ospct">100%</span><span class="osamt">AED ${money(C.owedTotal,0)}</span></div></div><div class="muted xs" style="margin-top:8px">Share by area. The amount is what is still due to each partner today.</div></div>
   <div class="tile s12"><h3>Due now, per partner</h3><div class="pcards">
    ${C.partners.map(x=>`<button class="pcard ${x.owed<0?'neg':''}" data-act="pStmt" data-id="${x.p.id}"><b>${esc(x.p.short)}${x.p.manager?' <span class="pill amber">manager</span>':''}</b><span class="muted">${(x.share*100).toFixed(2)}% · paid AED ${money(x.paid,0)}</span>${x.fee?`<span class="xs muted">share ${money(x.share_amt,0)} + fee ${money(x.fee,0)}</span>`:''}<strong>AED ${money(x.owed)}</strong></button>`).join('')}</div></div>
  </div>
  ${!S.holdDeposits&&C.depHeld>0?`<div class="note amber">The total includes <b>${aed(C.depHeld)}</b> of tenant security deposits (as in your old sheet). To keep deposits aside until tenants move out, turn it on in <a href="#/settings">Settings</a>.</div>`:''}
  <section class="card"><div class="tscroll"><table class="tbl"><thead><tr><th>Partner</th><th class="num">Area m²</th><th class="num">Share</th><th class="num">Area share</th><th class="num">Mgmt fee</th><th class="num">Entitled</th><th class="num">Paid</th><th class="num">Due now</th></tr></thead><tbody>
  ${C.partners.map(x=>`<tr class="click" data-act="pStmt" data-id="${x.p.id}"><td><b>${esc(x.p.short)}</b><div class="muted xs">${esc(x.p.name)}<br>${esc(x.p.bank||'')} ${esc(x.p.iban||'')}</div></td><td class="num">${x.area.toFixed(2)}</td><td class="num">${(x.share*100).toFixed(2)}%</td><td class="num">${money(x.share_amt)}</td><td class="num">${x.fee?money(x.fee):'—'}</td><td class="num">${money(x.entl)}</td><td class="num">${money(x.paid)}</td><td class="num big ${x.owed<0?'bad':''}">${money(x.owed)}</td></tr>`).join('')}
  <tr class="tot"><td>Total</td><td class="num">${C.totArea.toFixed(2)}</td><td class="num">100%</td><td class="num">${money(C.dist)}</td><td class="num">${money(C.mg)}</td><td class="num">${money(entl)}</td><td class="num">${money(paid)}</td><td class="num big">${money(C.owedTotal)}</td></tr></tbody></table></div>
  <p class="muted xs">Receipts waiting to be assigned (${aed(C.pendingAmt)}) are not counted until assigned.</p></section>
  <section class="card"><h3>Payout history</h3>${pays.length?`<div class="tscroll"><table class="tbl"><thead><tr><th>Date</th><th>Partner</th><th>Mode</th><th>Ref</th><th class="num">Amount</th></tr></thead><tbody>${pays.map(e=>`<tr><td class="nw">${fdt(e.date)}</td><td>${esc(partnerById(e.partnerId)?.short||'?')}</td><td class="xs">${esc(e.mode||'')}</td><td class="xs">${esc(e.ref||'')}</td><td class="num">${money(e.amount)}</td></tr>`).join('')}</tbody></table></div>`:empty('inbox','No payouts recorded yet')}</section>`};
})();
/* label table cells so they can stack as cards on phones */
(function(){let q=0;const lab=()=>{q=0;document.querySelectorAll('.tcard table').forEach(t=>{const h=[...t.querySelectorAll('thead th')].map(x=>x.textContent.trim());t.querySelectorAll('tbody tr').forEach(r=>{[...r.children].forEach((c,i)=>{if(c.tagName!=='TD')return;if(h[i]&&!c.dataset.l)c.dataset.l=h[i];if(!c.textContent.trim()&&!c.querySelector('button,input,a,svg'))c.dataset.e=1})})})};
 new MutationObserver(()=>{if(!q)q=requestAnimationFrame(lab)}).observe(document.getElementById('main'),{childList:true,subtree:true})})();

(function(){
/* ---------- discount on an instalment: lowers the rent value, no ledger entry ---------- */
actions.discountInst=d=>{const t=tenById(d.t),i=t&&t.installments.find(z=>String(z.no)===String(d.n)),x=CC.ten[d.t],ci=x&&x.insts.find(z=>String(z.no)===String(d.n));if(!t||!i||!ci)return;
  const left=r2(ci.gross-ci.disc-ci.paid+ci.disc);const sugg=i.discount||Math.max(0,r2(ci.gross-ci.paid));
  modal({small:1,title:'Discount on cheque #'+i.no,body:`<form data-form="discount"><input type="hidden" name="t" value="${t.id}"><input type="hidden" name="n" value="${i.no}">
   <p><b>${esc(t.tenant)}</b> · ${esc(bshort(t.building))} ${esc(t.units.join('+'))}<br><span class="muted">Rent ${fd(i.due)}: AED ${money(ci.gross)} · paid AED ${money(ci.paid)}</span></p>
   <label>Discount amount (AED)<input type="number" step="0.01" min="0" max="${ci.gross}" name="amt" value="${sugg}" required autofocus></label>
   <label>Reason (kept on the tenant record)<input name="note" value="${esc(i.discountNote||'')}" placeholder="e.g. balance let go as a discount"></label>
   <div class="note">This lowers the rent for this cheque. Nothing is added to the ledger or the accounts – the unpaid amount simply stops being owed.</div>
   <div class="row end" style="margin-top:12px">${i.discount?'<button type="button" class="btn danger" data-act="discountRemove" data-t="'+t.id+'" data-n="'+i.no+'">Remove discount</button>':''}<button type="button" class="btn" data-act="closeModal">Cancel</button><button class="btn primary">Save discount</button></div></form>`})};
forms.discount=f=>{const t=tenById(f.get('t')),i=t&&t.installments.find(z=>String(z.no)===f.get('n'));if(!i)return;const a=Math.max(0,Math.min(+f.get('amt')||0,i.amount));
  if(a>0){i.discount=a;i.discountNote=f.get('note').trim();i.discountDate=TODAY}else{delete i.discount;delete i.discountNote;delete i.discountDate}
  closeModal();save();toast(a>0?'Discount of AED '+money(a)+' applied to the rent':'Discount removed','ok')};
actions.discountRemove=d=>{const t=tenById(d.t),i=t&&t.installments.find(z=>String(z.no)===String(d.n));if(!i)return;delete i.discount;delete i.discountNote;delete i.discountDate;closeModal();save();toast('Discount removed','ok')};
})();

(function(){
actions.discountAll=d=>{const t=tenById(d.id),x=CC.ten[d.id];if(!t||!x)return;const L=x.insts.filter(i=>!i.done&&i.bal>0.004),tot=r2(L.reduce((s,i)=>s+i.bal,0));if(!L.length)return toast('Nothing unpaid to discount','err');
  modal({small:1,title:'Discount all unpaid rent',body:`<form data-form="discountAll"><input type="hidden" name="id" value="${t.id}"><p><b>${esc(t.tenant)}</b> · ${esc(bshort(t.building))} ${esc(t.units.join('+'))}</p>
   <div class="note">${L.length} unpaid cheque${L.length>1?'s':''} totalling <b>AED ${money(tot)}</b> will be let go as a discount – for example before a renewal on a fresh contract with no carry-forward.</div>
   <label>Reason<input name="note" value="Balance let go at renewal"></label><p class="muted xs">Only the rent value is reduced. The ledger and accounts are not touched.</p>
   <div class="row end"><button type="button" class="btn" data-act="closeModal">Cancel</button><button class="btn primary">Discount AED ${money(tot)}</button></div></form>`})};
forms.discountAll=f=>{const t=tenById(f.get('id')),x=CC.ten[f.get('id')];if(!t||!x)return;let n=0;
  x.insts.filter(i=>!i.done&&i.bal>0.004).forEach(ci=>{const i=t.installments.find(z=>z.no===ci.no);if(!i)return;i.discount=r2((+i.discount||0)+ci.bal);i.discountNote=f.get('note').trim();i.discountDate=TODAY;n++});
  closeModal();save();toast('Discount applied to '+n+' cheque'+(n>1?'s':''),'ok')};
})();

/* ---------- Close the year (accounting only – tenants are never touched) ---------- */
function yearStartOf(){return D.settings.yearStart||D.settings.openingDate||''}
function yearSummary(end){
  const S=D.settings,ys=S.yearStart||'',C2=calc(end);
  const acc=D.entries.filter(e=>e.status!=='pending'&&(!ys||e.date>=ys)&&e.date<=end);
  const sm=a=>r2(a.reduce((s,e)=>s+e.amount,0));
  return {C2,opening:S.openingCash,carry:sm(acc.filter(e=>e.kind==='income'&&e.cat==='carry')),received:sm(acc.filter(e=>e.kind==='income'&&e.cat!=='carry')),expenses:sm(acc.filter(e=>e.kind==='expense')),payouts:sm(acc.filter(e=>e.kind==='payout')),n:acc.length};
}
function closeYearOpen(end){
  const S=D.settings;end=end||TODAY;const Y=yearSummary(end),C2=Y.C2,start=yearStartOf();
  modal({wide:1,title:'Close the year',body:`<form data-form="closeYear">
  <div class="note">This is for <b>your accounts only</b>. Tenants, cheques, instalments and payment history are not touched. The bank balance below becomes the opening balance of the new year, and the Ledger and Dashboard start again from the next day. Amounts partners are still owed are carried forward.</div>
  <div class="fg"><label>Year ends on<input type="date" id="cyDate" name="end" value="${end}" min="${start}"></label><label>New year starts<input type="text" value="${fd(addDays(end,1))}" readonly></label></div>
  <div class="wf"><div class="wfr"><div><b>Books year</b><span>${fd(start)} to ${fd(end)} · ${Y.n} entries</span></div><em></em></div>
   <div class="wfr"><div><b>Opening balance</b></div><em>AED ${money(Y.opening,2)}</em></div>
   <div class="wfr plus"><div><b>Received</b><span>rent, deposits, other</span></div><em>+ AED ${money(Y.received,2)}</em></div>
   <div class="wfr minus"><div><b>Expenses</b></div><em>− AED ${money(Y.expenses,2)}</em></div>
   <div class="wfr minus"><div><b>Paid to partners</b></div><em>− AED ${money(Y.payouts,2)}</em></div>
   <div class="wfr tot hero2"><div><b>Closing balance in the bank</b><span>carried into the new year</span></div><em>AED ${money(C2.cash,2)}</em></div></div>
  <table class="tbl" style="margin-top:12px"><thead><tr><th>Partner</th><th class="num">Entitled</th><th class="num">Paid</th><th class="num">Carried forward (due)</th></tr></thead><tbody>${C2.partners.map(x=>`<tr><td>${esc(x.p.short)}</td><td class="num">${money(x.entl)}</td><td class="num">${money(x.paid)}</td><td class="num"><b>${money(x.owed)}</b></td></tr>`).join('')}<tr class="tot"><td>Total</td><td class="num"></td><td class="num"></td><td class="num">${money(C2.owedTotal)}</td></tr></tbody></table>
  <p class="muted xs">Reserve of ${aed(S.reserve)} stays in the account and is not taken again next year. You can undo the close later from Past years.</p>
  <div class="row end"><button type="button" class="btn" data-act="closeModal">Cancel</button><button class="btn primary">Close the year</button></div></form>`});
}
actions.closeYear=()=>closeYearOpen(TODAY);
document.addEventListener('change',e=>{if(e.target&&e.target.id==='cyDate'&&e.target.value){const v=e.target.value;closeModal();closeYearOpen(v)}});
forms.closeYear=f=>{
  const S=D.settings,end=f.get('end');if(!end||end<yearStartOf())return toast('Pick a year-end date after the year start','err');
  const Y=yearSummary(end),C2=Y.C2;
  confirmBox(`Close the books year ending <b>${fd(end)}</b>? Closing bank balance <b>${aed(C2.cash)}</b> becomes the opening balance of the new year. Tenants are not affected.`,()=>{
    D.closedYears=D.closedYears||[];
    D.closedYears.push({id:uid('y'),start:yearStartOf(),end,closedOn:TODAY,opening:Y.opening,received:Y.received,expenses:Y.expenses,payouts:Y.payouts,closing:C2.cash,pool:C2.pool,mgmtFee:C2.mg,
      partners:C2.partners.map(x=>({id:x.p.id,short:x.p.short,entl:x.entl,paid:x.paid,owed:x.owed})),
      prev:{openingCash:S.openingCash,openingDate:S.openingDate,yearStart:S.yearStart||null,bf:S.bf||null,openingCashOrig:S.openingCashOrig??null}});
    if(S.openingCashOrig==null)S.openingCashOrig=S.openingCash;
    const bf={};C2.partners.forEach(x=>{bf[x.p.id]=x.owed});
    S.bf=bf;S.openingCash=C2.cash;S.yearStart=addDays(end,1);S.openingDate=S.yearStart;
    save();toast('Year closed – new year started '+fd(S.yearStart),'ok');
  },'Close the year');
};
actions.pastYears=()=>{
  const L=(D.closedYears||[]).slice().reverse();
  modal({wide:1,title:'Past years',body:L.length?L.map((y,i)=>`<div class="card" style="margin-bottom:10px"><div class="row between"><b>${fd(y.start)} – ${fd(y.end)}</b>${i===0?`<button class="btn" data-act="undoClose">Undo this close</button>`:''}</div>
   <div class="muted xs">Closed on ${fd(y.closedOn)}</div>
   <table class="tbl" style="margin-top:6px"><tbody><tr><td>Opening balance</td><td class="num">${money(y.opening)}</td></tr><tr><td>Received</td><td class="num">${money(y.received)}</td></tr><tr><td>Expenses</td><td class="num">${money(y.expenses)}</td></tr><tr><td>Paid to partners</td><td class="num">${money(y.payouts)}</td></tr><tr class="tot"><td>Closing balance</td><td class="num">${money(y.closing)}</td></tr></tbody></table>
   <div class="muted xs" style="margin-top:6px">Carried forward due: ${y.partners.map(p=>`${esc(p.short)} ${money(p.owed,0)}`).join(' · ')}</div></div>`).join(''):'<p class="muted">No year has been closed yet.</p>'});
};
actions.undoClose=()=>confirmBox('Undo the last year close? The books go back to one running year. Entries added since stay.',()=>{
  const S=D.settings,y=D.closedYears.pop(),p=y.prev;
  S.openingCash=p.openingCash;S.openingDate=p.openingDate;
  if(p.yearStart)S.yearStart=p.yearStart;else delete S.yearStart;
  if(p.bf)S.bf=p.bf;else delete S.bf;
  if(p.openingCashOrig==null)delete S.openingCashOrig;else S.openingCashOrig=p.openingCashOrig;
  save();toast('Close undone','ok');
},'Undo close');
