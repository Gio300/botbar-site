(function (global) {
  if (global.__BOTBAR_OVERLAY_LAYER__) return;
  global.__BOTBAR_OVERLAY_LAYER__ = true;
  var BOTS = [
    { id: "muse", label: "Muse", tile: "muse-tile", vid: "muse-video", liveCrop: true },
    { id: "dots", label: "Dots", tile: "dots-tile", vid: "dots-video", liveCrop: true },
    { id: "grokbot", label: "Grok Bot", tile: "grokbot-tile", vid: "grokbot-video", logo: "grokbot-logo.svg", preferLogo: true },
    { id: "grok", label: "Grok", tile: "grok-tile", vid: "grok-video", logo: "grok-logo.svg", preferLogo: true }
  ];
  function botOf(which) { for (var i = 0; i < BOTS.length; i++) if (BOTS[i].id === which) return BOTS[i]; return null; }
  function botIds() { return BOTS.map(function (b) { return b.id; }); }

  function loadCss() {
    var href = new URL("overlay-layer.css?v=logo2", scriptUrl()).href;
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
    BOTS.forEach(function (b) { tile(b.tile, b.vid, b.label); });
    return root;
  }

  function preferLogo(b) { return !!(b && b.preferLogo); }
  function isLogoBot(which) { return preferLogo(botOf(which)); }
  function statusBots() {
    var st = relay.status || {};
    return st.bots || (st.bridge && st.bridge.bots) || (st.state && st.state.bots) || {};
  }
  /* KloudyBar button pressed (state=live) or helper reports active. Hidden until then. */
  function botIsActive(which) {
    var st = relay.status || {};
    var state = st.state || {};
    if (state[which] === "live") return true;
    var info = statusBots()[which] || {};
    if (info.status === "active") return true;
    return false;
  }
  function usesLogoTile(which) {
    var b = botOf(which);
    if (isLogoBot(which)) return botIsActive(which);
    if (!b) return !usableAvatar(which);
    if (b.liveCrop) return false; /* Muse / Dots stay on their live tiles */
    return !usableAvatar(which);
  }
  function usableAvatar(which) {
    var b = botOf(which);
    if (preferLogo(b)) return false;
    var vid = document.getElementById(b ? b.vid : which + "-video");
    if (vid && hasLive(vid.srcObject) && vid.videoWidth > 0) return true;
    if (relayLive(which)) return true;
    return false;
  }
  function assetUrl(name) {
    return new URL("assets/" + name + "?v=logo2", scriptUrl()).href;
  }
  function ensureLogoStage(tile, b) {
    if (!tile || !b) return null;
    var stage = tile.querySelector(".bot-logo-stage");
    if (stage) return stage;
    stage = document.createElement("div");
    stage.className = "bot-logo-stage";
    var wave = document.createElement("canvas");
    wave.className = "bot-wave";
    wave.setAttribute("aria-hidden", "true");
    var pane = document.createElement("div");
    pane.className = "bot-logo-pane";
    var face = document.createElement("div");
    face.className = "bot-logo-face";
    if (b.logo && /grokbot/.test(b.logo)) {
      var holder = document.createElement("div");
      holder.className = "bot-logo bot-logo-svg";
      face.appendChild(holder);
      fetch(assetUrl(b.logo)).then(function (r) { return r.ok ? r.text() : ""; }).then(function (svg) {
        if (!svg) return;
        svg = svg.replace(/<svg([^>]*)>/, '<svg$1 class="gb-mark"><g class="gb-spin"><g class="gb-look"><g class="gb-blink">');
        svg = svg.replace(/<\/svg>/, "</g></g></g></svg>");
        holder.innerHTML = svg;
      }).catch(function () {});
    } else if (b.logo) {
      var img = document.createElement("img");
      img.className = "bot-logo";
      img.alt = b.label || "";
      img.src = assetUrl(b.logo);
      face.appendChild(img);
    } else {
      var mono = document.createElement("div");
      mono.className = "bot-monogram";
      mono.textContent = (b.initial || (b.label || "?").charAt(0)).toUpperCase();
      face.appendChild(mono);
    }
    pane.appendChild(face);
    var cap = document.createElement("div");
    cap.className = "bot-caption";
    cap.hidden = true;
    stage.appendChild(wave);
    stage.appendChild(pane);
    stage.appendChild(cap);
    tile.appendChild(stage);
    return stage;
  }
  function setCaption(which, text) {
    var tile = document.getElementById(which + "-tile");
    if (!tile) return;
    var cap = tile.querySelector(".bot-caption");
    if (!cap) return;
    text = String(text || "").replace(/\s+/g, " ").trim();
    if (!text) { cap.hidden = true; cap.textContent = ""; return; }
    cap.hidden = false;
    cap.textContent = text;
  }
  function syncLogoMode(which) {
    var b = botOf(which) || { id: which, label: which, tile: which + "-tile", initial: String(which).charAt(0) };
    var tile = document.getElementById(b.tile || which + "-tile");
    if (!tile) return;
    ensureLogoStage(tile, b);
    if (isLogoBot(which)) {
      tile.classList.add("logo-mode");
      tile.classList.remove("relay");
      if (botIsActive(which)) {
        tile.hidden = false;
        tile.classList.add("live");
      } else {
        tile.hidden = true;
        tile.classList.remove("live");
      }
      return;
    }
    if (usesLogoTile(which)) {
      tile.classList.add("logo-mode");
      tile.hidden = false;
      tile.classList.add("live");
      tile.classList.remove("relay");
    } else {
      tile.classList.remove("logo-mode");
    }
  }
  function noteBotLevel(which, pk) {
    if (!relay.levelTarget) relay.levelTarget = {};
    pk = +pk || 0;
    if (pk > (relay.levelTarget[which] || 0)) relay.levelTarget[which] = pk;
  }
  function botLevel(which) {
    if (relay.levelLock && relay.levelLock[which] != null) return +relay.levelLock[which];
    return relay.level && relay.level[which] || 0;
  }
  function drawWave(b, level, now) {
    var tile = document.getElementById(b.tile);
    if (!tile || !tile.classList.contains("logo-mode")) return;
    var c = tile.querySelector("canvas.bot-wave");
    if (!c) return;
    var dpr = global.devicePixelRatio || 1;
    var w = Math.max(1, Math.round((c.clientWidth || tile.clientWidth || 160) * dpr));
    var h = Math.max(1, Math.round((c.clientHeight || tile.clientHeight || 160) * dpr));
    if (c.width !== w) c.width = w;
    if (c.height !== h) c.height = h;
    var ctx = c.getContext("2d");
    ctx.clearRect(0, 0, w, h);
    var cx = w / 2, cy = h / 2, min = Math.min(w, h);
    var r = min * 0.33;
    var n = 36;
    var speaking = level > 0.04;
    var idle = 0.14 + 0.05 * Math.sin(now / 900);
    ctx.lineCap = "round";
    for (var i = 0; i < n; i++) {
      var ang = (i / n) * Math.PI * 2 - Math.PI / 2;
      var wobble = Math.abs(Math.sin(now / 90 + i * 0.55)) * 0.7 + 0.3;
      var wob2 = Math.abs(Math.sin(now / 140 + i * 1.27)) * 0.5;
      var amp = speaking ? (idle * 0.25 + level * (0.55 + 0.75 * wobble + 0.4 * wob2)) : idle * 0.55;
      if (amp > 1.2) amp = 1.2;
      var inner = r + 2 * dpr;
      var len = (min * 0.145) * (0.22 + amp);
      var x0 = cx + Math.cos(ang) * inner, y0 = cy + Math.sin(ang) * inner;
      var x1 = cx + Math.cos(ang) * (inner + len), y1 = cy + Math.sin(ang) * (inner + len);
      ctx.strokeStyle = speaking ? ("rgba(245,208,0," + (0.5 + 0.45 * Math.min(1, amp)).toFixed(3) + ")") : "rgba(245,208,0,0.28)";
      ctx.lineWidth = Math.max(2, min * 0.018);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }
    if (speaking) {
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.96, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(245,208,0," + (0.16 + 0.4 * Math.min(1, level)).toFixed(3) + ")";
      ctx.lineWidth = Math.max(2, min * 0.012);
      ctx.stroke();
    }
  }
  function startLogoAnim() {
    if (relay.logoAnim) return;
    relay.logoAnim = true;
    if (!relay.level) relay.level = { muse: 0, dots: 0, grokbot: 0, grok: 0 };
    if (!relay.levelTarget) relay.levelTarget = { muse: 0, dots: 0, grokbot: 0, grok: 0 };
    var last = (global.performance && performance.now()) || Date.now();
    function tick(now) {
      var dt = Math.min(0.08, (now - last) / 1000); last = now;
      BOTS.forEach(function (b) {
        if (relay.levelLock && relay.levelLock[b.id] != null) {
          relay.level[b.id] = +relay.levelLock[b.id];
          relay.levelTarget[b.id] = +relay.levelLock[b.id];
        } else {
          var t = relay.levelTarget[b.id] || 0;
          t *= Math.pow(0.18, dt);
          if (t < 0.002) t = 0;
          relay.levelTarget[b.id] = t;
          var cur = relay.level[b.id] || 0;
          var g = t > cur ? 0.5 : 0.2;
          cur += (t - cur) * (1 - Math.pow(1 - g, dt * 60));
          relay.level[b.id] = cur;
        }
        var lvl = botLevel(b.id);
        if (isLogoBot(b.id) && botIsActive(b.id) && lvl < 0.05) {
          /* Listening light: a calm pulse on the ring while the bot is ACTIVE and not talking. */
          lvl = 0.14 + 0.05 * Math.sin(now / 420);
        }
        var info = statusBots()[b.id] || {};
        if (typeof info.hears_level === "number" && info.hears_level > lvl) {
          lvl = Math.max(lvl, Math.min(0.35, info.hears_level * 2.2));
        }
        if (typeof info.voice_level === "number" && info.voice_level > (relay.levelLock && relay.levelLock[b.id] != null ? -1 : lvl)) {
          if (!(relay.levelLock && relay.levelLock[b.id] != null)) noteBotLevel(b.id, info.voice_level);
        }
        drawWave(b, lvl, now);
      });
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  global.BotBarLogoTiles = {
    setLevel: function (which, v) {
      if (!relay.levelLock) relay.levelLock = {};
      if (!relay.levelTarget) relay.levelTarget = {};
      if (!relay.level) relay.level = {};
      if (v == null || v === false) { delete relay.levelLock[which]; return; }
      v = Math.max(0, Math.min(1, +v));
      relay.levelLock[which] = v;
      relay.levelTarget[which] = v;
      relay.level[which] = v;
    },
    setCaption: function (which, text) { setCaption(which, text); },
    sync: function (which) { if (which) syncLogoMode(which); else BOTS.forEach(function (b) { syncLogoMode(b.id); }); }
  };


  function hasLive(stream) {
    return !!(stream && stream.getTracks && stream.getTracks().some(function (t) { return t.readyState === "live"; }));
  }
  function setVisible(tile, vid, on) {
    if (!tile) return;
    /* A tile drawn from the relay feed stays up until the feed itself goes stale
       (1 s check below). The PeerJS sync's playing:false / disconnect must not hide it,
       or the two layers fight and the frame flickers. */
    var liveId = (tile && tile.id || "").replace(/-tile$/, "");
    if (isLogoBot(liveId)) { syncLogoMode(liveId); return; }
    if (usesLogoTile(liveId)) { syncLogoMode(liveId); return; }
    if (relayLive(liveId)) return;
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
        var b = botOf(which);
        var v = document.getElementById(b ? b.vid : which + "-video");
        if (v && v.srcObject === stream && !hasLive(stream) && global.BotBarFeeds) global.BotBarFeeds.disconnect(which);
      });
    });
  }

  function installFeeds() {
    global.BotBarFeeds = {
      connect: function (which, stream) {
        var b = botOf(which);
        var vid = document.getElementById(b ? b.vid : which + "-video");
        var tile = document.getElementById(b ? b.tile : which + "-tile");
        if (!vid) return;
        if (vid.srcObject && vid.srcObject !== stream) {
          try { vid.srcObject.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
        }
        vid.srcObject = stream || null;
        vid.muted = true; /* bot voices play once, via the feed PCM mixer — never from the tile <video> */
        var showIt = function () { setVisible(tile, vid, true); };
        vid.onloadedmetadata = showIt;
        vid.onplaying = showIt;
        if (vid.play) vid.play().catch(function () {});
        watch(which, stream);
      },
      disconnect: function (which) {
        var b = botOf(which);
        var vid = document.getElementById(b ? b.vid : which + "-video");
        var tile = document.getElementById(b ? b.tile : which + "-tile");
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
      if (botOf(which)) BotBarFeeds.connect(which, stream);
    });
    BotBarChatSync.subscribe(function (s) {
      if (s.page) goPage(s.page);
      if (!s.playing) {
        botIds().forEach(function (w) { BotBarFeeds.disconnect(w); });
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
  var relay = { last: { muse: 0, dots: 0, grokbot: 0, grok: 0 }, ac: null, next: { muse: 0, dots: 0, grokbot: 0, grok: 0 }, ws: null,
    under: { muse: 0, dots: 0, grokbot: 0, grok: 0 }, skips: 0, botLoudUntil: 0, mic: null, micSent: 0, micGated: 0, micWant: null, heldStream: null, micPrompt: false, micErr: null };
  var JITTER_LEAD = 0.25;
  function relayLive(which) { return Date.now() - relay.last[which] < 5000; }
  var IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  relay.played = { muse: 0, dots: 0, grokbot: 0, grok: 0 }; relay.peak = { muse: 0, dots: 0, grokbot: 0, grok: 0 };
    relay.level = { muse: 0, dots: 0, grokbot: 0, grok: 0 }; relay.levelTarget = { muse: 0, dots: 0, grokbot: 0, grok: 0 }; relay.levelLock = {};
  function audioCtx(gesture) {
    if (!relay.ac && IOS && !gesture) return null; /* iPhone: build it inside the tap so the playback session applies */
    if (!relay.ac) {
      try { relay.ac = new (global.AudioContext || global.webkitAudioContext)(); } catch (e) { relay.ac = null; }
    }
    return relay.ac;
  }
  /* Bot voices always play on /chat (Auto/website and Phone). Zoom is a future SDK path.
     Browsers start audio after a gesture; we resume on any input, on pageshow, and on a short
     timer so a screen-share of /chat can hear bots after one tap (or a prior gesture). A silent
     keep-alive holds the AudioContext open so Chrome does not suspend it mid-share. */
  function soundChip(show) {
    /* KloudyBar owns start/stop. No on-page sound button. Hide any leftover chip. */
    var el = document.getElementById("bb-sound-chip");
    if (el) el.style.display = "none";
    return;
  }

  function keepAlive() {
    var ac = relay.ac; if (!ac || ac.state !== "running" || relay.keep) return;
    try {
      var buf = ac.createBuffer(1, Math.max(1, Math.floor(ac.sampleRate * 0.05)), ac.sampleRate);
      var src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
      var g = ac.createGain(); g.gain.value = 0.0;
      src.connect(g); g.connect(ac.destination); src.start();
      relay.keep = src;
    } catch (e) {}
  }
  /* iPhone/iPad (Safari and Chrome both use WebKit): Web Audio is "ambient" by default, so the
     ring/silent switch mutes it and it never starts without a touch. Ask for the media-playback
     session and keep a silent looping <audio> element alive from the first tap, so bot voices
     play like a video does (also what a Zoom/screen-share of this tab picks up). */
  var SILENT_WAV = "data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSADAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==";
  function playbackSession() {
    try { if (navigator.audioSession && navigator.audioSession.type !== "playback") navigator.audioSession.type = "playback"; } catch (e) {}
    try {
      if (!relay.keepEl) {
        var a = document.createElement("audio");
        a.src = SILENT_WAV; a.loop = true; a.setAttribute("playsinline", ""); a.setAttribute("webkit-playsinline", "");
        a.style.display = "none"; (document.body || document.documentElement).appendChild(a);
        relay.keepEl = a;
      }
      if (relay.keepEl.paused) { var pr = relay.keepEl.play(); if (pr && pr.catch) pr.catch(function () {}); }
    } catch (e) {}
  }
  function unlockAudio(ev) {
    var gesture = !!(ev && ev.type && ev.type !== "pageshow" && ev.type !== "visibilitychange");
    if (gesture) playbackSession();
    var ac = audioCtx(gesture);
    if (!ac) return;
    if (gesture) relay.unlocked = true;
    /* iOS: getUserMedia must run inside touchend/click on the prompt, never from pointerdown. */
    if (gesture && micWanted() && !relay.mic && !relay.micPrompt && ev && (ev.type === "touchend" || ev.type === "click") && !relay.micStarting) {
      startWebMic(true);
    }
    setTimeout(micChip, 300);
    if (gesture && ac.state !== "running") {
      /* old WebKit only unlocks if a sound is started inside the tap itself */
      try { var b0 = ac.createBuffer(1, 1, 22050), s0 = ac.createBufferSource(); s0.buffer = b0; s0.connect(ac.destination); s0.start(0); } catch (e) {}
    }
    if (ac.state !== "running") {
      try { ac.resume().then(function () { keepAlive(); soundChip(false); }).catch(function () {}); } catch (e) {}
    } else { keepAlive(); soundChip(false); }
  }
  ["pointerup", "pointerdown", "touchend", "click", "keydown"].forEach(function (ev) {
    global.addEventListener(ev, unlockAudio, { passive: true, capture: true });
  });
  global.addEventListener("pageshow", function () { unlockAudio(); });
  document.addEventListener("visibilitychange", function () { if (!document.hidden) unlockAudio(); });
  setInterval(function () {
    var ac = relay.ac;
    if (ac && ac.state !== "running") { try { ac.resume().then(keepAlive).catch(function () {}); } catch (e) {} }
  }, 1500);
  /* Stall watchdog (ROUTES 2026-11-17): an iPhone showed its audio clock frozen while reporting "running"
     (after an interruption), so queued voices never played. If the clock stops, try suspend/resume; if it
     stays frozen, drop the context and show the sound chip so one tap rebuilds it. */
  relay.stalls = 0;
  setInterval(function () {
    var ac = relay.ac; if (!ac || document.hidden) { relay.lastT = null; return; }
    var t = ac.currentTime;
    if (ac.state === "running" && relay.lastT != null && t === relay.lastT) relay.stall = (relay.stall || 0) + 1; else relay.stall = 0;
    relay.lastT = t;
    if (relay.stall === 2) { try { ac.suspend().then(function () { return ac.resume(); }).catch(function () {}); } catch (e) {} }
    if (relay.stall >= 4) {
      relay.stalls++; relay.stall = 0; relay.lastT = null;
      stopWebMic();
      try { ac.close(); } catch (e) {}
      relay.ac = null; relay.keep = null; relay.next = { muse: 0, dots: 0, grokbot: 0, grok: 0 }; relay.botLoudUntil = 0;
      soundChip(true);
    }
  }, 1000);
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
    if (isLogoBot(which)) { syncLogoMode(which); return; } /* no scraped window crops on logo tiles */
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
    if (!webOut()) return; /* remote: no Website / Phone->Web toggle on -> voices are not for the website */
    var ac = audioCtx(!IOS || !!relay.unlocked); if (!ac) { soundChip(true); return; }
    if (ac.state !== "running") { try { ac.resume().then(keepAlive).catch(function () {}); } catch (e) {} soundChip(true); return; }
    soundChip(false);
    var pcm = new Int16Array(buf); if (!pcm.length) return;
    var sr = h.sr || 24000, b = ac.createBuffer(1, pcm.length, sr), d = b.getChannelData(0);
    for (var i = 0; i < pcm.length; i++) { d[i] = pcm[i] / 32768; var av = d[i] < 0 ? -d[i] : d[i]; if (av > relay.peak[which]) relay.peak[which] = av; }
    relay.played[which] += pcm.length;
    var src = ac.createBufferSource(); src.buffer = b; src.connect(ac.destination);
    /* Jitter buffer (ROUTES 2026-11-17): keep ~250 ms queued per bot. Chunks chain back to back; only a
       real underrun (queue ran dry) re-buffers, so network bursts no longer chop the voice into pieces. */
    var now = ac.currentTime, nx = relay.next[which], t;
    if (!nx || nx < now + 0.02) { t = now + JITTER_LEAD; if (nx) relay.under[which]++; }
    else if (nx > now + 1.2) { t = now + JITTER_LEAD; relay.skips++; } /* far behind live: jump ahead */
    else t = nx;
    src.start(t); relay.next[which] = t + b.duration;
    var pk = 0; for (var k = 0; k < d.length; k += 8) { var q = d[k] < 0 ? -d[k] : d[k]; if (q > pk) pk = q; }
    if (pk > 0.02 && t + b.duration > relay.botLoudUntil) relay.botLoudUntil = t + b.duration; /* for the mic echo gate */
    if (pk > 0.02) relay.botPeak = Math.max(pk, (relay.botPeak || 0) * 0.85);
    else relay.botPeak = (relay.botPeak || 0) * 0.92;
    noteBotLevel(which, pk);
  }
  /* ---- Website mic -> bots (KloudyBar Website mode) ----
     No on-page mic button. The site follows KloudyBar: web_io (Website) plus mic_on.
     On desktop Chrome, Website mode starts getUserMedia and the AudioContext
     itself (permission already granted). iPhone still needs one tap on the page
     so the playback session applies; after that, Website mode runs the mic. */
  function micOn() { var s = relay.status && relay.status.state; return !s || s.mic_on !== false; }
  function micWanted() { return webIn() && micOn(); }
  function routesNow() { var r = relay.status && relay.status.routes; return r || { web_io: false, phone_io: false, phone_web: false }; }
  function webIn() { return !!routesNow().web_io; }
  function webOut() { var o = relay.status && relay.status.outputs; return !o || o.website !== false; }
  function micChip() {
    var el = document.getElementById("bb-mic-chip");
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }
  function liveHeld() {
    var s = relay.heldStream;
    if (!s) return null;
    var tr = s.getAudioTracks();
    if (!tr.length || tr[0].readyState !== "live") return null;
    return s;
  }
  function ensureMicPromptStyle() {
    if (document.getElementById("bb-mic-prompt-css")) return;
    var s = document.createElement("style");
    s.id = "bb-mic-prompt-css";
    s.textContent = "#bb-mic-prompt{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:rgba(6,8,12,.82);-webkit-tap-highlight-color:transparent;cursor:pointer;pointer-events:auto;touch-action:manipulation}" +
      "#bb-mic-prompt, #bb-mic-prompt *{pointer-events:auto !important}" +
      "#bb-mic-prompt .bb-mic-card{margin:24px;padding:28px 24px;max-width:22rem;border-radius:20px;background:#11181c;color:#f4f1e8;text-align:center;box-shadow:0 16px 60px #000c;border:1px solid rgba(255,255,255,.14);font:700 22px/1.25 Arial,Helvetica,sans-serif}" +
      "#bb-mic-prompt .bb-mic-card span{display:block;margin-top:12px;font:500 15px/1.45 Arial,Helvetica,sans-serif;color:#c9d4d8}" +
      "#bb-mic-prompt .bb-mic-err{display:block;margin-top:14px;font:600 14px/1.4 Arial,Helvetica,sans-serif;color:#ffb4b4}";
    (document.head || document.documentElement).appendChild(s);
  }
  function micPromptErrEl() {
    var el = document.getElementById("bb-mic-prompt");
    if (!el) return null;
    var err = el.querySelector(".bb-mic-err");
    if (!err) {
      var card = el.querySelector(".bb-mic-card") || el;
      err = document.createElement("div");
      err.className = "bb-mic-err";
      card.appendChild(err);
    }
    return err;
  }
  function showMicDenied(msg) {
    showMicPrompt(true);
    var err = micPromptErrEl();
    if (err) err.textContent = msg || "Mic access was denied. Allow the microphone for this site, then tap again.";
  }
  function showMicPrompt(show) {
    ensureMicPromptStyle();
    var el = document.getElementById("bb-mic-prompt");
    if (!show || (!micWanted() && !relay.micErr) || relay.mic) {
      if (el) el.style.display = "none";
      relay.micPrompt = false;
      return;
    }
    if (!el) {
      el = document.createElement("div");
      el.id = "bb-mic-prompt";
      el.setAttribute("role", "button");
      el.tabIndex = 0;
      el.innerHTML = '<div class="bb-mic-card">Tap to connect mic<span>KloudyBar Website is on. Tap so this device can send its mic to the bots.</span></div>';
      function tap(ev) {
        /* iOS: getUserMedia must be called synchronously inside touchend/click, not pointerdown. */
        if (ev && ev.type === "pointerdown") return;
        if (ev && ev.type === "touchend" && ev.cancelable) ev.preventDefault(); /* prevent the following click so we only fire once */
        if (ev) ev.stopPropagation();
        if (relay.micGestureAt && Date.now() - relay.micGestureAt < 700) return;
        relay.micGestureAt = Date.now();
        relay.unlocked = true;
        relay.micErr = null;
        var err = micPromptErrEl(); if (err) err.textContent = "";
        try { playbackSession(); } catch (e1) {}
        var ac = audioCtx(true);
        if (ac && ac.state !== "running") { try { ac.resume(); } catch (e2) {} }
        startWebMic(true); /* getUserMedia is invoked directly in this handler */
      }
      el.addEventListener("click", tap, true);
      el.addEventListener("touchend", tap, true);
      el.addEventListener("keydown", function (ev) { if (ev.key === "Enter" || ev.key === " ") tap(ev); }, true);
    }
    /* Re-parent to the end of body so nothing (overlay root, leftover emulator layers) can cover it. */
    (document.body || document.documentElement).appendChild(el);
    el.style.display = "flex";
    el.style.zIndex = "2147483647";
    el.style.pointerEvents = "auto";
    relay.micPrompt = true;
  }
  function micSocket() {
    if (!relay.wsUrl) return null;
    var m = relay.mic; if (!m) return null;
    if (m.ws && m.ws.readyState <= 1) return m.ws;
    var u = relay.wsUrl.replace(/\/feed(\?.*)?$/, "/webmic");
    try { m.ws = new WebSocket(u); m.ws.binaryType = "arraybuffer"; } catch (e) { m.ws = null; }
    return m.ws;
  }

  function attachMic(stream) {
    var ac = relay.ac || audioCtx(true);
    if (!ac) { showMicPrompt(true); return; }
    if (relay.mic) { micSocket(); showMicPrompt(false); return; }
    var srcN = ac.createMediaStreamSource(stream), proc = ac.createScriptProcessor(2048, 1, 1), mute = ac.createGain();
    mute.gain.value = 0; srcN.connect(proc); proc.connect(mute); mute.connect(ac.destination); /* never played locally */
    var ratio = ac.sampleRate / 24000;
    relay.mic = { stream: stream, proc: proc, src: srcN, ws: null };
    relay.heldStream = stream;
    micSocket(); /* open /webmic immediately so Website mode is live without waiting for Play */
    try { if (ac.state !== "running") ac.resume().then(keepAlive).catch(function () {}); else keepAlive(); } catch (e) {}
    proc.onaudioprocess = function (e) {
      if (!relay.mic || !micWanted()) return; /* Website mode (web_io) is enough; do not wait for Play */
      var x = e.inputBuffer.getChannelData(0), s2 = 0;
      for (var i = 0; i < x.length; i++) s2 += x[i] * x[i];
      var r = Math.sqrt(s2 / x.length);
      /* Never send the page's own bot playback back to the bots. Only gate while a bot is actually playing; a quiet phone mic must still pass. */
      if (relay.botLoudUntil && ac.currentTime < relay.botLoudUntil + 0.25) {
        var floor = Math.max(0.02, (relay.botPeak || 0.02) * 1.2);
        if (r < floor) { relay.micGated++; return; }
      }
      var ws = micSocket(); if (!ws || ws.readyState !== 1) return;
      var n = Math.floor(x.length / ratio), out = new Int16Array(n);
      for (var j = 0; j < n; j++) {
        var a0 = Math.floor(j * ratio), a1 = Math.max(a0 + 1, Math.floor((j + 1) * ratio)), acc = 0;
        for (var q = a0; q < a1 && q < x.length; q++) acc += x[q];
        var v = acc / (a1 - a0); out[j] = Math.max(-1, Math.min(1, v)) * 32767;
      }
      try { ws.send(out.buffer); relay.micSent++; } catch (err) {}
    };
    showMicPrompt(false);
    micChip();
  }
  function startWebMic(fromGesture) {
    if (!micWanted() || relay.mic) return;
    if (liveHeld()) { attachMic(liveHeld()); return; }
    /* A stuck micStarting (getUserMedia never resolved after a pointerdown) must not freeze later taps. */
    if (relay.micStarting && relay.micStartAt && Date.now() - relay.micStartAt < 2000 && !fromGesture) return;
    if (IOS && !fromGesture) { showMicPrompt(true); return; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showMicDenied("This browser cannot use the microphone.");
      return;
    }
    var ac = relay.ac || audioCtx(!!fromGesture || !IOS || !!relay.unlocked);
    /* Call getUserMedia now, in this turn — do not wait on ac.resume(). */
    relay.micStarting = true;
    relay.micStartAt = Date.now();
    relay.micErr = null;
    var p;
    try {
      p = navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
    } catch (err) {
      relay.micStarting = false;
      showMicDenied((err && (err.message || err.name)) || "Could not open the mic. Tap to try again.");
      return;
    }
    p.then(function (stream) {
      relay.micStarting = false;
      relay.heldStream = stream;
      if (!micWanted()) { showMicPrompt(false); return; }
      attachMic(stream);
    }).catch(function (err) {
      relay.micStarting = false;
      var name = (err && err.name) || "";
      relay.micErr = name || ((err && err.message) || "denied");
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        showMicDenied("Mic access was denied. Allow the microphone for this site, then tap again.");
      } else if (name === "NotFoundError") {
        showMicDenied("No microphone was found on this device.");
      } else {
        showMicDenied("Could not open the mic. Tap to try again.");
      }
    });
  }
  function stopWebMic(forget) {
    var m = relay.mic; relay.mic = null;
    if (m) {
      try { m.proc.disconnect(); m.src.disconnect(); if (m.ws) m.ws.close(); } catch (e) {}
      if (forget) {
        try { (m.stream || relay.heldStream).getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
        relay.heldStream = null;
      } else {
        relay.heldStream = m.stream || relay.heldStream;
      }
    } else if (forget && relay.heldStream) {
      try { relay.heldStream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
      relay.heldStream = null;
    }
    if (!micWanted()) showMicPrompt(false);
    micChip();
  }
  setInterval(function () {
    botIds().forEach(function (w) {
      var tile = document.getElementById(w + "-tile");
      if (tile && isLogoBot(w)) { syncLogoMode(w); return; }
      if (tile && tile.classList.contains("relay") && !relayLive(w)) {
        tile.classList.remove("relay");
        var v = document.getElementById(w + "-video");
        if (!(v && hasLive(v.srcObject) && v.videoWidth > 0)) { tile.hidden = true; tile.classList.remove("live"); }
      }
    });
  }, 1000);
  /* Scene sync from Sensai (remote presses arrive here over the relay, any network). */
  var lastRemotePage = null;
  function relayStatus(st) {
    relay.status = st;
    try {
      var es = st && st.state;
      if (es && Object.prototype.hasOwnProperty.call(es, "emulator") && global.BotBarDemo) {
        if (global.BotBarDemo.setVisible) global.BotBarDemo.setVisible(!!es.emulator);
        else if (global.BotBarDemo.setEnabled) global.BotBarDemo.setEnabled(!!es.emulator, false);
      }
    } catch (e) {}
    if (micWanted()) {
      /* KloudyBar Website ping: every open /chat device must start (or un-gate) its mic.
         If this device already granted a stream, just send. Otherwise show Tap to connect mic. */
      if (liveHeld() || relay.mic) {
        var ac = relay.ac || audioCtx(!IOS || !!relay.unlocked);
        if (ac) {
          var go = function () { if (micWanted()) startWebMic(false); keepAlive(); };
          if (ac.state === "running") go();
          else { try { ac.resume().then(go).catch(function () { go(); }); } catch (e) { go(); } }
        } else {
          showMicPrompt(true);
        }
      } else if (IOS) {
        showMicPrompt(true);
      } else {
        var acd = relay.ac || audioCtx(true);
        if (acd) startWebMic(false);
        else showMicPrompt(true);
      }
    } else if (relay.mic || relay.micStarting || liveHeld()) {
      relay.micStarting = false;
      stopWebMic(false); /* keep the granted stream so the next Website press does not need a new permission */
    }
    /* When Website / Phone→Web is on, keep trying to run the AudioContext so bot voices
       play on the page (and in a Zoom share of this tab) without a leftover sound chip. */
    if (webOut()) {
      var aco = relay.ac || audioCtx(!IOS || !!relay.unlocked);
      if (aco && aco.state !== "running") { try { aco.resume().then(keepAlive).catch(function () {}); } catch (e) {} }
      else if (aco) keepAlive();
    }
    micChip();
    try {
      var bots = (st && st.bots) || (st && st.bridge && st.bridge.bots) || (st && st.state && st.state.bots) || {};
      BOTS.forEach(function (b) {
        var info = bots[b.id] || {};
        if (typeof info.voice_level === "number") noteBotLevel(b.id, info.voice_level);
        else if (typeof info.level === "number") noteBotLevel(b.id, info.level);
        var cap = info.caption || info.transcript || info.speech || info.last_text || "";
        if (cap) setCaption(b.id, cap);
        syncLogoMode(b.id);
      });
    } catch (e2) {}
    var p = st && st.state && st.state.page;
    if (!p || p === lastRemotePage) return;
    lastRemotePage = p;
    var cur = (typeof global.page === "number") ? global.page + 1 : null;
    if (cur === p) return;
    relay.applying = true;
    try {
      if (typeof global.show === "function") global.show(p - 1);
      else location.hash = "page=" + p;
    } finally { relay.applying = false; }
  }
  function relaySendPage(p) { return; /* viewers are read-only: only Johnny's keyed remote moves the shared show */ 
    if (relay.applying || !relay.ws || relay.ws.readyState !== 1) return;
    lastRemotePage = p;
    try { relay.ws.send(JSON.stringify({ type: "page", page: p })); } catch (e) {}
  }
  global.addEventListener("hashchange", function () {
    var n = +new URLSearchParams((location.hash || "").slice(1)).get("page") || 1;
    relaySendPage(n);
  });
  (function hookReplace() {
    var orig = history.replaceState;
    history.replaceState = function (a, b, url) {
      var r = orig.apply(this, arguments);
      try { var m = /page=(\d+)/.exec(String(url || "")); if (m) relaySendPage(+m[1]); } catch (e) {}
      return r;
    };
  })();
  function startRelay() {
    var url = new URL("feed.json", scriptUrl()).href + "?t=" + Date.now();
    fetch(url, { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (cfg) {
      if (!cfg || !cfg.ws) { setTimeout(startRelay, 15000); return; }
      relay.wsUrl = cfg.ws;
      var ws = new WebSocket(cfg.ws); ws.binaryType = "arraybuffer"; relay.ws = ws;
      var hdr = null;
      ws.onmessage = function (ev) {
        if (typeof ev.data === "string") {
          try { hdr = JSON.parse(ev.data); } catch (e) { hdr = null; }
          if (hdr && hdr.kind === "status") { relayStatus(hdr); hdr = null; }
          return;
        }
        if (!hdr) return;
        if (hdr.kind === "frame") relayFrame(hdr.which, ev.data);
        else if (hdr.kind === "audio") relayAudio(hdr.which, hdr, ev.data);
        hdr = null;
      };
      ws.onclose = function () { relay.ws = null; setTimeout(startRelay, 3000); };
      ws.onerror = function () { try { ws.close(); } catch (e) {} };
    }).catch(function () { setTimeout(startRelay, 15000); });
  }
  global.BotBarRelay = { remote: function () { return relay.status; }, status: function () { return { page: lastRemotePage, ws: relay.ws ? relay.ws.readyState : -1, last: relay.last, audio: relay.ac ? relay.ac.state : "none",
    under: relay.under, skips: relay.skips, stalls: relay.stalls, mic: relay.mic ? (relay.mic.ws ? relay.mic.ws.readyState : "nows") : "off", micSent: relay.micSent, micGated: relay.micGated, out: webOut(), webIn: webIn() }; } };

  function ready(fn) {
    if (document.body) fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    loadCss();
    ensureTiles();
    BOTS.forEach(function (b) { syncLogoMode(b.id); });
    startLogoAnim();
    installFeeds();
    startRelay();
    /* Offer the one tap up front (not only once a bot is already talking), so the page is
       ready before the show; the chip hides itself as soon as sound is unlocked. */
    setTimeout(function () { var ac = audioCtx(); if (!ac || ac.state !== "running") soundChip(true); }, 1200);
    /* Small playback report to the relay log every 5 s (no user data): lets us see from Sensai
       whether a phone is unlocked and actually playing bot audio. */
    setInterval(function () {
      var ws = relay.ws; if (!ws || ws.readyState !== 1) return;
      var ac = relay.ac, k = relay.keepEl;
      try { ws.send(JSON.stringify({ type: "diag", v: "kbar8", ios: IOS, ac: ac ? ac.state : "none", sr: ac ? ac.sampleRate : 0,
        t: ac ? Math.round(ac.currentTime) : 0, sess: navigator.audioSession ? navigator.audioSession.type : "n/a",
        keep: k ? (k.paused ? "paused" : "playing") : "none", chip: !!(document.getElementById("bb-sound-chip") && document.getElementById("bb-sound-chip").style.display !== "none"),
        played: relay.played, peak: { muse: +relay.peak.muse.toFixed(3), dots: +relay.peak.dots.toFixed(3) }, vis: document.visibilityState,
        under: relay.under, skips: relay.skips, stalls: relay.stalls, mic: relay.mic ? "on" : "off", micSent: relay.micSent, micGated: relay.micGated, out: webOut(),
        micPrompt: !!relay.micPrompt, micErr: relay.micErr || null, held: !!liveHeld(), webIn: webIn() })); } catch (e) {}
      relay.played = { muse: 0, dots: 0, grokbot: 0, grok: 0 }; relay.peak = { muse: 0, dots: 0, grokbot: 0, grok: 0 };
    }, 5000);
    ensureDeps().then(wireSync).catch(function (e) { console.warn("BotBar overlay deps", e); });
  });
})(window);
