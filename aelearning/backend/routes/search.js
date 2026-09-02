const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// GET /api/search?q=...
router.get('/', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ videos: [], creators: [] });

    const [{ data: videos, error: vErr }, { data: creators, error: cErr }] = await Promise.all([
      supabase
        .from('videos')
        .select('*, creators(id, name, handle)')
        .ilike('title', `%${q}%`)
        .order('created_at', { ascending: false })
        .limit(24),
      supabase
        .from('creators')
        .select('*')
        .or(`name.ilike.%${q}%,specialty.ilike.%${q}%`)
        .order('name')
        .limit(12),
    ]);

    if (vErr) return res.status(500).json({ error: vErr.message });
    if (cErr) return res.status(500).json({ error: cErr.message });

    return res.json({ videos: videos || [], creators: creators || [] });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
