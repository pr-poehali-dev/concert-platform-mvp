// Telegram WebApp API
const tg = window.Telegram?.WebApp || {
  initData: '',
  initDataUnsafe: { user: { id: 1, first_name: 'Demo', last_name: 'User' } },
  MainButton: { setText: () => {}, show: () => {}, hide: () => {}, onClick: () => {} },
  BackButton: { show: () => {}, hide: () => {}, onClick: () => {} },
  HapticFeedback: { impactOccurred: () => {}, notificationOccurred: () => {} },
  expand: () => {},
  close: () => {},
  ready: () => {},
  colorScheme: 'dark',
};

tg.ready?.();
tg.expand?.();

// Storage helpers
const store = {
  get: (key, def = null) => {
    try { return JSON.parse(localStorage.getItem('crm_' + key)) ?? def; }
    catch { return def; }
  },
  set: (key, val) => localStorage.setItem('crm_' + key, JSON.stringify(val)),
  del: (key) => localStorage.removeItem('crm_' + key),
};

// ID generator
const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// Format helpers
const fmt = {
  money: (n) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n),
  date: (d) => d ? new Date(d).toLocaleDateString('ru-RU') : '—',
  dateShort: (d) => d ? new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' }) : '—',
  dateInput: (d) => d ? new Date(d).toISOString().split('T')[0] : '',
  num: (n) => new Intl.NumberFormat('ru-RU').format(n),
  percent: (n) => Math.round(n) + '%',
  relDate: (d) => {
    if (!d) return '—';
    const diff = Math.round((new Date(d) - Date.now()) / 86400000);
    if (diff === 0) return 'Сегодня';
    if (diff === 1) return 'Завтра';
    if (diff === -1) return 'Вчера';
    if (diff < 0) return `${Math.abs(diff)} дн. назад`;
    return `Через ${diff} дн.`;
  },
  initials: (name) => name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?',
};

// Toast notifications
const toast = (() => {
  let container;
  const ensure = () => {
    if (!container) {
      container = document.createElement('div');
      container.style.cssText = 'position:fixed;top:16px;right:16px;z-index:9999;display:flex;flex-direction:column;gap:8px;max-width:320px;';
      document.body.appendChild(container);
    }
  };
  const show = (msg, type = 'info', duration = 3000) => {
    ensure();
    tg.HapticFeedback?.impactOccurred(type === 'error' ? 'heavy' : 'light');
    const colors = { info: '#a855f7', success: '#4ade80', error: '#f43f5e', warning: '#f59e0b' };
    const el = document.createElement('div');
    el.style.cssText = `background:#161b22;border:1px solid ${colors[type]};color:#f0f6fc;padding:12px 16px;border-radius:10px;font-size:14px;box-shadow:0 4px 20px rgba(0,0,0,0.5);animation:slideIn 0.3s ease;position:relative;`;
    el.innerHTML = `<span style="color:${colors[type]};margin-right:8px;">${{ info: 'ℹ', success: '✓', error: '✗', warning: '⚠' }[type]}</span>${msg}`;
    container.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(20px)'; el.style.transition = '0.3s'; setTimeout(() => el.remove(), 300); }, duration);
  };
  return { info: (m) => show(m, 'info'), success: (m) => show(m, 'success'), error: (m) => show(m, 'error'), warning: (m) => show(m, 'warning') };
})();

// API layer with mock fallback
const api = {
  async get(entity) {
    if (CRM_CONFIG.useMock) {
      const stored = store.get(entity);
      if (stored) return stored;
      try {
        const r = await fetch(`/crm/data/${entity}.json`);
        if (r.ok) { const d = await r.json(); store.set(entity, d); return d; }
      } catch {}
      return [];
    }
    const r = await fetch(CRM_CONFIG.endpoints[entity], { headers: { 'X-Init-Data': tg.initData } });
    return r.json();
  },
  async save(entity, items) {
    store.set(entity, items);
    if (!CRM_CONFIG.useMock) {
      await fetch(CRM_CONFIG.endpoints[entity], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Init-Data': tg.initData },
        body: JSON.stringify(items),
      });
    }
  },
  async add(entity, item) {
    const items = await api.get(entity);
    const newItem = { id: genId(), createdAt: new Date().toISOString(), ...item };
    items.push(newItem);
    await api.save(entity, items);
    return newItem;
  },
  async update(entity, id, patch) {
    const items = await api.get(entity);
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) throw new Error('Not found');
    items[idx] = { ...items[idx], ...patch, updatedAt: new Date().toISOString() };
    await api.save(entity, items);
    return items[idx];
  },
  async remove(entity, id) {
    const items = await api.get(entity);
    await api.save(entity, items.filter(i => i.id !== id));
  },
};

// Debounce
const debounce = (fn, ms = 300) => {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
};

// Navigate between CRM pages
const navigate = (page) => {
  if (page === 'back' || !page) { history.back(); return; }
  const base = location.pathname.includes('/crm/') ? '' : '/crm/';
  location.href = base + page + '.html';
};

