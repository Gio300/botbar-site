# 328 pull tab

The chat deck stays as it is until someone uses the thin tab on the right edge.

- `demo-tab.css` — tab, passphrase card, and PiP shell.
- `demo-tab.config.js` — `window.BOTBAR_DEMO_CONFIG` positions (overlay, Muse, Dots, emulator, tab).
- `demo-tab.js` — tab, passphrase prompt, PBKDF2-SHA256, AES-256-GCM decrypt of `demo328.bin`, in-memory player.
- `demo328.bin` — encrypted walkthrough (player, autoplay steps, interactive screen map, frames). Header: `D328`, version `1`, iteration count, 16-byte salt, 12-byte IV, then ciphertext. GCM failure means the passphrase was wrong. The passphrase is not in this repo.

After unlock the emulator opens in **Interactive** mode on the bot bar. **Auto demo** in the same control row plays the scripted tour. Editing hotspots and flows is done in the private source folder, then rebuilt into the bin.

Wrong guesses shake the card. After 5 failures the prompt locks for 30 seconds and the wait doubles on each further failure (`localStorage` key `botbar.demo328.lock`). Every submit still runs a PBKDF2 derivation.

The editable story, screenshots, and `build.mjs` live outside this public repo:

`C:\Users\Flying Phoenix PCs\code\botbar-demo-328-src\`

Rebuild from that folder with `DEMO_PASSPHRASE` set in the environment. Do not commit the passphrase.
