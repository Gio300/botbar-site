(function (global) {
  if (global.__BOTBAR_OVERLAY_LAYER__) return;
  global.__BOTBAR_OVERLAY_LAYER__ = true;

  function loadCss() {
    var href = new URL("overlay-layer.css", scriptUrl()).href;
    if (document.querySelector('link[data-botbar-overlay]')) return;
    var l = document.createElement("link");
    l.rel = "stylesheet"; l.href = href; l.setAttribute("data-botbar-overlay", "1");
    document.head.appendChild(l);
  }
  function scriptUrl() {
    var s = document.currentScript;
    if (s && s.src) return s.src;
    var all = document.getElementsByTagName("script");
    for (var i = all.length - 1; i >= 0; i--) {
      if (all[i].src && /overlay-layer\.js/.test(all[i].src)) return all[i].src;
    }
    return location.href;
  }
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var el = document.createElement("script");
      el.src = src; el.onload = resolve; el.onerror = reject;
      document.head.appendChild(el);
    });
  }
  function ensureDeps() {
    var base = new URL(".", scriptUrl()).href;
    var chain = Promise.resolve();
    if (!global.Peer) chain = chain.then(function () {
      return loadScript("https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js");
    });
    if (!global.BotBarChatSync) chain = chain.then(function () {
      return loadScript(base + "sync.js");
    });
    return chain;
  }
  function ensureTiles() {
    var root = document.getElementById("botbar-overlay-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "botbar-overlay-root";
      document.body.appendChild(root);
    }
    function tile(id, vidId, label) {
      var el = document.getElementById(id);
      if (el) {
        if (el.parentElement !== root) root.appendChild(el);
        return el;
      }
      el = document.createElement("div");
      el.id = id; el.className = "bot-tile"; el.hidden = true;
      el.innerHTML = '<video id="' + vidId + '" autoplay playsinline muted></video><div class="bot-label">' + label + "</div>";
      root.appendChild(el);
      return el;
    }
    tile("muse-tile", "muse-video", "Muse");
    tile("dots-tile", "dots-video", "Dots");
    return root;
  }

  function hasLive(stream) {
    return !!(stream && stream.getTracks && stream.getTracks().some(function (t) { return t.readyState === "live"; }));
  }
  function setVisible(tile, vid, on) {
    if (!tile) return;
    if (on && relayLive(tile.id === "muse-tile" ? "muse" : "dots")) return;
    if (on && hasLive(vid && vid.srcObject) && vid.videoWidth > 0) {
      tile.hidden = false;
      tile.classList.add("live");
    } else {
      tile.hidden = true;
      tile.classList.remove("live");
    }
  }
  function watch(which, stream) {
    if (!stream || !stream.getTracks) return;
    stream.getTracks().forEach(function (t) {
      t.addEventListener("ended", function () {
        var v = document.getElementById(which === "muse" ? "muse-video" : "dots-video");
        if (v && v.srcObject === stream && !hasLive(stream) && global.BotBarFeeds) global.BotBarFeeds.disconnect(which);
      });
    });
  }

  function installFeeds() {
    var museTile = document.getElementById("muse-tile");
    var dotsTile = document.getElementById("dots-tile");
    var museVid = document.getElementById("muse-video");
    var dotsVid = document.getElementById("dots-video");
    if (museVid) museVid.muted = true;
    if (dotsVid) dotsVid.muted = false; /* show page plays bot audio; first can be muted to help autoplay then unmuted */
    global.BotBarFeeds = {
      connect: function (which, stream) {
        var vid = which === "muse" ? museVid : dotsVid;
        var tile = which === "muse" ? museTile : dotsTile;
        if (!vid) return;
        if (vid.srcObject && vid.srcObject !== stream) {
          try { vid.srcObject.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
        }
        vid.srcObject = stream || null;
        vid.muted = false;
        var showIt = function () { setVisible(tile, vid, true); };
        vid.onloadedmetadata = showIt;
        vid.onplaying = showIt;
        if (vid.play) vid.play().catch(function () {
          vid.muted = true;
          vid.play().then(function () { vid.muted = false; }).catch(function () {});
        });
        watch(which, stream);
      },
      disconnect: function (which) {
        var vid = which === "muse" ? document.getElementById("muse-video") : document.getElementById("dots-video");
        var tile = which === "muse" ? document.getElementById("muse-tile") : document.getElementById("dots-tile");
        if (vid && vid.srcObject) {
          try { vid.srcObject.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
          vid.srcObject = null;
        }
        setVisible(tile, vid, false);
      }
    };
  }

  function wireSync() {
    if (!global.BotBarChatSync) return;
    var applying = false;
    function goPage(n1) {
      var n = Math.max(1, Math.min(99, n1 | 0));
      try {
        global.dispatchEvent(new CustomEvent("botbar-chat-page", { detail: { page: n } }));
      } catch (e) {}
      if (typeof global.BotBarShow === "object" && typeof global.BotBarShow.go === "function") {
        global.BotBarShow.go(n);
        return;
      }
      if (typeof global.show === "function") {
        var idx = Math.max(0, n - 1);
        if (typeof global.page === "number" && idx === global.page) return;
        applying = true;
        try { global.show(idx); } finally { applying = false; }
        return;
      }
      var want = "#page=" + n;
      if (location.hash !== want) {
        applying = true;
        try { location.hash = "page=" + n; } finally { setTimeout(function () { applying = false; }, 0); }
      }
    }
    if (typeof global.show === "function" && !global.show.__botbarWrapped) {
      var orig = global.show;
      global.show = function (n) {
        orig.apply(this, arguments);
        if (applying) return;
        var want = Math.max(0, Math.min(98, n | 0)) + 1;
        if (BotBarChatSync.get().page !== want) BotBarChatSync.publish({ page: want });
      };
      global.show.__botbarWrapped = true;
    }
    BotBarChatSync.onMedia(function (which, stream) {
      if (which === "muse" || which === "dots") BotBarFeeds.connect(which, stream);
    });
    BotBarChatSync.subscribe(function (s) {
      if (s.page) goPage(s.page);
      if (!s.playing) {
        BotBarFeeds.disconnect("muse");
        BotBarFeeds.disconnect("dots");
      }
    });
    BotBarChatSync.start("show");
    function publishHashPage() {
      if (applying) return;
      var n = +new URLSearchParams((location.hash || "").slice(1)).get("page") || 1;
      n = Math.max(1, Math.min(9, n | 0));
      if (BotBarChatSync.get().page !== n) BotBarChatSync.publish({ page: n });
    }
    window.addEventListener("hashchange", publishHashPage);
    /* The scene IIFE updates #page=N with history.replaceState, which does not
       fire hashchange. Hook it so the remote stays in sync on arrow keys. */
    if (!history.replaceState.__botbarWrapped) {
      var _replace = history.replaceState;
      history.replaceState = function () {
        var ret = _replace.apply(this, arguments);
        try { publishHashPage(); } catch (e) {}
        return ret;
      };
      history.replaceState.__botbarWrapped = true;
    }
  }

  /* ---- Relay feed: frames + voice over a plain WebSocket (works on any network,
     no WebRTC/TURN needed). URL comes from feed.json next to this script. ---- */
  var relay = { last: { muse: 0, dots: 0 }, ac: null, next: { muse: 0, dots: 0 }, ws: null };
  function relayLive(which) { return Date.now() - relay.last[which] < 5000; }
  function audioCtx() {
    if (!relay.ac) {
      try { relay.ac = new (global.AudioContext || global.webkitAudioContext)(); } catch (e) { relay.ac = null; }
    }
    return relay.ac;
  }
  function unlockAudio() {
    var ac = audioCtx();
    if (ac && ac.state !== "running") { try { ac.resume(); } catch (e) {} }
  }
  ["pointerup", "touchend", "click", "keydown"].forEach(function (ev) {
    global.addEventListener(ev, unlockAudio, { passive: true, capture: true });
  });
  function relayCanvas(which) {
    var tile = document.getElementById(which + "-tile");
    if (!tile) return null;
    var c = tile.querySelector("canvas.bot-canvas");
    if (!c) {
      c = document.createElement("canvas");
      c.className = "bot-canvas"; c.width = 256; c.height = 256;
      tile.insertBefore(c, tile.firstChild);
    }
    return c;
  }
  function relayFrame(which, buf) {
    var c = relayCanvas(which); if (!c) return;
    var blob = new Blob([buf], { type: "image/jpeg" });
    var draw = function (img) {
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      relay.last[which] = Date.now();
      var tile = document.getElementById(which + "-tile");
      tile.classList.add("relay"); tile.hidden = false; tile.classList.add("live");
    };
    if (global.createImageBitmap) createImageBitmap(blob).then(draw).catch(function () {});
    else { var im = new Image(); im.onload = function () { draw(im); URL.revokeObjectURL(im.src); }; im.src = URL.createObjectURL(blob); }
  }
  function relayAudio(which, h, buf) {
    var ac = audioCtx(); if (!ac || ac.state !== "running") return;
    var pcm = new Int16Array(buf); if (!pcm.length) return;
    var sr = h.sr || 24000, b = ac.createBuffer(1, pcm.length, sr), d = b.getChannelData(0);
    for (var i = 0; i < pcm.length; i++) d[i] = pcm[i] / 32768;
    var src = ac.createBufferSource(); src.buffer = b; src.connect(ac.destination);
    var t = Math.max(ac.currentTime + 0.08, relay.next[which]);
    if (t - ac.currentTime > 0.6) t = ac.currentTime + 0.08; /* drop backlog, stay live */
    src.start(t); relay.next[which] = t + b.duration;
  }
  setInterval(function () {
    ["muse", "dots"].forEach(function (w) {
      var tile = document.getElementById(w + "-tile");
      if (tile && tile.classList.contains("relay") && !relayLive(w)) {
        tile.classList.remove("relay");
        var v = document.getElementById(w + "-video");
        if (!(v && hasLive(v.srcObject) && v.videoWidth > 0)) { tile.hidden = true; tile.classList.remove("live"); }
      }
    });
  }, 1000);
  function startRelay() {
    var url = new URL("feed.json", scriptUrl()).href + "?t=" + Date.now();
    fetch(url, { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (cfg) {
      if (!cfg || !cfg.ws) { setTimeout(startRelay, 15000); return; }
      var ws = new WebSocket(cfg.ws); ws.binaryType = "arraybuffer"; relay.ws = ws;
      var hdr = null;
      ws.onmessage = function (ev) {
        if (typeof ev.data === "string") { try { hdr = JSON.parse(ev.data); } catch (e) { hdr = null; } return; }
        if (!hdr) return;
        if (hdr.kind === "frame") relayFrame(hdr.which, ev.data);
        else if (hdr.kind === "audio") relayAudio(hdr.which, hdr, ev.data);
        hdr = null;
      };
      ws.onclose = function () { relay.ws = null; setTimeout(startRelay, 3000); };
      ws.onerror = function () { try { ws.close(); } catch (e) {} };
    }).catch(function () { setTimeout(startRelay, 15000); });
  }
  global.BotBarRelay = { status: function () { return { ws: relay.ws ? relay.ws.readyState : -1, last: relay.last, audio: relay.ac ? relay.ac.state : "none" }; } };

  function ready(fn) {
    if (document.body) fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    loadCss();
    ensureTiles();
    installFeeds();
    startRelay();
    ensureDeps().then(wireSync).catch(function (e) { console.warn("BotBar overlay deps", e); });
  });
})(window);
