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
    if (on && hasLive(vid && vid.srcObject)) {
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
        if (!hasLive(stream) && global.BotBarFeeds) global.BotBarFeeds.disconnect(which);
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
        showIt();
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
    window.addEventListener("hashchange", function () {
      if (applying) return;
      var n = +new URLSearchParams((location.hash || "").slice(1)).get("page") || 1;
      n = Math.max(1, Math.min(9, n | 0));
      if (BotBarChatSync.get().page !== n) BotBarChatSync.publish({ page: n });
    });
  }

  function ready(fn) {
    if (document.body) fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    loadCss();
    ensureTiles();
    installFeeds();
    ensureDeps().then(wireSync).catch(function (e) { console.warn("BotBar overlay deps", e); });
  });
})(window);
