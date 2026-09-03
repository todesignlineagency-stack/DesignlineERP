// Design Line Manager - Google Sheets Sync Version v17
var STORAGE_KEY = 'dlm_v17';
var GOOGLE_SCRIPT_URL = ''; // ⭐ PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL HERE

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
  shopSales: []
};

var qbItems = [], invItems = [], currentUser = null, editId = null, cloudSyncEnabled = false;

function gid() { return 'id' + Date.now() + '_' + Math.random().toString(36).substr(2, 6); }
function money(n) { return (state.business.currency || 'Rs.') + ' ' + (Number(n) || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 }); }
function today() { return new Date().toISOString().split('T')[0]; }
function now() { return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }); }
function fdate(s) { if (!s) return ''; var d = new Date(s); return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
function toast(msg, type) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + (type || '');
  t.style.background = type === 'success' ? '#16a34a' : (type === 'error' ? '#dc2626' : (type === 'sync' ? '#2563eb' : '#0a0a0a'));
  setTimeout(function() { t.className = 'toast'; }, 2500);
}
function $(id) { return document.getElementById(id); }

// ==================== GOOGLE SHEETS SYNC ====================
async function cloudGet(sheet) {
  if (!GOOGLE_SCRIPT_URL) return null;
  try {
    var res = await fetch(GOOGLE_SCRIPT_URL + '?action=get&sheet=' + sheet, {
      method: 'GET',
      redirect: 'follow'
    });
    var data = await res.json();
    if (data && data.error) { console.error('Cloud error [' + sheet + ']:', data.error); return null; }
    return (data && data.data) || [];
  } catch (e) {
    console.error('cloudGet error for', sheet, ':', e);
    return null;
  }
}

async function cloudSave(sheet, data) {
  if (!GOOGLE_SCRIPT_URL) return false;
  try {
    var url = GOOGLE_SCRIPT_URL + '?action=save&sheet=' + sheet + '&data=' + encodeURIComponent(JSON.stringify(data));
    var res = await fetch(url, { method: 'GET', redirect: 'follow' });
    var result = await res.json();
    if (result && result.error) { console.error('Cloud save error [' + sheet + ']:', result.error); return false; }
    console.log('☁️ Saved to cloud [' + sheet + ']:', data.id || data.name);
    return true;
  } catch (e) {
    console.error('cloudSave error for', sheet, ':', e);
    return false;
  }
}

function queueCloudSave(sheet, data) {
  // Add to pending queue - will be sent on next sync cycle
  if (!window._pendingPush) window._pendingPush = [];
  window._pendingPush.push({ sheet: sheet, data: data });
  window._cloudDirty = true;
}

async function cloudDelete(sheet, id) {
  if (!GOOGLE_SCRIPT_URL) return false;
  try {
    var url = GOOGLE_SCRIPT_URL + '?action=delete&sheet=' + sheet + '&data=' + encodeURIComponent(JSON.stringify({ id: id }));
    var res = await fetch(url, { method: 'GET', redirect: 'follow' });
    return true;
  } catch (e) {
    console.error('cloudDelete error:', e);
    return false;
  }
}

function save() {
  try {
    var persistData = Object.assign({}, state);
    delete persistData.currentUser;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistData));
    if (GOOGLE_SCRIPT_URL) localStorage.setItem('dlm_gurl', GOOGLE_SCRIPT_URL);
    if (Math.random() < 0.2) createAutoBackup();
    // Mark dirty so auto-sync knows to push
    if (GOOGLE_SCRIPT_URL) {
      window._cloudDirty = true;
      window._lastChange = Date.now();
    }
  } catch (e) {}
}

