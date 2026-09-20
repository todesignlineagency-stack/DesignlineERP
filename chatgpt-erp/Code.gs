const SHEET_ID = '1zm0XvdY6zYREUIvVbHf7pRoZCnWHgandxjgObYNi4uk';
const STATE_SHEET = 'State';
const BACKUP_SHEET = 'Backups';
const CHUNK_SIZE = 45000;
const SERVER_VERSION = 22;
const MAX_BACKUPS = 20;

function doGet(e) {
  const p = (e && e.parameter) || {};
  const action = String(p.action || 'load');
  let payload;
  try {
    if (action === 'ping') {
      const meta = readState_();
      payload = { ok: true, service: 'DesignLine ERP Cloud', serverVersion: SERVER_VERSION, revision: meta.revision, time: new Date().toISOString(), sheetId: SHEET_ID };
    } else if (action === 'load') {
      const meta = readState_();
      payload = { ok: true, data: meta.data, revision: meta.revision, updatedAt: meta.updatedAt, updatedAtMs: meta.updatedAtMs, schema: 2, serverVersion: SERVER_VERSION };
    } else {
      payload = { ok: false, error: 'Unknown action' };
    }
  } catch (err) {
    payload = { ok: false, error: String(err && err.message ? err.message : err) };
  }
  return output_(payload, p.callback);
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.action !== 'syncAll') return output_({ ok: false, error: 'Unknown action', serverVersion: SERVER_VERSION });
    const clientVersion = Number(body.clientVersion || 0);
    if (clientVersion < 22) {
      return output_({ ok: false, error: 'Old ERP client blocked. Refresh ERP to V22.', code: 'CLIENT_TOO_OLD', serverVersion: SERVER_VERSION });
    }
    const result = syncAll_(body.data || {}, body.baseRevision);
    return output_({ ok: true, revision: result.revision, updatedAt: result.updatedAt, updatedAtMs: result.updatedAtMs, schema: 2, serverVersion: SERVER_VERSION });
  } catch (err) {
    const msg = String(err && err.message ? err.message : err);
    const conflict = msg.indexOf('REVISION_CONFLICT') === 0;
    return output_({ ok: false, error: msg, code: conflict ? 'REVISION_CONFLICT' : 'SERVER_ERROR', serverVersion: SERVER_VERSION });
  }
}

