/* KloudyKast video listener for botbar.io.
 * Polls {endpoint}/kast/live/{site}.json (same live doc the kloudy.bot receiver reads).
 * A video command rides in item {type:"note", title:"kast-video", text:'{"v":1,"video":"<id>","action":"play|pause|stop","t":<sec>,"at":<epoch ms>}'}
 * (the deployed kast Lambda only accepts image/pdf/url/note items, so the command is JSON in a note).
 * Play = overlay the matching [data-present-id] video, start muted at the shared position, show "Tap for sound".
 */
(function () {
  "use strict";
  var s = document.currentScript;
  if (!s) return;
  var site = s.getAttribute("data-kast-site") || "botbar";
  var endpoint = (s.getAttribute("data-kast-endpoint") || "https://kloudy.bot").replace(/\/$/, "");
  var POLL_MS = 1000, DRIFT_S = 1.5, STALE_PLAY_MS = 6 * 3600 * 1000;
  var version = 0, clockSkew = 0, cur = null, overlay = null, ov = null, tapBtn = null, src = null, home = null, logged = false;
  var state = { site: site, endpoint: endpoint, last: null, action: "idle", video: "", polls: 0, errors: 0 };
  window.__kastVideo = state;

  function serverNow() { return Date.now() + clockSkew; }

  function css(el, o) { for (var k in o) el.style[k] = o[k]; return el; }

  function ensureOverlay() {
    if (overlay) return;
    overlay = css(document.createElement("div"), { position: "fixed", inset: "0", zIndex: "2147483646", background: "rgba(5,4,8,.92)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "16px", boxSizing: "border-box" });
    overlay.setAttribute("data-kast-video-overlay", "1");
    var label = css(document.createElement("div"), { color: "#f2e8ed", font: "600 13px system-ui,sans-serif", margin: "0 0 10px" });
    label.innerHTML = '<span style="color:#e5243b">\u25cf</span> Live from KloudyKast';
    ov = css(document.createElement("video"), { maxWidth: "100%", maxHeight: "calc(100vh - 120px)", borderRadius: "14px", background: "#000" });
    ov.playsInline = true; ov.setAttribute("playsinline", ""); ov.muted = true; ov.preload = "auto";
    tapBtn = css(document.createElement("button"), { marginTop: "12px", padding: "10px 18px", borderRadius: "999px", border: "1px solid #6b4a5a",
      background: "#1b1016", color: "#fff", font: "600 15px system-ui,sans-serif", cursor: "pointer" });
    tapBtn.textContent = "\ud83d\udd0a Tap for sound";
    tapBtn.setAttribute("data-kast-tap", "1");
    var unmute = function () { if (!ov) return; ov.muted = false; ov.volume = 1; ov.play().catch(function () {}); tapBtn.style.display = "none"; };
    tapBtn.addEventListener("click", function (e) { e.stopPropagation(); unmute(); });
    overlay.addEventListener("click", unmute);
    overlay.appendChild(label); overlay.appendChild(ov); overlay.appendChild(tapBtn);
    document.body.appendChild(overlay);
  }

  function closeOverlay() {
    if (ov) { try { ov.pause(); } catch (e) {} }
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    overlay = ov = tapBtn = null; src = null;
  }

  function findVideo(id) {
    return document.querySelector('video[data-present-id="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
  }

  function targetTime(cmd) {
    var t = Number(cmd.t) || 0;
    if (cmd.action === "play" && cmd.at) t += Math.max(0, (serverNow() - Number(cmd.at)) / 1000);
    return t;
  }

  function apply(cmd, fresh) {
    state.last = cmd;
    if (!cmd || cmd.action === "stop" || !cmd.video) { state.action = "stop"; state.video = ""; closeOverlay(); return; }
    var page = findVideo(cmd.video);
    if (!page) { state.action = "missing"; return; }
    page.pause && page.pause();
    var url = page.currentSrc || page.getAttribute("src");
    ensureOverlay();
    if (src !== url) { src = url; ov.src = url; ov.poster = page.getAttribute("poster") || ""; tapBtn.style.display = ""; }
    var fig = page.closest("section") || page;
    if (fresh) { try { fig.scrollIntoView({ block: "center" }); } catch (e) {} }
    var want = targetTime(cmd);
    if (isFinite(ov.duration) && ov.duration > 0 && want >= ov.duration) want = ov.duration - 0.1;
    var seek = function () { if (Math.abs((ov.currentTime || 0) - want) > DRIFT_S) { try { ov.currentTime = want; } catch (e) {} } };
    if (ov.readyState >= 1) seek(); else ov.addEventListener("loadedmetadata", seek, { once: true });
    state.video = cmd.video;
    if (cmd.action === "play") {
      state.action = "play";
      var p = ov.play();
      if (p && p.catch) p.catch(function () { ov.muted = true; tapBtn.style.display = ""; ov.play().catch(function () {}); });
    } else { state.action = "pause"; ov.pause(); }
  }

  function parseCmd(doc) {
    var it = doc && doc.item;
    if (!it || it.type !== "note" || it.title !== "kast-video") return null;
    try {
      var c = JSON.parse(it.text || "");
      if (!c || typeof c !== "object" || typeof c.video !== "string") return null;
      if (c.action === "play" && c.at && serverNow() - c.at > STALE_PLAY_MS) return null;
      return c;
    } catch (e) { return null; }
  }

  function poll() {
    if (document.visibilityState !== "visible") return setTimeout(poll, POLL_MS);
    fetch(endpoint + "/kast/live/" + encodeURIComponent(site) + ".json?c=" + Date.now(), { credentials: "omit", cache: "no-store" })
      .then(function (r) {
        var d = Date.parse(r.headers.get("Date") || "");
        if (!isNaN(d)) clockSkew = d - Date.now();
        if (r.status === 404) return null;
        if (!r.ok) throw new Error("http " + r.status);
        return r.json();
      })
      .then(function (doc) {
        state.polls++;
        if (doc && typeof doc.version === "number") { if (doc.version < version) return; version = doc.version; }
        var cmd = parseCmd(doc);
        var key = JSON.stringify(cmd);
        var fresh = key !== cur;
        if (fresh || (cmd && cmd.action === "play")) { cur = key; apply(cmd, fresh); }
      })
      .catch(function () { state.errors++; if (!logged) { logged = true; try { console.warn("kast-video: live doc unreachable"); } catch (e) {} } })
      .then(function () { setTimeout(poll, POLL_MS); });
  }
  poll();
})();