function load() {
  try {
    var savedUrl = localStorage.getItem('dlm_gurl');
    if (savedUrl) { GOOGLE_SCRIPT_URL = savedUrl; cloudSyncEnabled = true; }
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

async function loadFromCloud(silent) {
  if (!GOOGLE_SCRIPT_URL) return;
  try {
    // If local data changed, push to cloud first
    if (window._cloudDirty) {
      window._cloudDirty = false;
      var pending = window._pendingPush || [];
      for (var p = 0; p < pending.length; p++) {
        var item = pending[p];
        await cloudSave(item.sheet, item.data);
      }
      window._pendingPush = [];
    }
    var customers = await cloudGet('Customers');
    if (customers && customers.length) { mergeData('customers', customers); }
    var items = await cloudGet('Items');
    if (items && items.length) { mergeData('items', items); }
    var invoices = await cloudGet('Invoices');
    if (invoices && invoices.length) { mergeData('invoices', invoices); }
    var expenses = await cloudGet('Expenses');
    if (expenses && expenses.length) { mergeData('expenses', expenses); }
    var vendors = await cloudGet('Vendors');
    if (vendors && vendors.length) { mergeData('vendors', vendors); }
    var vendorTxns = await cloudGet('VendorTxns');
    if (vendorTxns && vendorTxns.length) { mergeData('vendorTxns', vendorTxns); }
    var shopSales = await cloudGet('ShopSales');
    if (shopSales && shopSales.length) { mergeData('shopSales', shopSales); }
    save();
    if (!silent) {
      var activePage = document.querySelector('.page.active');
      if (activePage) {
        var pageId = activePage.id.replace('page-', '');
        nav(pageId);
      }
      toast('☁️ Synced from cloud!', 'sync');
    }
  } catch (e) { console.log('Cloud load error:', e); }
}

// Merge cloud data with local (cloud wins, but keep local-only items)
function mergeData(key, cloudData) {
  if (!state[key]) state[key] = [];
  var localMap = {};
  for (var i = 0; i < state[key].length; i++) {
    if (state[key][i].id) localMap[state[key][i].id] = state[key][i];
  }
  var cloudMap = {};
  for (var j = 0; j < cloudData.length; j++) {
    if (cloudData[j].id) cloudMap[cloudData[j].id] = cloudData[j];
  }
  // Cloud data + local-only items (still save missing to cloud)
  var merged = [];
  for (var k in cloudMap) { if (cloudMap.hasOwnProperty(k)) merged.push(cloudMap[k]); }
  for (var l in localMap) {
    if (localMap.hasOwnProperty(l) && !cloudMap[l]) {
      // Local item not in cloud - keep locally but try to push to cloud
      merged.push(localMap[l]);
      if (GOOGLE_SCRIPT_URL) cloudSave(key.charAt(0).toUpperCase() + key.slice(1), localMap[l]);
    }
  }
  state[key] = merged;
}

function isAdmin() { return currentUser && currentUser.role === 'admin'; }

function doLogin() {
  var u = $('loginUser').value.trim();
  var p = $('loginPass').value;
  if (!u || !p) { $('loginError').textContent = 'Enter credentials'; return; }
  var found = null;
  for (var i = 0; i < state.users.length; i++) if (state.users[i].username === u && state.users[i].password === p) { found = state.users[i]; break; }
  if (found) {
    currentUser = found;
    $('loginPage').classList.add('hidden');
    $('appPage').classList.remove('hidden');
    $('userInfo').textContent = found.name;
    $('loginError').textContent = '';
    nav('dashboard');
    toast('Welcome ' + found.name, 'success');
  } else { $('loginError').textContent = 'Wrong credentials'; }
}

function forgotPassword() {
  var modalHtml = '<div class="form-group"><label>Enter your username</label><input type="text" id="fpUser" placeholder="e.g. admin" autofocus></div>' +
    '<div class="alert alert-info">A security question will be asked to verify your identity.</div>' +
    '<div id="fpStep2" class="hidden">' +
    '<label>Security Question: What is your shop name?</label>' +
    '<input type="text" id="fpAnswer" placeholder="Type your shop name">' +
    '<div style="font-size:11px;color:#666;margin-top:4px">Default answer: Design Line Agency</div>' +
    '</div>' +
    '<div id="fpStep3" class="hidden">' +
    '<div class="form-group"><label>New Password</label><input type="password" id="fpNewPass" placeholder="Min 4 characters"></div>' +
    '<div class="form-group"><label>Confirm Password</label><input type="password" id="fpConfirmPass" placeholder="Re-enter"></div>' +
    '</div>' +
    '<button id="fpNextBtn" class="btn btn-primary btn-block" style="margin-top:10px">Next →</button>';
  $('modalTitle').textContent = '🔑 Forgot Password';
  $('modalBody').innerHTML = modalHtml;
  $('modal').style.display = 'flex';
  $('fpNextBtn').onclick = fpNext;
}

function fpNext() {
  var step1 = $('fpStep1');
  if (!$('fpStep2').classList.contains('hidden')) {
    var user = $('fpUser').value.trim();
    var ans = $('fpAnswer').value.trim().toLowerCase();
    var userExists = state.users.filter(function(u) { return u.username === user; })[0];
    if (!userExists) { toast('Username not found', 'error'); return; }
    if (ans !== 'design line agency') { toast('Wrong answer. Hint: design line agency', 'error'); return; }
    $('fpStep2').classList.add('hidden');
    $('fpStep3').classList.remove('hidden');
    $('fpNextBtn').textContent = 'Reset Password';
    return;
  }
  if (!$('fpStep3').classList.contains('hidden')) {
    var newP = $('fpNewPass').value;
    var confP = $('fpConfirmPass').value;
    if (newP.length < 4) { toast('Password too short (min 4)', 'error'); return; }
    if (newP !== confP) { toast('Passwords do not match', 'error'); return; }
    var user = $('fpUser').value.trim();
    for (var i = 0; i < state.users.length; i++) {
      if (state.users[i].username === user) { state.users[i].password = newP; break; }
    }
    save();
    $('modal').style.display = 'none';
    toast('Password reset! Please login.', 'success');
    $('loginUser').value = user;
    $('loginPass').value = '';
  } else {
    $('fpStep2').classList.remove('hidden');
    $('fpNextBtn').textContent = 'Verify Answer';
  }
}

function changePassword() {
  if (!currentUser) { toast('Please login first', 'error'); return; }
  var oldP = $('oldPass').value;
  var newP = $('newPass').value;
  var confP = $('confirmPass').value;
  if (!oldP || !newP || !confP) { toast('Fill all fields', 'error'); return; }
  if (oldP !== currentUser.password) { toast('Current password is wrong', 'error'); return; }
  if (newP.length < 4) { toast('New password too short (min 4)', 'error'); return; }
  if (newP !== confP) { toast('New passwords do not match', 'error'); return; }
  for (var i = 0; i < state.users.length; i++) {
    if (state.users[i].id === currentUser.id) { state.users[i].password = newP; currentUser.password = newP; break; }
  }
  save();
  $('oldPass').value = ''; $('newPass').value = ''; $('confirmPass').value = '';
  toast('Password changed!', 'success');
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
  if (page === 'settings') applySettings();
  closeSidebar();
}

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
  var monthPending = monthInv.reduce(function(s, i) { return s + Number(i.due || 0); }, 0);
  var yearInv = state.invoices.filter(function(i) { return i.date && i.date.indexOf(yearStr) === 0; });
  var yearExp = state.expenses.filter(function(e) { return e.date && e.date.indexOf(yearStr) === 0; });
  var yearShop = state.shopSales.filter(function(s) { return s.date && s.date.indexOf(yearStr) === 0; });
  var yearSales = yearInv.reduce(function(s, i) { return s + Number(i.total); }, 0) + yearShop.reduce(function(s, sh) { return s + Number(sh.amount); }, 0);
  var yearExpAmt = yearExp.reduce(function(s, e) { return s + Number(e.amount); }, 0);
  var allSales = state.invoices.reduce(function(s, i) { return s + Number(i.total); }, 0) + state.shopSales.reduce(function(s, sh) { return s + Number(sh.amount); }, 0);
  var allExp = state.expenses.reduce(function(s, e) { return s + Number(e.amount); }, 0);
  var allPending = state.invoices.reduce(function(s, i) { return s + Number(i.due || 0); }, 0);
  var cards = [
    { c: '#e01515', l: "Today's Sales", v: money(todaySales), i: '💰' },
    { c: '#dc2626', l: "Today's Expenses", v: money(todayExpAmt), i: '💸' },
    { c: '#16a34a', l: "Today's Profit", v: money(todaySales - todayExpAmt), i: '📈' },
    { c: '#2563eb', l: 'This Month Sales', v: money(monthSales), i: '💵' },
    { c: '#f59e0b', l: 'This Month Pending', v: money(monthPending), i: '⏰' },
    { c: '#7c3aed', l: 'This Month Profit', v: money(monthSales - monthExpAmt), i: '💎' },
    { c: '#16a34a', l: 'Yearly Sales', v: money(yearSales), i: '📅' },
    { c: '#dc2626', l: 'Yearly Expenses', v: money(yearExpAmt), i: '📉' },
    { c: '#16a34a', l: 'Yearly Profit', v: money(yearSales - yearExpAmt), i: '🏆' },
    { c: '#f59e0b', l: 'All Pending', v: money(allPending), i: '⚠️' },
    { c: '#0a0a0a', l: 'Total Sales', v: money(allSales), i: '💼' },
    { c: '#666', l: 'Total Profit', v: money(allSales - allExp), i: '💰' }
  ];
  var html = '';
  for (var i = 0; i < cards.length; i++) {
    html += '<div class="dash-card" style="border-left-color:' + cards[i].c + '"><div class="lbl">' + cards[i].i + ' ' + cards[i].l + '</div><div class="val">' + cards[i].v + '</div></div>';
  }
  $('dashStats').innerHTML = html;
  renderMonthlyChart(yearStr);
  renderYearlyChart();
  renderRecentInvoices();
  renderPendingPayments();
}

function renderRecentInvoices() {
  var recent = state.invoices.slice().sort(function(a, b) { return new Date(b.date) - new Date(a.date); }).slice(0, 5);
  var tbody = document.querySelector('#recentTbl tbody');
  if (!tbody) return;
  tbody.innerHTML = recent.length ? recent.map(function(i) {
    return '<tr><td style="padding:8px"><strong>' + i.number + '</strong></td><td style="padding:8px">' + i.customerName + '</td><td style="padding:8px"><strong>' + money(i.total) + '</strong></td><td style="padding:8px"><span class="badge badge-' + i.status + '">' + i.status + '</span></td></tr>';
  }).join('') : '<tr><td colspan="4" style="text-align:center;color:#888;padding:20px">No invoices yet</td></tr>';
}

function renderPendingPayments() {
  var pendingMap = {};
  state.invoices.forEach(function(i) { if (i.customerId && Number(i.due) > 0) { if (!pendingMap[i.customerId]) pendingMap[i.customerId] = { name: i.customerName, phone: i.phone, total: 0, paid: 0, due: 0 }; pendingMap[i.customerId].total += Number(i.total); pendingMap[i.customerId].paid += Number(i.paid); pendingMap[i.customerId].due += Number(i.due); } });
  var list = Object.keys(pendingMap).map(function(k) { return pendingMap[k]; }).sort(function(a, b) { return b.due - a.due; }).slice(0, 10);
  var tbody = document.querySelector('#pendingTbl tbody');
  if (!tbody) return;
  tbody.innerHTML = list.length ? list.map(function(c) {
    return '<tr><td style="padding:8px"><strong>' + c.name + '</strong></td><td style="padding:8px">' + (c.phone || '-') + '</td><td style="padding:8px;text-align:right">' + money(c.total) + '</td><td style="padding:8px;text-align:right"><strong style="color:#dc2626">' + money(c.due) + '</strong></td><td style="padding:8px"><button onclick="waRemind(\'' + (c.phone || '') + '\',\'' + c.name + '\',' + c.due + ')" style="background:#16a34a;color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px">📱 Remind</button></td></tr>';
  }).join('') : '<tr><td colspan="5" style="text-align:center;color:#888;padding:20px">✅ No pending payments!</td></tr>';
}

function waRemind(phone, name, due) {
  if (!phone) { toast('No phone number', 'error'); return; }
  var ph = phone.replace(/[^0-9]/g, '');
  if (ph.indexOf('03') === 0) ph = '92' + ph.substr(1);
  var msg = '*' + state.business.name + '*%0AHello ' + name + ',%0AYou have a pending payment of ' + money(due) + '.%0AKindly clear at your earliest convenience.%0AThank you!';
  window.open('https://wa.me/' + ph + '?text=' + msg, '_blank');
}

function renderMonthlyChart(year) {
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var monthData = [];
  var maxSales = 1;
  for (var m = 1; m <= 12; m++) {
    var mStr = year + '-' + String(m).padStart(2, '0');
    var sales = state.invoices.filter(function(i) { return i.date && i.date.indexOf(mStr) === 0; }).reduce(function(s, i) { return s + Number(i.total); }, 0) + state.shopSales.filter(function(s) { return s.date && s.date.indexOf(mStr) === 0; }).reduce(function(s, sh) { return s + Number(sh.amount); }, 0);
    monthData.push({ name: months[m-1], sales: sales, mNum: m });
    if (sales > maxSales) maxSales = sales;
  }
  var currentMonth = new Date().getMonth() + 1;
  var html = '<div class="chart-container">';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;padding:0 4px">';
  html += '<div><strong style="font-size:14px">Total Year Income:</strong> <span style="color:#16a34a;font-size:20px;font-weight:700">Rs. ' + monthData.reduce(function(s, m) { return s + m.sales; }, 0).toLocaleString('en-PK') + '</span></div>';
  html += '<div style="font-size:11px;color:#666">📅 ' + year + '</div>';
  html += '</div>';
  html += '<div class="bar-chart" style="min-height:200px;height:200px;padding:8px 4px">';
  for (var i = 0; i < monthData.length; i++) {
    var m = monthData[i];
    var h = (m.sales / maxSales) * 100;
    var isCurrent = m.mNum === currentMonth;
    var barColor = m.sales > 0 ? (isCurrent ? 'background:linear-gradient(180deg,#f59e0b 0%,#d97706 100%)' : 'background:linear-gradient(180deg,#e01515 0%,#b01010 100%)') : 'background:#e5e5e5';
    html += '<div class="bar-item" title="' + m.name + ' ' + year + ': Rs. ' + m.sales.toLocaleString('en-PK') + '" style="min-width:0;flex:1">';
    html += '<div style="display:flex;align-items:flex-end;height:160px;width:100%;justify-content:center">';
    html += '<div class="bar-fill" style="height:' + Math.max(h, 3) + '%;' + barColor + ';width:75%;max-width:50px"></div>';
    html += '</div>';
    html += '<div class="bar-label" style="font-weight:' + (isCurrent ? '700' : '600') + ';color:' + (isCurrent ? '#f59e0b' : '#666') + '">' + m.name + '</div>';
    html += '<div class="bar-value">' + (m.sales > 0 ? m.sales.toLocaleString('en-PK') : '-') + '</div>';
    html += '</div>';
  }
  html += '</div>';
  html += '<div class="legend"><div class="legend-item"><div class="legend-color" style="background:linear-gradient(180deg,#e01515 0%,#b01010 100%)"></div>Months with sales</div><div class="legend-item"><div class="legend-color" style="background:linear-gradient(180deg,#f59e0b 0%,#d97706 100%)"></div>Current month</div></div>';
  html += '</div>';
  $('monthlyChart').innerHTML = html;
}

function renderYearlyChart() {
  var checkboxes = document.querySelectorAll('.yearChk');
  var offsets = [];
  checkboxes.forEach(function(cb) { if (cb.checked) offsets.push(parseInt(cb.value) || 0); });
  if (offsets.length === 0) { $('yearlyChart').innerHTML = '<p style="text-align:center;color:#888;padding:20px">Select at least one year</p>'; return; }
  var currentYear = new Date().getFullYear();
  var years = offsets.map(function(o) { return currentYear + o; });
  var colors = ['#e01515', '#2563eb', '#16a34a'];
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var datasets = years.map(function(yr, idx) {
    var monthlySales = [];
    var max = 1;
    for (var m = 1; m <= 12; m++) {
      var mStr = yr + '-' + String(m).padStart(2, '0');
      var sales = state.invoices.filter(function(i) { return i.date && i.date.indexOf(mStr) === 0; }).reduce(function(s, i) { return s + Number(i.total); }, 0) + state.shopSales.filter(function(s) { return s.date && s.date.indexOf(mStr) === 0; }).reduce(function(s, sh) { return s + Number(sh.amount); }, 0);
      monthlySales.push(sales);
      if (sales > max) max = sales;
    }
    return { year: yr, sales: monthlySales, total: monthlySales.reduce(function(s, v) { return s + v; }, 0), color: colors[idx % colors.length] };
  });
  var maxOverall = 1;
  datasets.forEach(function(d) { d.sales.forEach(function(v) { if (v > maxOverall) maxOverall = v; }); });
  var html = '<div class="chart-container">';
  html += '<div class="bar-chart" style="height:220px;min-height:220px;padding:8px 4px;align-items:flex-end">';
  for (var m = 0; m < 12; m++) {
    html += '<div class="bar-item" style="flex:1;min-width:0;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:1px">';
    html += '<div style="display:flex;align-items:flex-end;height:170px;width:100%;gap:1px;justify-content:center">';
    for (var d = 0; d < datasets.length; d++) {
      var val = datasets[d].sales[m];
      var h = (val / maxOverall) * 100;
      var lbl = val > 0 ? val.toLocaleString('en-PK') : '';
      html += '<div title="' + datasets[d].year + ' ' + months[m] + ': Rs. ' + val + '" style="height:' + Math.max(h, 2) + '%;background:' + datasets[d].color + ';flex:1;max-width:14px;border-radius:2px 2px 0 0;position:relative;min-height:3px"></div>';
    }
    html += '</div>';
    html += '<div class="bar-label">' + months[m] + '</div>';
    html += '</div>';
  }
  html += '</div>';
  html += '<div class="legend">';
  datasets.forEach(function(d) {
    html += '<div class="legend-item"><div class="legend-color" style="background:' + d.color + '"></div><strong>' + d.year + ':</strong> Rs. ' + d.total.toLocaleString('en-PK') + '</div>';
  });
  html += '</div></div>';
  $('yearlyChart').innerHTML = html;
}

// SHOP DAILY
function renderShopDaily() {
  if (!$('shopSaleDate').value) $('shopSaleDate').value = today();
  var date = $('shopSaleDate').value;
  var daySales = state.shopSales.filter(function(s) { return s.date === date; }).sort(function(a, b) { return (b.time || '').localeCompare(a.time || ''); });
  var totalSales = daySales.reduce(function(s, x) { return s + Number(x.amount); }, 0);
  var totalCash = daySales.filter(function(s) { return s.paymentMethod === 'Cash'; }).reduce(function(s, x) { return s + Number(x.amount); }, 0);
  var totalBank = daySales.filter(function(s) { return s.paymentMethod === 'Bank' || s.paymentMethod === 'JazzCash' || s.paymentMethod === 'Easypaisa'; }).reduce(function(s, x) { return s + Number(x.amount); }, 0);
  var totalPending = daySales.filter(function(s) { return s.paymentMethod === 'Pending'; }).reduce(function(s, x) { return s + Number(x.amount); }, 0);
  var html = '<div class="dash-card" style="border-left-color:#e01515"><div class="lbl">💰 Total</div><div class="val">' + money(totalSales) + '</div></div>';
  html += '<div class="dash-card green" style="border-left-color:#16a34a"><div class="lbl">💵 Cash</div><div class="val">' + money(totalCash) + '</div></div>';
  html += '<div class="dash-card blue" style="border-left-color:#2563eb"><div class="lbl">💳 Bank</div><div class="val">' + money(totalBank) + '</div></div>';
  html += '<div class="dash-card orange" style="border-left-color:#f59e0b"><div class="lbl">⏰ Pending</div><div class="val">' + money(totalPending) + '</div></div>';
  html += '<div class="dash-card" style="border-left-color:#7c3aed"><div class="lbl">🧾 Count</div><div class="val">' + daySales.length + '</div></div>';
  $('shopDailyStats').innerHTML = html;
  var body = document.querySelector('#shopSaleTbl tbody');
  body.innerHTML = daySales.length ? daySales.map(function(s, idx) {
    return '<tr><td style="padding:8px"><strong>' + (s.time || '-') + '</strong></td><td style="padding:8px"><strong>' + (s.description || '-') + '</strong>' + (s.note ? '<br><small style="color:#666">' + s.note + '</small>' : '') + '</td><td style="padding:8px;text-align:right"><strong style="color:#16a34a">' + money(s.amount) + '</strong></td><td style="padding:8px"><span class="badge ' + (s.paymentMethod === 'Cash' ? 'badge-paid' : (s.paymentMethod === 'Pending' ? 'badge-unpaid' : 'badge-partial')) + '">' + s.paymentMethod + '</span></td><td style="padding:8px">' + (isAdmin() ? '<button onclick="delShopSale(\'' + s.id + '\')" style="background:#dc2626;color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px">🗑️</button>' : '-') + '</td></tr>';
  }).join('') : '<tr><td colspan="5" style="text-align:center;color:#888;padding:20px">No sales. Click + New Sale.</td></tr>';
}

function openShopSaleModal() {
  $('modalTitle').textContent = 'New Shop Sale';
  $('modalBody').innerHTML =
    '<div class="form-group"><label>Description *</label><input type="text" id="ssDesc" placeholder="e.g. 2 Flex prints" autofocus></div>' +
    '<div class="form-row"><div class="form-group"><label>Amount (Rs.) *</label><input type="number" id="ssAmount" min="0" step="0.01"></div>' +
    '<div class="form-group"><label>Payment</label><select id="ssMethod"><option>Cash</option><option>Bank</option><option>JazzCash</option><option>Easypaisa</option><option>Pending</option></select></div></div>' +
    '<div class="form-group"><label>Date</label><input type="date" id="ssDate" value="' + today() + '"></div>' +
    '<div class="form-group"><label>Note (optional)</label><input type="text" id="ssNote" placeholder="Any extra note..."></div>' +
    '<button onclick="saveShopSale()" class="btn btn-success btn-block" style="margin-top:10px">💾 Save</button>';
  $('modal').style.display = 'flex';
}

async function saveShopSale() {
  var amount = parseFloat($('ssAmount').value) || 0;
  if (amount <= 0) { toast('Enter amount', 'error'); return; }
  var desc = $('ssDesc').value.trim();
  if (!desc) { toast('Enter description', 'error'); return; }
  var data = { id: gid(), description: desc, amount: amount, paymentMethod: $('ssMethod').value, date: $('ssDate').value || today(), time: now(), note: ($('ssNote') ? $('ssNote').value.trim() : '') };
  state.shopSales.push(data);
  save();
  if (GOOGLE_SCRIPT_URL) await cloudSave('shopSales', data);
  $('modal').style.display = 'none';
  toast('Sale saved!' + (GOOGLE_SCRIPT_URL ? ' ☁️' : ''), 'success');
  renderShopDaily();
  renderDash();
}

async function delShopSale(id) {
  if (!isAdmin()) return;
  if (!confirm('Delete?')) return;
  state.shopSales = state.shopSales.filter(function(s) { return s.id !== id; });
  save();
  if (GOOGLE_SCRIPT_URL) await cloudDelete('shopSales', id);
  renderShopDaily();
  toast('Deleted', 'success');
}

// QUICK BILL
function renderQB() {
  qbItems = [];
  $('qbItem').innerHTML = '<option value="">-- Select Item --</option>' + state.items.map(function(i) { return '<option value="' + i.id + '">' + i.name + '</option>'; }).join('');
  $('qbAreaBox').classList.add('hidden');
  $('qbQtyBox').style.display = 'grid';
  $('qbCustomer').value = '';
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
    } else {
      $('qbAreaBox').classList.add('hidden');
      $('qbQtyBox').style.display = 'grid';
      $('qbPrice').value = item.price;
    }
  };
  ['qbHeight', 'qbWidth', 'qbAreaPrice'].forEach(function(id) { $(id).oninput = function() { var h = parseFloat($('qbHeight').value) || 0; var w = parseFloat($('qbWidth').value) || 0; var p = parseFloat($('qbAreaPrice').value) || 0; $('qbAreaResult').innerHTML = 'Total: <span style="color:#e01515">' + (h*w).toFixed(2) + ' sqft</span> = ' + money(h*w*p); }; });
  $('qbAddBtn').onclick = addQBItem;
  $('qbSaveBtn').onclick = saveQB;
  $('qbDiscount').oninput = renderQBTbl;
  $('qbStatus').onchange = function() { var sub = qbItems.reduce(function(s, it) { return s + it.total; }, 0); var disc = parseFloat($('qbDiscount').value) || 0; var tot = Math.max(0, sub - disc); if (this.value === 'paid') $('qbPaid').value = tot; if (this.value === 'unpaid') $('qbPaid').value = 0; };
}

