// Design Line Manager - Complete with Shop Daily Sale
var STORAGE_KEY = 'dlm_v5';
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
  vendors: [],
  vendorTxns: [],
  shopSales: []  // New: Daily shop sales
};

var qbItems = [], invItems = [], currentUser = null, editId = null;

function gid() { return 'id' + Date.now() + Math.random().toString(36).substr(2, 6); }
function money(n) { return (state.business.currency || 'Rs.') + ' ' + (Number(n) || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 }); }
function today() { return new Date().toISOString().split('T')[0]; }
function now() { return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }); }
function fdate(s) { if (!s) return ''; var d = new Date(s); return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
function fdatetime(s) { if (!s) return ''; var d = new Date(s); return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
function toast(msg, type) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + (type || '');
  t.style.background = type === 'success' ? '#16a34a' : (type === 'error' ? '#dc2626' : '#0a0a0a');
  setTimeout(function() { t.className = 'toast'; }, 2500);
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
      if (d.vendorTxns) state.vendorTxns = d.vendorTxns;
      if (d.shopSales) state.shopSales = d.shopSales;
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
    $('loginPage').classList.add('hidden');
    $('appPage').classList.remove('hidden');
    $('userInfo').textContent = found.name;
    $('loginError').textContent = '';
    nav('dashboard');
    toast('Welcome ' + found.name, 'success');
  } else { $('loginError').textContent = 'Wrong username or password'; }
}

function doLogout() {
  if (!confirm('Logout?')) return;
  currentUser = null;
  $('appPage').classList.add('hidden');
  $('loginPage').classList.remove('hidden');
  $('loginUser').value = '';
  $('loginPass').value = '';
}

function openSidebar() { $('sidebar').style.left = '0'; $('sidebarOverlay').style.display = 'block'; }
function closeSidebar() { $('sidebar').style.left = '-280px'; $('sidebarOverlay').style.display = 'none'; }

function nav(page) {
  document.querySelectorAll('.page').forEach(function(s) { s.classList.remove('active'); });
  var el = $('page-' + page);
  if (el) el.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
  var navEl = document.querySelector('[data-page="' + page + '"]');
  if (navEl) navEl.classList.add('active');
  var titles = { dashboard: 'DASHBOARD', shopdaily: 'SHOP DAILY SALE', quickbill: 'QUICK BILL', invoices: 'INVOICES', newinvoice: 'NEW INVOICE', payments: 'RECEIVE PAYMENTS', customers: 'CUSTOMERS', items: 'ITEMS', expenses: 'EXPENSES', vendors: 'VENDORS', vendorpay: 'VENDOR PAYMENTS', reports: 'REPORTS', settings: 'SETTINGS' };
  $('pageTitle').textContent = titles[page] || page;
  if (page === 'dashboard') renderDash();
  if (page === 'shopdaily') renderShopDaily();
  if (page === 'invoices') renderInv();
  if (page === 'newinvoice') renderNewInv();
  if (page === 'payments') renderPayPage();
  if (page === 'customers') renderCust();
  if (page === 'items') renderItems();
  if (page === 'expenses') renderExp();
  if (page === 'vendors') renderVendors();
  if (page === 'vendorpay') renderVendorPay();
  if (page === 'quickbill') renderQB();
  closeSidebar();
}

// DASHBOARD with YEARLY stats + SHOP SALES
function renderDash() {
  var todayStr = today();
  var monthStr = todayStr.slice(0, 7);
  var yearStr = todayStr.slice(0, 4);
  $('currentYear').textContent = yearStr;

  var todayInv = state.invoices.filter(function(i) { return i.date === todayStr; });
  var todayExp = state.expenses.filter(function(e) { return e.date === todayStr; });
  var todayShop = state.shopSales.filter(function(s) { return s.date === todayStr; });
  var todaySales = todayInv.reduce(function(s, i) { return s + Number(i.total); }, 0) + todayShop.reduce(function(s, sh) { return s + Number(sh.amount); }, 0);
  var todayExpAmt = todayExp.reduce(function(s, e) { return s + Number(e.amount); }, 0);

  var monthInv = state.invoices.filter(function(i) { return i.date && i.date.indexOf(monthStr) === 0; });
  var monthExp = state.expenses.filter(function(e) { return e.date && e.date.indexOf(monthStr) === 0; });
  var monthShop = state.shopSales.filter(function(s) { return s.date && s.date.indexOf(monthStr) === 0; });
  var monthSales = monthInv.reduce(function(s, i) { return s + Number(i.total); }, 0) + monthShop.reduce(function(s, sh) { return s + Number(sh.amount); }, 0);
  var monthExpAmt = monthExp.reduce(function(s, e) { return s + Number(e.amount); }, 0);
  var monthProfit = monthSales - monthExpAmt;
  var monthPending = monthInv.reduce(function(s, i) { return s + Number(i.due || 0); }, 0);

  var yearInv = state.invoices.filter(function(i) { return i.date && i.date.indexOf(yearStr) === 0; });
  var yearExp = state.expenses.filter(function(e) { return e.date && e.date.indexOf(yearStr) === 0; });
  var yearShop = state.shopSales.filter(function(s) { return s.date && s.date.indexOf(yearStr) === 0; });
  var yearSales = yearInv.reduce(function(s, i) { return s + Number(i.total); }, 0) + yearShop.reduce(function(s, sh) { return s + Number(sh.amount); }, 0);
  var yearExpAmt = yearExp.reduce(function(s, e) { return s + Number(e.amount); }, 0);
  var yearProfit = yearSales - yearExpAmt;

  var allSales = state.invoices.reduce(function(s, i) { return s + Number(i.total); }, 0) + state.shopSales.reduce(function(s, sh) { return s + Number(sh.amount); }, 0);
  var allExp = state.expenses.reduce(function(s, e) { return s + Number(e.amount); }, 0);
  var allPending = state.invoices.reduce(function(s, i) { return s + Number(i.due || 0); }, 0);

  var cards = [
    { c: '#e01515', l: "Today's Sales", v: money(todaySales) },
    { c: '#dc2626', l: "Today's Expenses", v: money(todayExpAmt) },
    { c: '#16a34a', l: "Today's Profit", v: money(todaySales - todayExpAmt) },
    { c: '#2563eb', l: 'This Month Sales', v: money(monthSales) },
    { c: '#f59e0b', l: 'This Month Pending', v: money(monthPending) },
    { c: '#7c3aed', l: 'This Month Profit', v: money(monthProfit) },
    { c: '#16a34a', l: '📅 Yearly Sales', v: money(yearSales) },
    { c: '#dc2626', l: '📅 Yearly Expenses', v: money(yearExpAmt) },
    { c: '#16a34a', l: '📅 Yearly Profit', v: money(yearProfit) },
    { c: '#f59e0b', l: 'All Time Pending', v: money(allPending) },
    { c: '#0a0a0a', l: '💰 All Time Sales', v: money(allSales) },
    { c: '#666', l: '💰 All Time Profit', v: money(allSales - allExp) }
  ];
  var html = '';
  for (var i = 0; i < cards.length; i++) {
    html += '<div class="dash-card" style="border-left-color:' + cards[i].c + '"><div class="lbl">' + cards[i].l + '</div><div class="val">' + cards[i].v + '</div></div>';
  }
  $('dashStats').innerHTML = html;
  renderMonthlyChart(yearStr);
  renderYearlyChart();

  var recent = state.invoices.slice().sort(function(a, b) { return new Date(b.date) - new Date(a.date); }).slice(0, 5);
  var tbody = document.querySelector('#recentTbl tbody');
  tbody.innerHTML = recent.length ? recent.map(function(i) {
    return '<tr><td style="padding:8px"><strong>' + i.number + '</strong></td><td style="padding:8px">' + i.customerName + '</td><td style="padding:8px"><strong>' + money(i.total) + '</strong></td><td style="padding:8px"><span class="badge badge-' + i.status + '">' + i.status + '</span></td></tr>';
  }).join('') : '<tr><td colspan="4" style="text-align:center;color:#888;padding:20px">No invoices yet</td></tr>';

  var pendingByCust = {};
  state.invoices.forEach(function(i) {
    if (i.customerId && Number(i.due) > 0) {
      if (!pendingByCust[i.customerId]) pendingByCust[i.customerId] = { name: i.customerName, phone: i.phone, total: 0, due: 0 };
      pendingByCust[i.customerId].total += Number(i.total);
      pendingByCust[i.customerId].due += Number(i.due);
    }
  });
  var pendingList = Object.values(pendingByCust).sort(function(a, b) { return b.due - a.due; }).slice(0, 10);
  var pbody = document.querySelector('#pendingTbl tbody');
  pbody.innerHTML = pendingList.length ? pendingList.map(function(c) {
    return '<tr><td style="padding:8px"><strong>' + c.name + '</strong></td><td style="padding:8px">' + (c.phone || '-') + '</td><td style="padding:8px">' + money(c.total) + '</td><td style="padding:8px"><strong style="color:#dc2626">' + money(c.due) + '</strong></td><td style="padding:8px"><button onclick="goToReceivePayment(\'' + c.name + '\')" class="btn btn-success btn-sm">💵 Receive</button></td></tr>';
  }).join('') : '<tr><td colspan="5" style="text-align:center;color:#888;padding:20px">No pending payments! 🎉</td></tr>';
}

