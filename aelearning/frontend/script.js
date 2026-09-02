/* ─── CONFIG ────────────────────────────────────────────────────────────────── */
const API = 'http://localhost:3000/api';

// Apply cached accent immediately — prevents orange flash before API responds
(function() {
  const c = localStorage.getItem('ae_accent');
  if (c) document.documentElement.style.setProperty('--accent', c);
})();

/* ─── DUMMY DATA (fallback when backend is offline) ─────────────────────────── */
const DUMMY_VIDEOS = {
  beginner: [
    { id: 'd1', title: 'After Effects Basics in 30 Minutes', creators: { name: 'Evan Abrams' }, duration: '30:12', youtube_id: 'dHR3tFiCLU4', level: 'beginner' },
    { id: 'd2', title: 'Understanding Keyframes & Easing', creators: { name: 'Jake In Motion' }, duration: '18:45', youtube_id: 'v7by6RLTO_4', level: 'beginner' },
    { id: 'd3', title: 'Motion Blur Deep Dive', creators: { name: 'Motion Bro' }, duration: '12:30', youtube_id: 'rAVxSCF7gvw', level: 'beginner' },
    { id: 'd4', title: 'Text Animation Fundamentals', creators: { name: 'Ukramedia' }, duration: '22:10', youtube_id: 'Os-oFj4XURM', level: 'beginner' },
  ],
  intermediate: [
    { id: 'd5', title: 'Expression Basics: The Wiggle', creators: { name: 'Motion Bro' }, duration: '15:20', youtube_id: 'ycJNSP0HIYM', level: 'intermediate' },
    { id: 'd6', title: 'Shape Layer Mastery', creators: { name: 'Sonduck Film' }, duration: '28:00', youtube_id: 'E6mUMiU1uNU', level: 'intermediate' },
    { id: 'd7', title: '3D Camera Techniques in AE', creators: { name: 'Evan Abrams' }, duration: '35:15', youtube_id: 'Mwz9D0g9O2w', level: 'intermediate' },
    { id: 'd8', title: 'Advanced Masking & Rotoscoping', creators: { name: 'Jake In Motion' }, duration: '41:00', youtube_id: 'x5v1l_kJ17I', level: 'intermediate' },
  ],
  advanced: [
    { id: 'd9',  title: 'Optical Flares & Glow FX', creators: { name: 'Ukramedia' }, duration: '19:30', youtube_id: 'mGGBFnPRy_k', level: 'advanced' },
    { id: 'd10', title: 'Custom Expressions for Animators', creators: { name: 'Animoplex' }, duration: '26:45', youtube_id: 'wHXMxzXtj7s', level: 'advanced' },
    { id: 'd11', title: 'Cinema 4D Lite Essentials', creators: { name: 'Greyscalegorilla' }, duration: '44:20', youtube_id: 'i1DCnI7YTFM', level: 'advanced' },
    { id: 'd12', title: 'Color Science in AE', creators: { name: 'Cullen Kelly' }, duration: '33:10', youtube_id: '3fqM4bGp8dw', level: 'advanced' },
  ]
};

const DUMMY_PLAYLISTS = [
  { id: 'p1', name: 'The AE Starter Pack', creators: { name: 'Evan Abrams' }, video_ids: ['d1','d2','d3','d4'], featured: true },
  { id: 'p2', name: 'Kinetic Type Bible', creators: { name: 'Ukramedia' }, video_ids: ['d4','d6'], featured: true },
  { id: 'p3', name: 'Motion for Social Media', creators: { name: 'Motion Bro' }, video_ids: ['d3','d5','d6'], featured: true },
  { id: 'p4', name: '3D on a Budget', creators: { name: 'Evan Abrams' }, video_ids: ['d7','d11'], featured: true },
  { id: 'p5', name: 'Mograph in a Week', creators: { name: 'Animoplex' }, video_ids: ['d1','d5','d10'], featured: true },
  { id: 'p6', name: 'VFX for YouTube', creators: { name: 'Sonduck Film' }, video_ids: ['d8','d9'], featured: true },
];

