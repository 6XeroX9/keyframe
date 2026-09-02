const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/authMiddleware');

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ error: 'All fields are required' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    // Check existing email
    const { data: emailExists } = await supabase
      .from('users').select('id').eq('email', email).maybeSingle();
    if (emailExists)
      return res.status(409).json({ error: 'Email already in use' });

    // Check existing username
    const { data: usernameExists } = await supabase
      .from('users').select('id').eq('username', username).maybeSingle();
    if (usernameExists)
      return res.status(409).json({ error: 'Username already taken' });

    const password_hash = await bcrypt.hash(password, 10);

    const { data: newUser, error } = await supabase
      .from('users')
      .insert([{ username, email, role: 'user', password_hash }])
      .select('id, username, email, role, created_at')
      .single();

    if (error) return res.status(500).json({ error: error.message });

    const token = generateToken(newUser);
    return res.status(201).json({
      token,
      user: { id: newUser.id, username: newUser.username, email: newUser.email, role: newUser.role }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user)
      return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ error: 'Invalid credentials' });

    const token = generateToken(user);
    return res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, email, role, created_at')
      .eq('id', req.user.id)
      .single();

    if (error || !user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/user/dashboard
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const [{ data: playlists }, { data: user }] = await Promise.all([
      supabase.from('playlists').select('*').eq('user_id', req.user.id),
      supabase.from('users').select('id, username, email, role, created_at').eq('id', req.user.id).single()
    ]);
    return res.json({ user, playlists: playlists || [] });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
