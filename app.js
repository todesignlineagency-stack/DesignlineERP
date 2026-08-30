// Design Line Manager - Mobile Optimized

var STORAGE_KEY = 'dlm_v3';
var state = {
  business: { name: 'Design Line Agency', phone: '0320-6206454', email: 'todesignlineagency@gmail.com', address: 'Main Gujranwala Road, Near NBP Bank, Nokhar Mandi', currency: 'Rs.', prefix: 'INV' },
  users: [{ id: 'admin', name: 'Admin', username: 'admin', password: 'admin123', role: 'admin' }],
  customers: [],
  items: [
    { id: gid(), name: 'Flex Printing', category: 'Flex', unit: 'sqft', price: 30, calcType: 'area' },
    { id: gid(), name: 'Wallpaper Printing', category: 'Wallpaper', unit: 'sqft', price: 80, calcType: 'area' },
    { id: gid(), name: 'Wallpaper Fitting', category: 'Wallpaper', unit: 'sqft', price: 30, calcType: 'area' },
    { id: gid(), name: 'Digital Print (Color)', category: 'Digital', unit: 'qty', price: 15, calcType: 'quantity' },
    { id: gid(), name: 'Digital Print (Black)', category: 'Digital', unit: 'qty', price: 5, calcType: 'quantity' },
    { id: gid(), name: 'Offsite Printing Job', category: 'Offsite', unit: 'job', price: 0, calcType: 'job' },
    { id: gid(), name: 'Photo Copy (Black)', category: 'Copy', unit: 'page', price: 3, calcType: 'quantity' }
  ],
  invoices: [],
  payments: [],
  expenses: [],
  vendors: []
};

var qbItems = [];
var invItems = [];
var currentUser = null;
var editId = null;

function gid() { return 'id' + Date.now() + Math.random().toString(36).substr(2, 6); }
function money(n) { return state.business.currency + ' ' + (Number(n) || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 }); }
function today() { return new Date().toISOString().split('T')[0]; }
function fdate(s) { if (!s) return ''; var d = new Date(s); return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
function toast(msg, type) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = type === 'success' ? '#16a34a' : (type === 'error' ? '#dc2626' : '#0a0a0a');
  t.style.transform = 'translateY(0)';
  t.style.opacity = '1';
  setTimeout(function() { t.style.transform = 'translateY(100px)'; t.style.opacity = '0'; }, 2500);
}
function $(id) { return document.getElementById(id); }

function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {} }
function load() {
  try {
    var s = localStorage.getItem(STORAGE_KEY);
    if (s) {
      var d = JSON.parse(s);
      if (d.business) state.business = d.business;
      if (d.customers) state.customers = d.customers;
      if (d.items) state.items = d.items;
      if (d.invoices) state.invoices = d.invoices;
      if (d.payments) state.payments = d.payments;
      if (d.expenses) state.expenses = d.expenses;
      if (d.vendors) state.vendors = d.vendors;
    }
  } catch (e) {}
}

function isAdmin() { return currentUser && currentUser.role === 'admin'; }

// LOGIN
function doLogin() {
  var u = $('loginUser').value.trim();
  var p = $('loginPass').value;
  if (!u || !p) { $('loginError').textContent = 'Enter username and password'; return; }
  var found = null;
  for (var i = 0; i < state.users.length; i++) {
    if (state.users[i].username === u && state.users[i].password === p) { found = state.users[i]; break; }
  }
  if (found) {
    currentUser = found;
    $('loginPage').style.display = 'none';
    $('appPage').style.display = 'block';
    $('userInfo').textContent = found.name;
    $('loginError').textContent = '';
    nav('dashboard');
    toast('Welcome ' + found.name, 'success');
  } else {
    $('loginError').textContent = 'Wrong username or password';
  }
}

function doLogout() {
  if (!confirm('Logout?')) return;
  currentUser = null;
  $('appPage').style.display = 'none';
  $('loginPage').style.display = 'flex';
  $('loginUser').value = '';
  $('loginPass').value = '';
}

// SIDEBAR
function openSidebar() {
  $('sidebar').style.left = '0';
  $('sidebarOverlay').style.display = 'block';
}
function closeSidebar() {
  $('sidebar').style.left = '-280px';
  $('sidebarOverlay').style.display = 'none';
}

// NAVIGATION
function nav(page) {
  var sections = document.querySelectorAll('.page');
  for (var i = 0; i < sections.length; i++) sections[i].style.display = 'none';
  var el = $('page-' + page);
  if (el) el.style.display = 'block';
  var navs = document.querySelectorAll('.nav-item');
  for (var i = 0; i < navs.length; i++) { navs[i].classList.remove('active'); navs[i].style.background = 'transparent'; navs[i].style.color = '#ccc'; navs[i].style.borderLeft = '3px solid transparent'; }
  var navEl = document.querySelector('[data-page="' + page + '"]');
  if (navEl) { navEl.classList.add('active'); navEl.style.background = '#222'; navEl.style.color = '#fff'; navEl.style.borderLeft = '3px solid #e01515'; }
  var titles = { dashboard: 'DASHBOARD', quickbill: 'QUICK BILL', invoices: 'INVOICES', newinvoice: 'NEW INVOICE', customers: 'CUSTOMERS', items: 'ITEMS', payments: 'PAYMENTS', expenses: 'EXPENSES', vendors: 'VENDORS', reports: 'REPORTS', settings: 'SETTINGS' };
  $('pageTitle').textContent = titles[page] || page;
  if (page === 'dashboard') renderDash();
  if (page === 'invoices') renderInv();
  if (page === 'newinvoice') renderNewInv();
  if (page === 'customers') renderCust();
  if (page === 'items') renderItems();
  if (page === 'payments') renderPay();
  if (page === 'expenses') renderExp();
  if (page === 'vendors') renderVendors();
  if (page === 'quickbill') renderQB();
  closeSidebar();
}