const DUMMY_CREATORS = [
  { id: 'c1', name: 'Evan Abrams', specialty: 'Motion Design', handle: '@evabrams', subscriber_count: '245K' },
  { id: 'c2', name: 'Jake In Motion', specialty: 'Animation', handle: '@jakeinmotion', subscriber_count: '180K' },
  { id: 'c3', name: 'Motion Bro', specialty: 'Expressions', handle: '@motionbro', subscriber_count: '320K' },
  { id: 'c4', name: 'Ukramedia', specialty: 'Text Animation', handle: '@ukramedia', subscriber_count: '290K' },
  { id: 'c5', name: 'Animoplex', specialty: 'Scripting & Expressions', handle: '@animoplex', subscriber_count: '155K' },
  { id: 'c6', name: 'Sonduck Film', specialty: 'Compositing & VFX', handle: '@sonduckfilm', subscriber_count: '210K' },
];

/* ─── THREE.JS HERO ─────────────────────────────────────────────────────────── */
function getCSSAccent() {
  return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#FF4D00';
}

(function initThree() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, canvas.offsetWidth / canvas.offsetHeight, 0.1, 100);
  camera.position.z = 5;

  // Lighting
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const dirLight = new THREE.DirectionalLight(getCSSAccent(), 1.2);
  dirLight.position.set(2, 3, 2);
  scene.add(dirLight);

  // Main icosahedron
  const geoIco = new THREE.IcosahedronGeometry(2.2, 1);
  const matIco = new THREE.MeshStandardMaterial({
    color: new THREE.Color(getCSSAccent()),
    wireframe: true,
    transparent: true,
    opacity: 0.15,
  });
  const mesh = new THREE.Mesh(geoIco, matIco);
  mesh.position.x = 1.5;
  scene.add(mesh);

  // Particles
  const particleCount = 200;
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 4 + Math.random() * 2;
    positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  const geoParticles = new THREE.BufferGeometry();
  geoParticles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const matParticles = new THREE.PointsMaterial({
    color: new THREE.Color(getCSSAccent()),
    size: 0.015,
    transparent: true,
    opacity: 0.3
  });
  const particles = new THREE.Points(geoParticles, matParticles);
  scene.add(particles);

  // Expose color updater so settings changes apply live
  window.__updateThreeColor = (hex) => {
    const c = new THREE.Color(hex);
    matIco.color.set(c);
    matParticles.color.set(c);
    dirLight.color.set(c);
  };

  // Mouse parallax target
  let mouseX = 0, mouseY = 0;
  let targetX = 0, targetY = 0;
  window.addEventListener('mousemove', e => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 0.6;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 0.6;
  });

  // Resize
  window.addEventListener('resize', () => {
    const w = canvas.offsetWidth, h = canvas.offsetHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  // Animation loop
  (function animate() {
    requestAnimationFrame(animate);
    mesh.rotation.x += 0.0015;
    mesh.rotation.y += 0.002;
    particles.rotation.y -= 0.0005;
    particles.rotation.x -= 0.0003;

    // Damped parallax
    targetX += (mouseX - targetX) * 0.05;
    targetY += (mouseY - targetY) * 0.05;
    mesh.position.x = 1.5 + targetX * 0.3;
    mesh.position.y = -targetY * 0.3;

    renderer.render(scene, camera);
  })();
})();

/* ─── NAVBAR SCROLL ─────────────────────────────────────────────────────────── */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 50);
  highlightActiveNav();
});

/* ─── HAMBURGER MENU ────────────────────────────────────────────────────────── */
const hamburger = document.getElementById('nav-hamburger');
const mobileNav = document.getElementById('mobile-nav');

hamburger.addEventListener('click', () => {
  const isOpen = mobileNav.classList.toggle('open');
  hamburger.classList.toggle('open', isOpen);
  document.body.style.overflow = isOpen ? 'hidden' : '';
});

