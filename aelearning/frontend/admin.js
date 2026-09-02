/* ─── CONFIG ────────────────────────────────────────────────────────────────── */
const API = 'http://localhost:3000/api';

// Apply cached accent immediately — prevents orange flash on admin page load
(function() {
  const c = localStorage.getItem('ae_accent');
  if (c) document.documentElement.style.setProperty('--accent', c);
})();

/* ─── TOAST ─────────────────────────────────────────────────────────────────── */
function toast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = type === 'success' ? `[✓ ${msg}]` : `[✗ ${msg}]`;
  el.addEventListener('click', () => el.remove());
  container.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

/* ─── API HELPERS ───────────────────────────────────────────────────────────── */
function getToken() { return localStorage.getItem('ae_token'); }

async function apiFetch(path, opts = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(API + path, { ...opts, headers: { ...headers, ...(opts.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ─── AUTH GUARD ────────────────────────────────────────────────────────────── */
async function authGuard() {
  const token = getToken();
  if (!token) { window.location.href = 'index.html'; return; }
  try {
    const data = await apiFetch('/auth/me');
    if (data.user?.role !== 'admin') throw new Error('Not admin');
    document.getElementById('admin-username').textContent = data.user.username?.toUpperCase() || 'ADMIN';
    window.__adminUser = data.user;
  } catch {
    localStorage.removeItem('ae_token');
    localStorage.removeItem('ae_user');
    window.location.href = 'index.html';
  }
}

/* ─── SIDEBAR NAV ───────────────────────────────────────────────────────────── */
const panelTitles = {
  dashboard: 'DASHBOARD', videos: 'VIDEOS', playlists: 'PLAYLISTS',
  creators: 'CREATORS', users: 'USERS', courses: 'COURSES',
  settings: 'SETTINGS', data: 'BACKUP / RESTORE'
};

function switchPanel(name) {
  document.querySelectorAll('.sidebar-nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.panel === name);
  });
  document.querySelectorAll('.admin-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `panel-${name}`);
  });
  document.getElementById('topbar-title').textContent = panelTitles[name] || name.toUpperCase();
  if (name === 'dashboard') loadDashboard();
  if (name === 'videos')    loadVideosPanel();
  if (name === 'playlists') loadPlaylistsPanel();
  if (name === 'creators')  loadCreatorsPanel();
  if (name === 'users')     loadUsersPanel();
  if (name === 'courses')   loadCoursesPanel();
  if (name === 'settings')  loadSettingsPanel();
  if (name === 'data')      loadDataPanel();
}

document.querySelectorAll('.sidebar-nav-item').forEach(item => {
  item.addEventListener('click', () => switchPanel(item.dataset.panel));
});

/* ─── DASHBOARD ─────────────────────────────────────────────────────────────── */
async function loadDashboard() {
  try {
    const data = await apiFetch('/admin/stats');
    document.getElementById('stat-videos').textContent    = data.total_videos ?? '—';
    document.getElementById('stat-users').textContent     = data.total_users ?? '—';
    document.getElementById('stat-playlists').textContent = data.total_playlists ?? '—';
    document.getElementById('stat-creators').textContent  = data.total_creators ?? '—';
    renderWeeklyChart(data.recent_users || []);
    renderActivity(data);
  } catch {
    toast('Could not load stats', 'error');
  }
}

function renderWeeklyChart(recentUsers) {
  const chart = document.getElementById('weekly-chart');
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const counts = new Array(7).fill(0);
  recentUsers.forEach(u => {
    const d = new Date(u.created_at).getDay();
    counts[d]++;
  });
  const max = Math.max(...counts, 1);
  chart.innerHTML = counts.map((count, i) => `
    <div class="bar-col">
      <div class="bar" style="height:${Math.round((count / max) * 100)}%" title="${count} signups"></div>
      <span class="bar-label">${days[i]}</span>
    </div>
  `).join('');
}

function renderActivity(data) {
  const list = document.getElementById('activity-list');
  const items = [
    `${data.total_videos} videos indexed`,
    `${data.total_creators} creators on platform`,
    `${data.total_playlists} community playlists`,
    `${data.total_users} registered users`,
  ];
  list.innerHTML = items.map(msg => `
    <div class="activity-item">
      <div class="activity-dot"></div>
      <span>${escHtml(msg)}</span>
    </div>
  `).join('');
}

/* ─── CREATORS CACHE (used by video/playlist forms) ─────────────────────────── */
let creatorsCache = [];

async function fetchCreatorsCache() {
  try {
    const data = await apiFetch('/admin/creators');
    creatorsCache = data.creators || [];
  } catch { creatorsCache = []; }
}

function populateCreatorSelect(selectId, selectedId = '') {
  const sel = document.getElementById(selectId);
  sel.innerHTML = `<option value="">No creator</option>` +
    creatorsCache.map(c => `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${escHtml(c.name)}</option>`).join('');
}

/* ─── VIDEOS PANEL ──────────────────────────────────────────────────────────── */
let currentVideoLevel = 'beginner';
let currentVideos = [];
let draggedVideoId = null;

async function loadVideosPanel() {
  await fetchCreatorsCache();
  populateCreatorSelect('video-creator');
  fetchVideos();
}

async function fetchVideos() {
  const search = document.getElementById('videos-search').value.trim();
  const params = new URLSearchParams({ level: currentVideoLevel, limit: 500 });
  if (search) params.set('search', search);
  try {
    const data = await apiFetch(`/admin/videos?${params}`);
    currentVideos = data.videos || [];
    renderVideoList(currentVideos);
  } catch { toast('Failed to load videos', 'error'); }
}

document.getElementById('videos-level-tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.admin-tab');
  if (!btn) return;
  document.querySelectorAll('#videos-level-tabs .admin-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentVideoLevel = btn.dataset.level;
  fetchVideos();
});

function renderVideoList(videos) {
  const list = document.getElementById('videos-list');
  if (!videos.length) {
    list.innerHTML = '<div class="video-list-empty">No videos in this level yet.</div>';
    return;
  }
  list.innerHTML = '';
  videos.forEach((v, i) => list.appendChild(buildVideoRow(v, i)));
}

function buildVideoRow(v, idx) {
  const row = document.createElement('div');
  row.className = 'admin-video-row';
  row.draggable = true;
  row.dataset.id = v.id;
  const thumb = v.youtube_id
    ? `<img src="https://img.youtube.com/vi/${v.youtube_id}/mqdefault.jpg" alt="" loading="lazy">`
    : `<div class="avr-thumb-placeholder">▶</div>`;
  row.innerHTML = `
    <span class="avr-drag" title="Drag to reorder">⠿</span>
    <span class="avr-num">${String(idx+1).padStart(2,'0')}</span>
    <div class="avr-thumb">${thumb}</div>
    <div class="avr-info">
      <div class="avr-title">${escHtml(v.title)}</div>
      <div class="avr-creator">${escHtml(v.creators?.name || '—')}</div>
    </div>
    <span class="avr-duration">${escHtml(v.duration || '—')}</span>
    <div class="td-actions">
      <button class="btn-edit">EDIT</button>
      <button class="btn-delete">DELETE</button>
    </div>`;

  row.querySelector('.btn-edit').addEventListener('click', () => editVideo(v.id));
  row.querySelector('.btn-delete').addEventListener('click', () => deleteVideo(v.id));

  row.addEventListener('dragstart', () => {
    draggedVideoId = v.id;
    setTimeout(() => row.classList.add('dragging'), 0);
  });
  row.addEventListener('dragend', () => {
    row.classList.remove('dragging');
    document.querySelectorAll('.admin-video-row.drag-over').forEach(r => r.classList.remove('drag-over'));
    persistVideoOrder();
  });
  row.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (row.dataset.id === draggedVideoId) return;
    const list = document.getElementById('videos-list');
    const dragged = list.querySelector('.admin-video-row.dragging');
    if (!dragged) return;
    const rect = row.getBoundingClientRect();
    const before = (e.clientY - rect.top) < rect.height / 2;
    list.insertBefore(dragged, before ? row : row.nextSibling);
  });

  return row;
}

