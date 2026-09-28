const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { makeCatalog, readTables } = require('./catalog.cjs');
const root = path.resolve(__dirname, '..');

async function build() {
  const envFile = path.join(root, 'aelearning/backend/.env');
  if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
  const catalog = makeCatalog(await readTables());
  if (!catalog.videos.length || !catalog.creators.length) {
    throw new Error('The catalog has no videos or creators. Refusing to replace the site with an empty catalog.');
  }
  const source = path.join(root, 'aelearning/frontend');
  const output = path.join(root, 'dist');
  if (path.dirname(output) !== root || path.basename(output) !== 'dist') throw new Error('Invalid build output directory.');
  // Exact, fixed build folder only. Data must export successfully before replacement.
  fs.rmSync(output, { recursive:true, force:true });
  fs.mkdirSync(output, { recursive:true });
  fs.cpSync(source, output, { recursive:true, filter:file => !path.basename(file).startsWith('.') && !file.endsWith('README.md') });
  const data = JSON.stringify(catalog);
  const hash = crypto.createHash('sha256').update(data).digest('hex').slice(0,16);
  fs.mkdirSync(path.join(output, 'data'), { recursive:true });
  fs.writeFileSync(path.join(output, `data/catalog.${hash}.json`), data);
  const apiBase = process.env.KEYFRAME_API_BASE || 'https://keyframe.onrender.com/api';
  if (new URL(apiBase).protocol !== 'https:') throw new Error('KEYFRAME_API_BASE must use HTTPS.');
  fs.writeFileSync(path.join(output, 'site-config.js'), `window.KEYFRAME_CONFIG = ${JSON.stringify({
    staticCatalog:true, catalogUrl:`/data/catalog.${hash}.json`, apiBase
  })};\n`);
  let homepage = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
  const totalVideos = catalog.videos.length.toLocaleString('en-US');
  const totalCreators = catalog.creators.length.toLocaleString('en-US');
  homepage = homepage.replace(/2,400\+/g, totalVideos).replace(/180\+/g, totalCreators)
    .replace(/50\+<\/span>\s*<span class="stat-label">Paths/, `${catalog.playlists.length}</span><span class="stat-label">Playlists`);
  // Replace the old sample paid-course cards with actual published content.
  const esc = value => String(value || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cards = catalog.courses.slice(0,2).map(c => `<div class="course-card-preview"><div><div style="font-family:var(--font-display);font-size:20px">${esc(c.title)}</div><div>${esc(c.educator)}</div><div>${esc(c.price)}</div></div><a class="btn btn-ghost" href="/courses">VIEW COURSE →</a></div>`).join('');
  homepage = homepage.replace(/<div class="courses-right reveal">[\s\S]*?(?=\n      <\/div>\n    <\/div>\n  <\/section>)/, `<div class="courses-right reveal">${cards || '<p>New courses are being curated. Check back soon.</p>'}</div>`);
  fs.writeFileSync(path.join(output, 'index.html'), homepage);
  // All root-relative media must ship with the site; a missing image fails the build.
  for (const item of [...catalog.creators, ...catalog.courses]) {
    for (const key of ['avatar_url','banner_url','thumbnail_url']) {
      const media = item[key];
      if (typeof media === 'string' && media.startsWith('/') && !media.startsWith('//')) {
        const file = path.resolve(output, '.' + media.split('?')[0]);
        if (!file.startsWith(output + path.sep) || !fs.existsSync(file)) throw new Error(`Missing local image for ${item.name || item.title}: ${media}`);
      }
    }
  }
  fs.writeFileSync(path.join(output, '_headers'), '/data/*\n  Cache-Control: public, max-age=31536000, immutable\n/site-config.js\n  Cache-Control: no-cache\n/uploads/*\n  Cache-Control: public, max-age=3600\n/fonts/*\n  Cache-Control: public, max-age=604800\n/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n');
  console.log(`Built dist: ${catalog.videos.length} videos, ${catalog.creators.length} creators, ${catalog.playlists.length} playlists, ${catalog.courses.length} active courses. No database credentials are included.`);
}
build().catch(error => { console.error(error.message); process.exitCode = 1; });
