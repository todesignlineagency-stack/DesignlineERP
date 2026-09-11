const SHEET_ID = '1zm0XvdY6zYREUIvVbHf7pRoZCnWHgandxjgObYNi4uk';
const STATE_SHEET = 'State';
const CHUNK_SIZE = 45000;

function doGet(e) {
  const p = (e && e.parameter) || {};
  const action = String(p.action || 'load');
  let payload;
  try {
    if (action === 'ping') {
      payload = { ok: true, service: 'DesignLine ERP Cloud', time: new Date().toISOString(), sheetId: SHEET_ID };
    } else if (action === 'load') {
      const meta = readState_();
      payload = { ok: true, data: meta.data, updatedAt: meta.updatedAt, updatedAtMs: meta.updatedAtMs, schema: 1 };
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
    if (body.action !== 'syncAll') return output_({ ok: false, error: 'Unknown action' });
    const result = syncAll_(body.data || {});
    return output_({ ok: true, updatedAt: result.updatedAt, updatedAtMs: result.updatedAtMs, schema: 1 });
  } catch (err) {
    return output_({ ok: false, error: String(err && err.message ? err.message : err) });
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

function syncAll_(data) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    data = normalizeData_(data);
    const now = new Date();
    const iso = now.toISOString();
    const ms = now.getTime();
    data.settings = data.settings || {};
    data.settings.cloudUpdatedAt = iso;
    data.settings.storageMode = 'Google Sheets Cloud';

    writeState_(data, iso);
    writeReadableTabs_(data, iso);
    return { updatedAt: iso, updatedAtMs: ms };
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

function writeState_(data, iso) {
  const sh = sheet_(STATE_SHEET);
  sh.clearContents();
  sh.getRange(1,1,1,4).setValues([['Chunk','JSON','UpdatedAt','Schema']]);
  const json = JSON.stringify(data);
  const rows = [];
  for (let i = 0, n = 1; i < json.length; i += CHUNK_SIZE, n++) {
    rows.push([n, json.slice(i, i + CHUNK_SIZE), n === 1 ? iso : '', n === 1 ? 1 : '']);
  }
  if (!rows.length) rows.push([1, '{}', iso, 1]);
  sh.getRange(2,1,rows.length,4).setValues(rows);
  try { sh.hideSheet(); } catch (e) {}
}

function readState_() {
  const sh = sheet_(STATE_SHEET);
  const last = sh.getLastRow();
  if (last < 2) return { data: null, updatedAt: '', updatedAtMs: 0 };
  const rows = sh.getRange(2,1,last-1,4).getValues().filter(r => r[1] !== '');
  rows.sort((a,b) => Number(a[0]) - Number(b[0]));
  if (!rows.length) return { data: null, updatedAt: '', updatedAtMs: 0 };
  const json = rows.map(r => String(r[1] || '')).join('');
  const updatedAt = String(rows[0][2] || '');
  let data = null;
  try { data = JSON.parse(json); } catch (e) { throw new Error('Cloud state JSON is invalid'); }
  return { data, updatedAt, updatedAtMs: updatedAt ? new Date(updatedAt).getTime() : Number(data && data.settings && data.settings.clientUpdatedAt || 0) };
}

function writeReadableTabs_(db, iso) {
  const customers = db.customers || [], orders = db.orders || [], payments = db.payments || [], quotes = db.quotes || [], vendors = db.vendors || [], vendorPayments = db.vendorPayments || [], expenses = db.expenses || [];

  const settingsRows = Object.keys(db.settings || {}).sort().map(k => [k, scalar_(db.settings[k]), '']);
  writeTable_('Settings', ['Key','Value','Notes'], settingsRows);

  writeTable_('Customers', ['CustomerID','Name','Phone','AreaAddress','Active','CreatedAt','UpdatedAt','JSON'], customers.map(c => [c.id||'',c.name||'',c.phone||'',c.area||'',c.active === false ? false : true,c.createdAt||'',c.updatedAt||'',json_(c)]));

  const payByOrder = {};
  payments.forEach(p => payByOrder[p.orderId] = n_(payByOrder[p.orderId]) + n_(p.amount));
  const orderRows = orders.map(o => {
    const total = orderTotal_(o,'order');
    const received = n_(o.advance) + n_(payByOrder[o.id]);
    return [o.id||'',o.date||'',o.customerId||'',o.status||'',o.due||'',o.priority||'',items_(o).length,total,n_(o.advance),received,Math.max(0,total-received),vendorCost_(o),o.convertedFromQuote||'',o.notes||'',iso,json_(stripItems_(o))];
  });
  writeTable_('Orders', ['OrderNo','Date','CustomerID','Status','DueDate','Priority','ItemCount','SaleTotal','Advance','Received','Balance','VendorCost','ConvertedFromQuote','Notes','CloudUpdatedAt','JSON'], orderRows);

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
  if (s === 'Flex Printing' || s === 'Wallpaper + Fitting') return area_(x)*n_(x.rate)+n_(x.designCharges)+n_(x.fittingCharges)+n_(x.otherCharges);
  if (s === 'Passport Photos') return n_(x.qty)*n_(x.rate)+n_(x.retouchCharges)+n_(x.otherCharges);
  if (s === 'ID / Document Print') return n_(x.qty)*n_(x.rate)+n_(x.designCharges)+n_(x.laminationCharges)+n_(x.otherCharges);
  if (mode === 'quote' && s === 'Offset / Packaging' && (x.pricingMethod === 'cost' || x.quoteMethod === 'cost')) return offsetCost_(x)+n_(x.designCharges)+n_(x.otherCharges)+n_(x.desiredProfit);
  return n_(x.qty)*n_(x.rate)+n_(x.designCharges)+n_(x.finishingCharges)+n_(x.fittingCharges)+n_(x.otherCharges);
}

function orderTotal_(o, mode) {
  const arr = items_(o);
  return arr.reduce((a,x) => a + lineTotal_(x,mode),0);
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
