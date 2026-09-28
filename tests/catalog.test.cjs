const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { makeCatalog, readTables } = require('../scripts/catalog.cjs');
const client = require('../aelearning/frontend/catalog-client.js');
function tables() {
  return {
    creators:[{ id:'c1', name:'Test Creator', specialty:'Motion design', email:'private@example.test' }],
    videos:[{ id:'v1', title:'First Motion Lesson', creator_id:'c1', level:'beginner', youtube_id:'testvideo01', sort_order:2 }, { id:'v2', title:'Second Lesson', creator_id:'c1', level:'advanced', sort_order:1 }],
    playlists:[{ id:'p1', name:'Published collection', video_ids:['v2','v1'], creator_id:'c1', featured:true }, { id:'private', user_id:'secret-user', name:'Private collection', video_ids:[], featured:false }],
    courses:[{ id:'co1', title:'Active course', educator:'Educator', price:'$20', active:true, affiliate_url:'https://example.test/course' }, { id:'hidden', active:false }],
    settings:[{ key:'accent_color',value:'#abcdef' }, { key:'secret',value:'must-not-export' }]
  };
}
test('publication omits private data, personal playlists and inactive courses', () => {
  const c = makeCatalog(tables());
  assert.deepEqual(c.playlists.map(p=>p.id),['p1']);
  assert.deepEqual(c.courses.map(p=>p.id),['co1']);
  assert.deepEqual(c.settings,{accent_color:'#abcdef'});
  assert.equal(JSON.stringify(c).includes('private@example.test'),false);
  assert.equal(JSON.stringify(c).includes('secret-user'),false);
  assert.equal(c.creators[0].playlists,1);
  assert.deepEqual(c.creators[0].tags,['motion']);
});
test('catalog preserves curriculum and playlist order, joins creator and thumbnail', () => {
  const c = makeCatalog(tables());
  assert.deepEqual(client.query(c,'/videos?limit=500').videos.map(v=>v.id),['v2','v1']);
  assert.equal(client.query(c,'/videos?level=beginner').videos[0].creators.name,'Test Creator');
  const p = client.query(c,'/playlists/p1').playlist;
  assert.deepEqual(p.videos.map(v=>v.id),['v2','v1']);
  assert.equal(p.video_count,2);
  assert.throws(()=>client.query(c,'/playlists/private'),/not found/);
});
test('search, empty results, pagination and course mappings work without an API', () => {
  const c = makeCatalog(tables());
  assert.equal(client.query(c,'/search?q=MOTION').videos.length,1);
  assert.equal(client.query(c,'/search?q=MOTION').creators.length,1);
  assert.equal(client.query(c,'/search?q=missing').videos.length,0);
  assert.equal(client.query(c,'/videos?offset=1&limit=1').videos[0].id,'v1');
  assert.equal(client.query(c,'/videos?limit=0').videos.length,0);
  assert.equal(client.query(c,'/courses').courses[0].url,'https://example.test/course');
});
test('public catalog requests coalesce and never send account tokens', async () => {
  const requests = [];
  const context = { URL, module:{exports:{}}, KEYFRAME_CONFIG:{staticCatalog:true,catalogUrl:'/data/catalog.test.json'},
    fetch:async (url,opts)=> { requests.push({url,opts}); return {ok:true,json:async()=>makeCatalog(tables())}; } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../aelearning/frontend/catalog-client.js'),'utf8'),context);
  const api = context.module.exports;
  await Promise.all(['/settings','/videos','/creators','/playlists'].map(p=>api.request(p)));
  assert.equal(requests.length,1);
  assert.equal(requests[0].url,'/data/catalog.test.json');
  assert.equal(requests[0].opts.credentials,'omit');
  for (const p of ['/auth/login','/admin/videos','/user/dashboard','/subscribe','/playlists?user_id=123']) assert.equal(api.supports(p),false);
  assert.equal(api.supports('/playlists',{method:'POST'}),false);
});
test('export reads beyond 1,000 rows and stops on database failure', async () => {
  const source = tables(); source.videos = Array.from({length:1105},(_,i)=>({id:`v${i}`}));
  const result = await readTables({SUPABASE_URL:'https://database.example.test', SUPABASE_SERVICE_ROLE_KEY:'secret'}, async url => {
    const table = url.pathname.split('/').pop();
    const offset = Number(url.searchParams.get('offset'));
    return { ok:true, json:async()=>source[table].slice(offset,offset+500) };
  });
  assert.equal(result.videos.length,1105);
  await assert.rejects(readTables({SUPABASE_URL:'https://database.example.test',SUPABASE_SERVICE_ROLE_KEY:'secret'},async()=>({ok:false,status:503})),/publication stopped/);
});
test('all frontend scripts and inline page scripts parse', () => {
  const dir = path.join(__dirname,'../aelearning/frontend');
  const walk = dir => fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
  for (const file of walk(dir)) {
    if (file.endsWith('.js')) new vm.Script(fs.readFileSync(file,'utf8'),{filename:file});
    if (file.endsWith('.html')) {
      const source = fs.readFileSync(file,'utf8');
      for (const match of source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) if (match[1].trim()) new vm.Script(match[1],{filename:file});
      if (/src="(?:\/shared\.js|script\.js|admin\.js)"/.test(source)) {
        assert.ok(source.indexOf('site-config.js') < source.search(/src="(?:\/shared\.js|script\.js|admin\.js)"/));
      }
    }
  }
});
