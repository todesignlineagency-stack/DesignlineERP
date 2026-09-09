/** Design Line Agency ERP - Google Apps Script backend
 * Setup:
 * 1) Create a Google Sheet.
 * 2) Extensions > Apps Script, paste this file.
 * 3) Put the Google Sheet ID in SHEET_ID.
 * 4) Deploy > New deployment > Web app > Execute as Me > Anyone with link.
 */
const SHEET_ID = 'PASTE_GOOGLE_SHEET_ID_HERE';
const TABS = ['Settings','Customers','Vendors','Orders','Payments','Quotations','Expenses','VendorPayments'];

function doGet(e){
  try{
    if (e && e.parameter && e.parameter.action === 'data') return json(readAll());
    return json({ok:true,app:'Design Line Agency ERP',message:'Backend is running'});
  } catch(err){ return json({ok:false,error:String(err)}); }
}

function doPost(e){
  try{
    const body = JSON.parse((e.postData && e.postData.contents) || '{}');
    if(body.action === 'syncAll'){
      syncAll(body.data || {});
      return json({ok:true,message:'Synced'});
    }
    return json({ok:false,message:'Unknown action'});
  }catch(err){ return json({ok:false,error:String(err)}); }
}

function syncAll(data){
  const ss = SpreadsheetApp.openById(SHEET_ID);
  ensureTabs(ss);
  writeObject(ss.getSheetByName('Settings'), data.settings || {});
  writeRows(ss.getSheetByName('Customers'), data.customers || []);
  writeRows(ss.getSheetByName('Vendors'), data.vendors || []);
  writeRows(ss.getSheetByName('Orders'), data.orders || []);
  writeRows(ss.getSheetByName('Payments'), data.payments || []);
  writeRows(ss.getSheetByName('Quotations'), data.quotes || []);
  writeRows(ss.getSheetByName('Expenses'), data.expenses || []);
  writeRows(ss.getSheetByName('VendorPayments'), data.vendorPayments || []);
}

function readAll(){
  const ss = SpreadsheetApp.openById(SHEET_ID);
  ensureTabs(ss);
  return {
    ok:true,
    settings:readObject(ss.getSheetByName('Settings')),
    customers:readRows(ss.getSheetByName('Customers')),
    vendors:readRows(ss.getSheetByName('Vendors')),
    orders:readRows(ss.getSheetByName('Orders')),
    payments:readRows(ss.getSheetByName('Payments')),
    quotes:readRows(ss.getSheetByName('Quotations')),
    expenses:readRows(ss.getSheetByName('Expenses')),
    vendorPayments:readRows(ss.getSheetByName('VendorPayments'))
  };
}

function ensureTabs(ss){ TABS.forEach(n=>{ if(!ss.getSheetByName(n)) ss.insertSheet(n); }); }
function writeObject(sh,obj){ sh.clearContents(); const rows=Object.entries(obj); if(rows.length) sh.getRange(1,1,rows.length,2).setValues(rows); }
function writeRows(sh,rows){ sh.clearContents(); if(!rows.length)return; const keys=[...new Set(rows.flatMap(r=>Object.keys(r)))]; sh.getRange(1,1,1,keys.length).setValues([keys]); sh.getRange(2,1,rows.length,keys.length).setValues(rows.map(r=>keys.map(k=>r[k]??''))); sh.setFrozenRows(1); }
function readObject(sh){ const v=sh.getDataRange().getValues(); const o={}; v.forEach(r=>{if(r[0]!==''&&r[0]!=null)o[r[0]]=r[1];}); return o; }
function readRows(sh){ const v=sh.getDataRange().getValues(); if(v.length<2)return[]; const h=v[0]; return v.slice(1).filter(r=>r.some(x=>x!==''&&x!=null)).map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]]))); }
function json(obj){ return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