function renderMonthlyChart(year) {
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var monthData = [];
  var maxSales = 0;
  for (var m = 1; m <= 12; m++) {
    var mStr = year + '-' + String(m).padStart(2, '0');
    var sales = state.invoices.filter(function(i) { return i.date && i.date.indexOf(mStr) === 0; }).reduce(function(s, i) { return s + Number(i.total); }, 0) + state.shopSales.filter(function(s) { return s.date && s.date.indexOf(mStr) === 0; }).reduce(function(s, sh) { return s + Number(sh.amount); }, 0);
    var expenses = state.expenses.filter(function(e) { return e.date && e.date.indexOf(mStr) === 0; }).reduce(function(s, e) { return s + Number(e.amount); }, 0);
    monthData.push({ name: months[m-1], sales: sales, expenses: expenses, profit: sales - expenses });
    if (sales > maxSales) maxSales = sales;
  }
  var yearTotal = monthData.reduce(function(s, m) { return s + m.sales; }, 0);
  var html = '<div class="chart-container">';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px">';
  html += '<div><strong>Total Year Income:</strong> <span style="color:#16a34a;font-size:18px;font-weight:700">' + money(yearTotal) + '</span></div>';
  html += '<div class="legend"><div class="legend-item"><div class="legend-color" style="background:#e01515"></div> Sales</div><div class="legend-item"><div class="legend-color" style="background:#dc2626"></div> Expenses</div><div class="legend-item"><div class="legend-color" style="background:#16a34a"></div> Profit</div></div></div>';
  html += '<div class="bar-chart">';
  for (var i = 0; i < monthData.length; i++) {
    var m = monthData[i];
    var salesH = maxSales > 0 ? (m.sales / maxSales) * 100 : 0;
    var expH = maxSales > 0 ? (m.expenses / maxSales) * 100 : 0;
    var profH = maxSales > 0 ? (m.profit / maxSales) * 100 : 0;
    if (m.sales === 0 && m.expenses === 0) salesH = 1;
    html += '<div class="bar-item" title="' + m.name + ': Sales ' + money(m.sales) + ', Expenses ' + money(m.expenses) + ', Profit ' + money(m.profit) + '">';
    html += '<div style="display:flex;gap:2px;height:100%;align-items:flex-end;width:100%;justify-content:center">';
    html += '<div class="bar-fill" style="height:' + salesH + '%;background:linear-gradient(180deg,#e01515 0%,#b01010 100%);width:30%"></div>';
    html += '<div class="bar-fill" style="height:' + expH + '%;background:linear-gradient(180deg,#dc2626 0%,#991b1b 100%);width:30%"></div>';
    html += '<div class="bar-fill" style="height:' + profH + '%;background:linear-gradient(180deg,#16a34a 0%,#15803d 100%);width:30%"></div>';
    html += '</div>';
    html += '<div class="bar-label">' + m.name + '</div>';
    html += '<div class="bar-value">' + (m.sales > 0 ? money(m.sales).replace('Rs. ', '') : '0') + '</div>';
    html += '</div>';
  }
  html += '</div></div>';
  html += '<table class="summary-table" style="margin-top:12px"><thead><tr><th>Month</th><th style="text-align:right">Sales</th><th style="text-align:right">Expenses</th><th style="text-align:right">Profit</th></tr></thead><tbody>';
  var totS = 0, totE = 0;
  for (var j = 0; j < monthData.length; j++) {
    totS += monthData[j].sales; totE += monthData[j].expenses;
    html += '<tr><td>' + monthData[j].name + '</td><td style="text-align:right">' + money(monthData[j].sales) + '</td><td style="text-align:right">' + money(monthData[j].expenses) + '</td><td style="text-align:right"><strong style="color:' + (monthData[j].profit >= 0 ? '#16a34a' : '#dc2626') + '">' + money(monthData[j].profit) + '</strong></td></tr>';
  }
  html += '</tbody><tfoot><tr><td>TOTAL</td><td style="text-align:right">' + money(totS) + '</td><td style="text-align:right">' + money(totE) + '</td><td style="text-align:right">' + money(totS - totE) + '</td></tr></tfoot></table>';
  $('monthlyChart').innerHTML = html;
}

function renderYearlyChart() {
  var chks = document.querySelectorAll('.yearChk:checked');
  var offsets = [];
  for (var i = 0; i < chks.length; i++) offsets.push(chks[i].value);
  var yearColors = { '0': '#e01515', '-1': '#2563eb', '-2': '#16a34a' };
  var yearData = [];
  var maxVal = 0;
  var currentYear = parseInt(today().slice(0, 4));
  for (var k = 0; k < offsets.length; k++) {
    var y = (currentYear + parseInt(offsets[k])).toString();
    var sales = state.invoices.filter(function(i) { return i.date && i.date.indexOf(y) === 0; }).reduce(function(s, i) { return s + Number(i.total); }, 0) + state.shopSales.filter(function(s) { return s.date && s.date.indexOf(y) === 0; }).reduce(function(s, sh) { return s + Number(sh.amount); }, 0);
    var expenses = state.expenses.filter(function(e) { return e.date && e.date.indexOf(y) === 0; }).reduce(function(s, e) { return s + Number(e.amount); }, 0);
    yearData.push({ year: y, sales: sales, expenses: expenses, profit: sales - expenses });
    if (sales > maxVal) maxVal = sales;
  }
  var html = '<div class="chart-container">';
  if (yearData.length === 0) { html += '<p style="text-align:center;color:#888;padding:20px">Select at least one year</p></div>'; $('yearlyChart').innerHTML = html; return; }
  html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-top:10px">';
  for (var n = 0; n < yearData.length; n++) {
    var yd = yearData[n];
    var pct = maxVal > 0 ? (yd.sales / maxVal) * 100 : 0;
    html += '<div style="background:#fff;padding:14px;border-radius:8px;border-left:4px solid ' + (yearColors[offsets[n]] || '#666') + '">';
    html += '<div style="font-size:12px;color:#666;font-weight:600">YEAR ' + yd.year + '</div>';
    html += '<div style="font-size:20px;font-weight:700;color:#0a0a0a;margin:4px 0">' + money(yd.sales) + '</div>';
    html += '<div style="font-size:11px;color:#666">Total Sales</div>';
    html += '<div style="height:6px;background:#e5e5e5;border-radius:3px;margin:8px 0;overflow:hidden"><div style="height:100%;background:' + (yearColors[offsets[n]] || '#666') + ';width:' + pct + '%"></div></div>';
    html += '<div style="display:flex;justify-content:space-between;font-size:11px;margin-top:6px"><span style="color:#dc2626">Exp: ' + money(yd.expenses) + '</span><span style="color:#16a34a;font-weight:700">Profit: ' + money(yd.profit) + '</span></div></div>';
  }
  html += '</div></div>';
  $('yearlyChart').innerHTML = html;
}

