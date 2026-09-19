(()=>{'use strict';
const K='designlineERP_v2',U='designlineERP_cloud_url',P='designlineERP_pending_v22',BOOT='designlineERP_cloud_boot_v22',VERSION=22;
const SHEET_URL='https://docs.google.com/spreadsheets/d/1zm0XvdY6zYREUIvVbHf7pRoZCnWHgandxjgObYNi4uk/edit';
const DEFAULT_API_URL='https://script.google.com/macros/s/AKfycbz5XfyYCP5-fmsTP5FOHeu8_4AbNNFzwxM2Z_h-g-jxXHMtlNW_4QEJeOHOdr33Fkk6ag/exec';
const ENTITIES=['customers','vendors','orders','payments','quotes','expenses','vendorPayments'];
const rawSet=Storage.prototype.setItem,rawRemove=Storage.prototype.removeItem;
let internal=false,cloudReady=false,flushing=false,pushTimer=null,lastRevision=null;
const clone=x=>JSON.parse(JSON.stringify(x??null)),norm=u=>String(u||'').trim().replace(/\/$/,'');
const localDb=()=>{try{return JSON.parse(localStorage.getItem(K)||'null')}catch{return null}};
const endpoint=d=>norm(d?.settings?.apiUrl||localStorage.getItem(U)||DEFAULT_API_URL);
function pill(t,bad=false){const e=document.getElementById('storagePill');if(e){e.textContent=t;e.style.color=bad?'#ff6b6b':''}}
function status(t,bad=false){const e=document.getElementById('backendStatus');if(e){e.textContent=t;e.style.color=bad?'#ff6b6b':''}}
function eq(a,b){try{return JSON.stringify(a)===JSON.stringify(b)}catch{return false}}
function idMap(a){const m=new Map();for(const x of (Array.isArray(a)?a:[]))if(x&&x.id)m.set(String(x.id),x);return m}
function emptyDelta(){return{time:Date.now(),entities:{},settings:{},meta:{}}}
function diff(before,after){
 const d=emptyDelta();before=before||{};after=after||{};
 for(const k of ENTITIES){const b=idMap(before[k]),a=idMap(after[k]),upserts=[],deletes=[];for(const [id,x] of a)if(!b.has(id)||!eq(b.get(id),x))upserts.push(clone(x));for(const id of b.keys())if(!a.has(id))deletes.push(id);if(upserts.length||deletes.length)d.entities[k]={upserts,deletes}}
 const bs=before.settings||{},as=after.settings||{};for(const k of new Set([...Object.keys(bs),...Object.keys(as)]))if(!eq(bs[k],as[k]))d.settings[k]=clone(as[k]);
 const bm=before.meta||{},am=after.meta||{};for(const k of new Set([...Object.keys(bm),...Object.keys(am)]))if(!eq(bm[k],am[k]))d.meta[k]=clone(am[k]);
 return d
}
function hasDelta(d){return d&&((d.entities&&Object.keys(d.entities).length)||Object.keys(d.settings||{}).length||Object.keys(d.meta||{}).length)}
function queue(){try{return JSON.parse(localStorage.getItem(P)||'[]')}catch{return[]}}
function saveQueue(q){internal=true;rawSet.call(localStorage,P,JSON.stringify(q.slice(-100)));internal=false}
function enqueue(d){if(!hasDelta(d))return;const q=queue();q.push(d);saveQueue(q);scheduleFlush()}
function applyDelta(db,d){
 db=clone(db)||{};for(const k of ENTITIES){if(!Array.isArray(db[k]))db[k]=[];const ch=d.entities?.[k];if(!ch)continue;let m=idMap(db[k]);for(const id of ch.deletes||[])m.delete(String(id));for(const x of ch.upserts||[])if(x&&x.id)m.set(String(x.id),clone(x));db[k]=[...m.values()]}
 db.settings=db.settings||{};for(const [k,v] of Object.entries(d.settings||{})){if(v===undefined)delete db.settings[k];else db.settings[k]=clone(v)}
 db.meta=db.meta||{};for(const [k,v] of Object.entries(d.meta||{})){if(typeof v==='number'&&typeof db.meta[k]==='number')db.meta[k]=Math.max(db.meta[k],v);else if(v===undefined)delete db.meta[k];else db.meta[k]=clone(v)}
 return db
}
function applyAll(db,ds){for(const d of ds)db=applyDelta(db,d);return db}
function deltaSatisfied(db,d){
 for(const k of ENTITIES){const ch=d.entities?.[k];if(!ch)continue;const m=idMap(db[k]);for(const id of ch.deletes||[])if(m.has(String(id)))return false;for(const x of ch.upserts||[]){if(!x?.id||!m.has(String(x.id))||!eq(m.get(String(x.id)),x))return false}}
 for(const [k,v] of Object.entries(d.settings||{}))if(!eq(db.settings?.[k],v))return false;
 return true
}
function allSatisfied(db,ds){return ds.every(d=>deltaSatisfied(db,d))}
function jsonp(u,action='load',timeout=15000){
 return new Promise((resolve,reject)=>{const cb='__dl22_'+Date.now()+'_'+Math.floor(Math.random()*1e6),s=document.createElement('script');let done=false;const finish=(e,v)=>{if(done)return;done=true;clearTimeout(tm);try{delete window[cb]}catch{};s.remove();e?reject(e):resolve(v)};window[cb]=v=>finish(null,v);s.onerror=()=>finish(new Error('Cloud request failed'));s.src=u+(u.includes('?')?'&':'?')+'action='+encodeURIComponent(action)+'&callback='+encodeURIComponent(cb)+'&_='+Date.now();document.head.appendChild(s);const tm=setTimeout(()=>finish(new Error('Cloud timeout')),timeout)})
}
async function loadRemote(u){const r=await jsonp(u,'load');if(!r?.ok)throw new Error(r?.error||'Cloud load failed');lastRevision=r.revision??lastRevision;return r}
async function postMerged(u,data,baseRevision){
 await fetch(u,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'syncAll',clientVersion:VERSION,baseRevision:baseRevision??null,data})});
 return true
}
function writeLocal(db){internal=true;rawSet.call(localStorage,K,JSON.stringify(db));internal=false;try{window.dispatchEvent(new CustomEvent('designline:cloudloaded'))}catch{}}
function persistEndpoint(u){u=norm(u);if(!u)return false;internal=true;rawSet.call(localStorage,U,u);internal=false;const d=localDb();if(d){d.settings=d.settings||{};d.settings.apiUrl=u;writeLocal(d)}return true}
function nextCode(token){
 const cfg={ORD:['ORD','orders'],C:['CUS','customers'],V:['VEN','vendors'],E:['EXP','expenses'],P:['PAY','payments'],VP:['VPA','vendorPayments'],Q:['QT','quotes'],LI:['LI',null]},[prefix,key]=cfg[token]||[String(token||'ID'),null],db=localDb()||{},re=new RegExp('^'+prefix+'-(\\d+)$'),vals=[];
 if(key)for(const x of db[key]||[]){const m=String(x.id||'').match(re);if(m)vals.push(Number(m[1]))}
 if(prefix==='LI')for(const o of [...(db.orders||[]),...(db.quotes||[])])for(const l of (o.lineItems||[])){const m=String(l.id||'').match(re);if(m)vals.push(Number(m[1]))}
 db.meta=db.meta||{};db.meta.idCounters=db.meta.idCounters||{};const n=Math.max(0,...vals,Number(db.meta.idCounters[prefix])||0)+1;db.meta.idCounters[prefix]=n;writeLocal(db);return prefix+'-'+String(n).padStart(4,'0')
}
window.DesignLineIds={next:nextCode};
function migrateIds(db){
 db=clone(db)||{};db.settings=db.settings||{};if(Number(db.settings.idSchemaVersion||0)>=22)return{db,changed:false};
 const mapList=(arr,prefix)=>{const map={};(arr||[]).forEach((x,i)=>{const old=String(x.id||'');const id=prefix+'-'+String(i+1).padStart(4,'0');if(old&&old!==id&&!x.legacyId)x.legacyId=old;x.id=id;if(old)map[old]=id});return map};
 const cm=mapList(db.customers,'CUS'),vm=mapList(db.vendors,'VEN');
 const orders=(db.orders||[]).map((x,i)=>({...x,__i:i})).sort((a,b)=>(Number(a.orderNo)||1e9)-(Number(b.orderNo)||1e9)||String(a.date||'').localeCompare(String(b.date||''))||a.__i-b.__i);const om={};orders.forEach((o,i)=>{const old=String(o.id||'');const id='ORD-'+String(i+1).padStart(4,'0');if(old&&old!==id&&!o.legacyId)o.legacyId=old;o.id=id;o.orderNo=i+1;o.invoiceNo=i+1;delete o.__i;if(old)om[old]=id});db.orders=orders;
 const qm=mapList(db.quotes,'QT'),pm=mapList(db.payments,'PAY'),em=mapList(db.expenses,'EXP'),vpm=mapList(db.vendorPayments,'VPA');
 let li=0;for(const parent of [...(db.orders||[]),...(db.quotes||[])])for(const l of (parent.lineItems||[])){const old=l.id;l.id='LI-'+String(++li).padStart(4,'0');if(old&&old!==l.id&&!l.legacyId)l.legacyId=old}
 const ref=(m,v)=>m[String(v||'')]||v;
 for(const o of db.orders||[]){o.customerId=ref(cm,o.customerId);o.vendorId=ref(vm,o.vendorId);o.quotationId=ref(qm,o.quotationId);for(const l of o.lineItems||[])l.vendorId=ref(vm,l.vendorId)}
 for(const q of db.quotes||[]){q.customerId=ref(cm,q.customerId);q.convertedOrderId=ref(om,q.convertedOrderId);for(const l of q.lineItems||[])l.vendorId=ref(vm,l.vendorId)}
 for(const p of db.payments||[]){p.orderId=ref(om,p.orderId);p.customerId=ref(cm,p.customerId)}
 for(const p of db.vendorPayments||[]){p.vendorId=ref(vm,p.vendorId);if(Array.isArray(p.orderIds))p.orderIds=p.orderIds.map(x=>ref(om,x));else if(typeof p.orderIds==='string')p.orderIds=p.orderIds.split(',').map(x=>ref(om,x.trim())).join(',')}
 for(const e of db.expenses||[]){e.vendorId=ref(vm,e.vendorId);e.orderId=ref(om,e.orderId)}
 db.meta=db.meta||{};db.meta.orderSeq=(db.orders||[]).length;db.meta.invoiceSeq=(db.orders||[]).length;db.meta.quoteSeq=(db.quotes||[]).length;db.meta.idCounters={ORD:(db.orders||[]).length,CUS:(db.customers||[]).length,VEN:(db.vendors||[]).length,EXP:(db.expenses||[]).length,PAY:(db.payments||[]).length,VPA:(db.vendorPayments||[]).length,QT:(db.quotes||[]).length,LI:li};
 db.settings.idSchemaVersion=22;db.settings.idMigrationAt=new Date().toISOString();return{db,changed:true}
}
async function syncMigrated(u,remote,revision){
 const m=migrateIds(remote);if(!m.changed)return m.db;internal=true;rawSet.call(localStorage,'designlineERP_pre_v22_json',JSON.stringify(remote));internal=false;m.db.settings.apiUrl=u;m.db.settings.clientUpdatedAt=Date.now();m.db.settings.storageMode='Google Sheets Cloud';pill('● Migrating IDs');await postMerged(u,m.db,revision);await new Promise(r=>setTimeout(r,1200));const v=await loadRemote(u);if(v?.data&&Number(v.data.settings?.idSchemaVersion)>=22)return v.data;throw new Error('ID migration verify failed')
}
async function bootstrap(){
 const u=endpoint(localDb());if(!u){cloudReady=true;return}persistEndpoint(u);pill('● Checking Cloud');
 try{const r=await loadRemote(u);let remote=r.data;if(remote){remote.settings=remote.settings||{};remote.settings.apiUrl=u;remote=await syncMigrated(u,remote,r.revision);writeLocal(remote);lastRevision=r.revision??lastRevision}cloudReady=true;status('Cloud database loaded safely.');pill('● Cloud Safe');const mark=String(remote?.settings?.cloudUpdatedAt||r.updatedAtMs||Date.now());if(sessionStorage.getItem(BOOT)!==mark){sessionStorage.setItem(BOOT,mark);setTimeout(()=>location.reload(),180)}else scheduleFlush(50)}
 catch(e){cloudReady=true;pill('● Cloud Offline',true);status('Cloud load fail hua. Local copy safe hai; online hote hi retry karein.',true);scheduleFlush(1500)}
}
async function flush(){
 if(flushing||!cloudReady)return;let ds=queue();if(!ds.length)return;flushing=true;const u=endpoint(localDb());if(!u){flushing=false;return}pill('● Saving Cloud');
 try{
  for(let attempt=1;attempt<=4;attempt++){
   const r=await loadRemote(u),base=r.data||{};let merged=applyAll(base,ds);merged.settings=merged.settings||{};merged.settings.apiUrl=u;merged.settings.storageMode='Google Sheets Cloud';merged.settings.clientUpdatedAt=Date.now();merged.settings.syncClientVersion=VERSION;
   await postMerged(u,merged,r.revision);await new Promise(x=>setTimeout(x,900+attempt*350));const v=await loadRemote(u);
   if(v.data&&allSatisfied(v.data,ds)){writeLocal(v.data);const current=queue();saveQueue(current.slice(ds.length));pill('● Cloud Safe');status('Latest changes Google Sheets me verify ho gayi hain.');flushing=false;if(queue().length)scheduleFlush(80);return}
  }
  throw new Error('Cloud verify failed')
 }catch(e){pill('● Sync Pending',true);status('Save pending hai; data local queue me safe hai aur retry hoga.',true);flushing=false;scheduleFlush(4000)}
}
function scheduleFlush(ms=450){clearTimeout(pushTimer);pushTimer=setTimeout(flush,ms)}
Storage.prototype.setItem=function(key,value){
 if(this!==localStorage||internal||key!==K)return rawSet.call(this,key,value);
 const before=localDb();let after;try{after=JSON.parse(value)}catch{return rawSet.call(this,key,value)}
 after.settings=after.settings||{};const u=endpoint(after);if(u){after.settings.apiUrl=u;internal=true;rawSet.call(localStorage,U,u);internal=false}after.settings.storageMode='Google Sheets Cloud';value=JSON.stringify(after);rawSet.call(this,key,value);enqueue(diff(before,after));return
};
async function pullCloud(force=true){const u=endpoint(localDb());if(!u)return{ok:false};if(queue().length)await flush();try{const r=await loadRemote(u);if(r.data){let d=r.data;d.settings=d.settings||{};d.settings.apiUrl=u;writeLocal(d);pill('● Cloud Loaded');status('Latest cloud data load ho gaya.');if(force)setTimeout(()=>location.reload(),120)}return r}catch(e){pill('● Cloud Error',true);return{ok:false,error:String(e)}}}
async function safeSyncNow(){const d=localDb(),u=endpoint(d);if(!u||!d)return;const r=await loadRemote(u),remote=r.data||{},delta=diff(remote,d);enqueue(delta);return flush()}
async function testCloud(url){const u=norm(url||document.getElementById('apiUrl')?.value||endpoint(localDb()));if(!u)return{ok:false};try{const r=await jsonp(u,'ping');if(!r?.ok)throw new Error('No response');persistEndpoint(u);pill('● Cloud Connected');status('Google Sheets cloud connection successful.');return{ok:true,response:r}}catch(e){pill('● Cloud Error',true);status('Cloud test fail hua.',true);return{ok:false,error:String(e)}}}
async function saveAndRun(){const input=document.getElementById('apiUrl'),u=norm(input?.value);if(!u)return;persistEndpoint(u);const t=await testCloud(u);if(!t.ok)return;await pullCloud(true)}
function mountUi(){const api=document.getElementById('apiUrl');if(!api)return;const wrap=api.parentElement;wrap.style.display='block';wrap.className='panel';wrap.innerHTML='<span class="section-kicker">CLOUD DATABASE V22</span><h3>Google Sheets Safe Sync</h3><p class="muted">Har save latest cloud data ke sath merge aur verify hota hai. Purana browser latest records ko blind overwrite nahi karega.</p><label class="field"><span>Apps Script Web App Link</span><input id="apiUrl" placeholder="https://script.google.com/macros/s/.../exec"></label><div class="form-actions left" style="margin-top:12px"><button class="primary" id="saveApiBtn" type="button">Save & Run Cloud</button><button class="ghost" id="testApiBtn" type="button">Test Link</button><button class="ghost" id="pullCloudBtn" type="button">Pull Latest</button><button class="ghost" id="pushCloudBtn" type="button">Safe Sync Now</button></div><div class="backend-box" id="backendStatus">V22 safe sync active.</div><p class="muted" style="margin-top:10px"><a href="'+SHEET_URL+'" target="_blank" rel="noopener">Open Cloud Database Sheet</a></p>';
 const saved=endpoint(localDb());document.getElementById('apiUrl').value=saved;document.getElementById('saveApiBtn').onclick=e=>{e.preventDefault();saveAndRun()};document.getElementById('testApiBtn').onclick=e=>{e.preventDefault();testCloud()};document.getElementById('pullCloudBtn').onclick=e=>{e.preventDefault();pullCloud(true)};document.getElementById('pushCloudBtn').onclick=e=>{e.preventDefault();safeSyncNow()};const sys=document.getElementById('firebaseBackendStatus');if(sys)sys.textContent='V22 Safe Sync: record-level merge + cloud verification. Firebase is not used.'
}
window.DesignLineCloud={pull:pullCloud,push:safeSyncNow,test:testCloud,saveAndRun,sheetUrl:SHEET_URL,apiUrl:DEFAULT_API_URL,flush};
if(!localStorage.getItem(U)&&DEFAULT_API_URL){internal=true;rawSet.call(localStorage,U,DEFAULT_API_URL);internal=false}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountUi,{once:true});else mountUi();
setTimeout(bootstrap,30);setInterval(()=>{if(queue().length)scheduleFlush(10)},10000);
})();