// DASHBOARD
function renderDash() {
  var todayStr = today();
  var monthStr = todayStr.slice(0, 7);
  var todayInv = state.invoices.filter(function(i) { return i.date === todayStr; });
  var monthInv = state.invoices.filter(function(i) { return i.date && i.date.indexOf(monthStr) === 0; });
  var todaySales = todayInv.reduce(function(s, i) { return s + Number(i.total); }, 0);
  var monthSales = monthInv.reduce(function(s, i) { return s + Number(i.total); }, 0);
  var pending = state.invoices.reduce(function(s, i) { return s + Number(i.due || 0); }, 0);
  var monthExp = state.expenses.filter(function(e) { return e.date && e.date.indexOf(monthStr) === 0; }).reduce(function(s, e) { return s + Number(e.amount); }, 0);
  var todayExp = state.expenses.filter(function(e) { return e.date === todayStr; }).reduce(function(s, e) { return s + Number(e.amount); }, 0);

  var cards = [
    { c: '#e01515', i: '💰', l: "Today's Sales", v: money(todaySales) },
    { c: '#16a34a', i: '📅', l: 'This Month', v: money(monthSales) },
    { c: '#f59e0b', i: '⏰', l: 'Pending Dues', v: money(pending) },
    { c: '#2563eb', i: '👥', l: 'Customers', v: state.customers.length },
    { c: '#dc2626', i: '💸', l: "Today's Expenses", v: money(todayExp) },
    { c: '#0a0a0a', i: '📊', l: 'Net Profit', v: money(monthSales - monthExp) }
  ];
  var html = '';
  for (var i = 0; i < cards.length; i++) {
    html += '<div style="background:#fff;padding:14px;border-radius:10px;display:flex;align-items:center;gap:12px;box-shadow:0 2px 4px rgba(0,0,0,0.05);border-left:4px solid ' + cards[i].c + '"><div style="font-size:24px">' + cards[i].i + '</div><div style="flex:1;min-width:0"><div style="font-size:11px;color:#666;font-weight:600;text-transform:uppercase">' + cards[i].l + '</div><div style="font-size:16px;font-weight:700;color:#0a0a0a;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + cards[i].v + '</div></div></div>';
  }
  $('statsGrid').innerHTML = html;

  var recent = state.invoices.slice().sort(function(a, b) { return new Date(b.date) - new Date(a.date); }).slice(0, 5);
  var body = document.querySelector('#recentTbl tbody');
  body.innerHTML = recent.length ? recent.map(function(i) {
    return '<tr style="border-bottom:1px solid #eee"><td style="padding:10px"><strong>' + i.number + '</strong></td><td style="padding:10px">' + i.customerName + '</td><td style="padding:10px;text-align:right"><strong>' + money(i.total) + '</strong></td><td style="padding:10px"><span style="padding:3px 8px;border-radius:10px;font-size:10px;font-weight:700;background:' + (i.status === 'paid' ? '#d1fae5' : (i.status === 'unpaid' ? '#fee2e2' : '#fef3c7')) + ';color:' + (i.status === 'paid' ? '#065f46' : (i.status === 'unpaid' ? '#991b1b' : '#92400e')) + '">' + i.status + '</span></td></tr>';
  }).join('') : '<tr><td colspan="4" style="text-align:center;color:#888;padding:20px">No invoices yet</td></tr>';
}

// QUICK BILL
function renderQB() {
  qbItems = [];
  $('qbItem').innerHTML = '<option value="">-- Select Item --</option>' + state.items.map(function(i) { return '<option value="' + i.id + '">' + i.name + '</option>'; }).join('');
  $('qbAreaBox').style.display = 'none';
  $('qbQtyBox').style.display = 'grid';
  $('qbCustomer').value = '';
  $('qbPhone').value = '';
  $('qbDiscount').value = '0';
  $('qbPaid').value = '0';
  $('qbStatus').value = 'paid';
  renderQBTbl();
}

function setupQBEvents() {
  $('qbItem').onchange = function() {
    var id = this.value;
    if (!id) { $('qbAreaBox').style.display = 'none'; $('qbQtyBox').style.display = 'grid'; return; }
    var item = state.items.filter(function(i) { return i.id === id; })[0];
    if (!item) return;
    if (item.calcType === 'area') {
      $('qbAreaBox').style.display = 'block';
      $('qbQtyBox').style.display = 'none';
      $('qbAreaPrice').value = item.price;
      $('qbHeight').value = '';
      $('qbWidth').value = '';
      $('qbAreaResult').textContent = 'Enter Height & Width';
    } else {
      $('qbAreaBox').style.display = 'none';
      $('qbQtyBox').style.display = 'grid';
      $('qbPrice').value = item.price;
    }
  };
  ['qbHeight', 'qbWidth', 'qbAreaPrice'].forEach(function(id) {
    $(id).oninput = function() {
      var h = parseFloat($('qbHeight').value) || 0;
      var w = parseFloat($('qbWidth').value) || 0;
      var p = parseFloat($('qbAreaPrice').value) || 0;
      var total = h * w;
      $('qbAreaResult').innerHTML = 'Total: <span style="color:#e01515">' + total.toFixed(2) + ' sqft</span> = ' + money(total * p);
    };
  });
  $('qbAddBtn').onclick = addQBItem;
  $('qbSaveBtn').onclick = saveQB;
  $('qbDiscount').oninput = renderQBTbl;
  $('qbStatus').onchange = function() {
    var sub = qbItems.reduce(function(s, it) { return s + it.total; }, 0);
    var disc = parseFloat($('qbDiscount').value) || 0;
    var tot = Math.max(0, sub - disc);
    if (this.value === 'paid') $('qbPaid').value = tot;
    if (this.value === 'unpaid') $('qbPaid').value = 0;
  };
}

function addQBItem() {
  var id = $('qbItem').value;
  if (!id) { toast('Select item first', 'error'); return; }
  var item = state.items.filter(function(i) { return i.id === id; })[0];
  if (!item) return;
  var qty = 1, price = 0, details = '';
  if (item.calcType === 'area') {
    var h = parseFloat($('qbHeight').value) || 0;
    var w = parseFloat($('qbWidth').value) || 0;
    if (h <= 0 || w <= 0) { toast('Enter Height and Width', 'error'); return; }
    qty = h * w;
    price = parseFloat($('qbAreaPrice').value) || 0;
    if (price <= 0) { toast('Enter price', 'error'); return; }
    details = h + 'ft × ' + w + 'ft = ' + qty.toFixed(2) + ' sqft';
  } else {
    qty = parseFloat($('qbQty').value) || 0;
    price = parseFloat($('qbPrice').value) || 0;
    if (qty <= 0 || price <= 0) { toast('Enter qty & price', 'error'); return; }
    details = qty + ' ' + item.unit;
  }
  qbItems.push({ id: gid(), name: item.name, unit: item.unit, qty: qty, price: price, total: qty * price, details: details });
  renderQBTbl();
  toast('Added!', 'success');
  $('qbItem').value = '';
  $('qbAreaBox').style.display = 'none';
  $('qbQtyBox').style.display = 'grid';
}