// Close mobile nav on link click
document.querySelectorAll('.mobile-nav-link').forEach(link => {
  link.addEventListener('click', () => {
    mobileNav.classList.remove('open');
    hamburger.classList.remove('open');
    document.body.style.overflow = '';
  });
});

// Mobile auth buttons mirror desktop
document.getElementById('mobile-login-btn')?.addEventListener('click', () => {
  mobileNav.classList.remove('open');
  hamburger.classList.remove('open');
  document.body.style.overflow = '';
  openAuthModal('login');
});
document.getElementById('mobile-signup-btn')?.addEventListener('click', () => {
  mobileNav.classList.remove('open');
  hamburger.classList.remove('open');
  document.body.style.overflow = '';
  openAuthModal('signup');
});

function highlightActiveNav() {
  const sections = ['roadmap', 'playlists', 'creators', 'courses'];
  const links = document.querySelectorAll('.nav-links a');
  let current = '';
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el && window.scrollY >= el.offsetTop - 120) current = id;
  });
  links.forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === `#${current}`);
  });
}

/* ─── SCROLL REVEAL ─────────────────────────────────────────────────────────── */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('visible'), i * 80);
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

/* ─── API HELPERS ───────────────────────────────────────────────────────────── */
async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem('ae_token');
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(API + path, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

/* ─── VIDEO CARDS ───────────────────────────────────────────────────────────── */
const surpriseMePool = [];

function buildVideoCard(video) {
  surpriseMePool.push(video);
  const div = document.createElement('div');
  div.className = 'video-card reveal specimen-frame';
  div.dataset.id = video.id;
  div.dataset.youtubeId = video.youtube_id || '';
  div.dataset.title = video.title;
  div.dataset.creator = video.creators?.name || '';
  div.dataset.duration = video.duration || '';
  div.dataset.level = video.level || '';

  const thumbSrc = video.youtube_id
    ? `https://img.youtube.com/vi/${video.youtube_id}/mqdefault.jpg`
    : null;

  div.innerHTML = `
    <div class="video-thumb">
      ${thumbSrc
        ? `<img src="${thumbSrc}" alt="${escHtml(video.title)}" loading="lazy">`
        : `<div class="video-thumb-placeholder">▶</div>`}
    </div>
    <div class="video-info">
      <div class="video-title">${escHtml(video.title)}</div>
      <div class="video-creator">${escHtml(video.creators?.name || '')}</div>
      <div class="video-actions">
        ${video.duration ? `<span class="video-duration">${escHtml(video.duration)}</span>` : ''}
        <a href="${escHtml(video.youtube_url || (video.youtube_id ? `https://www.youtube.com/watch?v=${video.youtube_id}` : '#'))}" target="_blank" rel="noopener" class="wt-btn yt-link" title="Open on YouTube">YT ↗</a>
        <button type="button" class="wt-btn watch-btn"></button>
      </div>
    </div>
  `;

  const ytLink = div.querySelector('.yt-link');
  ytLink.addEventListener('click', e => e.stopPropagation());

  const watchBtn = div.querySelector('.watch-btn');
  const syncWatchBtn = () => {
    const watched = AEProgress.isWatched(video.id);
    watchBtn.classList.toggle('active', watched);
    watchBtn.textContent = watched ? '✓ Watched' : 'Mark Watched';
  };
  syncWatchBtn();
  watchBtn.addEventListener('click', e => {
    e.stopPropagation();
    AEProgress.toggleWatched(video.id);
    syncWatchBtn();
    document.dispatchEvent(new CustomEvent('ae:progress-changed'));
  });

  div.addEventListener('click', () => openVideoModal(video));
  revealObserver.observe(div);
  return div;
}

/* ─── LOAD ROADMAP ──────────────────────────────────────────────────────────── */
async function loadRoadmap() {
  const levels = ['beginner', 'intermediate', 'advanced'];
  for (const level of levels) {
    const container = document.getElementById(`videos-${level}`);
    try {
      const data = await apiFetch(`/videos?level=${level}&limit=4`);
      const videos = data.videos?.length ? data.videos : DUMMY_VIDEOS[level];
      container.innerHTML = '';
      videos.forEach(v => container.appendChild(buildVideoCard(v)));
    } catch {
      container.innerHTML = '';
      DUMMY_VIDEOS[level].forEach(v => container.appendChild(buildVideoCard(v)));
    }
  }
}

/* ─── LOAD PLAYLISTS ────────────────────────────────────────────────────────── */
function buildPlaylistCard(pl, index) {
  const div = document.createElement('div');
  div.className = 'playlist-card specimen-frame';
  const creator = pl.creators?.name || pl.user?.username || 'Community';
  const count = pl.video_count ?? (Array.isArray(pl.video_ids) ? pl.video_ids.length : 0);
  const thumb = pl.youtube_id
    ? `<img class="playlist-thumb-img" src="https://img.youtube.com/vi/${pl.youtube_id}/mqdefault.jpg" alt="" loading="lazy">`
    : '';
  div.innerHTML = `
    <div class="playlist-top">
      ${thumb}
      <span class="playlist-number">${String(index + 1).padStart(2, '0')}</span>
    </div>
    <div class="playlist-body">
      <div class="playlist-name">${escHtml(pl.name)}</div>
      <div class="playlist-author">by @${escHtml(creator)}</div>
      <div class="playlist-meta">
        <span class="tag">${count} videos</span>
        ${pl.featured ? '<span class="tag tag-accent">FEATURED</span>' : ''}
      </div>
      <div class="playlist-foot">
        <a href="/playlists/view?id=${pl.id}" class="playlist-link">VIEW PLAYLIST →</a>
        <button type="button" class="wt-btn save-btn"></button>
      </div>
    </div>
  `;

  const saveBtn = div.querySelector('.save-btn');
  const syncSaveBtn = () => {
    const saved = AEProgress.isSaved('playlist', pl.id);
    saveBtn.classList.toggle('active', saved);
    saveBtn.textContent = saved ? '✓ Saved' : '+ Save';
  };
  syncSaveBtn();
  saveBtn.addEventListener('click', e => {
    e.stopPropagation();
    AEProgress.toggleSaved('playlist', pl.id);
    syncSaveBtn();
  });
  div.querySelector('.playlist-link').addEventListener('click', e => e.stopPropagation());
  div.addEventListener('click', () => { window.location = `/playlists/view?id=${pl.id}`; });

  return div;
}

async function loadPlaylists() {
  const row = document.getElementById('playlists-row');
  try {
    const data = await apiFetch('/playlists?featured=true');
    const playlists = data.playlists?.length ? data.playlists : DUMMY_PLAYLISTS;
    row.innerHTML = '';
    playlists.forEach((pl, i) => row.appendChild(buildPlaylistCard(pl, i)));
  } catch {
    row.innerHTML = '';
    DUMMY_PLAYLISTS.forEach((pl, i) => row.appendChild(buildPlaylistCard(pl, i)));
  }
  initDragScroll(row);
}

/* ─── DRAG SCROLL ───────────────────────────────────────────────────────────── */
function initDragScroll(el) {
  let isDown = false, startX, scrollLeft;
  el.addEventListener('mousedown', e => {
    isDown = true;
    el.classList.add('grabbing');
    startX = e.pageX - el.offsetLeft;
    scrollLeft = el.scrollLeft;
  });
  el.addEventListener('mouseleave', () => { isDown = false; el.classList.remove('grabbing'); });
  el.addEventListener('mouseup', () => { isDown = false; el.classList.remove('grabbing'); });
  el.addEventListener('mousemove', e => {
    if (!isDown) return;
    e.preventDefault();
    el.scrollLeft = scrollLeft - (e.pageX - el.offsetLeft - startX);
  });
}

/* ─── LOAD CREATORS ─────────────────────────────────────────────────────────── */
function buildCreatorPill(creator) {
  const div = document.createElement('div');
  div.className = 'creator-pill';
  const initials = creator.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const avatar = creator.avatar_url
    ? `<img src="${escHtml(creator.avatar_url)}" alt="" onerror="this.remove();this.parentElement.textContent='${initials}';">`
    : initials;
  div.innerHTML = `
    <div class="cp-avatar">${avatar}</div>
    <div>
      <div class="cp-name">${escHtml(creator.name)}</div>
      <div class="cp-sub">${escHtml(creator.subscriber_count ? creator.subscriber_count + ' subs' : (creator.specialty || 'YouTube'))}</div>
    </div>
  `;
  div.addEventListener('click', () => {
    if (creator.youtube_url) window.open(creator.youtube_url, '_blank', 'noopener');
  });
  return div;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function fillMarqueeRow(trackId, creators) {
  const track = document.getElementById(trackId);
  if (!track) return;
  track.innerHTML = '';
  // Render the set twice back-to-back — the CSS animation scrolls exactly
  // one copy's width, so it loops seamlessly with no visible seam or reset.
  [...creators, ...creators].forEach(c => track.appendChild(buildCreatorPill(c)));
}

async function loadCreators() {
  let pool = DUMMY_CREATORS;
  try {
    const data = await apiFetch('/creators');
    if (data.creators?.length) pool = data.creators;
  } catch {}

  // Independently shuffled per row so each one has its own random order/mix.
  fillMarqueeRow('creator-marquee-1', shuffle(pool));
  fillMarqueeRow('creator-marquee-2', shuffle(pool));
  fillMarqueeRow('creator-marquee-3', shuffle(pool));
}

/* ─── VIDEO MODAL ───────────────────────────────────────────────────────────── */
const videoModal = document.getElementById('video-modal');
const modalIframe = document.getElementById('modal-iframe');
const modalTitle = document.getElementById('modal-title');
const modalCreator = document.getElementById('modal-creator');
const modalDuration = document.getElementById('modal-duration');
const modalLevel = document.getElementById('modal-level');
const modalYoutubeLink = document.getElementById('modal-youtube-link');

function openVideoModal(video) {
  const ytId = video.youtube_id || video.dataset?.youtubeId;
  modalTitle.textContent = video.title;
  modalCreator.textContent = video.creators?.name || '';
  modalDuration.textContent = video.duration || '';
  modalLevel.textContent = video.level || '';
  if (modalYoutubeLink) {
    modalYoutubeLink.href = video.youtube_url || (ytId ? `https://www.youtube.com/watch?v=${ytId}` : '#');
  }
  if (ytId) {
    modalIframe.src = `https://www.youtube.com/embed/${ytId}?autoplay=1`;
  }
  videoModal.classList.add('open');
}

