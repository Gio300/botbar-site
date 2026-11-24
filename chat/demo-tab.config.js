/* Public layout knobs for the 328 pull-tab demo.
   While the emulator is open it fills the screen:
   phones use the whole viewport (100dvw x 100dvh, safe-area insets);
   desktop (width >= fullscreen.desktopMin) uses the full viewport height,
   phone aspect, centered.
   overlay, muse, dots, and emulator are kept so older layouts still parse.
   The open emulator does not move Muse or Dots; it hides them with a class
   and leaves them in #botbar-overlay-root.
   handle.closeDrag is how far a pull-down on the grip must travel to close.
   tabSide is "right" or "left". tabOffsetY is the tab's vertical center.
   switch sits in the current page's brand header. position is "top-right" or
   "top-left". top / right / left are offsets from that corner (px or %).
   default applies only when localStorage has no botbar.demo328.enabled value. */
window.BOTBAR_DEMO_CONFIG = {
  overlay: { inset: "3vh 3vw", radius: "24px" },
  muse: { top: "2%", left: "2%", width: "min(22%, 132px)" },
  dots: { top: "2%", right: "2%", width: "min(22%, 132px)" },
  emulator: { top: "16%", width: "min(48%, 240px)", aspect: 9 / 19.5 },
  fullscreen: {
    phone: "100dvw",
    height: "100dvh",
    aspect: 9 / 19.5,
    desktopMin: 1100,
    safeArea: true
  },
  handle: { height: "28px", closeDrag: 56 },
  tabSide: "right",
  tabOffsetY: "50%",
  switch: { label: "Emulator", default: true, position: "top-right", top: "6px", right: "8px", left: "8px" }
};
