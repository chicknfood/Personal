# Changelog — Math Champions: Multiplication Trainer

All notable changes to the Multiplication Trainer & Bestiary Codex are documented here.
- **🌐 Live App Launcher (GitHub Pages)**: [https://chicknfood.github.io/Personal/](https://chicknfood.github.io/Personal/)
- **⚡ Direct App Link**: [https://chicknfood.github.io/Personal/Multiplication_Trainer.html](https://chicknfood.github.io/Personal/Multiplication_Trainer.html)

---

## [v1.3.0] - 2026-11-25

### ✨ Added & Updated
- **Timer Speed Bonuses & Penalties**:
  - **Ninja (3s)**: `+10` Max Grade Cap and `+5` Speed Cushion (`+5` safety buffer on earned Complexity Grade).
  - **Normal (5s)**: Standard `0` modifier.
  - **Relaxed (10s)**: `-10` Max Grade Penalty.
  - **Unlimited**: `-20` Max Grade Penalty.
  - Added live table vs. timer breakdown in the Setup screen and a color-coded timer modifier pill on the Results card.
- **Scaling Streak Multipliers & Grade Bonus**:
  - Live combo score scales from `1×` up to `5×` every 5 consecutive correct answers (`5→1.5×`, `10→2×`, `15→2.5×`, `20→3×`, ..., `40+→5×`), multiplied by timer base points (`150` Ninja, `100` Normal, `75` Relaxed, `50` Unlimited).
  - Longer streaks also award up to `+12` bonus points toward your Complexity Grade (`5→+1`, `10→+2`, `15→+4`, `20→+6`, `25→+8`, `30→+10`, `35+→+12`), displayed in the live HUD and 4-column Results card.
- **Expanded Bestiary (18 → 24 Creatures across 8 Balanced Tiers)**:
  - Filled the Grade 0–50 gap with **Grade 35 (Apprentice)**: *Spark-Owl*, *Coral-Crab*, *Timber-Cub* and **Grade 20 (Novice)**: *Dew-Frog*, *Glimmer-Bee*, *Frost-Chick*.
  - Preserved all 18 original creature IDs so previously unlocked creatures and cached 3D videos remain intact.

---

## [v1.2.0] - 2026-11-25

### ✨ Added
- **Browser-Direct "Bring Your Own Key" AI Videos on GitHub Pages (`browserAiVideo.js` & `AiCredentialsModal.jsx`)**:
  - Added full client-side support for **both** a **Google Gemini API Key** (`AIzaSy...` / `AQ...`) and a **Google Cloud Service Account JSON** (`.json` file upload or paste) directly on static GitHub Pages (`chicknfood.github.io/Personal`).
  - **Web Crypto OAuth2 for Veo 3.1**: Signs RS256 JWTs natively via `window.crypto.subtle` to call `veo-3.1-fast-generate-001` directly from the browser, with `<canvas>` last-frame extraction and seamless dual-clip 720p + stereo audio playback.
  - **Browser Gemini 3.1 Image Cinema Fallback**: When only a Gemini API key is supplied, generates 3 custom HD multi-creature scenes in-browser via `gemini-3.1-flash-image`.
  - **Clear Credential Comparison & Drawbacks Guide**: Added side-by-side guidance explaining both key options, their billing/motion tradeoffs, browser `localStorage` privacy considerations, and a one-click **Clear Saved Keys** button.

---

## [v1.1.0] - 2026-11-25

### ✨ Added
- **3D Creature Card & Cinematic Adventure Video Celebration**:
  - Automatic celebration modal when unlocking a new Bestiary creature milestone, featuring an animated sparkle-shader holographic loading card (`60–90s` AI synthesis indicator) and a full-bleed cinematic `<video>` player.
  - **Multi-Stage Google GenAI & Veo 3.1 Pipeline (`/api/generate-creature-video`)**:
    - **Stage 1 (`gemini-3.8-flash`)**: Analyzes a dynamically rendered 768×1024 holographic creature card asset to craft custom 3D foil reveal and Unreal Engine 5 encounter prompts.
    - **Stage 2 (`veo-3.1-fast-generate-001`)**: Generates a 4-second 720p animated 3D holographic foil card reveal with audio via Google Cloud Agent Platform / Vertex AI.
    - **Stage 3 (`veo-3.1-fast-generate-001` Last-Frame Relay)**: Extracts the final frame of Stage 2 and extends it into an 8-second 3D fantasy encounter stitched seamlessly via `ffmpeg` into a 12-second MP4.
  - **Multi-Creature Battles & Cooperative Combos**: Videos dynamically stage magical elemental duels or side-by-side team-up combo attacks with other Bestiary creatures rather than solo exploration.
  - **Save Video (MP4) & Regenerate Controls**: One-click MP4 download (`<Creature>-3D-Adventure.mp4`) and on-demand AI video regeneration.
  - **Bestiary Codex 3D Replay & Badges**: Cached videos persist in IndexedDB and local disk (`public/creature-videos/`), displaying a pulsing **`3D`** badge on Codex cards for instant replay.
  - **Static Hosting / Offline 3D Preview Fallback**: Automatically renders an in-browser Canvas 3D card & adventure animation when hosted statically on GitHub Pages or offline.
- **Physical Keyboard & Numeric Keypad Support**:
  - Type answers rapidly using top-row number keys or a physical numeric keypad (`0`–`9`), erase with `Backspace`/`Delete`, and submit or advance past missed-question reviews instantly with `Enter` / `NumpadEnter`.

---

## [v1.0.0] - 2026-10-28

### 🎉 Initial Release
- Gamified 64-question multiplication trainer covering the `1×` through `12×` times tables.
- Complexity-weighted **Max Potential Grade** cap and adaptive cutoff timers (*Relaxed 10s*, *Normal 5s*, *Ninja 3s*, *Unlimited*).
- Custom touch/click on-screen numpad and post-session missed-question Review Board.
- **18 Collectible Creatures** across *Mythic*, *Legendary*, *Rare*, *Uncommon*, *Common*, and *Basic* tiers with local storage persistence.
- Zero-install `standalone.html` build, macOS/Windows one-click launchers (`start.command`, `start.bat`), and GitHub Pages portal deployment.