function closeVideoModal() {
  videoModal.classList.remove('open');
  modalIframe.src = '';
}

document.getElementById('modal-close').addEventListener('click', closeVideoModal);
videoModal.addEventListener('click', e => { if (e.target === videoModal) closeVideoModal(); });

/* ─── AUTH STATE ────────────────────────────────────────────────────────────── */
function getUser() {
  try { return JSON.parse(localStorage.getItem('ae_user')); } catch { return null; }
}

function setAuthState(user, token) {
  if (user && token) {
    localStorage.setItem('ae_user', JSON.stringify(user));
    localStorage.setItem('ae_token', token);
  } else {
    localStorage.removeItem('ae_user');
    localStorage.removeItem('ae_token');
  }
  renderNavAuth();
}

function renderNavAuth() {
  const actions = document.getElementById('nav-actions');
  const user = getUser();
  if (user) {
    const initials = user.username?.slice(0, 2).toUpperCase() || 'U';
    actions.innerHTML = `
      <a href="#" class="nav-dashboard-link" id="nav-dash-btn">DASHBOARD</a>
      <div class="nav-avatar" id="nav-avatar">${initials}</div>
    `;
    document.getElementById('nav-dash-btn').addEventListener('click', e => { e.preventDefault(); openDashboard(); });
    document.getElementById('nav-avatar').addEventListener('click', openDashboard);
  } else {
    actions.innerHTML = `
      <button class="nav-btn-login" id="nav-login-btn">LOGIN</button>
      <button class="nav-btn-signup" id="nav-signup-btn">SIGN UP</button>
    `;
    document.getElementById('nav-login-btn').addEventListener('click', () => openAuthModal('login'));
    document.getElementById('nav-signup-btn').addEventListener('click', () => openAuthModal('signup'));
  }
}