function renderQBTbl() {
  var body = document.querySelector('#qbItemsTbl tbody');
  body.innerHTML = qbItems.length ? qbItems.map(function(it, i) {
    return '<tr style="border-bottom:1px solid #eee"><td style="padding:8px"><strong>' + it.name + '</strong><br><small style="color:#666">' + it.details + '</small></td><td style="padding:8px;text-align:right"><strong>' + money(it.total) + '</strong></td><td style="padding:8px;text-align:center"><button onclick="delQB(' + i + ')" style="background:#dc2626;color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px">🗑️</button></td></tr>';
  }).join('') : '<tr><td colspan="3" style="text-align:center;color:#888;padding:16px">No items</td></tr>';
  var sub = qbItems.reduce(function(s, it) { return s + it.total; }, 0);
  var disc = parseFloat($('qbDiscount').value) || 0;
  var tot = Math.max(0, sub - disc);
  $('qbSubtotal').textContent = money(sub);
  $('qbTotal').textContent = money(tot);
}

function delQB(i) { qbItems.splice(i, 1); renderQBTbl(); }

function saveQB() {
  if (qbItems.length === 0) { toast('Add items first', 'error'); return; }
  var cname = $('qbCustomer').value.trim() || 'Walk-in Customer';
  var phone = $('qbPhone').value.trim();
  var sub = qbItems.reduce(function(s, it) { return s + it.total; }, 0);
  var disc = parseFloat($('qbDiscount').value) || 0;
  var tot = Math.max(0, sub - disc);
  var status = $('qbStatus').value;
  var paid = parseFloat($('qbPaid').value) || 0;
  if (status === 'paid') paid = tot;
  if (status === 'unpaid') paid = 0;
  if (paid > tot) paid = tot;
  var qbList = JSON.parse(localStorage.getItem('dlm_qb') || '[]');
  var num = 'QB-' + String(qbList.length + 1).padStart(4, '0');
  var qb = { number: num, date: today(), customerName: cname, phone: phone, items: qbItems.slice(), subtotal: sub, discount: disc, total: tot, paid: paid, due: tot - paid, status: tot - paid <= 0 ? 'paid' : 'unpaid' };
  qbList.push(qb);
  localStorage.setItem('dlm_qb', JSON.stringify(qbList));
  toast('Quick Bill ' + num + ' saved!', 'success');
  printBill('QUICK BILL ' + num, qb);
  qbItems = [];
  renderQB();
}

// INVOICES
function renderInv() {
  var search = ($('invSearch').value || '').toLowerCase();
  var list = state.invoices.filter(function(i) {
    return !search || (i.number && i.number.toLowerCase().indexOf(search) >= 0) || (i.customerName && i.customerName.toLowerCase().indexOf(search) >= 0);
  }).sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
  var body = document.querySelector('#invTbl tbody');
  body.innerHTML = list.length ? list.map(function(i) {
    return '<tr style="border-bottom:1px solid #eee">' +
      '<td style="padding:8px"><strong>' + i.number + '</strong></td>' +
      '<td style="padding:8px">' + i.customerName + '<br><small style="color:#888">' + fdate(i.date) + '</small></td>' +
      '<td style="padding:8px;text-align:right"><strong>' + money(i.total) + '</strong><br><small style="color:' + (i.due > 0 ? '#dc2626' : '#16a34a') + '">Due: ' + money(i.due) + '</small></td>' +
      '<td style="padding:8px;white-space:nowrap">' +
        '<button onclick="printInv(\'' + i.id + '\')" style="background:#2563eb;color:#fff;border:none;padding:6px 8px;border-radius:4px;cursor:pointer;font-size:14px;margin-right:2px" title="Print">🖨️</button>' +
        '<button onclick="waInv(\'' + i.id + '\')" style="background:#16a34a;color:#fff;border:none;padding:6px 8px;border-radius:4px;cursor:pointer;font-size:14px;margin-right:2px" title="WhatsApp">📱</button>' +
        (isAdmin() ? '<button onclick="delInv(\'' + i.id + '\')" style="background:#dc2626;color:#fff;border:none;padding:6px 8px;border-radius:4px;cursor:pointer;font-size:14px" title="Delete">🗑️</button>' : '') +
      '</td></tr>';
  }).join('') : '<tr><td colspan="4" style="text-align:center;color:#888;padding:20px">No invoices yet. Go to NEW INVOICE.</td></tr>';
}

function delInv(id) {
  if (!isAdmin()) return;
  if (!confirm('Delete?')) return;
  state.invoices = state.invoices.filter(function(i) { return i.id !== id; });
  state.payments = state.payments.filter(function(p) { return p.invoiceId !== id; });
  save();
  renderInv();
  toast('Deleted', 'success');
}

function printInv(id) {
  var inv = state.invoices.filter(function(i) { return i.id === id; })[0];
  if (!inv) return;
  printBill('INVOICE ' + inv.number, inv);
}

function waInv(id) {
  var inv = state.invoices.filter(function(i) { return i.id === id; })[0];
  if (!inv) return;
  var ph = (inv.phone || '').replace(/[^0-9]/g, '');
  if (ph.indexOf('03') === 0) ph = '92' + ph.substr(1);
  if (!ph) { toast('No phone number', 'error'); return; }
  var itemsTxt = inv.items.map(function(it) { return '* ' + it.name + ' (' + (it.details || it.qty + ' ' + it.unit) + ') = ' + money(it.total); }).join('%0A');
  var msg = '*' + state.business.name + '*%0A' + state.business.phone + '%0A%0A*Invoice: ' + inv.number + '*%0A*Date:* ' + fdate(inv.date) + '%0A%0A*Bill To:* ' + inv.customerName + '%0A%0A*Items:*%0A' + itemsTxt + '%0A%0A*Total:* ' + money(inv.total) + '%0A*Due:* ' + money(inv.due) + '%0A%0AThank you!';
  window.open('https://wa.me/' + ph + '?text=' + msg, '_blank');
}

// NEW INVOICE
function renderNewInv() {
  invItems = [];
  $('invCustSel').innerHTML = '<option value="">-- Select Customer --</option><option value="__new__">+ Add New Customer</option>' + state.customers.map(function(c) {
    return '<option value="' + c.id + '">' + c.name + (c.phone ? ' (' + c.phone + ')' : '') + '</option>';
  }).join('');
  $('invItemSel').innerHTML = '<option value="">-- Select Item --</option>' + state.items.map(function(i) {
    return '<option value="' + i.id + '">' + i.name + '</option>';
  }).join('');
  $('invCustName').value = '';
  $('invCustPhone').value = '';
  $('invAreaBox').style.display = 'none';
  $('invQtyBox').style.display = 'grid';
  $('invDiscount').value = '0';
  $('invPaid').value = '0';
  $('invStatus').value = 'unpaid';
  renderInvItemsTbl();
}

