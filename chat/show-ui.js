(function () {
  function currentPage() {
    var n = +new URLSearchParams((location.hash || "").slice(1)).get("page") || 1;
    if (typeof window.page === "number") n = window.page + 1;
    return Math.max(1, Math.min(9, n | 0));
  }
  function goPage(n) {
    n = Math.max(1, Math.min(9, n | 0));
    if (typeof window.show === "function") {
      window.show(n - 1);
    } else {
      var want = "#page=" + n;
      if (location.hash !== want) location.hash = "page=" + n;
    }
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
  var stage = document.getElementById("bb-stage") || document.getElementById("stage") || document.body;
  stage.addEventListener("pointerdown", function (e) {
    if (e.isPrimary === false) return;
    down(e.clientX, e.clientY);
  }, { passive: true });
  stage.addEventListener("pointerup", function (e) {
    if (e.isPrimary === false) return;
    up(e.clientX, e.clientY);
  });
  stage.addEventListener("touchstart", function (e) {
    if (!e.changedTouches || !e.changedTouches[0]) return;
    down(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
  }, { passive: true });
  stage.addEventListener("touchend", function (e) {
    if (!e.changedTouches || !e.changedTouches[0]) return;
    up(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
  }, { passive: true });
  document.addEventListener("keydown", function (e) {
    if (e.target && e.target.matches && e.target.matches("input,textarea,select")) return;
    if (e.key === "ArrowRight") { e.preventDefault(); go(-1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(1); }
  });
})();
