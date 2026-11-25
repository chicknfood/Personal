/**
 * Browser-side Google AI & Vertex AI (Veo 3.1) Video Synthesis Engine.
 * Works 100% client-side on static hosts like GitHub Pages using:
 *   - Option A: Google Cloud Service Account JSON (Web Crypto RS256 -> OAuth2 -> Veo 3.1)
 *   - Option B: Google Gemini API Key (gemini-3.8-flash + gemini-3.1-flash-image Canvas Cinema)
 */

const tokenCache = new Map();

function base64UrlEncodeBytes(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlEncodeString(str) {
  return base64UrlEncodeBytes(new TextEncoder().encode(str));
}

function base64ToUint8Array(base64) {
  const clean = base64.replace(/\s+/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Validate and parse a Google Cloud Service Account JSON string or object.
 */
export function parseServiceAccountJson(raw) {
  if (!raw) return null;
  const parsed = typeof raw === 'string' ? JSON.parse(raw.trim()) : raw;
  if (!parsed.client_email || !parsed.private_key || !parsed.project_id) {
    throw new Error(
      'Invalid Service Account JSON: must contain "project_id", "client_email", and "private_key".'
    );
  }
  return parsed;
}

/**
 * Sign an RS256 JWT in the browser via Web Crypto API and exchange it for a Google Cloud OAuth2 Bearer token.
 */
export async function getAccessTokenFromServiceAccount(saInput) {
  const sa = parseServiceAccountJson(saInput);
  if (!sa) throw new Error('Missing Service Account JSON');

  const cached = tokenCache.get(sa.client_email);
  if (cached && cached.expiresAt > Date.now() + 120_000) {
    return { accessToken: cached.token, projectId: sa.project_id };
  }

  if (!window.crypto?.subtle) {
    throw new Error('Web Crypto API requires HTTPS or localhost.');
  }

  const pemContents = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  const derBytes = base64ToUint8Array(pemContents);

  const cryptoKey = await window.crypto.subtle.importKey(
    'pkcs8',
    derBytes.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const now = Math.floor(Date.now() / 1000);
  const tokenUri = sa.token_uri || 'https://oauth2.googleapis.com/token';
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: tokenUri,
    iat: now,
    exp: now + 3600
  };

  const unsignedJwt = `${base64UrlEncodeString(JSON.stringify(header))}.${base64UrlEncodeString(
    JSON.stringify(payload)
  )}`;
  const signatureBuffer = await window.crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsignedJwt)
  );
  const signedJwt = `${unsignedJwt}.${base64UrlEncodeBytes(new Uint8Array(signatureBuffer))}`;

  const res = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: signedJwt
    })
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Service Account OAuth failed (${res.status}): ${errText.slice(0, 180)}`);
  }

  const tokenData = await res.json();
  tokenCache.set(sa.client_email, {
    token: tokenData.access_token,
    expiresAt: Date.now() + (tokenData.expires_in || 3600) * 1000
  });

  return { accessToken: tokenData.access_token, projectId: sa.project_id };
}

/**
 * Extract the final frame of an MP4 Blob in the browser using an offscreen <video> + <canvas>.
 */
async function extractLastFrameBase64(videoBlob) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(videoBlob);
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = url;

    const cleanup = () => URL.revokeObjectURL(url);
    const timeout = setTimeout(() => {
      cleanup();
      resolve(null);
    }, 6000);

    video.onloadedmetadata = () => {
      video.currentTime = Math.max(0, (video.duration || 4) - 0.08);
    };

    video.onseeked = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        cleanup();
        resolve(dataUrl.replace(/^data:image\/\w+;base64,/, ''));
      } catch (e) {
        cleanup();
        resolve(null);
      }
    };

    video.onerror = () => {
      clearTimeout(timeout);
      cleanup();
      resolve(null);
    };
  });
}

function buildDirectorPrompt({ creatureName, creatureElement, creatureDescription }) {
  const encounterMode =
    Math.random() < 0.5
      ? 'epic magical elemental duel / sparring clash'
      : 'cooperative team-up combo attack side-by-side';

  return `You are a high-end cinematic VFX director for an action fantasy creature game.
