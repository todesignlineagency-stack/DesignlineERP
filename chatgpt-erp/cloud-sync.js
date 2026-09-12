(()=>{'use strict';
const K='designlineERP_v2',U='designlineERP_cloud_url',BOOT='designlineERP_cloud_boot';
const rawSet=Storage.prototype.setItem;
let internal=false,pushTimer=null,lastPushed='';
const SHEET_URL='https://docs.google.com/spreadsheets/d/1zm0XvdY6zYREUIvVbHf7pRoZCnWHgandxjgObYNi4uk/edit';
const DEFAULT_API_URL='https://script.google.com/macros/s/AKfycbz5XfyYCP5-fmsTP5FOHeu8_4AbNNFzwxM2Z_h-g-jxXHMtlNW_4QEJeOHOdr33Fkk6ag/exec';
const norm=u=>String(u||'').trim().replace(/\/$/,'');
function localDb(){try{return JSON.parse(localStorage.getItem(K)||'null')}catch(e){return null}}
function endpoint(d){return norm(d?.settings?.apiUrl||localStorage.getItem(U)||DEFAULT_API_URL)}
function pill(t,bad=false){const e=document.getElementById('storagePill');if(e){e.textContent=t;e.style.color=bad?'#ff6b6b':''}}
function status(t,bad=false){const e=document.getElementById('backendStatus');if(e){e.textContent=t;e.style.color=bad?'#ff6b6b':''}}
function persistEndpoint(u){
  u=norm(u);
  if(!u)return false;
  rawSet.call(localStorage,U,u);
  const d=localDb();
  if(d){
    d.settings=d.settings||{};
    d.settings.apiUrl=u;
    d.settings.storageMode='Google Sheets Cloud';
    rawSet.call(localStorage,K,JSON.stringify(d));
  }
  return true;
}
async function postCloud(u,data){
  if(!u||!data)return {ok:false};
  try{
    await fetch(u,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'syncAll',data})});
    pill('● Cloud Sync');status('Cloud save Google Sheets ko send ho gaya.');
    return {ok:true};
  }catch(e){
    pill('● Cloud Offline',true);status('Cloud save fail hua — local copy safe hai.',true);
    return {ok:false,error:String(e)};
  }
}
function schedulePush(serialized){
  clearTimeout(pushTimer);
  pushTimer=setTimeout(()=>{
    try{
      const d=JSON.parse(serialized),u=endpoint(d);
      if(!u||serialized===lastPushed)return;
      lastPushed=serialized;postCloud(u,d);
    }catch(e){}
  },500);
}
Storage.prototype.setItem=function(key,value){
  if(this===localStorage&&key===K&&!internal){
    try{
      const d=JSON.parse(value);d.settings=d.settings||{};
      const u=endpoint(d);
      if(u){d.settings.apiUrl=u;rawSet.call(localStorage,U,u)}
      d.settings.clientUpdatedAt=Date.now();
      d.settings.storageMode='Google Sheets Cloud';
      value=JSON.stringify(d);
    }catch(e){}
    rawSet.call(this,key,value);schedulePush(value);return;
  }
  return rawSet.call(this,key,value);
};
function jsonp(u,action='load',timeout=15000){
  return new Promise((resolve,reject)=>{
    const cb='__dlCloudCb_'+Date.now()+'_'+Math.floor(Math.random()*100000),s=document.createElement('script');
    let done=false;
    const finish=(err,val)=>{if(done)return;done=true;clearTimeout(tm);try{delete window[cb]}catch(e){};s.remove();err?reject(err):resolve(val)};
    window[cb]=v=>finish(null,v);
    s.onerror=()=>finish(new Error('Cloud request failed'));
    s.src=u+(u.includes('?')?'&':'?')+'action='+encodeURIComponent(action)+'&callback='+encodeURIComponent(cb)+'&_='+Date.now();
    document.head.appendChild(s);
    const tm=setTimeout(()=>finish(new Error('Cloud request timeout')),timeout);
  });
}
async function pullCloud(force=false){
  const local=localDb(),u=endpoint(local);
  if(!u){status('Apps Script Web App link paste karein.',true);return {ok:false}}
  persistEndpoint(u);pill('● Checking Cloud');
  try{
    const r=await jsonp(u,'load');
    if(!r||!r.ok)throw new Error(r?.error||'Cloud response invalid');
    if(!r.data){
      pill('● Cloud Ready');
      status('Cloud connected hai. Ab Save & Run ya Push Now se current ERP data cloud par bhej sakte hain.');
      return r;
    }
    const remote=r.data;remote.settings=remote.settings||{};remote.settings.apiUrl=u;
    const rt=Number(remote.settings.clientUpdatedAt||r.updatedAtMs||0),lt=Number(local?.settings?.clientUpdatedAt||0);
    if(force||!local||rt>lt){
      internal=true;rawSet.call(localStorage,K,JSON.stringify(remote));rawSet.call(localStorage,U,u);internal=false;
      pill('● Cloud Loaded');status('Latest Google Sheets database load ho gaya.');
      const mark=String(r.updatedAtMs||rt||Date.now());
      if(sessionStorage.getItem(BOOT)!==mark){sessionStorage.setItem(BOOT,mark);setTimeout(()=>location.reload(),150)}
    }else if(local&&lt>rt){
      await postCloud(u,local);pill('● Cloud Sync');status('Local changes cloud par sync ho gaye.');
    }else{
      pill('● Cloud Sync');status('Cloud database connected aur up to date hai.');
    }
    return r;
  }catch(e){
    pill('● Local Save',true);status('Cloud connect nahi hua. Web App /exec link aur deployment access check karein.',true);
    return {ok:false,error:String(e)};
  }
}
async function testCloud(url){
  const u=norm(url||document.getElementById('apiUrl')?.value||endpoint(localDb()));
  if(!u){status('Apps Script Web App /exec link required.',true);return {ok:false}}
  pill('● Testing Cloud');
  try{
    const r=await jsonp(u,'ping',10000);
    if(r?.ok){
      persistEndpoint(u);pill('● Cloud Connected');status('Google Sheets cloud connection successful.');
      return {ok:true,response:r};
    }
    throw new Error('No response');
  }catch(e){
    pill('● Cloud Error',true);status('Cloud test fail hua. Sahi /exec Web App link paste karein.',true);
    return {ok:false,error:String(e)};
  }
}
async function saveAndRun(){
  const input=document.getElementById('apiUrl'),u=norm(input?.value);
  if(!u){status('Pehle Apps Script Web App /exec link paste karein.',true);input?.focus();return}
  persistEndpoint(u);
  if(input)input.value=u;
  status('Web App link save ho gaya. Connection test ho raha hai...');
  const t=await testCloud(u);
  if(!t.ok)return;
  const d=localDb();
  if(d)await postCloud(u,d);
  await pullCloud(false);
}
function mountUi(){
  const api=document.getElementById('apiUrl');if(!api)return;
  const wrap=api.parentElement;wrap.style.display='block';wrap.className='panel';
  wrap.innerHTML=`<span class="section-kicker">CLOUD DATABASE</span><h3>Google Sheets Cloud Sync</h3>
  <p class="muted">Apps Script ko Web App deploy karne ke baad milne wala <b>/exec</b> link yahan paste karein.</p>
  <label class="field"><span>Apps Script Web App Link</span><input id="apiUrl" placeholder="https://script.google.com/macros/s/.../exec"></label>
  <div class="form-actions left" style="margin-top:12px">
    <button class="primary" id="saveApiBtn" type="button">Save & Run Cloud</button>
    <button class="ghost" id="testApiBtn" type="button">Test Link</button>
    <button class="ghost" id="pullCloudBtn" type="button">Pull Latest</button>
    <button class="ghost" id="pushCloudBtn" type="button">Push Now</button>
  </div>
  <div class="backend-box" id="backendStatus">Apps Script Web App link yahan se manage karein.</div>
  <p class="muted" style="margin-top:10px"><a href="${SHEET_URL}" target="_blank" rel="noopener">Open DesignLine ERP Cloud Database Sheet</a></p>`;
  const saved=endpoint(localDb());
  if(!localStorage.getItem(U)&&saved)rawSet.call(localStorage,U,saved);
  document.getElementById('apiUrl').value=saved;
  document.getElementById('saveApiBtn').addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();saveAndRun()},true);
  document.getElementById('testApiBtn').addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();testCloud()},true);
  document.getElementById('pullCloudBtn').addEventListener('click',e=>{e.preventDefault();pullCloud(true)},true);
  document.getElementById('pushCloudBtn').addEventListener('click',e=>{e.preventDefault();const u=norm(document.getElementById('apiUrl').value||endpoint(localDb()));if(!u)return status('Web App link required.',true);persistEndpoint(u);const d=localDb();d?postCloud(u,d):status('ERP data abhi available nahi.',true)},true);
  const sys=document.getElementById('firebaseBackendStatus');
  if(sys)sys.textContent='GitHub Pages + Google Sheets Cloud. Web App link Settings se change aur run kiya ja sakta hai.';
}
window.DesignLineCloud={pull:pullCloud,push:()=>{const d=localDb(),u=endpoint(d);return postCloud(u,d)},test:testCloud,saveAndRun,sheetUrl:SHEET_URL,apiUrl:DEFAULT_API_URL};
if(!localStorage.getItem(U)&&DEFAULT_API_URL)rawSet.call(localStorage,U,DEFAULT_API_URL);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountUi,{once:true});else mountUi();
setTimeout(()=>pullCloud(false),50);
})();