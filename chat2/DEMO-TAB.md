# 328 pull tab

The chat deck stays as it is until someone uses the thin tab on the right edge.

A small Emulator pill (`#bb328-switch`, `aria-checked` true or false) sits in the top-right of the current page's brand header. It starts on. Turning it off closes an open prompt or PiP, puts Muse and Dots back, and hides the pull tab. The choice is kept in `localStorage` under `botbar.demo328.enabled`. Label, default, and corner offsets are the `switch` block in `demo-tab.config.js`.

- `demo-tab.css` — tab, emulator switch, passphrase card, and PiP shell.
- `demo-tab.config.js` — `window.BOTBAR_DEMO_CONFIG` positions (overlay, Muse, Dots, emulator, tab, switch).
- `demo-tab.js` — tab, passphrase prompt, PBKDF2-SHA256, AES-256-GCM decrypt of `demo328.bin`, in-memory player.
- `demo328.bin` — encrypted walkthrough (player, autoplay steps, interactive screen map, frames). Header: `D328`, version `1`, iteration count, 16-byte salt, 12-byte IV, then ciphertext. GCM failure means the passphrase was wrong. The passphrase is not in this repo.

After unlock the emulator fills the screen. On a phone the phone UI is the whole viewport; on a desktop it is full height, phone-shaped, and centered. A grip at the top pulls down to close. The X and Esc close it too. Muse and Dots stay in the page overlay and are only hidden while this is open.

Interactive mode is a live keyboard: Messages with 555-1234, QWERTY, a 123 layer, suggestions, speech-to-text, and Voice. **Auto demo** in the mode chip plays the scripted tour. Editing destinations and the build-a-bot flow is done in the private source folder, then rebuilt into the bin.

Wrong guesses shake the card. After 5 failures the prompt locks for 30 seconds and the wait doubles on each further failure (`localStorage` key `botbar.demo328.lock`). Every submit still runs a PBKDF2 derivation.

The editable story, screenshots, and `build.mjs` live outside this public repo:

`C:\Users\Flying Phoenix PCs\code\botbar-demo-328-src\`

Rebuild from that folder with `DEMO_PASSPHRASE` set in the environment. Do not commit the passphrase.
