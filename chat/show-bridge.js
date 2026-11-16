(function () {
  var museTile = document.getElementById("muse-tile");
  var dotsTile = document.getElementById("dots-tile");
  var museVid = document.getElementById("muse-video");
  var dotsVid = document.getElementById("dots-video");

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
      t.addEventListener("ended", function () { if (!hasLive(stream)) window.BotBarFeeds.disconnect(which); });
    });
  }

  window.BotBarFeeds = {
    connect: function (which, stream) {
      var vid = which === "muse" ? museVid : dotsVid;
      var tile = which === "muse" ? museTile : dotsTile;
      if (vid.srcObject && vid.srcObject !== stream) {
        try { vid.srcObject.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
      }
      vid.srcObject = stream || null;
      var showIt = function () { setVisible(tile, vid, true); };
      vid.onloadedmetadata = showIt;
      vid.onplaying = showIt;
      if (vid.play) vid.play().catch(function () {});
      watch(which, stream);
      showIt();
    },
    disconnect: function (which) {
      var vid = which === "muse" ? museVid : dotsVid;
      var tile = which === "muse" ? museTile : dotsTile;
      if (vid && vid.srcObject) {
        try { vid.srcObject.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
        vid.srcObject = null;
      }
      setVisible(tile, vid, false);
    }
  };

  var applying = false;
  if (window.BotBarChatSync) {
    var origShow = window.show;
    if (typeof origShow === "function") {
      window.show = function (n) {
        origShow(n);
        if (applying || !window.BotBarChatSync) return;
        var want = Math.max(0, Math.min(8, n)) + 1;
        if (BotBarChatSync.get().page !== want) BotBarChatSync.publish({ page: want });
      };
    }
    BotBarChatSync.onMedia(function (which, stream) {
      if (which === "muse" || which === "dots") BotBarFeeds.connect(which, stream);
    });
    BotBarChatSync.subscribe(function (s, src) {
      if (typeof show === "function" && s.page) {
        var n = Math.max(0, Math.min(8, (s.page | 0) - 1));
        if (typeof page === "number" && n !== page) {
          applying = true;
          try { show(n); } finally { applying = false; }
        }
      }
      if (!s.playing) {
        BotBarFeeds.disconnect("muse");
        BotBarFeeds.disconnect("dots");
      }
    });
    BotBarChatSync.start("show");
  }
})();
