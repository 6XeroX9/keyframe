const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// GET /api/videos
router.get('/', async (req, res) => {
  try {
    const { level, creator_id, search, limit = 20, offset = 0 } = req.query;

    let query = supabase
      .from('videos')
      .select('*, creators(id, name, handle)')
      .range(Number(offset), Number(offset) + Number(limit) - 1)
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (level) query = query.eq('level', level);
    if (creator_id) query = query.eq('creator_id', creator_id);
    if (search) query = query.ilike('title', `%${search}%`);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    return res.json({ videos: data || [] });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/videos/:id
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('videos')
      .select('*, creators(id, name, handle, youtube_url)')
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Video not found' });
    return res.json({ video: data });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
