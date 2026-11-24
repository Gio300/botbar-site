(function (global) {
  var CHANNEL = "botbar-chat-uQAb4aRj21Y4V-5aOhY1Cw0JyxXfmWVE";
  var STORAGE_KEY = "botbar-chat-state";
  var defaultState = { v: 1, page: 1, playing: false, muse: "hold", dots: "hold", grokbot: "hold", grok: "hold", reconnect: { muse: 0, dots: 0, grokbot: 0, grok: 0 }, ts: 0 };

  function load() {
    try { return Object.assign({}, defaultState, JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")); }
    catch (e) { return Object.assign({}, defaultState); }
  }
  var state = load();
  var listeners = [];
  var mediaHandlers = [];
  var roleName = null;
  var peerInstance = null;
  var hostId = null;
  var mediaCalls = {};
  var bc = null;
  try {
    bc = new BroadcastChannel(CHANNEL);
    bc.onmessage = function (ev) { applyIncoming(ev.data, "broadcast"); };
  } catch (e) {}

  window.addEventListener("storage", function (ev) {
    if (ev.key !== STORAGE_KEY || !ev.newValue) return;
    try { applyIncoming(JSON.parse(ev.newValue), "storage"); } catch (e) {}
  });

  function applyIncoming(s, src) {
    if (!s || s.v !== 1) return;
    if (src !== "local" && (s.ts || 0) <= (state.ts || 0)) return;
    if (src === "local" && (s.ts || 0) < (state.ts || 0)) return;
    state = Object.assign({}, defaultState, s);
    notify(src);
    if (roleName === "show" && src === "peer") sendPeers(s);
  }
  function notify(src) {
    listeners.slice().forEach(function (fn) { try { fn(Object.assign({}, state), src); } catch (e) {} });
  }

  var conns = [];
  function sendPeers(s) {
    conns.forEach(function (c) { try { if (c.open) c.send(s); } catch (e) {} });
  }
  function hookConn(c) {
    conns.push(c);
    c.on("data", function (s) { applyIncoming(s, "peer"); });
    c.on("close", function () { conns = conns.filter(function (x) { return x !== c; }); });
    function hello() { try { c.send(state); } catch (e) {} }
    if (c.open) hello(); else c.on("open", hello);
  }
  function attachMedia(call) {
    var meta = call.metadata || {};
    var which = meta.which || meta || "muse";
    call.answer();
    call.on("stream", function (stream) {
      mediaHandlers.slice().forEach(function (fn) { try { fn(which, stream); } catch (e) {} });
    });
  }
  function startPeer(role) {
    roleName = role;
    if (!global.Peer) return;
    hostId = "bbshow" + CHANNEL.replace(/[^a-zA-Z0-9]/g, "").slice(-22);
    var id = role === "show" ? hostId : hostId + "r" + Math.random().toString(36).slice(2, 8);
    try {
      if (peerInstance) { try { peerInstance.destroy(); } catch (e) {} }
      peerInstance = new Peer(id, { debug: 0 });
      peerInstance.on("disconnected", function () {
        setTimeout(function () { try { if (peerInstance && peerInstance.disconnected && !peerInstance.destroyed) peerInstance.reconnect(); } catch (e) {} }, 2000);
      });
      peerInstance.on("connection", hookConn);
      peerInstance.on("call", attachMedia);
      peerInstance.on("open", function () {
        if (role !== "show") hookConn(peerInstance.connect(hostId, { reliable: true }));
      });
      peerInstance.on("error", function (err) {
        var ty = err && err.type;
        if (ty === "unavailable-id" || ty === "network" || ty === "server-error" || ty === "socket-error" || ty === "socket-closed") {
          setTimeout(function () { startPeer(role); }, role === "show" ? 6000 : 3000);
          return;
        }
        if (role !== "show") {
          setTimeout(function () { try { hookConn(peerInstance.connect(hostId, { reliable: true })); } catch (e) {} }, 2500);
        }
      });
    } catch (e) {}
  }
  function callWithStream(which, stream) {
    if (!peerInstance || !hostId || !stream) return;
    try {
      if (mediaCalls[which]) { try { mediaCalls[which].close(); } catch (e) {} }
      mediaCalls[which] = peerInstance.call(hostId, stream, { metadata: { which: which } });
    } catch (e) {}
  }
  function callOpen(which) {
    var c = mediaCalls[which];
    if (!c || !c.open) return false;
    var pc = c.peerConnection;
    return !pc || (pc.connectionState !== "failed" && pc.connectionState !== "closed" && pc.connectionState !== "disconnected");
  }
  function hangupMedia(which) {
    var keys = which ? [which] : Object.keys(mediaCalls);
    keys.forEach(function (k) {
      try { if (mediaCalls[k]) mediaCalls[k].close(); } catch (e) {}
      delete mediaCalls[k];
    });
  }

  function publish(patch) {
    state = Object.assign({}, state, patch, { v: 1, ts: Date.now() });
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
    notify("local");
    try { if (bc) bc.postMessage(state); } catch (e) {}
    sendPeers(state);
  }

  global.BotBarChatSync = {
    channel: CHANNEL,
    hostId: function () { return hostId; },
    get: function () { return Object.assign({}, state); },
    subscribe: function (fn) { listeners.push(fn); fn(Object.assign({}, state), "init"); },
    onMedia: function (fn) { mediaHandlers.push(fn); },
    publish: publish,
    start: startPeer,
    callWithStream: callWithStream,
    callOpen: callOpen,
    hangupMedia: hangupMedia
  };
})(window);