function addQBItem() {
  var id = $('qbItem').value;
  if (!id) { toast('Select item', 'error'); return; }
  var item = state.items.filter(function(i) { return i.id === id; })[0];
  if (!item) return;
  var qty = 1, price = 0, details = '';
  if (item.calcType === 'area') {
    var h = parseFloat($('qbHeight').value) || 0; var w = parseFloat($('qbWidth').value) || 0;
    if (h <= 0 || w <= 0) { toast('Enter H & W', 'error'); return; }
    qty = h * w; price = parseFloat($('qbAreaPrice').value) || 0;
    details = h + 'ft × ' + w + 'ft = ' + qty.toFixed(2) + ' sqft';
  } else {
    qty = parseFloat($('qbQty').value) || 0; price = parseFloat($('qbPrice').value) || 0;
    if (qty <= 0 || price <= 0) { toast('Enter qty & price', 'error'); return; }
    details = qty + ' ' + item.unit;
  }
  qbItems.push({ name: item.name, unit: item.unit, qty: qty, price: price, total: qty * price, details: details });
  renderQBTbl();
  $('qbItem').value = ''; $('qbAreaBox').classList.add('hidden'); $('qbQtyBox').style.display = 'grid';
}

function renderQBTbl() {
  var body = document.querySelector('#qbItemsTbl tbody');
  body.innerHTML = qbItems.length ? qbItems.map(function(it, i) { return '<tr><td style="padding:8px"><strong>' + it.name + '</strong><br><small>' + it.details + '</small></td><td style="padding:8px;text-align:right"><strong>' + money(it.total) + '</strong></td><td style="padding:8px;text-align:center"><button onclick="delQB(' + i + ')" style="background:#dc2626;color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px">🗑️</button></td></tr>'; }).join('') : '<tr><td colspan="3" style="text-align:center;color:#888;padding:16px">No items</td></tr>';
  var sub = qbItems.reduce(function(s, it) { return s + it.total; }, 0);
  var disc = parseFloat($('qbDiscount').value) || 0;
  var tot = Math.max(0, sub - disc);
  $('qbSubtotal').textContent = money(sub);
  $('qbTotal').textContent = money(tot);
}