function setupInvEvents() {
  $('invCustSel').onchange = function() {
    var v = this.value;
    if (v === '__new__') { openCustModal(); this.value = ''; return; }
    if (!v) { $('invCustName').value = ''; $('invCustPhone').value = ''; return; }
    var c = state.customers.filter(function(x) { return x.id === v; })[0];
    if (c) { $('invCustName').value = c.name; $('invCustPhone').value = c.phone || ''; }
  };
  $('invItemSel').onchange = function() {
    var id = this.value;
    if (!id) { $('invAreaBox').style.display = 'none'; $('invQtyBox').style.display = 'grid'; return; }
    var item = state.items.filter(function(i) { return i.id === id; })[0];
    if (!item) return;
    if (item.calcType === 'area') {
      $('invAreaBox').style.display = 'block';
      $('invQtyBox').style.display = 'none';
      $('invAreaPrice').value = item.price;
      $('invHeight').value = '';
      $('invWidth').value = '';
      $('invAreaResult').textContent = 'Enter Height & Width';
    } else {
      $('invAreaBox').style.display = 'none';
      $('invQtyBox').style.display = 'grid';
      $('invPrice').value = item.price;
    }
  };
  ['invHeight', 'invWidth', 'invAreaPrice'].forEach(function(id) {
    $(id).oninput = function() {
      var h = parseFloat($('invHeight').value) || 0;
      var w = parseFloat($('invWidth').value) || 0;
      var p = parseFloat($('invAreaPrice').value) || 0;
      var total = h * w;
      $('invAreaResult').innerHTML = 'Total: <span style="color:#e01515">' + total.toFixed(2) + ' sqft</span> = ' + money(total * p);
    };
  });
  $('invAddBtn').onclick = addInvItem;
  $('invSaveBtn').onclick = saveInv;
  $('invDiscount').oninput = renderInvItemsTbl;
  $('invStatus').onchange = function() {
    var sub = invItems.reduce(function(s, it) { return s + it.total; }, 0);
    var disc = parseFloat($('invDiscount').value) || 0;
    var tot = Math.max(0, sub - disc);
    if (this.value === 'paid') $('invPaid').value = tot;
    if (this.value === 'unpaid') $('invPaid').value = 0;
  };
}

function addInvItem() {
  var id = $('invItemSel').value;
  if (!id) { toast('Select item first', 'error'); return; }
  var item = state.items.filter(function(i) { return i.id === id; })[0];
  if (!item) return;
  var qty = 1, price = 0, details = '';
  if (item.calcType === 'area') {
    var h = parseFloat($('invHeight').value) || 0;
    var w = parseFloat($('invWidth').value) || 0;
    if (h <= 0 || w <= 0) { toast('Enter Height and Width', 'error'); return; }
    qty = h * w;
    price = parseFloat($('invAreaPrice').value) || 0;
    if (price <= 0) { toast('Enter price', 'error'); return; }
    details = h + 'ft × ' + w + 'ft = ' + qty.toFixed(2) + ' sqft';
  } else {
    qty = parseFloat($('invQty').value) || 0;
    price = parseFloat($('invPrice').value) || 0;
    if (qty <= 0 || price <= 0) { toast('Enter qty & price', 'error'); return; }
    details = qty + ' ' + item.unit;
  }
  invItems.push({ id: gid(), name: item.name, unit: item.unit, qty: qty, price: price, total: qty * price, details: details });
  renderInvItemsTbl();
  toast('Added!', 'success');
  $('invItemSel').value = '';
  $('invAreaBox').style.display = 'none';
  $('invQtyBox').style.display = 'grid';
}

function renderInvItemsTbl() {
  var body = document.querySelector('#invItemsTbl tbody');
  body.innerHTML = invItems.length ? invItems.map(function(it, i) {
    return '<tr style="border-bottom:1px solid #eee"><td style="padding:8px"><strong>' + it.name + '</strong><br><small style="color:#666">' + it.details + '</small></td><td style="padding:8px;text-align:right"><strong>' + money(it.total) + '</strong></td><td style="padding:8px;text-align:center"><button onclick="delInvItem(' + i + ')" style="background:#dc2626;color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px">🗑️</button></td></tr>';
  }).join('') : '<tr><td colspan="3" style="text-align:center;color:#888;padding:16px">No items</td></tr>';
  var sub = invItems.reduce(function(s, it) { return s + it.total; }, 0);
  var disc = parseFloat($('invDiscount').value) || 0;
  var tot = Math.max(0, sub - disc);
  $('invSubtotal').textContent = money(sub);
  $('invTotal').textContent = money(tot);
}

function delInvItem(i) { invItems.splice(i, 1); renderInvItemsTbl(); }

function saveInv() {
  if (invItems.length === 0) { toast('Add items first', 'error'); return; }
  var cid = $('invCustSel').value;
  if (!cid) { toast('Select customer', 'error'); return; }
  var c = state.customers.filter(function(x) { return x.id === cid; })[0];
  if (!c) { toast('Customer not found', 'error'); return; }
  var sub = invItems.reduce(function(s, it) { return s + it.total; }, 0);
  var disc = parseFloat($('invDiscount').value) || 0;
  var tot = Math.max(0, sub - disc);
  var status = $('invStatus').value;
  var paid = parseFloat($('invPaid').value) || 0;
  if (status === 'paid') paid = tot;
  if (status === 'unpaid') paid = 0;
  if (paid > tot) paid = tot;
  var num = state.business.prefix + '-' + String(state.invoices.length + 1).padStart(4, '0');
  var inv = { id: gid(), number: num, date: today(), customerId: c.id, customerName: c.name, phone: c.phone, address: c.address, items: invItems.slice(), subtotal: sub, discount: disc, total: tot, paid: paid, due: tot - paid, status: tot - paid <= 0 ? 'paid' : (paid > 0 ? 'partial' : 'unpaid') };
  state.invoices.push(inv);
  if (paid > 0) state.payments.push({ id: gid(), date: today(), invoiceId: inv.id, invoiceNumber: num, customerName: c.name, amount: paid, method: $('invMethod').value });
  save();
  toast('Invoice ' + num + ' saved!', 'success');
  printBill('INVOICE ' + num, inv);
  invItems = [];
  renderNewInv();
  nav('invoices');
}