/* ─── AUTH MODALS ───────────────────────────────────────────────────────────── */
const loginOverlay  = document.getElementById('login-overlay');
const signupOverlay = document.getElementById('signup-overlay');

function openAuthModal(type) {
  loginOverlay.classList.toggle('open', type === 'login');
  signupOverlay.classList.toggle('open', type === 'signup');
  // Do NOT set body.overflow — it creates a containing-block for fixed elements
  // and can clip the modal on some browsers. The overlay itself handles scroll.
}

function closeAuthModals() {
  loginOverlay.classList.remove('open');
  signupOverlay.classList.remove('open');
  clearAuthErrors();
}

function clearAuthErrors() {
  document.getElementById('login-error').className = 'auth-error';
  document.getElementById('signup-error').className = 'auth-error';
}

function showAuthError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.className = 'auth-error visible';
}

loginOverlay.addEventListener('click', e => { if (e.target === loginOverlay) closeAuthModals(); });
signupOverlay.addEventListener('click', e => { if (e.target === signupOverlay) closeAuthModals(); });

document.getElementById('login-close').addEventListener('click', closeAuthModals);
document.getElementById('signup-close').addEventListener('click', closeAuthModals);

document.getElementById('switch-to-signup').addEventListener('click', () => openAuthModal('signup'));
document.getElementById('switch-to-login').addEventListener('click', () => openAuthModal('login'));

