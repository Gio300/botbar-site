/* Public loader for the passphrase-locked 328 demo.
   Ciphertext is chat/demo328.bin. The passphrase is never stored here. */
(function (global) {
  if (global.__BOTBAR_DEMO_TAB__) return;
  global.__BOTBAR_DEMO_TAB__ = true;

  var BIN = "demo328.bin?v=328e202611230440";
  var BASE = (document.currentScript && document.currentScript.src) || location.href;
  var LOCK_KEY = "botbar.demo328.lock";
  var cfg = function () { return global.BOTBAR_DEMO_CONFIG || {}; };

  var tab, promptEl, input, msg, card, overlay, panel, mount;
  var demoOpen = false;
  var promptOpen = false;
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

  function el(tag, cls, parent) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (parent) parent.appendChild(n);
    return n;
  }

  function build() {
    var c = cfg();
    var side = c.tabSide === "left" ? "left" : "right";
    tab = el("button");
    tab.id = "bb328-tab";
    tab.type = "button";
    tab.textContent = "328";
    tab.setAttribute("aria-label", "Open 328 demo");
    tab.setAttribute("data-side", side);
    tab.style.top = c.tabOffsetY || "50%";
    tab.style.transform = "translateY(-50%)";
    tab.style[side] = "0";
    tab.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
    tab.addEventListener("pointerup", function (e) { e.stopPropagation(); });
    tab.addEventListener("click", onTab);

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
    input.type = "password";
    input.name = "bb328-unlock";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.setAttribute("aria-label", "Passphrase");
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

    document.body.appendChild(tab);
    document.body.appendChild(promptEl);
    document.body.appendChild(overlay);
    applyShell();
  }

  function applyShell() {
    var c = cfg();
    var o = c.overlay || {};
    panel.style.inset = o.inset || "3vh 3vw";
    panel.style.borderRadius = o.radius || "24px";
  }

  function onTab(e) {
    e.preventDefault();
    e.stopPropagation();
    if (demoOpen) closeDemo();
    else if (promptOpen) closePrompt();
    else openPrompt();
  }

  function openPrompt() {
    promptOpen = true;
    promptEl.hidden = false;
    input.value = "";
    showLockMessage();
    setTimeout(function () { try { input.focus(); } catch (e) {} }, 0);
  }
  function closePrompt() {
    promptOpen = false;
    promptEl.hidden = true;
    input.value = "";
    if (lockTimer) { clearInterval(lockTimer); lockTimer = 0; }
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
    return { player: meta.player, steps: meta.steps, images: images };
  }

  async function onSubmit(e) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    var pass = input.value;
    input.value = "";
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

  function captureTile(node) {
    return {
      node: node,
      parent: node.parentNode,
      next: node.nextSibling,
      style: node.getAttribute("style")
    };
  }

  function specFor(id) {
    var c = cfg();
    if (id === "muse-tile") return c.muse || { top: "2%", left: "2%", width: "22%" };
    return c.dots || { top: "2%", right: "2%", width: "22%" };
  }

  function placeTile(node) {
    var spec = specFor(node.id);
    node.style.setProperty("position", "absolute", "important");
    node.style.setProperty("top", spec.top || "2%", "important");
    node.style.setProperty("width", spec.width || "22%", "important");
    node.style.setProperty("height", "auto", "important");
    node.style.setProperty("aspect-ratio", "1 / 1", "important");
    node.style.setProperty("margin", "0", "important");
    node.style.setProperty("z-index", "5", "important");
    if (spec.left != null) {
      node.style.setProperty("left", spec.left, "important");
      node.style.setProperty("right", "auto", "important");
    }
    if (spec.right != null) {
      node.style.setProperty("right", spec.right, "important");
      node.style.setProperty("left", "auto", "important");
    }
  }

  function fitPhone() {
    var phone = mount.querySelector(".bb328-phone");
    if (!phone) return;
    var em = cfg().emulator || {};
    var aspect = em.aspect || (9 / 19.5);
    phone.style.position = "absolute";
    phone.style.left = "50%";
    phone.style.top = em.top || "16%";
    phone.style.transform = "translateX(-50%)";
    phone.style.maxWidth = "calc(100% - 16px)";
    phone.style.height = "auto";
    phone.style.aspectRatio = String(aspect);
    if (phone.getAttribute("data-fit") !== "1") {
      phone.style.width = em.width || "min(78%, 340px)";
      phone.setAttribute("data-fit", "1");
    }
    var w = phone.getBoundingClientRect().width;
    if (w < 20) {
      phone.removeAttribute("data-fit");
      return;
    }
    var maxH = panel.clientHeight - phone.offsetTop - 130;
    var h = w / aspect;
    var target = w;
    if (maxH > 80 && h > maxH + 1) target = Math.max(96, Math.floor(maxH * aspect));
    var cur = parseFloat(phone.style.width);
    if (!/px$/.test(phone.style.width) || Math.abs(cur - target) > 1) {
      phone.style.width = Math.round(target) + "px";
    }
  }

  function hold() {
    if (!demoOpen) return;
    holdRaf = requestAnimationFrame(hold);
    if (!demoOpen) return;
    applyShell();
    var tiles = tileNodes();
    for (var i = 0; i < tiles.length; i++) {
      if (!demoOpen) return;
      if (tiles[i].parentNode !== panel) panel.appendChild(tiles[i]);
      placeTile(tiles[i]);
    }
    fitPhone();
  }

  function openDemo(payload) {
    demoOpen = true;
    global.__BOTBAR_DEMO_OPEN__ = true;
    saved = tileNodes().map(captureTile);
    overlay.hidden = false;
    tab.setAttribute("aria-label", "Close 328 demo");
    var boot = new Function(payload.player + "\n;return (typeof bb328Boot===\"function\")?bb328Boot:null;")();
    payload.player = "";
    if (typeof boot === "function") {
      session = boot(mount, { steps: payload.steps, images: payload.images });
    }
    payload.steps = null;
    hold();
  }

  function restoreTiles() {
    for (var i = saved.length - 1; i >= 0; i--) {
      var item = saved[i];
      var node = item.node;
      ["position", "top", "left", "right", "width", "height", "aspect-ratio", "margin", "z-index", "transform"].forEach(function (p) {
        node.style.removeProperty(p);
      });
      if (item.style) node.setAttribute("style", item.style);
      else node.removeAttribute("style");
      var parent = item.parent;
      if (!parent) continue;
      if (item.next && item.next.parentNode === parent) parent.insertBefore(node, item.next);
      else parent.appendChild(node);
    }
    saved = [];
    if (typeof global.BotBarPlaceTiles === "function") {
      try { global.BotBarPlaceTiles(); } catch (e) {}
    }
  }

  function closeDemo() {
    if (!demoOpen && overlay.hidden) return;
    demoOpen = false;
    global.__BOTBAR_DEMO_OPEN__ = false;
    if (holdRaf) cancelAnimationFrame(holdRaf);
    holdRaf = 0;
    if (session && session.destroy) {
      try { session.destroy(); } catch (e) {}
    }
    session = null;
    mount.replaceChildren();
    restoreTiles();
    overlay.hidden = true;
    tab.setAttribute("aria-label", "Open 328 demo");
  }

  document.addEventListener("keydown", function (e) {
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
  }, true);

  global.addEventListener("resize", function () {
    var phone = mount && mount.querySelector(".bb328-phone");
    if (phone) phone.removeAttribute("data-fit");
    if (demoOpen) fitPhone();
  });

  function start() { build(); }
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start);
})(window);
