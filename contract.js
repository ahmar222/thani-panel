/* ===== Tenancy contract generator: fills the official Ejari form + landlord addendum ===== */
(function(){
const LL={name:'THANI RASHED ESSA THANI AL THANI',eid:'784-1985-8524054-6',email:'ahmar.sayyed222@gmail.com',phone:'+971504567813'};
const BLD={
  baraha:{bname:'NASSER AHMED LOOTAH',plot:'425437122',makani:'30310-97026',loc:'AL BARAHA'},
  muraqabat:{bname:'AL MURRAGGABAT BLDG',plot:'34-52',makani:'31495-95675',loc:'AL MURAQQABAT'}};
/* per-unit defaults read from the Ejari certificates: [type, area m2, DEWA premises no] - editable on the page */
const U0={
 'baraha:G1':['2BHK Flat','46','122015843'],'baraha:G2':['1BHK Flat','46','122015851'],'baraha:101':['2BHK Flat','46','122015860'],
 'baraha:102':['1BHK Flat','46','122015878'],'baraha:103':['2BHK Flat','46','122015886'],'baraha:201':['2BHK Flat','46','122015894'],
 'baraha:203':['2BHK Flat','46','122015916'],'baraha:301':['2BHK Flat','46','122015924'],'baraha:401':['2BHK Flat','46','122015959'],
 'baraha:403':['2BHK Flat','46','122015975'],'baraha:SHOP 1':['Shop','263','122015983'],
 'muraqabat:102':['2BHK Flat','505','124117546'],'muraqabat:103':['3BHK Flat','334','124117554'],'muraqabat:201':['2BHK Flat','334','124117562'],
 'muraqabat:202':['2BHK Flat','334','124117570'],'muraqabat:303':['3BHK Flat','100','124117619'],'muraqabat:401':['2BHK Flat','505','124117627'],
 'muraqabat:402':['2BHK Flat','334','124117635'],'muraqabat:403':['3BHK Flat','505','124117643']};
const OCC={'1':5,'2':9,'3':12};
const dewaFmt=s=>{s=String(s||'').replace(/\D/g,'');return s.length===9?`${s.slice(0,3)}-${s.slice(3,8)}-${s.slice(8)}`:String(s||'')};
const asc=s=>String(s==null?'':s).replace(/[‘’]/g,"'").replace(/[–—−]/g,'-').replace(/[^\x20-\x7E]/g,'?');
const num=n=>Number(n).toLocaleString('en-US',{minimumFractionDigits:(Math.round(n*100)%100)?2:0,maximumFractionDigits:2});
const dmy=s=>s?s.split('-').reverse().join('.'):'';
const longD=s=>{const [y,m,d]=s.split('-');return (+d)+' '+['January','February','March','April','May','June','July','August','September','October','November','December'][+m-1]+' '+y};
const words=n=>({1:'One',2:'Two',3:'Three',4:'Four',5:'Five',6:'Six',7:'Seven',8:'Eight',9:'Nine',10:'Ten',11:'Eleven',12:'Twelve'}[n]||String(n));

function unitInfo(b,no){
  const u=(D.units||[]).find(x=>x.id===b+':'+no)||{},ej=u.ej||{},s=U0[b+':'+no]||[],B=BLD[b]||{};
  const ptype=ej.ptype??s[0]??u.type??'Flat';
  return {b,no,bname:ej.bname??B.bname??'',plot:ej.plot??B.plot??'',makani:ej.makani??B.makani??'',loc:ej.loc??B.loc??'',
    propNo:ej.propNo??no,ptype,area:ej.area??s[1]??'',dewa:dewaFmt(ej.dewa??s[2]??''),parking:ej.parking??0,
    commercial:/shop|office|commercial/i.test(ptype+' '+(u.type||''))};
}
const tens=(b,no)=>(D.tenancies||[]).filter(t=>t.building===b&&t.units.includes(no));
const current=(b,no)=>tens(b,no).filter(t=>t.status==='active').sort((a,c)=>(c.end||'').localeCompare(a.end||''))[0];
const allUnits=()=>{const m=new Map();(D.units||[]).forEach(u=>m.set(u.id,{b:u.building,no:u.no}));(D.tenancies||[]).forEach(t=>t.units.forEach(n=>{const id=t.building+':'+n;if(!m.has(id))m.set(id,{b:t.building,no:n})}));
  return [...m.values()].sort((a,c)=>a.b.localeCompare(c.b)||String(a.no).localeCompare(String(c.no),undefined,{numeric:true}))};
const nextNo=()=>'EA-'+(((D.settings&&+D.settings.contractSeq)||8446)+1);

/* ---------------- page ---------------- */
function soon(t){const d=daysBetween(TODAY,t.end);return d<=120}
PAGES.contracts=()=>{
  D.contractDocs=D.contractDocs||[];
  const act=(D.tenancies||[]).filter(t=>t.status==='active');
  const due=act.filter(soon).sort((a,b)=>a.end.localeCompare(b.end));
  const dueRows=due.map(t=>{const d=daysBetween(TODAY,t.end);return `<tr><td><b>${esc(bshort(t.building))} ${esc(t.units.join('+'))}</b></td><td>${esc(t.tenant)}</td><td>${fd(t.end)} <span class="chip ${d<0?'red':'amber'}">${d<0?Math.abs(d)+' days ago':d+' days'}</span></td><td class="num">${money(t.annual)}</td><td class="num"><button class="btn primary sm" data-act="contractNew" data-id="${t.id}" data-mode="renew">Renew contract</button></td></tr>`}).join('');
  const unitRows=allUnits().map(u=>{const t=current(u.b,u.no),i=unitInfo(u.b,u.no);
    return `<tr><td><b>${esc(bshort(u.b))} ${esc(u.no)}</b></td><td>${esc(i.ptype)}${i.area?' · '+esc(i.area)+' m2':''}</td><td class="xs">${i.dewa?esc(i.dewa):'<span class="muted">add DEWA no.</span>'}</td><td>${t?esc(t.tenant)+' <span class="muted xs">till '+fd(t.end)+'</span>':'<span class="muted">Vacant</span>'}</td><td class="num nowrap">${t?`<button class="btn sm" data-act="contractNew" data-id="${t.id}" data-mode="renew">Renew</button> `:''}<button class="btn sm" data-act="contractNew" data-b="${u.b}" data-u="${esc(u.no)}" data-mode="new">New tenant</button> <button class="btn sm" data-act="unitEj" data-b="${u.b}" data-u="${esc(u.no)}">Details</button></td></tr>`}).join('');
  const log=D.contractDocs.slice(-8).reverse().map(c=>`<tr><td>${esc(c.no)}</td><td>${esc(bshort(c.building))} ${esc(c.unit)}</td><td>${esc(c.tenant)}</td><td>${fd(c.start)} - ${fd(c.end)}</td><td class="num">${money(c.annual)}</td><td class="xs">${fd(c.date)}</td></tr>`).join('');
  return `<div class="ph"><div><h2>Tenancy contracts</h2><p class="muted">One click makes the Ejari form and addendum: details filled in, signed and stamped.</p></div></div>
  <section class="card"><h3>Due for renewal</h3>${dueRows?`<div class="scroll"><table class="tbl"><thead><tr><th>Flat</th><th>Tenant</th><th>Ends</th><th class="num">Rent</th><th></th></tr></thead><tbody>${dueRows}</tbody></table></div>`:'<p class="muted">No contract ends in the next 120 days.</p>'}</section>
  <section class="card"><h3>All flats</h3><div class="scroll"><table class="tbl"><thead><tr><th>Flat</th><th>Type</th><th>DEWA premises</th><th>Tenant</th><th></th></tr></thead><tbody>${unitRows}</tbody></table></div></section>
  ${log?`<section class="card"><h3>Recently generated</h3><div class="scroll"><table class="tbl"><thead><tr><th>No.</th><th>Flat</th><th>Tenant</th><th>Period</th><th class="num">Rent</th><th>Made on</th></tr></thead><tbody>${log}</tbody></table></div></section>`:''}`;
};

/* ---------------- unit details ---------------- */
actions.unitEj=d=>{const i=unitInfo(d.b,d.u);
  modal({title:`${esc(bshort(d.b))} ${esc(d.u)} - Ejari details`,body:`<form data-form="unitEj"><input type="hidden" name="b" value="${d.b}"><input type="hidden" name="u" value="${esc(d.u)}">
  <p class="muted xs">These print on every contract for this flat. Building name, plot and Makani are the same for the whole building.</p>
  <div class="fg"><label>Property no.<input name="propNo" value="${esc(i.propNo)}"></label><label>Property type<input name="ptype" value="${esc(i.ptype)}" placeholder="2BHK Flat"></label>
  <label>Area (m2)<input name="area" value="${esc(i.area)}"></label><label>DEWA premises no.<input name="dewa" value="${esc(i.dewa)}" placeholder="122-01584-3"></label>
  <label>Building name<input name="bname" value="${esc(i.bname)}"></label><label>Location<input name="loc" value="${esc(i.loc)}"></label>
  <label>Plot no.<input name="plot" value="${esc(i.plot)}"></label><label>Makani no.<input name="makani" value="${esc(i.makani)}"></label>
  <label>Parking spaces<input type="number" min="0" name="parking" value="${i.parking}"></label></div>
  <div class="row end"><button type="button" class="btn" data-act="closeModal">Cancel</button><button class="btn primary">Save</button></div></form>`})};
forms.unitEj=f=>{const id=f.get('b')+':'+f.get('u');let u=D.units.find(x=>x.id===id);
  if(!u){u={id,building:f.get('b'),no:f.get('u'),type:''};D.units.push(u)}
  u.ej={};['propNo','ptype','area','dewa','bname','loc','plot','makani'].forEach(k=>u.ej[k]=(f.get(k)||'').trim());u.ej.parking=+f.get('parking')||0;
  closeModal();save();toast('Saved','ok')};

/* ---------------- contract form ---------------- */
actions.contractNew=d=>{
  let t=d.id?tenById(d.id):null,b=t?t.building:d.b,no=t?t.units[0]:d.u,renew=d.mode==='renew'&&t;
  const i=unitInfo(b,no),S=D.settings;
  const start=renew?addDays(t.end,1):TODAY,end=addDays(addMonths(start,12),-1);
  const annual=renew?t.annual:'',n=renew?(t.nCheques||4):4;
  const dep=renew?(t.deposit??Math.round((t.annual||0)*(S.depositPct||5)/100)):'';
  const e=renew&&t.ejari&&t.ejari.tenant?t.ejari.tenant:(renew?t.tenant:'');
  const comp=/\b(llc|l\.l\.c|est|trading|services|establishment|company|grocery)\b/i.test(e);
  modal({wide:1,title:renew?`Renew contract - ${esc(bshort(b))} ${esc(no)}`:`New tenant - ${esc(bshort(b))} ${esc(no)}`,body:`<form data-form="contractGen">
  <input type="hidden" name="b" value="${b}"><input type="hidden" name="u" value="${esc(no)}"><input type="hidden" name="mode" value="${renew?'renew':'new'}">
  <h4 class="fh">Tenant</h4>
  <div class="fg"><label class="wide2">Full name (as on Emirates ID / trade licence)<input name="tenant" value="${esc(e)}" required></label>
  <label>Emirates ID<input name="eid" value="${esc(renew?(t.eid||''):'')}" placeholder="784-xxxx-xxxxxxx-x"></label>
  <label>Mobile<input name="mobile" value="${esc(renew?(t.mobile||''):'')}" placeholder="+971..."></label>
  <label class="wide2">Email<input type="email" name="email" value="${esc(renew?(t.email||''):'')}"></label>
  <label>Trade licence no. (company only)<input name="tlic" value="${comp?'':''}"></label><label>Licensing authority<input name="tauth"></label></div>
  <h4 class="fh">Rent and dates</h4>
  <div class="fg"><label>Start date<input type="date" name="start" value="${start}" required></label><label>End date<input type="date" name="end" value="${end}" required></label>
  <label>Annual rent (AED)<input type="number" step="0.01" min="0" name="annual" value="${annual}" required></label>
  <label>Security deposit (AED)<input type="number" step="0.01" min="0" name="deposit" value="${dep}"></label>
  <label>Payments per year<select name="n">${[1,2,3,4,6,12].map(k=>`<option ${k==n?'selected':''}>${k}</option>`).join('')}</select></label>
  <label>Paid by<select name="pay"><option>Cheque</option><option>Bank transfer</option></select></label>
  <label>Late / returned cheque penalty (AED)<input type="number" name="penalty" value="${S.penalty||5000}"></label>
  <label>Contract no.<input name="no" value="${nextNo()}"></label>
  <label>Contract date<input type="date" name="date" value="${TODAY}"></label></div>
  <details><summary>Property details (from Ejari - change if needed)</summary><div class="fg" style="margin-top:10px">
  <label>Property no.<input name="propNo" value="${esc(t&&t.units.length>1?t.units.join('+'):i.propNo)}"></label><label>Property type<input name="ptype" value="${esc(i.ptype)}"></label>
  <label>Area (m2)<input name="area" value="${esc(i.area)}"></label><label>DEWA premises no.<input name="dewa" value="${esc(i.dewa)}"></label>
  <label>Building name<input name="bname" value="${esc(i.bname)}"></label><label>Location<input name="loc" value="${esc(i.loc)}"></label>
  <label>Plot no.<input name="plot" value="${esc(i.plot)}"></label><label>Makani no.<input name="makani" value="${esc(i.makani)}"></label>
  <label>Parking spaces<input type="number" min="0" name="parking" value="${i.parking}"></label>
  <label>Max occupancy<input type="number" min="1" name="occ" value="${OCC[(i.ptype.match(/(\d)\s*BHK/i)||[])[1]]||5}"></label></div></details>
  <div class="row end" style="margin-top:14px"><button type="button" class="btn" data-act="closeModal">Cancel</button><button class="btn primary">Create contract PDF</button></div></form>`})};

/* ---------------- libraries ---------------- */
let _pl=null;
function loadPdfLib(){if(window.PDFLib)return Promise.resolve();return _pl||(_pl=new Promise((ok,no)=>{const s=document.createElement('script');s.src=window.PDFLIB_SRC||'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js';s.onload=ok;s.onerror=()=>{_pl=null;no(new Error('Could not load the PDF library - check your internet'))};document.head.appendChild(s)}))}
const jsp=()=>window.loadJsPdf?window.loadJsPdf():Promise.reject(new Error('PDF library missing'));

function schedule(c){const n=c.n,base=r2(c.annual/n),out=[];let sum=0;
  for(let k=0;k<n;k++){const amt=k===n-1?r2(c.annual-sum):base;sum=r2(sum+amt);out.push({no:k+1,due:addMonths(c.start,Math.round(k*12/n)),amount:amt})}return out}

forms.contractGen=async f=>{
  const g=k=>(f.get(k)||'').trim();
  const c={b:g('b'),unit:g('u'),mode:g('mode'),tenant:g('tenant').toUpperCase(),eid:g('eid'),mobile:g('mobile'),email:g('email'),tlic:g('tlic'),tauth:g('tauth'),
    start:g('start'),end:g('end'),annual:+g('annual')||0,deposit:+g('deposit')||0,n:+g('n')||1,pay:g('pay')||'Cheque',penalty:+g('penalty')||0,no:g('no')||nextNo(),date:g('date')||TODAY,
    propNo:g('propNo'),ptype:g('ptype'),area:g('area'),dewa:g('dewa'),bname:g('bname'),loc:g('loc'),plot:g('plot'),makani:g('makani'),parking:+g('parking')||0,occ:+g('occ')||5};
  c.commercial=/shop|office|commercial/i.test(c.ptype);c.sched=schedule(c);c.bank=window.landlordBank?landlordBank():{};
  if(!c.tenant||!c.start||!c.end||!c.annual){toast('Add the tenant name, dates and rent','err');return}
  const btn=document.querySelector('#modal button.primary');if(btn){btn.disabled=true;btn.textContent='Creating...'}
  try{
    if(!(D.settings&&D.settings.signImg))toast('No signature uploaded yet - add it in Settings so it prints on the contract','err');
    const blob=await buildContract(c);
    D.contractDocs=D.contractDocs||[];D.contractDocs.push({no:c.no,date:c.date,building:c.b,unit:c.unit,tenant:c.tenant,start:c.start,end:c.end,annual:c.annual});
    const m=/^EA-(\d+)$/.exec(c.no);if(m&&+m[1]>(+D.settings.contractSeq||8446))D.settings.contractSeq=+m[1];save();
    const name=`Tenancy-contract_${bshort(c.b)}-${c.unit}_${c.start}.pdf`.replace(/\s+/g,'');
    window._contract={blob,name,c};const url=URL.createObjectURL(blob);
    modal({wide:1,title:'Contract ready',body:`<div class="split"><iframe src="${url}"></iframe><div><p class="muted">Ejari form + addendum, filled in, signed and stamped. The tenant signs and returns it.</p><div class="dact"><button class="btn primary" data-act="contractShare">Send on WhatsApp</button><a class="btn" href="${url}" download="${name}">Download PDF</a><button class="btn" data-act="closeModal">Done</button></div></div></div>`});
  }catch(e){console.error(e);toast(e.message||'Could not create the contract','err');if(btn){btn.disabled=false;btn.textContent='Create contract PDF'}}
};
actions.contractShare=async()=>{const n=window._contract;if(!n)return;
  const file=new File([n.blob],n.name,{type:'application/pdf'});
  try{if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:'Tenancy contract',text:'Tenancy contract - '+n.c.tenant});return}}catch(e){if(e&&e.name==='AbortError')return}
  const a=document.createElement('a');a.href=URL.createObjectURL(n.blob);a.download=n.name;a.click();
  let m=String(n.c.mobile||'').replace(/[^\d]/g,'');if(m.startsWith('00'))m=m.slice(2);else if(m.startsWith('0'))m='971'+m.slice(1);
  window.open('https://wa.me/'+m+'?text='+encodeURIComponent('Dear '+n.c.tenant+', please find attached your tenancy contract for '+bshort(n.c.b)+' '+n.c.unit+'. Kindly sign and return a copy.'),'_blank');
  toast('PDF downloaded - attach it in the WhatsApp chat','ok')};

