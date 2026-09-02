/* ─── AEPATH PROGRESS ────────────────────────────────────────────────────────
   Guest-friendly progress tracking. No auth, no backend — just localStorage.
   Two sets: watched video ids, saved (bookmarked) items as "type:id" keys. */

const AEProgress = (() => {
  const WATCHED_KEY = 'ae_watched';
  const SAVED_KEY = 'ae_saved';

  function readSet(key) {
    try {
      const raw = localStorage.getItem(key);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  }

  function writeSet(key, set) {
    try {
      localStorage.setItem(key, JSON.stringify([...set]));
    } catch {
      /* storage unavailable — fail silently, feature just won't persist */
    }
  }

  function isWatched(videoId) {
    return readSet(WATCHED_KEY).has(String(videoId));
  }

  function toggleWatched(videoId) {
    const set = readSet(WATCHED_KEY);
    const id = String(videoId);
    const next = !set.has(id);
    next ? set.add(id) : set.delete(id);
    writeSet(WATCHED_KEY, set);
    return next;
  }

  function watchedCount(videoIds) {
    const set = readSet(WATCHED_KEY);
    return videoIds.reduce((n, id) => n + (set.has(String(id)) ? 1 : 0), 0);
  }

  function isSaved(type, id) {
    return readSet(SAVED_KEY).has(`${type}:${id}`);
  }

  function toggleSaved(type, id) {
    const set = readSet(SAVED_KEY);
    const key = `${type}:${id}`;
    const next = !set.has(key);
    next ? set.add(key) : set.delete(key);
    writeSet(SAVED_KEY, set);
    return next;
  }

  function savedList(type) {
    return [...readSet(SAVED_KEY)]
      .filter(k => k.startsWith(`${type}:`))
      .map(k => k.slice(type.length + 1));
  }

  return { isWatched, toggleWatched, watchedCount, isSaved, toggleSaved, savedList };
})();