function delQB(i) { qbItems.splice(i, 1); renderQBTbl(); }

function saveQB() {
  if (qbItems.length === 0) { toast('Add items first', 'error'); return; }
  var sub = qbItems.reduce(function(s, it) { return s + it.total; }, 0);
  var disc = parseFloat($('qbDiscount').value) || 0;
  var tot = Math.max(0, sub - disc);
  var paid = parseFloat($('qbPaid').value) || 0;
  if (paid > tot) paid = tot;
  var qbList = JSON.parse(localStorage.getItem('dlm_qb') || '[]');
  var num = 'QB-' + String(qbList.length + 1).padStart(4, '0');
  qbList.push({ number: num, date: today(), customerName: $('qbCustomer').value || 'Walk-in', items: qbItems, total: tot, paid: paid, due: tot - paid });
  localStorage.setItem('dlm_qb', JSON.stringify(qbList));
  toast('Saved!', 'success');
  printBill('QUICK BILL ' + num, qbList[qbList.length - 1]);
  qbItems = []; renderQB();
}

// INVOICES
function renderInv() {
  var search = ($('invSearch').value || '').toLowerCase();
  var list = state.invoices.filter(function(i) { return !search || (i.number && i.number.toLowerCase().indexOf(search) >= 0) || (i.customerName && i.customerName.toLowerCase().indexOf(search) >= 0); }).sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
  var body = document.querySelector('#invTbl tbody');
  body.innerHTML = list.length ? list.map(function(i) {
    return '<tr><td style="padding:8px"><strong>' + i.number + '</strong></td><td style="padding:8px">' + i.customerName + '</td><td style="padding:8px;text-align:right"><strong>' + money(i.total) + '</strong></td><td style="padding:8px;white-space:nowrap">' +
      '<button onclick="printInv(\'' + i.id + '\')" style="background:#2563eb;color:#fff;border:none;padding:6px 8px;border-radius:4px;cursor:pointer;font-size:13px;margin-right:2px">🖨️</button>' +
      '<button onclick="waInv(\'' + i.id + '\')" style="background:#16a34a;color:#fff;border:none;padding:6px 8px;border-radius:4px;cursor:pointer;font-size:13px;margin-right:2px">📱</button>' +
      (isAdmin() ? '<button onclick="delInv(\'' + i.id + '\')" style="background:#dc2626;color:#fff;border:none;padding:6px 8px;border-radius:4px;cursor:pointer;font-size:13px">🗑️</button>' : '') +
      '</td></tr>';
  }).join('') : '<tr><td colspan="4" style="text-align:center;color:#888;padding:20px">No invoices. Go to NEW INVOICE.</td></tr>';
}

async function delInv(id) {
  if (!confirm('Delete?')) return;
  state.invoices = state.invoices.filter(function(i) { return i.id !== id; });
  save();
  if (GOOGLE_SCRIPT_URL) await cloudDelete('invoices', id);
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
  if (!inv || !inv.phone) { toast('No phone', 'error'); return; }
  var ph = inv.phone.replace(/[^0-9]/g, '');
  if (ph.indexOf('03') === 0) ph = '92' + ph.substr(1);
  var msg = '*' + state.business.name + '*%0AInvoice: ' + inv.number + '%0ATotal: ' + money(inv.total) + '%0ADue: ' + money(inv.due);
  window.open('https://wa.me/' + ph + '?text=' + msg, '_blank');
}

// NEW INVOICE
function renderNewInv() {
  invItems = [];
  $('invCustSel').innerHTML = '<option value="">-- Select Customer --</option><option value="__new__">+ New</option>' + state.customers.map(function(c) { return '<option value="' + c.id + '">' + c.name + '</option>'; }).join('');
  $('invItemSel').innerHTML = '<option value="">-- Select Item --</option>' + state.items.map(function(i) { return '<option value="' + i.id + '">' + i.name + '</option>'; }).join('');
  $('invAreaBox').classList.add('hidden');
  $('invQtyBox').style.display = 'grid';
  $('invDiscount').value = '0';
  $('invPaid').value = '0';
  $('invStatus').value = 'unpaid';
  renderInvItemsTbl();
}