async function persistVideoOrder() {
  const ids = [...document.querySelectorAll('#videos-list .admin-video-row')].map(r => r.dataset.id);
  document.querySelectorAll('#videos-list .avr-num').forEach((el, i) => { el.textContent = String(i+1).padStart(2,'0'); });
  try {
    await apiFetch('/admin/videos/reorder', { method: 'POST', body: JSON.stringify({ ids }) });
  } catch (err) { toast('Failed to save order: ' + err.message, 'error'); }
}

// Form open/close
document.getElementById('videos-add-btn').addEventListener('click', () => {
  clearVideoForm();
  document.getElementById('video-level').value = currentVideoLevel;
  document.getElementById('videos-form-title').textContent = 'ADD VIDEO';
  document.getElementById('videos-form').classList.add('open');
});
document.getElementById('videos-form-cancel').addEventListener('click', () => {
  document.getElementById('videos-form').classList.remove('open');
});

function clearVideoForm() {
  ['video-edit-id','video-title','video-youtube-url','video-duration','video-tags','video-description'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('video-level').value = '';
  populateCreatorSelect('video-creator');
}

async function editVideo(id) {
  try {
    const data = await apiFetch(`/videos/${id}`);
    const v = data.video;
    document.getElementById('video-edit-id').value    = v.id;
    document.getElementById('video-title').value      = v.title || '';
    document.getElementById('video-youtube-url').value = v.youtube_url || '';
    document.getElementById('video-level').value      = v.level || '';
    document.getElementById('video-duration').value   = v.duration || '';
    document.getElementById('video-tags').value       = (v.tags || []).join(', ');
    document.getElementById('video-description').value = v.description || '';
    populateCreatorSelect('video-creator', v.creator_id);
    document.getElementById('videos-form-title').textContent = 'EDIT VIDEO';
    document.getElementById('videos-form').classList.add('open');
  } catch { toast('Failed to load video', 'error'); }
}

document.getElementById('video-save-btn').addEventListener('click', async () => {
  const id          = document.getElementById('video-edit-id').value;
  const title       = document.getElementById('video-title').value.trim();
  const youtube_url = document.getElementById('video-youtube-url').value.trim();
  const level       = document.getElementById('video-level').value;
  const creator_id  = document.getElementById('video-creator').value || null;
  const duration    = document.getElementById('video-duration').value.trim();
  const description = document.getElementById('video-description').value.trim();
  const tags        = document.getElementById('video-tags').value.split(',').map(t => t.trim()).filter(Boolean);

  if (!title) return toast('Title is required', 'error');
  const body = { title, youtube_url, level, creator_id, duration, description, tags };
  try {
    if (id) {
      await apiFetch(`/admin/videos/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      toast('Video updated');
    } else {
      await apiFetch('/admin/videos', { method: 'POST', body: JSON.stringify(body) });
      toast('Video added');
    }
    document.getElementById('videos-form').classList.remove('open');
    fetchVideos();
  } catch (err) { toast(err.message, 'error'); }
});

async function deleteVideo(id) {
  if (!confirm('Delete this video?')) return;
  try {
    await apiFetch(`/admin/videos/${id}`, { method: 'DELETE' });
    toast('Video deleted');
    fetchVideos();
  } catch (err) { toast(err.message, 'error'); }
}

// Search/filter debounce
let videosSearchTimer;
document.getElementById('videos-search').addEventListener('input', () => {
  clearTimeout(videosSearchTimer);
  videosSearchTimer = setTimeout(fetchVideos, 350);
});
/* ─── PLAYLISTS PANEL ───────────────────────────────────────────────────────── */
async function loadPlaylistsPanel() {
  await fetchCreatorsCache();
  populateCreatorSelect('playlist-creator');
  fetchPlaylists();
}

async function fetchPlaylists() {
  try {
    const data = await apiFetch('/admin/playlists');
    renderPlaylistsTable(data.playlists || []);
  } catch { toast('Failed to load playlists', 'error'); }
}

function renderPlaylistsTable(playlists) {
  const tbody = document.getElementById('playlists-table-body');
  if (!playlists.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-secondary);padding:24px">No playlists found.</td></tr>';
    return;
  }
  tbody.innerHTML = playlists.map(p => `
    <tr>
      <td>${escHtml(p.name)}</td>
      <td>${escHtml(p.creators?.name || '—')}</td>
      <td>${p.video_count ?? 0}</td>
      <td>
        <input type="checkbox" class="toggle" ${p.featured ? 'checked' : ''}
          onchange="toggleFeatured('${p.id}', this.checked)" />
      </td>
      <td>
        <div class="td-actions">
          <button class="btn-edit" onclick="openPlaylistVideoManager('${p.id}', '${escHtml(p.name).replace(/'/g,"\\'")}')">VIDEOS</button>
          <button class="btn-edit" onclick="editPlaylist('${p.id}')">EDIT</button>
          <button class="btn-delete" onclick="deletePlaylist('${p.id}')">DELETE</button>
        </div>
      </td>
    </tr>
  `).join('');
}

document.getElementById('playlists-add-btn').addEventListener('click', () => {
  document.getElementById('playlists-import-form').classList.remove('open');
  clearPlaylistForm();
  document.getElementById('playlists-form-title').textContent = 'CREATE PLAYLIST';
  document.getElementById('playlists-form').classList.add('open');
});
document.getElementById('playlists-form-cancel').addEventListener('click', () => {
  document.getElementById('playlists-form').classList.remove('open');
});

document.getElementById('playlists-import-btn').addEventListener('click', () => {
  document.getElementById('playlists-form').classList.remove('open');
  document.getElementById('playlist-import-url').value = '';
  document.getElementById('playlist-import-name').value = '';
  document.getElementById('playlist-import-status').textContent = '';
  document.getElementById('playlists-import-form').classList.add('open');
});
document.getElementById('playlists-import-cancel').addEventListener('click', () => {
  document.getElementById('playlists-import-form').classList.remove('open');
});

document.getElementById('playlist-import-run-btn').addEventListener('click', async () => {
  const playlist_url = document.getElementById('playlist-import-url').value.trim();
  const name = document.getElementById('playlist-import-name').value.trim();
  const status = document.getElementById('playlist-import-status');
  const btn = document.getElementById('playlist-import-run-btn');

  if (!playlist_url) return toast('Paste a YouTube playlist URL first', 'error');

  btn.textContent = 'IMPORTING… THIS CAN TAKE A MINUTE'; btn.disabled = true;
  status.style.color = 'var(--text-secondary)';
  status.textContent = 'Fetching playlist from YouTube and syncing videos…';
  try {
    const data = await apiFetch('/admin/playlists/import', {
      method: 'POST',
      body: JSON.stringify({ playlist_url, ...(name ? { name } : {}) })
    });
    status.style.color = '#4CAF50';
    status.textContent = `✓ Imported "${data.playlist.name}" — ${data.total_videos} videos (${data.imported_videos} new, ${data.reused_videos} already existed)`;
    toast('Playlist imported');
    fetchPlaylists();
  } catch (err) {
    status.style.color = 'var(--accent)';
    status.textContent = '✗ ' + err.message;
    toast(err.message, 'error');
  } finally {
    btn.textContent = 'IMPORT PLAYLIST'; btn.disabled = false;
  }
});

function clearPlaylistForm() {
  document.getElementById('playlist-edit-id').value = '';
  document.getElementById('playlist-name').value = '';
  document.getElementById('playlist-description').value = '';
  document.getElementById('playlist-featured').checked = false;
  populateCreatorSelect('playlist-creator');
}

async function editPlaylist(id) {
  try {
    const data = await apiFetch(`/playlists/${id}`);
    const p = data.playlist;
    document.getElementById('playlist-edit-id').value   = p.id;
    document.getElementById('playlist-name').value      = p.name || '';
    document.getElementById('playlist-description').value = p.description || '';
    document.getElementById('playlist-featured').checked = !!p.featured;
    populateCreatorSelect('playlist-creator', p.creator_id);
    document.getElementById('playlists-form-title').textContent = 'EDIT PLAYLIST';
    document.getElementById('playlists-form').classList.add('open');
  } catch { toast('Failed to load playlist', 'error'); }
}

document.getElementById('playlist-save-btn').addEventListener('click', async () => {
  const id          = document.getElementById('playlist-edit-id').value;
  const name        = document.getElementById('playlist-name').value.trim();
  const description = document.getElementById('playlist-description').value.trim();
  const creator_id  = document.getElementById('playlist-creator').value || null;
  const featured    = document.getElementById('playlist-featured').checked;

  if (!name) return toast('Name is required', 'error');
  const body = { name, description, creator_id, featured };
  try {
    if (id) {
      await apiFetch(`/admin/playlists/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      toast('Playlist updated');
    } else {
      await apiFetch('/admin/playlists', { method: 'POST', body: JSON.stringify(body) });
      toast('Playlist created');
    }
    document.getElementById('playlists-form').classList.remove('open');
    fetchPlaylists();
  } catch (err) { toast(err.message, 'error'); }
});

async function toggleFeatured(id, featured) {
  try {
    await apiFetch(`/admin/playlists/${id}/featured`, { method: 'PATCH', body: JSON.stringify({ featured }) });
    toast(featured ? 'Marked as featured' : 'Removed from featured');
  } catch (err) { toast(err.message, 'error'); fetchPlaylists(); }
}

async function deletePlaylist(id) {
  if (!confirm('Delete this playlist?')) return;
  try {
    await apiFetch(`/admin/playlists/${id}`, { method: 'DELETE' });
    toast('Playlist deleted');
    fetchPlaylists();
  } catch (err) { toast(err.message, 'error'); }
}

/* ─── PLAYLIST VIDEO MANAGER (add/remove/reorder videos inside a playlist) ──── */
let pvmVideos = [];       // current playlist's videos, in order
let pvmDraggedId = null;

async function openPlaylistVideoManager(playlistId, playlistName) {
  document.getElementById('playlists-form').classList.remove('open');
  document.getElementById('playlists-import-form').classList.remove('open');
  document.getElementById('pvm-playlist-id').value = playlistId;
  document.getElementById('pvm-playlist-name').textContent = playlistName;
  document.getElementById('pvm-search').value = '';
  document.getElementById('pvm-search-results').style.display = 'none';
  document.getElementById('playlist-videos-manager').classList.add('open');
  await loadPvmVideos(playlistId);
}

async function loadPvmVideos(playlistId) {
  try {
    const data = await apiFetch(`/playlists/${playlistId}`);
    const pl = data.playlist;
    const byId = {};
    (pl.videos || []).forEach(v => { byId[v.id] = v; });
    pvmVideos = (pl.video_ids || []).map(id => byId[id]).filter(Boolean);
    renderPvmList();
  } catch { toast('Failed to load playlist videos', 'error'); }
}

function renderPvmList() {
  const list = document.getElementById('pvm-list');
  if (!pvmVideos.length) {
    list.innerHTML = '<div class="video-list-empty">No videos in this playlist yet — search above to add some.</div>';
    return;
  }
  list.innerHTML = '';
  pvmVideos.forEach((v, i) => list.appendChild(buildPvmRow(v, i)));
}

function buildPvmRow(v, idx) {
  const row = document.createElement('div');
  row.className = 'admin-video-row';
  row.draggable = true;
  row.dataset.id = v.id;
  const thumb = v.youtube_id
    ? `<img src="https://img.youtube.com/vi/${v.youtube_id}/mqdefault.jpg" alt="" loading="lazy">`
    : `<div class="avr-thumb-placeholder">▶</div>`;
  row.innerHTML = `
    <span class="avr-drag" title="Drag to reorder">⠿</span>
    <span class="avr-num">${String(idx+1).padStart(2,'0')}</span>
    <div class="avr-thumb">${thumb}</div>
    <div class="avr-info">
      <div class="avr-title">${escHtml(v.title)}</div>
      <div class="avr-creator">${escHtml(v.creators?.name || '—')}</div>
    </div>
    <span class="avr-duration">${escHtml(v.duration || '—')}</span>
    <div class="td-actions">
      <button class="btn-delete">REMOVE</button>
    </div>`;

  row.querySelector('.btn-delete').addEventListener('click', () => removeFromPvm(v.id));

  row.addEventListener('dragstart', () => {
    pvmDraggedId = v.id;
    setTimeout(() => row.classList.add('dragging'), 0);
  });
  row.addEventListener('dragend', () => {
    row.classList.remove('dragging');
    persistPvmOrder();
  });
  row.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (row.dataset.id === pvmDraggedId) return;
    const list = document.getElementById('pvm-list');
    const dragged = list.querySelector('.admin-video-row.dragging');
    if (!dragged) return;
    const rect = row.getBoundingClientRect();
    const before = (e.clientY - rect.top) < rect.height / 2;
    list.insertBefore(dragged, before ? row : row.nextSibling);
  });

  return row;
}

