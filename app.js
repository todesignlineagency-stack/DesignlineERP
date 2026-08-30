// Design Line Manager - Complete Version with all features
var STORAGE_KEY = 'dlm_v4';
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
  vendorTxns: []
};

var qbItems = [], invItems = [], currentUser = null, editId = null;

function gid() { return 'id' + Date.now() + Math.random().toString(36).substr(2, 6); }
function money(n) { return (state.business.currency || 'Rs.') + ' ' + (Number(n) || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 }); }
function today() { return new Date().toISOString().split('T')[0]; }
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
  var titles = { dashboard: 'DASHBOARD', quickbill: 'QUICK BILL', invoices: 'INVOICES', newinvoice: 'NEW INVOICE', payments: 'RECEIVE PAYMENTS', customers: 'CUSTOMERS', items: 'ITEMS', expenses: 'EXPENSES', vendors: 'VENDORS', vendorpay: 'VENDOR PAYMENTS', reports: 'REPORTS', settings: 'SETTINGS' };
  $('pageTitle').textContent = titles[page] || page;
  if (page === 'dashboard') renderDash();
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

// DASHBOARD with YEARLY stats
function renderDash() {
  var todayStr = today();
  var monthStr = todayStr.slice(0, 7);
  var yearStr = todayStr.slice(0, 4);
  $('currentYear').textContent = yearStr;

  // Today
  var todayInv = state.invoices.filter(function(i) { return i.date === todayStr; });
  var todayExp = state.expenses.filter(function(e) { return e.date === todayStr; });
  var todaySales = todayInv.reduce(function(s, i) { return s + Number(i.total); }, 0);
  var todayExpAmt = todayExp.reduce(function(s, e) { return s + Number(e.amount); }, 0);

  // This Month
  var monthInv = state.invoices.filter(function(i) { return i.date && i.date.indexOf(monthStr) === 0; });
  var monthExp = state.expenses.filter(function(e) { return e.date && e.date.indexOf(monthStr) === 0; });
  var monthSales = monthInv.reduce(function(s, i) { return s + Number(i.total); }, 0);
  var monthPaid = monthInv.reduce(function(s, i) { return s + Number(i.paid); }, 0);
  var monthExpAmt = monthExp.reduce(function(s, e) { return s + Number(e.amount); }, 0);
  var monthProfit = monthSales - monthExpAmt;
  var monthPending = monthInv.reduce(function(s, i) { return s + Number(i.due || 0); }, 0);

  // This Year
  var yearInv = state.invoices.filter(function(i) { return i.date && i.date.indexOf(yearStr) === 0; });
  var yearExp = state.expenses.filter(function(e) { return e.date && e.date.indexOf(yearStr) === 0; });
  var yearSales = yearInv.reduce(function(s, i) { return s + Number(i.total); }, 0);
  var yearPaid = yearInv.reduce(function(s, i) { return s + Number(i.paid); }, 0);
  var yearExpAmt = yearExp.reduce(function(s, e) { return s + Number(e.amount); }, 0);
  var yearProfit = yearSales - yearExpAmt;
  var yearPending = yearInv.reduce(function(s, i) { return s + Number(i.due || 0); }, 0);

  // All time
  var allSales = state.invoices.reduce(function(s, i) { return s + Number(i.total); }, 0);
  var allPaid = state.invoices.reduce(function(s, i) { return s + Number(i.paid); }, 0);
  var allExp = state.expenses.reduce(function(s, e) { return s + Number(e.amount); }, 0);
  var allPending = state.invoices.reduce(function(s, i) { return s + Number(i.due || 0); }, 0);
  var vendorBal = state.vendors.reduce(function(s, v) { return s + getVendorBalance(v.id); }, 0);

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
    { c: '#f59e0b', l: '📅 Yearly Pending', v: money(yearPending) },
    { c: '#0a0a0a', l: '💰 All Time Sales', v: money(allSales) },
    { c: '#666', l: '💰 All Time Profit', v: money(allSales - allExp) }
  ];
  var html = '';
  for (var i = 0; i < cards.length; i++) {
    html += '<div class="dash-card" style="border-left-color:' + cards[i].c + '"><div class="lbl">' + cards[i].l + '</div><div class="val">' + cards[i].v + '</div></div>';
  }
  $('dashStats').innerHTML = html;

  // Monthly chart (this year)
  renderMonthlyChart(yearStr);

  // Yearly comparison chart
  renderYearlyChart();

  // Recent invoices
  var recent = state.invoices.slice().sort(function(a, b) { return new Date(b.date) - new Date(a.date); }).slice(0, 5);
  var tbody = document.querySelector('#recentTbl tbody');
  tbody.innerHTML = recent.length ? recent.map(function(i) {
    return '<tr><td style="padding:8px"><strong>' + i.number + '</strong></td><td style="padding:8px">' + i.customerName + '</td><td style="padding:8px"><strong>' + money(i.total) + '</strong></td><td style="padding:8px"><span class="badge badge-' + i.status + '">' + i.status + '</span></td></tr>';
  }).join('') : '<tr><td colspan="4" style="text-align:center;color:#888;padding:20px">No invoices yet</td></tr>';

  // Pending customers
  var pendingByCust = {};
  state.invoices.forEach(function(i) {
    if (i.customerId && Number(i.due) > 0) {
      if (!pendingByCust[i.customerId]) pendingByCust[i.customerId] = { name: i.customerName, phone: i.phone, total: 0, paid: 0, due: 0, count: 0 };
      pendingByCust[i.customerId].total += Number(i.total);
      pendingByCust[i.customerId].paid += Number(i.paid);
      pendingByCust[i.customerId].due += Number(i.due);
      pendingByCust[i.customerId].count++;
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
    var sales = state.invoices.filter(function(i) { return i.date && i.date.indexOf(mStr) === 0; }).reduce(function(s, i) { return s + Number(i.total); }, 0);
    var expenses = state.expenses.filter(function(e) { return e.date && e.date.indexOf(mStr) === 0; }).reduce(function(s, e) { return s + Number(e.amount); }, 0);
    var profit = sales - expenses;
    monthData.push({ name: months[m-1], sales: sales, expenses: expenses, profit: profit });
    if (sales > maxSales) maxSales = sales;
  }
  var yearTotal = monthData.reduce(function(s, m) { return s + m.sales; }, 0);
  var html = '<div class="chart-container">';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px">';
  html += '<div><strong>Total Year Income:</strong> <span style="color:#16a34a;font-size:18px;font-weight:700">' + money(yearTotal) + '</span></div>';
  html += '<div class="legend">';
  html += '<div class="legend-item"><div class="legend-color" style="background:#e01515"></div> Sales</div>';
  html += '<div class="legend-item"><div class="legend-color" style="background:#dc2626"></div> Expenses</div>';
  html += '<div class="legend-item"><div class="legend-color" style="background:#16a34a"></div> Profit</div>';
  html += '</div></div>';
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
  // Table below
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
    var sales = state.invoices.filter(function(i) { return i.date && i.date.indexOf(y) === 0; }).reduce(function(s, i) { return s + Number(i.total); }, 0);
    var expenses = state.expenses.filter(function(e) { return e.date && e.date.indexOf(y) === 0; }).reduce(function(s, e) { return s + Number(e.amount); }, 0);
    yearData.push({ year: y, sales: sales, expenses: expenses, profit: sales - expenses });
    if (sales > maxVal) maxVal = sales;
  }
  var html = '<div class="chart-container">';
  html += '<div class="legend">';
  for (var m = 0; m < yearData.length; m++) {
    html += '<div class="legend-item"><div class="legend-color" style="background:' + (yearColors[offsets[m]] || '#666') + '"></div> ' + yearData[m].year + '</div>';
  }
  html += '</div>';
  if (yearData.length === 0) {
    html += '<p style="text-align:center;color:#888;padding:20px">Select at least one year above</p>';
  } else {
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-top:10px">';
    for (var n = 0; n < yearData.length; n++) {
      var yd = yearData[n];
      var pct = maxVal > 0 ? (yd.sales / maxVal) * 100 : 0;
      html += '<div style="background:#fff;padding:14px;border-radius:8px;border-left:4px solid ' + (yearColors[offsets[n]] || '#666') + '">';
      html += '<div style="font-size:12px;color:#666;font-weight:600">YEAR ' + yd.year + '</div>';
      html += '<div style="font-size:20px;font-weight:700;color:#0a0a0a;margin:4px 0">' + money(yd.sales) + '</div>';
      html += '<div style="font-size:11px;color:#666">Total Sales</div>';
      html += '<div style="height:6px;background:#e5e5e5;border-radius:3px;margin:8px 0;overflow:hidden"><div style="height:100%;background:' + (yearColors[offsets[n]] || '#666') + ';width:' + pct + '%"></div></div>';
      html += '<div style="display:flex;justify-content:space-between;font-size:11px;margin-top:6px"><span style="color:#dc2626">Exp: ' + money(yd.expenses) + '</span><span style="color:#16a34a;font-weight:700">Profit: ' + money(yd.profit) + '</span></div>';
      html += '</div>';
    }
    html += '</div>';
    // Comparison table
    html += '<table class="summary-table" style="margin-top:16px"><thead><tr><th>Year</th><th style="text-align:right">Sales</th><th style="text-align:right">Expenses</th><th style="text-align:right">Profit</th><th style="text-align:right">vs Last Year</th></tr></thead><tbody>';
    for (var p = 0; p < yearData.length; p++) {
      var yd = yearData[p];
      var diff = '';
      if (p < yearData.length - 1) {
        var prev = yearData[p].sales;
        var curr = yearData[p-1 >= 0 ? p-1 : p].sales;
        if (p === 0 && yearData.length > 1) { prev = yearData[1].sales; curr = yd.sales; }
        if (prev > 0) {
          var change = ((curr - prev) / prev * 100).toFixed(1);
          diff = '<span style="color:' + (change >= 0 ? '#16a34a' : '#dc2626') + '">' + (change >= 0 ? '↑' : '↓') + ' ' + Math.abs(change) + '%</span>';
        }
      }
      html += '<tr><td><strong>' + yd.year + '</strong></td><td style="text-align:right">' + money(yd.sales) + '</td><td style="text-align:right">' + money(yd.expenses) + '</td><td style="text-align:right"><strong style="color:' + (yd.profit >= 0 ? '#16a34a' : '#dc2626') + '">' + money(yd.profit) + '</strong></td><td style="text-align:right">' + diff + '</td></tr>';
    }
    html += '</tbody></table>';
  }
  html += '</div>';
  $('yearlyChart').innerHTML = html;
}