function goToReceivePayment(name) {
  nav('payments');
  setTimeout(function() {
    var opts = $('payCustSel').options;
    for (var i = 0; i < opts.length; i++) {
      if (opts[i].text.indexOf(name) >= 0) { $('payCustSel').value = opts[i].value; $('payCustSel').onchange(); break; }
    }
  }, 100);
}

// ==================== SHOP DAILY SALE ====================
function getTodayTotal() {
  var date = $('shopSaleDate').value || today();
  return state.shopSales.filter(function(s) { return s.date === date; }).reduce(function(sum, s) { return sum + Number(s.amount); }, 0);
}

function renderShopDaily() {
  if (!$('shopSaleDate').value) $('shopSaleDate').value = today();
  var date = $('shopSaleDate').value;
  var search = ($('shopSaleSearch').value || '').toLowerCase();
  var daySales = state.shopSales.filter(function(s) {
    return s.date === date && (!search || (s.description || '').toLowerCase().indexOf(search) >= 0 || (s.note || '').toLowerCase().indexOf(search) >= 0);
  }).sort(function(a, b) { return (b.time || '').localeCompare(a.time || ''); });

  // Stats - Daily Total
  var totalSales = daySales.reduce(function(s, x) { return s + Number(x.amount); }, 0);
  var totalCash = daySales.filter(function(s) { return s.paymentMethod === 'Cash'; }).reduce(function(s, x) { return s + Number(x.amount); }, 0);
  var totalBank = daySales.filter(function(s) { return s.paymentMethod === 'Bank' || s.paymentMethod === 'JazzCash' || s.paymentMethod === 'Easypaisa'; }).reduce(function(s, x) { return s + Number(x.amount); }, 0);
  var totalPending = daySales.filter(function(s) { return s.paymentMethod === 'Pending'; }).reduce(function(s, x) { return s + Number(x.amount); }, 0);
  var saleCount = daySales.length;
  var statsHtml = '<div class="dash-card" style="border-left-color:#e01515"><div class="lbl">💰 Total Sales</div><div class="val">' + money(totalSales) + '</div></div>';
  statsHtml += '<div class="dash-card green" style="border-left-color:#16a34a"><div class="lbl">💵 Cash</div><div class="val">' + money(totalCash) + '</div></div>';
  statsHtml += '<div class="dash-card blue" style="border-left-color:#2563eb"><div class="lbl">💳 Bank/Digital</div><div class="val">' + money(totalBank) + '</div></div>';
  statsHtml += '<div class="dash-card orange" style="border-left-color:#f59e0b"><div class="lbl">⏰ Pending</div><div class="val">' + money(totalPending) + '</div></div>';
  statsHtml += '<div class="dash-card" style="border-left-color:#7c3aed"><div class="lbl">🧾 Total Sales Count</div><div class="val">' + saleCount + '</div></div>';
  $('shopDailyStats').innerHTML = statsHtml;

  var body = document.querySelector('#shopSaleTbl tbody');
  body.innerHTML = daySales.length ? daySales.map(function(s, idx) {
    return '<tr>' +
      '<td style="padding:8px"><strong>' + (s.time || '-') + '</strong><br><small style="color:#888">Sale #' + (idx + 1) + '</small></td>' +
      '<td style="padding:8px"><strong>' + (s.description || '-') + '</strong>' + (s.note ? '<br><small style="color:#666">' + s.note + '</small>' : '') + '</td>' +
      '<td style="padding:8px;text-align:right"><strong style="color:#16a34a;font-size:14px">' + money(s.amount) + '</strong></td>' +
      '<td style="padding:8px"><span class="badge ' + (s.paymentMethod === 'Cash' ? 'badge-paid' : (s.paymentMethod === 'Pending' ? 'badge-unpaid' : 'badge-partial')) + '">' + s.paymentMethod + '</span></td>' +
      '<td style="padding:8px;white-space:nowrap">' +
        '<button onclick="editShopSale(\'' + s.id + '\')" style="background:#f59e0b;color:#fff;border:none;padding:5px 8px;border-radius:4px;cursor:pointer;font-size:12px;margin-right:2px">✏️</button>' +
        (isAdmin() ? '<button onclick="delShopSale(\'' + s.id + '\')" style="background:#dc2626;color:#fff;border:none;padding:5px 8px;border-radius:4px;cursor:pointer;font-size:12px">🗑️</button>' : '') +
      '</td></tr>';
  }).join('') : '<tr><td colspan="5" style="text-align:center;color:#888;padding:20px">No sales for this date. Click "+ New Sale" to add.</td></tr>';
}

function openShopSaleModal(s) {
  editId = s ? s.id : null;
  $('modalTitle').textContent = s ? 'Edit Sale' : 'New Shop Sale';
  $('modalBody').innerHTML =
    '<div class="alert alert-info" style="margin-bottom:12px">⚡ Quick entry: Just enter amount and items. No customer name needed for walk-ins!</div>' +
    '<div class="form-group"><label>Description (items/services) *</label><input type="text" id="ssDesc" value="' + (s ? (s.description || '') : '') + '" placeholder="e.g. 2 Flex prints, 5 visiting cards" autofocus></div>' +
    '<div class="form-row">' +
      '<div class="form-group"><label>Amount (Rs.) *</label><input type="number" id="ssAmount" value="' + (s ? s.amount : '') + '" min="0" step="0.01" autofocus></div>' +
      '<div class="form-group"><label>Payment Method</label><select id="ssMethod"><option value="Cash"' + (s && s.paymentMethod === 'Cash' ? ' selected' : '') + '>Cash</option><option value="Bank"' + (s && s.paymentMethod === 'Bank' ? ' selected' : '') + '>Bank</option><option value="JazzCash"' + (s && s.paymentMethod === 'JazzCash' ? ' selected' : '') + '>JazzCash</option><option value="Easypaisa"' + (s && s.paymentMethod === 'Easypaisa' ? ' selected' : '') + '>Easypaisa</option><option value="Pending"' + (s && s.paymentMethod === 'Pending' ? ' selected' : '') + '>Pending (Credit)</option></select></div>' +
    '</div>' +
    '<div class="form-row">' +
      '<div class="form-group"><label>Date</label><input type="date" id="ssDate" value="' + (s ? s.date : today()) + '"></div>' +
      '<div class="form-group"><label>Time</label><input type="text" id="ssTime" value="' + (s ? (s.time || now()) : now()) + '" placeholder="Auto"></div>' +
    '</div>' +
    '<div class="form-group"><label>Note (optional)</label><input type="text" id="ssNote" value="' + (s ? (s.note || '') : '') + '" placeholder="Any note (optional)"></div>' +
    '<button onclick="saveShopSale()" class="btn btn-success btn-block" style="margin-top:12px">💾 Save Sale</button>';
  $('modal').style.display = 'flex';
}

function saveShopSale() {
  var amount = parseFloat($('ssAmount').value) || 0;
  if (amount <= 0) { toast('Enter amount', 'error'); return; }
  var desc = $('ssDesc').value.trim();
  if (!desc) { toast('Enter description', 'error'); return; }
  // Auto-generate customer name from time
  var timeStr = $('ssTime').value || now();
  var data = {
    customerName: 'Walk-in #' + (state.shopSales.length + 1),
    phone: '',
    description: desc,
    amount: amount,
    paymentMethod: $('ssMethod').value,
    date: $('ssDate').value || today(),
    time: timeStr,
    note: $('ssNote').value.trim()
  };
  if (editId) {
    for (var i = 0; i < state.shopSales.length; i++) if (state.shopSales[i].id === editId) { state.shopSales[i] = Object.assign({}, state.shopSales[i], data); break; }
  } else {
    state.shopSales.push(Object.assign({ id: gid() }, data));
  }
  save();
  $('modal').style.display = 'none';
  toast('Sale saved! Total today: ' + money(getTodayTotal()), 'success');
  renderShopDaily();
  renderDash();
}

