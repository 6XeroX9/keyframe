(function(root) {
  'use strict';
  let pending;
  const config = () => root.KEYFRAME_CONFIG || {};
  const contains = (value, q) => String(value || '').toLowerCase().includes(q);
  function supports(route, opts = {}) {
    if (!config().staticCatalog || (opts.method || 'GET').toUpperCase() !== 'GET') return false;
    const url = new URL(route, 'https://catalog.local');
    if (url.searchParams.has('user_id')) return false;
    return /^\/(videos|creators|playlists)(\/[^/]+)?$/.test(url.pathname) || ['/settings','/search','/courses'].includes(url.pathname);
  }
  async function load() {
    if (!pending) {
      pending = fetch(config().catalogUrl, { credentials:'omit' }).then(r => {
        if (!r.ok) throw new Error('The tutorial catalog is temporarily unavailable. Please reload.');
        return r.json();
      }).then(data => {
        if (data.version !== 1 || !['videos','creators','playlists','courses'].every(k => Array.isArray(data[k]))) throw new Error('Invalid tutorial catalog. Please reload.');
        return data;
      }).catch(error => { pending = null; throw error; });
    }
    return pending;
  }
  function query(catalog, route) {
    const url = new URL(route, 'https://catalog.local');
    const [kind, id] = url.pathname.slice(1).split('/');
    const params = url.searchParams;
    const creator = id => catalog.creators.find(c => c.id === id) || null;
    const video = v => ({ ...v, creators:creator(v.creator_id) });
    const playlist = p => ({ ...p, creators:creator(p.creator_id), video_count:(p.video_ids || []).length,
      youtube_id:catalog.videos.find(v => v.id === p.video_ids?.[0])?.youtube_id || null });
    const slice = (rows, fallback) => {
      const number = (key, def) => { const n = Number(params.get(key)); return params.has(key) && Number.isFinite(n) ? Math.max(0,Math.floor(n)) : def; };
      const start = number('offset',0);
      return rows.slice(start, start + number('limit',fallback));
    };
    if (kind === 'settings') return { settings:catalog.settings };
    if (kind === 'search') {
      const q = (params.get('q') || '').trim().toLowerCase();
      return { videos:q ? catalog.videos.filter(v => contains(v.title,q)).slice(0,24).map(video) : [],
        creators:q ? catalog.creators.filter(c => contains(c.name,q) || contains(c.specialty,q)).slice(0,12) : [] };
    }
    if (kind === 'videos') {
      if (id) { const v = catalog.videos.find(v => v.id === id); if (!v) throw new Error('Video not found'); return { video:video(v) }; }
      let rows = catalog.videos;
      for (const key of ['level','creator_id']) if (params.has(key)) rows = rows.filter(v => v[key] === params.get(key));
      if (params.has('search')) rows = rows.filter(v => contains(v.title,params.get('search').toLowerCase()));
      return { videos:slice(rows,20).map(video) };
    }
    if (kind === 'creators') {
      if (!id) return { creators:catalog.creators };
      const c = creator(id); if (!c) throw new Error('Creator not found');
      return { creator:{ ...c, videos:catalog.videos.filter(v => v.creator_id === id) } };
    }
    if (kind === 'playlists') {
      if (id) {
        const p = catalog.playlists.find(p => p.id === id); if (!p) throw new Error('Playlist not found');
        return { playlist:{ ...playlist(p), videos:(p.video_ids || []).map(id => catalog.videos.find(v => v.id === id)).filter(Boolean).map(video) } };
      }
      let rows = catalog.playlists;
      if (params.get('featured') === 'true') rows = rows.filter(p => p.featured);
      if (params.has('creator_id')) rows = rows.filter(p => p.creator_id === params.get('creator_id'));
      return { playlists:slice(rows,rows.length).map(playlist) };
    }
    if (kind === 'courses') return { courses:slice(catalog.courses,catalog.courses.length).map(c => ({
      ...c, instructor:c.educator, desc:c.description, url:c.affiliate_url,
      price:!c.price || /^(free|0(?:\.00)?)$/i.test(String(c.price)) ? 'free' : 'paid', price_label:c.price
    })) };
    throw new Error('Unknown catalog route');
  }
  function showError(message) {
    if (typeof document === 'undefined' || document.getElementById('catalog-error')) return;
    const el = document.createElement('div');
    el.id = 'catalog-error'; el.setAttribute('role','alert');
    el.style.cssText = 'position:fixed;bottom:16px;left:16px;right:16px;z-index:9999;padding:16px;background:#222;color:#fff;border:1px solid #ff4d00;font:14px sans-serif';
    el.textContent = message;
    document.body.appendChild(el);
  }
  const client = { supports, query, load, showError, async request(route) {
    try { return query(await load(),route); } catch (error) { showError(error.message); throw error; }
  }};
  root.KeyframeCatalog = client;
  if (typeof module !== 'undefined') module.exports = client;
})(typeof window !== 'undefined' ? window : globalThis);
