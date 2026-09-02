const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const videoRoutes = require('./routes/videos');
const playlistRoutes = require('./routes/playlists');
const creatorRoutes = require('./routes/creators');
const searchRoutes = require('./routes/search');
const adminRoutes = require('./routes/admin');
const authMiddleware = require('./middleware/authMiddleware');
const adminMiddleware = require('./middleware/adminMiddleware');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

// Serve static frontend files in production
app.use(express.static(path.join(__dirname, '../frontend')));

// ─── ROUTES ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/user', authRoutes);          // /api/user/dashboard also lives in auth.js
app.use('/api/videos', videoRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/creators', creatorRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/admin', authMiddleware, adminMiddleware, adminRoutes);

// Kit newsletter subscribe (no auth required)
app.post('/api/subscribe', async (req, res) => {
  const supabase = require('./config/supabase');
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }
  try {
    const { data } = await supabase.from('settings').select('value').eq('key', 'kit_form_id').maybeSingle();
    const formId = data?.value;
    if (!formId) return res.status(400).json({ error: 'Newsletter not configured yet' });

    const kitRes = await fetch(`https://app.kit.com/forms/${formId}/subscriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ email_address: email })
    });
    if (!kitRes.ok) {
      const body = await kitRes.json().catch(() => ({}));
      throw new Error(body.error || 'Kit API error');
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Subscription failed' });
  }
});

// Public settings endpoint (no auth required)
app.get('/api/settings', async (req, res) => {
  const supabase = require('./config/supabase');
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

// Fallback: unmatched API routes get a JSON 404, everything else gets the
// styled offline-media page (previously this silently served the homepage
// for any typo'd URL, which masked real 404s).
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.status(404).sendFile(path.join(__dirname, '../frontend/404.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`AEPath server running on port ${PORT}`);
});
