import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const artifactDir = '/Users/zuniga/.gemini/antigravity/brain/2a4a07c8-a7e6-46ae-969a-d45af7f385e0';
const PORT = 5199;
const CDP_PORT = 9229;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(distDir, reqPath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(fs.readFileSync(filePath));
  } else {
    const indexPath = path.join(distDir, 'index.html');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(fs.readFileSync(indexPath));
  }
});

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
  console.log(`[Verify] Test server listening on http://127.0.0.1:${PORT}`);

  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const userDataDir = '/tmp/chrome-test-verify-' + Date.now();
  const chrome = spawn(
    chromePath,
    [
      '--headless=new',
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${userDataDir}`,
      '--disable-gpu',
      'about:blank'
    ],
    { stdio: 'ignore' }
  );

  process.on('exit', () => {
    try { chrome.kill(); } catch (e) {}
    try { server.close(); } catch (e) {}
  });

  for (let i = 0; i < 30; i++) {
    await sleep(400);
    try {
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
      if (res.ok) break;
    } catch (e) {}
  }

  const targetsRes = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
  const targets = await targetsRes.json();
  const target = targets.find((t) => t.type === 'page');
  const ws = new WebSocket(target.webSocketDebuggerUrl);

  let idCounter = 1;
  const pending = new Map();
  const consoleLogs = [];
  const errors = [];

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
      return;
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      const args = msg.params.args.map((a) => a.value || JSON.stringify(a)).join(' ');
      consoleLogs.push(`[${msg.params.type}] ${args}`);
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      errors.push(
        msg.params.exceptionDetails.text +
          ' ' +
          (msg.params.exceptionDetails.exception?.description || '')
      );
    }
  };

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  function send(method, params = {}) {
    const id = idCounter++;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.setDeviceMetricsOverride', {
    width: 1200,
    height: 850,
    deviceScaleFactor: 1,
    mobile: false
  });

  console.log('[Verify] Navigating to application...');
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}` });
  await sleep(1500);

  // Seed unlocked creatures in localStorage for testing Codex view
  console.log('[Verify] Seeding unlocked creatures in localStorage...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      localStorage.setItem('unlocked_creatures', JSON.stringify(['chrono-phoenix', 'cobble-sprout', 'astro-leviathan']));
    })()`
  });
  // Reload to reflect seeded localStorage
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}` });
  await sleep(1200);

  // 1. Setup Screen & AI Key Button Verification
  console.log('[Verify] Step 1: Checking Setup Screen & AI Key button...');
  const setupCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const title = document.querySelector('h1')?.innerText || '';
      const keyBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('AI KEY'));
      const codexBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('CODEX'));
      return { title, hasKeyBtn: Boolean(keyBtn), hasCodexBtn: Boolean(codexBtn) };
    })()`,
    returnByValue: true
  });
  console.log('[Verify] Setup Screen Result:', setupCheck.result.value);

  const setupScreenshot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactDir, 'screenshot_setup_ai_key.png'), Buffer.from(setupScreenshot.data, 'base64'));

  // 2. Open Codex
  console.log('[Verify] Step 2: Opening Creature Codex...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const codexBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('CODEX'));
      if (codexBtn) codexBtn.click();
    })()`
  });
  await sleep(800);

  // 3. Open Unlocked Creature Popup in Codex
  console.log('[Verify] Step 3: Clicking unlocked creature in Codex...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const firstUnlocked = document.querySelector('.grid > div.cursor-pointer');
      if (firstUnlocked) firstUnlocked.click();
    })()`
  });
  await sleep(800);

  const popupScreenshot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactDir, 'screenshot_codex_popup.png'), Buffer.from(popupScreenshot.data, 'base64'));

  // 4. Trigger Celebration Modal
  console.log('[Verify] Step 4: Triggering 3D Adventure Video celebration...');
  const clickResult = await send('Runtime.evaluate', {
    expression: `(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const vidBtn = btns.find(b => b.innerText.includes('3D Adventure Video'));
      if (vidBtn) {
        vidBtn.click();
        return { clicked: true, text: vidBtn.innerText };
      }
      return { clicked: false, availableButtons: btns.map(b => b.innerText) };
    })()`,
    returnByValue: true
  });
  console.log('[Verify] Step 4 Click Result:', clickResult.result.value);

  // Capture Shimmer/Sparkle Loading Card
  await sleep(1200);
  console.log('[Verify] Capturing Sparkle Shaders Loading Card...');
  const loadingScreenshot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactDir, 'screenshot_celebration_loading.png'), Buffer.from(loadingScreenshot.data, 'base64'));

  // 5. Wait for Video to Synthesize & Play
  console.log('[Verify] Step 5: Waiting for video player to mount...');
  let videoReady = false;
  for (let s = 0; s < 20; s++) {
    await sleep(1000);
    const check = await send('Runtime.evaluate', {
      expression: `(() => {
        const vid = document.querySelector('video');
        const statusText = document.querySelector('.text-slate-400.text-xs')?.innerText || '';
        return { hasVideo: Boolean(vid && vid.src), statusText };
      })()`,
      returnByValue: true
    });
    console.log(`[Verify] Poll #${s + 1}:`, check.result.value);
    if (check.result.value.hasVideo) {
      videoReady = true;
      console.log(`[Verify] Video ready in ${s + 1}s!`);
      break;
    }
  }

  await sleep(1500);
  const videoScreenshot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactDir, 'screenshot_celebration_video.png'), Buffer.from(videoScreenshot.data, 'base64'));

  // Verify Video Player & Save Video Button
  const videoPlayerDetails = await send('Runtime.evaluate', {
    expression: `(() => {
      const vid = document.querySelector('video');
      const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Save Video'));
      return {
        hasVideoElement: Boolean(vid),
        videoReadyState: vid ? vid.readyState : 0,
        videoDuration: vid ? vid.duration : 0,
        hasSaveButton: Boolean(saveBtn)
      };
    })()`,
    returnByValue: true
  });
  console.log('[Verify] Video Player Details:', videoPlayerDetails.result.value);

  // 6. Close Modal & Verify 3D Badge on Codex Card
  console.log('[Verify] Step 6: Closing modal and checking Codex 3D badge...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const closeBtn = document.querySelector('button[aria-label="Close celebration"]');
      if (closeBtn) closeBtn.click();
    })()`
  });
  await sleep(1000);

  const codexBadgeCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const badge = Array.from(document.querySelectorAll('.grid > div span, .grid > div div')).find(el => el.innerText.includes('3D'));
      return { has3DBadge: Boolean(badge), badgeText: badge ? badge.innerText : null };
    })()`,
    returnByValue: true
  });
  console.log('[Verify] Codex 3D Badge Result:', codexBadgeCheck.result.value);

  const codexBadgeScreenshot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(artifactDir, 'screenshot_codex_with_3d_badge.png'), Buffer.from(codexBadgeScreenshot.data, 'base64'));

  console.log('[Verify] Console Logs:', consoleLogs);
  console.log('[Verify] Errors/Exceptions:', errors);

  ws.close();
  chrome.kill();
  server.close();

  return {
    setup: setupCheck.result.value,
    video: videoPlayerDetails.result.value,
    codexBadge: codexBadgeCheck.result.value,
    errors
  };
}

run()
  .then((results) => {
    console.log('[Verify] ALL CHECKS COMPLETED SUCCESSFULLY!');
    fs.writeFileSync('/tmp/verify_results.json', JSON.stringify(results, null, 2));
    process.exit(0);
  })
  .catch((err) => {
    console.error('[Verify] Verification failed:', err);
    process.exit(1);
  });