async function persistPvmOrder() {
  const ids = [...document.querySelectorAll('#pvm-list .admin-video-row')].map(r => r.dataset.id);
  document.querySelectorAll('#pvm-list .avr-num').forEach((el, i) => { el.textContent = String(i+1).padStart(2,'0'); });
  pvmVideos = ids.map(id => pvmVideos.find(v => v.id === id)).filter(Boolean);
  await savePvmVideoIds(ids);
}

async function removeFromPvm(videoId) {
  pvmVideos = pvmVideos.filter(v => v.id !== videoId);
  renderPvmList();
  await savePvmVideoIds(pvmVideos.map(v => v.id));
}

async function savePvmVideoIds(ids) {
  const playlistId = document.getElementById('pvm-playlist-id').value;
  try {
    await apiFetch(`/admin/playlists/${playlistId}`, { method: 'PUT', body: JSON.stringify({ video_ids: ids }) });
    fetchPlaylists();
  } catch (err) { toast('Failed to save: ' + err.message, 'error'); }
}

let pvmSearchTimer;
document.getElementById('pvm-search').addEventListener('input', () => {
  clearTimeout(pvmSearchTimer);
  const q = document.getElementById('pvm-search').value.trim();
  const results = document.getElementById('pvm-search-results');
  if (!q) { results.style.display = 'none'; results.innerHTML = ''; return; }
  pvmSearchTimer = setTimeout(async () => {
    try {
      const data = await apiFetch(`/admin/videos?search=${encodeURIComponent(q)}&limit=8`);
      renderPvmSearchResults(data.videos || []);
    } catch { toast('Search failed', 'error'); }
  }, 350);
});