// CUSTOMERS
function renderCust() {
  var search = ($('custSearch').value || '').toLowerCase();
  var list = state.customers.filter(function(c) {
    return !search || c.name.toLowerCase().indexOf(search) >= 0 || (c.phone || '').indexOf(search) >= 0;
  });
  var body = document.querySelector('#custTbl tbody');
  body.innerHTML = list.length ? list.map(function(c) {
    var invs = state.invoices.filter(function(i) { return i.customerId === c.id; });
    var due = invs.reduce(function(s, i) { return s + Number(i.due || 0); }, 0);
    return '<tr style="border-bottom:1px solid #eee">' +
      '<td style="padding:8px"><strong>' + c.name + '</strong></td>' +
      '<td style="padding:8px">' + (c.phone || '-') + '</td>' +
      '<td style="padding:8px;text-align:right">' + (due > 0 ? '<span style="color:#dc2626;font-weight:700">' + money(due) + '</span>' : '-') + '</td>' +
      '<td style="padding:8px;white-space:nowrap">' +
        '<button onclick="editCust(\'' + c.id + '\')" style="background:#f59e0b;color:#fff;border:none;padding:5px 8px;border-radius:4px;cursor:pointer;font-size:13px;margin-right:2px">✏️</button>' +
        (isAdmin() ? '<button onclick="delCust(\'' + c.id + '\')" style="background:#dc2626;color:#fff;border:none;padding:5px 8px;border-radius:4px;cursor:pointer;font-size:13px">🗑️</button>' : '') +
      '</td></tr>';
  }).join('') : '<tr><td colspan="4" style="text-align:center;color:#888;padding:20px">No customers yet</td></tr>';
}

function delCust(id) {
  if (!isAdmin()) return;
  if (!confirm('Delete?')) return;
  state.customers = state.customers.filter(function(c) { return c.id !== id; });
  save();
  renderCust();
  toast('Deleted', 'success');
}

function openCustModal(c) {
  editId = c ? c.id : null;
  $('modalTitle').textContent = c ? 'Edit Customer' : 'Add Customer';
  $('modalBody').innerHTML = '<label style="font-size:12px;font-weight:600;display:block;margin:8px 0 4px">Name *</label><input type="text" id="cmName" value="' + (c ? c.name : '') + '" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;margin-bottom:8px"><label style="font-size:12px;font-weight:600;display:block;margin:8px 0 4px">Phone</label><input type="text" id="cmPhone" value="' + (c ? (c.phone || '') : '') + '" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;margin-bottom:8px"><label style="font-size:12px;font-weight:600;display:block;margin:8px 0 4px">Address</label><input type="text" id="cmAddress" value="' + (c ? (c.address || '') : '') + '" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;margin-bottom:12px"><button onclick="saveCust()" style="width:100%;padding:12px;background:#e01515;color:#fff;border:none;border-radius:6px;font-size:14px;font-weight:600;cursor:pointer">💾 Save</button>';
  $('modal').style.display = 'flex';
}

function saveCust() {
  var name = $('cmName').value.trim();
  if (!name) { toast('Name required', 'error'); return; }
  var data = { name: name, phone: $('cmPhone').value.trim(), address: $('cmAddress').value.trim() };
  if (editId) {
    for (var i = 0; i < state.customers.length; i++) if (state.customers[i].id === editId) { state.customers[i] = Object.assign({}, state.customers[i], data); break; }
  } else {
    state.customers.push({ id: gid(), name: data.name, phone: data.phone, address: data.address });
  }
  save();
  $('modal').style.display = 'none';
  toast('Saved!', 'success');
  if (document.getElementById('page-customers').style.display !== 'none') renderCust();
  if (document.getElementById('page-newinvoice').style.display !== 'none') renderNewInv();
}

function editCust(id) {
  var c = state.customers.filter(function(x) { return x.id === id; })[0];
  if (c) openCustModal(c);
}

// ITEMS
function renderItems() {
  var body = document.querySelector('#itemsTbl tbody');
  body.innerHTML = state.items.length ? state.items.map(function(i) {
    return '<tr style="border-bottom:1px solid #eee">' +
      '<td style="padding:8px"><strong>' + i.name + '</strong><br><small style="color:#888">' + i.category + '</small></td>' +
      '<td style="padding:8px">' + i.unit + '</td>' +
      '<td style="padding:8px;text-align:right">' + money(i.price) + '</td>' +
      '<td style="padding:8px;white-space:nowrap">' +
        '<button onclick="editItem(\'' + i.id + '\')" style="background:#f59e0b;color:#fff;border:none;padding:5px 8px;border-radius:4px;cursor:pointer;font-size:13px;margin-right:2px">✏️</button>' +
        (isAdmin() ? '<button onclick="delItem(\'' + i.id + '\')" style="background:#dc2626;color:#fff;border:none;padding:5px 8px;border-radius:4px;cursor:pointer;font-size:13px">🗑️</button>' : '') +
      '</td></tr>';
  }).join('') : '<tr><td colspan="4" style="text-align:center;color:#888;padding:20px">No items</td></tr>';
}

function delItem(id) {
  if (!isAdmin()) return;
  if (!confirm('Delete?')) return;
  state.items = state.items.filter(function(i) { return i.id !== id; });
  save();
  renderItems();
  toast('Deleted', 'success');
}

function openItemModal(i) {
  editId = i ? i.id : null;
  $('modalTitle').textContent = i ? 'Edit Item' : 'Add Item';
  $('modalBody').innerHTML = '<label style="font-size:12px;font-weight:600;display:block;margin:8px 0 4px">Name *</label><input type="text" id="imName" value="' + (i ? i.name : '') + '" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;margin-bottom:8px"><label style="font-size:12px;font-weight:600;display:block;margin:8px 0 4px">Category</label><input type="text" id="imCat" value="' + (i ? i.category : 'Service') + '" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;margin-bottom:8px"><label style="font-size:12px;font-weight:600;display:block;margin:8px 0 4px">Type</label><select id="imType" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;margin-bottom:8px"><option value="area"' + (i && i.calcType === 'area' ? ' selected' : '') + '>Area (H x W)</option><option value="quantity"' + (i && i.calcType === 'quantity' ? ' selected' : '') + '>Quantity</option><option value="job"' + (i && i.calcType === 'job' ? ' selected' : '') + '>Job</option></select><label style="font-size:12px;font-weight:600;display:block;margin:8px 0 4px">Unit</label><select id="imUnit" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;margin-bottom:8px"><option value="sqft"' + (i && i.unit === 'sqft' ? ' selected' : '') + '>sqft</option><option value="qty"' + (i && i.unit === 'qty' ? ' selected' : '') + '>qty</option><option value="page"' + (i && i.unit === 'page' ? ' selected' : '') + '>page</option><option value="job"' + (i && i.unit === 'job' ? ' selected' : '') + '>job</option></select><label style="font-size:12px;font-weight:600;display:block;margin:8px 0 4px">Price (Rs.)</label><input type="number" id="imPrice" value="' + (i ? i.price : 0) + '" min="0" step="0.01" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;margin-bottom:12px"><button onclick="saveItem()" style="width:100%;padding:12px;background:#e01515;color:#fff;border:none;border-radius:6px;font-size:14px;font-weight:600;cursor:pointer">💾 Save</button>';
  $('modal').style.display = 'flex';
}