Creature Name: "${creatureName}"
Elemental Power: "${creatureElement}"
Lore Description: "${creatureDescription}"
Target Encounter Style: "${encounterMode}"

Other fantastical creatures inhabiting this world include: Chrono-Phoenix (cosmic flame bird), Nebula-Kraken (starlight cephalopod), Astro-Leviathan (supernova dragon), Quantum-Yeti (ice cyber beast), Mecha-Pegasus (jet-winged cyber steed), Storm-Griffin (lightning sky-hunter), Crystal-Golem (giant geode guardian), Lunar-Moth (starlight winged moth), Volt-Fox (electric plasma fox), Aqua-Slime (torrential water slime), Copper-Scarab (clockwork brass beetle), Ember-Sprite (wildfire flame spirit), Breeze-Bunny (aero wind rabbit), Moss-Turtle (ancient forest stone turtle), Spark-Owl (static-feathered night owl), Coral-Crab (tidal reef crab), Timber-Cub (wooden-armored forest bear cub), Dew-Frog (misty lily-pad frog), Glimmer-Bee (sunbeam honeycomb bee), and Frost-Chick (icy snow penguin).

Analyze this collectible card image and output a JSON object containing two specific, vivid visual prompts:

1. "cardPrompt": Focus on an animated 3D holographic foil collectible trading card with iridescent metallic reflections, volumetric shimmering light rays, floating glowing elemental particles, and ${creatureName} dynamically emerging from the frame ready for action.
2. "adventurePrompt": MUST keep "${creatureName}" as the unmistakable CENTER-STAGE HERO in the foreground, actively using and showcasing its signature "${creatureElement}" powers while interacting with one other distinct fantasy creature from the list above—NEVER solo exploration and NEVER let the other creature steal the spotlight! Choreograph all 8 seconds in 3 clear visual beats:
   - Beat 1 (Charge-Up): Starting seamlessly from "${creatureName}" emerging out of the card, the camera locks onto "${creatureName}" as its body, eyes, and limbs visibly ignite and surge with its unmistakable "${creatureElement}" power (describe the exact physical visual effect of ${creatureElement}!).
   - Beat 2 (Power Showcase & Interaction): "${creatureName}" actively unleashes its signature "${creatureElement}" ability—firing a dazzling elemental beam, summoning elemental barriers/storms, or launching a radiant energy wave—directly into an "${encounterMode}" with a visually contrasting fellow creature (either clashing powers mid-air in an exciting fantasy duel where "${creatureName}"'s power visibly pushes back, OR combining its "${creatureElement}" energy with an allied creature's power in a synchronized combo strike).
   - Beat 3 (Heroic Payoff): Dynamic hero close-up/medium shot spotlighting "${creatureName}" radiating "${creatureElement}" energy as the combo or duel resolves in a burst of colorful magical sparks.
   Keep the action vivid, family-friendly Unreal Engine 5 fantasy magic (no gore or blood) and do NOT waste time on empty landscape flyovers.

