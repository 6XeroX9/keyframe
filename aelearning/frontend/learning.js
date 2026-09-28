(() => {
  'use strict';
  // Match the site's configured accent without blocking any lesson content.
  if (window.KeyframeCatalog?.supports('/settings')) {
    KeyframeCatalog.request('/settings').then(data => {
      const accent = data.settings?.accent_color;
      if (accent && CSS.supports('color', accent)) document.documentElement.style.setProperty('--accent', accent);
    }).catch(() => {});
  }
  const cards = [...document.querySelectorAll('.lesson')];
  const key = 'keyframe_starter_completed_v1';
  let completed = new Set();
  try { const saved = JSON.parse(localStorage.getItem(key) || '[]'); if (Array.isArray(saved)) completed = new Set(saved.filter(id => cards.some(c => c.dataset.video === id))); }
  catch { document.getElementById('storage-note').textContent = 'Progress available for this visit'; }
  function updateProgress() {
    cards.forEach(card => {
      const done = completed.has(card.dataset.video);
      card.classList.toggle('done', done);
      const button = card.querySelector('[data-complete]');
      button.setAttribute('aria-pressed', String(done));
      button.textContent = done ? '✓ Completed · undo' : '○ Mark complete';
      button.setAttribute('aria-label', `${done ? 'Undo completion of' : 'Mark complete:'} ${card.querySelector('h2').textContent}`);
    });
    document.getElementById('learning-progress').value = completed.size;
    document.getElementById('learning-progress-text').textContent = `${completed.size} of ${cards.length} lessons complete`;
    const next = cards.find(card => !completed.has(card.dataset.video));
    const resume = document.getElementById('resume-lesson');
    resume.href = next ? '#' + next.id : '#lessons';
    resume.textContent = next ? `${completed.size ? 'Continue with' : 'Start'} lesson ${next.id.split('-')[1].padStart(2, '0')} ↗` : 'All done — revisit a lesson ↗';
  }
  cards.forEach(card => card.querySelector('[data-complete]').addEventListener('click', () => {
    const id = card.dataset.video;
    completed.has(id) ? completed.delete(id) : completed.add(id);
    try { localStorage.setItem(key, JSON.stringify([...completed])); }
    catch { document.getElementById('storage-note').textContent = 'Progress available for this visit'; }
    updateProgress();
  }));
  let stage = 'All';
  const input = document.getElementById('lesson-search');
  function filter() {
    const term = input.value.trim().toLowerCase();
    let count = 0;
    cards.forEach(card => { card.hidden = !((stage === 'All' || card.dataset.stage === stage) && card.dataset.search.includes(term)); if (!card.hidden) count++; });
    document.getElementById('lesson-results').textContent = `${count} ${count === 1 ? 'lesson' : 'lessons'}`;
    document.getElementById('lesson-empty').hidden = count !== 0;
  }
  const buttons = [...document.querySelectorAll('[data-filter]')];
  buttons.forEach(button => button.addEventListener('click', () => { stage = button.dataset.filter; buttons.forEach(b => b.setAttribute('aria-pressed', String(b === button))); filter(); }));
  input.addEventListener('input', filter);
  document.getElementById('resume-lesson').addEventListener('click', () => { stage = 'All'; input.value = ''; buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === 'All'))); filter(); });
  updateProgress();
})();