function saveItem() {
  var name = $('imName').value.trim();
  if (!name) { toast('Name required', 'error'); return; }
  var data = { name: name, category: $('imCat').value.trim() || 'Service', calcType: $('imType').value, unit: $('imUnit').value, price: parseFloat($('imPrice').value) || 0 };
  if (editId) {
    for (var i = 0; i < state.items.length; i++) if (state.items[i].id === editId) { state.items[i] = Object.assign({}, state.items[i], data); break; }
  } else {
    state.items.push({ id: gid(), name: data.name, category: data.category, calcType: data.calcType, unit: data.unit, price: data.price });
  }
  save();
  $('modal').style.display = 'none';
  toast('Saved!', 'success');
  if (document.getElementById('page-items').style.display !== 'none') renderItems();
}

function editItem(id) {
  var i = state.items.filter(function(x) { return x.id === id; })[0];
  if (i) openItemModal(i);
}

// PAYMENTS
function renderPay() {
  var body = document.querySelector('#payTbl tbody');
  var list = state.payments.slice().sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
  body.innerHTML = list.length ? list.map(function(p) {
    return '<tr style="border-bottom:1px solid #eee"><td style="padding:8px">' + fdate(p.date) + '</td><td style="padding:8px"><strong>' + p.invoiceNumber + '</strong></td><td style="padding:8px">' + p.customerName + '</td><td style="padding:8px;text-align:right"><strong style="color:#16a34a">' + money(p.amount) + '</strong></td></tr>';
  }).join('') : '<tr><td colspan="4" style="text-align:center;color:#888;padding:20px">No payments</td></tr>';
}

// EXPENSES
function renderExp() {
  var body = document.querySelector('#expTbl tbody');
  var list = state.expenses.slice().sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
  body.innerHTML = list.length ? list.map(function(e) {
    return '<tr style="border-bottom:1px solid #eee"><td style="padding:8px">' + fdate(e.date) + '</td><td style="padding:8px">' + e.category + '<br><small style="color:#888">' + (e.description || '') + '</small></td><td style="padding:8px;text-align:right"><strong style="color:#dc2626">' + money(e.amount) + '</strong></td><td style="padding:8px;white-space:nowrap"><button onclick="editExp(\'' + e.id + '\')" style="background:#f59e0b;color:#fff;border:none;padding:5px 8px;border-radius:4px;cursor:pointer;font-size:13px;margin-right:2px">✏️</button>' + (isAdmin() ? '<button onclick="delExp(\'' + e.id + '\')" style="background:#dc2626;color:#fff;border:none;padding:5px 8px;border-radius:4px;cursor:pointer;font-size:13px">🗑️</button>' : '') + '</td></tr>';
  }).join('') : '<tr><td colspan="4" style="text-align:center;color:#888;padding:20px">No expenses</td></tr>';
}

function delExp(id) {
  if (!isAdmin()) return;
  if (!confirm('Delete?')) return;
  state.expenses = state.expenses.filter(function(e) { return e.id !== id; });
  save();
  renderExp();
  toast('Deleted', 'success');
}

function openExpModal(e) {
  editId = e ? e.id : null;
  $('modalTitle').textContent = e ? 'Edit Expense' : 'Add Expense';
  $('modalBody').innerHTML = '<label style="font-size:12px;font-weight:600;display:block;margin:8px 0 4px">Date</label><input type="date" id="exDate" value="' + (e ? e.date : today()) + '" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;margin-bottom:8px"><label style="font-size:12px;font-weight:600;display:block;margin:8px 0 4px">Amount *</label><input type="number" id="exAmount" value="' + (e ? e.amount : '') + '" min="0" step="0.01" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;margin-bottom:8px"><label style="font-size:12px;font-weight:600;display:block;margin:8px 0 4px">Category</label><select id="exCat" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;margin-bottom:8px"><option>Materials</option><option>Ink/Toner</option><option>Paper</option><option>Rent</option><option>Utilities</option><option>Salary</option><option>Transport</option><option>Other</option></select><label style="font-size:12px;font-weight:600;display:block;margin:8px 0 4px">Description</label><input type="text" id="exDesc" value="' + (e ? (e.description || '') : '') + '" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;margin-bottom:12px"><button onclick="saveExp()" style="width:100%;padding:12px;background:#e01515;color:#fff;border:none;border-radius:6px;font-size:14px;font-weight:600;cursor:pointer">💾 Save</button>';
  $('modal').style.display = 'flex';
}

function saveExp() {
  var amt = parseFloat($('exAmount').value) || 0;
  if (amt <= 0) { toast('Enter amount', 'error'); return; }
  var data = { date: $('exDate').value || today(), amount: amt, category: $('exCat').value, description: $('exDesc').value.trim() };
  if (editId) {
    for (var i = 0; i < state.expenses.length; i++) if (state.expenses[i].id === editId) { state.expenses[i] = Object.assign({}, state.expenses[i], data); break; }
  } else {
    state.expenses.push({ id: gid(), date: data.date, amount: data.amount, category: data.category, description: data.description });
  }
  save();
  $('modal').style.display = 'none';
  toast('Saved!', 'success');
  if (document.getElementById('page-expenses').style.display !== 'none') renderExp();
}

function editExp(id) {
  var e = state.expenses.filter(function(x) { return x.id === id; })[0];
  if (e) openExpModal(e);
}