/* ---------------- signature (kept in the private data file, never in the public site) ---------------- */
const _cs=PAGES.settings;
PAGES.settings=()=>{const h=_cs(),k=h.indexOf('<section class="card"><h3>Partners'),sg=D.settings.signImg;
  const card=`<section class="card"><h3>Mr Thani's signature</h3><p class="muted xs">Printed automatically on every contract. It is saved only in your private data, not on the public site.</p>
  <div class="row" style="align-items:center;gap:16px">${sg?`<img src="${sg}" alt="Signature" style="height:56px;background:#fff;border:1px solid var(--line,#e2e6ec);border-radius:8px;padding:6px">`:'<span class="muted">No signature added yet</span>'}
  <label class="btn">${sg?'Replace':'Upload signature'}<input type="file" accept="image/*" hidden data-act-change="signUpload"></label>${sg?'<button class="btn" data-act="signRemove">Remove</button>':''}</div></section>`;
  return k<0?h+card:h.slice(0,k)+card+h.slice(k)};
actions.signRemove=()=>{delete D.settings.signImg;save();refresh()};
document.addEventListener('change',e=>{const t=e.target;if(!(t.dataset&&t.dataset.actChange==='signUpload')||!t.files[0])return;const f=t.files[0];t.value='';
  const im=new Image();im.onload=()=>{const sc=Math.min(1,600/im.width),w=Math.round(im.width*sc),h=Math.round(im.height*sc),cv=document.createElement('canvas');cv.width=w;cv.height=h;const x=cv.getContext('2d');x.drawImage(im,0,0,w,h);
    const d=x.getImageData(0,0,w,h),a=d.data;let has=false;for(let i=0;i<a.length;i+=4){if(a[i+3]<250)has=true}
    if(!has)for(let i=0;i<a.length;i+=4){const l=(a[i]+a[i+1]+a[i+2])/3,al=Math.max(0,Math.min(1,(215-l)/120));a[i]=20;a[i+1]=30;a[i+2]=90;a[i+3]=Math.round(al*255)}
    x.putImageData(d,0,0);D.settings.signImg=cv.toDataURL('image/png');save();refresh();toast('Signature saved','ok')};
  im.onerror=()=>toast('Could not read that image','err');im.src=URL.createObjectURL(f)});