function renderPvmSearchResults(videos) {
  const results = document.getElementById('pvm-search-results');
  if (!videos.length) {
    results.style.display = 'block';
    results.innerHTML = '<div class="video-list-empty">No matches.</div>';
    return;
  }
  results.style.display = 'block';
  results.innerHTML = '';
  videos.forEach(v => {
    const already = pvmVideos.some(pv => pv.id === v.id);
    const row = document.createElement('div');
    row.className = 'admin-video-row';
    const thumb = v.youtube_id
      ? `<img src="https://img.youtube.com/vi/${v.youtube_id}/mqdefault.jpg" alt="" loading="lazy">`
      : `<div class="avr-thumb-placeholder">▶</div>`;
    row.innerHTML = `
      <span></span>
      <span></span>
      <div class="avr-thumb">${thumb}</div>
      <div class="avr-info">
        <div class="avr-title">${escHtml(v.title)}</div>
        <div class="avr-creator">${escHtml(v.creators?.name || '—')}</div>
      </div>
      <span class="avr-duration">${escHtml(v.duration || '—')}</span>
      <div class="td-actions">
        <button class="btn-edit" ${already ? 'disabled' : ''}>${already ? 'ADDED' : '+ ADD'}</button>
      </div>`;
    if (!already) {
      row.querySelector('.btn-edit').addEventListener('click', async () => {
        pvmVideos.push(v);
        renderPvmList();
        await savePvmVideoIds(pvmVideos.map(pv => pv.id));
        document.getElementById('pvm-search').value = '';
        document.getElementById('pvm-search-results').style.display = 'none';
        toast('Video added');
      });
    }
    results.appendChild(row);
  });
}

