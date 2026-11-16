(function () {
  var startX = 0, startY = 0, tracking = false, locked = false;
  function go(delta) {
    if (typeof show !== "function" || typeof page !== "number") return;
    if (delta < 0) show(page + 1);
    else if (delta > 0) show(page - 1);
  }
  function down(x, y) { tracking = true; startX = x; startY = y; }
  function up(x, y) {
    if (!tracking) return;
    tracking = false;
    var dx = x - startX, dy = y - startY;
    if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    go(dx);
  }
  var stage = document.getElementById("stage") || document.body;
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