function editShopSale(id) {
  var s = state.shopSales.filter(function(x) { return x.id === id; })[0];
  if (s) openShopSaleModal(s);
}

function delShopSale(id) {
  if (!isAdmin()) return;
  if (!confirm('Delete this sale?')) return;
  state.shopSales = state.shopSales.filter(function(s) { return s.id !== id; });
  save();
  renderShopDaily();
  toast('Deleted', 'success');
}

// ==================== QUICK BILL ====================
function renderQB() {
  qbItems = [];
  $('qbItem').innerHTML = '<option value="">-- Select Item --</option>' + state.items.map(function(i) { return '<option value="' + i.id + '">' + i.name + '</option>'; }).join('');
  $('qbAreaBox').classList.add('hidden');
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
    if (!id) { $('qbAreaBox').classList.add('hidden'); $('qbQtyBox').style.display = 'grid'; return; }
    var item = state.items.filter(function(i) { return i.id === id; })[0];
    if (!item) return;
    if (item.calcType === 'area') {
      $('qbAreaBox').classList.remove('hidden');
      $('qbQtyBox').style.display = 'none';
      $('qbAreaPrice').value = item.price;
      $('qbHeight').value = '';
      $('qbWidth').value = '';
      $('qbAreaResult').textContent = 'Enter Height & Width';
    } else {
      $('qbAreaBox').classList.add('hidden');
      $('qbQtyBox').style.display = 'grid';
      $('qbPrice').value = item.price;
    }
  };
  ['qbHeight', 'qbWidth', 'qbAreaPrice'].forEach(function(id) {
    $(id).oninput = function() {
      var h = parseFloat($('qbHeight').value) || 0;
      var w = parseFloat($('qbWidth').value) || 0;
      var p = parseFloat($('qbAreaPrice').value) || 0;
      $('qbAreaResult').innerHTML = 'Total: <span style="color:#e01515">' + (h*w).toFixed(2) + ' sqft</span> = ' + money(h*w*p);
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
  if (!id) { toast('Select item', 'error'); return; }
  var item = state.items.filter(function(i) { return i.id === id; })[0];
  if (!item) return;
  var qty = 1, price = 0, details = '';
  if (item.calcType === 'area') {
    var h = parseFloat($('qbHeight').value) || 0;
    var w = parseFloat($('qbWidth').value) || 0;
    if (h <= 0 || w <= 0) { toast('Enter Height & Width', 'error'); return; }
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
  $('qbAreaBox').classList.add('hidden');
  $('qbQtyBox').style.display = 'grid';
}

function renderQBTbl() {
  var body = document.querySelector('#qbItemsTbl tbody');
  body.innerHTML = qbItems.length ? qbItems.map(function(it, i) {
    return '<tr><td style="padding:8px"><strong>' + it.name + '</strong><br><small style="color:#666">' + it.details + '</small></td><td style="padding:8px;text-align:right"><strong>' + money(it.total) + '</strong></td><td style="padding:8px;text-align:center"><button onclick="delQB(' + i + ')" style="background:#dc2626;color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px">🗑️</button></td></tr>';
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

// ==================== INVOICES ====================
function renderInv() {
  var search = ($('invSearch').value || '').toLowerCase();
  var list = state.invoices.filter(function(i) {
    return !search || (i.number && i.number.toLowerCase().indexOf(search) >= 0) || (i.customerName && i.customerName.toLowerCase().indexOf(search) >= 0);
  }).sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
  var body = document.querySelector('#invTbl tbody');
  body.innerHTML = list.length ? list.map(function(i) {
    return '<tr><td style="padding:8px"><strong>' + i.number + '</strong></td><td style="padding:8px">' + i.customerName + '<br><small style="color:#888">' + fdate(i.date) + '</small></td><td style="padding:8px;text-align:right"><strong>' + money(i.total) + '</strong><br><small style="color:' + (i.due > 0 ? '#dc2626' : '#16a34a') + '">Due: ' + money(i.due) + '</small></td><td style="padding:8px;white-space:nowrap">' +
      '<button onclick="printInv(\'' + i.id + '\')" style="background:#2563eb;color:#fff;border:none;padding:6px 8px;border-radius:4px;cursor:pointer;font-size:13px;margin-right:2px">🖨️</button>' +
      '<button onclick="waInv(\'' + i.id + '\')" style="background:#16a34a;color:#fff;border:none;padding:6px 8px;border-radius:4px;cursor:pointer;font-size:13px;margin-right:2px">📱</button>' +
      (isAdmin() ? '<button onclick="delInv(\'' + i.id + '\')" style="background:#dc2626;color:#fff;border:none;padding:6px 8px;border-radius:4px;cursor:pointer;font-size:13px">🗑️</button>' : '') +
      '</td></tr>';
  }).join('') : '<tr><td colspan="4" style="text-align:center;color:#888;padding:20px">No invoices. Go to NEW INVOICE.</td></tr>';
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
  if (!ph) { toast('No phone', 'error'); return; }
  var itemsTxt = inv.items.map(function(it) { return '* ' + it.name + ' (' + (it.details || it.qty + ' ' + it.unit) + ') = ' + money(it.total); }).join('%0A');
  var msg = '*' + state.business.name + '*%0A' + state.business.phone + '%0A%0A*Invoice: ' + inv.number + '*%0A*Date:* ' + fdate(inv.date) + '%0A%0A*Bill To:* ' + inv.customerName + '%0A%0A*Items:*%0A' + itemsTxt + '%0A%0A*Total:* ' + money(inv.total) + '%0A*Due:* ' + money(inv.due) + '%0A%0AThank you!';
  window.open('https://wa.me/' + ph + '?text=' + msg, '_blank');
}

// ==================== NEW INVOICE ====================
function renderNewInv() {
  invItems = [];
  $('invCustSel').innerHTML = '<option value="">-- Select Customer --</option><option value="__new__">+ Add New Customer</option>' + state.customers.map(function(c) { return '<option value="' + c.id + '">' + c.name + (c.phone ? ' (' + c.phone + ')' : '') + '</option>'; }).join('');
  $('invItemSel').innerHTML = '<option value="">-- Select Item --</option>' + state.items.map(function(i) { return '<option value="' + i.id + '">' + i.name + '</option>'; }).join('');
  $('invCustName').value = '';
  $('invCustPhone').value = '';
  $('invAreaBox').classList.add('hidden');
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
    if (!id) { $('invAreaBox').classList.add('hidden'); $('invQtyBox').style.display = 'grid'; return; }
    var item = state.items.filter(function(i) { return i.id === id; })[0];
    if (!item) return;
    if (item.calcType === 'area') {
      $('invAreaBox').classList.remove('hidden');
      $('invQtyBox').style.display = 'none';
      $('invAreaPrice').value = item.price;
      $('invHeight').value = '';
      $('invWidth').value = '';
    } else {
      $('invAreaBox').classList.add('hidden');
      $('invQtyBox').style.display = 'grid';
      $('invPrice').value = item.price;
    }
  };
  ['invHeight', 'invWidth', 'invAreaPrice'].forEach(function(id) {
    $(id).oninput = function() {
      var h = parseFloat($('invHeight').value) || 0;
      var w = parseFloat($('invWidth').value) || 0;
      var p = parseFloat($('invAreaPrice').value) || 0;
      $('invAreaResult').innerHTML = 'Total: <span style="color:#e01515">' + (h*w).toFixed(2) + ' sqft</span> = ' + money(h*w*p);
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
  if (!id) { toast('Select item', 'error'); return; }
  var item = state.items.filter(function(i) { return i.id === id; })[0];
  if (!item) return;
  var qty = 1, price = 0, details = '';
  if (item.calcType === 'area') {
    var h = parseFloat($('invHeight').value) || 0;
    var w = parseFloat($('invWidth').value) || 0;
    if (h <= 0 || w <= 0) { toast('Enter H & W', 'error'); return; }
    qty = h * w;
    price = parseFloat($('invAreaPrice').value) || 0;
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
  $('invAreaBox').classList.add('hidden');
  $('invQtyBox').style.display = 'grid';
}

function renderInvItemsTbl() {
  var body = document.querySelector('#invItemsTbl tbody');
  body.innerHTML = invItems.length ? invItems.map(function(it, i) {
    return '<tr><td style="padding:8px"><strong>' + it.name + '</strong><br><small style="color:#666">' + it.details + '</small></td><td style="padding:8px;text-align:right"><strong>' + money(it.total) + '</strong></td><td style="padding:8px;text-align:center"><button onclick="delInvItem(' + i + ')" style="background:#dc2626;color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px">🗑️</button></td></tr>';
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
  if (!c) return;
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
  if (paid > 0) state.payments.push({ id: gid(), date: today(), invoiceId: inv.id, invoiceNumber: num, customerId: c.id, customerName: c.name, amount: paid, method: $('invMethod').value, note: 'Initial payment' });
  save();
  toast('Invoice ' + num + ' saved!', 'success');
  printBill('INVOICE ' + num, inv);
  invItems = [];
  renderNewInv();
  nav('invoices');
}

// ==================== RECEIVE PAYMENTS ====================
function renderPayPage() {
  var pendingCusts = {};
  state.invoices.forEach(function(i) {
    if (i.customerId && Number(i.due) > 0) {
      if (!pendingCusts[i.customerId]) pendingCusts[i.customerId] = { name: i.customerName, phone: i.phone, total: 0, paid: 0, due: 0, count: 0 };
      pendingCusts[i.customerId].total += Number(i.total);
      pendingCusts[i.customerId].paid += Number(i.paid);
      pendingCusts[i.customerId].due += Number(i.due);
      pendingCusts[i.customerId].count++;
    }
  });
  $('payCustSel').innerHTML = '<option value="">-- Select Customer --</option>' + Object.keys(pendingCusts).map(function(id) {
    var c = pendingCusts[id];
    return '<option value="' + id + '">' + c.name + (c.phone ? ' (' + c.phone + ')' : '') + ' - Pending: ' + money(c.due) + '</option>';
  }).join('');
  $('payCustInfo').classList.add('hidden');
  $('payAmount').value = '';
  $('payNote').value = '';
  renderPayList();
}

$('payCustSel').onchange = function() {
  var cid = this.value;
  if (!cid) { $('payCustInfo').classList.add('hidden'); return; }
  var custInvs = state.invoices.filter(function(i) { return i.customerId === cid && Number(i.due) > 0; });
  if (custInvs.length === 0) return;
  var total = custInvs.reduce(function(s, i) { return s + Number(i.total); }, 0);
  var paid = custInvs.reduce(function(s, i) { return s + Number(i.paid); }, 0);
  var due = total - paid;
  $('payInvCount').textContent = custInvs.length;
  $('payTotal').textContent = money(total);
  $('payPaid').textContent = money(paid);
  $('payPending').textContent = money(due);
  $('payAmount').value = due;
  $('payCustInfo').classList.remove('hidden');
};

$('payReceiveBtn').onclick = function() {
  var cid = $('payCustSel').value;
  if (!cid) { toast('Select customer', 'error'); return; }
  var amount = parseFloat($('payAmount').value) || 0;
  if (amount <= 0) { toast('Enter amount', 'error'); return; }
  var custInvs = state.invoices.filter(function(i) { return i.customerId === cid && Number(i.due) > 0; });
  var cust = state.customers.filter(function(c) { return c.id === cid; })[0];
  if (!cust) { toast('Customer not found', 'error'); return; }
  var totalDue = custInvs.reduce(function(s, i) { return s + Number(i.due); }, 0);
  if (amount > totalDue + 0.01) { toast('Amount exceeds pending: ' + money(totalDue), 'error'); return; }
  var remaining = amount;
  for (var i = 0; i < custInvs.length && remaining > 0; i++) {
    var inv = custInvs[i];
    var pay = Math.min(remaining, inv.due);
    inv.paid += pay;
    inv.due -= pay;
    inv.status = inv.due <= 0 ? 'paid' : 'partial';
    state.payments.push({ id: gid(), date: today(), invoiceId: inv.id, invoiceNumber: inv.number, customerId: cid, customerName: cust.name, amount: pay, method: $('payMethod').value, note: $('payNote').value || 'Payment received' });
    remaining -= pay;
  }
  save();
  toast('Payment ' + money(amount) + ' received!', 'success');
  renderPayPage();
};

function renderPayList() {
  var list = state.payments.slice().sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
  var body = document.querySelector('#payTbl tbody');
  body.innerHTML = list.length ? list.map(function(p) {
    return '<tr><td style="padding:8px">' + fdate(p.date) + '</td><td style="padding:8px"><strong>' + p.invoiceNumber + '</strong></td><td style="padding:8px">' + p.customerName + '</td><td style="padding:8px"><strong style="color:#16a34a">' + money(p.amount) + '</strong></td><td style="padding:8px">' + p.method + '<br><small style="color:#888">' + (p.note || '') + '</small></td><td style="padding:8px">' + (isAdmin() ? '<button onclick="delPay(\'' + p.id + '\')" style="background:#dc2626;color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px">🗑️</button>' : '-') + '</td></tr>';
  }).join('') : '<tr><td colspan="6" style="text-align:center;color:#888;padding:20px">No payments yet</td></tr>';
}

function delPay(id) {
  if (!confirm('Delete?')) return;
  var p = state.payments.find(function(x) { return x.id === id; });
  if (p) { var inv = state.invoices.find(function(i) { return i.id === p.invoiceId; }); if (inv) { inv.paid -= p.amount; inv.due += p.amount; inv.status = inv.due >= inv.total ? 'unpaid' : (inv.paid > 0 ? 'partial' : 'paid'); } }
  state.payments = state.payments.filter(function(x) { return x.id !== id; });
  save();
  renderPayPage();
  toast('Deleted', 'success');
}

// ==================== CUSTOMERS ====================
function renderCust() {
  var search = ($('custSearch').value || '').toLowerCase();
  var list = state.customers.filter(function(c) { return !search || c.name.toLowerCase().indexOf(search) >= 0 || (c.phone || '').indexOf(search) >= 0; });
  var body = document.querySelector('#custTbl tbody');
  body.innerHTML = list.length ? list.map(function(c) {
    var invs = state.invoices.filter(function(i) { return i.customerId === c.id; });
    var due = invs.reduce(function(s, i) { return s + Number(i.due || 0); }, 0);
    return '<tr><td style="padding:8px"><strong>' + c.name + '</strong></td><td style="padding:8px">' + (c.phone || '-') + '</td><td style="padding:8px;text-align:right">' + (due > 0 ? '<span style="color:#dc2626;font-weight:700">' + money(due) + '</span>' : '-') + '</td><td style="padding:8px;white-space:nowrap">' +
      '<button onclick="editCust(\'' + c.id + '\')" style="background:#f59e0b;color:#fff;border:none;padding:5px 8px;border-radius:4px;cursor:pointer;font-size:12px;margin-right:2px">✏️</button>' +
      (isAdmin() ? '<button onclick="delCust(\'' + c.id + '\')" style="background:#dc2626;color:#fff;border:none;padding:5px 8px;border-radius:4px;cursor:pointer;font-size:12px">🗑️</button>' : '') +
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
  $('modalBody').innerHTML = '<label>Name *</label><input type="text" id="cmName" value="' + (c ? c.name : '') + '"><label>Phone</label><input type="text" id="cmPhone" value="' + (c ? (c.phone || '') : '') + '"><label>Address</label><input type="text" id="cmAddress" value="' + (c ? (c.address || '') : '') + '"><button onclick="saveCust()" class="btn btn-primary btn-block" style="margin-top:12px">💾 Save</button>';
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
  if (document.getElementById('page-customers').classList.contains('active')) renderCust();
  if (document.getElementById('page-newinvoice').classList.contains('active')) renderNewInv();
}

function editCust(id) {
  var c = state.customers.filter(function(x) { return x.id === id; })[0];
  if (c) openCustModal(c);
}

// ==================== ITEMS ====================
function renderItems() {
  var body = document.querySelector('#itemsTbl tbody');
  body.innerHTML = state.items.length ? state.items.map(function(i) {
    return '<tr><td style="padding:8px"><strong>' + i.name + '</strong></td><td style="padding:8px">' + i.unit + '</td><td style="padding:8px;text-align:right">' + money(i.price) + '</td><td style="padding:8px;white-space:nowrap">' +
      '<button onclick="editItem(\'' + i.id + '\')" style="background:#f59e0b;color:#fff;border:none;padding:5px 8px;border-radius:4px;cursor:pointer;font-size:12px;margin-right:2px">✏️</button>' +
      (isAdmin() ? '<button onclick="delItem(\'' + i.id + '\')" style="background:#dc2626;color:#fff;border:none;padding:5px 8px;border-radius:4px;cursor:pointer;font-size:12px">🗑️</button>' : '') +
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
  $('modalBody').innerHTML = '<label>Name *</label><input type="text" id="imName" value="' + (i ? i.name : '') + '"><label>Category</label><input type="text" id="imCat" value="' + (i ? i.category : 'Service') + '"><label>Type</label><select id="imType"><option value="area"' + (i && i.calcType === 'area' ? ' selected' : '') + '>Area (H x W)</option><option value="quantity"' + (i && i.calcType === 'quantity' ? ' selected' : '') + '>Quantity</option><option value="job"' + (i && i.calcType === 'job' ? ' selected' : '') + '>Job</option></select><label>Unit</label><select id="imUnit"><option value="sqft"' + (i && i.unit === 'sqft' ? ' selected' : '') + '>sqft</option><option value="qty"' + (i && i.unit === 'qty' ? ' selected' : '') + '>qty</option><option value="page"' + (i && i.unit === 'page' ? ' selected' : '') + '>page</option><option value="job"' + (i && i.unit === 'job' ? ' selected' : '') + '>job</option></select><label>Price</label><input type="number" id="imPrice" value="' + (i ? i.price : 0) + '" min="0" step="0.01"><button onclick="saveItem()" class="btn btn-primary btn-block" style="margin-top:12px">💾 Save</button>';
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
  if (document.getElementById('page-items').classList.contains('active')) renderItems();
}

function editItem(id) {
  var i = state.items.filter(function(x) { return x.id === id; })[0];
  if (i) openItemModal(i);
}

// ==================== EXPENSES ====================
function renderExp() {
  var body = document.querySelector('#expTbl tbody');
  var list = state.expenses.slice().sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
  body.innerHTML = list.length ? list.map(function(e) {
    return '<tr><td style="padding:8px">' + fdate(e.date) + '</td><td style="padding:8px">' + e.category + '<br><small style="color:#888">' + (e.description || '') + '</small></td><td style="padding:8px;text-align:right"><strong style="color:#dc2626">' + money(e.amount) + '</strong></td><td style="padding:8px;white-space:nowrap"><button onclick="editExp(\'' + e.id + '\')" style="background:#f59e0b;color:#fff;border:none;padding:5px 8px;border-radius:4px;cursor:pointer;font-size:12px;margin-right:2px">✏️</button>' + (isAdmin() ? '<button onclick="delExp(\'' + e.id + '\')" style="background:#dc2626;color:#fff;border:none;padding:5px 8px;border-radius:4px;cursor:pointer;font-size:12px">🗑️</button>' : '') + '</td></tr>';
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
  $('modalBody').innerHTML = '<label>Date</label><input type="date" id="exDate" value="' + (e ? e.date : today()) + '"><label>Amount *</label><input type="number" id="exAmount" value="' + (e ? e.amount : '') + '" min="0" step="0.01"><label>Category</label><select id="exCat"><option>Materials</option><option>Ink/Toner</option><option>Paper</option><option>Rent</option><option>Utilities</option><option>Salary</option><option>Transport</option><option>Vendor Payment</option><option>Other</option></select><label>Description</label><input type="text" id="exDesc" value="' + (e ? (e.description || '') : '') + '"><button onclick="saveExp()" class="btn btn-primary btn-block" style="margin-top:12px">💾 Save</button>';
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
  if (document.getElementById('page-expenses').classList.contains('active')) renderExp();
}

function editExp(id) {
  var e = state.expenses.filter(function(x) { return x.id === id; })[0];
  if (e) openExpModal(e);
}

// ==================== VENDORS ====================
function getVendorBalance(vendorId) {
  var txns = state.vendorTxns.filter(function(t) { return t.vendorId === vendorId; });
  var balance = 0;
  for (var i = 0; i < txns.length; i++) {
    if (txns[i].type === 'purchase') balance += Number(txns[i].amount);
    else balance -= Number(txns[i].amount);
  }
  return balance;
}

function renderVendors() {
  var body = document.querySelector('#vendorTbl tbody');
  body.innerHTML = state.vendors.length ? state.vendors.map(function(v) {
    var bal = getVendorBalance(v.id);
    return '<tr><td style="padding:8px"><strong>' + v.name + '</strong><br><small style="color:#888">' + (v.contactPerson || '') + '</small></td><td style="padding:8px">' + (v.phone || '-') + '</td><td style="padding:8px;text-align:right"><strong style="color:' + (bal > 0 ? '#dc2626' : (bal < 0 ? '#16a34a' : '#666')) + '">' + money(Math.abs(bal)) + '</strong><br><small style="color:#888">' + (bal > 0 ? 'Owed' : (bal < 0 ? 'Advance' : 'Clear')) + '</small></td><td style="padding:8px;white-space:nowrap">' +
      '<button onclick="vendorWA(\'' + v.id + '\')" style="background:#16a34a;color:#fff;border:none;padding:5px 8px;border-radius:4px;cursor:pointer;font-size:12px;margin-right:2px">📱</button>' +
      '<button onclick="editVendor(\'' + v.id + '\')" style="background:#f59e0b;color:#fff;border:none;padding:5px 8px;border-radius:4px;cursor:pointer;font-size:12px;margin-right:2px">✏️</button>' +
      (isAdmin() ? '<button onclick="delVendor(\'' + v.id + '\')" style="background:#dc2626;color:#fff;border:none;padding:5px 8px;border-radius:4px;cursor:pointer;font-size:12px">🗑️</button>' : '') +
      '</td></tr>';
  }).join('') : '<tr><td colspan="4" style="text-align:center;color:#888;padding:20px">No vendors yet. Click + Add.</td></tr>';
}

function delVendor(id) {
  if (!isAdmin()) return;
  if (!confirm('Delete?')) return;
  state.vendors = state.vendors.filter(function(v) { return v.id !== id; });
  state.vendorTxns = state.vendorTxns.filter(function(t) { return t.vendorId !== id; });
  save();
  renderVendors();
  toast('Deleted', 'success');
}

function openVendorModal(v) {
  editId = v ? v.id : null;
  $('modalTitle').textContent = v ? 'Edit Vendor' : 'Add Vendor';
  $('modalBody').innerHTML = '<label>Name *</label><input type="text" id="vmName" value="' + (v ? v.name : '') + '"><label>Contact</label><input type="text" id="vmContact" value="' + (v ? (v.contactPerson || '') : '') + '"><label>Phone</label><input type="text" id="vmPhone" value="' + (v ? (v.phone || '') : '') + '"><label>Address</label><input type="text" id="vmAddress" value="' + (v ? (v.address || '') : '') + '"><button onclick="saveVendor()" class="btn btn-primary btn-block" style="margin-top:12px">💾 Save</button>';
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
  if (document.getElementById('page-vendors').classList.contains('active')) renderVendors();
  if (document.getElementById('page-vendorpay').classList.contains('active')) renderVendorPay();
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

// ==================== VENDOR PAYMENTS ====================
function renderVendorPay() {
  $('vpVendorSel').innerHTML = '<option value="">-- Select Vendor --</option>' + state.vendors.map(function(v) { return '<option value="' + v.id + '">' + v.name + (v.phone ? ' (' + v.phone + ')' : '') + '</option>'; }).join('');
  $('vpDate').value = today();
  $('vpVendorInfo').classList.add('hidden');
  $('vpDesc').value = '';
  $('vpAmount').value = '';
  renderVPTbl();
}

$('vpVendorSel').onchange = function() {
  var vid = this.value;
  if (!vid) { $('vpVendorInfo').classList.add('hidden'); return; }
  var txns = state.vendorTxns.filter(function(t) { return t.vendorId === vid; });
  var total = 0, paid = 0;
  for (var i = 0; i < txns.length; i++) {
    if (txns[i].type === 'purchase') total += Number(txns[i].amount);
    else paid += Number(txns[i].amount);
  }
  var pending = total - paid;
  $('vpTotal').textContent = money(total);
  $('vpPaid').textContent = money(paid);
  $('vpPending').textContent = money(pending);
  $('vpVendorInfo').classList.remove('hidden');
  if (pending > 0) $('vpAmount').value = pending;
};

$('vpSaveBtn').onclick = function() {
  var vid = $('vpVendorSel').value;
  if (!vid) { toast('Select vendor', 'error'); return; }
  var v = state.vendors.filter(function(x) { return x.id === vid; })[0];
  if (!v) { toast('Vendor not found', 'error'); return; }
  var amt = parseFloat($('vpAmount').value) || 0;
  if (amt <= 0) { toast('Enter valid amount', 'error'); return; }
  var desc = $('vpDesc').value.trim() || (vpType.value === 'purchase' ? 'Purchase from ' + v.name : 'Payment to ' + v.name);
  var type = $('vpType').value;
  var method = $('vpMethod').value;
  var date = $('vpDate').value || today();
  state.vendorTxns.push({ id: gid(), date: date, vendorId: vid, vendorName: v.name, description: desc, type: type, amount: amt, method: method });
  if (type === 'payment') {
    state.expenses.push({ id: gid(), date: date, amount: amt, category: 'Vendor Payment', description: 'Payment to ' + v.name + (desc ? ' - ' + desc : ''), vendorId: vid, vendorName: v.name, method: method });
  }
  save();
  toast('Transaction saved!', 'success');
  renderVendorPay();
  $('vpVendorSel').onchange();
  $('vpDesc').value = '';
  $('vpAmount').value = '';
};

function renderVPTbl() {
  var list = state.vendorTxns.slice().sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
  var body = document.querySelector('#vpTbl tbody');
  body.innerHTML = list.length ? list.map(function(t) {
    return '<tr><td style="padding:8px">' + fdate(t.date) + '</td><td style="padding:8px">' + t.vendorName + '</td><td style="padding:8px">' + (t.description || '-') + '</td><td style="padding:8px"><span class="badge ' + (t.type === 'purchase' ? 'badge-unpaid' : 'badge-paid') + '">' + t.type + '</span></td><td style="padding:8px"><strong style="color:' + (t.type === 'purchase' ? '#dc2626' : '#16a34a') + '">' + money(t.amount) + '</strong></td><td style="padding:8px">' + (isAdmin() ? '<button onclick="delVP(\'' + t.id + '\')" style="background:#dc2626;color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px">🗑️</button>' : '-') + '</td></tr>';
  }).join('') : '<tr><td colspan="6" style="text-align:center;color:#888;padding:20px">No transactions</td></tr>';
}

function delVP(id) {
  if (!confirm('Delete?')) return;
  state.vendorTxns = state.vendorTxns.filter(function(t) { return t.id !== id; });
  save();
  renderVendorPay();
  toast('Deleted', 'success');
}

// ==================== REPORTS ====================
var currentReportHTML = '';
var currentReportTitle = '';

function genReport() {
  var type = $('repType').value;
  var from = $('repFrom').value || '2000-01-01';
  var to = $('repTo').value || '2100-12-31';
  var html = '';
  var title = '';
  if (type === 'sales') {
    title = 'Sales Report';
    var list = state.invoices.filter(function(i) { return i.date >= from && i.date <= to; });
    var shopList = state.shopSales.filter(function(s) { return s.date >= from && s.date <= to; });
    var total = list.reduce(function(s, i) { return s + Number(i.total); }, 0) + shopList.reduce(function(s, sh) { return s + Number(sh.amount); }, 0);
    html = '<h2 style="margin:0 0 12px;color:#e01515">' + title + '</h2><p>Period: ' + fdate(from) + ' to ' + fdate(to) + ' | Total: ' + money(total) + '</p>';
  } else if (type === 'expense') {
    title = 'Expense Report';
    var list = state.expenses.filter(function(e) { return e.date >= from && e.date <= to; });
    var total = list.reduce(function(s, e) { return s + Number(e.amount); }, 0);
    html = '<h2 style="margin:0 0 12px;color:#e01515">' + title + '</h2><p>Total Expenses: ' + money(total) + '</p>';
  } else if (type === 'profit') {
    title = 'Profit Report';
    var sales = state.invoices.filter(function(i) { return i.date >= from && i.date <= to; }).reduce(function(s, i) { return s + Number(i.total); }, 0) + state.shopSales.filter(function(s) { return s.date >= from && s.date <= to; }).reduce(function(s, sh) { return s + Number(sh.amount); }, 0);
    var exp = state.expenses.filter(function(e) { return e.date >= from && e.date <= to; }).reduce(function(s, e) { return s + Number(e.amount); }, 0);
    html = '<h2 style="margin:0 0 12px;color:#e01515">' + title + '</h2><p>Sales: ' + money(sales) + ' | Expenses: ' + money(exp) + ' | <strong style="color:' + (sales - exp >= 0 ? '#16a34a' : '#dc2626') + '">Profit: ' + money(sales - exp) + '</strong></p>';
  } else if (type === 'shopsale') {
    title = 'Shop Daily Sale Report';
    var list = state.shopSales.filter(function(s) { return s.date >= from && s.date <= to; }).sort(function(a, b) { return b.date.localeCompare(a.date) || (b.time || '').localeCompare(a.time || ''); });
    var total = list.reduce(function(s, x) { return s + Number(x.amount); }, 0);
    var cash = list.filter(function(s) { return s.paymentMethod === 'Cash'; }).reduce(function(s, x) { return s + Number(x.amount); }, 0);
    var pending = list.filter(function(s) { return s.paymentMethod === 'Pending'; }).reduce(function(s, x) { return s + Number(x.amount); }, 0);
    html = '<h2 style="margin:0 0 12px;color:#e01515">' + title + '</h2>' +
      '<div class="report-summary"><div class="item"><div class="lbl">Total Sales</div><div class="val">' + money(total) + '</div></div><div class="item"><div class="lbl">Cash</div><div class="val">' + money(cash) + '</div></div><div class="item"><div class="lbl">Pending</div><div class="val">' + money(pending) + '</div></div><div class="item"><div class="lbl">Customers</div><div class="val">' + list.length + '</div></div></div>' +
      '<table class="summary-table" style="margin-top:12px"><thead><tr><th>Date</th><th>Time</th><th>Customer</th><th>Description</th><th>Method</th><th>Amount</th></tr></thead><tbody>' +
      list.map(function(s) { return '<tr><td>' + fdate(s.date) + '</td><td>' + (s.time || '-') + '</td><td><strong>' + s.customerName + '</strong><br><small>' + (s.phone || '') + '</small></td><td>' + (s.description || '-') + '</td><td>' + s.paymentMethod + '</td><td style="text-align:right"><strong>' + money(s.amount) + '</strong></td></tr>'; }).join('') +
      '</tbody></table>';
  } else if (type === 'customer') {
    title = 'Customer-wise Report';
    var stats = {};
    state.invoices.filter(function(i) { return i.date >= from && i.date <= to; }).forEach(function(i) {
      if (!stats[i.customerName]) stats[i.customerName] = { count: 0, total: 0, due: 0 };
      stats[i.customerName].count++;
      stats[i.customerName].total += Number(i.total);
      stats[i.customerName].due += Number(i.due);
    });
    var list = Object.entries(stats).sort(function(a, b) { return b[1].total - a[1].total; });
    html = '<h2 style="margin:0 0 12px;color:#e01515">' + title + '</h2><table class="summary-table"><thead><tr><th>Customer</th><th style="text-align:right">Invoices</th><th style="text-align:right">Total</th><th style="text-align:right">Due</th></tr></thead><tbody>' + list.map(function(e) { return '<tr><td>' + e[0] + '</td><td style="text-align:right">' + e[1].count + '</td><td style="text-align:right">' + money(e[1].total) + '</td><td style="text-align:right">' + money(e[1].due) + '</td></tr>'; }).join('') + '</tbody></table>';
  } else if (type === 'vendor') {
    title = 'Vendor-wise Report';
    var vStats = {};
    state.vendorTxns.filter(function(t) { return t.date >= from && t.date <= to; }).forEach(function(t) {
      if (!vStats[t.vendorName]) vStats[t.vendorName] = { purchases: 0, payments: 0 };
      if (t.type === 'purchase') vStats[t.vendorName].purchases += Number(t.amount);
      else vStats[t.vendorName].payments += Number(t.amount);
    });
    var list = Object.entries(vStats);
    html = '<h2 style="margin:0 0 12px;color:#e01515">' + title + '</h2><table class="summary-table"><thead><tr><th>Vendor</th><th style="text-align:right">Purchases</th><th style="text-align:right">Payments</th><th style="text-align:right">Balance</th></tr></thead><tbody>' + list.map(function(e) { return '<tr><td>' + e[0] + '</td><td style="text-align:right">' + money(e[1].purchases) + '</td><td style="text-align:right">' + money(e[1].payments) + '</td><td style="text-align:right">' + money(e[1].purchases - e[1].payments) + '</td></tr>'; }).join('') + '</tbody></table>';
  } else if (type === 'item') {
    title = 'Item-wise Report';
    var stats = {};
    state.invoices.filter(function(i) { return i.date >= from && i.date <= to; }).forEach(function(i) {
      i.items.forEach(function(it) {
        if (!stats[it.name]) stats[it.name] = { qty: 0, revenue: 0 };
        stats[it.name].qty += Number(it.qty);
        stats[it.name].revenue += Number(it.total);
      });
    });
    var list = Object.entries(stats).sort(function(a, b) { return b[1].revenue - a[1].revenue; });
    html = '<h2 style="margin:0 0 12px;color:#e01515">' + title + '</h2><table class="summary-table"><thead><tr><th>Item</th><th style="text-align:right">Quantity</th><th style="text-align:right">Revenue</th></tr></thead><tbody>' + list.map(function(e) { return '<tr><td>' + e[0] + '</td><td style="text-align:right">' + e[1].qty + '</td><td style="text-align:right">' + money(e[1].revenue) + '</td></tr>'; }).join('') + '</tbody></table>';
  } else if (type === 'yearly') {
    title = 'Yearly Summary';
    var year = from.slice(0, 4);
    var yInvs = state.invoices.filter(function(i) { return i.date && i.date.indexOf(year) === 0; });
    var yExps = state.expenses.filter(function(e) { return e.date && e.date.indexOf(year) === 0; });
    var ySales = yInvs.reduce(function(s, i) { return s + Number(i.total); }, 0) + state.shopSales.filter(function(s) { return s.date && s.date.indexOf(year) === 0; }).reduce(function(s, sh) { return s + Number(sh.amount); }, 0);
    var yExp = yExps.reduce(function(s, e) { return s + Number(e.amount); }, 0);
    html = '<h2 style="margin:0 0 12px;color:#e01515">' + title + ' - ' + year + '</h2><div class="report-summary"><div class="item"><div class="lbl">Sales</div><div class="val" style="color:#16a34a">' + money(ySales) + '</div></div><div class="item"><div class="lbl">Expenses</div><div class="val" style="color:#dc2626">' + money(yExp) + '</div></div><div class="item"><div class="lbl">Profit</div><div class="val" style="color:' + (ySales - yExp >= 0 ? '#16a34a' : '#dc2626') + '">' + money(ySales - yExp) + '</div></div></div>';
  }
  $('repOutput').innerHTML = html;
  currentReportHTML = html;
  currentReportTitle = title;
}

function printReport() {
  if (!currentReportHTML) { toast('Generate first', 'error'); return; }
  var w = window.open('', '_blank');
  w.document.write('<html><head><title>' + currentReportTitle + '</title><style>body{font-family:Arial;padding:30px;font-size:12px}.h{text-align:center;border-bottom:3px solid #e01515;padding-bottom:8px;margin-bottom:20px}.h h1{color:#e01515;margin:0;font-size:24px}table{width:100%;border-collapse:collapse;margin:15px 0}th{background:#000;color:#fff;padding:8px;text-align:left}td{padding:6px;border-bottom:1px solid #ddd}.report-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:20px 0}.report-summary .item{background:#f5f5f5;padding:10px;border-left:3px solid #e01515}.ft{text-align:center;margin-top:30px;font-size:10px;color:#666;border-top:1px dashed #ccc;padding-top:8px}@media print{.no-print{display:none}}</style></head><body><div class="h"><h1>' + state.business.name + '</h1><p>' + state.business.address + '</p><p>Phone: ' + state.business.phone + '</p></div><h2>' + currentReportTitle + '</h2>' + currentReportHTML + '<div class="ft">Generated: ' + fdate(today()) + '</div><div class="no-print" style="text-align:center;margin-top:20px"><button onclick="window.print()" style="padding:12px 30px;background:#e01515;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px">🖨️ Print Now</button></div></body></html>');
  w.document.close();
}

function downloadPDF() {
  if (!currentReportHTML) { toast('Generate first', 'error'); return; }
  printReport();
  setTimeout(function() { alert('Print dialog khulega. "Save as PDF" select karein destination mein.'); }, 1000);
}

// ==================== SETTINGS ====================
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
  a.download = 'design-line-backup-' + today() + '.json';
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

// ==================== PRINT ====================
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

// ==================== INIT ====================
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
  $('addShopSaleBtn').onclick = function() { openShopSaleModal(); };
  $('shopSaleDate').onchange = renderShopDaily;
  $('shopSaleSearch').oninput = renderShopDaily;
  $('repGenBtn').onclick = genReport;
  $('repPDFBtn').onclick = downloadPDF;
  $('repPrintBtn').onclick = printReport;
  document.querySelectorAll('.yearChk').forEach(function(chk) {
    chk.addEventListener('change', function() {
      var checked = document.querySelectorAll('.yearChk:checked').length;
      if (checked > 3) { this.checked = false; toast('Maximum 3 years', 'warning'); return; }
      if (typeof renderYearlyChart === 'function') renderYearlyChart();
    });
  });
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
