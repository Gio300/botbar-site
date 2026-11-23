/* Public layout knobs for the 328 pull-tab demo.
   Edit these, then reload /chat. No rebuild is required for position changes.
   Percentages are relative to the PiP panel (the inset overlay), not the raw viewport.
   The phone width is a CSS size. The loader shrinks it if it would cover the
   caption row. aspect is width/height (9/19.5 is a tall phone).
   tabSide is "right" or "left". tabOffsetY is the tab's vertical center. */
window.BOTBAR_DEMO_CONFIG = {
  overlay: { inset: "3vh 3vw", radius: "24px" },
  muse: { top: "2%", left: "2%", width: "min(22%, 132px)" },
  dots: { top: "2%", right: "2%", width: "min(22%, 132px)" },
  emulator: { top: "16%", width: "min(78%, 340px)", aspect: 9 / 19.5 },
  tabSide: "right",
  tabOffsetY: "50%"
};
