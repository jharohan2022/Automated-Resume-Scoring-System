/* ============================================================
   RecruitIQ — Global Utilities JS
   Shared across all pages
   ============================================================ */

/* ── Toast Notifications ── */
const Toast = {
  container: null,

  init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },

  show(message, type = 'success', duration = 3500) {
    this.init();
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span class="toast-icon">${icons[type] || '✅'}</span><span>${message}</span>`;
    this.container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(20px)';
      el.style.transition = 'all 0.3s ease';
      setTimeout(() => el.remove(), 350);
    }, duration);
  },

  success(msg) { this.show(msg, 'success'); },
  error(msg)   { this.show(msg, 'error'); },
  info(msg)    { this.show(msg, 'info'); },
  warning(msg) { this.show(msg, 'warning'); },
};

/* ── Modal Helpers ── */
const Modal = {
  open(id)  {
    const el = document.getElementById(id);
    if (el) el.classList.add('open');
  },
  close(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');
  },
  toggle(id) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('open');
  },
  closeOnOverlay(id) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', e => { if (e.target === el) this.close(id); });
  },
};

/* ── Drawer Helpers ── */
const Drawer = {
  open(id) {
    document.getElementById(id + '-overlay')?.classList.add('open');
    document.getElementById(id)?.classList.add('open');
  },
  close(id) {
    document.getElementById(id + '-overlay')?.classList.remove('open');
    document.getElementById(id)?.classList.remove('open');
  },
};

/* ── Filter Chips ── */
function initFilterChips(selector = '.f-chip') {
  document.querySelectorAll(selector).forEach(chip => {
    chip.addEventListener('click', function () {
      const group = this.dataset.group || 'default';
      document.querySelectorAll(`${selector}[data-group="${group}"], ${selector}:not([data-group])`).forEach(c => {
        if (!this.dataset.group || c.dataset.group === group) c.classList.remove('active');
      });
      this.classList.add('active');
    });
  });
}

/* ── Sidebar Nav Active State ── */
function setActiveNav() {
  const path = window.location.pathname.split('/').pop();
  document.querySelectorAll('.nav-item').forEach(item => {
    const href = item.getAttribute('href') || '';
    if (href.includes(path) || (path === '' && href.includes('dashboard'))) {
      item.classList.add('active');
    }
  });
}

/* ── Number Counter Animation ── */
function animateCounter(el, target, duration = 1500) {
  const start = 0;
  const step = (timestamp) => {
    if (!el._startTime) el._startTime = timestamp;
    const progress = Math.min((timestamp - el._startTime) / duration, 1);
    const value = Math.floor(progress * target);
    el.textContent = value.toLocaleString();
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target.toLocaleString();
  };
  requestAnimationFrame(step);
}

/* ── Intersection Observer for Animations ── */
function observeElements(selector, className = 'visible') {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add(className);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll(selector).forEach(el => observer.observe(el));
}

/* ── Scroll-aware Navbar ── */
function initScrollNav(selector = '.nav') {
  const nav = document.querySelector(selector);
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  });
}

/* ── Typing Animation ── */
function typewriter(el, texts, speed = 80, pause = 2200) {
  let ti = 0, ci = 0, deleting = false;
  function tick() {
    const text = texts[ti];
    el.textContent = deleting ? text.slice(0, ci--) : text.slice(0, ci++);
    if (!deleting && ci > text.length)     { deleting = true;  setTimeout(tick, pause); return; }
    if (deleting && ci < 0)               { deleting = false; ti = (ti + 1) % texts.length; }
    setTimeout(tick, deleting ? speed / 2 : speed);
  }
  tick();
}

/* ── Local Storage Helpers ── */
const Store = {
  get(key, fallback = null) {
    try { return JSON.parse(localStorage.getItem('riq_' + key)) ?? fallback; }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('riq_' + key, JSON.stringify(value)); }
    catch {}
  },
  remove(key) { localStorage.removeItem('riq_' + key); },
};

/* ── API Helper ── */
const API = {
  base: '/api/v1',

  async request(method, path, body = null) {
    const token = Store.get('token');
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(this.base + path, opts);
    if (res.status === 401) { window.location.href = '/login'; return; }
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Request failed');
    return data;
  },

  get(path)           { return this.request('GET',    path); },
  post(path, body)    { return this.request('POST',   path, body); },
  put(path, body)     { return this.request('PUT',    path, body); },
  delete(path)        { return this.request('DELETE', path); },

  async upload(path, formData) {
    const token = Store.get('token');
    const res = await fetch(this.base + path, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Upload failed');
    return data;
  },
};

/* ── Format Helpers ── */
const Format = {
  number:  (n) => Number(n).toLocaleString(),
  percent: (n) => `${Math.round(n)}%`,
  date:    (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  timeAgo: (d) => {
    const sec = Math.floor((Date.now() - new Date(d)) / 1000);
    if (sec < 60)   return 'just now';
    if (sec < 3600) return `${Math.floor(sec/60)}m ago`;
    if (sec < 86400)return `${Math.floor(sec/3600)}h ago`;
    return `${Math.floor(sec/86400)}d ago`;
  },
  fileSize: (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024**2) return (bytes/1024).toFixed(1) + ' KB';
    return (bytes/1024**2).toFixed(1) + ' MB';
  },
};

/* ── Score Color ── */
function scoreColor(pct) {
  if (pct >= 80) return 'var(--accent)';
  if (pct >= 60) return 'var(--accent2)';
  if (pct >= 40) return 'var(--accent4)';
  return 'var(--accent3)';
}
function scoreClass(pct) {
  if (pct >= 80) return 'score-green';
  if (pct >= 60) return 'score-indigo';
  if (pct >= 40) return 'score-amber';
  return 'score-pink';
}

/* ── Chart Default Config ── */
const ChartDefaults = {
  font: { family: 'DM Sans', size: 11 },
  color: '#64748b',
  gridColor: 'rgba(255,255,255,0.04)',

  scales(opts = {}) {
    return {
      x: { grid: { color: this.gridColor }, ticks: { color: this.color, font: this.font }, ...opts.x },
      y: { grid: { color: this.gridColor }, ticks: { color: this.color, font: this.font }, ...opts.y },
    };
  },
  plugins(opts = {}) {
    return {
      legend: {
        labels: { color: this.color, font: this.font, boxWidth: 10, padding: 12 },
        ...opts.legend,
      },
      tooltip: {
        backgroundColor: '#16162a',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        titleColor: '#e2e8f0',
        bodyColor: '#94a3b8',
        ...opts.tooltip,
      },
    };
  },
};

/* ── Init on DOM Ready ── */
document.addEventListener('DOMContentLoaded', () => {
  setActiveNav();
  initFilterChips();
  initScrollNav();
});
