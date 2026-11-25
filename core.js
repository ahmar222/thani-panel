/* ===== Thani Real Estate - core: utils, storage, cloud sync, calculations ===== */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const r2=x=>Math.round((Number(x)||0)*100+(x<0?-1e-9:1e-9))/100;
const money=(n,d=2)=>(n==null||isNaN(n))?'—':Number(n).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
const aed=n=>'AED '+money(n,0);
const aed2=n=>'AED '+money(n,2);
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fd=s=>{if(!s)return '—';const [y,m,d]=s.split('-');return `${+d} ${MON[+m-1]} ${y}`};
const fdt=s=>{if(!s)return '—';const [y,m,d]=s.split('-');return `${+d} ${MON[+m-1]} ${String(y).slice(2)}`};
const _today=()=>{const q=new URLSearchParams(location.search).get('today');if(q)return q;const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
let TODAY=_today();
const dayN=s=>Math.round(Date.UTC(+s.slice(0,4),+s.slice(5,7)-1,+s.slice(8,10))/864e5);
const daysBetween=(a,b)=>dayN(b)-dayN(a);
const addDays=(s,n)=>{const d=new Date(dayN(s)*864e5+n*864e5);return d.toISOString().slice(0,10)};
const addMonths=(s,n)=>{let y=+s.slice(0,4),m=+s.slice(5,7)-1+n,d=+s.slice(8,10);y+=Math.floor(m/12);m=((m%12)+12)%12;const last=new Date(Date.UTC(y,m+1,0)).getUTCDate();return `${y}-${String(m+1).padStart(2,'0')}-${String(Math.min(d,last)).padStart(2,'0')}`};
const uid=p=>(p||'x')+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const monthKey=s=>s.slice(0,7);
const monthLabel=k=>{const [y,m]=k.split('-');return MON[+m-1]+' '+y};
const toast=(m,t='')=>{const e=document.createElement('div');e.className='toast '+t;e.textContent=m;$('#toasts').appendChild(e);setTimeout(()=>e.remove(),4200)};

/* ---------- crypto (login) ---------- */
const _enc=new TextEncoder(),_dec=new TextDecoder();
const b64=u8=>{let s='';for(let i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return btoa(s)};
const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function kdf(pw,email,salt,iter){
  const km=await crypto.subtle.importKey('raw',_enc.encode(pw),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt:_enc.encode(email.toLowerCase().trim()+'|'+salt),iterations:iter,hash:'SHA-256'},km,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
async function decryptCfg(pw,email){
  const c=window.CFG,key=await kdf(pw,email,c.salt,c.iter);
  const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(c.iv)},key,unb64(c.ct));
  return JSON.parse(_dec.decode(pt));
}

/* ---------- state ---------- */
let D=null, MODE='local', GHC=null, GHSHA=null, SYNC={state:'idle',msg:''}, _saveT=null, _pushing=false, _again=false;
const LS_DATA='thani_data_v1', LS_CRED='thani_cred_v1';
const setSync=(state,msg)=>{SYNC={state,msg:msg||'',at:state==='ok'?Date.now():(SYNC&&SYNC.at)||null};const e=$('#syncchip');if(e){const col={ok:'ok',busy:'busy',err:'err',idle:'idle',local:'local'}[state]||'idle';const hm=SYNC.at?new Date(SYNC.at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):'';e.className='sync '+col;e.innerHTML='<i class="dot"></i><span>'+({ok:'Synced '+hm,busy:'Saving…',err:'Not saved – '+esc(msg||''),idle:'',local:'Local only'}[state])+'</span>'}};
function save(){
  D.rev=(D.rev||0)+1;
  try{localStorage.setItem(LS_DATA,JSON.stringify({dirty:MODE==='cloud',d:D}))}catch(e){}
  if(MODE==='cloud'){setSync('busy');clearTimeout(_saveT);_saveT=setTimeout(push,900)} else setSync('local');
  if(window.refresh)refresh();
}
function ghApi(path,opt={}){
  return fetch(`https://api.github.com/repos/${GHC.owner}/${GHC.repo}/contents/${path}`+(opt.q||''),{method:opt.method||'GET',cache:'no-store',body:opt.body,
    headers:{Authorization:'Bearer '+GHC.token,Accept:opt.raw?'application/vnd.github.raw+json':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}});
}
async function ghLoad(){
  const r=await ghApi('data.json',{q:'?ref='+encodeURIComponent(GHC.branch)});
  if(r.status===404)return null;
  if(!r.ok)throw new Error('GitHub '+r.status+(r.status===401?' (token invalid/expired)':''));
  const j=await r.json();GHSHA=j.sha;
  let txt;
  if(j.content)txt=_dec.decode(unb64(j.content.replace(/\n/g,'')));
  else{const rr=await ghApi('data.json',{q:'?ref='+encodeURIComponent(GHC.branch),raw:1});txt=await rr.text()}
  return JSON.parse(txt);
}
async function push(){
  if(_pushing){_again=true;return}
  _pushing=true;
  try{
    const body=JSON.stringify({message:'update '+new Date().toISOString().slice(0,16).replace('T',' '),branch:GHC.branch,sha:GHSHA||undefined,content:b64(_enc.encode(JSON.stringify(D,null,1)))});
    const r=await ghApi('data.json',{method:'PUT',body});
    if(r.status===409||r.status===422){_pushing=false;return conflict()}
    if(!r.ok)throw new Error('GitHub '+r.status);
    const j=await r.json();GHSHA=j.content.sha;
    try{localStorage.setItem(LS_DATA,JSON.stringify({dirty:false,d:D}))}catch(e){}
    setSync('ok');
  }catch(e){setSync('err',e.message||'offline - will retry on next change')}
  _pushing=false;
  if(_again){_again=false;push()}
}
async function conflict(){
  const remote=await ghLoad();
  modal({title:'Data changed on another device',body:`<p>The cloud copy was updated elsewhere (rev ${remote?.rev}) – this device has rev ${D.rev}.</p>
   <div class="row"><button class="btn" data-act="useRemote">Use cloud version (discard my unsynced edits)</button><button class="btn primary" data-act="forcePush">Overwrite cloud with mine</button></div>`,small:1});
  window._remote=remote;
}
function useRemote(){D=window._remote;try{localStorage.setItem(LS_DATA,JSON.stringify({dirty:false,d:D}))}catch(e){};closeModal();setSync('ok');refresh()}
function forcePush(){closeModal();push()}

/* ---------- files ---------- */
const IDB={db:null,open(){return this.db||(this.db=new Promise((res,rej)=>{const r=indexedDB.open('thani_files',1);r.onupgradeneeded=()=>r.result.createObjectStore('f');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}))},
  async put(k,v){const db=await this.open();return new Promise((res,rej)=>{const t=db.transaction('f','readwrite');t.objectStore('f').put(v,k);t.oncomplete=res;t.onerror=()=>rej(t.error)})},
  async get(k){const db=await this.open();return new Promise((res,rej)=>{const r=db.transaction('f').objectStore('f').get(k);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}};
async function shrinkImage(file){
  if(!/^image\//.test(file.type)||file.size<500000)return file;
  const bmp=await createImageBitmap(file),sc=Math.min(1,1600/Math.max(bmp.width,bmp.height));
  const c=document.createElement('canvas');c.width=bmp.width*sc;c.height=bmp.height*sc;c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);
  const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',.78));
  return new File([blob],file.name.replace(/\.\w+$/,'')+'.jpg',{type:'image/jpeg'});
}
async function storeFile(file,label){
  file=await shrinkImage(file);
  const safe=file.name.replace(/[^\w.\-]+/g,'_').slice(-60),path=`files/${Date.now().toString(36)}-${safe}`;
  const meta={path,name:file.name,type:file.type,size:file.size,label:label||'',added:TODAY};
  if(MODE==='cloud'){
    const buf=new Uint8Array(await file.arrayBuffer());
    const r=await ghApi(path,{method:'PUT',body:JSON.stringify({message:'add file '+safe,branch:GHC.branch,content:b64(buf)})});
    if(!r.ok)throw new Error('File upload failed ('+r.status+')');
  }else await IDB.put(path,file);
  return meta;
}
async function openFile(path,name){
  try{
    let blob;
    if(MODE==='cloud'){const r=await ghApi(path,{q:'?ref='+encodeURIComponent(GHC.branch),raw:1});if(!r.ok)throw new Error(r.status);blob=await r.blob()}
    else blob=await IDB.get(path);
    if(!blob)throw new Error('file not found');
    const ext=(name||path).split('.').pop().toLowerCase();
    const type=blob.type||({pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png'}[ext]||'application/octet-stream');
    window.open(URL.createObjectURL(new Blob([blob],{type})),'_blank');
  }catch(e){toast('Could not open file: '+e.message,'err')}
}

/* ---------- PDF text (for Ejari + receipts) ---------- */
let _pdfP=null;
function loadPdfJs(){
  if(window.pdfjsLib)return Promise.resolve();
  return _pdfP||(_pdfP=new Promise(async(res,rej)=>{
    try{
      const base=window.PDFJS_BASE||'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
      await new Promise((ok,no)=>{const s=document.createElement('script');s.src=base+'pdf.min.js';s.onload=ok;s.onerror=()=>no(new Error('pdf.js could not load (offline?)'));document.head.appendChild(s)});
      const w=await (await fetch(base+'pdf.worker.min.js')).blob();
      pdfjsLib.GlobalWorkerOptions.workerSrc=URL.createObjectURL(w);res();
    }catch(e){_pdfP=null;rej(e)}
  }));
}
async function pdfText(file){
  await loadPdfJs();
  const doc=await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;let out='';
  for(let p=1;p<=doc.numPages;p++){
    const tc=await (await doc.getPage(p)).getTextContent(),L={};
    for(const it of tc.items){const y=Math.round(it.transform[5]/3);(L[y]=L[y]||[]).push(it)}
    for(const y of Object.keys(L).map(Number).sort((a,b)=>b-a))out+=L[y].sort((a,b)=>a.transform[4]-b.transform[4]).map(i=>i.str).join(' ')+'\n';
  }
  return out;
}

/* ---------- photo / screenshot reader (OCR, runs in the browser) ---------- */
let _ocrP=null,_ocrW=null;
function loadOcr(){
  if(window.Tesseract)return Promise.resolve();
  return _ocrP||(_ocrP=new Promise((res,rej)=>{
    const base=window.OCR_BASE||'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/';
    const s=document.createElement('script');s.src=base+'tesseract.min.js';s.onload=res;s.onerror=()=>{_ocrP=null;rej(new Error('Photo reader could not load (offline?)'))};document.head.appendChild(s);
  }));
}
async function prepImage(file){
  const bmp=await createImageBitmap(file),L=Math.max(bmp.width,bmp.height),sc=L>3000?3000/L:(L<2400?2400/L:1);
  const c=document.createElement('canvas');c.width=Math.round(bmp.width*sc);c.height=Math.round(bmp.height*sc);
  const x=c.getContext('2d');x.filter='grayscale(1) contrast(1.25)';x.drawImage(bmp,0,0,c.width,c.height);return c;
}
async function ocrImage(file){
  await loadOcr();
  if(!_ocrW){
    const base=window.OCR_BASE||'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/';
    _ocrW=Tesseract.createWorker('eng',1,{workerPath:base+'worker.min.js',corePath:window.OCR_CORE||'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1/',langPath:window.OCR_LANG||'https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng/4.0.0_best_int',gzip:window.OCR_GZIP!==false});
  }
  const w=await _ocrW;const r=await w.recognize(await prepImage(file));return r.data.text;
}
/* text from a PDF or a photo/screenshot */
async function docText(file){
  if(file.type==='application/pdf')return pdfText(file);
  if(/^image\//.test(file.type)){toast('Reading the photo… (first time takes ~20 seconds)');return ocrImage(file)}
  throw new Error('Please use a PDF or an image');
}
/* any receipt file (PDF or photo) -> parsed fields */
async function readReceiptFile(file){
  let txt;
  if(file.type==='application/pdf')txt=await pdfText(file);
  else if(/^image\//.test(file.type)){toast('Reading the photo… (the first time takes ~20 seconds)');txt=await ocrImage(file)}
  else return {};
  const info=Parse.parseReceipt(txt);info.rawText=txt;
  if(!info.date&&file.lastModified&&file.type!=='application/pdf'){info.date=new Date(file.lastModified+4*3600e3).toISOString().slice(0,10);info.dateGuessed=true}
  return info;
}

/* ---------- calculations ---------- */
const tenLabel=t=>`${t.building?bname(t.building)+' ':''}${t.units.length?t.units.join('+'):'(flat?)'} – ${t.tenant}`;
const bname=id=>id==='both'?'Both buildings':(D.buildings.find(b=>b.id===id)?.name||'Unassigned');
const bshort=id=>id==='baraha'?'Baraha':id==='muraqabat'?'Muraqabat':id==='both'?'Both':'—';
const chqFace=(i)=>i.cheque?.amountFace||r2(((i.gross??i.amount)||0)+(i.deposit||0));
function calc(asOf){
  const S=D.settings,tol=S.tol??10,grace=S.graceDays||0,T=TODAY;
  const posted=D.entries.filter(e=>e.status!=='pending');
  const ten={};
  D.tenancies.forEach(t=>{ten[t.id]={t,insts:t.installments.map(i=>{const dsc=Math.min(+i.discount||0,i.amount||0),net=r2(i.amount-dsc);return {...i,gross:i.amount,disc:dsc,amount:net,paid:i.settled&&!i.cancelled?net:0,allocs:[],pen:0,tid:t.id,t}})}});
  /* rent allocation: explicit cheque no. first, otherwise oldest unpaid first */
  const rents=posted.filter(e=>e.kind==='income'&&e.cat==='rent'&&e.tenancyId&&ten[e.tenancyId]).sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0);
  for(const e of rents){
    const L=ten[e.tenancyId].insts;let left=e.amount;
    const ex=e.instNo&&L.find(i=>i.no==e.instNo);
    if(ex){ex.paid=r2(ex.paid+left);ex.allocs.push({date:e.date,amt:left});continue}
    for(const i of L){
      if(left<=0.004)break;if(i.settled||i.cancelled)continue;
      const room=r2(i.amount-i.paid);if(room<=tol&&room<left)continue;if(room<=0)continue;
      const a=Math.min(left,room);i.paid=r2(i.paid+a);i.allocs.push({date:e.date,amt:a});left=r2(left-a);
    }
    if(left>0.004&&L.length){const i=L.filter(z=>!z.cancelled).pop()||L[L.length-1];i.paid=r2(i.paid+left);i.allocs.push({date:e.date,amt:left})}
  }
  for(const e of posted.filter(e=>e.kind==='income'&&e.cat==='penalty'&&e.tenancyId&&ten[e.tenancyId])){
    const i=ten[e.tenancyId].insts.find(x=>x.no==e.instNo);if(i)i.pen=r2(i.pen+e.amount);
  }
  const overdue=[],soon=[],lateNoDecision=[];let chqHeld=0,chqHeldN=0;const arrears=[];
  for(const k in ten){
    const x=ten[k];x.depPaid=0;x.depRefund=0;
    posted.forEach(e=>{if(e.tenancyId===k){if(e.kind==='income'&&e.cat==='deposit')x.depPaid=r2(x.depPaid+e.amount);if(e.kind==='expense'&&e.cat==='deposit_refund')x.depRefund=r2(x.depRefund+e.amount)}});
    x.depHeld=r2(x.depPaid-x.depRefund-(x.t.moveOut?.deduction||0));x.depDue=x.t.deposit??null;
    x.depShort=x.depDue==null?0:Math.max(0,r2(x.depDue-x.depPaid));
    if(x.depShort<=tol)x.depShort=0;
    x.paid=0;x.total=0;x.outstanding=0;x.next=null;
    for(const i of x.insts){
      i.bal=r2(i.amount-i.paid);i.done=!!i.settled||!!i.cancelled||i.bal<=tol;
      let cum=0;i.paidOn=null;
      if(i.settled)i.paidOn=null;else for(const a of i.allocs.sort((p,q)=>p.date<q.date?-1:1)){cum+=a.amt;if(cum>=i.amount-tol){i.paidOn=a.date;break}}
      i.lateDays=(!i.settled&&i.done&&i.paidOn&&daysBetween(i.due,i.paidOn)>grace)?daysBetween(i.due,i.paidOn):0;
      i.openLate=(!i.done&&daysBetween(i.due,T)>grace)?daysBetween(i.due,T):0;
      i.status=i.cancelled?'cancelled':i.settled?'settled':i.done?'paid':i.paid>0?(i.openLate?'overdue':'partial'):i.openLate?'overdue':daysBetween(T,i.due)<=30?'soon':'upcoming';
      const fee=D.lateFees.find(f=>f.tenancyId===k&&f.no==i.no);i.fee=fee||null;
      i.needsFee=!fee&&(i.lateDays>0&&i.paidOn>=S.penaltyFrom);
      if(!i.cancelled){x.total=r2(x.total+i.amount);x.paid=r2(x.paid+Math.min(i.paid,i.amount))}
      if(x.t.status!=='active'&&!i.done&&!i.cancelled&&!i.written){arrears.push(i)}
      if(x.t.status==='active'){
        if(!i.done){x.outstanding=r2(x.outstanding+i.bal);if(i.openLate)overdue.push(i);else if(i.status==='soon')soon.push(i);if(!x.next)x.next=i}
        if(i.needsFee)lateNoDecision.push(i);
        if(i.cheque&&['held','deposited'].includes(i.cheque.status)&&!i.done){chqHeld=r2(chqHeld+chqFace(i));chqHeldN++}
      }
    }
  }
  overdue.sort((a,b)=>a.due<b.due?-1:1);soon.sort((a,b)=>a.due<b.due?-1:1);
  /* money */
  /* accounting only looks at the current books year (after a year-end close); tenants always use every entry */
  const ys=S.yearStart||'',acc=posted.filter(e=>(!ys||e.date>=ys)&&(!asOf||e.date<=asOf));
  const inc=acc.filter(e=>e.kind==='income'),exp=acc.filter(e=>e.kind==='expense'),pay=acc.filter(e=>e.kind==='payout');
  const pAll=posted.filter(e=>!asOf||e.date<=asOf);
  const sum=a=>r2(a.reduce((s,e)=>s+e.amount,0));
  const depIn=sum(pAll.filter(e=>e.kind==='income'&&e.cat==='deposit')),depOut=sum(pAll.filter(e=>e.kind==='expense'&&e.cat==='deposit_refund'));
  const cash=r2(S.openingCash+sum(inc.filter(e=>e.cat!=='carry'))-sum(exp)-sum(pay));
  let pool=S.holdDeposits?sum(inc.filter(e=>e.cat!=='deposit'))-sum(exp.filter(e=>e.cat!=='deposit_refund')):sum(inc)-sum(exp);
  pool=r2(pool+(S.holdDeposits?retained:0));
  const mg=pool>0?r2(pool*S.mgmtPct/100):0,resv=ys?0:S.reserve,dist=r2(pool-mg-resv),BF=S.bf||{};
  const totArea=D.partners.reduce((s,p)=>s+(+p.areaM||0)+(+p.areaB||0),0);
  const partners=D.partners.map(p=>{
    const area=r2((+p.areaM||0)+(+p.areaB||0)),share=area/totArea;
    const bf=r2(+BF[p.id]||0),entl=r2(dist*share+(p.manager?mg:0)+bf);
    const paid=sum(pay.filter(e=>e.partnerId===p.id&&!e.prior));
    return {p,area,share,entl,bf,share_amt:r2(dist*share),fee:p.manager?mg:0,paid,owed:r2(entl-paid)};
  });
  const retained=r2(D.tenancies.reduce((s,t)=>s+(t.moveOut?.deduction||0),0));
  const pending=D.entries.filter(e=>e.status==='pending');
  const lastEntry=posted.reduce((m,e)=>e.date>m&&e.cat!=='carry'?e.date:m,'');
  return {ten,overdue,soon,lateNoDecision,chqHeld,chqHeldN,cash,pool,mg,dist,resv,yearStart:ys,bfTotal:r2(partners.reduce((s,x)=>s+x.bf,0)),partners,totArea,depHeld:r2(depIn-depOut-retained),retained,arrears,pending,
    pendingAmt:sum(pending.filter(e=>e.kind==='income')),owedTotal:r2(partners.reduce((s,x)=>s+x.owed,0)),lastEntry,
    income:sum(inc),expenses:sum(exp)};
}
function unitStates(C){
  C=C||CC;const out=[];
  D.units.forEach(u=>{
    const act=D.tenancies.filter(t=>t.status==='active'&&t.building===u.building&&t.units.includes(u.no));
    const t=act.sort((a,b)=>a.start<b.start?1:-1)[0];
    const past=D.tenancies.filter(t=>t.status!=='active'&&t.building===u.building&&t.units.includes(u.no)).sort((a,b)=>((b.vacatedOn||b.endedOn||b.end)>(a.vacatedOn||a.endedOn||a.end))?1:-1)[0];
    let st='vacant',days=null,od=0;
    if(t){const x=C.ten[t.id];od=x?x.insts.filter(i=>i.status==='overdue').length:0;days=daysBetween(TODAY,t.end);st=od?'overdue':days<=60?'ending':'occupied'}
    out.push({u,t,st,days,od,past,vacantSince:!t&&past?(past.vacatedOn||past.endedOn||past.end):null});
  });
  return out;
}
function series12(){
  const months=[];let m=monthKey(TODAY);for(let k=0;k<12;k++){months.unshift(m);m=monthKey(addMonths(m+'-01',-1))}
  const inn={},out={};months.forEach(m=>{inn[m]=0;out[m]=0});
  const ys=D.settings.yearStart||'';
  D.entries.filter(e=>e.status!=='pending'&&e.cat!=='carry'&&(!ys||e.date>=ys)).forEach(e=>{const m=monthKey(e.date);if(!(m in inn))return;if(e.kind==='income')inn[m]+=e.amount;else if(e.kind==='expense')out[m]+=e.amount});
  return months.map(m=>({m,inn:r2(inn[m]),out:r2(out[m]),cash:cashAsOf(addMonths(m+'-01',1)>TODAY?TODAY:addDays(addMonths(m+'-01',1),-1))}));
}
function cashAsOf(date){
  const S=D.settings,ys=S.yearStart||'',old=ys&&date<ys;
  const p=D.entries.filter(e=>e.status!=='pending'&&e.date<=date&&(old||!ys||e.date>=ys));let c=old?(S.openingCashOrig??S.openingCash):S.openingCash;
  p.forEach(e=>{if(e.kind==='income'&&e.cat!=='carry')c+=e.amount;else if(e.kind==='expense'||e.kind==='payout')c-=e.amount});return r2(c);
}
function alerts(C){
  const A=[],T=TODAY,add=(lvl,txt,link)=>A.push({lvl,txt,link});
  D.tenancies.filter(t=>t.status==='active').forEach(t=>{
    const lab=tenLabel(t),dl=daysBetween(T,t.end);
    if(dl<0)add('red',`Contract ended ${-dl} days ago – ${lab}. Renew or end tenancy.`,'#/tenant/'+t.id);
    else if(dl<=60)add('amber',`Contract ends in ${dl} days (${fd(t.end)}) – ${lab}`,'#/tenant/'+t.id);
    if(t.visaExpiry){const v=daysBetween(T,t.visaExpiry);if(v<0)add('red',`Visa expired ${-v} days ago (${fd(t.visaExpiry)}) – ${t.tenant}`,'#/tenant/'+t.id);else if(v<=60)add('amber',`Visa expires ${fd(t.visaExpiry)} – ${t.tenant}`,'#/tenant/'+t.id)}
    if(t.needsUnit)add('red',`Assign a flat to ${t.tenant} (cheques recorded without flat)`,'#/tenant/'+t.id);
    const bad=t.installments.filter(i=>i.cheque?.status==='bounced');if(bad.length)add('red',`${bad.length} bounced cheque(s) – ${lab}`,'#/tenant/'+t.id);
  });
  D.tenancies.filter(t=>t.status!=='active').forEach(t=>{const x=C.ten[t.id];if(!x)return;
    if(x.depHeld>0.5&&!t.depositSettled)add('amber',`Moved out: ${aed(x.depHeld)} deposit still held – ${tenLabel(t)}. Refund or deduct it.`,'#/tenant/'+t.id);
    const ar=x.insts.filter(i=>!i.done&&!i.cancelled);if(ar.length)add('red',`Left with ${aed(ar.reduce((s,i)=>s+i.bal,0))} unpaid – ${tenLabel(t)}`,'#/tenant/'+t.id)});
  D.contracts.forEach(c=>{if(c.renewal){const d=daysBetween(T,c.renewal);if(d<0)add('red',`${c.type} (${c.vendor}, ${bshort(c.building)}) renewal overdue since ${fd(c.renewal)}`,'#/costs');else if(d<=45)add('amber',`${c.type} (${c.vendor}, ${bshort(c.building)}) renews ${fd(c.renewal)}`,'#/costs')}});
  const u=unpaidSalaries();if(u.length)add('amber',`${u.reduce((s,x)=>s+x.months.length,0)} month(s) of watchman salary not recorded as paid (${u.map(x=>x.s.name).join(', ')})`,'#/costs');
  if(C.lateNoDecision.length)add('amber',`${C.lateNoDecision.length} late-paid cheque(s) – decide late penalty (charge / discount / waive)`,'#/overdue');
  if(C.pending.length)add('blue',`${C.pending.length} receipt(s) waiting to be assigned to a flat (${aed(C.pendingAmt)})`,'#/receipts');
  return A;
}
function unpaidSalaries(){
  const paid=new Set();D.entries.forEach(e=>e.salaryMonths&&e.salaryMonths.forEach(m=>paid.add(m)));
  const cur=monthKey(TODAY);
  return D.staff.map(s=>{const months=[];let m=s.startMonth;while(m<=cur){if(!paid.has(m)&&!(s.skip||[]).includes(m))months.push(m);m=monthKey(addMonths(m+'-01',1))}return {s,months}}).filter(x=>x.months.length);
}
function paidSalaryMonths(){const p={};D.entries.forEach(e=>e.salaryMonths&&e.salaryMonths.forEach(m=>p[m]=e));return p}