function setButtonLoading(btn, loading) {
  if (loading) {
    btn.dataset.original = btn.textContent;
    btn.textContent = '[ LOADING... ]';
    btn.disabled = true;
    btn.style.opacity = '0.7';
  } else {
    btn.textContent = btn.dataset.original || btn.textContent;
    btn.disabled = false;
    btn.style.opacity = '';
  }
}

// Login submit
async function submitLogin() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) return showAuthError('login-error', 'All fields required.');
  const btn = document.getElementById('login-submit');
  setButtonLoading(btn, true);
  try {
    const data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    setAuthState(data.user, data.token);
    closeAuthModals();
  } catch (err) {
    showAuthError('login-error', err.message);
  } finally {
    setButtonLoading(btn, false);
  }
}

document.getElementById('login-submit').addEventListener('click', submitLogin);
document.getElementById('login-password').addEventListener('keydown', e => { if (e.key === 'Enter') submitLogin(); });
document.getElementById('login-email').addEventListener('keydown', e => { if (e.key === 'Enter') submitLogin(); });

// Signup submit
async function submitSignup() {
  const username = document.getElementById('signup-username').value.trim();
  const email    = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const confirm  = document.getElementById('signup-confirm').value;
  if (!username || !email || !password) return showAuthError('signup-error', 'All fields required.');
  if (password !== confirm) return showAuthError('signup-error', 'Passwords do not match.');
  if (password.length < 6) return showAuthError('signup-error', 'Password must be at least 6 characters.');
  const btn = document.getElementById('signup-submit');
  setButtonLoading(btn, true);
  try {
    const data = await apiFetch('/auth/register', { method: 'POST', body: JSON.stringify({ username, email, password }) });
    setAuthState(data.user, data.token);
    closeAuthModals();
  } catch (err) {
    showAuthError('signup-error', err.message);
  } finally {
    setButtonLoading(btn, false);
  }
}

document.getElementById('signup-submit').addEventListener('click', submitSignup);
['signup-username','signup-email','signup-password','signup-confirm'].forEach(id => {
  document.getElementById(id).addEventListener('keydown', e => { if (e.key === 'Enter') submitSignup(); });
});