function setupInvEvents() {
  $('invCustSel').onchange = function() { var v = this.value; if (v === '__new__') { openCustModal(); this.value = ''; return; } var c = state.customers.filter(function(x) { return x.id === v; })[0]; if (c) $('invCustName').value = c.name; };
  $('invItemSel').onchange = function() { var id = this.value; if (!id) { $('invAreaBox').classList.add('hidden'); return; } var item = state.items.filter(function(i) { return i.id === id; })[0]; if (!item) return; if (item.calcType === 'area') { $('invAreaBox').classList.remove('hidden'); $('invQtyBox').style.display = 'none'; $('invAreaPrice').value = item.price; } else { $('invAreaBox').classList.add('hidden'); $('invQtyBox').style.display = 'grid'; $('invPrice').value = item.price; } };
  ['invHeight', 'invWidth', 'invAreaPrice'].forEach(function(id) { $(id).oninput = function() { var h = parseFloat($('invHeight').value) || 0; var w = parseFloat($('invWidth').value) || 0; var p = parseFloat($('invAreaPrice').value) || 0; $('invAreaResult').innerHTML = 'Total: <span style="color:#e01515">' + (h*w).toFixed(2) + ' sqft</span> = ' + money(h*w*p); }; });
  $('invAddBtn').onclick = addInvItem;
  $('invSaveBtn').onclick = saveInv;
  $('invDiscount').oninput = renderInvItemsTbl;
  $('invStatus').onchange = function() { var sub = invItems.reduce(function(s, it) { return s + it.total; }, 0); var disc = parseFloat($('invDiscount').value) || 0; var tot = Math.max(0, sub - disc); if (this.value === 'paid') $('invPaid').value = tot; if (this.value === 'unpaid') $('invPaid').value = 0; };
}

function addInvItem() {
  var id = $('invItemSel').value;
  if (!id) { toast('Select item', 'error'); return; }
  var item = state.items.filter(function(i) { return i.id === id; })[0];
  if (!item) return;
  var qty = 1, price = 0, details = '';
  if (item.calcType === 'area') { var h = parseFloat($('invHeight').value) || 0; var w = parseFloat($('invWidth').value) || 0; if (h <= 0 || w <= 0) { toast('Enter H & W', 'error'); return; } qty = h * w; price = parseFloat($('invAreaPrice').value) || 0; details = h + 'ft × ' + w + 'ft = ' + qty.toFixed(2) + ' sqft'; }
  else { qty = parseFloat($('invQty').value) || 0; price = parseFloat($('invPrice').value) || 0; if (qty <= 0 || price <= 0) { toast('Enter qty & price', 'error'); return; } details = qty + ' ' + item.unit; }
  invItems.push({ name: item.name, unit: item.unit, qty: qty, price: price, total: qty * price, details: details });
  renderInvItemsTbl();
  $('invItemSel').value = ''; $('invAreaBox').classList.add('hidden'); $('invQtyBox').style.display = 'grid';
}

function renderInvItemsTbl() {
  var body = document.querySelector('#invItemsTbl tbody');
  body.innerHTML = invItems.length ? invItems.map(function(it, i) { return '<tr><td style="padding:8px"><strong>' + it.name + '</strong><br><small>' + it.details + '</small></td><td style="padding:8px;text-align:right"><strong>' + money(it.total) + '</strong></td><td style="padding:8px;text-align:center"><button onclick="delInvItem(' + i + ')" style="background:#dc2626;color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px">🗑️</button></td></tr>'; }).join('') : '<tr><td colspan="3" style="text-align:center;color:#888;padding:16px">No items</td></tr>';
  var sub = invItems.reduce(function(s, it) { return s + it.total; }, 0);
  var tot = Math.max(0, sub - parseFloat($('invDiscount').value || 0));
  $('invSubtotal').textContent = money(sub);
  $('invTotal').textContent = money(tot);
}

function delInvItem(i) { invItems.splice(i, 1); renderInvItemsTbl(); }

async function saveInv() {
  if (invItems.length === 0) { toast('Add items first', 'error'); return; }
  var cid = $('invCustSel').value;
  if (!cid) { toast('Select customer', 'error'); return; }
  var c = state.customers.filter(function(x) { return x.id === cid; })[0];
  if (!c) return;
  var sub = invItems.reduce(function(s, it) { return s + it.total; }, 0);
  var disc = parseFloat($('invDiscount').value) || 0;
  var tot = Math.max(0, sub - disc);
  var paid = parseFloat($('invPaid').value) || 0;
  if (paid > tot) paid = tot;
  var num = state.business.prefix + '-' + String(state.invoices.length + 1).padStart(4, '0');
  var inv = { id: gid(), number: num, date: today(), customerId: c.id, customerName: c.name, phone: c.phone, items: invItems, subtotal: sub, discount: disc, total: tot, paid: paid, due: tot - paid, status: tot - paid <= 0 ? 'paid' : 'partial' };
  state.invoices.push(inv);
  save();
  if (GOOGLE_SCRIPT_URL) await cloudSave('invoices', inv);
  toast('Invoice ' + num + ' saved!' + (GOOGLE_SCRIPT_URL ? ' ☁️' : ''), 'success');
  printBill('INVOICE ' + num, inv);
  invItems = []; renderNewInv(); nav('invoices');
}

// RECEIVE PAYMENTS
function renderPayPage() {
  var pendingCusts = {};
  state.invoices.forEach(function(i) { if (i.customerId && Number(i.due) > 0) { if (!pendingCusts[i.customerId]) pendingCusts[i.customerId] = { name: i.customerName, phone: i.phone, due: 0 }; pendingCusts[i.customerId].due += Number(i.due); } });
  $('payCustSel').innerHTML = '<option value="">-- Select Customer --</option>' + Object.keys(pendingCusts).map(function(id) { return '<option value="' + id + '">' + pendingCusts[id].name + ' - Due: ' + money(pendingCusts[id].due) + '</option>'; }).join('');
  $('payCustInfo').classList.add('hidden');
}

$('payCustSel').onchange = function() {
  var cid = this.value;
  if (!cid) { $('payCustInfo').classList.add('hidden'); return; }
  var custInvs = state.invoices.filter(function(i) { return i.customerId === cid && Number(i.due) > 0; });
  var due = custInvs.reduce(function(s, i) { return s + Number(i.due); }, 0);
  $('payPending').textContent = money(due);
  $('payAmount').value = due;
  $('payCustInfo').classList.remove('hidden');
};

$('payReceiveBtn').onclick = async function() {
  var cid = $('payCustSel').value;
  if (!cid) { toast('Select customer', 'error'); return; }
  var amount = parseFloat($('payAmount').value) || 0;
  if (amount <= 0) { toast('Enter amount', 'error'); return; }
  var custInvs = state.invoices.filter(function(i) { return i.customerId === cid && Number(i.due) > 0; });
  var cust = state.customers.filter(function(c) { return c.id === cid; })[0];
  if (!cust) return;
  var remaining = amount;
  custInvs.forEach(function(inv) { if (remaining > 0) { var pay = Math.min(remaining, inv.due); inv.paid += pay; inv.due -= pay; inv.status = inv.due <= 0 ? 'paid' : 'partial'; state.payments.push({ id: gid(), date: today(), invoiceId: inv.id, invoiceNumber: inv.number, customerName: cust.name, amount: pay, method: $('payMethod').value }); remaining -= pay; } });
  save();
  if (GOOGLE_SCRIPT_URL) await cloudSave('invoices', state.invoices[state.invoices.length - 1]);
  toast('Payment received!', 'success');
  renderPayPage();
};

// CUSTOMERS
function renderCust() {
  var search = ($('custSearch').value || '').toLowerCase();
  var list = state.customers.filter(function(c) { return !search || c.name.toLowerCase().indexOf(search) >= 0; });
  var body = document.querySelector('#custTbl tbody');
  body.innerHTML = list.length ? list.map(function(c) {
    var due = state.invoices.filter(function(i) { return i.customerId === c.id; }).reduce(function(s, i) { return s + Number(i.due || 0); }, 0);
    return '<tr><td style="padding:8px"><strong>' + c.name + '</strong></td><td style="padding:8px">' + (c.phone || '-') + '</td><td style="padding:8px;text-align:right">' + (due > 0 ? '<span style="color:#dc2626">' + money(due) + '</span>' : '-') + '</td><td style="padding:8px"><button onclick="editCust(\'' + c.id + '\')" style="background:#f59e0b;color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px">✏️</button> ' + (isAdmin() ? '<button onclick="delCust(\'' + c.id + '\')" style="background:#dc2626;color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px">🗑️</button>' : '') + '</td></tr>';
  }).join('') : '<tr><td colspan="4" style="text-align:center;color:#888;padding:20px">No customers</td></tr>';
}

