const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// specialty label -> short filter key (matches the creators page's filter chips)
const SPECIALTY_TO_TAG = {
  'Motion design': 'motion',
  'VFX / cinematic': 'vfx',
  'Element 3D': 'element3d',
  'Shape layers': 'shape',
  'SaaS explainer': 'saas',
  'AMV / anime edit': 'amv',
  'Music visualizer': 'musicviz',
  'Kinetic typography': 'type',
  'Retro / vintage': 'retro',
  'VOX / documentary': 'vox',
  'Expressions / scripting': 'expressions',
  'Business / freelance': 'biz',
  'International': 'intl',
  'Niche': 'niche',
  'Other': 'other',
};

// GET /api/creators
router.get('/', async (req, res) => {
  try {
    const [{ data: creators, error }, { data: videos }, { data: playlists }] = await Promise.all([
      supabase.from('creators').select('*').order('name'),
      supabase.from('videos').select('creator_id'),
      supabase.from('playlists').select('creator_id'),
    ]);
    if (error) return res.status(500).json({ error: error.message });

    const videoCounts = {};
    (videos || []).forEach(v => { if (v.creator_id) videoCounts[v.creator_id] = (videoCounts[v.creator_id] || 0) + 1; });
    const playlistCounts = {};
    (playlists || []).forEach(p => { if (p.creator_id) playlistCounts[p.creator_id] = (playlistCounts[p.creator_id] || 0) + 1; });

    const enriched = (creators || []).map(c => ({
      ...c,
      videos: videoCounts[c.id] || 0,
      playlists: playlistCounts[c.id] || 0,
      tags: (c.specialty || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .map(s => SPECIALTY_TO_TAG[s] || s.toLowerCase()),
    }));

    return res.json({ creators: enriched });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/creators/:id
router.get('/:id', async (req, res) => {
  try {
    const { data: creator, error } = await supabase
      .from('creators')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !creator) return res.status(404).json({ error: 'Creator not found' });

    const { data: videos } = await supabase
      .from('videos')
      .select('*')
      .eq('creator_id', req.params.id)
      .order('created_at', { ascending: false });

    return res.json({ creator: { ...creator, videos: videos || [] } });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
