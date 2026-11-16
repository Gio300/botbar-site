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
(function () {
  function avgColor(img) {
    try {
      var c = document.createElement("canvas");
      var w = Math.min(img.naturalWidth || 0, 64);
      var h = Math.min(img.naturalHeight || 0, 36);
      if (w < 2 || h < 2) return null;
      c.width = w; c.height = h;
      var g = c.getContext("2d");
      g.drawImage(img, 0, 0, w, h);
      var d = g.getImageData(0, 0, w, h).data;
      function sample(x, y) {
        var i = (y * w + x) * 4;
        return [d[i], d[i+1], d[i+2]];
      }
      var pts = [sample(0, 0), sample(w-1, 0), sample(0, h-1), sample(w-1, h-1), sample((w/2)|0, 0), sample((w/2)|0, h-1)];
      var r = 0, g2 = 0, b = 0;
      pts.forEach(function (p) { r += p[0]; g2 += p[1]; b += p[2]; });
      r = (r / pts.length) | 0; g2 = (g2 / pts.length) | 0; b = (b / pts.length) | 0;
      return "rgb(" + r + "," + g2 + "," + b + ")";
    } catch (e) { return null; }
  }
  function matchPageBackground() {
    var img = document.getElementById("art");
    var stage = document.getElementById("stage") || document.body;
    if (!img) return;
    var color = avgColor(img) || "#0b1114";
    stage.style.background = color;
    document.body.style.background = color;
    img.style.background = color;
  }
  var img = document.getElementById("art");
  if (img) {
    img.addEventListener("load", matchPageBackground);
    if (img.complete) matchPageBackground();
  }
})();
