/* ===== Late-payment penalty notice (PDF, ready for WhatsApp) ===== */
(function(){
let _jp=null;
const BANK0={bankName:'Emirates Islamic Bank',accName:'Thani Rashed Essa',accNo:'3707661081002',iban:'AE460340003707661081002'};
window.landlordBank=()=>Object.assign({},BANK0,(D&&D.settings&&D.settings.landlordBank)||{});
function loadJsPdf(){if(window.jspdf)return Promise.resolve();return _jp||(_jp=new Promise((ok,no)=>{const s=document.createElement('script');s.src=window.JSPDF_SRC||'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';s.onload=ok;s.onerror=()=>{_jp=null;no(new Error('PDF library could not load (offline?)'))};document.head.appendChild(s)}))}
const longDate=s=>{const [y,m,d]=s.split('-');return ['January','February','March','April','May','June','July','August','September','October','November','December'][+m-1]+' '+(+d)+', '+y};
const findInst=(tid,no)=>{const x=CC.ten[tid];return x&&x.insts.find(i=>String(i.no)===String(no))};
const waNum=m=>{let n=String(m||'').replace(/[^\d]/g,'');if(n.startsWith('00'))n=n.slice(2);else if(n.startsWith('0'))n='971'+n.slice(1);return n};

actions.penaltyNotice=d=>{
  const t=tenById(d.t),i=findInst(d.t,d.n);if(!t||!i)return;
  const S=D.settings,late=i.done?(i.paidOn?daysBetween(i.due,i.paidOn):0):Math.max(0,daysBetween(i.due,TODAY)),prev=(t.notices||[]).filter(n=>n.no==i.no);
  modal({small:1,title:'Late payment notice',body:`<form data-form="notice"><input type="hidden" name="t" value="${t.id}"><input type="hidden" name="n" value="${i.no}">
   <p><b>${esc(t.tenant)}</b> · ${esc(bshort(t.building))} ${esc(t.units.join('+'))}<br><span class="muted">Cheque ${esc(i.cheque?.no||'#'+i.no)} · due ${fd(i.due)} · ${i.done?'paid '+(i.paidOn?fd(i.paidOn):'late'):'<b class="bad">unpaid, '+late+' days late</b>'}</span></p>
   <label>Penalty amount to put on the notice (AED)<input type="number" step="0.01" min="0" name="fine" value="${S.penalty||''}" required autofocus></label>
   <div class="fg"><label>Notice date<input type="date" name="date" value="${TODAY}"></label><label>Pay within (days)<input type="number" name="days" value="7" min="1"></label></div>
   ${prev.length?`<div class="note amber">A notice was already made for this cheque on ${fd(prev[prev.length-1].date)}.</div>`:''}
   <div class="row end" style="margin-top:12px"><button type="button" class="btn" data-act="closeModal">Cancel</button><button class="btn primary">Create PDF</button></div></form>`})};

forms.notice=async f=>{
  const t=tenById(f.get('t')),i=findInst(f.get('t'),f.get('n')),fine=+f.get('fine')||0,date=f.get('date')||TODAY,days=+f.get('days')||7;
  try{
    await loadJsPdf();const blob=await buildNotice({t,i,fine,date,days});
    (t.notices=t.notices||[]).push({date,no:i.no,fine,cheque:i.cheque?.no||''});save();
    const name=`Late-payment-notice_${bshort(t.building)}-${t.units.join('+')}_${date}.pdf`.replace(/\s+/g,'');
    window._notice={blob,name,t,fine};const url=URL.createObjectURL(blob);
    modal({wide:1,title:'Notice ready',body:`<div class="split"><iframe src="${url}"></iframe><div><p class="muted">Stamped and dated. Send it straight to the tenant:</p><div class="dact"><button class="btn primary" data-act="noticeShare">Send on WhatsApp</button><a class="btn" href="${url}" download="${esc(name)}">Download PDF</a><a class="btn" href="${url}" target="_blank">Open full size</a></div><p class="hint">${t.mobile?'Tenant mobile: '+esc(t.mobile):'No mobile number saved for this tenant – choose the chat in WhatsApp.'}<br>On a phone this opens the share sheet with the PDF attached. On a computer the PDF downloads and WhatsApp Web opens so you can attach it.</p></div></div>`});
  }catch(e){toast(e.message||'Could not create the notice','err')}
};
actions.noticeShare=async()=>{const n=window._notice;if(!n)return;
  const file=new File([n.blob],n.name,{type:'application/pdf'});
  try{if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:'Late payment notice',text:'Late payment notice – '+n.t.tenant});return}}catch(e){if(e&&e.name==='AbortError')return}
  const a=document.createElement('a');a.href=URL.createObjectURL(n.blob);a.download=n.name;a.click();
  const num=waNum(n.t.mobile);window.open('https://wa.me/'+(num||'')+'?text='+encodeURIComponent('Dear '+n.t.tenant+', please find attached the late payment notice. Kindly settle the fine and any outstanding rent within the period stated.'),'_blank');
  toast('PDF downloaded – attach it in the WhatsApp chat','ok')};

