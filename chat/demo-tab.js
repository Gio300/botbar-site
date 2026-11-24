/* Public loader for the passphrase-locked 328 demo.
   Ciphertext is chat/demo328.bin. The passphrase is never stored here. */
(function (global) {
  if (global.__BOTBAR_DEMO_TAB__) return;
  global.__BOTBAR_DEMO_TAB__ = true;

  var BIN = "demo328.bin?v=328e202611230904";
  var OPEN_BIN = "demo328-open.bin?v=kbar8";
  var BASE = (document.currentScript && document.currentScript.src) || location.href;
  var LOCK_KEY = "botbar.demo328.lock";
  var ENABLED_KEY = "botbar.demo328.enabled";
  var cfg = function () { return global.BOTBAR_DEMO_CONFIG || {}; };

  var tab, promptEl, input, msg, card, overlay, panel, mount, switchEl;
  var demoOpen = false;
  var promptOpen = false;
  var enabled = true;
  var busy = false;
  var holdRaf = 0;
  var saved = [];
  var session = null;
  var lockTimer = 0;

  function lockState() {
    try {
      var raw = global.localStorage.getItem(LOCK_KEY);
      var o = raw ? JSON.parse(raw) : null;
      if (!o || typeof o.fails !== "number") return { fails: 0, until: 0 };
      return { fails: o.fails, until: o.until || 0 };
    } catch (e) {
      return { fails: 0, until: 0 };
    }
  }
  function saveLock(o) {
    try { global.localStorage.setItem(LOCK_KEY, JSON.stringify({ fails: o.fails, until: o.until || 0 })); } catch (e) {}
  }
  function clearLock() {
    try { global.localStorage.removeItem(LOCK_KEY); } catch (e) {}
  }

  function switchCfg() {
    var c = cfg();
    return c["switch"] || {};
  }
  function readEnabled() {
    var fallback = switchCfg().default !== false;
    try {
      var raw = global.localStorage.getItem(ENABLED_KEY);
      if (raw == null || raw === "") return fallback;
      if (raw === "0" || raw === "false" || raw === "off") return false;
      if (raw === "1" || raw === "true" || raw === "on") return true;
      return fallback;
    } catch (e) {
      return fallback;
    }
  }
  function writeEnabled(on) {
    try { global.localStorage.setItem(ENABLED_KEY, on ? "1" : "0"); } catch (e) {}
  }
  function offsetPx(value, size, fallback) {
    if (value == null || value === "") return fallback;
    if (typeof value === "number" && isFinite(value)) return value;
    var s = String(value).trim();
    var n = parseFloat(s);
    if (!isFinite(n)) return fallback;
    if (/%$/.test(s)) return size * n / 100;
    return n;
  }

  function el(tag, cls, parent) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (parent) parent.appendChild(n);
    return n;
  }

  function build() {
    var c = cfg();
    var side = c.tabSide === "left" ? "left" : "right";
    enabled = readEnabled();
    tab = el("button");
    tab.id = "bb328-tab";
    tab.type = "button";
    tab.textContent = "328";
    tab.setAttribute("aria-label", "Open 328 demo");
    tab.setAttribute("data-side", side);
    tab.style.top = c.tabOffsetY || "50%";
    tab.style.transform = "translateY(-50%)";
    tab.style[side] = "0";
    tab.hidden = !enabled;
    tab.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
    tab.addEventListener("pointerup", function (e) { e.stopPropagation(); });
    tab.addEventListener("click", onTab);

    var sw = switchCfg();
    var swLabel = sw.label || "Emulator";
    switchEl = el("button");
    switchEl.id = "bb328-switch";
    switchEl.type = "button";
    switchEl.setAttribute("role", "switch");
    switchEl.setAttribute("aria-checked", enabled ? "true" : "false");
    switchEl.setAttribute("aria-label", swLabel);
    var swText = el("span", "bb328-switch-label", switchEl);
    swText.textContent = swLabel;
    var knob = el("span", "bb328-switch-knob", switchEl);
    knob.setAttribute("aria-hidden", "true");
    switchEl.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
    switchEl.addEventListener("pointerup", function (e) { e.stopPropagation(); });
    switchEl.addEventListener("click", onSwitch);
    switchEl.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "PageUp" || e.key === "PageDown") {
        e.preventDefault();
        e.stopPropagation();
      }
    });

    promptEl = el("div");
    promptEl.id = "bb328-prompt";
    promptEl.hidden = true;
    promptEl.setAttribute("data-side", side);
    var back = el("div", "bb328-prompt-back", promptEl);
    back.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      e.stopPropagation();
      closePrompt();
    });
    card = el("form", "bb328-card", promptEl);
    card.setAttribute("autocomplete", "off");
    card.addEventListener("submit", onSubmit);
    card.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
    var title = el("h2", "", card);
    title.textContent = "328 demo";
    var label = el("label", "", card);
    label.textContent = "Passphrase";
    input = el("input", "", label);
    input.type = "text";
    input.name = "bb328-gate-note";
    input.setAttribute("autocomplete", "off");
    input.setAttribute("autocapitalize", "off");
    input.setAttribute("autocorrect", "off");
    input.setAttribute("spellcheck", "false");
    input.setAttribute("data-lpignore", "true");
    input.setAttribute("data-1p-ignore", "true");
    input.setAttribute("data-form-type", "other");
    input.spellcheck = false;
    input.setAttribute("aria-label", "Passphrase");
    input.addEventListener("input", onGateInput);
    var go = el("button", "", card);
    go.type = "submit";
    go.textContent = "Unlock";
    msg = el("p", "bb328-msg", card);
    msg.setAttribute("role", "alert");

    overlay = el("div");
    overlay.id = "bb328-overlay";
    overlay.hidden = true;
    el("div", "bb328-backdrop", overlay);
    panel = el("div", "", overlay);
    panel.id = "bb328-panel";
    var handle = el("button", "", panel);
    handle.id = "bb328-handle";
    handle.type = "button";
    handle.setAttribute("aria-label", "Pull down to close");
    var grip = el("span", "bb328-grip", handle);
    grip.setAttribute("aria-hidden", "true");
    var drag = null;
    handle.addEventListener("pointerdown", function (e) {
      if (!demoOpen || (e.button != null && e.button !== 0)) return;
      drag = { id: e.pointerId, y: e.clientY };
      try { handle.setPointerCapture(e.pointerId); } catch (err) {}
      e.preventDefault();
      e.stopPropagation();
    });
    handle.addEventListener("pointermove", function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dy = e.clientY - drag.y;
      panel.style.transform = dy > 0 ? "translateY(" + Math.min(dy, 220) + "px)" : "";
    });
    function endDrag(e) {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      var dy = e ? e.clientY - drag.y : 0;
      drag = null;
      panel.style.transform = "";
      var need = (cfg().handle && cfg().handle.closeDrag) || 56;
      if (dy > need) closeDemo();
    }
    handle.addEventListener("pointerup", endDrag);
    handle.addEventListener("pointercancel", function () {
      drag = null;
      panel.style.transform = "";
    });
    var x = el("button", "", panel);
    x.id = "bb328-close";
    x.type = "button";
    x.setAttribute("aria-label", "Close demo");
    x.textContent = "\u00d7";
    x.addEventListener("click", function (e) {
      e.stopPropagation();
      closeDemo();
    });
    mount = el("div", "", panel);
    mount.id = "bb328-mount";
    ["contextmenu", "selectstart", "dragstart", "copy", "cut"].forEach(function (ev) {
      overlay.addEventListener(ev, function (e) { e.preventDefault(); });
    });

    /* Emulator show/hide is on KloudyBar only — do not mount a site switch. */
    /* No pull-tab, no passphrase card, no site Emulator switch.
       KloudyBar's Emulator button calls BotBarDemo.setVisible to show/hide. */
    document.body.appendChild(overlay);
    applyShell();
  }

  function placeSwitch() {
    if (!switchEl) return;
    var header = document.querySelector(".bb-chat-page.bb-current header.bb-chat-brand")
      || document.querySelector("header.bb-chat-brand");
    if (!header) return;
    var r = header.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) return;
    var sw = switchCfg();
    var side = sw.position === "top-left" ? "left" : "right";
    var top = offsetPx(sw.top, r.height, 6);
    switchEl.style.top = Math.round(r.top + top) + "px";
    switchEl.style.bottom = "auto";
    if (side === "left") {
      var left = offsetPx(sw.left != null ? sw.left : sw.right, r.width, 8);
      switchEl.style.left = Math.round(r.left + left) + "px";
      switchEl.style.right = "auto";
    } else {
      var right = offsetPx(sw.right, r.width, 8);
      switchEl.style.left = "auto";
      switchEl.style.right = Math.round((global.innerWidth - r.right) + right) + "px";
    }
  }

  function applyShell() {
    var c = cfg();
    var o = c.overlay || {};
    var fs = c.fullscreen || {};
    var desktopMin = fs.desktopMin || 1100;
    var desktop = global.innerWidth >= desktopMin;
    if (demoOpen && panel) {
      panel.classList.add("bb328-fill");
      panel.classList.toggle("is-desktop", desktop);
      panel.classList.toggle("is-phone", !desktop);
      var aspect = fs.aspect || (c.emulator && c.emulator.aspect) || (9 / 19.5);
      panel.style.setProperty("--bb328-aspect", String(aspect));
      panel.style.inset = "0";
      panel.style.borderRadius = "0";
      panel.style.width = fs.phone || "100dvw";
      panel.style.height = fs.height || "100dvh";
    } else if (panel) {
      panel.classList.remove("bb328-fill", "is-desktop", "is-phone");
      panel.style.inset = o.inset || "3vh 3vw";
      panel.style.borderRadius = o.radius || "24px";
      panel.style.width = "";
      panel.style.height = "";
      panel.style.removeProperty("--bb328-aspect");
    }
  }

  function onTab(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!enabled) return;
    if (demoOpen) closeDemo();
    else if (promptOpen) closePrompt();
    else openPrompt();
  }

  function onSwitch(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setEnabled(!enabled, true);
  }

  function openPrompt() {
    promptOpen = true;
    promptEl.hidden = false;
    clearGate();
    showLockMessage();
    syncGuards();
    setTimeout(function () { try { input.focus(); } catch (e) {} }, 0);
  }
  var gateSecret = "";
  function gateMasked() {
    try { return !(window.CSS && CSS.supports("-webkit-text-security", "disc")); }
    catch (e) { return true; }
  }
  function onGateInput() {
    if (!gateMasked()) return;
    var shown = input.value;
    var discs = "";
    for (var n = 0; n < gateSecret.length; n++) discs += "\u2022";
    if (shown === discs) return;
    if (shown.indexOf("\u2022") === -1) gateSecret = shown;
    else if (shown.length === discs.length + 1 && shown.slice(0, -1) === discs) gateSecret += shown.charAt(shown.length - 1);
    else if (shown.length < discs.length && discs.indexOf(shown) === 0) gateSecret = gateSecret.slice(0, shown.length);
    else {
      var next = "";
      var si = 0;
      for (var i = 0; i < shown.length; i++) {
        var ch = shown.charAt(i);
        if (ch === "\u2022" && si < gateSecret.length) { next += gateSecret.charAt(si); si++; }
        else if (ch !== "\u2022") next += ch;
      }
      gateSecret = next;
    }
    var masked = "";
    for (var j = 0; j < gateSecret.length; j++) masked += "\u2022";
    if (input.value !== masked) input.value = masked;
  }
  function gateValue() {
    return gateMasked() ? gateSecret : input.value;
  }
  function clearGate() {
    gateSecret = "";
    if (input) input.value = "";
  }

  function closePrompt() {
    promptOpen = false;
    promptEl.hidden = true;
    clearGate();
    try { input.blur(); } catch (e) {}
    if (lockTimer) { clearInterval(lockTimer); lockTimer = 0; }
    syncGuards();
  }

  function showLockMessage() {
    var st = lockState();
    var left = st.until - Date.now();
    if (left > 0) {
      msg.textContent = "Too many tries. Try again in " + Math.ceil(left / 1000) + "s";
      if (!lockTimer) lockTimer = setInterval(showLockMessage, 250);
    } else if (lockTimer) {
      clearInterval(lockTimer);
      lockTimer = 0;
      if (!busy) msg.textContent = "";
    }
  }

  function shake(text) {
    msg.textContent = text;
    card.classList.remove("bb328-shake");
    void card.offsetWidth;
    card.classList.add("bb328-shake");
  }

  function noteFail() {
    var st = lockState();
    st.fails += 1;
    if (st.fails >= 5) {
      var secs = 30 * Math.pow(2, st.fails - 5);
      st.until = Date.now() + secs * 1000;
    }
    saveLock(st);
    if (st.until > Date.now()) {
      shake("Too many tries. Try again in " + Math.ceil((st.until - Date.now()) / 1000) + "s");
      showLockMessage();
    } else {
      shake("Wrong passphrase");
    }
  }

  async function derive(pass, salt, iterations) {
    var mat = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(pass),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: salt, iterations: iterations, hash: "SHA-256" },
      mat,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );
  }

  function parsePayload(plain) {
    var view = new DataView(plain.buffer, plain.byteOffset, plain.byteLength);
    var jsonLen = view.getUint32(0, false);
    var meta = JSON.parse(new TextDecoder().decode(plain.subarray(4, 4 + jsonLen)));
    var images = Object.create(null);
    var off = 4 + jsonLen;
    var list = meta.images || [];
    for (var i = 0; i < list.length; i++) {
      var im = list[i];
      var slice = plain.subarray(off, off + im.length);
      var copy = new Uint8Array(slice);
      images[im.name] = new Blob([copy], { type: im.type || "image/webp" });
      off += im.length;
    }
    return { player: meta.player, steps: meta.steps, screens: meta.screens || null, images: images, icons: meta.icons || null };
  }

  async function onSubmit(e) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    var pass = gateValue();
    clearGate();
    if (!pass) {
      shake("Enter the passphrase");
      return;
    }
    if (!global.crypto || !crypto.subtle) {
      shake("This browser cannot unlock the demo");
      return;
    }
    busy = true;
    msg.textContent = "Checking\u2026";
    var plain = null;
    try {
      var res = await fetch(new URL(BIN, BASE).href, { cache: "no-store" });
      if (!res.ok) throw new Error("missing");
      var buf = new Uint8Array(await res.arrayBuffer());
      if (buf.length < 40 || String.fromCharCode(buf[0], buf[1], buf[2], buf[3]) !== "D328") {
        throw new Error("bad");
      }
      var iterations = new DataView(buf.buffer, buf.byteOffset, buf.byteLength).getUint32(5, false);
      if (iterations < 600000 || iterations > 2000000) throw new Error("bad");
      var salt = buf.slice(9, 25);
      var iv = buf.slice(25, 37);
      var ct = buf.slice(37);
      var key = await derive(pass, salt, iterations);
      pass = "";
      var st = lockState();
      if (st.until > Date.now()) {
        showLockMessage();
        shake("Too many tries. Try again in " + Math.ceil((st.until - Date.now()) / 1000) + "s");
        return;
      }
      try {
        plain = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, ct));
      } catch (err) {
        noteFail();
        return;
      }
      var payload = parsePayload(plain);
      plain.fill(0);
      plain = null;
      clearLock();
      closePrompt();
      lastPayload = payload;
      openDemo(payload);
    } catch (err) {
      shake("Could not open the demo");
    } finally {
      pass = "";
      if (plain) plain.fill(0);
      busy = false;
    }
  }

  function tileNodes() {
    return ["muse-tile", "dots-tile"].map(function (id) { return document.getElementById(id); }).filter(Boolean);
  }

  function hideBots() {
    var tiles = tileNodes();
    for (var i = 0; i < tiles.length; i++) tiles[i].classList.add("bb328-bots-hidden");
  }
  function showBots() {
    var nodes = document.querySelectorAll(".bb328-bots-hidden");
    for (var i = 0; i < nodes.length; i++) nodes[i].classList.remove("bb328-bots-hidden");
  }

  var botWatch = null;
  function watchBots(on) {
    if (botWatch) { botWatch.disconnect(); botWatch = null; }
    if (!on || !global.MutationObserver) return;
    var root = document.getElementById("botbar-overlay-root");
    if (!root) return;
    botWatch = new MutationObserver(function () { if (demoOpen) hideBots(); });
    botWatch.observe(root, { childList: true });
  }

  var docKeys = false;
  var guardOn = false;
  function onDocKey(e) {
    if (e.key !== "Escape") return;
    if (promptOpen) {
      e.preventDefault();
      e.stopPropagation();
      closePrompt();
    } else if (demoOpen) {
      e.preventDefault();
      e.stopPropagation();
      closeDemo();
    }
  }
  function guardMove(e) {
    if (!demoOpen) return;
    var n = e.target;
    if (n && n.closest && n.closest("[data-bb328-hscroll], [data-bb328-vscroll]")) return;
    e.preventDefault();
  }
  function parkChrome() {
    if (!panel) return;
    var handle = document.getElementById("bb328-handle");
    var closeBtn = document.getElementById("bb328-close");
    if (handle && handle.parentElement !== panel) panel.appendChild(handle);
    if (closeBtn && closeBtn.parentElement !== panel) panel.appendChild(closeBtn);
  }

  function syncGuards() {
    if (switchEl) switchEl.hidden = !!demoOpen;
    var need = !!(promptOpen || demoOpen);
    if (need && !docKeys) {
      document.addEventListener("keydown", onDocKey, true);
      docKeys = true;
    } else if (!need && docKeys) {
      document.removeEventListener("keydown", onDocKey, true);
      docKeys = false;
    }
    if (demoOpen && overlay && !guardOn) {
      overlay.addEventListener("touchmove", guardMove, { passive: false });
      guardOn = true;
    } else if (!demoOpen && overlay && guardOn) {
      overlay.removeEventListener("touchmove", guardMove);
      guardOn = false;
    }
    document.documentElement.classList.toggle("bb328-open", !!demoOpen);
  }

  var lastPayload = null;

  function openDemo(payload) {
    if (payload) lastPayload = payload;
    demoOpen = true;
    if (switchEl) switchEl.hidden = true;
    global.__BOTBAR_DEMO_OPEN__ = true;
    hideBots();
    watchBots(true);
    overlay.hidden = false;
    applyShell();
    tab.setAttribute("aria-label", "Close 328 demo");
    var boot = new Function(payload.player + "\n;return (typeof bb328Boot===\"function\")?bb328Boot:null;")();
    payload.player = "";
    if (typeof boot === "function") {
      session = boot(mount, { steps: payload.steps, screens: payload.screens, images: payload.images, icons: payload.icons || {} });
    }
    payload.steps = null;
    payload.screens = null;
    payload.icons = null;
    syncGuards();
  }

  function closeDemo() {
    if (!demoOpen && overlay.hidden) return;
    parkChrome();
    demoOpen = false;
    global.__BOTBAR_DEMO_OPEN__ = false;
    if (holdRaf) cancelAnimationFrame(holdRaf);
    holdRaf = 0;
    watchBots(false);
    if (session && session.destroy) {
      try { session.destroy(); } catch (e) {}
    }
    session = null;
    mount.replaceChildren();
    showBots();
    if (panel) panel.style.transform = "";
    applyShell();
    overlay.hidden = true;
    if (tab) tab.setAttribute("aria-label", "Open 328 demo");
    syncGuards();
  }

  function setEnabled(on, persist) {
    if (!on) {
      if (promptOpen) closePrompt();
      closeDemo();
    }
    enabled = !!on;
    if (persist) writeEnabled(enabled);
    if (switchEl) switchEl.setAttribute("aria-checked", enabled ? "true" : "false");
    if (tab) tab.hidden = !enabled;
    if (!enabled && promptEl) promptEl.hidden = true;
  }

  global.addEventListener("resize", function () {
    placeSwitch();
    if (demoOpen) applyShell();
  });
  global.addEventListener("hashchange", placeSwitch);
  if (global.visualViewport) global.visualViewport.addEventListener("resize", placeSwitch);

  function start() {
    build();
    requestAnimationFrame(placeSwitch);
    var pagesRoot = document.getElementById("botbar-presentation");
    if (pagesRoot && global.MutationObserver) {
      var mo = new MutationObserver(function () { placeSwitch(); });
      mo.observe(pagesRoot, { attributes: true, subtree: true, attributeFilter: ["class"] });
    }
  }
  function loadOpenPack() {
    if (lastPayload) return Promise.resolve(lastPayload);
    return fetch(new URL(OPEN_BIN, BASE).href, { cache: "no-store" }).then(function (res) {
      if (!res.ok) throw new Error("missing");
      return res.arrayBuffer();
    }).then(function (ab) {
      var buf = new Uint8Array(ab);
      var payload = parsePayload(buf);
      lastPayload = payload;
      return payload;
    });
  }
  function setVisible(on) {
    /* KloudyBar Emulator button: show or hide, no passphrase, no pull-tab. */
    on = !!on;
    if (on) {
      setEnabled(true, false);
      if (demoOpen) return;
      loadOpenPack().then(function (payload) {
        if (payload && !demoOpen) openDemo(payload);
      }).catch(function () {
        try { console.warn("BotBar emulator pack could not be loaded"); } catch (e) {}
      });
    } else {
      closeDemo();
      setEnabled(false, false);
    }
  }

  global.BotBarDemo = {
    setEnabled: function (on, persist) { setEnabled(on, persist !== false ? true : false); },
    setVisible: function (on) { setVisible(on); },
    isEnabled: function () { return !!enabled; },
    isOpen: function () { return !!demoOpen; }
  };
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start);
})(window);
