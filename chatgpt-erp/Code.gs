/** Design Line Agency ERP - Google Apps Script backend
 * 1) Create a Google Sheet.
 * 2) Extensions > Apps Script, paste this file.
 * 3) Set SHEET_ID below.
 * 4) Deploy > New deployment > Web app > Execute as Me > Anyone with link.
 */
const SHEET_ID = 'PASTE_GOOGLE_SHEET_ID_HERE';
const TABS = ['Settings','Customers','Vendors','Orders','Quotations','Expenses'];

function doGet(e){
  return json({ok:true,app:'Design Line Agency ERP',message:'Backend is running'});
}
function doPost(e){
  try{
    const body=JSON.parse(e.postData.contents||'{}');
    if(body.action==='syncAll'){
      syncAll(body.data||{});
      return json({ok:true,message:'Synced'});
    }
    return json({ok:false,message:'Unknown action'});
  }catch(err){return json({ok:false,error:String(err)})}
}
function syncAll(data){
  const ss=SpreadsheetApp.openById(SHEET_ID);
  ensureTabs(ss);
  writeObject(ss.getSheetByName('Settings'), data.settings||{});
  writeRows(ss.getSheetByName('Customers'), data.customers||[]);
  writeRows(ss.getSheetByName('Vendors'), data.vendors||[]);
  writeRows(ss.getSheetByName('Orders'), data.orders||[]);
  writeRows(ss.getSheetByName('Quotations'), data.quotes||[]);
  writeRows(ss.getSheetByName('Expenses'), data.expenses||[]);
}
function ensureTabs(ss){TABS.forEach(n=>{if(!ss.getSheetByName(n))ss.insertSheet(n)})}
function writeObject(sh,obj){sh.clearContents();let rows=Object.entries(obj);if(rows.length)sh.getRange(1,1,rows.length,2).setValues(rows)}
function writeRows(sh,rows){sh.clearContents();if(!rows.length)return;let keys=[...new Set(rows.flatMap(r=>Object.keys(r)))];sh.getRange(1,1,1,keys.length).setValues([keys]);sh.getRange(2,1,rows.length,keys.length).setValues(rows.map(r=>keys.map(k=>r[k]??'')));sh.setFrozenRows(1)}
function json(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)}