async function buildNotice({t,i,fine,date,days}){
  const {jsPDF}=window.jspdf,doc=new jsPDF({unit:'pt',format:'a4'}),W=doc.internal.pageSize.getWidth(),H=doc.internal.pageSize.getHeight(),M=52,CW=W-2*M,A=window.NOTICE_ASSETS;
  const INK=[22,32,46],SL=[15,42,58],RED=[190,24,24],MUT=[100,110,122],ORG=[233,104,52];
  const flat=`Flat ${t.units.join('+')||'?'}, ${bname(t.building)}`,paid=i.done,due=addDays(date,days),unpaid=paid?0:i.bal,fm=n=>'AED '+money(n,n%1?2:0);
  const ref='LPN-'+date.replace(/-/g,'')+'-'+(t.units.join('')||'X')+'-'+i.no;
  /* letterhead: own vector mark */
  doc.setFillColor(...SL).roundedRect(M,40,44,44,9,9,'F');
  doc.setFillColor(255,255,255).rect(M+9,56,10,22,'F').rect(M+23,48,12,30,'F');doc.setFillColor(...ORG).rect(M+9,50,10,3,'F');
  doc.setFillColor(...SL).setDrawColor(...SL);[[M+12,60],[M+12,66],[M+12,72],[M+26,53],[M+26,59],[M+26,65],[M+26,71]].forEach(p=>{doc.setFillColor(...SL).rect(p[0],p[1],4,3,'F');});
  doc.setFont('helvetica','bold').setFontSize(17).setTextColor(...SL).text('THANI AL THANI',M+56,60);
  doc.setFont('helvetica','normal').setFontSize(8.5).setTextColor(...MUT).text('REAL ESTATE MANAGEMENT  ·  DUBAI',M+56,75,{charSpace:1});
  doc.setFontSize(9).setTextColor(...MUT).text('Date',W-M,50,{align:'right'});doc.setFont('helvetica','bold').setFontSize(11).setTextColor(...INK).text(longDate(date),W-M,64,{align:'right'});
  doc.setFont('helvetica','normal').setFontSize(8.5).setTextColor(...MUT).text('Ref '+ref,W-M,78,{align:'right'});
  doc.setDrawColor(...SL).setLineWidth(1.6).line(M,98,W-M,98);doc.setDrawColor(...ORG).setLineWidth(1.6).line(M,98,M+70,98);
  let y=126;doc.setFont('helvetica','bold').setFontSize(21).setTextColor(...RED).text('Notice of Late Payment Penalty',M,y);
  /* details card */
  y+=16;const rows=[['Tenant',t.tenant],['Unit',flat],['Ejari contract no.',t.ejari?.contractNo?String(t.ejari.contractNo):'—'],['Contract period',`${fd(t.start)} – ${fd(t.end)}`],['Annual rent',fm(t.annual)],['Cheque number',String(i.cheque?.no||'#'+i.no)],['Cheque amount',fm(chqFace(i))],['Cheque due date',fd(i.due)],['Actual deposit date',paid?(i.paidOn?fd(i.paidOn):'Paid late'):'NOT PAID AS OF WRITING'],['Days overdue',paid?String(i.paidOn?daysBetween(i.due,i.paidOn):0):String(Math.max(0,daysBetween(i.due,date)))]];
  const rh=26,ch=Math.ceil(rows.length/2)*rh+14;doc.setFillColor(245,247,250).setDrawColor(226,230,236).setLineWidth(.7).roundedRect(M,y,CW,ch,8,8,'FD');
  rows.forEach((r,k)=>{const cx=M+16+(k%2)*(CW/2),cy=y+20+Math.floor(k/2)*rh;doc.setFont('helvetica','normal').setFontSize(8).setTextColor(...MUT).text(r[0],cx,cy-6);const bad=/NOT PAID/.test(r[1]);doc.setFont('helvetica','bold').setFontSize(10).setTextColor(...(bad?RED:INK));doc.text(doc.splitTextToSize(r[1],CW/2-26)[0],cx,cy+5)});
  y+=ch+18;
  doc.setFont('helvetica','normal').setFontSize(10.5).setTextColor(...INK);
  const P=(txt,gap=10)=>{doc.setFont('helvetica','normal').setFontSize(10.5).setTextColor(...INK);const L=doc.splitTextToSize(txt,CW);doc.text(L,M,y);y+=L.length*14.5+gap};
  P('Dear Tenant,',8);
  P(`This letter serves as formal notification of a late payment fine regarding your tenancy at ${flat}. As per our records, the cheque below was not honoured by its due date. According to the terms of your signed tenancy agreement, a fine of ${fm(fine)} has been issued for this late payment.`,12);
  /* amounts */
  const lines=paid?[['Late payment fine',fm(fine)]]:[['Outstanding rent',fm(unpaid)],['Late payment fine',fm(fine)],['Total to pay',fm(r2(unpaid+fine))]];
  const bh=lines.length*19+14,bx=M;doc.setFillColor(255,255,255).setDrawColor(...SL).setLineWidth(1).roundedRect(bx,y,CW,bh,8,8,'FD');
  lines.forEach((l,k)=>{const ly=y+21+k*19,last=k===lines.length-1;doc.setFont('helvetica',last?'bold':'normal').setFontSize(last?12:10.5).setTextColor(...(last?RED:INK)).text(l[0],bx+16,ly);doc.text(l[1],bx+CW-16,ly,{align:'right'})});
  y+=bh+14;
  P(`Please settle ${paid?'the fine':'the total above'} within ${days} days of this notice, that is by ${longDate(due)}, by transfer to:`,8);
  { const B=landlordBank(); if(B.iban||B.accNo){ const items=[['Bank',B.bankName],['Account name',B.accName],['Account number',B.accNo],['IBAN',B.iban]].filter(x=>x[1]); const bh2=Math.ceil(items.length/2)*26+10; doc.setFillColor(245,247,250).setDrawColor(226,230,236).setLineWidth(.7).roundedRect(M,y-4,CW,bh2,6,6,'FD'); items.forEach((it,k)=>{const cx=M+14+(k%2)*(CW/2),cy=y+10+Math.floor(k/2)*26; doc.setFont('helvetica','normal').setFontSize(7.5).setTextColor(...MUT).text(it[0],cx,cy-1); doc.setFont('helvetica','bold').setFontSize(9.5).setTextColor(...INK).text(it[1],cx,cy+10)}); y+=bh2+10; doc.setFont('helvetica','normal').setFontSize(10.5).setTextColor(...INK) } }
  if(!paid){doc.setFont('helvetica','bold').setFontSize(10.5);const tx=doc.splitTextToSize('Building services, including air conditioning, electricity and water, will remain restricted until the outstanding rent and the fine have both been paid in full.',CW-28);
    doc.setFillColor(254,242,242).setDrawColor(...RED).setLineWidth(.9).roundedRect(M,y-4,CW,tx.length*14.5+18,6,6,'FD');doc.setFont('helvetica','bold').setFontSize(10.5).setTextColor(...RED).text(tx,M+14,y+14);doc.setFont('helvetica','normal').setTextColor(...INK);y+=tx.length*14.5+34}
  P('Failure to pay by the deadline will result in:',4);
  const nl=(n,txt)=>{const L=doc.splitTextToSize(txt,CW-30);doc.text(n+'.',M+10,y);doc.text(L,M+28,y);y+=L.length*14.5+2};
  nl(1,'Restriction of building services (air conditioning, electricity, water) until payment is made in full.');nl(2,'Legal action through the relevant authorities.');nl(3,'No renewal of your tenancy from our side – late or delayed payment affects renewal.');y+=6;
  P('All legal and administrative fees incurred during this process will be charged to the tenant.',22);
  doc.setFont('helvetica','normal').setTextColor(...INK).text('Sincerely,',M,y);y+=18;doc.setFont('helvetica','bold').text('Thani Al Thani Real Estate Management',M,y);
  const sy=y-40;doc.addImage(A.stamp,'PNG',W-M-120,sy,100,100);
  doc.setDrawColor(226,230,236).setLineWidth(.7).line(M,H-30,W-M,H-30);doc.setFont('helvetica','normal').setFontSize(7.5).setTextColor(...MUT).text('Issued by Thani Al Thani Real Estate Management · '+ref,M,H-18);
  return doc.output('blob');
}
/* add a "Notice" button to overdue rows */
const addBtn=h=>h.replace(/<button class="btn sm" data-act="payInst" data-t="([^"]+)" data-n="([^"]+)">Receive<\/button>/g,(m,t,n)=>m+` <button class="btn sm outline" data-act="penaltyNotice" data-t="${t}" data-n="${n}" title="Create a late payment notice PDF">Notice</button>`);
const _od=overdueTable;overdueTable=function(L,soon){const h=_od(L,soon);return soon?h:addBtn(h)};
window._addNoticeBtn=addBtn;
})();