/* ---------------- build ---------------- */
async function buildContract(c){
  await Promise.all([loadPdfLib(),jsp()]);
  const {PDFDocument,StandardFonts,rgb}=window.PDFLib,A=window.NOTICE_ASSETS;
  const res=await fetch(window.EJARI_SRC||'ejari-template.pdf');if(!res.ok)throw new Error('Ejari form file is missing from the site');
  const out=await PDFDocument.load(await res.arrayBuffer());
  const font=await out.embedFont(StandardFonts.Helvetica),bold=await out.embedFont(StandardFonts.HelveticaBold);
  const SG=D.settings&&D.settings.signImg,sign=SG?await out.embedPng(SG):null,stamp=await out.embedPng(A.stamp);
  const [p1,p2,p3]=out.getPages(),H=842,ink=rgb(.05,.1,.32);
  const T=(p,x,y,s,o={})=>{s=asc(s);if(!s)return;let sz=o.size||9;const f=o.bold?bold:font;if(o.max)while(sz>5.5&&f.widthOfTextAtSize(s,sz)>o.max)sz-=.25;p.drawText(s,{x,y:H-y,size:sz,font:f,color:ink})};
  const dot=(p,x,y)=>p.drawCircle({x,y:H-y,size:3.2,color:ink});
  /* page 1 */
  T(p1,58,116,dmy(c.date));
  T(p1,112,179,LL.name,{max:340});T(p1,112,201,LL.name,{max:340});T(p1,112,224,LL.eid);T(p1,100,271,LL.email,{max:340});T(p1,100,293,LL.phone);
  T(p1,112,349,c.tenant,{max:340});T(p1,112,371,c.eid);T(p1,82,393,c.tlic,{max:200});T(p1,378,393,c.tauth,{max:95});T(p1,100,419,c.email,{max:340});T(p1,100,441,c.mobile);
  dot(p1,c.commercial?257:370,495);
  T(p1,100,521,c.plot,{max:190});T(p1,390,521,c.makani,{max:100});T(p1,100,544,c.bname,{max:190});T(p1,390,544,c.propNo,{max:100});
  T(p1,100,567,c.ptype,{max:190});T(p1,390,567,c.area,{max:95});T(p1,100,590,c.loc,{max:190});T(p1,390,590,c.dewa,{max:95});
  T(p1,118,646,dmy(c.start));T(p1,208,646,dmy(c.end));T(p1,362,646,'AED '+num(c.annual),{max:120});
  T(p1,84,671,'AED '+num(c.annual),{max:190});T(p1,398,671,'AED '+num(c.deposit),{max:100});T(p1,104,693,`${c.pay}, ${c.n} per year`,{max:380});
  T(p1,202,803,dmy(c.date),{size:8});T(p1,474,803,dmy(c.date),{size:8});
  const sg=(p,top)=>{if(sign)p.drawImage(sign,{x:395,y:H-(top+42),width:92,height:38});p.drawImage(stamp,{x:462,y:H-(top+58),width:58,height:58})};
  sg(p1,738);
  /* page 3: additional terms */
  const wrap=(s,sz,w)=>{const wd=asc(s).split(' '),ls=[];let cur='';wd.forEach(x=>{const t=cur?cur+' '+x:x;if(font.widthOfTextAtSize(t,sz)>w&&cur){ls.push(cur);cur=x}else cur=t});if(cur)ls.push(cur);return ls};
  const B=c.bank||{},tr=`Tenant can do bank transfer to ${B.accNo||''} - ${B.bankName||''} under Landlord name.`;
  const terms=[
    'This tenancy contract and the attached addendum shall be deemed integral parts of the entire agreement.',
    'All maintenance of '+(c.commercial?'unit':'flat')+' on tenant - upon leaving the '+(c.commercial?'unit':'flat')+', tenant will paint on own expense and return the '+(c.commercial?'unit':'flat')+' as received. All utility bill payment falls on tenant.',
    'Landlord will give 1 month notice for rent increase / non renewal of contract. 5% office commission to be applicable upon renewal + AED 500 EJARI issuance fees on Tenant.',
    `Bounced/Returned cheque for any reason or late transfer of payment will result in AED ${num(c.penalty)} administrative penalty payable immediately. ${tr}`,
    c.commercial?'Unit is for the licensed commercial activity only. No sub-letting without written consent of the Landlord.':`Max occupancy of ${c.ptype.replace(/\s*flat/i,'')} flat is ${c.occ} persons. No commercial activity is permitted inside the flat.`];
  terms.forEach((s,k)=>{const y=324+k*25,sz=7,ls=wrap(s,sz,415).slice(0,3);ls.forEach((l,j)=>T(p3,54,y-(ls.length>1?8:0)+j*8.5+(ls.length>1?0:0),l,{size:sz}))});
  T(p3,202,773,dmy(c.date),{size:8});T(p3,474,773,dmy(c.date),{size:8});sg(p3,708);
  /* addendum */
  const ab=await addendum(c);const ad=await PDFDocument.load(ab);
  (await out.copyPages(ad,ad.getPageIndices())).forEach(p=>out.addPage(p));
  out.setTitle('Tenancy contract '+c.no);out.setAuthor('Thani Real Estate');
  return new Blob([await out.save()],{type:'application/pdf'});
}