async function delCust(id) { if (!confirm('Delete?')) return; state.customers = state.customers.filter(function(c) { return c.id !== id; }); save(); if (GOOGLE_SCRIPT_URL) await cloudDelete('customers', id); renderCust(); }

function openCustModal(c) {
  $('modalTitle').textContent = c ? 'Edit Customer' : 'Add Customer';
  $('modalBody').innerHTML = '<label>Name *</label><input type="text" id="cmName" value="' + (c ? c.name : '') + '"><label>Phone</label><input type="text" id="cmPhone" value="' + (c ? (c.phone || '') : '') + '"><label>Address</label><input type="text" id="cmAddress" value="' + (c ? (c.address || '') : '') + '"><button onclick="saveCust()" class="btn btn-primary btn-block" style="margin-top:10px">💾 Save</button>';
  $('modal').style.display = 'flex';
}

async function saveCust() {
  var name = $('cmName').value.trim();
  if (!name) { toast('Name required', 'error'); return; }
  var data = { id: editId || gid(), name: name, phone: $('cmPhone').value.trim(), address: $('cmAddress').value.trim() };
  if (editId) { for (var i = 0; i < state.customers.length; i++) if (state.customers[i].id === editId) { state.customers[i] = data; break; } }
  else { state.customers.push(data); }
  save();
  if (GOOGLE_SCRIPT_URL) await cloudSave('customers', data);
  $('modal').style.display = 'none';
  toast('Saved!' + (GOOGLE_SCRIPT_URL ? ' ☁️' : ''), 'success');
  if (document.getElementById('page-customers').classList.contains('active')) renderCust();
}

function editCust(id) {
  var c = state.customers.filter(function(x) { return x.id === id; })[0];
  if (c) openCustModal(c);
}

// ITEMS
function renderItems() {
  var body = document.querySelector('#itemsTbl tbody');
  body.innerHTML = state.items.length ? state.items.map(function(i) { return '<tr><td style="padding:8px"><strong>' + i.name + '</strong></td><td style="padding:8px">' + i.unit + '</td><td style="padding:8px;text-align:right">' + money(i.price) + '</td><td style="padding:8px"><button onclick="editItem(\'' + i.id + '\')" style="background:#f59e0b;color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px">✏️</button> ' + (isAdmin() ? '<button onclick="delItem(\'' + i.id + '\')" style="background:#dc2626;color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px">🗑️</button>' : '') + '</td></tr>'; }).join('') : '<tr><td colspan="4" style="text-align:center;color:#888;padding:20px">No items</td></tr>';
}

async function delItem(id) { if (!confirm('Delete?')) return; state.items = state.items.filter(function(i) { return i.id !== id; }); save(); if (GOOGLE_SCRIPT_URL) await cloudDelete('items', id); renderItems(); }

function openItemModal(i) {
  $('modalTitle').textContent = i ? 'Edit Item' : 'Add Item';
  $('modalBody').innerHTML = '<label>Name *</label><input type="text" id="imName" value="' + (i ? i.name : '') + '"><label>Category</label><input type="text" id="imCat" value="' + (i ? i.category : 'Service') + '"><label>Type</label><select id="imType"><option value="area"' + (i && i.calcType === 'area' ? ' selected' : '') + '>Area</option><option value="quantity"' + (i && i.calcType === 'quantity' ? ' selected' : '') + '>Qty</option><option value="job"' + (i && i.calcType === 'job' ? ' selected' : '') + '>Job</option></select><label>Unit</label><select id="imUnit"><option value="sqft">sqft</option><option value="qty">qty</option><option value="page">page</option><option value="job">job</option></select><label>Price</label><input type="number" id="imPrice" value="' + (i ? i.price : 0) + '"><button onclick="saveItem()" class="btn btn-primary btn-block" style="margin-top:10px">💾 Save</button>';
  $('modal').style.display = 'flex';
}

async function saveItem() {
  var name = $('imName').value.trim();
  if (!name) { toast('Name required', 'error'); return; }
  var data = { id: editId || gid(), name: name, category: $('imCat').value, calcType: $('imType').value, unit: $('imUnit').value, price: parseFloat($('imPrice').value) || 0 };
  if (editId) { for (var i = 0; i < state.items.length; i++) if (state.items[i].id === editId) { state.items[i] = data; break; } }
  else { state.items.push(data); }
  save();
  if (GOOGLE_SCRIPT_URL) await cloudSave('items', data);
  $('modal').style.display = 'none';
  toast('Saved!' + (GOOGLE_SCRIPT_URL ? ' ☁️' : ''), 'success');
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
  body.innerHTML = list.length ? list.map(function(e) { return '<tr><td style="padding:8px">' + fdate(e.date) + '</td><td style="padding:8px">' + e.category + '</td><td style="padding:8px;text-align:right"><strong style="color:#dc2626">' + money(e.amount) + '</strong></td><td style="padding:8px"><button onclick="editExp(\'' + e.id + '\')" style="background:#f59e0b;color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px">✏️</button> ' + (isAdmin() ? '<button onclick="delExp(\'' + e.id + '\')" style="background:#dc2626;color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px">🗑️</button>' : '') + '</td></tr>'; }).join('') : '<tr><td colspan="4" style="text-align:center;color:#888;padding:20px">No expenses</td></tr>';
}

async function delExp(id) { if (!confirm('Delete?')) return; state.expenses = state.expenses.filter(function(e) { return e.id !== id; }); save(); if (GOOGLE_SCRIPT_URL) await cloudDelete('expenses', id); renderExp(); }

function openExpModal() {
  $('modalTitle').textContent = 'Add Expense';
  $('modalBody').innerHTML = '<label>Date</label><input type="date" id="exDate" value="' + today() + '"><label>Amount *</label><input type="number" id="exAmount" min="0" step="0.01"><label>Category</label><select id="exCat"><option>Materials</option><option>Ink/Toner</option><option>Paper</option><option>Rent</option><option>Utilities</option><option>Salary</option><option>Vendor Payment</option><option>Other</option></select><label>Description</label><input type="text" id="exDesc"><button onclick="saveExp()" class="btn btn-primary btn-block" style="margin-top:10px">💾 Save</button>';
  $('modal').style.display = 'flex';
}

async function saveExp() {
  var amt = parseFloat($('exAmount').value) || 0;
  if (amt <= 0) { toast('Enter amount', 'error'); return; }
  var data = { id: gid(), date: $('exDate').value || today(), amount: amt, category: $('exCat').value, description: $('exDesc').value.trim() };
  state.expenses.push(data);
  save();
  if (GOOGLE_SCRIPT_URL) await cloudSave('expenses', data);
  $('modal').style.display = 'none';
  toast('Saved!' + (GOOGLE_SCRIPT_URL ? ' ☁️' : ''), 'success');
  if (document.getElementById('page-expenses').classList.contains('active')) renderExp();
}

function editExp(id) {
  var e = state.expenses.filter(function(x) { return x.id === id; })[0];
  if (e) { $('modalTitle').textContent = 'Edit Expense'; $('modalBody').innerHTML = '<label>Date</label><input type="date" id="exDate" value="' + e.date + '"><label>Amount *</label><input type="number" id="exAmount" value="' + e.amount + '" min="0" step="0.01"><label>Category</label><select id="exCat"><option>Materials</option><option>Ink/Toner</option><option>Paper</option><option>Rent</option><option>Utilities</option><option>Salary</option><option>Vendor Payment</option><option>Other</option></select><label>Description</label><input type="text" id="exDesc" value="' + (e.description || '') + '"><button onclick="saveExpEdit(\'' + e.id + '\')" class="btn btn-primary btn-block" style="margin-top:10px">💾 Save</button>'; $('modal').style.display = 'flex'; }
}

async function saveExpEdit(id) {
  var amt = parseFloat($('exAmount').value) || 0;
  var data = { id: id, date: $('exDate').value, amount: amt, category: $('exCat').value, description: $('exDesc').value.trim() };
  for (var i = 0; i < state.expenses.length; i++) if (state.expenses[i].id === id) { state.expenses[i] = data; break; }
  save();
  if (GOOGLE_SCRIPT_URL) await cloudSave('expenses', data);
  $('modal').style.display = 'none';
  toast('Saved!', 'success');
  renderExp();
}

// VENDORS
function getVendorBalance(vendorId) {
  var balance = 0;
  state.vendorTxns.filter(function(t) { return t.vendorId === vendorId; }).forEach(function(t) { if (t.type === 'purchase') balance += Number(t.amount); else balance -= Number(t.amount); });
  return balance;
}