function output_(obj, callback) {
  const json = JSON.stringify(obj);
  if (callback) {
    const safe = String(callback).replace(/[^A-Za-z0-9_.$]/g, '');
    return ContentService.createTextOutput(safe + '(' + json + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function syncAll_(data, baseRevision) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const current = readState_();
    const currentRevision = Number(current.revision || 0);
    if (baseRevision !== null && baseRevision !== undefined && baseRevision !== '' && Number(baseRevision) !== currentRevision) {
      throw new Error('REVISION_CONFLICT: cloud changed from revision ' + baseRevision + ' to ' + currentRevision);
    }

    data = normalizeData_(data);
    const now = new Date();
    const iso = now.toISOString();
    const ms = now.getTime();
    const nextRevision = currentRevision + 1;

    data.settings = data.settings || {};
    data.settings.cloudUpdatedAt = iso;
    data.settings.storageMode = 'Google Sheets Cloud';
    data.settings.cloudRevision = nextRevision;
    data.settings.syncServerVersion = SERVER_VERSION;

    if (current.data) writeBackup_(current.data, currentRevision, current.updatedAt || iso);
    writeState_(data, iso, nextRevision);
    writeReadableTabs_(data, iso);
    return { revision: nextRevision, updatedAt: iso, updatedAtMs: ms };
  } finally {
    lock.releaseLock();
  }
}

function normalizeData_(data) {
  const out = data && typeof data === 'object' ? data : {};
  ['customers','vendors','orders','payments','quotes','expenses','vendorPayments'].forEach(k => {
    if (!Array.isArray(out[k])) out[k] = [];
  });
  if (!out.settings || typeof out.settings !== 'object') out.settings = {};
  if (!out.meta || typeof out.meta !== 'object') out.meta = {};
  return out;
}

function ss_() {
  return SpreadsheetApp.openById(SHEET_ID);
}

function sheet_(name) {
  const ss = ss_();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  return sh;
}

function writeState_(data, iso, revision) {
  const sh = sheet_(STATE_SHEET);
  sh.clearContents();
  if (sh.getMaxColumns() < 5) sh.insertColumnsAfter(sh.getMaxColumns(), 5 - sh.getMaxColumns());
  sh.getRange(1,1,1,5).setValues([['Chunk','JSON','UpdatedAt','Revision','Schema']]);
  const json = JSON.stringify(data);
  const rows = [];
  for (let i = 0, n = 1; i < json.length; i += CHUNK_SIZE, n++) {
    rows.push([n, json.slice(i, i + CHUNK_SIZE), n === 1 ? iso : '', n === 1 ? revision : '', n === 1 ? 2 : '']);
  }
  if (!rows.length) rows.push([1, '{}', iso, revision, 2]);
  sh.getRange(2,1,rows.length,5).setValues(rows);
  try { sh.hideSheet(); } catch (e) {}
}

function readState_() {
  const sh = sheet_(STATE_SHEET);
  const last = sh.getLastRow();
  if (last < 2) return { data: null, revision: 0, updatedAt: '', updatedAtMs: 0 };
  const header = sh.getRange(1,1,1,Math.min(5,sh.getMaxColumns())).getValues()[0];
  const rows = sh.getRange(2,1,last-1,Math.min(5,sh.getMaxColumns())).getValues().filter(r => r[1] !== '');
  rows.sort((a,b) => Number(a[0]) - Number(b[0]));
  if (!rows.length) return { data: null, revision: 0, updatedAt: '', updatedAtMs: 0 };
  const json = rows.map(r => String(r[1] || '')).join('');
  const updatedAt = String(rows[0][2] || '');
  let revision = 0;
  const revisionCol = header.indexOf('Revision');
  if (revisionCol >= 0) revision = Number(rows[0][revisionCol] || 0);
  let data = null;
  try { data = JSON.parse(json); } catch (e) { throw new Error('Cloud state JSON is invalid'); }
  return { data, revision, updatedAt, updatedAtMs: updatedAt ? new Date(updatedAt).getTime() : Number(data && data.settings && data.settings.clientUpdatedAt || 0) };
}

function writeBackup_(data, revision, savedAt) {
  const sh = sheet_(BACKUP_SHEET);
  if (sh.getLastRow() === 0) sh.getRange(1,1,1,5).setValues([['BackupID','Chunk','JSON','SavedAt','Revision']]);
  const json = JSON.stringify(data || {});
  const id = 'B-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Karachi', 'yyyyMMdd-HHmmss-SSS') + '-R' + revision;
  const rows = [];
  for (let i = 0, n = 1; i < json.length; i += CHUNK_SIZE, n++) rows.push([id,n,json.slice(i,i+CHUNK_SIZE),savedAt||new Date().toISOString(),revision]);
  if (!rows.length) rows.push([id,1,'{}',savedAt||new Date().toISOString(),revision]);
  sh.getRange(sh.getLastRow()+1,1,rows.length,5).setValues(rows);
  trimBackups_(sh);
  try { sh.hideSheet(); } catch (e) {}
}

function trimBackups_(sh) {
  const last = sh.getLastRow();
  if (last < 2) return;
  const ids = sh.getRange(2,1,last-1,1).getValues().map(r => String(r[0]||''));
  const order = [];
  ids.forEach(id => { if (id && order.indexOf(id) < 0) order.push(id); });
  if (order.length <= MAX_BACKUPS) return;
  const remove = new Set(order.slice(0, order.length - MAX_BACKUPS));
  for (let row = last; row >= 2; row--) {
    if (remove.has(String(sh.getRange(row,1).getValue()||''))) sh.deleteRow(row);
  }
}

