/* ─── SHARED UTILITIES FOR ALL INNER PAGES ──────────────────────────────────── */
const API = '/api';

// Apply cached accent immediately — prevents orange flash on page load
(function() {
  const c = localStorage.getItem('ae_accent');
  if (c) document.documentElement.style.setProperty('--accent', c);
})();

function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function getUser()  { try { return JSON.parse(localStorage.getItem('ae_user')); } catch { return null; } }
function getToken() { return localStorage.getItem('ae_token'); }

async function apiFetch(path, opts = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(API + path, { ...opts, headers: { ...headers, ...(opts.headers||{}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

/* ─── NAV AUTH ──────────────────────────────────────────────────────────────── */
function renderNavAuth() {
  const actions = document.getElementById('nav-actions');
  if (!actions) return;
  const user = getUser();
  if (user) {
    const initials = (user.username||'U').slice(0,2).toUpperCase();
    actions.innerHTML = `
      <a href="/" class="nav-dashboard-link">[DASHBOARD]</a>
      <div class="nav-avatar" onclick="window.location='/';">${initials}</div>`;
  } else {
    actions.innerHTML = `
      <button class="nav-btn-login"  onclick="window.location='/';">LOGIN</button>
      <button class="nav-btn-signup" onclick="window.location='/';">SIGN UP</button>`;
  }
}

/* ─── NAVBAR SCROLL + HAMBURGER ─────────────────────────────────────────────── */
function initNav() {
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => navbar?.classList.toggle('scrolled', window.scrollY > 50));

  const ham = document.getElementById('nav-hamburger');
  const mob = document.getElementById('mobile-nav');
  ham?.addEventListener('click', () => {
    const open = mob.classList.toggle('open');
    ham.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });
  document.querySelectorAll('.mobile-nav-link').forEach(l => l.addEventListener('click', () => {
    mob?.classList.remove('open'); ham?.classList.remove('open'); document.body.style.overflow = '';
  }));
  renderNavAuth();
}

/* ─── VIDEO MODAL ───────────────────────────────────────────────────────────── */
function initVideoModal() {
  if (document.getElementById('video-modal')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-overlay" id="video-modal">
      <div class="modal-container">
        <div class="modal-topbar">
          <h3 class="modal-title" id="modal-title"></h3>
          <button class="modal-close" id="modal-close">✕ CLOSE</button>
        </div>
        <div class="modal-iframe-wrap">
          <iframe id="modal-iframe" src="" allow="autoplay; encrypted-media" allowfullscreen></iframe>
        </div>
        <div class="modal-meta">
          <span class="modal-creator" id="modal-creator"></span>
          <span class="tag" id="modal-duration"></span>
          <span class="tag" id="modal-level"></span>
          <a href="#" target="_blank" rel="noopener" class="tag tag-accent" id="modal-youtube-link" style="margin-left:auto;">▶ WATCH ON YOUTUBE</a>
        </div>
      </div>
    </div>`);
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('video-modal').addEventListener('click', e => { if (e.target.id === 'video-modal') closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
}

function openModal(video) {
  document.getElementById('modal-title').textContent   = video.title || '';
  document.getElementById('modal-creator').textContent = video.creators?.name || '';
  document.getElementById('modal-duration').textContent = video.duration || '';
  document.getElementById('modal-level').textContent   = video.level || '';
  if (video.youtube_id) document.getElementById('modal-iframe').src = `https://www.youtube.com/embed/${video.youtube_id}?autoplay=1`;
  const ytLink = document.getElementById('modal-youtube-link');
  if (ytLink) ytLink.href = video.youtube_url || (video.youtube_id ? `https://www.youtube.com/watch?v=${video.youtube_id}` : '#');
  document.getElementById('video-modal').classList.add('open');
}

function closeModal() {
  document.getElementById('video-modal')?.classList.remove('open');
  const iframe = document.getElementById('modal-iframe');
  if (iframe) iframe.src = '';
}

/* ─── SCROLL REVEAL ─────────────────────────────────────────────────────────── */
function initReveal() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) { setTimeout(() => e.target.classList.add('visible'), i * 60); obs.unobserve(e.target); }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
}

/* ─── ACCENT COLOR FROM SETTINGS ────────────────────────────────────────────── */
async function loadAccent() {
  try {
    const d = await apiFetch('/settings');
    if (d.settings?.accent_color) {
      document.documentElement.style.setProperty('--accent', d.settings.accent_color);
      localStorage.setItem('ae_accent', d.settings.accent_color);
    } else if (localStorage.getItem('ae_accent')) {
      // No accent set server-side — don't keep trusting a stale cached override
      document.documentElement.style.removeProperty('--accent');
      localStorage.removeItem('ae_accent');
    }
  } catch {}
}

/* ─── AUTO INIT ─────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initVideoModal();
  loadAccent();
  setTimeout(initReveal, 120);
});