function renderVendors() {
  var body = document.querySelector('#vendorTbl tbody');
  body.innerHTML = state.vendors.length ? state.vendors.map(function(v) { var bal = getVendorBalance(v.id); return '<tr><td style="padding:8px"><strong>' + v.name + '</strong></td><td style="padding:8px">' + (v.phone || '-') + '</td><td style="padding:8px;text-align:right"><strong>' + money(Math.abs(bal)) + '</strong></td><td style="padding:8px">' + (isAdmin() ? '<button onclick="delVendor(\'' + v.id + '\')" style="background:#dc2626;color:#fff;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px">🗑️</button>' : '-') + '</td></tr>'; }).join('') : '<tr><td colspan="4" style="text-align:center;color:#888;padding:20px">No vendors</td></tr>';
}

async function delVendor(id) { if (!confirm('Delete?')) return; state.vendors = state.vendors.filter(function(v) { return v.id !== id; }); state.vendorTxns = state.vendorTxns.filter(function(t) { return t.vendorId !== id; }); save(); if (GOOGLE_SCRIPT_URL) await cloudDelete('vendors', id); renderVendors(); }

function openVendorModal() {
  $('modalTitle').textContent = 'Add Vendor';
  $('modalBody').innerHTML = '<label>Name *</label><input type="text" id="vmName"><label>Phone</label><input type="text" id="vmPhone"><label>Address</label><input type="text" id="vmAddress"><button onclick="saveVendor()" class="btn btn-primary btn-block" style="margin-top:10px">💾 Save</button>';
  $('modal').style.display = 'flex';
}

async function saveVendor() {
  var name = $('vmName').value.trim();
  if (!name) { toast('Name required', 'error'); return; }
  var data = { id: gid(), name: name, phone: $('vmPhone').value.trim(), address: $('vmAddress').value.trim() };
  state.vendors.push(data);
  save();
  if (GOOGLE_SCRIPT_URL) await cloudSave('vendors', data);
  $('modal').style.display = 'none';
  toast('Saved!', 'success');
  if (document.getElementById('page-vendors').classList.contains('active')) renderVendors();
}

// VENDOR PAYMENTS
function renderVendorPay() {
  $('vpVendorSel').innerHTML = '<option value="">-- Select Vendor --</option>' + state.vendors.map(function(v) { return '<option value="' + v.id + '">' + v.name + '</option>'; }).join('');
  $('vpDate').value = today();
  $('vpVendorInfo').classList.add('hidden');
}

$('vpVendorSel').onchange = function() {
  var vid = this.value;
  if (!vid) { $('vpVendorInfo').classList.add('hidden'); return; }
  var total = 0, paid = 0;
  state.vendorTxns.filter(function(t) { return t.vendorId === vid; }).forEach(function(t) { if (t.type === 'purchase') total += Number(t.amount); else paid += Number(t.amount); });
  $('vpTotal').textContent = money(total);
  $('vpPaid').textContent = money(paid);
  $('vpPending').textContent = money(total - paid);
  $('vpVendorInfo').classList.remove('hidden');
  if (total - paid > 0) $('vpAmount').value = total - paid;
};

async function saveVP() {
  var vid = $('vpVendorSel').value;
  if (!vid) { toast('Select vendor', 'error'); return; }
  var v = state.vendors.filter(function(x) { return x.id === vid; })[0];
  var amt = parseFloat($('vpAmount').value) || 0;
  if (amt <= 0) { toast('Enter amount', 'error'); return; }
  var type = $('vpType').value;
  var data = { id: gid(), date: $('vpDate').value, vendorId: vid, vendorName: v.name, description: $('vpDesc').value, type: type, amount: amt, method: $('vpMethod').value };
  state.vendorTxns.push(data);
  if (type === 'payment') state.expenses.push({ id: gid(), date: data.date, amount: amt, category: 'Vendor Payment', description: 'Payment to ' + v.name });
  save();
  if (GOOGLE_SCRIPT_URL) { await cloudSave('vendorTxns', data); if (type === 'payment') await cloudSave('expenses', state.expenses[state.expenses.length - 1]); }
  toast('Saved!', 'success');
  $('vpVendorSel').onchange();
}

// SETTINGS
function saveSettings() {
  state.business.name = $('setName').value;
  state.business.phone = $('setPhone').value;
  state.business.email = $('setEmail').value;
  state.business.address = $('setAddress').value;
  save();
  toast('Saved!', 'success');
}

function applySettings() {
  $('setName').value = state.business.name;
  $('setPhone').value = state.business.phone;
  $('setEmail').value = state.business.email;
  $('setAddress').value = state.business.address;
  $('gScriptUrl').value = GOOGLE_SCRIPT_URL;
  var status = $('cloudStatusEl');
  if (status) {
    if (GOOGLE_SCRIPT_URL) {
      status.innerHTML = '<div style="background:#d1fae5;padding:12px;border-radius:6px;color:#065f46"><strong>✅ Cloud Sync Active</strong><br><small>URL: ' + GOOGLE_SCRIPT_URL.substring(0, 60) + '...<br>Auto-sync every 30 sec. Use "Sync Now" button below.</small></div>';
    } else {
      status.innerHTML = '<div style="background:#fef3c7;padding:10px;border-radius:6px;color:#92400e">⚠️ Setup Google Script URL below for Mobile+PC sync</div>';
    }
  }
  renderAutoBackups();
}

function saveScriptUrl() {
  GOOGLE_SCRIPT_URL = $('gScriptUrl').value.trim();
  if (GOOGLE_SCRIPT_URL) localStorage.setItem('dlm_gurl', GOOGLE_SCRIPT_URL);
  else localStorage.removeItem('dlm_gurl');
  toast('Cloud URL saved! Reloading...', 'success');
  setTimeout(function() { location.reload(); }, 800);
}

async function syncNow() {
  if (!GOOGLE_SCRIPT_URL) { toast('Setup Cloud URL first', 'error'); return; }
  toast('🔄 Syncing from cloud...', 'sync');
  await loadFromCloud(false);
}

async function pushAllToCloud() {
  if (!GOOGLE_SCRIPT_URL) { toast('Setup Cloud URL first', 'error'); return; }
  if (!confirm('Upload ALL your current data to Google Sheet?\n\nThis will overwrite cloud data for these records.')) return;
  toast('⬆️ Pushing data to cloud...', 'sync');
  var maps = [
    { key: 'customers', sheet: 'Customers' },
    { key: 'items', sheet: 'Items' },
    { key: 'invoices', sheet: 'Invoices' },
    { key: 'expenses', sheet: 'Expenses' },
    { key: 'vendors', sheet: 'Vendors' },
    { key: 'vendorTxns', sheet: 'VendorTxns' },
    { key: 'shopSales', sheet: 'ShopSales' }
  ];
  for (var i = 0; i < maps.length; i++) {
    var m = maps[i];
    var arr = state[m.key] || [];
    for (var j = 0; j < arr.length; j++) {
      await cloudSave(m.sheet, arr[j]);
    }
  }
  toast('✅ All data pushed to cloud!', 'success');
}

function clearAll() {
  if (!confirm('Delete ALL data?')) return;
  if (!confirm('Are you sure?')) return;
  localStorage.clear();
  location.reload();
}

// ==================== BACKUP SYSTEM ====================
function exportBackup() {
  var data = JSON.stringify(state, null, 2);
  var blob = new Blob([data], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'designline-backup-' + today() + '.json';
  a.click();
  URL.revokeObjectURL(url);
  toast('Backup downloaded!', 'success');
}

function importBackup() {
  $('importFile').click();
}

function handleImport(e) {
  var file = e.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    try {
      var data = JSON.parse(ev.target.result);
      if (data.business) state.business = data.business;
      if (data.customers) state.customers = data.customers;
      if (data.items) state.items = data.items;
      if (data.invoices) state.invoices = data.invoices;
      if (data.payments) state.payments = data.payments;
      if (data.expenses) state.expenses = data.expenses;
      if (data.vendors) state.vendors = data.vendors;
      if (data.vendorTxns) state.vendorTxns = data.vendorTxns;
      if (data.shopSales) state.shopSales = data.shopSales;
      save();
      toast('Backup restored! Reloading...', 'success');
      setTimeout(function() { location.reload(); }, 1000);
    } catch (err) {
      toast('Invalid backup file', 'error');
    }
  };
  reader.readAsText(file);
}

function createAutoBackup() {
  try {
    var backups = JSON.parse(localStorage.getItem('dlm_autobackups') || '[]');
    var snapshot = {
      timestamp: new Date().toISOString(),
      date: today(),
      time: now(),
      data: state
    };
    backups.unshift(snapshot);
    if (backups.length > 5) backups = backups.slice(0, 5);
    localStorage.setItem('dlm_autobackups', JSON.stringify(backups));
  } catch (e) {}
}

function autoSave() {
  save();
  if (Math.random() < 0.3) createAutoBackup();
}

