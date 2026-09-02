/* ─── NAVBAR SEARCH WIDGET ───────────────────────────────────────────────────
   Injected into every page's .nav-links (not #nav-actions, which gets fully
   overwritten by renderNavAuth()) so it survives regardless of load order. */
(function () {
  function inject() {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks || document.getElementById('nav-search-item')) return;

    const li = document.createElement('li');
    li.id = 'nav-search-item';
    li.className = 'nav-search-item';
    li.innerHTML = `
      <button type="button" id="nav-search-btn" class="nav-search-btn" aria-label="Search">⌕</button>
      <div class="nav-search-pop" id="nav-search-pop">
        <input type="text" id="nav-search-input" placeholder="Search videos, creators..." />
      </div>`;
    navLinks.appendChild(li);

    const pop = li.querySelector('#nav-search-pop');
    const btn = li.querySelector('#nav-search-btn');
    const input = li.querySelector('#nav-search-input');

    function go() {
      const q = input.value.trim();
      if (q) window.location.href = '/search?q=' + encodeURIComponent(q);
    }

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = pop.classList.toggle('open');
      if (open) input.focus(); else if (input.value.trim()) go();
    });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    document.addEventListener('click', (e) => {
      if (!li.contains(e.target)) pop.classList.remove('open');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);
  else inject();
})();
