/* ===== Bank statement: upload PDF, cross-check with the books, fix balance ===== */
(function(){
const sgn=e=>e.kind==='income'?e.amount:-e.amount;
const lbl=e=>(e.desc||e.payer||catName(e)||'').slice(0,80);

function crossCheck(st){
  const S=D.settings;
  const L=D.entries.filter(e=>e.status!=='pending'&&e.cat!=='carry'&&e.date>=st.from&&e.date<=st.to).map(e=>({e,s:sgn(e),used:false}));
  const P=D.entries.filter(e=>e.status==='pending'&&e.date>=addDays(st.from,-10)&&e.date<=addDays(st.to,10)).map(e=>({e,s:sgn(e),used:false}));
  const B=st.txns.map(t=>({t,s:t.type==='credit'?t.amount:-t.amount,m:null}));
  const dd=(a,b)=>Math.abs(daysBetween(a,b));
  // 1: same amount, close date (ref match preferred)
  for(const b of B){
    let best=null,bs=1e9;
    for(const l of L){if(l.used||Math.abs(l.s-b.s)>0.011)continue;const d=dd(l.e.date,b.t.date);if(d>10)continue;
      const refHit=b.t.ref&&l.e.ref&&(b.t.desc.includes(l.e.ref)||l.e.ref.includes(b.t.ref));const sc=refHit?-1:d;if(sc<bs){bs=sc;best=l}}
    if(best){best.used=true;b.m=[best.e]}
  }
  // 2: one bank line = 2 or 3 ledger entries (e.g. several cheques deposited together)
  for(const b of B){
    if(b.m)continue;const c=L.filter(l=>!l.used&&Math.sign(l.s)===Math.sign(b.s)&&dd(l.e.date,b.t.date)<=7);if(c.length<2||c.length>40)continue;
    let hit=null;
    for(let i=0;i<c.length&&!hit;i++)for(let j=i+1;j<c.length&&!hit;j++){
      if(Math.abs(c[i].s+c[j].s-b.s)<0.011)hit=[c[i],c[j]];
      else if(c.length<=25)for(let k=j+1;k<c.length&&!hit;k++)if(Math.abs(c[i].s+c[j].s+c[k].s-b.s)<0.011)hit=[c[i],c[j],c[k]];
    }
    if(hit){hit.forEach(h=>h.used=true);b.m=hit.map(h=>h.e)}
  }
  // 2b: one ledger entry = 2 or 3 bank lines (e.g. card payments, split deposits)
  for(const l of L){
    if(l.used)continue;const c=B.filter(b=>!b.m&&Math.sign(b.s)===Math.sign(l.s)&&dd(l.e.date,b.t.date)<=7);if(c.length<2||c.length>30)continue;
    let hit=null;
    for(let i=0;i<c.length&&!hit;i++)for(let j=i+1;j<c.length&&!hit;j++){
      if(Math.abs(c[i].s+c[j].s-l.s)<0.011)hit=[c[i],c[j]];
      else for(let k=j+1;k<c.length&&!hit;k++)if(Math.abs(c[i].s+c[j].s+c[k].s-l.s)<0.011)hit=[c[i],c[j],c[k]];
    }
    if(hit){l.used=true;hit.forEach(h=>h.m=[l.e])}
  }
  // 3: waiting-list receipts
  for(const b of B){
    if(b.m)continue;const p=P.find(l=>!l.used&&Math.abs(l.s-b.s)<0.011&&dd(l.e.date,b.t.date)<=10);
    if(p){p.used=true;b.pend=p.e}
  }
  const bankOnly=B.filter(b=>!b.m&&!b.pend),pend=B.filter(b=>b.pend),matched=B.filter(b=>b.m);
  const booksOnly=L.filter(l=>!l.used);
  const booksTo=cashAsOf(st.to),booksOpen=st.openingDate?cashAsOf(st.openingDate):null;
  return {B,bankOnly,pend,matched,booksOnly,booksTo,diff:r2(st.closing-booksTo),booksOpen,openDiff:booksOpen==null?null:r2(st.opening-booksOpen)};
}

window.crossCheck=crossCheck;
PAGES.bank=()=>{
  const st=D.bankStmt;
  const head=`<div class="ph"><div><h2>Bank check</h2><div class="sub">Upload your bank statement PDF and compare it with the books</div></div>
    <div class="row"><label class="btn primary">Upload statement PDF<input type="file" accept="application/pdf" hidden data-act-change="stmt"></label></div></div>`;
  if(!st)return head+`<div class="bento"><div class="tile s12">${empty('inbox','No statement uploaded yet. Download the PDF from Emirates Islamic online banking and upload it here.')}</div></div>`;
  const X=crossCheck(st),S=D.settings,ok=Math.abs(X.diff)<0.015;
  const row=b=>`<tr><td class="nowrap">${fdt(b.t.date)}</td><td class="xs">${esc(b.t.desc.slice(0,110))}</td><td class="num ${b.t.type==='credit'?'ok':'bad'} nowrap">${b.t.type==='credit'?'+':'−'}${money(b.t.amount)}</td><td class="num nowrap">${b.t.type==='credit'?`<button class="btn sm" data-act="bkAddCredit" data-i="${st.txns.indexOf(b.t)}">Add to receipts</button>`:bkDebitBtn(b.t,st)}</td></tr>`;
  const missCr=X.bankOnly.filter(b=>b.t.type==='credit'),missDb=X.bankOnly.filter(b=>b.t.type==='debit');
  return head+`
  ${st.account&&S.bankAccount&&st.account!==S.bankAccount?`<div class="note amber">This statement is for account ${esc(st.account)}, but the books are set up for ${esc(S.bankAccount)}.</div>`:''}
  <div class="bento">
   <div class="tile hero s6"><span class="glow"></span>${i3('wallet','hero-i bob')}<div class="cap">Bank balance on ${fd(st.to)}</div><div class="big-n"><small>AED</small>${cn(st.closing,2)}</div><div class="cap" style="margin-top:6px">${fd(st.from)} → ${fd(st.to)} · ${st.txns.length} transactions · uploaded ${fdt(st.uploaded)}</div>
     <div class="row" style="margin-top:10px">${st.file?`<button class="btn ghost-w" data-act="openFile" data-p="${esc(st.file.path)}" data-n="${esc(st.file.name)}">Open PDF</button>`:''}</div></div>
   <div class="tile s3 half"><div class="cap">Books say</div><div class="mid-n"><small>AED</small>${cn(X.booksTo,2)}</div><div class="cap">same date</div></div>
   <div class="tile s3 half ${ok?'':'alert'}"><div class="cap">Difference</div><div class="mid-n ${ok?'ok':'bad'}">${ok?'None':aed2(X.diff)}</div><div class="cap">${ok?'Books match the bank':X.diff>0?'Bank has more than the books':'Books have more than the bank'}</div></div>
   <div class="tile s12"><div class="row between"><div><h3>${X.matched.length} of ${X.B.length} bank lines are in your books</h3><div class="cap">${X.pend.length} more are in your waiting list · ${X.bankOnly.length} missing from the books · ${X.booksOnly.length} in the books but not at the bank</div></div>
     <div class="row"><button class="btn primary" data-act="bkVerify">Save ${aed2(st.closing)} as the verified balance</button>${ok?'':'<button class="btn" data-act="bkFixOpening">Make books match the bank…</button>'}</div></div>
     ${X.openDiff!=null&&Math.abs(X.openDiff)>0.015?`<div class="note amber" style="margin-top:12px">The books and the bank already differed on ${fd(st.openingDate)} (bank ${aed2(st.opening)}, books ${aed2(X.booksOpen)}). That starting difference of <b>${aed2(X.openDiff)}</b> carries into everything after.</div>`:''}</div>
  </div>
  <section class="card"><div class="row between"><h3>In the bank, missing from the books · money in (${missCr.length})</h3>${missCr.length>1?'<button class="btn sm" data-act="bkAddAll">Add all to receipts</button>':''}</div>
   ${missCr.length?`<div class="scroll"><table class="tbl"><thead><tr><th>Date</th><th>Bank description</th><th class="num">Amount</th><th></th></tr></thead><tbody>${missCr.map(row).join('')}</tbody></table></div>`:empty('check','Every deposit is in your books')}</section>
  <section class="card"><h3>In the bank, missing from the books · money out (${missDb.length})</h3>
   ${missDb.length?`<div class="scroll"><table class="tbl"><thead><tr><th>Date</th><th>Bank description</th><th class="num">Amount</th><th></th></tr></thead><tbody>${missDb.map(row).join('')}</tbody></table></div>`:empty('check','Every payment is in your books')}</section>
  <section class="card"><h3>In the books, but not found at the bank (${X.booksOnly.length})</h3><p class="muted sm">Often a cheque that hasn't cleared, an entry with the wrong date or amount, or a typo.</p>
   ${X.booksOnly.length?`<div class="scroll"><table class="tbl"><thead><tr><th>Date</th><th>Entry</th><th class="num">Amount</th><th></th></tr></thead><tbody>${X.booksOnly.map(l=>`<tr class="click" data-act="editEntry" data-id="${l.e.id}"><td class="nowrap">${fdt(l.e.date)}</td><td class="xs">${esc(lbl(l.e))}${l.e.date>=st.to?'<div class="muted">Dated on/after the statement end – probably made after the statement was printed.</div>':''}</td><td class="num nowrap ${l.s>0?'ok':'bad'}">${l.s>0?'+':'−'}${money(Math.abs(l.s))}</td><td class="num"><button class="btn sm">Open</button></td></tr>`).join('')}</tbody></table></div>`:empty('check','Everything in the books is at the bank')}</section>
  <section class="card"><h3>Matched (${X.matched.length})</h3><div class="scroll"><table class="tbl sm"><thead><tr><th>Bank date</th><th>Bank description</th><th class="num">Amount</th><th>Books entry</th></tr></thead><tbody>${X.matched.map(b=>`<tr><td class="nowrap">${fdt(b.t.date)}</td><td class="xs">${esc(b.t.desc.slice(0,70))}</td><td class="num nowrap">${b.t.type==='credit'?'+':'−'}${money(b.t.amount)}</td><td class="xs">${b.m.map(e=>esc(lbl(e))).join(' + ')}</td></tr>`).join('')}</tbody></table></div></section>`;
};
function bkDebitBtn(t,st){
  const p=D.partners.find(p=>p.iban&&t.desc.replace(/\s+/g,'').includes(p.iban)||(t.desc.toUpperCase().includes(p.short.toUpperCase())&&/TRANSFER TO|TT REF/i.test(t.desc)));
  const i=st.txns.indexOf(t);
  return (p?`<button class="btn sm primary" data-act="bkPayout" data-i="${i}" data-p="${p.id}">Payout to ${esc(p.short)}</button> `:'')+`<button class="btn sm" data-act="bkAddDebit" data-i="${i}">Add expense</button>`;
}
actions.editEntry=d=>openEntry(d.id);
actions.bkAddCredit=d=>{const t=D.bankStmt.txns[+d.i];addCredit(t);save();toast('Added to your receipts waiting list','ok')};
function addCredit(t){
  D.entries.push({id:uid('e'),status:'pending',kind:'income',cat:'rent',date:t.date,amount:t.amount,ref:t.ref||'',mode:/SDM|CDM|ATM|CASH/i.test(t.desc)?'cash deposit':'bank transfer',payer:t.from||'',building:null,desc:(t.from?'From '+t.from:t.desc.slice(0,70)),hint:'From the bank statement – choose the flat it was for.'});
}
actions.bkAddAll=()=>{const X=crossCheck(D.bankStmt),L=X.bankOnly.filter(b=>b.t.type==='credit');confirmBox(`Add ${L.length} deposits (${aed2(L.reduce((s,b)=>s+b.t.amount,0))}) to your receipts waiting list? You then choose the flat for each.`,()=>{L.forEach(b=>addCredit(b.t));save();toast(L.length+' added','ok')},'Add all')};
actions.bkAddDebit=d=>{const t=D.bankStmt.txns[+d.i];openEntry(null,{kind:'expense',cat:'other',date:t.date,amount:t.amount,desc:t.desc.slice(0,90),ref:t.ref||''})};
actions.bkPayout=d=>{const t=D.bankStmt.txns[+d.i],p=partnerById(d.p);
  confirmBox(`Record ${aed2(t.amount)} on ${fd(t.date)} as a payout to <b>${esc(p.short)}</b>?`,()=>{D.entries.push({id:uid('e'),kind:'payout',cat:'payout',date:t.date,amount:t.amount,partnerId:p.id,desc:'transfer to '+p.short.toLowerCase()+' (bank statement)',mode:'bank transfer',ref:t.ref||'',status:'posted',building:null});save();toast('Payout recorded','ok')},'Record payout')};
actions.bkVerify=()=>{const st=D.bankStmt;D.settings.lastVerified={date:st.to,balance:st.closing};save();toast('Verified balance saved','ok')};
actions.bkFixOpening=()=>{
  const st=D.bankStmt,X=crossCheck(st);
  confirmBox(`Books are <b>${aed2(X.diff)}</b> ${X.diff>0?'below':'above'} the bank on ${fd(st.to)}. This changes the opening cash by that amount so the books equal the bank. Best done <b>after</b> adding the missing items above. Continue?`,()=>{
    D.settings.openingCash=r2(D.settings.openingCash+X.diff);D.settings.lastVerified={date:st.to,balance:st.closing};save();toast('Opening cash adjusted – books now match the bank','ok')},'Adjust opening cash');
};
/* upload */
async function readStatement(file){
  try{
    toast('Reading statement…');
    const st=Parse.parseStatement(await pdfText(file));
    if(!st.ok||!st.from)return toast('This does not look like an Emirates Islamic statement PDF.','err');
    if(st.bad)toast(`${st.bad} line(s) did not add up – check the result carefully`,'err');
    let meta=null;try{meta=await storeFile(file,'Bank statement')}catch(e){toast('Statement read, but the PDF could not be saved: '+e.message,'err')}
    D.bankStmt={from:st.from,to:st.to,account:st.account,opening:st.opening,openingDate:st.openingDate,closing:st.closing,uploaded:TODAY,file:meta,
      txns:st.txns.map(t=>({date:t.date,desc:t.desc.slice(0,160),amount:t.amount,type:t.type,ref:t.ref||'',from:t.from||''}))};
    save();location.hash='#/bank';toast(`Read ${st.txns.length} transactions`,'ok');
  }catch(e){toast('Could not read the statement: '+e.message,'err')}
}
document.addEventListener('change',e=>{const t=e.target;if(t.dataset.actChange==='stmt'&&t.files[0]){readStatement(t.files[0]);t.value=''}});
})();
