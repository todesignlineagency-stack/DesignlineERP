(()=>{'use strict';
const DB_KEY='designlineERP_v2';
const VIEW_KEY='designlineERP_active_view_v11';
const MSG_KEY='designlineERP_v11_msg';
const VIEWS=['dashboard','orders','quotations','customers','expenses','vendors','reports','settings'];
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const read=()=>{try{return JSON.parse(localStorage.getItem(DB_KEY))||{}}catch(e){return{}}};
const write=db=>localStorage.setItem(DB_KEY,JSON.stringify(db));
function validView(v){return VIEWS.includes(String(v||''))}
function remember(v){if(validView(v))sessionStorage.setItem(VIEW_KEY,v)}
function activeView(){const el=$('.view.active');if(!el)return'';return String(el.id||'').replace(/View$/,'')}
function restore(){const v=sessionStorage.getItem(VIEW_KEY);if(!validView(v))return;const target=$('#'+v+'View');if(!target)return;$$('.view').forEach(x=>x.classList.remove('active'));target.classList.add('active');$$('.nav-btn[data-view]').forEach(x=>x.classList.toggle('active',x.dataset.view===v));const nav=$('.nav-btn[data-view="'+v+'"]'),title=$('#pageTitle');if(title&&nav)title.textContent=nav.textContent.trim();}
function toast(t){const e=$('#toast');if(!e)return;e.textContent=t;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),1900)}
function vendorUsage(db,id){let jobs=0;(db.orders||[]).forEach(o=>{if(Array.isArray(o.lineItems)&&o.lineItems.length){o.lineItems.forEach(l=>{if(l.vendorId===id)jobs++})}else if(o.vendorId===id)jobs++});const pays=(db.vendorPayments||[]).filter(p=>p.vendorId===id).length;return{jobs,pays}}
function unlinkVendorFromOrders(db,id){(db.orders||[]).forEach(o=>{if(Array.isArray(o.lineItems)&&o.lineItems.length){o.lineItems.forEach(l=>{if(l.vendorId===id){l.vendorId='';delete l.vendorBillRef;delete l.purchaseBillRef;delete l.purchaseBill}})}else if(o.vendorId===id){o.vendorId='';delete o.vendorBillRef;delete o.purchaseBillRef;delete o.purchaseBill}})}
function deleteVendor(id){const db=read(),v=(db.vendors||[]).find(x=>x.id===id);if(!v)return;const use=vendorUsage(db,id);const extra=use.jobs||use.pays?`\n\nLinked jobs: ${use.jobs}\nVendor payments: ${use.pays}\n\nVendor master aur uski vendor-payment history delete hogi. Purane order ki production cost safe rahegi, sirf vendor link remove hoga.`:'';if(!confirm(`Delete vendor "${v.name||id}" permanently?${extra}`))return;db.vendors=(db.vendors||[]).filter(x=>x.id!==id);db.vendorPayments=(db.vendorPayments||[]).filter(p=>p.vendorId!==id);unlinkVendorFromOrders(db,id);remember('vendors');sessionStorage.setItem(MSG_KEY,`Vendor ${v.name||id} deleted`);write(db);location.reload()}
function patchVendorButtons(){$$('#vendorsBody tr').forEach(tr=>{const edit=tr.querySelector('[data-a="editVendor"]');if(!edit)return;const id=edit.dataset.id,box=edit.closest('.row-actions')||edit.parentElement;if(!box||box.querySelector('[data-v11="deleteVendor"]'))return;const b=document.createElement('button');b.type='button';b.className='icon-btn red';b.dataset.v11='deleteVendor';b.dataset.id=id;b.textContent='Delete';box.appendChild(b)})}
function click(e){const nav=e.target.closest?.('.nav-btn[data-view],[data-jump]');if(nav){const v=nav.dataset.view||nav.dataset.jump;remember(v)}const b=e.target.closest?.('[data-v11="deleteVendor"]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();deleteVendor(b.dataset.id)}
let patchTimer=null;function schedulePatch(){clearTimeout(patchTimer);patchTimer=setTimeout(()=>{patchVendorButtons();const v=activeView();if(validView(v))remember(v)},40)}
function init(){document.addEventListener('click',click,true);restore();patchVendorButtons();const msg=sessionStorage.getItem(MSG_KEY);if(msg){sessionStorage.removeItem(MSG_KEY);setTimeout(()=>toast(msg),150)}new MutationObserver(schedulePatch).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});setTimeout(restore,120);setTimeout(restore,500)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();