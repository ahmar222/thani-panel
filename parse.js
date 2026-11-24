/* Document readers: Ejari certificate + bank transfer receipts. Pure functions (work in browser & node). */
(function(root){
const clean=t=>String(t).replace(/[^\x20-\x7E\n]/g,' ').replace(/[ \t]+/g,' ').replace(/ *\n */g,'\n').trim();
const num=s=>s==null?null:parseFloat(String(s).replace(/,/g,''));
const dmy=s=>{const m=/(\d{2})[-\/](\d{2})[-\/](\d{4})/.exec(s||'');return m?`${m[3]}-${m[2]}-${m[1]}`:null};
const trim=(s,labels='')=>{if(!s)return s;s=s.replace(new RegExp('\\s+('+(labels||'ZZZZ')+')$'),'');let a=s.split(' ');while(a.length>1&&(a[a.length-1].length<2||a[a.length-1]=='/'))a.pop();return a.join(' ').trim()};
const tc=s=>s.toLowerCase().replace(/\b[a-z]/g,c=>c.toUpperCase());

function parseEjari(raw){
  const t=clean(raw).replace(/\n/g,' ').replace(/ +/g,' ');
  const g=(re,i=1)=>{const m=re.exec(t);return m?m[i].trim():null};
  const o={};
  o.contractNo=g(/Contract No:? (\d{10,})/);
  o.regDate=dmy(g(/Registration Date:? (\d{2}-\d{2}-\d{4})/));
  o.owner=trim(g(/Owner Name ((?:[A-Z]+ ?)+)/));if(o.owner)o.owner=o.owner.replace(/\b(ALTHANI|ALMAZROUI|ALSUWAIDI|ALMUHAIRI)\b.*$/,'$1');
  o.start=dmy(g(/(?<!Grace )Start Date (\d{2}-\d{2}-\d{4})/));
  o.end=dmy(g(/(?<!Grace )End Date (\d{2}-\d{2}-\d{4})/));
  o.deposit=num(g(/Security Deposit ([\d,.]+) AED/));
  o.amount=num(g(/Contract Amount ([\d,.]+) AED/));
  o.annual=num(g(/(?<!Actual )Annual Amount ([\d,.]+) AED/));
  const tn=/Tenant Name ((?:[A-Z][A-Z.'-]*\s?)+)/.exec(t)&&/Tenant Name ((?:[A-Z][A-Z.'-]*\s?)+)/.exec(t)[1].trim().length>2?/Tenant Name ((?:[A-Z][A-Z.'-]*\s?)+)/.exec(t):/Tenant Name ((?:[A-Za-z.'-]+ ?)+)/.exec(t); o.tenant=tn?trim(tn[1].trim().replace(/\s+/g,' '),'Tenant No'):null;
  o.tenantNo=g(/Tenant No (\d+)/);
  const nat=/Tenant No \d+ Nationality ((?:[A-Za-z]+ ?)+)/.exec(t)||/Tenant No \d+\W+(?:\S{1,5}\W+){0,2}Nationality ([A-Z][a-z]+(?: [A-Z][a-z]+)?)/.exec(t); o.nationality=nat?trim(nat[1].trim(),'Passport'):null;
  let m=/Passport\/Expiry (\S+) \/ (\d{2}-\d{2}-\d{4})/.exec(t); if(m){o.passport=m[1];o.passportExpiry=dmy(m[2])}else{m=/Passport\/Expiry\W*([A-Z0-9]{6,12}?)\s*[\/ ]\s*(\d{2})-?(\d{2})-?(\d{4})/.exec(t);if(m){o.passport=m[1];o.passportExpiry=`${m[4]}-${m[3]}-${m[2]}`}}
  o.eid=g(/(784-?\d{4}-?\d{7}-?\d)/);
  m=/Visa No & Expiry (\d+) \/ (\d{2}-\d{2}-\d{4})/.exec(t); if(m){o.visaNo=m[1];o.visaExpiry=dmy(m[2])}
  let mob=g(/Mobile No (\+?\d{8,15})/); if(mob){mob=mob.replace(/^0{0,2}971/,'+971').replace(/^00/,'+'); o.mobile=mob}
  o.buildingName=trim(g(/Building Name\/No ((?:[A-Z0-9\-\/&.]+ ?)+)/));
  o.plot=g(/Plot Number ([\d-]+)/i); o.dm=g(/Affection Plan\) ([\d-]+)/); o.makani=g(/Makani No (\d+ ?\d*)/);
  m=/(\S+) (Flat|Shop|Office|Villa|Warehouse|Room) (.+?) (Residential|Commercial|Industrial|Hospitality) ([\d.]+) \([A-Za-z]{0,2}\.?m\) (\d+)/.exec(t);
  if(m){o.propertyNo=m[1];o.propType=m[2];o.subType=m[3];o.usage=m[4];o.size=m[5];o.premises=m[6]}
  o.fees=num(g(/Total Fees ([\d,.]+) AED/));
  const b=(o.buildingName||'').toUpperCase();
  o.building=/MURR|MURAQ|MARQ/.test(b)?'muraqabat':/BARAH|BARAHA/.test(b)?'baraha':null;
  if(o.amount&&(!o.annual||o.annual<o.amount/3))o.annual=o.amount;
  o.missing=[['contract no.',o.contractNo],['start date',o.start],['end date',o.end],['tenant',o.tenant]].filter(x=>!x[1]).map(x=>x[0]);
  o.ok=!o.missing.length;
  return o;
}

function parseReceipt(raw){
  let t=clean(raw).replace(/\n/g,' ').replace(/ +/g,' ');
  t=t.replace(/(\d) ?, ?(?=\d{3}\b)/g,'$1,').replace(/(\d) \.(\d\d)\b/g,'$1.$2').replace(/(\d)\. (\d\d)\b/g,'$1.$2');
  const o={};
  let m=/Total Amount\s*:?\s*(?:AED\s*)?([\d,]+(?:\.\d{1,2})?)/i.exec(t)||/(?:Transfer amount|Transaction Amount|Amount)\s*:?\s*(?:AED\s*)?([\d,]+(?:\.\d{1,2})?)/i.exec(t)||/AED\s*([\d,]{3,}(?:\.\d{1,2})?)/i.exec(t);
  if(m)o.amount=num(m[1]);
  m=/Date(?: and time)?\s*:?\s*(\d{2})\/(\d{2})\/(\d{2,4})/i.exec(t)||/(\d{2})\/(\d{2})\/(\d{4})/.exec(t)||/\b(\d{2})\/(\d{2})\/(\d{2})\b/.exec(t);
  if(m){const y=m[3].length==2?'20'+m[3]:m[3];o.date=`${y}-${m[2]}-${m[1]}`}
  m=/From account name (.+?) From account number/i.exec(t)||/From (.+?) Origin/i.exec(t)||/From Account\s*:?\s*(\S+)/i.exec(t);
  if(m)o.from=m[1].trim();
  m=/From account number\s*([*\dA-Z]+)/i.exec(t); if(m)o.fromAcct=m[1];
  m=/\bTo (.+?) (?:Account|Bank)\b/.exec(t)||/Transfer to (.+?) Transfer amount/i.exec(t); if(m)o.to=m[1].trim();
  m=/(AE\d{21})/.exec(t); if(m)o.iban=m[1];
  m=/Reference(?: number| No\.?)?\s*:?\s*((?:[A-Z0-9]+\b ?){1,4})/.exec(t);
  if(m){const tk=m[1].trim().split(' ');let r='';for(const k of tk){if((r+k).length>24)break;r+=k}if(r.length>=8)o.ref=r}
  m=/Purpose\s+(.+?)\s+Reference/i.exec(t); if(m)o.purpose=m[1].trim();
  if(/Cash Deposit/i.test(t)){o.mode='cash deposit';o.cash=true;const br=/(?:^|\s)((?:[A-Z][\w]+ ){1,4}(?:ATM|CDM) ?\d*)/.exec(t);if(br)o.branch=br[1].trim()}
  o.direction=(o.from&&/THANI\s*ALTHANI|THANI RASHED/i.test(o.from))?'out':'in';
  o.ok=!!(o.amount&&o.date);
  return o;
}
const api={parseEjari,parseReceipt,clean};
if(typeof module!=='undefined')module.exports=api; else root.Parse=api;
})(this);