function writeReadableTabs_(db, iso) {
  const customers = db.customers || [], orders = db.orders || [], payments = db.payments || [], quotes = db.quotes || [], vendors = db.vendors || [], vendorPayments = db.vendorPayments || [], expenses = db.expenses || [];

  const settingsRows = Object.keys(db.settings || {}).sort().map(k => [k, scalar_(db.settings[k]), '']);
  writeTable_('Settings', ['Key','Value','Notes'], settingsRows);

  writeTable_('Customers', ['CustomerID','Name','Phone','AreaAddress','Active','CreatedAt','UpdatedAt','JSON'], customers.map(c => [c.id||'',c.name||'',c.phone||'',c.area||'',c.active === false ? false : true,c.createdAt||'',c.updatedAt||'',json_(c)]));

  const payByOrder = {};
  payments.forEach(p => payByOrder[p.orderId] = n_(payByOrder[p.orderId]) + n_(p.amount));
  const orderRows = orders.map(o => {
    const gross = grossOrderTotal_(o,'order');
    const total = orderTotal_(o,'order');
    const received = n_(o.advance) + n_(payByOrder[o.id]);
    return [o.id||'',o.date||'',o.customerId||'',o.status||'',o.due||'',o.priority||'',items_(o).length,gross,n_(o.discount),total,n_(o.advance),received,Math.max(0,total-received),o.convertedFromQuote||'',o.notes||'',iso,json_(stripItems_(o))];
  });
  writeTable_('Orders', ['OrderNo','Date','CustomerID','Status','DueDate','Priority','ItemCount','ItemsTotal','Discount','SaleTotal','Advance','Received','Balance','ConvertedFromQuote','Notes','CloudUpdatedAt','JSON'], orderRows);

  const orderItemRows = [];
  orders.forEach(o => items_(o).forEach((x,i) => orderItemRows.push(itemRow_(o.id||'',i+1,x,'order'))));
  writeTable_('OrderItems', itemHeaders_(), orderItemRows);

  writeTable_('Payments', ['PaymentID','OrderNo','Date','Amount','Method','Reference','Notes','JSON'], payments.map(p => [p.id||'',p.orderId||'',p.date||'',n_(p.amount),p.method||'',p.reference||'',p.notes||'',json_(p)]));

  const quoteRows = quotes.map(q => [q.id||'',q.date||'',q.customerId||'',q.status||'',q.type||'',items_(q).length,orderTotal_(q,'quote'),q.convertedOrderId||q.orderId||'',q.notes||'',iso,json_(stripItems_(q))]);
  writeTable_('Quotations', ['QuotationNo','Date','CustomerID','Status','Type','ItemCount','Total','ConvertedOrderID','Notes','CloudUpdatedAt','JSON'], quoteRows);

  const quoteItemRows = [];
  quotes.forEach(q => items_(q).forEach((x,i) => quoteItemRows.push(itemRow_(q.id||'',i+1,x,'quote'))));
  writeTable_('QuotationItems', itemHeaders_(), quoteItemRows);

  writeTable_('Vendors', ['VendorID','Name','Phone','WorkType','Active','Notes','JSON'], vendors.map(v => [v.id||'',v.name||'',v.phone||'',v.workType||'',v.active === false ? false : true,v.notes||'',json_(v)]));

  writeTable_('VendorPayments', ['PaymentID','VendorID','Date','Amount','Method','Reference','Notes','JSON'], vendorPayments.map(p => [p.id||'',p.vendorId||'',p.date||'',n_(p.amount),p.method||'',p.reference||'',p.notes||'',json_(p)]));

  writeTable_('Expenses', ['ExpenseID','Date','Category','Description','Amount','PaidBy','Reference','Notes','JSON'], expenses.map(x => [x.id||'',x.date||'',x.category||'',x.description||'',n_(x.amount),x.paidBy||'',x.reference||'',x.notes||'',json_(x)]));

  const orderLast = maxSuffix_(orders.map(x => x.id));
  const quoteLast = maxSuffix_(quotes.map(x => x.id));
  const customerLast = maxSuffix_(customers.map(x => x.id));
  const vendorLast = maxSuffix_(vendors.map(x => x.id));
  writeTable_('Counters', ['Type','LastNumber','NextNumber','UpdatedAt'], [['Order',orderLast,orderLast+1,iso],['Quotation',quoteLast,quoteLast+1,iso],['Customer',customerLast,customerLast+1,iso],['Vendor',vendorLast,vendorLast+1,iso]]);
}

function writeTable_(name, headers, rows) {
  const sh = sheet_(name);
  sh.clearContents();
  if (sh.getMaxColumns() < headers.length) sh.insertColumnsAfter(sh.getMaxColumns(), headers.length - sh.getMaxColumns());
  if (sh.getMaxRows() < Math.max(2, rows.length + 1)) sh.insertRowsAfter(sh.getMaxRows(), rows.length + 1 - sh.getMaxRows());
  sh.getRange(1,1,1,headers.length).setValues([headers]);
  if (rows.length) sh.getRange(2,1,rows.length,headers.length).setValues(rows.map(r => pad_(r, headers.length)));
  sh.setFrozenRows(1);
  sh.getRange(1,1,1,headers.length).setFontWeight('bold');
}

