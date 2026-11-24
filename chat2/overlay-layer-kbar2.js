(function (global) {
  if (global.__BOTBAR_OVERLAY_LAYER__) return;
  global.__BOTBAR_OVERLAY_LAYER__ = true;
  var BOTS = [
    { id: "muse", label: "Muse", tile: "muse-tile", vid: "muse-video" },
    { id: "dots", label: "Dots", tile: "dots-tile", vid: "dots-video" },
    { id: "grokbot", label: "Grok Bot", tile: "grokbot-tile", vid: "grokbot-video" },
    { id: "grok", label: "Grok", tile: "grok-tile", vid: "grok-video" }
  ];
  function botOf(which) { for (var i = 0; i < BOTS.length; i++) if (BOTS[i].id === which) return BOTS[i]; return null; }
  function botIds() { return BOTS.map(function (b) { return b.id; }); }

  function loadCss() {
    var href = new URL("overlay-layer.css?v=kbar2", scriptUrl()).href;
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

  function hasLive(stream) {
    return !!(stream && stream.getTracks && stream.getTracks().some(function (t) { return t.readyState === "live"; }));
  }
  function setVisible(tile, vid, on) {
    if (!tile) return;
    /* A tile drawn from the relay feed stays up until the feed itself goes stale
       (1 s check below). The PeerJS sync's playing:false / disconnect must not hide it,
       or the two layers fight and the frame flickers. */
    var liveId = (tile && tile.id || "").replace(/-tile$/, "");
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
    under: { muse: 0, dots: 0, grokbot: 0, grok: 0 }, skips: 0, botLoudUntil: 0, mic: null, micSent: 0, micGated: 0, micWant: null };
  var JITTER_LEAD = 0.25;
  function relayLive(which) { return Date.now() - relay.last[which] < 5000; }
  var IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  relay.played = { muse: 0, dots: 0, grokbot: 0, grok: 0 }; relay.peak = { muse: 0, dots: 0, grokbot: 0, grok: 0 };
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
    if (gesture && micWanted() && !relay.mic) { var acm = ac; setTimeout(function () { if (acm.state === "running") startWebMic(); else acm.resume().then(startWebMic).catch(function () {}); }, 0); }
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
    var ac = audioCtx(); if (!ac) { soundChip(true); return; }
    if (ac.state !== "running") { try { ac.resume(); } catch (e) {} soundChip(true); return; }
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
  }
  /* ---- Website mic -> bots (KloudyBar Website mode) ----
     No on-page mic button. The site follows KloudyBar: web_io (Website) plus mic_on.
     Browsers still need one user gesture (any tap/click on the page) before
     getUserMedia and an AudioContext can start; after that, pressing Website
     on KloudyBar starts site playback and the site mic with no site button. */
  function micOn() { var s = relay.status && relay.status.state; return !s || s.mic_on !== false; }
  function micWanted() { return webIn() && micOn(); }
  function routesNow() { var r = relay.status && relay.status.routes; return r || { web_io: true, phone_io: false, phone_web: true }; }
  function webIn() { return !!routesNow().web_io; }
  function webOut() { var o = relay.status && relay.status.outputs; return !o || o.website !== false; }
  function micChip() {
    var el = document.getElementById("bb-mic-chip");
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }
  function micSocket() {
    if (!relay.wsUrl) return null;
    var m = relay.mic; if (!m) return null;
    if (m.ws && m.ws.readyState <= 1) return m.ws;
    var u = relay.wsUrl.replace(/\/feed(\?.*)?$/, "/webmic");
    try { m.ws = new WebSocket(u); m.ws.binaryType = "arraybuffer"; } catch (e) { m.ws = null; }
    return m.ws;
  }

  function startWebMic() {
    if (!micWanted() || relay.mic || relay.micStarting || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
    var ac = relay.ac || audioCtx(!!relay.unlocked);
    if (!ac) return; /* iPhone: wait for any tap on the page, then unlockAudio will retry */
    relay.micStarting = true;
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }).then(function (stream) {
      if (!micWanted()) { relay.micStarting = false; stream.getTracks().forEach(function (t) { t.stop(); }); micChip(); return; }
      relay.micStarting = false;
      var srcN = ac.createMediaStreamSource(stream), proc = ac.createScriptProcessor(2048, 1, 1), mute = ac.createGain();
      mute.gain.value = 0; srcN.connect(proc); proc.connect(mute); mute.connect(ac.destination); /* never played locally */
      var ratio = ac.sampleRate / 24000;
      relay.mic = { stream: stream, proc: proc, src: srcN, ws: null };
      proc.onaudioprocess = function (e) {
        var st = relay.status && relay.status.state;
        if (!relay.mic || !micWanted() || !(st && st.playing)) return;
        var x = e.inputBuffer.getChannelData(0), s2 = 0;
        for (var i = 0; i < x.length; i++) s2 += x[i] * x[i];
        var r = Math.sqrt(s2 / x.length);
        if (ac.currentTime < relay.botLoudUntil + 0.15 && r < 0.1) { relay.micGated++; return; } /* bot voice playing here: skip echo */
        var ws = micSocket(); if (!ws || ws.readyState !== 1) return;
        var n = Math.floor(x.length / ratio), out = new Int16Array(n);
        for (var j = 0; j < n; j++) {
          var a0 = Math.floor(j * ratio), a1 = Math.max(a0 + 1, Math.floor((j + 1) * ratio)), acc = 0;
          for (var q = a0; q < a1 && q < x.length; q++) acc += x[q];
          var v = acc / (a1 - a0); out[j] = Math.max(-1, Math.min(1, v)) * 32767;
        }
        try { ws.send(out.buffer); relay.micSent++; } catch (err) {}
      };
      micChip();
    }).catch(function () { relay.micStarting = false; micChip(); });
  }
  function stopWebMic() {
    var m = relay.mic; relay.mic = null; if (!m) { micChip(); return; }
    try { m.proc.disconnect(); m.src.disconnect(); m.stream.getTracks().forEach(function (t) { t.stop(); }); if (m.ws) m.ws.close(); } catch (e) {}
    micChip();
  }
  setInterval(function () {
    botIds().forEach(function (w) {
      var tile = document.getElementById(w + "-tile");
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
      if (es && Object.prototype.hasOwnProperty.call(es, "emulator") && global.BotBarDemo && global.BotBarDemo.setEnabled) {
        global.BotBarDemo.setEnabled(!!es.emulator, false);
      }
    } catch (e) {}
    if (micWanted()) {
      if (relay.ac && relay.ac.state === "running") startWebMic();
    } else if (relay.mic || relay.micStarting) {
      relay.micStarting = false;
      stopWebMic();
    }
    micChip();
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
      try { ws.send(JSON.stringify({ type: "diag", v: "routes1", ios: IOS, ac: ac ? ac.state : "none", sr: ac ? ac.sampleRate : 0,
        t: ac ? Math.round(ac.currentTime) : 0, sess: navigator.audioSession ? navigator.audioSession.type : "n/a",
        keep: k ? (k.paused ? "paused" : "playing") : "none", chip: !!(document.getElementById("bb-sound-chip") && document.getElementById("bb-sound-chip").style.display !== "none"),
        played: relay.played, peak: { muse: +relay.peak.muse.toFixed(3), dots: +relay.peak.dots.toFixed(3) }, vis: document.visibilityState,
        under: relay.under, skips: relay.skips, stalls: relay.stalls, mic: relay.mic ? "on" : "off", micSent: relay.micSent, micGated: relay.micGated, out: webOut() })); } catch (e) {}
      relay.played = { muse: 0, dots: 0, grokbot: 0, grok: 0 }; relay.peak = { muse: 0, dots: 0, grokbot: 0, grok: 0 };
    }, 5000);
    ensureDeps().then(wireSync).catch(function (e) { console.warn("BotBar overlay deps", e); });
  });
})(window);
