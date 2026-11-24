(function () {
  function currentPage() {
    var n = +new URLSearchParams((location.hash || '').slice(1)).get('page') || 1;
    return Math.max(1, Math.min(9, n | 0));
  }
  function goPage(n) {
    n = Math.max(1, Math.min(9, n | 0));
    var want = '#page=' + n;
    if (location.hash !== want) location.hash = 'page=' + n;
    if (window.BotBarChatSync && BotBarChatSync.get().page !== n) {
      BotBarChatSync.publish({ page: n });
    }
  }
  function go(delta) {
    if (delta < 0) goPage(currentPage() + 1);
    else if (delta > 0) goPage(currentPage() - 1);
  }
  var startX = 0, startY = 0, tracking = false;
  function down(x, y) { tracking = true; startX = x; startY = y; }
  function up(x, y) {
    if (!tracking) return;
    tracking = false;
    var dx = x - startX, dy = y - startY;
    if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    go(dx);
  }
  function onDown(e) {
    if (e.isPrimary === false) return;
    down(e.clientX, e.clientY);
    try { if (e.currentTarget && e.currentTarget.setPointerCapture && e.pointerId != null) e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
  }
  function onUp(e) {
    if (e.isPrimary === false) return;
    up(e.clientX, e.clientY);
  }
  document.addEventListener('dragstart', function (e) { e.preventDefault(); }, true);
  ['bb-art','bb-header','bb-button','bb-stage'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.setAttribute('draggable', 'false');
  });
  var root = document.getElementById('botbar-presentation') || document;
  root.addEventListener('pointerdown', onDown, { passive: true });
  root.addEventListener('pointerup', onUp);
  root.addEventListener('pointercancel', onUp);
  document.addEventListener('pointerup', onUp);
  document.addEventListener('pointercancel', onUp);
  /* Arrows are already handled by the scene IIFE, except when focus is on a
     button (the invisible hotspot). Only fill that gap so we do not skip pages. */
  document.addEventListener('keydown', function (e) {
    if (!e.target || !e.target.matches || !e.target.matches('select,input,button')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); go(-1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(1); }
  });
})();