function pad_(row, len) {
  const a = row.slice(0,len);
  while (a.length < len) a.push('');
  return a.map(scalar_);
}

function scalar_(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v;
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

function json_(v) {
  try { return JSON.stringify(v); } catch (e) { return ''; }
}

function stripItems_(o) {
  const x = Object.assign({}, o || {});
  delete x.lineItems;
  return x;
}

function items_(o) {
  if (o && Array.isArray(o.lineItems) && o.lineItems.length) return o.lineItems;
  return o ? [Object.assign({}, o)] : [];
}

function n_(x) { return Number(x) || 0; }

function area_(x) {
  return n_(x.widthFt) && n_(x.heightFt) ? n_(x.widthFt) * n_(x.heightFt) * Math.max(1,n_(x.panels)||1) : n_(x.qty);
}

function offsetCost_(x) {
  return n_(x.printingCost)+n_(x.plateQty)*n_(x.plateRate)+n_(x.dieCost)+n_(x.laminationCost)+n_(x.uvFoilCost)+n_(x.cuttingCost)+n_(x.bindingCost)+n_(x.packingCost)+n_(x.transportCost)+n_(x.vendorCost);
}

function lineTotal_(x, mode) {
  x = x || {};
  const s = x.service || 'Other';
  const extras = n_(x.otherCharges)+n_(x.otherCharges2)+n_(x.otherCharges3);
  if (s === 'Flex Printing' || s === 'Wallpaper + Fitting') return area_(x)*n_(x.rate)+n_(x.designCharges)+n_(x.fittingCharges)+extras;
  if (s === 'Passport Photos') return n_(x.qty)*n_(x.rate)+n_(x.retouchCharges)+extras;
  if (s === 'ID / Document Print') return n_(x.qty)*n_(x.rate)+n_(x.designCharges)+n_(x.laminationCharges)+extras;
  if (mode === 'quote' && s === 'Offset / Packaging' && (x.pricingMethod === 'cost' || x.quoteMethod === 'cost')) return offsetCost_(x)+n_(x.designCharges)+extras+n_(x.desiredProfit);
  return n_(x.qty)*n_(x.rate)+n_(x.designCharges)+n_(x.finishingCharges)+n_(x.fittingCharges)+extras;
}

function grossOrderTotal_(o, mode) {
  const arr = items_(o);
  return arr.reduce((a,x) => a + lineTotal_(x,mode),0);
}

function orderTotal_(o, mode) {
  const gross = grossOrderTotal_(o,mode);
  return mode === 'order' ? Math.max(0,gross-n_(o && o.discount)) : gross;
}

function vendorCost_(o) {
  return items_(o).reduce((a,x) => a + (x.service === 'Offset / Packaging' ? offsetCost_(x) : n_(x.vendorCost)),0);
}

function itemHeaders_() {
  return ['ParentNo','ItemNo','Service','Item','ItemType','Material','WidthFt','HeightFt','Panels','AreaSqFt','Qty','Unit','Rate','DesignCharges','FittingCharges','OtherCharges','FinishingType','FinishingCharges','VendorID','VendorCost','PurchaseBillRef','PaperSize','PaperType','GSM','ColorMode','Sides','Size','PrintingCost','PlateQty','PlateRate','DieCost','LaminationCost','CuttingCost','TransportCost','Subtotal','JSON'];
}

function itemRow_(parentNo, itemNo, x, mode) {
  return [parentNo,itemNo,x.service||'',x.item||'',x.itemType||'',x.material||'',n_(x.widthFt),n_(x.heightFt),n_(x.panels),area_(x),n_(x.qty),x.unit||'',n_(x.rate),n_(x.designCharges),n_(x.fittingCharges),n_(x.otherCharges),x.finishingType||'',n_(x.finishingCharges),x.vendorId||'',n_(x.vendorCost),x.purchaseBillRef||x.purchaseBill||'',x.paperSize||'',x.paperType||'',x.gsm||'',x.colorMode||'',x.sides||'',x.size||'',n_(x.printingCost),n_(x.plateQty),n_(x.plateRate),n_(x.dieCost),n_(x.laminationCost),n_(x.cuttingCost),n_(x.transportCost),lineTotal_(x,mode),json_(x)];
}

function maxSuffix_(ids) {
  let m = 0;
  (ids || []).forEach(id => {
    const a = String(id || '').match(/(\d+)(?!.*\d)/);
    if (a) m = Math.max(m, Number(a[1]) || 0);
  });
  return m;
}
