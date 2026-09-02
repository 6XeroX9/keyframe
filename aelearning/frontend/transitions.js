/* ─── Keyframe CINEMATIC PAGE TRANSITIONS ─────────────────────────────────────── */
/* LEAVE : bars slam in from alternating sides, center-first  (shutter CLOSE)     */
/* ENTER : bars peel away center-first, revealing the page    (shutter OPEN)      */
/*                                                                                 */
/* ★  Load this script SYNCHRONOUSLY as the first element inside <body>           */
/*    so bars are painted before any page content on enter.                        */
/* ─────────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  if (document.getElementById('ae-transition')) return;

  /* ── CONFIG ──────────────────────────────────────────────────────────────── */
  var N           = 12;    // strip count — fine venetian-blind effect
  var DUR_LEAVE   = 260;   // ms per bar on leave  (slam in)
  var DUR_ENTER   = 340;   // ms per bar on enter  (peel away)
  var STAGGER     = 22;    // ms between bars in center-out order
  var ENTER_DELAY = 55;    // ms pause before enter animation fires (after 2×rAF)
  var CENTER      = (N - 1) / 2;  // 5.5 — equidistant point between bars 5 & 6

  /* ── DETECT PAGE ENTER ───────────────────────────────────────────────────── */
  var entering = false;
  try {
    entering = !!sessionStorage.getItem('ae_entering');
    if (entering) sessionStorage.removeItem('ae_entering');
  } catch (e) {}

  /* ── ACCENT COLOR — read from localStorage cache (no async, no flash) ────── */
  var accent = '#FF4D00';
  try { accent = localStorage.getItem('ae_accent') || accent; } catch (e) {}

  /* ── SCANLINE OVERLAY (pseudo-element on each bar — pure CSS, retro CRT) ─── */
  var scanStyle = document.createElement('style');
  scanStyle.textContent =
    '#ae-transition>div{position:absolute;left:0;right:0;will-change:transform}' +
    '#ae-transition>div::after{' +
    'content:"";position:absolute;inset:0;pointer-events:none;' +
    'background:repeating-linear-gradient(' +
    '0deg,rgba(0,0,0,0.11) 0px,rgba(0,0,0,0.11) 1px,' +
    'transparent 1px,transparent 4px)' +
    '}';
  (document.head || document.documentElement).appendChild(scanStyle);

  /* ── WRAPPER ─────────────────────────────────────────────────────────────── */
  var wrap = document.createElement('div');
  wrap.id = 'ae-transition';
  wrap.setAttribute('aria-hidden', 'true');
  wrap.style.cssText =
    'position:fixed;inset:0;z-index:99999;overflow:hidden;' +
    'pointer-events:' + (entering ? 'all' : 'none') + ';';

  /* ── BARS (alternating left/right origins → zipper pattern) ─────────────── */
  var bars = [];
  var pct  = 100 / N;
  for (var i = 0; i < N; i++) {
    var b      = document.createElement('div');
    var origin = (i % 2 === 0) ? 'left' : 'right';
    var alpha  = (i % 2 === 0) ? '1' : '0.86';  /* subtle alternating depth */
    b.style.cssText =
      'top:'      + (i * pct)            + '%;'  +
      'height:calc(' + pct               + '% + 1px);' +  /* +1px kills sub-pixel seams */
      'background:' + accent             + ';'   +
      'opacity:'    + alpha              + ';'   +
      'transform:scaleX(' + (entering ? '1' : '0') + ');' +
      'transform-origin:' + origin       + ';';
    wrap.appendChild(b);
    bars.push(b);
  }

  /* Append before any other body content so it paints first on page enter */
  document.body.appendChild(wrap);

  /* ── CENTER-OUT STAGGER HELPER ───────────────────────────────────────────── */
  /* Center bars (5,6) get delay ~11ms; edge bars (0,11) get delay ~121ms      */
  function barDelay(i) {
    return Math.round(Math.abs(i - CENTER) * STAGGER);
  }
  var maxDelay = barDelay(0); /* edge-bar delay = longest wait */

  /* ── ENTER ANIMATION — bars peel open like a camera aperture ────────────── */
  if (entering) {
    /* Double rAF guarantees we're past the initial paint before animating.
       The bars are already covering the screen at this point.                  */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        setTimeout(function () {
          for (var j = 0; j < N; j++) {
            (function (bar, d) {
              setTimeout(function () {
                bar.style.transition =
                  'transform ' + DUR_ENTER + 'ms cubic-bezier(0.23,1,0.32,1)';
                bar.style.transform = 'scaleX(0)';
              }, d);
            })(bars[j], barDelay(j));
          }
          /* Hide wrapper entirely once bars have retracted — prevents stacking
             context from blocking modals or other high-z-index elements.       */
          setTimeout(function () {
            wrap.style.pointerEvents = 'none';
            wrap.style.display = 'none';
          }, maxDelay + DUR_ENTER + 60);
        }, ENTER_DELAY);
      });
    });
  } else {
    /* No enter animation — hide wrapper immediately so it never interferes
       with auth modals, video modals, or any other z-index layers.             */
    wrap.style.display = 'none';
  }

  /* ── LEAVE ANIMATION — bars slam in like a shutter closing ──────────────── */
  function wipeIn(href) {
    try { sessionStorage.setItem('ae_entering', '1'); } catch (e) {}
    /* Restore wrapper (it was hidden when idle) */
    wrap.style.display = '';
    wrap.style.pointerEvents = 'all';

    /* Snap all bars to invisible before re-animating */
    for (var j = 0; j < N; j++) {
      bars[j].style.transition = 'none';
      bars[j].style.transform  = 'scaleX(0)';
    }
    void wrap.offsetWidth; /* force reflow — ensures reset is committed */

    /* Animate bars in, center-first */
    for (var k = 0; k < N; k++) {
      (function (bar, d) {
        setTimeout(function () {
          bar.style.transition =
            'transform ' + DUR_LEAVE + 'ms cubic-bezier(0.77,0,0.175,1)';
          bar.style.transform = 'scaleX(1)';
        }, d);
      })(bars[k], barDelay(k));
    }

    /* Navigate once the last (edge) bar has finished */
    setTimeout(function () {
      window.location.href = href;
    }, maxDelay + DUR_LEAVE + 70);
  }

  /* ── BFCACHE RESTORE ─────────────────────────────────────────────────────── */
  /* If the user left mid-wipeIn (bars animating to cover the screen) and then
     hits browser Back/Forward, Chrome can restore this exact page from the
     back-forward cache — DOM frozen at the moment of unload, bars still fully
     covering the screen and eating clicks. Scripts don't re-run on a bfcache
     restore, so nothing else would ever reset it. Force it back to idle here. */
  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    for (var i = 0; i < N; i++) {
      bars[i].style.transition = 'none';
      bars[i].style.transform  = 'scaleX(0)';
    }
    wrap.style.pointerEvents = 'none';
    wrap.style.display = 'none';
  });

  /* ── INTERCEPT ALL INTERNAL LINK CLICKS ─────────────────────────────────── */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href                         ||
        href.startsWith('http')       ||
        href.startsWith('//')         ||
        href.startsWith('#')          ||
        href.startsWith('mailto')     ||
        href.startsWith('tel')        ||
        href.startsWith('javascript') ||
        a.target === '_blank') return;
    e.preventDefault();
    wipeIn(href);
  }, true);
})();