Respond ONLY with valid JSON matching:
{
  "cardPrompt": "...",
  "adventurePrompt": "..."
}`;
}

/**
 * Stage 1: Generate multi-creature prompts in the browser using either Gemini API Key or Service Account.
 */
async function generatePromptsClientSide({
  creatureName,
  creatureElement,
  creatureDescription,
  cleanImageBase64,
  geminiApiKey,
  accessToken,
  projectId
}) {
  const fallbackPrompts = {
    cardPrompt: `3D holographic foil collectible card of ${creatureName} with iridescent rainbow metallic sheen, volumetric light rays, floating ${creatureElement} particles, and dynamic 3D creature motion emerging from the frame.`,
    adventurePrompt: `Unreal Engine 5 hero-spotlight action scene keeping ${creatureName} center-stage in the foreground: ${creatureName} charges up glowing ${creatureElement} energy across its body, then unleashes a massive radiant ${creatureElement} wave that clashes mid-air with a towering Crystal-Golem and combines with a lightning Storm-Griffin in a dazzling burst of magical sparks.`
  };

  const parts = [
    { inlineData: { mimeType: 'image/png', data: cleanImageBase64 } },
    { text: buildDirectorPrompt({ creatureName, creatureElement, creatureDescription }) }
  ];

  try {
    let res;
    if (geminiApiKey) {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${encodeURIComponent(
          geminiApiKey
        )}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts }],
            generationConfig: { responseMimeType: 'application/json' }
          })
        }
      );
    } else if (accessToken && projectId) {
      res = await fetch(
        `https://us-central1-aiplatform.googleapis.com/v1beta1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-2.5-flash:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts }],
            generationConfig: { responseMimeType: 'application/json' }
          })
        }
      );
    }

    if (res && res.ok) {
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text;
      if (text) {
        const parsed = JSON.parse(text);
        if (parsed.cardPrompt && parsed.adventurePrompt) return parsed;
      }
    }
  } catch (err) {
    console.warn('[BrowserAI] Prompt generation fallback used:', err.message);
  }

  return fallbackPrompts;
}

/**
 * Run a single Veo long-running video generation request on Vertex AI directly from the browser.
 */
async function runVertexVeoClip({
  accessToken,
  projectId,
  prompt,
  imageBase64,
  mimeType,
  durationSeconds,
  onTick
}) {
  const location = 'us-central1';
  const models = ['veo-3.1-fast-generate-001', 'veo-3.1-generate-001', 'veo-2.0-generate-001'];
  let operationName = null;
  let chosenModel = null;
  let lastErr = null;

  for (const model of models) {
    const resourceName = `projects/${projectId}/locations/${location}/publishers/google/models/${model}`;
    const startUrl = `https://${location}-aiplatform.googleapis.com/v1beta1/${resourceName}:predictLongRunning`;
    const res = await fetch(startUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        instances: [
          {
            prompt,
            image: {
              bytesBase64Encoded: imageBase64,
              mimeType
            }
          }
        ],
        parameters: {
          durationSeconds: model.startsWith('veo-3') ? durationSeconds : durationSeconds === 4 ? 5 : 8,
          aspectRatio: '16:9'
        }
      })
    });

    if (res.ok) {
      const data = await res.json();
      operationName = data.name;
      chosenModel = model;
      break;
    } else {
      const errText = await res.text().catch(() => '');
      lastErr = new Error(`Veo (${model}) HTTP ${res.status}: ${errText.slice(0, 200)}`);
      if (res.status === 401 || res.status === 403) throw lastErr;
    }
  }

  if (!operationName || !chosenModel) {
    throw lastErr || new Error('Could not start Veo video generation');
  }

  const pollUrl = `https://${location}-aiplatform.googleapis.com/v1beta1/projects/${projectId}/locations/${location}/publishers/google/models/${chosenModel}:fetchPredictOperation`;
  for (let i = 0; i < 50; i++) {
    await new Promise((r) => setTimeout(r, 6000));
    if (onTick) onTick(i + 1);

    const pollRes = await fetch(pollUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({ operationName })
    });

    if (!pollRes.ok) continue;
    const opData = await pollRes.json();
    if (opData.done) {
      if (opData.error) {
        throw new Error(opData.error.message || 'Veo operation failed');
      }
      const videoB64 =
        opData.response?.videos?.[0]?.bytesBase64Encoded ||
        opData.response?.generatedSamples?.[0]?.video?.bytesBase64Encoded;
      if (!videoB64) {
        throw new Error('Veo completed without returning video bytes');
      }
      const bytes = base64ToUint8Array(videoB64);
      return {
        blob: new Blob([bytes], { type: 'video/mp4' }),
        model: chosenModel
      };
    }
  }

  throw new Error('Veo generation timed out while polling');
}

/**
 * Browser fallback when ONLY a Gemini API key is supplied (no Service Account):
 * Generates 3 real HD AI multi-creature scenes with gemini-3.1-flash-image and animates them via MediaRecorder.
 */
