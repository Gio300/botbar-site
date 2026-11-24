BotBar overlay drop-in

To use Muse/Dots overlays and the phone remote with any show HTML, add:

  <script src="https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js"></script>
  <script src="/chat/sync.js"></script>
  <script src="/chat/overlay-layer.js"></script>

overlay-layer.js will also load those two scripts itself if they are missing.
It injects the Muse (top left) and Dots (top right) video tiles and keeps
them independent of the page markup. The remote at /chat/remote still
drives PLAY/STOP, live/hold, Reconnect, and page changes.

Listen for page changes in custom HTML:

  window.addEventListener('botbar-chat-page', e => { /* e.detail.page is 1-based */ });

or implement window.BotBarShow.go(pageNumber).