document.getElementById('pvm-close-btn').addEventListener('click', () => {
  document.getElementById('playlist-videos-manager').classList.remove('open');
});

/* ─── CREATORS PANEL ────────────────────────────────────────────────────────── */
async function loadCreatorsPanel() {
  try {
    const data = await apiFetch('/admin/creators');
    renderCreatorsTable(data.creators || []);
  } catch { toast('Failed to load creators', 'error'); }
}

function renderCreatorsTable(creators) {
  const tbody = document.getElementById('creators-table-body');
  if (!creators.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-secondary);padding:24px">No creators found.</td></tr>';
    return;
  }
  tbody.innerHTML = creators.map(c => `
    <tr>
      <td>${escHtml(c.name)}</td>
      <td>${escHtml(c.specialty || '—')}</td>
      <td>${escHtml(c.handle || '—')}</td>
      <td>${escHtml(c.subscriber_count || '—')}</td>
      <td>
        <div class="td-actions">
          <button class="btn-edit" onclick="editCreator('${c.id}')">EDIT</button>
          <button class="btn-delete" onclick="deleteCreator('${c.id}')">DELETE</button>
        </div>
      </td>
    </tr>
  `).join('');
}

document.getElementById('creators-add-btn').addEventListener('click', () => {
  clearCreatorForm();
  document.getElementById('creators-form-title').textContent = 'ADD CREATOR';
  document.getElementById('creators-form').classList.add('open');
});
document.getElementById('creators-form-cancel').addEventListener('click', () => {
  document.getElementById('creators-form').classList.remove('open');
});