async function generateBrowserImageCinema({
  geminiApiKey,
  creature,
  prompts,
  onStatus,
  onProgress
}) {
  onStatus('Generating 3 HD AI multi-creature scenes via Gemini 3.1...');
  onProgress(15);

  const scenePrompts = [
    `Photorealistic 3D holographic foil collectible trading card floating in dramatic dark studio lighting, rainbow iridescent metallic frame, glowing ${creature.element} particles swirling around ${creature.name}, volumetric light rays, 16:9 widescreen cinematic shot, no blurry text. ${prompts.cardPrompt}`,
    `Epic third-person action video game screenshot in Unreal Engine 5 aesthetic, spotlighting ${creature.name} center-stage in the foreground actively unleashing its signature ${creature.element} power directly against or alongside another fantastical elemental creature in a glowing fantasy arena, dramatic lighting, 16:9 widescreen. ${prompts.adventurePrompt}`,
    `Unreal Engine 5 hero spotlight climax, ${creature.name} front-and-center unleashing a massive unmistakable ${creature.element} signature ability interacting with a rival or allied mythical creature across a vibrant fantasy arena, volumetric god rays, 16:9 widescreen.`
  ];

  const images = await Promise.all(
    scenePrompts.map(async (p, idx) => {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=${encodeURIComponent(
          geminiApiKey
        )}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: p }] }],
            generationConfig: { responseModalities: ['IMAGE'] }
          })
        }
      );
      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        throw new Error(`Gemini Image API (${res.status}): ${errBody.slice(0, 160)}`);
      }
      const data = await res.json();
      const imgPart = data.candidates?.[0]?.content?.parts?.find((part) => part.inlineData);
      if (!imgPart?.inlineData?.data) {
        throw new Error(`No image returned for scene ${idx + 1}`);
      }
      const src = `data:${imgPart.inlineData.mimeType || 'image/jpeg'};base64,${imgPart.inlineData.data}`;
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    })
  );

  onStatus('Animating HD AI scenes into video...');
  onProgress(65);

  const width = 960;
  const height = 540;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')
    ? 'video/mp4;codecs=avc1'
    : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm';

  const stream = canvas.captureStream(24);
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 3500000 });
  const chunks = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const fps = 24;
  const totalSeconds = 9;
  const totalFrames = fps * totalSeconds;
  let frame = 0;

  recorder.start();

  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      const videoBlob = new Blob(chunks, { type: mimeType.split(';')[0] });
      resolve({
        videoBlob,
        videoUrl: URL.createObjectURL(videoBlob),
        adventureBlob: null,
        adventureVideoUrl: null,
        engine: 'Gemini 3.1 AI Cinema (Animated Stills)',
        prompts
      });
    };
    recorder.onerror = reject;

    function drawCoverZoom(img, zoom, panY = 0, alpha = 1) {
      ctx.save();
      ctx.globalAlpha = alpha;
      const scale = Math.max(width / img.width, height / img.height) * zoom;
      const dw = img.width * scale;
      const dh = img.height * scale;
      const dx = (width - dw) / 2;
      const dy = (height - dh) / 2 + panY;
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.restore();
    }

    function step() {
      const t = frame / fps;
      onProgress(65 + Math.round((frame / totalFrames) * 35));

      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, width, height);

      const sceneLen = 3.0;
      const idx = Math.min(2, Math.floor(t / sceneLen));
      const localT = (t - idx * sceneLen) / sceneLen; // 0 -> 1

      const zoom = idx === 2 ? 1.22 - localT * 0.16 : 1.04 + localT * 0.18;
      const panY = idx === 1 ? -localT * 18 : 0;
      drawCoverZoom(images[idx], zoom, panY, 1);

      // Smooth 0.4s crossfade into next scene
      if (idx < 2 && localT > 0.85) {
        const fadeAlpha = (localT - 0.85) / 0.15;
        drawCoverZoom(images[idx + 1], 1.04, 0, fadeAlpha);
      }

      // Subtle glowing magical embers overlay
      for (let p = 0; p < 18; p++) {
        const px = ((Math.sin(p * 19 + t * 1.4) * 0.48 + 0.5) * width);
        const py = height - ((p * 41 + t * 55) % height);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.25 + Math.sin(t * 4 + p) * 0.15})`;
        ctx.beginPath();
        ctx.arc(px, py, 1.8 + (p % 2), 0, Math.PI * 2);
        ctx.fill();
      }

      frame++;
      if (frame < totalFrames) {
        setTimeout(step, 16);
      } else {
        recorder.stop();
      }
    }

    step();
  });
}

/**
 * Main Browser-Direct Entry Point:
 * Runs Veo 3.1 if Service Account JSON is provided, or Gemini 3.1 AI Cinema if only a Gemini API Key is provided.
 */
export async function generateCreatureVideoInBrowser({
  creature,
  cardImageBase64,
  geminiApiKey = '',
  serviceAccountJson = '',
  onStatus = () => {},
  onProgress = () => {}
}) {
  const cleanImageBase64 = cardImageBase64.replace(/^data:image\/\w+;base64,/, '');

  let accessToken = '';
  let projectId = '';
  if (serviceAccountJson && serviceAccountJson.trim()) {
    onStatus('Authenticating Google Cloud Service Account (Web Crypto)...');
    onProgress(5);
    const auth = await getAccessTokenFromServiceAccount(serviceAccountJson);
    accessToken = auth.accessToken;
    projectId = auth.projectId;
  }

  onStatus('Crafting multi-creature encounter script with Gemini...');
  onProgress(10);
  const prompts = await generatePromptsClientSide({
    creatureName: creature.name,
    creatureElement: creature.element || 'Cosmic Magic',
    creatureDescription: creature.description,
    cleanImageBase64,
    geminiApiKey: geminiApiKey.trim(),
    accessToken,
    projectId
  });

  // Path A: Service Account present -> True Veo 3.1 Cinematic Video!
  if (accessToken && projectId) {
    onStatus('Stage 1/2: Generating 4s Veo 3.1 Holographic Card Reveal (60–90s total)...');
    onProgress(15);

    const stage2 = await runVertexVeoClip({
      accessToken,
      projectId,
      prompt: prompts.cardPrompt,
      imageBase64: cleanImageBase64,
      mimeType: 'image/png',
      durationSeconds: 4,
      onTick: (tick) => onProgress(Math.min(52, 15 + tick * 5))
    });

    onStatus('Extracting final card frame for seamless 3D transition...');
    onProgress(55);
    const lastFrameB64 = await extractLastFrameBase64(stage2.blob);

    let adventureBlob = null;
    try {
      onStatus('Stage 2/2: Generating 8s Veo 3.1 Multi-Creature Encounter...');
      const stage3 = await runVertexVeoClip({
        accessToken,
        projectId,
        prompt: prompts.adventurePrompt,
        imageBase64: lastFrameB64 || cleanImageBase64,
        mimeType: lastFrameB64 ? 'image/jpeg' : 'image/png',
        durationSeconds: 8,
        onTick: (tick) => onProgress(Math.min(96, 55 + tick * 5))
      });
      adventureBlob = stage3.blob;
    } catch (extErr) {
      console.warn('[BrowserAI] Stage 3 extension failed; keeping Stage 2 Veo clip:', extErr.message);
    }

    onProgress(100);
    return {
      videoBlob: stage2.blob,
      videoUrl: URL.createObjectURL(stage2.blob),
      adventureBlob,
      adventureVideoUrl: adventureBlob ? URL.createObjectURL(adventureBlob) : null,
      engine: stage2.model.startsWith('veo-3')
        ? 'Veo 3.1 (Cinematic AI)'
        : 'Veo 2 (Cinematic AI)',
      prompts
    };
  }

  // Path B: Gemini API Key only -> Browser Gemini 3.1 AI Cinema (Animated Stills)
  if (geminiApiKey && geminiApiKey.trim()) {
    return await generateBrowserImageCinema({
      geminiApiKey: geminiApiKey.trim(),
      creature,
      prompts,
      onStatus,
      onProgress
    });
  }

  throw new Error('No Gemini API Key or Service Account JSON configured.');
}