// Inject global styles once
(function injectStyles() {
  if (document.getElementById('crm-global-styles')) return;
  const s = document.createElement('style');
  s.id = 'crm-global-styles';
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0d1117; --card: #161b22; --card2: #1c2333; --border: #21262d;
      --text: #f0f6fc; --muted: #8b949e; --primary: #a855f7; --accent: #22d3ee;
      --success: #4ade80; --danger: #f43f5e; --warning: #f59e0b;
      --radius: 10px; --radius-sm: 6px;
    }
    body { background: var(--bg); color: var(--text); font-family: 'Golos Text', sans-serif; min-height: 100vh; overflow-x: hidden; }
    @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:none; } }
    @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
    @keyframes spin { to { transform: rotate(360deg); } }
    .crm-page { padding: 16px; max-width: 1200px; margin: 0 auto; animation: fadeIn 0.3s ease; }
    .crm-nav { display:flex; gap:8px; align-items:center; padding:12px 16px; background:var(--card); border-bottom:1px solid var(--border); position:sticky; top:0; z-index:100; }
    .crm-nav-title { font-weight:700; font-size:16px; color:var(--text); flex:1; }
    .crm-nav-back { background:none; border:none; color:var(--muted); cursor:pointer; font-size:20px; padding:4px 8px; border-radius:var(--radius-sm); transition:color 0.2s; }
    .crm-nav-back:hover { color:var(--text); }
    .btn { display:inline-flex; align-items:center; gap:6px; padding:8px 16px; border-radius:var(--radius-sm); border:none; cursor:pointer; font-size:14px; font-weight:500; transition:all 0.2s; font-family:inherit; }
    .btn-primary { background:var(--primary); color:#fff; }
    .btn-primary:hover { background:#9333ea; }
    .btn-secondary { background:var(--card2); color:var(--text); border:1px solid var(--border); }
    .btn-secondary:hover { border-color:var(--primary); }
    .btn-danger { background:var(--danger); color:#fff; }
    .btn-sm { padding:5px 10px; font-size:12px; }
    .btn-icon { padding:7px; border-radius:var(--radius-sm); }
    .card { background:var(--card); border:1px solid var(--border); border-radius:var(--radius); padding:16px; }
    .badge { display:inline-flex; align-items:center; padding:2px 8px; border-radius:20px; font-size:11px; font-weight:600; }
    .input { background:var(--card2); border:1px solid var(--border); color:var(--text); border-radius:var(--radius-sm); padding:8px 12px; font-size:14px; font-family:inherit; width:100%; transition:border-color 0.2s; outline:none; }
    .input:focus { border-color:var(--primary); }
    select.input option { background:var(--card); }
    .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .grid-3 { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
    .grid-4 { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
    @media(max-width:640px) { .grid-2,.grid-3,.grid-4 { grid-template-columns:1fr; } }
    @media(max-width:900px) { .grid-3 { grid-template-columns:1fr 1fr; } .grid-4 { grid-template-columns:1fr 1fr; } }
    .flex { display:flex; } .flex-1 { flex:1; } .gap-8 { gap:8px; } .gap-12 { gap:12px; } .gap-16 { gap:16px; }
    .items-center { align-items:center; } .justify-between { justify-content:space-between; }
    .mt-8 { margin-top:8px; } .mt-12 { margin-top:12px; } .mt-16 { margin-top:16px; }
    .text-muted { color:var(--muted); } .text-sm { font-size:12px; } .text-lg { font-size:18px; font-weight:700; }
    .text-primary { color:var(--primary); } .text-success { color:var(--success); } .text-danger { color:var(--danger); }
    .avatar { width:32px; height:32px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; flex-shrink:0; }
    .progress-bar { height:6px; background:var(--border); border-radius:3px; overflow:hidden; }
    .progress-fill { height:100%; border-radius:3px; transition:width 0.5s ease; }
    .spinner { width:24px; height:24px; border:3px solid var(--border); border-top-color:var(--primary); border-radius:50%; animation:spin 0.8s linear infinite; }
    .empty-state { text-align:center; padding:48px 16px; color:var(--muted); }
    .empty-state .icon { font-size:48px; margin-bottom:12px; }
    .search-wrap { position:relative; }
    .search-wrap .search-icon { position:absolute; left:10px; top:50%; transform:translateY(-50%); color:var(--muted); font-size:16px; }
    .search-wrap .input { padding-left:34px; }
    .tab-bar { display:flex; gap:4px; background:var(--card2); border-radius:var(--radius-sm); padding:4px; }
    .tab-btn { flex:1; padding:6px 12px; border-radius:4px; border:none; background:none; color:var(--muted); cursor:pointer; font-size:13px; font-family:inherit; transition:all 0.2s; }
    .tab-btn.active { background:var(--primary); color:#fff; }
    .section-title { font-size:14px; font-weight:600; color:var(--muted); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:12px; }
    .divider { height:1px; background:var(--border); margin:16px 0; }
    .crm-bottom-nav { display:flex; position:fixed; bottom:0; left:0; right:0; background:var(--card); border-top:1px solid var(--border); z-index:100; }
    .crm-bottom-nav a { flex:1; display:flex; flex-direction:column; align-items:center; padding:8px 4px 6px; gap:2px; text-decoration:none; color:var(--muted); font-size:10px; transition:color 0.2s; }
    .crm-bottom-nav a.active, .crm-bottom-nav a:hover { color:var(--primary); }
    .crm-bottom-nav a .nav-icon { font-size:20px; }
    .pb-nav { padding-bottom:72px; }
    .kpi-card { background:var(--card); border:1px solid var(--border); border-radius:var(--radius); padding:16px; position:relative; overflow:hidden; }
    .kpi-card::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; }
    .kpi-card.purple::before { background:var(--primary); }
    .kpi-card.cyan::before { background:var(--accent); }
    .kpi-card.green::before { background:var(--success); }
    .kpi-card.red::before { background:var(--danger); }
    .kpi-value { font-size:24px; font-weight:700; margin:4px 0; }
    .kpi-label { font-size:12px; color:var(--muted); }
    .kpi-delta { font-size:11px; margin-top:4px; }
    .tag { display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:20px; font-size:11px; font-weight:500; }
  `;
  document.head.appendChild(s);
})();
