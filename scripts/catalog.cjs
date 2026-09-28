const { curate } = require('./curate-catalog.cjs');
const FIELDS = {
  videos: 'id,title,youtube_url,youtube_id,creator_id,level,description,tags,duration,sort_order,created_at,embeddable',
  creators: 'id,name,specialty,youtube_url,handle,subscriber_count,avatar_url,banner_url,created_at',
  playlists: 'id,name,description,creator_id,video_ids,featured,youtube_playlist_url,created_at',
  courses: 'id,title,educator,description,price,affiliate_url,thumbnail_url,active,created_at'
};
const PUBLIC_SETTINGS = new Set([
  'site_title', 'tagline', 'hero_line1', 'hero_line2', 'marquee_text', 'accent_color',
  'about_title', 'about_body', 'about_body2', 'about_m1', 'about_m2', 'about_m3',
  ...['roadmap','playlists','creators','about','courses','faq'].map(k => `section_${k}_visible`)
]);
const TAGS = {
  'Motion design':'motion', 'VFX / cinematic':'vfx', 'Element 3D':'element3d',
  'Shape layers':'shape', 'SaaS explainer':'saas', 'AMV / anime edit':'amv',
  'Music visualizer':'musicviz', 'Kinetic typography':'type', 'Retro / vintage':'retro',
  'VOX / documentary':'vox', 'Expressions / scripting':'expressions',
  'Business / freelance':'biz', 'International':'intl', 'Niche':'niche', 'Other':'other'
};
function pick(row, fields) {
  return Object.fromEntries(fields.split(',').filter(k => row[k] !== undefined).map(k => [k,row[k]]));
}
function makeCatalog(tables) {
  for (const name of [...Object.keys(FIELDS), 'settings']) {
    if (!Array.isArray(tables[name])) throw new Error(`Missing ${name} data; refusing an incomplete publication.`);
  }
  tables = curate(tables);
  const videos = tables.videos.map(v => pick(v, FIELDS.videos));
  videos.sort((a,b) => (a.sort_order ?? Infinity) - (b.sort_order ?? Infinity)
    || String(b.created_at || '').localeCompare(String(a.created_at || '')));
  // Personal playlists are excluded unless an admin explicitly featured them.
  const playlists = tables.playlists.filter(p => !p.user_id || p.featured === true)
    .map(p => pick(p, FIELDS.playlists))
    .sort((a,b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  const creators = tables.creators.map(c => ({
    ...pick(c, FIELDS.creators),
    videos: videos.filter(v => v.creator_id === c.id).length,
    playlists: playlists.filter(p => p.creator_id === c.id).length,
    tags: (c.specialty || '').split(',').map(s => s.trim()).filter(Boolean).map(s => TAGS[s] || s.toLowerCase())
  })).sort((a,b) => a.name.localeCompare(b.name));
  const courses = tables.courses.filter(c => c.active === true).map(c => pick(c, FIELDS.courses));
  const settings = Object.fromEntries(tables.settings.filter(s => PUBLIC_SETTINGS.has(s.key)).map(s => [s.key,s.value]));
  return { version:1, publishedAt:new Date().toISOString(), videos, creators, playlists, courses, settings };
}
async function readTables(env = process.env, request = fetch) {
  const base = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the build environment. Never put the service key in frontend files.');
  const url = new URL(base);
  if (url.protocol !== 'https:') throw new Error('SUPABASE_URL must use HTTPS.');
  const entries = await Promise.all([...Object.keys(FIELDS), 'settings'].map(async table => {
    const rows = [];
    // Fetch every row, including catalogs larger than Supabase's default 1,000-row limit.
    for (let offset = 0; ; offset += 500) {
      const query = new URL(`/rest/v1/${table}`, url.origin);
      // Read optional schema fields server-side, then explicitly allowlist public output.
      query.searchParams.set('select', '*');
      query.searchParams.set('order', table === 'settings' ? 'key.asc' : 'id.asc');
      query.searchParams.set('offset', String(offset));
      query.searchParams.set('limit', '500');
      let response;
      try {
        response = await request(query, { headers:{ apikey:key, Authorization:`Bearer ${key}` }, signal:AbortSignal.timeout(20000) });
      } catch (error) {
        throw new Error(`Cannot read ${table} from Supabase (${error.cause?.code || error.name}). Check that the project is active.`);
      }
      if (!response.ok) throw new Error(`Supabase ${table} request returned HTTP ${response.status}; publication stopped.`);
      const page = await response.json();
      if (!Array.isArray(page)) throw new Error(`Invalid ${table} response.`);
      rows.push(...page);
      if (page.length < 500) break;
    }
    return [table,rows];
  }));
  return Object.fromEntries(entries);
}
module.exports = { makeCatalog, readTables };
