(()=>{'use strict';
const CFG={apiKey:'AIzaSyC8Hx-5PQHT31NeRvMfsOIZnvm2IkEOBkg',authDomain:'designline-erp.firebaseapp.com',projectId:'designline-erp',storageBucket:'designline-erp.firebasestorage.app',messagingSenderId:'605680724271',appId:'1:605680724271:web:cb3184217ea69e1d8619da'};
try{
  if(typeof firebase==='undefined') throw new Error('Firebase SDK not loaded');
  const app=firebase.apps[0]||firebase.initializeApp(CFG);
  const db=app.firestore();
  try{db.settings({experimentalForceLongPolling:true,experimentalLongPollingOptions:{timeoutSeconds:15},ignoreUndefinedProperties:true})}catch(e){console.warn('Long-polling settings already applied',e?.message||e)}
  const base=`https://firestore.googleapis.com/v1/projects/${CFG.projectId}/databases/(default)/documents`;
  const timeoutFetch=async(url,options={})=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),12000);try{return await fetch(url,{...options,signal:c.signal})}finally{clearTimeout(t)}};
  const token=async()=>{const u=app.auth().currentUser;if(!u)throw new Error('Firebase user session missing');return await u.getIdToken()};
  const decode=v=>{if(!v||typeof v!=='object')return null;if('nullValue'in v)return null;if('stringValue'in v)return v.stringValue;if('booleanValue'in v)return v.booleanValue;if('integerValue'in v)return Number(v.integerValue);if('doubleValue'in v)return Number(v.doubleValue);if('timestampValue'in v)return v.timestampValue;if('referenceValue'in v)return v.referenceValue;if('geoPointValue'in v)return v.geoPointValue;if('arrayValue'in v)return(v.arrayValue.values||[]).map(decode);if('mapValue'in v){const o={};for(const[k,x]of Object.entries(v.mapValue.fields||{}))o[k]=decode(x);return o}return null};
  const decodeFields=f=>{const o={};for(const[k,v]of Object.entries(f||{}))o[k]=decode(v);return o};
  const snap=d=>({id:(d.name||'').split('/').pop(),exists:true,data:()=>decodeFields(d.fields||{}),get:k=>decode((d.fields||{})[k]),ref:null});
  const qs=docs=>({docs,size:docs.length,empty:docs.length===0,forEach:fn=>docs.forEach(fn)});
  const authHeaders=async(extra={})=>({Authorization:`Bearer ${await token()}`,...extra});
  async function restDoc(path,id){const r=await timeoutFetch(`${base}/${encodeURIComponent(path)}/${encodeURIComponent(id)}`,{headers:await authHeaders()});if(r.status===404)return{id,exists:false,data:()=>undefined,get:()=>undefined,ref:null};if(!r.ok)throw new Error(`Firestore profile read failed (${r.status})`);return snap(await r.json())}
  async function restCollection(path){let url=`${base}/${encodeURIComponent(path)}?pageSize=1000`,all=[];for(let page=0;page<10&&url;page++){const r=await timeoutFetch(url,{headers:await authHeaders()});if(!r.ok)throw new Error(`Firestore data read failed (${r.status})`);const j=await r.json();all.push(...(j.documents||[]).map(snap));url=j.nextPageToken?`${base}/${encodeURIComponent(path)}?pageSize=1000&pageToken=${encodeURIComponent(j.nextPageToken)}`:''}return qs(all)}
  const encQuery=v=>typeof v==='boolean'?{booleanValue:v}:typeof v==='number'?{doubleValue:v}:{stringValue:String(v)};
  async function restWhere(path,field,op,value){const ops={'==':'EQUAL','!=':'NOT_EQUAL','<':'LESS_THAN','<=':'LESS_THAN_OR_EQUAL','>':'GREATER_THAN','>=':'GREATER_THAN_OR_EQUAL'};if(!ops[op])throw new Error('Unsupported Firestore query operator');const body={structuredQuery:{from:[{collectionId:path}],where:{fieldFilter:{field:{fieldPath:field},op:ops[op],value:encQuery(value)}}}};const r=await timeoutFetch(`${base}:runQuery`,{method:'POST',headers:await authHeaders({'Content-Type':'application/json'}),body:JSON.stringify(body)});if(!r.ok)throw new Error(`Firestore query failed (${r.status})`);const rows=await r.json();return qs(rows.filter(x=>x.document).map(x=>snap(x.document)))}
  const originalCollection=db.collection.bind(db);
  db.collection=function(path){const ref=originalCollection(path),originalDoc=ref.doc.bind(ref),originalWhere=ref.where.bind(ref);ref.get=()=>restCollection(path);ref.doc=function(id){const d=originalDoc(id);d.get=()=>restDoc(path,String(id));return d};ref.where=function(field,op,value){const q=originalWhere(field,op,value);q.get=()=>restWhere(path,field,op,value);return q};return ref};
  const markVersion=()=>document.querySelectorAll('.v8card p').forEach(x=>{if(/Version 8\.6/.test(x.textContent))x.textContent=x.textContent.replace('Version 8.6','Version 8.8')});
  new MutationObserver(markVersion).observe(document.documentElement,{childList:true,subtree:true});setTimeout(markVersion,0);
  window.__DL_FIRESTORE_MOBILE_FIX__='rest-v2';
  console.info('Design Line ERP: Firestore REST fallback V8.8 enabled');
}catch(e){console.error('Design Line ERP: Firestore mobile/REST fix failed',e)}
})();