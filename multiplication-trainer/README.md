# ⚡ Math Champions: Multiplication Trainer & Bestiary Codex

An interactive, gamified multiplication trainer designed to help students master their times tables through speed, accuracy, and creature collection.

Based on the original Gemini generation: [share.gemini.google/U70cTptbNRtp](https://share.gemini.google/U70cTptbNRtp).

---

## ⚡ Quick Reference Guide (For Beginners)

You can run this application in **3 easy ways**—choose whichever feels most comfortable!

### Option 1: Instant Play (Zero Installation Required) ⭐ *Easiest*
No coding tools, terminal, or setup needed:
1. Open the project folder on your computer.
2. Double-click **`standalone.html`**.
3. It will open immediately in your web browser (Chrome, Safari, Edge, or Firefox) and is ready to play offline!

---

### Option 2: One-Click Launcher (Mac & Windows)
If you want to run the live app without typing commands:
- **On a Mac**: Double-click **`start.command`**.
  *(Note: If macOS asks for permission the first time, right-click `start.command` and choose **Open**).*
- **On Windows**: Double-click **`start.bat`**.

The launcher will automatically check if dependencies are installed, start the app, and open your browser.

---

### Option 3: Step-by-Step Terminal Guide (For Developers / Customizing Code)
If you want to edit the code and see your changes update live:

#### Step 1: Install Node.js (One-Time Setup)
If you don't have Node.js installed yet, download and install the **LTS** version from [nodejs.org](https://nodejs.org/).

#### Step 2: Open Terminal in the Project Folder
- **Mac**: Open the **Terminal** app, type `cd ` (with a space after it), drag the `multiplication-trainer` folder into the Terminal window, and press **Enter**.
- **Windows**: Right-click inside the `multiplication-trainer` folder and select **Open in Terminal** (or **Command Prompt**).

#### Step 3: Install & Start
Copy and paste these two commands, pressing **Enter** after each:

```bash
npm install
```
*(Downloads the required code libraries—only needed the very first time).*

```bash
npm start
```
*(Starts the app and automatically opens `http://localhost:5173` in your browser).*

---

## 📋 Command Cheatsheet

| What you want to do | Command to run |
| :--- | :--- |
| **Install required libraries** (first time only) | `npm install` |
| **Start the app & open browser** | `npm start` *(or `npm run dev`)* |
| **Stop the running app** | Press **`Ctrl + C`** in the Terminal window |
| **Rebuild `standalone.html` after code edits** | `npm run build` |
| **Preview the production build** | `npm run preview` |

---

## 🛠️ Troubleshooting Common Issues

- **"command not found: npm" or "'npm' is not recognized"**
  - Node.js isn't installed or isn't loaded in your Terminal yet. Either use **Option 1 (`standalone.html`)** above, double-click **`start.command`**, or install Node.js from [nodejs.org](https://nodejs.org/).
- **The browser didn't open automatically**
  - Open any web browser and type **`http://localhost:5173`** into the address bar.
- **How do I reset unlocked creatures?**
  - Unlocked creatures are saved in your browser's local storage under `unlocked_creatures`. To reset them, open your browser's Developer Tools (`Right-Click` -> `Inspect` -> `Console`), type `localStorage.clear()`, press **Enter**, and refresh the page.

---

## 🎮 Features & Gameplay Overview

- **Selectable Times Tables**: Practice any combination from the `1×` through `12×` tables.
- **Complexity & Integrity Cap**: Selecting more tables increases your **Max Potential Grade** up to **100**, encouraging full-table mastery.
- **Adaptive Time Cutoffs**:
  - **Relaxed** (`10s` per question)
  - **Normal** (`5s` per question)
  - **Ninja** (`3s` per question)
  - **Unlimited** (no timer)
- **64-Question Mastery Drill**: Randomly drawn problems from your selected tables with instant visual review on missed or timed-out questions.
- **Custom On-Screen Numpad**: Built for fast touch or mouse input without mobile keyboard popups.
- **18 Fantastical Creatures (Bestiary Codex)**:
  - **Mythic (Grade 100)**: Chrono-Phoenix, Nebula-Kraken, Seraph-Prime
  - **Legendary (Grade 95+)**: Astro-Leviathan, Quantum-Yeti, Mecha-Pegasus
  - **Rare (Grade 85+)**: Storm-Griffin, Crystal-Golem, Lunar-Moth
  - **Uncommon (Grade 70+)**: Volt-Fox, Aqua-Slime, Copper-Scarab
  - **Common (Grade 50+)**: Ember-Sprite, Breeze-Bunny, Iron-Tortoise, Moss-Gekko, Sand-Puffer, Pebble-Crab