function clearCreatorForm() {
  ['creator-edit-id','creator-name','creator-specialty','creator-youtube-url','creator-handle','creator-subs']
    .forEach(id => { document.getElementById(id).value = ''; });
}

// Store creators list globally for edit lookup
let creatorsListCache = [];

async function editCreator(id) {
  let creator = creatorsCache.find(c => c.id === id);
  if (!creator) {
    try {
      const data = await apiFetch(`/creators/${id}`);
      creator = data.creator;
    } catch { toast('Failed to load creator', 'error'); return; }
  }
  document.getElementById('creator-edit-id').value       = creator.id;
  document.getElementById('creator-name').value          = creator.name || '';
  document.getElementById('creator-specialty').value     = creator.specialty || '';
  document.getElementById('creator-youtube-url').value   = creator.youtube_url || '';
  document.getElementById('creator-handle').value        = creator.handle || '';
  document.getElementById('creator-subs').value          = creator.subscriber_count || '';
  document.getElementById('creators-form-title').textContent = 'EDIT CREATOR';
  document.getElementById('creators-form').classList.add('open');
}

document.getElementById('creator-save-btn').addEventListener('click', async () => {
  const id              = document.getElementById('creator-edit-id').value;
  const name            = document.getElementById('creator-name').value.trim();
  const specialty       = document.getElementById('creator-specialty').value.trim();
  const youtube_url     = document.getElementById('creator-youtube-url').value.trim();
  const handle          = document.getElementById('creator-handle').value.trim();
  const subscriber_count = document.getElementById('creator-subs').value.trim();

  if (!name) return toast('Name is required', 'error');
  const body = { name, specialty, youtube_url, handle, subscriber_count };
  try {
    if (id) {
      await apiFetch(`/admin/creators/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      toast('Creator updated');
    } else {
      await apiFetch('/admin/creators', { method: 'POST', body: JSON.stringify(body) });
      toast('Creator added');
    }
    document.getElementById('creators-form').classList.remove('open');
    loadCreatorsPanel();
  } catch (err) { toast(err.message, 'error'); }
});

async function deleteCreator(id) {
  if (!confirm('Delete this creator?')) return;
  try {
    await apiFetch(`/admin/creators/${id}`, { method: 'DELETE' });
    toast('Creator deleted');
    loadCreatorsPanel();
  } catch (err) { toast(err.message, 'error'); }
}

/* ─── USERS PANEL ───────────────────────────────────────────────────────────── */
async function loadUsersPanel() {
  const search = document.getElementById('users-search').value.trim();
  const params = search ? `?search=${encodeURIComponent(search)}` : '';
  try {
    const data = await apiFetch(`/admin/users${params}`);
    renderUsersTable(data.users || []);
  } catch { toast('Failed to load users', 'error'); }
}

function renderUsersTable(users) {
  const tbody = document.getElementById('users-table-body');
  const myId  = window.__adminUser?.id;
  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-secondary);padding:24px">No users found.</td></tr>';
    return;
  }
  tbody.innerHTML = users.map(u => `
    <tr>
      <td>${escHtml(u.username)}</td>
      <td>${escHtml(u.email)}</td>
      <td>
        ${u.id === myId
          ? `<span class="badge badge-accent">${escHtml(u.role)}</span>`
          : `<select class="role-select" data-user-id="${u.id}" style="background:var(--bg-card);border:1px solid var(--border);color:var(--text-primary);padding:4px 8px;font-size:11px;border-radius:3px;">
               <option value="user"  ${u.role === 'user'  ? 'selected' : ''}>user</option>
               <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>admin</option>
             </select>`}
      </td>
      <td>${formatDate(u.created_at)}</td>
      <td>—</td>
    </tr>
  `).join('');

  // Role change handlers
  tbody.querySelectorAll('.role-select').forEach(sel => {
    sel.addEventListener('change', async () => {
      try {
        await apiFetch(`/admin/users/${sel.dataset.userId}/role`, { method: 'PATCH', body: JSON.stringify({ role: sel.value }) });
        toast('Role updated');
      } catch (err) { toast(err.message, 'error'); loadUsersPanel(); }
    });
  });
}

let usersSearchTimer;
document.getElementById('users-search').addEventListener('input', () => {
  clearTimeout(usersSearchTimer);
  usersSearchTimer = setTimeout(loadUsersPanel, 350);
});

/* ─── COURSES PANEL ─────────────────────────────────────────────────────────── */
async function loadCoursesPanel() {
  try {
    const data = await apiFetch('/admin/courses');
    renderCoursesTable(data.courses || []);
  } catch { toast('Failed to load courses', 'error'); }
}

function renderCoursesTable(courses) {
  const tbody = document.getElementById('courses-table-body');
  if (!courses.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-secondary);padding:24px">No courses found.</td></tr>';
    return;
  }
  tbody.innerHTML = courses.map(c => `
    <tr>
      <td>${escHtml(c.title)}</td>
      <td>${escHtml(c.educator || '—')}</td>
      <td>${escHtml(c.price || '—')}</td>
      <td><span class="badge ${c.active ? 'badge-green' : 'badge-gray'}">${c.active ? 'ACTIVE' : 'INACTIVE'}</span></td>
      <td>
        <div class="td-actions">
          <button class="btn-edit" onclick="editCourse('${c.id}')">EDIT</button>
          <button class="btn-delete" onclick="deleteCourse('${c.id}')">DELETE</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Keep courses in memory for edit
let coursesCache = [];

document.getElementById('courses-add-btn').addEventListener('click', () => {
  clearCourseForm();
  document.getElementById('courses-form-title').textContent = 'ADD COURSE';
  document.getElementById('courses-form').classList.add('open');
});
document.getElementById('courses-form-cancel').addEventListener('click', () => {
  document.getElementById('courses-form').classList.remove('open');
});

function clearCourseForm() {
  ['course-edit-id','course-title','course-educator','course-price','course-affiliate-url','course-thumbnail','course-description']
    .forEach(id => { document.getElementById(id).value = ''; });
  document.getElementById('course-active').checked = true;
}

async function editCourse(id) {
  try {
    const data = await apiFetch('/admin/courses');
    const c = (data.courses || []).find(x => x.id === id);
    if (!c) throw new Error('Not found');
    document.getElementById('course-edit-id').value       = c.id;
    document.getElementById('course-title').value         = c.title || '';
    document.getElementById('course-educator').value      = c.educator || '';
    document.getElementById('course-price').value         = c.price || '';
    document.getElementById('course-affiliate-url').value = c.affiliate_url || '';
    document.getElementById('course-thumbnail').value     = c.thumbnail_url || '';
    document.getElementById('course-description').value   = c.description || '';
    document.getElementById('course-active').checked      = !!c.active;
    document.getElementById('courses-form-title').textContent = 'EDIT COURSE';
    document.getElementById('courses-form').classList.add('open');
  } catch { toast('Failed to load course', 'error'); }
}

document.getElementById('course-save-btn').addEventListener('click', async () => {
  const id            = document.getElementById('course-edit-id').value;
  const title         = document.getElementById('course-title').value.trim();
  const educator      = document.getElementById('course-educator').value.trim();
  const price         = document.getElementById('course-price').value.trim();
  const affiliate_url = document.getElementById('course-affiliate-url').value.trim();
  const thumbnail_url = document.getElementById('course-thumbnail').value.trim();
  const description   = document.getElementById('course-description').value.trim();
  const active        = document.getElementById('course-active').checked;

  if (!title) return toast('Title is required', 'error');
  const body = { title, educator, price, affiliate_url, thumbnail_url, description, active };
  try {
    if (id) {
      await apiFetch(`/admin/courses/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      toast('Course updated');
    } else {
      await apiFetch('/admin/courses', { method: 'POST', body: JSON.stringify(body) });
      toast('Course added');
    }
    document.getElementById('courses-form').classList.remove('open');
    loadCoursesPanel();
  } catch (err) { toast(err.message, 'error'); }
});

async function deleteCourse(id) {
  if (!confirm('Delete this course?')) return;
  try {
    await apiFetch(`/admin/courses/${id}`, { method: 'DELETE' });
    toast('Course deleted');
    loadCoursesPanel();
  } catch (err) { toast(err.message, 'error'); }
}

/* ─── SETTINGS PANEL ────────────────────────────────────────────────────────── */
async function loadSettingsPanel() {
  try {
    const data = await apiFetch('/settings');
    const s = data.settings || {};
    document.getElementById('setting-site-title').value = s.site_title || 'Keyframe';
    document.getElementById('setting-tagline').value    = s.tagline || '';
    const accent = s.accent_color || '#FF4D00';
    document.getElementById('setting-accent').value = accent;
    document.documentElement.style.setProperty('--accent', accent);
    localStorage.setItem('ae_accent', accent);
    document.getElementById('setting-hero-line1').value = s.hero_line1 || 'MASTER';
    document.getElementById('setting-hero-line2').value = s.hero_line2 || 'AFTER EFFECTS.';
    document.getElementById('setting-marquee').value    = s.marquee_text || '';
    // About section
    document.getElementById('setting-about-title').value  = s.about_title  || '';
    document.getElementById('setting-about-body').value   = s.about_body   || '';
    document.getElementById('setting-about-body2').value  = s.about_body2  || '';
    document.getElementById('setting-about-m1').value     = s.about_m1     || '';
    document.getElementById('setting-about-m2').value     = s.about_m2     || '';
    document.getElementById('setting-about-m3').value     = s.about_m3     || '';
    // Kit
    document.getElementById('setting-kit-form-id').value  = s.kit_form_id  || '';
    // Homepage section visibility — checked (visible) unless explicitly set to 'false'
    ['roadmap','playlists','creators','about','courses','faq'].forEach(id => {
      const el = document.getElementById(`setting-section-${id}`);
      if (el) el.checked = s[`section_${id}_visible`] !== 'false';
    });
  } catch { toast('Could not load settings', 'error'); }
}

document.getElementById('settings-save-btn').addEventListener('click', async () => {
  const settings = {
    site_title:   document.getElementById('setting-site-title').value.trim(),
    tagline:      document.getElementById('setting-tagline').value.trim(),
    accent_color: document.getElementById('setting-accent').value,
    hero_line1:   document.getElementById('setting-hero-line1').value.trim(),
    hero_line2:   document.getElementById('setting-hero-line2').value.trim(),
    marquee_text: document.getElementById('setting-marquee').value.trim(),
    about_title:  document.getElementById('setting-about-title').value.trim(),
    about_body:   document.getElementById('setting-about-body').value.trim(),
    about_body2:  document.getElementById('setting-about-body2').value.trim(),
    about_m1:     document.getElementById('setting-about-m1').value.trim(),
    about_m2:     document.getElementById('setting-about-m2').value.trim(),
    about_m3:     document.getElementById('setting-about-m3').value.trim(),
    kit_form_id:  document.getElementById('setting-kit-form-id').value.trim(),
  };
  ['roadmap','playlists','creators','about','courses','faq'].forEach(id => {
    const el = document.getElementById(`setting-section-${id}`);
    if (el) settings[`section_${id}_visible`] = el.checked ? 'true' : 'false';
  });
  try {
    await apiFetch('/admin/settings', { method: 'POST', body: JSON.stringify(settings) });
    toast('Settings saved');
    document.documentElement.style.setProperty('--accent', settings.accent_color);
    localStorage.setItem('ae_accent', settings.accent_color);
  } catch (err) { toast(err.message, 'error'); }
});

/* ─── BACKUP / RESTORE PANEL ────────────────────────────────────────────────── */
function loadDataPanel() {
  // Export
  document.getElementById('backup-export-btn').onclick = async () => {
    const btn = document.getElementById('backup-export-btn');
    const status = document.getElementById('backup-status');
    btn.textContent = 'EXPORTING...'; btn.disabled = true;
    status.textContent = '';
    try {
      const data = await apiFetch('/admin/backup');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `aepath-backup-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      status.style.color = '#4CAF50';
      status.textContent = `✓ Backup exported — ${Object.entries(data.tables).map(([k,v])=>`${v.length} ${k}`).join(', ')}`;
      toast('Backup downloaded');
    } catch (err) {
      status.style.color = 'var(--accent)';
      status.textContent = '✗ Export failed: ' + err.message;
      toast(err.message, 'error');
    } finally { btn.textContent = '⬇ DOWNLOAD BACKUP JSON'; btn.disabled = false; }
  };

  // File picker
  const fileInput  = document.getElementById('restore-file');
  const restoreBtn = document.getElementById('restore-btn');
  const filename   = document.getElementById('restore-filename');
  let   restoreData = null;

  fileInput.onchange = () => {
    const file = fileInput.files[0];
    if (!file) return;
    filename.textContent = file.name;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        restoreData = JSON.parse(e.target.result);
        restoreBtn.disabled = false;
        filename.textContent = `✓ ${file.name} — ready to restore`;
        filename.style.color = '#4CAF50';
      } catch {
        filename.textContent = '✗ Invalid JSON file';
        filename.style.color = 'var(--accent)';
        restoreBtn.disabled = true;
      }
    };
    reader.readAsText(file);
  };

  // Drag-and-drop
  const dropZone = document.getElementById('restore-drop-zone');
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.style.borderColor = 'var(--accent)'; });
  dropZone.addEventListener('dragleave', () => { dropZone.style.borderColor = 'var(--border)'; });
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--border)';
    const file = e.dataTransfer.files[0];
    if (!file) return;
    fileInput.files = e.dataTransfer.files;
    fileInput.dispatchEvent(new Event('change'));
  });

  restoreBtn.onclick = async () => {
    if (!restoreData) return;
    const status = document.getElementById('restore-status');
    restoreBtn.textContent = 'RESTORING...'; restoreBtn.disabled = true;
    status.textContent = '';
    try {
      const result = await apiFetch('/admin/restore', {
        method: 'POST',
        body: JSON.stringify({ tables: restoreData.tables })
      });
      status.style.color = '#4CAF50';
      status.textContent = '✓ Restore complete:\n' +
        Object.entries(result.results).map(([k,v]) => `  ${k}: ${v}`).join('\n');
      toast('Restore complete');
    } catch (err) {
      status.style.color = 'var(--accent)';
      status.textContent = '✗ Restore failed: ' + err.message;
      toast(err.message, 'error');
    } finally { restoreBtn.textContent = '↑ RESTORE FROM FILE'; restoreBtn.disabled = false; }
  };
}

/* ─── INIT ──────────────────────────────────────────────────────────────────── */
(async function init() {
  await authGuard();
  // Sync accent color from DB (keeps admin in sync with saved value)
  try {
    const d = await apiFetch('/settings');
    if (d.settings?.accent_color) {
      document.documentElement.style.setProperty('--accent', d.settings.accent_color);
      localStorage.setItem('ae_accent', d.settings.accent_color);
    }
  } catch {}
  loadDashboard();

})();
