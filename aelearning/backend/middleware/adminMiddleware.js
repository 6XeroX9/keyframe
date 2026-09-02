const supabase = require('../config/supabase');

// Re-checks role against the live database rather than trusting the JWT's
// embedded role, which is only as fresh as the last login (can be up to 7
// days stale — e.g. right after an admin promotion via direct SQL).
module.exports = async (req, res, next) => {
  if (!req.user) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', req.user.id)
      .single();

    if (error || !user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch {
    return res.status(403).json({ error: 'Admin access required' });
  }
};