// VENDORS
function renderVendors() {
  var body = document.querySelector('#vendorTbl tbody');
  body.innerHTML = state.vendors.length ? state.vendors.map(function(v) {
    return '<tr style="border-bottom:1px solid #eee"><td style="padding:8px"><strong>' + v.name + '</strong><br><small style="color:#888">' + (v.contactPerson || '') + '</small></td><td style="padding:8px">' + (v.phone || '-') + '</td><td style="padding:8px;white-space:nowrap"><button onclick="vendorWA(\'' + v.id + '\')" style="background:#16a34a;color:#fff;border:none;padding:5px 8px;border-radius:4px;cursor:pointer;font-size:13px;margin-right:2px">📱</button><button onclick="editVendor(\'' + v.id + '\')" style="background:#f59e0b;color:#fff;border:none;padding:5px 8px;border-radius:4px;cursor:pointer;font-size:13px;margin-right:2px">✏️</button>' + (isAdmin() ? '<button onclick="delVendor(\'' + v.id + '\')" style="background:#dc2626;color:#fff;border:none;padding:5px 8px;border-radius:4px;cursor:pointer;font-size:13px">🗑️</button>' : '') + '</td></tr>';
  }).join('') : '<tr><td colspan="3" style="text-align:center;color:#888;padding:20px">No vendors yet. Click + Add to create one.</td></tr>';
}

function delVendor(id) {
  if (!isAdmin()) return;
  if (!confirm('Delete?')) return;
  state.vendors = state.vendors.filter(function(v) { return v.id !== id; });
  save();
  renderVendors();
  toast('Deleted', 'success');
}

function openVendorModal(v) {
  editId = v ? v.id : null;
  $('modalTitle').textContent = v ? 'Edit Vendor' : 'Add Vendor';
  $('modalBody').innerHTML = '<label style="font-size:12px;font-weight:600;display:block;margin:8px 0 4px">Name *</label><input type="text" id="vmName" value="' + (v ? v.name : '') + '" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;margin-bottom:8px"><label style="font-size:12px;font-weight:600;display:block;margin:8px 0 4px">Contact</label><input type="text" id="vmContact" value="' + (v ? (v.contactPerson || '') : '') + '" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;margin-bottom:8px"><label style="font-size:12px;font-weight:600;display:block;margin:8px 0 4px">Phone</label><input type="text" id="vmPhone" value="' + (v ? (v.phone || '') : '') + '" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;margin-bottom:8px"><label style="font-size:12px;font-weight:600;display:block;margin:8px 0 4px">Address</label><input type="text" id="vmAddress" value="' + (v ? (v.address || '') : '') + '" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;margin-bottom:12px"><button onclick="saveVendor()" style="width:100%;padding:12px;background:#e01515;color:#fff;border:none;border-radius:6px;font-size:14px;font-weight:600;cursor:pointer">💾 Save</button>';
  $('modal').style.display = 'flex';
}

function saveVendor() {
  var name = $('vmName').value.trim();
  if (!name) { toast('Name required', 'error'); return; }
  var data = { name: name, contactPerson: $('vmContact').value.trim(), phone: $('vmPhone').value.trim(), address: $('vmAddress').value.trim() };
  if (editId) {
    for (var i = 0; i < state.vendors.length; i++) if (state.vendors[i].id === editId) { state.vendors[i] = Object.assign({}, state.vendors[i], data); break; }
  } else {
    state.vendors.push({ id: gid(), name: data.name, contactPerson: data.contactPerson, phone: data.phone, address: data.address });
  }
  save();
  $('modal').style.display = 'none';
  toast('Saved!', 'success');
  if (document.getElementById('page-vendors').style.display !== 'none') renderVendors();
}

function editVendor(id) {
  var v = state.vendors.filter(function(x) { return x.id === id; })[0];
  if (v) openVendorModal(v);
}

function vendorWA(id) {
  var v = state.vendors.filter(function(x) { return x.id === id; })[0];
  if (!v || !v.phone) { toast('No phone', 'error'); return; }
  var ph = v.phone.replace(/[^0-9]/g, '');
  if (ph.indexOf('03') === 0) ph = '92' + ph.substr(1);
  window.open('https://wa.me/' + ph + '?text=' + encodeURIComponent('Hello ' + v.name), '_blank');
}

// REPORTS
function genReport() {
  var type = $('repType').value;
  var from = $('repFrom').value || '2000-01-01';
  var to = $('repTo').value || '2100-12-31';
  var html = '';
  if (type === 'sales') {
    var list = state.invoices.filter(function(i) { return i.date >= from && i.date <= to; });
    var total = list.reduce(function(s, i) { return s + Number(i.total); }, 0);
    html = '<h3 style="margin:10px 0;font-size:14px">Sales Report: ' + money(total) + ' (' + list.length + ' invoices)</h3><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="background:#0a0a0a;color:#fff"><th style="padding:6px">Date</th><th style="padding:6px">Inv#</th><th style="padding:6px">Customer</th><th style="padding:6px;text-align:right">Total</th></tr></thead><tbody>' + list.map(function(i) { return '<tr style="border-bottom:1px solid #eee"><td style="padding:6px">' + fdate(i.date) + '</td><td style="padding:6px">' + i.number + '</td><td style="padding:6px">' + i.customerName + '</td><td style="padding:6px;text-align:right">' + money(i.total) + '</td></tr>'; }).join('') + '</tbody></table>';
  } else if (type === 'expense') {
    var list = state.expenses.filter(function(e) { return e.date >= from && e.date <= to; });
    var total = list.reduce(function(s, e) { return s + Number(e.amount); }, 0);
    html = '<h3 style="margin:10px 0;font-size:14px">Expense Report: ' + money(total) + '</h3><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="background:#0a0a0a;color:#fff"><th style="padding:6px">Date</th><th style="padding:6px">Category</th><th style="padding:6px;text-align:right">Amount</th></tr></thead><tbody>' + list.map(function(e) { return '<tr style="border-bottom:1px solid #eee"><td style="padding:6px">' + fdate(e.date) + '</td><td style="padding:6px">' + e.category + '</td><td style="padding:6px;text-align:right">' + money(e.amount) + '</td></tr>'; }).join('') + '</tbody></table>';
  } else if (type === 'profit') {
    var sales = state.invoices.filter(function(i) { return i.date >= from && i.date <= to; }).reduce(function(s, i) { return s + Number(i.total); }, 0);
    var exp = state.expenses.filter(function(e) { return e.date >= from && e.date <= to; }).reduce(function(s, e) { return s + Number(e.amount); }, 0);
    html = '<div style="background:#f5f5f5;padding:14px;border-radius:8px;margin-top:10px"><p style="font-size:13px;margin:6px 0">Sales: <strong style="color:#16a34a">' + money(sales) + '</strong></p><p style="font-size:13px;margin:6px 0">Expenses: <strong style="color:#dc2626">' + money(exp) + '</strong></p><p style="font-size:15px;margin:10px 0 0;padding-top:8px;border-top:2px solid #0a0a00">Net: <strong style="color:' + (sales - exp >= 0 ? '#16a34a' : '#dc2626') + '">' + money(sales - exp) + '</strong></p></div>';
  } else if (type === 'customer') {
    var stats = {};
    state.invoices.filter(function(i) { return i.date >= from && i.date <= to; }).forEach(function(i) {
      if (!stats[i.customerName]) stats[i.customerName] = { count: 0, total: 0, due: 0 };
      stats[i.customerName].count++;
      stats[i.customerName].total += Number(i.total);
      stats[i.customerName].due += Number(i.due);
    });
    var list = Object.entries(stats).sort(function(a, b) { return b[1].total - a[1].total; });
    html = '<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="background:#0a0a0a;color:#fff"><th style="padding:6px">Customer</th><th style="padding:6px;text-align:right">Invoices</th><th style="padding:6px;text-align:right">Total</th><th style="padding:6px;text-align:right">Due</th></tr></thead><tbody>' + list.map(function(entry) { return '<tr style="border-bottom:1px solid #eee"><td style="padding:6px">' + entry[0] + '</td><td style="padding:6px;text-align:right">' + entry[1].count + '</td><td style="padding:6px;text-align:right">' + money(entry[1].total) + '</td><td style="padding:6px;text-align:right">' + money(entry[1].due) + '</td></tr>'; }).join('') + '</tbody></table>';
  }
  $('repOutput').innerHTML = html;
}