function goToReceivePayment(name) {
  nav('payments');
  setTimeout(function() {
    var opts = $('payCustSel').options;
    for (var i = 0; i < opts.length; i++) {
      if (opts[i].text.indexOf(name) >= 0) {
        $('payCustSel').value = opts[i].value;
        $('payCustSel').onchange();
        break;
      }
    }
  }, 100);
}

// QUICK BILL
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

// INVOICES
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
      '<button onclick="editInv(\'' + i.id + '\')" style="background:#f59e0b;color:#fff;border:none;padding:6px 8px;border-radius:4px;cursor:pointer;font-size:13px;margin-right:2px">✏️</button>' +
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

function editInv(id) {
  toast('Edit feature coming soon', 'success');
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
      $('invAreaResult').textContent = 'Enter H & W';
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

// RECEIVE PAYMENTS (NEW)
function renderPayPage() {
  // Populate customer dropdown (only with pending dues)
  var pendingCusts = {};
  state.invoices.forEach(function(i) {
    if (i.customerId && Number(i.due) > 0) {
      if (!pendingCusts[i.customerId]) pendingCusts[i.customerId] = { name: i.customerName, phone: i.phone, total: 0, paid: 0, due: 0, count: 0, invoices: [] };
      pendingCusts[i.customerId].total += Number(i.total);
      pendingCusts[i.customerId].paid += Number(i.paid);
      pendingCusts[i.customerId].due += Number(i.due);
      pendingCusts[i.customerId].count++;
      pendingCusts[i.customerId].invoices.push(i);
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
  // Distribute payment across invoices (FIFO)
  var remaining = amount;
  for (var i = 0; i < custInvs.length && remaining > 0; i++) {
    var inv = custInvs[i];
    var pay = Math.min(remaining, inv.due);
    inv.paid += pay;
    inv.due -= pay;
    inv.status = inv.due <= 0 ? 'paid' : 'partial';
    state.payments.push({
      id: gid(),
      date: today(),
      invoiceId: inv.id,
      invoiceNumber: inv.number,
      customerId: cid,
      customerName: cust.name,
      amount: pay,
      method: $('payMethod').value,
      note: $('payNote').value || 'Payment received'
    });
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
    return '<tr><td style="padding:8px">' + fdate(p.date) + '<br><small style="color:#888">' + (fdatetime(p.date + 'T' + (p.time || '00:00'))) + '</small></td>' +
      '<td style="padding:8px"><strong>' + p.invoiceNumber + '</strong></td>' +
      '<td style="padding:8px">' + p.customerName + '</td>' +
      '<td style="padding:8px"><strong style="color:#16a34a">' + money(p.amount) + '</strong></td>' +
      '<td style="padding:8px">' + p.method + '<br><small style="color:#888">' + (p.note || '') + '</small></td>' +
      '<td style="padding:8px">' + (isAdmin() ? '<button onclick="delPay(\'' + p.id + '\')" style="background:#dc2626;color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px">🗑️</button>' : '-') + '</td></tr>';
  }).join('') : '<tr><td colspan="6" style="text-align:center;color:#888;padding:20px">No payments yet</td></tr>';
}

function delPay(id) {
  if (!confirm('Delete this payment?')) return;
  var p = state.payments.find(function(x) { return x.id === id; });
  if (p) {
    var inv = state.invoices.find(function(i) { return i.id === p.invoiceId; });
    if (inv) { inv.paid -= p.amount; inv.due += p.amount; inv.status = inv.due >= inv.total ? 'unpaid' : (inv.paid > 0 ? 'partial' : 'paid'); }
  }
  state.payments = state.payments.filter(function(x) { return x.id !== id; });
  save();
  renderPayPage();
  toast('Deleted', 'success');
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
  if (document.getElementById('page-payments').classList.contains('active')) renderPayPage();
}

function editCust(id) {
  var c = state.customers.filter(function(x) { return x.id === id; })[0];
  if (c) openCustModal(c);
}

// ITEMS
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

// EXPENSES
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
  $('modalBody').innerHTML = '<label>Date</label><input type="date" id="exDate" value="' + (e ? e.date : today()) + '"><label>Amount *</label><input type="number" id="exAmount" value="' + (e ? e.amount : '') + '" min="0" step="0.01"><label>Category</label><select id="exCat"><option>Materials</option><option>Ink/Toner</option><option>Paper</option><option>Rent</option><option>Utilities</option><option>Salary</option><option>Transport</option><option>Other</option></select><label>Description</label><input type="text" id="exDesc" value="' + (e ? (e.description || '') : '') + '"><button onclick="saveExp()" class="btn btn-primary btn-block" style="margin-top:12px">💾 Save</button>';
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

// VENDORS
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

// VENDOR PAYMENTS (NEW)
function renderVendorPay() {
  $('vpVendorSel').innerHTML = '<option value="">-- Select Vendor --</option>' + state.vendors.map(function(v) {
    return '<option value="' + v.id + '">' + v.name + (v.phone ? ' (' + v.phone + ')' : '') + '</option>';
  }).join('');
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
  // Smart amount suggestion
  if (pending > 0) {
    $('vpAmount').value = pending;
  } else {
    $('vpAmount').value = '';
  }
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

  state.vendorTxns.push({
    id: gid(),
    date: date,
    vendorId: vid,
    vendorName: v.name,
    description: desc,
    type: type,
    amount: amt,
    method: method
  });

  // ✅ If it's a PAYMENT to vendor, also add to expenses so it shows in expense report
  if (type === 'payment') {
    state.expenses.push({
      id: gid(),
      date: date,
      amount: amt,
      category: 'Vendor Payment',
      description: 'Payment to ' + v.name + (desc ? ' - ' + desc : ''),
      vendorId: vid,
      vendorName: v.name,
      method: method
    });
  }

  save();
  toast('Transaction saved!', 'success');
  renderVendorPay();
  $('vpVendorSel').onchange(); // refresh info
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

// REPORTS with PDF
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
    var list = state.invoices.filter(function(i) { return i.date >= from && i.date <= to; }).sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
    var total = list.reduce(function(s, i) { return s + Number(i.total); }, 0);
    var paid = list.reduce(function(s, i) { return s + Number(i.paid); }, 0);
    var due = total - paid;
    html = '<h2 style="margin:0 0 12px;color:#e01515">' + title + '</h2><p><strong>Period:</strong> ' + fdate(from) + ' to ' + fdate(to) + '</p><table style="width:100%;border-collapse:collapse"><thead><tr style="background:#0a0a0a;color:#fff"><th style="padding:8px">Date</th><th style="padding:8px">Invoice</th><th style="padding:8px">Customer</th><th style="padding:8px;text-align:right">Total</th><th style="padding:8px;text-align:right">Paid</th><th style="padding:8px;text-align:right">Due</th></tr></thead><tbody>' + list.map(function(i) { return '<tr style="border-bottom:1px solid #eee"><td style="padding:6px">' + fdate(i.date) + '</td><td style="padding:6px">' + i.number + '</td><td style="padding:6px">' + i.customerName + '</td><td style="padding:6px;text-align:right">' + money(i.total) + '</td><td style="padding:6px;text-align:right">' + money(i.paid) + '</td><td style="padding:6px;text-align:right">' + money(i.due) + '</td></tr>'; }).join('') + '</tbody><tfoot><tr style="background:#f5f5f5;font-weight:bold"><td colspan="3" style="padding:8px">TOTAL: ' + list.length + ' invoices</td><td style="padding:8px;text-align:right">' + money(total) + '</td><td style="padding:8px;text-align:right">' + money(paid) + '</td><td style="padding:8px;text-align:right">' + money(due) + '</td></tr></tfoot></table>';
  } else if (type === 'expense') {
    title = 'Expense Report';
    var list = state.expenses.filter(function(e) { return e.date >= from && e.date <= to; }).sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
    var total = list.reduce(function(s, e) { return s + Number(e.amount); }, 0);
    html = '<h2 style="margin:0 0 12px;color:#e01515">' + title + '</h2><p><strong>Period:</strong> ' + fdate(from) + ' to ' + fdate(to) + '</p><table style="width:100%;border-collapse:collapse"><thead><tr style="background:#0a0a0a;color:#fff"><th style="padding:8px">Date</th><th style="padding:8px">Category</th><th style="padding:8px">Description</th><th style="padding:8px;text-align:right">Amount</th></tr></thead><tbody>' + list.map(function(e) { return '<tr style="border-bottom:1px solid #eee"><td style="padding:6px">' + fdate(e.date) + '</td><td style="padding:6px">' + e.category + '</td><td style="padding:6px">' + (e.description || '-') + '</td><td style="padding:6px;text-align:right">' + money(e.amount) + '</td></tr>'; }).join('') + '</tbody><tfoot><tr style="background:#f5f5f5;font-weight:bold"><td colspan="3" style="padding:8px">TOTAL EXPENSES</td><td style="padding:8px;text-align:right">' + money(total) + '</td></tr></tfoot></table>';
  } else if (type === 'profit') {
    title = 'Profit Report';
    var sales = state.invoices.filter(function(i) { return i.date >= from && i.date <= to; }).reduce(function(s, i) { return s + Number(i.total); }, 0);
    var exp = state.expenses.filter(function(e) { return e.date >= from && e.date <= to; }).reduce(function(s, e) { return s + Number(e.amount); }, 0);
    var profit = sales - exp;
    html = '<h2 style="margin:0 0 12px;color:#e01515">' + title + '</h2><p><strong>Period:</strong> ' + fdate(from) + ' to ' + fdate(to) + '</p><div style="background:#f5f5f5;padding:20px;border-radius:8px"><div style="display:flex;justify-content:space-between;padding:10px 0;font-size:18px"><span>Total Sales:</span><strong style="color:#16a34a">' + money(sales) + '</strong></div><div style="display:flex;justify-content:space-between;padding:10px 0;font-size:18px"><span>Total Expenses:</span><strong style="color:#dc2626">' + money(exp) + '</strong></div><hr><div style="display:flex;justify-content:space-between;padding:10px 0;font-size:22px"><span>Net Profit:</span><strong style="color:' + (profit >= 0 ? '#16a34a' : '#dc2626') + '">' + money(profit) + '</strong></div></div>';
  } else if (type === 'customer') {
    title = 'Customer-wise Report';
    var stats = {};
    state.invoices.filter(function(i) { return i.date >= from && i.date <= to; }).forEach(function(i) {
      if (!stats[i.customerName]) stats[i.customerName] = { count: 0, total: 0, paid: 0, due: 0 };
      stats[i.customerName].count++;
      stats[i.customerName].total += Number(i.total);
      stats[i.customerName].paid += Number(i.paid);
      stats[i.customerName].due += Number(i.due);
    });
    var list = Object.entries(stats).sort(function(a, b) { return b[1].total - a[1].total; });
    html = '<h2 style="margin:0 0 12px;color:#e01515">' + title + '</h2><table style="width:100%;border-collapse:collapse"><thead><tr style="background:#0a0a0a;color:#fff"><th style="padding:8px">Customer</th><th style="padding:8px;text-align:right">Invoices</th><th style="padding:8px;text-align:right">Total</th><th style="padding:8px;text-align:right">Paid</th><th style="padding:8px;text-align:right">Due</th></tr></thead><tbody>' + list.map(function(entry) { return '<tr style="border-bottom:1px solid #eee"><td style="padding:6px">' + entry[0] + '</td><td style="padding:6px;text-align:right">' + entry[1].count + '</td><td style="padding:6px;text-align:right">' + money(entry[1].total) + '</td><td style="padding:6px;text-align:right">' + money(entry[1].paid) + '</td><td style="padding:6px;text-align:right">' + money(entry[1].due) + '</td></tr>'; }).join('') + '</tbody></table>';
  } else if (type === 'vendor') {
    title = 'Vendor-wise Report';
    var vStats = {};
    state.vendorTxns.filter(function(t) { return t.date >= from && t.date <= to; }).forEach(function(t) {
      if (!vStats[t.vendorName]) vStats[t.vendorName] = { purchases: 0, payments: 0, balance: 0 };
      if (t.type === 'purchase') vStats[t.vendorName].purchases += Number(t.amount);
      else vStats[t.vendorName].payments += Number(t.amount);
    });
    for (var vn in vStats) vStats[vn].balance = vStats[vn].purchases - vStats[vn].payments;
    var list = Object.entries(vStats).sort(function(a, b) { return b[1].purchases - a[1].purchases; });
    html = '<h2 style="margin:0 0 12px;color:#e01515">' + title + '</h2><table style="width:100%;border-collapse:collapse"><thead><tr style="background:#0a0a0a;color:#fff"><th style="padding:8px">Vendor</th><th style="padding:8px;text-align:right">Purchases</th><th style="padding:8px;text-align:right">Payments</th><th style="padding:8px;text-align:right">Balance</th></tr></thead><tbody>' + list.map(function(entry) { return '<tr style="border-bottom:1px solid #eee"><td style="padding:6px">' + entry[0] + '</td><td style="padding:6px;text-align:right">' + money(entry[1].purchases) + '</td><td style="padding:6px;text-align:right">' + money(entry[1].payments) + '</td><td style="padding:6px;text-align:right"><strong style="color:' + (entry[1].balance > 0 ? '#dc2626' : '#16a34a') + '">' + money(Math.abs(entry[1].balance)) + '</strong></td></tr>'; }).join('') + '</tbody></table>';
  } else if (type === 'item') {
    title = 'Item-wise Sales Report';
    var stats = {};
    state.invoices.filter(function(i) { return i.date >= from && i.date <= to; }).forEach(function(i) {
      i.items.forEach(function(it) {
        if (!stats[it.name]) stats[it.name] = { qty: 0, revenue: 0, count: 0 };
        stats[it.name].qty += Number(it.qty);
        stats[it.name].revenue += Number(it.total);
        stats[it.name].count++;
      });
    });
    var list = Object.entries(stats).sort(function(a, b) { return b[1].revenue - a[1].revenue; });
    html = '<h2 style="margin:0 0 12px;color:#e01515">' + title + '</h2><table style="width:100%;border-collapse:collapse"><thead><tr style="background:#0a0a0a;color:#fff"><th style="padding:8px">Item</th><th style="padding:8px;text-align:right">Times Sold</th><th style="padding:8px;text-align:right">Quantity</th><th style="padding:8px;text-align:right">Revenue</th></tr></thead><tbody>' + list.map(function(entry) { return '<tr style="border-bottom:1px solid #eee"><td style="padding:6px">' + entry[0] + '</td><td style="padding:6px;text-align:right">' + entry[1].count + '</td><td style="padding:6px;text-align:right">' + entry[1].qty + '</td><td style="padding:6px;text-align:right">' + money(entry[1].revenue) + '</td></tr>'; }).join('') + '</tbody></table>';
  } else if (type === 'yearly') {
    title = 'Yearly Summary Report';
    var year = from.slice(0, 4);
    var yInvs = state.invoices.filter(function(i) { return i.date && i.date.indexOf(year) === 0; });
    var yExps = state.expenses.filter(function(e) { return e.date && e.date.indexOf(year) === 0; });
    var ySales = yInvs.reduce(function(s, i) { return s + Number(i.total); }, 0);
    var yExp = yExps.reduce(function(s, e) { return s + Number(e.amount); }, 0);
    var yProfit = ySales - yExp;
    var yPaid = yInvs.reduce(function(s, i) { return s + Number(i.paid); }, 0);
    var yDue = ySales - yPaid;
    // Monthly breakdown
    var monthly = {};
    for (var m = 1; m <= 12; m++) {
      var mStr = year + '-' + String(m).padStart(2, '0');
      var mInvs = yInvs.filter(function(i) { return i.date.indexOf(mStr) === 0; });
      var mExps = yExps.filter(function(e) { return e.date.indexOf(mStr) === 0; });
      var monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      monthly[mStr] = { name: monthNames[m-1], sales: mInvs.reduce(function(s, i) { return s + Number(i.total); }, 0), expenses: mExps.reduce(function(s, e) { return s + Number(e.amount); }, 0) };
    }
    html = '<h2 style="margin:0 0 12px;color:#e01515">Yearly Summary - ' + year + '</h2><div style="background:#f5f5f5;padding:16px;border-radius:8px;margin-bottom:16px"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div><strong>Total Sales:</strong><br><span style="font-size:20px;color:#16a34a">' + money(ySales) + '</span></div><div><strong>Total Expenses:</strong><br><span style="font-size:20px;color:#dc2626">' + money(yExp) + '</span></div><div><strong>Total Paid:</strong><br><span style="font-size:18px;color:#16a34a">' + money(yPaid) + '</span></div><div><strong>Total Pending:</strong><br><span style="font-size:18px;color:#dc2626">' + money(yDue) + '</span></div><div style="grid-column:span 2;border-top:2px solid #0a0a0a;padding-top:10px;margin-top:8px"><strong>Net Profit:</strong><br><span style="font-size:24px;color:' + (yProfit >= 0 ? '#16a34a' : '#dc2626') + '">' + money(yProfit) + '</span></div></div></div><h3>Monthly Breakdown</h3><table style="width:100%;border-collapse:collapse"><thead><tr style="background:#0a0a0a;color:#fff"><th style="padding:8px">Month</th><th style="padding:8px;text-align:right">Sales</th><th style="padding:8px;text-align:right">Expenses</th><th style="padding:8px;text-align:right">Profit</th></tr></thead><tbody>' + Object.keys(monthly).map(function(k) { var m = monthly[k]; var p = m.sales - m.expenses; return '<tr style="border-bottom:1px solid #eee"><td style="padding:6px">' + m.name + '</td><td style="padding:6px;text-align:right">' + money(m.sales) + '</td><td style="padding:6px;text-align:right">' + money(m.expenses) + '</td><td style="padding:6px;text-align:right"><strong style="color:' + (p >= 0 ? '#16a34a' : '#dc2626') + '">' + money(p) + '</strong></td></tr>'; }).join('') + '</tbody></table>';
  }
  $('repOutput').innerHTML = html;
  currentReportHTML = html;
  currentReportTitle = title;
}

function printReport() {
  if (!currentReportHTML) { toast('Generate report first', 'error'); return; }
  var w = window.open('', '_blank');
  w.document.write('<html><head><title>' + currentReportTitle + ' - ' + state.business.name + '</title><style>body{font-family:Arial;padding:30px;color:#000;font-size:12px}.h{text-align:center;border-bottom:3px solid #e01515;padding-bottom:8px;margin-bottom:20px}.h h1{color:#e01515;margin:0;font-size:24px}.h p{margin:3px 0;font-size:11px}table{width:100%;border-collapse:collapse;margin:15px 0}th{background:#000;color:#fff;padding:8px;text-align:left;font-size:11px}td{padding:6px;border-bottom:1px solid #ddd}.ft{text-align:center;margin-top:30px;font-size:10px;color:#666;border-top:1px dashed #ccc;padding-top:8px}</style></head><body><div class="h"><h1>' + state.business.name + '</h1><p>' + state.business.address + '</p><p>Phone: ' + state.business.phone + ' | Email: ' + state.business.email + '</p></div><h2>' + currentReportTitle + '</h2>' + currentReportHTML + '<div class="ft">Generated on: ' + fdate(today()) + ' | ' + state.business.name + '</div><div style="text-align:center;margin-top:20px"><button onclick="window.print()" style="padding:12px 30px;background:#e01515;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px">🖨️ Print Now</button></div></body></html>');
  w.document.close();
}

function downloadPDF() {
  if (!currentReportHTML) { toast('Generate report first', 'error'); return; }
  var w = window.open('', '_blank');
  w.document.write('<html><head><title>' + currentReportTitle + ' - ' + state.business.name + '</title><style>body{font-family:Arial;padding:30px;color:#000;font-size:12px}.h{text-align:center;border-bottom:3px solid #e01515;padding-bottom:8px;margin-bottom:20px}.h h1{color:#e01515;margin:0;font-size:24px}.h p{margin:3px 0;font-size:11px}table{width:100%;border-collapse:collapse;margin:15px 0}th{background:#000;color:#fff;padding:8px;text-align:left;font-size:11px}td{padding:6px;border-bottom:1px solid #ddd}.ft{text-align:center;margin-top:30px;font-size:10px;color:#666;border-top:1px dashed #ccc;padding-top:8px}@media print{.no-print{display:none}}</style></head><body><div class="h"><h1>' + state.business.name + '</h1><p>' + state.business.address + '</p><p>Phone: ' + state.business.phone + ' | Email: ' + state.business.email + '</p></div><h2>' + currentReportTitle + '</h2>' + currentReportHTML + '<div class="ft">Generated on: ' + fdate(today()) + ' | ' + state.business.name + '</div><div class="no-print" style="text-align:center;margin-top:20px;background:#f5f5f5;padding:15px;border-radius:8px"><h3>📄 Save as PDF</h3><p>Press <strong>Ctrl+P</strong> (or Cmd+P on Mac) → Select <strong>"Save as PDF"</strong> as destination → Click Save</p><button onclick="window.print()" style="padding:12px 30px;background:#e01515;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px;margin-top:10px">🖨️ Open Print Dialog</button></div></body></html>');
  w.document.close();
  setTimeout(function() { w.print(); }, 500);
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
  $('repPDFBtn').onclick = downloadPDF;
  $('repPrintBtn').onclick = printReport;

  // Yearly chart checkboxes
  document.querySelectorAll('.yearChk').forEach(function(chk) {
    chk.addEventListener('change', function() {
      var checked = document.querySelectorAll('.yearChk:checked').length;
      if (checked > 3) {
        this.checked = false;
        toast('Maximum 3 years', 'warning');
        return;
      }
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
