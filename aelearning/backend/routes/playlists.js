const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/playlists
router.get('/', async (req, res) => {
  try {
    const { featured, creator_id, user_id } = req.query;

    let query = supabase
      .from('playlists')
      .select('*, creators(id, name, handle, avatar_url, banner_url)')
      .order('created_at', { ascending: false });

    if (featured === 'true') query = query.eq('featured', true);
    if (creator_id) query = query.eq('creator_id', creator_id);
    if (user_id) query = query.eq('user_id', user_id);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    // Fetch a thumbnail (first video's youtube_id) for each playlist in one batch query
    const firstVideoIds = (data || [])
      .map(p => Array.isArray(p.video_ids) && p.video_ids.length ? p.video_ids[0] : null)
      .filter(Boolean);
    let thumbById = {};
    if (firstVideoIds.length) {
      const { data: firstVideos } = await supabase.from('videos').select('id, youtube_id').in('id', firstVideoIds);
      (firstVideos || []).forEach(v => { thumbById[v.id] = v.youtube_id; });
    }

    const playlists = (data || []).map(p => ({
      ...p,
      video_count: Array.isArray(p.video_ids) ? p.video_ids.length : 0,
      youtube_id: Array.isArray(p.video_ids) && p.video_ids.length ? thumbById[p.video_ids[0]] || null : null
    }));

    return res.json({ playlists });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/playlists/:id
router.get('/:id', async (req, res) => {
  try {
    const { data: playlist, error } = await supabase
      .from('playlists')
      .select('*, creators(id, name, handle, avatar_url, banner_url)')
      .eq('id', req.params.id)
      .single();

    if (error || !playlist) return res.status(404).json({ error: 'Playlist not found' });

    let videos = [];
    if (playlist.video_ids && playlist.video_ids.length > 0) {
      const { data: videoData } = await supabase
        .from('videos')
        .select('*, creators(id, name)')
        .in('id', playlist.video_ids);
      videos = videoData || [];
    }

    return res.json({ playlist: { ...playlist, videos } });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/playlists (logged-in users only)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, video_ids } = req.body;
    if (!name) return res.status(400).json({ error: 'Playlist name is required' });

    const { data, error } = await supabase
      .from('playlists')
      .insert([{ name, description, user_id: req.user.id, video_ids: video_ids || [], featured: false }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ playlist: data });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