/* ─── DASHBOARD ─────────────────────────────────────────────────────────────── */
const dashPanel = document.getElementById('dashboard-panel');

async function openDashboard() {
  const user = getUser();
  if (!user) return;
  document.getElementById('dash-username').textContent = user.username?.toUpperCase() || 'USER';
  document.getElementById('dash-email').textContent = user.email || '';
  dashPanel.classList.add('open');
  document.body.style.overflow = 'hidden';

  try {
    const data = await apiFetch('/user/dashboard');
    const playlists = data.playlists || [];
    const container = document.getElementById('dash-playlists');
    if (playlists.length === 0) {
      container.innerHTML = '<p class="dashboard-empty">No playlists yet.</p>';
    } else {
      container.innerHTML = playlists.map(p => `
        <div class="dashboard-playlist-item">${escHtml(p.name)}</div>
      `).join('');
    }
  } catch { /* offline — show empty state */ }
}

document.getElementById('dashboard-close').addEventListener('click', () => {
  dashPanel.classList.remove('open');
  document.body.style.overflow = '';
});

document.getElementById('dashboard-logout').addEventListener('click', () => {
  setAuthState(null, null);
  dashPanel.classList.remove('open');
  document.body.style.overflow = '';
});

/* ─── ESC KEY ───────────────────────────────────────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  closeVideoModal();
  closeAuthModals();
  dashPanel.classList.remove('open');
  document.body.style.overflow = '';
});

/* ─── SETTINGS ──────────────────────────────────────────────────────────────── */
async function loadSettings() {
  try {
    const data = await apiFetch('/settings').catch(() => null);
    if (!data?.settings) return;
    const s = data.settings;
    if (s.hero_line1 || s.hero_line2) {
      const h = document.querySelector('.hero-headline');
      if (h) h.innerHTML = `${escHtml(s.hero_line1 || 'MASTER')}<br>${escHtml(s.hero_line2 || 'AFTER EFFECTS')}<span class="accent">.</span>`;
    }
    if (s.marquee_text) {
      document.querySelectorAll('.marquee-track span').forEach(el => { el.textContent = s.marquee_text + ' '; });
    }
    if (s.accent_color) {
      document.documentElement.style.setProperty('--accent', s.accent_color);
      localStorage.setItem('ae_accent', s.accent_color);
      window.__updateThreeColor?.(s.accent_color);
    } else if (localStorage.getItem('ae_accent')) {
      // No accent set server-side — don't keep trusting a stale cached override
      document.documentElement.style.removeProperty('--accent');
      localStorage.removeItem('ae_accent');
      window.__updateThreeColor?.('#FF4D00');
    } else if (localStorage.getItem('ae_accent')) {
      // No accent set server-side — don't keep trusting a stale cached override
      document.documentElement.style.removeProperty('--accent');
      localStorage.removeItem('ae_accent');
      window.__updateThreeColor?.('#FF4D00');
    }
    // About section
    if (s.about_title) {
      const el = document.getElementById('about-title');
      if (el) el.innerHTML = escHtml(s.about_title).replace(/\n/g, '<br>');
    }
    if (s.about_body)  { const el = document.getElementById('about-body');  if (el) el.textContent = s.about_body; }
    if (s.about_body2) { const el = document.getElementById('about-body-2'); if (el) el.textContent = s.about_body2; }
    if (s.about_m1) { const el = document.getElementById('about-m1'); if (el) el.innerHTML = escHtml(s.about_m1).replace(/\n/g, '<br>'); }
    if (s.about_m2) { const el = document.getElementById('about-m2'); if (el) el.innerHTML = escHtml(s.about_m2).replace(/\n/g, '<br>'); }
    if (s.about_m3) { const el = document.getElementById('about-m3'); if (el) el.innerHTML = escHtml(s.about_m3).replace(/\n/g, '<br>'); }

    // Section visibility — admin-controlled show/hide per homepage section.
    // querySelectorAll (not getElementById) so this stays correct even if a
    // section id is accidentally duplicated in the markup.
    const TOGGLEABLE_SECTIONS = ['roadmap', 'playlists', 'creators', 'about', 'courses', 'faq'];
    TOGGLEABLE_SECTIONS.forEach(id => {
      const hidden = s[`section_${id}_visible`] === 'false';
      document.querySelectorAll(`section#${id}`).forEach(el => {
        el.style.display = hidden ? 'none' : '';
      });
    });
  } catch { /* ignore */ }
}