// SETTINGS
function saveSettings() {
  state.business.name = $('setName').value.trim() || 'Design Line Agency';
  state.business.phone = $('setPhone').value.trim();
  state.business.email = $('setEmail').value.trim();
  state.business.address = $('setAddress').value.trim();
  save();
  toast('Saved!', 'success');
}

function exportData() {
  var blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'backup-' + today() + '.json';
  a.click();
  toast('Backup saved!', 'success');
}

function importData() { $('importFile').click(); }

function clearAll() {
  if (!confirm('Delete ALL data?')) return;
  if (!confirm('Are you sure?')) return;
  localStorage.clear();
  location.reload();
}

// PRINT
function printBill(title, data) {
  var itemsHtml = data.items.map(function(it) {
    return '<tr><td style="padding:6px;border-bottom:1px solid #ddd"><strong>' + it.name + '</strong><br><small>' + (it.details || '') + '</small></td><td style="padding:6px;text-align:center">' + it.qty.toFixed(2) + ' ' + it.unit + '</td><td style="padding:6px;text-align:right">' + money(it.price) + '</td><td style="padding:6px;text-align:right"><strong>' + money(it.total) + '</strong></td></tr>';
  }).join('');
  var html = '<html><head><title>' + title + '</title><style>body{font-family:Arial;padding:20px;color:#000;font-size:12px}.h{text-align:center;border-bottom:3px solid #e01515;padding-bottom:8px;margin-bottom:15px}.h h1{color:#e01515;margin:0;font-size:22px}.h p{margin:2px 0;font-size:11px}table{width:100%;border-collapse:collapse;margin:12px 0}th{background:#000;color:#fff;padding:6px;text-align:left;font-size:11px}.t{margin-top:15px;margin-left:auto;width:240px}.t .r{display:flex;justify-content:space-between;padding:3px 0;font-size:12px}.g{border-top:2px solid #000;margin-top:6px;padding-top:6px;font-size:14px;font-weight:bold;color:#e01515}.ft{text-align:center;margin-top:20px;font-size:10px;color:#666;border-top:1px dashed #ccc;padding-top:6px}</style></head><body>' +
    '<div class="h"><h1>' + state.business.name + '</h1><p>' + state.business.address + '</p><p>Phone: ' + state.business.phone + '</p></div>' +
    '<div style="display:flex;justify-content:space-between;margin-bottom:10px;font-size:11px"><div><strong>Customer:</strong> ' + data.customerName + '<br>' + (data.phone || '') + '</div><div style="text-align:right"><strong>' + title + '</strong><br><strong>Date:</strong> ' + fdate(data.date) + '<br><strong>Status:</strong> ' + (data.status || '').toUpperCase() + '</div></div>' +
    '<table><thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th></tr></thead><tbody>' + itemsHtml + '</tbody></table>' +
    '<div class="t"><div class="r"><span>Subtotal:</span><span>' + money(data.subtotal || data.total) + '</span></div><div class="r"><span>Discount:</span><span>- ' + money(data.discount || 0) + '</span></div><div class="r g"><span>TOTAL:</span><span>' + money(data.total) + '</span></div><div class="r"><span>Paid:</span><span>' + money(data.paid) + '</span></div><div class="r" style="color:#dc2626"><span>Due:</span><span>' + money(data.due) + '</span></div></div>' +
    '<div class="ft">Thank you! - ' + state.business.name + '</div></body></html>';
  var w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  setTimeout(function() { w.print(); }, 300);
}

// INIT
document.addEventListener('DOMContentLoaded', function() {
  load();
  $('loginBtn').onclick = doLogin;
  $('loginPass').onkeypress = function(e) { if (e.key === 'Enter') doLogin(); };
  $('loginUser').onkeypress = function(e) { if (e.key === 'Enter') $('loginPass').focus(); };
  $('logoutBtn').onclick = doLogout;
  $('menuBtn').onclick = openSidebar;
  $('closeSidebar').onclick = closeSidebar;
  $('sidebarOverlay').onclick = closeSidebar;
  document.querySelectorAll('.nav-item').forEach(function(item) {
    item.onclick = function(e) { e.preventDefault(); nav(item.dataset.page); };
  });
  $('invSearch').oninput = renderInv;
  $('custSearch').oninput = renderCust;
  $('addCustBtn').onclick = function() { openCustModal(); };
  $('addCustBtn2').onclick = function() { openCustModal(); };
  $('addItemBtn').onclick = function() { openItemModal(); };
  $('addExpBtn').onclick = function() { openExpModal(); };
  $('addVendorBtn').onclick = function() { openVendorModal(); };
  $('repGenBtn').onclick = genReport;
  $('setSaveBtn').onclick = saveSettings;
  $('exportBtn').onclick = exportData;
  $('importBtn').onclick = importData;
  $('importFile').onchange = function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var r = new FileReader();
    r.onload = function(ev) {
      try {
        var d = JSON.parse(ev.target.result);
        if (!confirm('Replace all data?')) return;
        state = d;
        save();
        toast('Data restored!', 'success');
        nav('dashboard');
      } catch (err) { toast('Invalid file', 'error'); }
    };
    r.readAsText(file);
  };
  $('clearBtn').onclick = clearAll;
  $('modalClose').onclick = function() { $('modal').style.display = 'none'; };
  setupQBEvents();
  setupInvEvents();
});
