/* Zoom stage view (Sensai 2026-11-24, Johnny approved 4:41 AM): botbar.io/chat/?stage=1
   Same page, same audio path; only the look changes: Muse and Dots big, side by side, nothing else. */
(function () {
  if (!/[?&]stage=1/.test(location.search)) return;
  document.documentElement.classList.add("bb-stage");
  var css = [
    "html.bb-stage,html.bb-stage body{background:radial-gradient(ellipse at 50% 40%,#1b2340 0%,#0a0d18 60%,#05060b 100%) !important;overflow:hidden !important}",
    "html.bb-stage body>*:not(#botbar-overlay-root):not(script):not(style){visibility:hidden !important}",
    "html.bb-stage #botbar-overlay-root{visibility:visible !important;position:fixed !important;inset:0 !important;z-index:2147483000 !important;pointer-events:none}",
    "html.bb-stage #grokbot-tile,html.bb-stage #grok-tile{display:none !important}",
    "html.bb-stage #muse-tile,html.bb-stage #dots-tile{display:block !important;visibility:visible !important;position:fixed !important;top:calc(50% - min(22vw,40vh) - 4vh) !important;width:min(44vw,80vh) !important;height:min(44vw,80vh) !important;right:auto !important;border-radius:4vh !important;overflow:hidden !important;background:#fff !important;box-shadow:0 0 0 4px rgba(232,190,80,.6),0 2vh 6vh rgba(0,0,0,.6) !important}",
    "html.bb-stage #muse-tile{left:calc(50% - 2vw - min(44vw,80vh)) !important}",
    "html.bb-stage #dots-tile{left:calc(50% + 2vw) !important}",
    "html.bb-stage #muse-tile canvas,html.bb-stage #dots-tile canvas,html.bb-stage #muse-tile video,html.bb-stage #dots-tile video{position:absolute !important;inset:0 !important;width:100% !important;height:100% !important;object-fit:cover}",
    "html.bb-stage .bot-label{position:absolute !important;left:0;right:0;bottom:2.5vh !important;top:auto !important;text-align:center !important;color:#ffd45a !important;font:700 5.5vh/1 Segoe UI,Arial,sans-serif !important;letter-spacing:.06em;text-shadow:0 .4vh 1.4vh rgba(0,0,0,.85) !important;background:none !important}",
    "html.bb-stage #bb-stage-brand{position:fixed;left:0;right:0;bottom:2vh;text-align:center;color:rgba(255,255,255,.5);font:600 2.4vh Segoe UI,Arial,sans-serif;letter-spacing:.25em;visibility:visible !important;z-index:2147483001}"
  ].join("\n");
  function add() {
    if (!document.body) return setTimeout(add, 50);
    var st = document.createElement("style"); st.id = "bb-stage-css"; st.textContent = css; document.head.appendChild(st);
    var b = document.createElement("div"); b.id = "bb-stage-brand"; b.textContent = "BOTBAR.IO"; document.body.appendChild(b);
  }
  add();
  /* Sharper tiles: the relay draws each frame at canvas size, so give the canvases more pixels. */
  setInterval(function () {
    ["muse", "dots"].forEach(function (w) {
      var t = document.getElementById(w + "-tile"); if (!t) return;
      var c = t.querySelector("canvas.bot-canvas");
      if (c && c.width < 768) { c.width = 768; c.height = 768; var g = c.getContext("2d"); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high"; }
    });
  }, 500);
})();