function renderAutoBackups() {
  try {
    var backups = JSON.parse(localStorage.getItem('dlm_autobackups') || '[]');
    var html = '';
    if (backups.length === 0) {
      html = '<p style="text-align:center;color:#888;padding:12px;font-size:12px">No backups yet. Will auto-create on changes.</p>';
    } else {
      backups.forEach(function(b, i) {
        var dataSize = JSON.stringify(b.data).length;
        var sizeKb = (dataSize / 1024).toFixed(1);
        html += '<div style="background:#f5f5f5;padding:10px;border-radius:6px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">';
        html += '<div style="font-size:12px"><strong>📅 ' + b.date + ' ' + b.time + '</strong><br><span style="color:#666">' + sizeKb + ' KB</span></div>';
        html += '<div style="display:flex;gap:4px">';
        html += '<button onclick="restoreAutoBackup(' + i + ')" style="background:#16a34a;color:#fff;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;font-size:11px">↩️ Restore</button>';
        html += '<button onclick="downloadAutoBackup(' + i + ')" style="background:#2563eb;color:#fff;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;font-size:11px">⬇️</button>';
        html += '<button onclick="deleteAutoBackup(' + i + ')" style="background:#dc2626;color:#fff;border:none;padding:5px 10px;border-radius:4px;cursor:pointer;font-size:11px">🗑️</button>';
        html += '</div></div>';
      });
    }
    var el = $('autoBackupList');
    if (el) el.innerHTML = html;
  } catch (e) {}
}

function restoreAutoBackup(i) {
  if (!confirm('Restore this backup? Current data will be replaced.')) return;
  try {
    var backups = JSON.parse(localStorage.getItem('dlm_autobackups') || '[]');
    var snap = backups[i];
    if (!snap) return;
    var d = snap.data;
    if (d.business) state.business = d.business;
    if (d.customers) state.customers = d.customers;
    if (d.items) state.items = d.items;
    if (d.invoices) state.invoices = d.invoices;
    if (d.payments) state.payments = d.payments;
    if (d.expenses) state.expenses = d.expenses;
    if (d.vendors) state.vendors = d.vendors;
    if (d.vendorTxns) state.vendorTxns = d.vendorTxns;
    if (d.shopSales) state.shopSales = d.shopSales;
    save();
    toast('Backup restored!', 'success');
    setTimeout(function() { location.reload(); }, 800);
  } catch (e) { toast('Restore failed', 'error'); }
}

function downloadAutoBackup(i) {
  try {
    var backups = JSON.parse(localStorage.getItem('dlm_autobackups') || '[]');
    var snap = backups[i];
    if (!snap) return;
    var blob = new Blob([JSON.stringify(snap.data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'designline-autobackup-' + snap.date + '-' + i + '.json';
    a.click();
    URL.revokeObjectURL(url);
    toast('Downloaded!', 'success');
  } catch (e) {}
}

function deleteAutoBackup(i) {
  if (!confirm('Delete this backup?')) return;
  try {
    var backups = JSON.parse(localStorage.getItem('dlm_autobackups') || '[]');
    backups.splice(i, 1);
    localStorage.setItem('dlm_autobackups', JSON.stringify(backups));
    renderAutoBackups();
    toast('Deleted', 'success');
  } catch (e) {}
}

function printBill(title, data) {
  var itemsHtml = '';
  if (data.items) itemsHtml = data.items.map(function(it) { return '<tr><td style="padding:6px;border-bottom:1px solid #ddd">' + it.name + '<br><small>' + (it.details || '') + '</small></td><td style="padding:6px;text-align:center">' + it.qty + ' ' + it.unit + '</td><td style="padding:6px;text-align:right">' + money(it.price) + '</td><td style="padding:6px;text-align:right"><strong>' + money(it.total) + '</strong></td></tr>'; }).join('');
  var html = '<html><head><title>' + title + '</title><style>body{font-family:Arial;padding:20px;font-size:12px}.h{text-align:center;border-bottom:3px solid #e01515;padding-bottom:8px;margin-bottom:15px}.h h1{color:#e01515;margin:0;font-size:22px}.h p{margin:2px 0;font-size:11px}table{width:100%;border-collapse:collapse;margin:12px 0}th{background:#000;color:#fff;padding:6px;text-align:left;font-size:11px}.t{margin-top:15px;margin-left:auto;width:240px}.t .r{display:flex;justify-content:space-between;padding:3px 0;font-size:12px}.g{border-top:2px solid #000;margin-top:6px;padding-top:6px;font-size:14px;font-weight:bold;color:#e01515}.ft{text-align:center;margin-top:20px;font-size:10px;color:#666}</style></head><body><div class="h"><h1>' + state.business.name + '</h1><p>' + state.business.address + '</p><p>Phone: ' + state.business.phone + '</p></div><div style="display:flex;justify-content:space-between;margin-bottom:10px"><div><strong>Customer:</strong> ' + data.customerName + '<br>' + (data.phone || '') + '</div><div style="text-align:right"><strong>' + title + '</strong><br><strong>Date:</strong> ' + fdate(data.date) + '</div></div><table><thead><tr><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th></tr></thead><tbody>' + itemsHtml + '</tbody></table><div class="t"><div class="r g"><span>TOTAL:</span><span>' + money(data.total) + '</span></div><div class="r"><span>Paid:</span><span>' + money(data.paid || 0) + '</span></div><div class="r" style="color:#dc2626"><span>Due:</span><span>' + money(data.due || 0) + '</span></div></div><div class="ft">Thank you!</div></body></html>';
  var w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  setTimeout(function() { w.print(); }, 300);
}

// INIT
document.addEventListener('DOMContentLoaded', async function() {
  load();
  $('loginBtn').onclick = doLogin;
  var forgotLink = $('forgotPassLink'); if (forgotLink) forgotLink.onclick = function(e) { e.preventDefault(); forgotPassword(); };
  var changePassBtn = $('changePassBtn'); if (changePassBtn) changePassBtn.onclick = changePassword;
  $('loginPass').onkeypress = function(e) { if (e.key === 'Enter') doLogin(); };
  $('loginUser').onkeypress = function(e) { if (e.key === 'Enter') $('loginPass').focus(); };
  $('logoutBtn').onclick = doLogout;
  $('menuBtn').onclick = openSidebar;
  $('closeSidebar').onclick = closeSidebar;
  $('sidebarOverlay').onclick = closeSidebar;
  document.querySelectorAll('.nav-item').forEach(function(item) { item.onclick = function(e) { e.preventDefault(); nav(item.dataset.page); }; });
  $('addCustBtn2').onclick = function() { openCustModal(); };
  var addCustBtn1 = $('addCustBtn'); if (addCustBtn1) addCustBtn1.onclick = function() { openCustModal(); };
  $('addItemBtn').onclick = function() { openItemModal(); };
  $('addExpBtn').onclick = function() { openExpModal(); };
  $('addVendorBtn').onclick = function() { openVendorModal(); };
  $('addShopSaleBtn').onclick = function() { openShopSaleModal(); };
  $('shopSaleDate').onchange = renderShopDaily;
  $('shopSaleSearch').oninput = renderShopDaily;
  $('invSearch').oninput = renderInv;
  $('custSearch').oninput = renderCust;
  $('setSaveBtn').onclick = saveSettings;
  $('saveScriptUrl').onclick = saveScriptUrl;
  var syncBtn = $('syncNowBtn'); if (syncBtn) syncBtn.onclick = syncNow;
  var pushBtn = $('pushAllBtn'); if (pushBtn) pushBtn.onclick = pushAllToCloud;
  $('clearBtn').onclick = clearAll;
  $('exportBtn').onclick = exportBackup;
  $('importBtn').onclick = importBackup;
  $('importFile').onchange = handleImport;
  $('createBackupBtn').onclick = function() { createAutoBackup(); renderAutoBackups(); toast('Backup created!', 'success'); };
  $('modalClose').onclick = function() { $('modal').style.display = 'none'; };
  $('vpSaveBtn').onclick = saveVP;
  document.querySelectorAll('.yearChk').forEach(function(cb) { cb.onchange = function() {
    var checked = document.querySelectorAll('.yearChk:checked').length;
    if (checked > 3) { this.checked = false; toast('Max 3 years', 'error'); return; }
    renderYearlyChart();
  }; });
  setupQBEvents();
  setupInvEvents();
  if (GOOGLE_SCRIPT_URL) { await loadFromCloud(true); }
  // Real-time sync every 5 seconds when app is active
  setInterval(function() { if (GOOGLE_SCRIPT_URL && currentUser && !document.hidden) loadFromCloud(true); }, 5000);
  // Also sync when user returns to the tab/window
  document.addEventListener('visibilitychange', function() { if (!document.hidden && GOOGLE_SCRIPT_URL && currentUser) { loadFromCloud(true); toast('☁️ Auto-synced!', 'sync'); } });
  window.addEventListener('focus', function() { if (GOOGLE_SCRIPT_URL && currentUser) loadFromCloud(true); });
});