async function addendum(c){
  const {jsPDF}=window.jspdf,doc=new jsPDF({unit:'pt',format:'a4'}),W=595.28,H=841.89,M=54,CW=W-2*M,A=window.NOTICE_ASSETS;
  const INK=[22,32,46],MUT=[100,110,122],SL=[15,42,58];let y=70,pg=1;
  const head=()=>{doc.setFont('helvetica','bold').setFontSize(8).setTextColor(...SL).text('THANI REAL ESTATE MANAGEMENT',M,34);doc.setFont('helvetica','normal').setTextColor(...MUT).text('Addendum to Tenancy Contract No. '+asc(c.no),W-M,34,{align:'right'});doc.setDrawColor(220,225,232).setLineWidth(.6).line(M,42,W-M,42)};
  head();
  const room=h=>{if(y+h>H-60){doc.addPage();pg++;head();y=70}};
  const para=(t,o={})=>{const sz=o.size||9.5,ind=o.ind||0;doc.setFont('helvetica',o.bold?'bold':(o.it?'italic':'normal')).setFontSize(sz).setTextColor(...INK);const ls=doc.splitTextToSize(asc(t),CW-ind-(o.num?30:0));room(ls.length*sz*1.35+(o.gap??5));doc.setFontSize(sz).setTextColor(...INK);
    if(o.num){doc.setFont('helvetica','normal').text(o.num,M+ind,y)}doc.setFont('helvetica',o.bold?'bold':(o.it?'italic':'normal'));doc.text(ls,M+ind+(o.num?30:0),y,{lineHeightFactor:1.35});y+=ls.length*sz*1.35+(o.gap??5)};
  const head2=(n,t)=>{room(40);y+=6;doc.setFillColor(238,241,245).rect(M,y-12,CW,20,'F');doc.setFont('helvetica','bold').setFontSize(10).setTextColor(...SL).text(n+'   '+t,M+8,y+2);y+=24};
  const cl=(n,t)=>para(t,{num:n,gap:5});
  const L=LL,unit=asc(c.unit),B=c.bank||{};
  doc.setFont('helvetica','bold').setFontSize(17).setTextColor(...SL).text('ADDENDUM',W/2,y,{align:'center'});y+=18;
  doc.setFont('helvetica','normal').setFontSize(10.5).text('To Tenancy Contract No. '+asc(c.no),W/2,y,{align:'center'});y+=22;
  para('Effective date: this Addendum is effective from the date of the final signature affixed to it.',{it:1});
  para('BETWEEN:',{bold:1});
  para(`(1)  ${L.name}, with Emirates ID ${L.eid} (the Lessor);`,{ind:8});para('AND',{bold:1,gap:3});
  para(`(2)  ${c.tenant}${c.eid?', with Emirates ID '+c.eid:''}${c.tlic?', Trade Licence '+c.tlic:''} (the Tenant).`,{ind:8});
  para('The Lessor and the Tenant are together referred to as the Parties. The tenancy contract registered on Ejari, this Addendum and any schedules shall be read together as one agreement and supersede all earlier arrangements about the same subject. Where this Addendum adds to the Ejari contract, both apply.');
  head2('1','Property details');
  cl('1.1','Property type: '+(c.commercial?'Commercial - ':'Residential - ')+c.ptype+'.');
  cl('1.2',`Address: ${unit}, ${c.bname}, ${c.loc}. Plot no. ${c.plot}, Makani no. ${c.makani}${c.dewa?', DEWA premises no. '+c.dewa:''}${c.area?', area '+c.area+' m2':''}.`);
  cl('1.3','Furnishing: the Property is unfurnished.');cl('1.4',`Parking: ${c.parking} car parking space(s) provided with the Property.`);
  head2('2','Tenancy duration');
  cl('2.1','The tenancy is for a period of 1 year.');
  cl('2.2',`It starts on ${longD(c.start)} (the Contract Start Date) and ends on ${longD(c.end)}, unless renewed by agreement of the Parties.`);
  head2('3','Payment terms');
  cl('3.1',`Contract value: the Tenant shall pay a total rent of AED ${num(c.annual)} for the term.`);
  cl('3.2',`Rent is paid in ${words(c.n)} (${c.n}) instalment${c.n>1?'s':''} as follows. Payment is due on or before each date:`);
  c.sched.forEach(s=>{room(14);doc.setFont('helvetica','normal').setFontSize(9.5).setTextColor(...INK);doc.text(`Instalment ${s.no}`,M+48,y);doc.text(longD(s.due),M+150,y);doc.text('AED '+num(s.amount),M+CW-8,y,{align:'right'});y+=14});
  y+=4;
  if(c.pay==='Bank transfer')cl('3.3',`Payment method: bank transfer to the Lessor's account below, on or before each due date. No cheques are issued or deposited. Bank: ${asc(B.bankName)}; account name: ${asc(B.accName)}; account no. ${asc(B.accNo)}; IBAN ${asc(B.iban)}.`);
  else cl('3.3',`Payment method: cheque in the Lessor's name. The Tenant may also pay by bank transfer to: ${asc(B.bankName)}; account name ${asc(B.accName)}; account no. ${asc(B.accNo)}; IBAN ${asc(B.iban)}.`);
  cl('3.4',`Late payment: a bounced or returned cheque for any reason, or a late transfer of payment, results in an administrative penalty of AED ${num(c.penalty)} payable immediately. Building services may be restricted until the rent and the penalty are paid in full. Late or delayed payment can also result in no renewal of this tenancy.`);
  head2('4','Security deposit');
  cl('4.1',`The Tenant shall pay a security deposit of AED ${num(c.deposit)} on or before signing.`);
  cl('4.2','The deposit is returned after the Tenant has vacated, returned all keys and access cards and the Lessor has completed the move-out inspection.');
  cl('4.3','The cost of repairing damage, unpaid bills or items not left as received is deducted from the deposit. If the deposit is not enough, the Tenant pays the difference.');
  head2('5','Utilities, fees and charges');
  cl('5.1','The Tenant opens and pays all accounts for electricity, water and gas (DEWA), air conditioning, telecom and any service charges for the Property, and shows the final bills at move-out.');
  cl('5.2','Ejari registration: the Tenant pays the Ejari issuance fee of AED 500 for this contract and for each renewal.');
  head2('6','Maintenance');
  cl('6.1',`All maintenance and repair of the ${c.commercial?'unit':'flat'} is on the Tenant at the Tenant's own cost, including electrical, plumbing, air conditioning, fittings, blockages and damage, except where the law requires otherwise.`);
  cl('6.2','The Tenant gives access to the Lessor or its representative on 24 hours notice (immediately in an emergency) for inspection or viewings.');
  head2('7','Move-in and move-out');
  cl('7.1','On or before the Contract Start Date the Lessor hands over the keys and access cards.');
  cl('7.2',`On leaving, the Tenant paints the whole ${c.commercial?'unit':'flat'} at own expense and returns it clean and as received, hands back all keys and access cards, and gives proof that all utility bills are cleared. The Lessor then inspects the Property.`);
  head2('8','Renewal');
  cl('8.1','The Lessor gives 1 (one) month written notice (WhatsApp or email is accepted) for a rent increase or non-renewal of the contract.');
  cl('8.2','On renewal a 5% office commission on the annual rent applies, plus the AED 500 Ejari issuance fee, both payable by the Tenant.');
  head2('9','Termination');
  cl('9.1',`The Tenant may end the contract early by giving 90 days written notice and paying compensation equal to six (6) months rent (AED ${num(r2(c.annual/2))}). Any unused rent after that is refunded pro rata.`);
  cl('9.2','The Lessor may end the contract early in the cases set out in Article 25 of Dubai Law No. 33 of 2008, including unpaid rent 30 days after notice, sub-letting without approval, damage to the Property, or not following the contract terms after 30 days notice.');
  head2('10','General');
  cl('10.1',c.commercial?'The Property is used only for the licensed commercial activity and may not be sub-let, assigned or altered without the written consent of the Lessor.':`The Property is used only as a private residence. Maximum occupancy of the ${asc(c.ptype.replace(/\s*flat/i,''))} flat is ${c.occ} persons. No commercial activity is permitted inside the flat. No sub-letting or alteration without the written consent of the Lessor.`);
  cl('10.2','The Tenant is responsible for insurance of personal belongings, complies with building rules, fire and safety instructions, and is liable for fines and damage caused by the Tenant or guests.');
  cl('10.3','Any change to this Addendum must be in writing and signed by both Parties. If a clause is found invalid, the rest remains in force.');
  cl('10.4','Governing law is the law of the Emirate of Dubai. Disputes that cannot be settled amicably go to the Rental Disputes Centre.');
  cl('10.5','Electronic signatures are valid and binding for both Parties.');
  head2('11','Notices');
  cl('11.1','Notices are in English and sent by hand or email. An email is received on the day it is sent (next working day if after 5.00 pm).');
  cl('11.2',`Lessor: ${L.name}, ${L.email}, ${L.phone}.`);
  cl('11.3',`Tenant: ${c.tenant}${c.email?', '+c.email:''}${c.mobile?', '+c.mobile:''}.`);
  room(150);y+=10;para('Signed by the Parties or their authorised representatives on the date of this Addendum.',{bold:1});y+=6;
  const sy=y;doc.setFont('helvetica','bold').setFontSize(9).setTextColor(...INK).text('Signed for and on behalf of LESSOR',M,sy).text('Signed for and on behalf of TENANT',M+CW/2+10,sy);
  doc.setFont('helvetica','normal').text(L.name,M,sy+14).text(doc.splitTextToSize(c.tenant,CW/2-14),M+CW/2+10,sy+14);
  if(D.settings&&D.settings.signImg)doc.addImage(D.settings.signImg,'PNG',M+6,sy+22,100,42);doc.addImage(A.stamp,'PNG',M+104,sy+14,70,70);
  doc.setDrawColor(...MUT).setLineWidth(.6).line(M,sy+82,M+CW/2-14,sy+82).line(M+CW/2+10,sy+82,W-M,sy+82);
  doc.setFontSize(8).setTextColor(...MUT).text('Date: '+dmy(c.date),M,sy+94).text('Signature and date',M+CW/2+10,sy+94);
  const n=doc.getNumberOfPages();for(let i=1;i<=n;i++){doc.setPage(i);doc.setFont('helvetica','normal').setFontSize(8).setTextColor(...MUT).text(`Addendum page ${i} of ${n}  |  ${asc(c.bname)} ${unit}`,W/2,H-30,{align:'center'})}
  return doc.output('arraybuffer');
}
})();