/* ─── NEWSLETTER (Kit) ──────────────────────────────────────────────────────── */
document.getElementById('newsletter-btn')?.addEventListener('click', async () => {
  const input = document.getElementById('newsletter-email');
  const msg   = document.getElementById('newsletter-msg');
  const btn   = document.getElementById('newsletter-btn');
  const email = input?.value?.trim();
  if (!email || !email.includes('@')) {
    msg.style.display = 'block'; msg.style.color = 'var(--accent)';
    msg.textContent = 'Enter a valid email address.'; return;
  }
  btn.textContent = 'SUBSCRIBING...'; btn.disabled = true;
  try {
    await apiFetch('/subscribe', { method: 'POST', body: JSON.stringify({ email }) });
    msg.style.display = 'block'; msg.style.color = '#4CAF50';
    msg.textContent = '✓ You\'re subscribed!';
    input.value = '';
  } catch (err) {
    msg.style.display = 'block'; msg.style.color = 'var(--accent)';
    msg.textContent = err.message || 'Subscription failed. Try again.';
  } finally {
    btn.textContent = 'SUBSCRIBE'; btn.disabled = false;
  }
});

/* ─── SURPRISE ME ───────────────────────────────────────────────────────────── */
document.getElementById('surprise-me-btn')?.addEventListener('click', () => {
  if (!surpriseMePool.length) return;
  const pick = surpriseMePool[Math.floor(Math.random() * surpriseMePool.length)];
  openVideoModal(pick);
});

/* ─── SURPRISE ME ───────────────────────────────────────────────────────────── */
document.getElementById('surprise-me-btn')?.addEventListener('click', () => {
  if (!surpriseMePool.length) return;
  const pick = surpriseMePool[Math.floor(Math.random() * surpriseMePool.length)];
  openVideoModal(pick);
});

/* ─── FAQ ACCORDION ─────────────────────────────────────────────────────────── */
document.querySelectorAll('.faq-item').forEach(item => {
  const q = item.querySelector('.faq-q');
  const a = item.querySelector('.faq-a');
  q.addEventListener('click', () => {
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(other => {
      if (other !== item) {
        other.classList.remove('open');
        other.querySelector('.faq-a').style.maxHeight = null;
      }
    });
    item.classList.toggle('open', !isOpen);
    a.style.maxHeight = isOpen ? null : `${a.scrollHeight}px`;
  });
});

/* ─── FAQ ACCORDION ─────────────────────────────────────────────────────────── */
document.querySelectorAll('.faq-item').forEach(item => {
  const q = item.querySelector('.faq-q');
  const a = item.querySelector('.faq-a');
  q.addEventListener('click', () => {
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(other => {
      if (other !== item) {
        other.classList.remove('open');
        other.querySelector('.faq-a').style.maxHeight = null;
      }
    });
    item.classList.toggle('open', !isOpen);
    a.style.maxHeight = isOpen ? null : `${a.scrollHeight}px`;
  });
});

/* ─── HELPER ────────────────────────────────────────────────────────────────── */
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ─── INIT ──────────────────────────────────────────────────────────────────── */
(function init() {
  renderNavAuth();
  loadSettings();
  loadRoadmap();
  loadPlaylists();
  loadCreators();

  // Stagger reveal for stat items
  document.querySelectorAll('.stat-item').forEach(el => revealObserver.observe(el));

  // Initial nav highlight
  highlightActiveNav();


})();
