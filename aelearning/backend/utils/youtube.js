const YT_KEY = process.env.YOUTUBE_API_KEY;
const BASE = 'https://www.googleapis.com/youtube/v3';

function extractPlaylistId(input) {
  const m = input.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{10,}$/.test(input.trim())) return input.trim();
  return null;
}

function formatDuration(iso) {
  if (!iso) return null;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return null;
  const h = Number(m[1] || 0), min = Number(m[2] || 0), s = Number(m[3] || 0);
  const mm = h ? String(min).padStart(2, '0') : String(min);
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function formatSubCount(n) {
  if (!n) return null;
  n = Number(n);
  if (n >= 1000000) return (n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + 'K';
  return String(n);
}

async function ytGet(path, params) {
  const qs = new URLSearchParams({ ...params, key: YT_KEY });
  const res = await fetch(`${BASE}/${path}?${qs}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
}

async function fetchPlaylistMeta(playlistId) {
  const data = await ytGet('playlists', { part: 'snippet,contentDetails', id: playlistId });
  return data.items?.[0] || null;
}

async function fetchAllPlaylistItems(playlistId) {
  const items = [];
  let pageToken = '';
  do {
    const data = await ytGet('playlistItems', {
      part: 'snippet,contentDetails',
      playlistId,
      maxResults: 50,
      ...(pageToken ? { pageToken } : {}),
    });
    items.push(...(data.items || []));
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return items;
}

async function fetchVideosDetails(videoIds) {
  const map = {};
  for (let i = 0; i < videoIds.length; i += 50) {
    const chunk = videoIds.slice(i, i + 50);
    const data = await ytGet('videos', { part: 'contentDetails,snippet', id: chunk.join(',') });
    (data.items || []).forEach(v => { map[v.id] = v; });
  }
  return map;
}

async function fetchChannelById(channelId) {
  const data = await ytGet('channels', { part: 'snippet,brandingSettings,statistics', id: channelId });
  return data.items?.[0] || null;
}

module.exports = {
  extractPlaylistId,
  formatDuration,
  formatSubCount,
  fetchPlaylistMeta,
  fetchAllPlaylistItems,
  fetchVideosDetails,
  fetchChannelById,
};
