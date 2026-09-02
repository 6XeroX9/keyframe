const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const yt = require('../utils/youtube');

// ─── STATS ───────────────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [
      { count: total_videos },
      { count: total_users },
      { count: total_playlists },
      { count: total_creators }
    ] = await Promise.all([
      supabase.from('videos').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('playlists').select('*', { count: 'exact', head: true }),
      supabase.from('creators').select('*', { count: 'exact', head: true })
    ]);

    // Recent signups: last 7 days grouped by day
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const { data: recentUsers } = await supabase
      .from('users')
      .select('created_at')
      .gte('created_at', since.toISOString());

    return res.json({ total_videos, total_users, total_playlists, total_creators, recent_users: recentUsers || [] });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// ─── VIDEOS ──────────────────────────────────────────────────────────────────
router.get('/videos', async (req, res) => {
  try {
    const { search, level, limit = 50, offset = 0 } = req.query;
    let query = supabase
      .from('videos')
      .select('*, creators(id, name)')
      .range(Number(offset), Number(offset) + Number(limit) - 1)
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (search) query = query.ilike('title', `%${search}%`);
    if (level) query = query.eq('level', level);

    const { data, error, count } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ videos: data || [], count });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/videos/reorder', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'ids array is required' });

    await Promise.all(ids.map((id, i) =>
      supabase.from('videos').update({ sort_order: i }).eq('id', id)
    ));

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/videos', async (req, res) => {
  try {
    const { title, youtube_url, creator_id, level, description, tags, duration } = req.body;
    if (!title || !youtube_url) return res.status(400).json({ error: 'Title and YouTube URL are required' });

    const youtubeId = extractYoutubeId(youtube_url);

    const { data, error } = await supabase
      .from('videos')
      .insert([{ title, youtube_url, youtube_id: youtubeId, creator_id, level, description, tags: tags || [], duration }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ video: data });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

router.put('/videos/:id', async (req, res) => {
  try {
    const { title, youtube_url, creator_id, level, description, tags, duration } = req.body;
    const updates = { title, creator_id, level, description, tags, duration };
    if (youtube_url) {
      updates.youtube_url = youtube_url;
      updates.youtube_id = extractYoutubeId(youtube_url);
    }

    const { data, error } = await supabase
      .from('videos')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ video: data });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/videos/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('videos').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// ─── PLAYLISTS ────────────────────────────────────────────────────────────────
router.get('/playlists', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('playlists')
      .select('*, creators(id, name)')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    const playlists = (data || []).map(p => ({ ...p, video_count: Array.isArray(p.video_ids) ? p.video_ids.length : 0 }));
    return res.json({ playlists });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/playlists', async (req, res) => {
  try {
    const { name, description, creator_id, video_ids, featured } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const { data, error } = await supabase
      .from('playlists')
      .insert([{ name, description, creator_id, video_ids: video_ids || [], featured: !!featured }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ playlist: data });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

router.put('/playlists/:id', async (req, res) => {
  try {
    const { name, description, creator_id, video_ids, featured } = req.body;
    const { data, error } = await supabase
      .from('playlists')
      .update({ name, description, creator_id, video_ids, featured })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ playlist: data });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/playlists/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('playlists').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/playlists/:id/featured', async (req, res) => {
  try {
    const { featured } = req.body;
    const { data, error } = await supabase
      .from('playlists')
      .update({ featured: !!featured })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ playlist: data });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/playlists/import', async (req, res) => {
  try {
    if (!process.env.YOUTUBE_API_KEY) return res.status(500).json({ error: 'YouTube API key not configured' });

    const { playlist_url, name: nameOverride } = req.body;
    if (!playlist_url) return res.status(400).json({ error: 'playlist_url is required' });

    const playlistId = yt.extractPlaylistId(playlist_url);
    if (!playlistId) return res.status(400).json({ error: 'Could not extract a playlist ID from that URL' });

    const { data: existing } = await supabase
      .from('playlists')
      .select('id, name')
      .eq('youtube_playlist_url', playlist_url)
      .maybeSingle();
    if (existing) return res.status(409).json({ error: `Already imported as "${existing.name}"`, playlist: existing });

    const meta = await yt.fetchPlaylistMeta(playlistId);
    if (!meta) return res.status(404).json({ error: 'Playlist not found on YouTube (check it is public/unlisted)' });

    const items = await yt.fetchAllPlaylistItems(playlistId);
    const validItems = items.filter(it => it.contentDetails?.videoId && it.snippet?.title !== 'Deleted video' && it.snippet?.title !== 'Private video');
    const videoIds = validItems.map(it => it.contentDetails.videoId);
    const detailsMap = await yt.fetchVideosDetails(videoIds);

    // Resolve/create a creator per unique channel encountered
    const creatorCache = {};
    async function resolveCreator(channelId, channelTitle) {
      if (creatorCache[channelId]) return creatorCache[channelId];

      // Fetch channel details first so we can match existing creators by handle/URL,
      // not just display name — imported creator names can differ in case/spacing
      // from names already in the DB (e.g. "vanemotion" vs "Vane Motion").
      let channel = null;
      try { channel = await yt.fetchChannelById(channelId); } catch { /* fall through to name match */ }
      const customUrl = channel?.snippet?.customUrl || null; // e.g. "@vanemotion"

      if (customUrl) {
        const { data: byHandle } = await supabase
          .from('creators')
          .select('id')
          .or(`handle.ilike.${customUrl},youtube_url.ilike.%${customUrl.replace('@', '')}%`)
          .maybeSingle();
        if (byHandle) { creatorCache[channelId] = byHandle.id; return byHandle.id; }
      }

      const { data: byName } = await supabase
        .from('creators')
        .select('id')
        .ilike('name', channelTitle)
        .maybeSingle();
      if (byName) { creatorCache[channelId] = byName.id; return byName.id; }

      const insertRow = { name: channelTitle };
      if (channel) {
        insertRow.avatar_url = channel.snippet?.thumbnails?.high?.url || channel.snippet?.thumbnails?.default?.url || null;
        insertRow.banner_url = channel.brandingSettings?.image?.bannerExternalUrl || null;
        insertRow.subscriber_count = yt.formatSubCount(channel.statistics?.subscriberCount);
        insertRow.youtube_url = customUrl ? `https://www.youtube.com/${customUrl}` : `https://www.youtube.com/channel/${channelId}`;
        insertRow.handle = customUrl || null;
      }

      const { data: created, error: createErr } = await supabase.from('creators').insert([insertRow]).select('id').single();
      if (createErr) throw createErr;
      creatorCache[channelId] = created.id;
      return created.id;
    }

    const videoIdsInOrder = [];
    let importedCount = 0, reusedCount = 0;
    const newCreatorIdsBefore = new Set();

    for (const item of validItems) {
      const vId = item.contentDetails.videoId;
      const channelId = item.snippet.videoOwnerChannelId || meta.snippet.channelId;
      const channelTitle = item.snippet.videoOwnerChannelTitle || meta.snippet.channelTitle;

      const { data: existingVideo } = await supabase
        .from('videos')
        .select('id')
        .eq('youtube_id', vId)
        .maybeSingle();

      if (existingVideo) {
        videoIdsInOrder.push(existingVideo.id);
        reusedCount++;
        continue;
      }

      const creatorId = await resolveCreator(channelId, channelTitle);
      const detail = detailsMap[vId];
      const { data: newVideo, error: videoErr } = await supabase
        .from('videos')
        .insert([{
          title: item.snippet.title,
          youtube_url: `https://www.youtube.com/watch?v=${vId}`,
          youtube_id: vId,
          creator_id: creatorId,
          level: 'playlist',
          description: detail?.snippet?.description?.slice(0, 500) || null,
          tags: [],
          duration: yt.formatDuration(detail?.contentDetails?.duration),
        }])
        .select('id')
        .single();
      if (videoErr) throw videoErr;
      videoIdsInOrder.push(newVideo.id);
      importedCount++;
    }

    const ownerCreatorId = await resolveCreator(meta.snippet.channelId, meta.snippet.channelTitle);

    const { data: playlist, error: playlistErr } = await supabase
      .from('playlists')
      .insert([{
        name: nameOverride || meta.snippet.title,
        description: meta.snippet.description?.slice(0, 1000) || null,
        creator_id: ownerCreatorId,
        video_ids: videoIdsInOrder,
        featured: false,
        youtube_playlist_url: playlist_url,
      }])
      .select()
      .single();
    if (playlistErr) return res.status(500).json({ error: playlistErr.message });

    return res.status(201).json({
      playlist,
      imported_videos: importedCount,
      reused_videos: reusedCount,
      total_videos: videoIdsInOrder.length,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Import failed' });
  }
});

// ─── CREATORS ────────────────────────────────────────────────────────────────
router.get('/creators', async (req, res) => {
  try {
    const { data, error } = await supabase.from('creators').select('*').order('name');
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ creators: data || [] });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/creators', async (req, res) => {
  try {
    const { name, specialty, youtube_url, handle, subscriber_count } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const { data, error } = await supabase
      .from('creators')
      .insert([{ name, specialty, youtube_url, handle, subscriber_count }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ creator: data });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

router.put('/creators/:id', async (req, res) => {
  try {
    const { name, specialty, youtube_url, handle, subscriber_count } = req.body;
    const { data, error } = await supabase
      .from('creators')
      .update({ name, specialty, youtube_url, handle, subscriber_count })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ creator: data });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/creators/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('creators').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// ─── USERS ────────────────────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const { search } = req.query;
    let query = supabase.from('users').select('id, username, email, role, created_at').order('created_at', { ascending: false });
    if (search) query = query.or(`email.ilike.%${search}%,username.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ users: data || [] });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

    // Prevent self-demotion
    if (req.params.id === req.user.id && role !== 'admin') {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    const { data, error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', req.params.id)
      .select('id, username, email, role')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ user: data });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// ─── COURSES ─────────────────────────────────────────────────────────────────
router.get('/courses', async (req, res) => {
  try {
    const { data, error } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ courses: data || [] });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/courses', async (req, res) => {
  try {
    const { title, educator, description, price, affiliate_url, thumbnail_url, active } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const { data, error } = await supabase
      .from('courses')
      .insert([{ title, educator, description, price, affiliate_url, thumbnail_url, active: active !== false }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ course: data });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

router.put('/courses/:id', async (req, res) => {
  try {
    const { title, educator, description, price, affiliate_url, thumbnail_url, active } = req.body;
    const { data, error } = await supabase
      .from('courses')
      .update({ title, educator, description, price, affiliate_url, thumbnail_url, active })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ course: data });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/courses/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('courses').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// ─── SETTINGS ────────────────────────────────────────────────────────────────
router.get('/settings', async (req, res) => {
  try {
    const { data, error } = await supabase.from('settings').select('*');
    if (error) return res.status(500).json({ error: error.message });

    const settings = {};
    (data || []).forEach(row => { settings[row.key] = row.value; });
    return res.json({ settings });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/settings', async (req, res) => {
  try {
    const settings = req.body;
    const upsertRows = Object.entries(settings).map(([key, value]) => ({
      key,
      value: String(value),
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('settings')
      .upsert(upsertRows, { onConflict: 'key' });

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// ─── PUBLIC SETTINGS ─────────────────────────────────────────────────────────
// This public route is also mounted at /api/settings via server.js
router.get('/public-settings', async (req, res) => {
  try {
    const { data, error } = await supabase.from('settings').select('*');
    if (error) return res.status(500).json({ error: error.message });
    const settings = {};
    (data || []).forEach(row => { settings[row.key] = row.value; });
    return res.json({ settings });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// ─── BACKUP ──────────────────────────────────────────────────────────────────
router.get('/backup', async (req, res) => {
  try {
    const tableNames = ['videos', 'creators', 'playlists', 'courses', 'settings'];
    const tables = {};
    const errors = {};

    // Fetch each table independently so one missing table can't break the whole backup
    for (const name of tableNames) {
      const { data, error } = await supabase.from(name).select('*');
      if (error) {
        errors[name] = error.message;
        tables[name] = [];
      } else {
        tables[name] = data || [];
      }
    }

    return res.json({
      exported_at: new Date().toISOString(),
      version: '1.0',
      tables,
      ...(Object.keys(errors).length > 0 && { warnings: errors })
    });
  } catch (err) {
    return res.status(500).json({ error: 'Backup failed: ' + err.message });
  }
});

// ─── RESTORE ─────────────────────────────────────────────────────────────────
router.post('/restore', async (req, res) => {
  try {
    const { tables } = req.body;
    if (!tables || typeof tables !== 'object') {
      return res.status(400).json({ error: 'Invalid backup format — missing tables object' });
    }
    const allowed = { videos: 'id', creators: 'id', playlists: 'id', courses: 'id', settings: 'key' };
    const results = {};

    for (const [table, conflict] of Object.entries(allowed)) {
      const rows = tables[table];
      if (!Array.isArray(rows) || rows.length === 0) {
        results[table] = 'skipped (no data)';
        continue;
      }
      const { error } = await supabase.from(table).upsert(rows, { onConflict: conflict });
      results[table] = error ? `error: ${error.message}` : `restored ${rows.length} rows`;
    }

    return res.json({ success: true, results });
  } catch (err) {
    return res.status(500).json({ error: 'Restore failed' });
  }
});

// ─── HELPER ──────────────────────────────────────────────────────────────────
function extractYoutubeId(url) {
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

module.exports = router;
