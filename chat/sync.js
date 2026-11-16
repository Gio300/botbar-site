(function (global) {
  var CHANNEL = "botbar-chat-uQAb4aRj21Y4V-5aOhY1Cw0JyxXfmWVE";
  var STORAGE_KEY = "botbar-chat-state";
  var defaultState = { v: 1, page: 1, playing: false, muse: "hold", dots: "hold", reconnect: { muse: 0, dots: 0 }, ts: 0 };

  function load() {
    try { return Object.assign({}, defaultState, JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")); }
    catch (e) { return Object.assign({}, defaultState); }
  }
  var state = load();
  var listeners = [];
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
    if ((s.ts || 0) < (state.ts || 0)) return;
    state = Object.assign({}, defaultState, s);
    notify(src);
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
  function startPeer(role) {
    if (!global.Peer) return;
    var hostId = "bbshow" + CHANNEL.replace(/[^a-zA-Z0-9]/g, "").slice(-22);
    var id = role === "show" ? hostId : hostId + "r" + Math.random().toString(36).slice(2, 8);
    try {
      var peer = new Peer(id, { debug: 0 });
      peer.on("connection", hookConn);
      peer.on("open", function () {
        if (role !== "show") hookConn(peer.connect(hostId, { reliable: true }));
      });
      peer.on("error", function () {
        if (role !== "show") {
          setTimeout(function () { try { hookConn(peer.connect(hostId, { reliable: true })); } catch (e) {} }, 2500);
        }
      });
    } catch (e) {}
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
    get: function () { return Object.assign({}, state); },
    subscribe: function (fn) { listeners.push(fn); fn(Object.assign({}, state), "init"); },
    publish: publish,
    start: startPeer
  };
})(window);
