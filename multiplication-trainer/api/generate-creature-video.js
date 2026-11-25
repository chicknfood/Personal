import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { GoogleGenAI } from '@google/genai';

const execAsync = promisify(exec);

// Determine cache directory (public/creature-videos in current working project)
const CACHE_DIR = path.resolve(process.cwd(), 'public', 'creature-videos');
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

/**
 * Load GEMINI_API_KEY from .env.local or .env if not already in process.env
 */
function loadEnvApiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  for (const envFile of ['.env.local', '.env']) {
    const envPath = path.resolve(process.cwd(), envFile);
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      const match = content.match(/^GEMINI_API_KEY=(.+)$/m);
      if (match && match[1]) {
        return match[1].trim().replace(/^["']|["']$/g, '');
      }
    }
  }
  return '';
}

/**
 * Generate a 3-scene cinematic 10s MP4 using gemini-3.1-flash-image + ffmpeg
 * Used automatically when Veo is not enabled on the API key.
 */
async function generateGeminiCinemaVideo(ai, { creatureId, creatureName, creatureElement, prompts, cachedFilePath }) {
  const tempDir = path.resolve(CACHE_DIR, 'tmp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  console.log(`[AI Video API] Generating 3 HD cinematic scenes via gemini-3.1-flash-image for ${creatureName}...`);

  const scenePrompts = [
    `Photorealistic 3D holographic foil collectible trading card floating in dramatic dark studio lighting, rainbow iridescent metallic frame, glowing ${creatureElement} particles swirling around ${creatureName}, volumetric light rays, 16:9 widescreen cinematic shot, ultra detailed, no blurry text. ${prompts.cardPrompt}`,
    `Epic third-person action video game screenshot in Unreal Engine 5 aesthetic, camera plunging forward through a glowing portal into a fantasy arena as ${creatureName} engages another fantastical elemental creature in a dazzling magical clash or cooperative team-up with ${creatureElement} energy beams, dramatic lighting, 16:9 widescreen, cinematic motion blur. ${prompts.adventurePrompt}`,
    `Unreal Engine 5 epic multi-creature climax, ${creatureName} clashing powers or combining a synchronized ${creatureElement} combo wave alongside another mythical fantasy creature across a glowing landscape, volumetric god rays, cinematic 16:9 widescreen masterpiece.`
  ];

  // Generate all 3 HD scenes in parallel for speed
  const imagePaths = await Promise.all(
    scenePrompts.map(async (promptText, idx) => {
      const res = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image',
        contents: promptText,
        config: { responseModalities: ['IMAGE'] }
      });
      const imgPart = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
      if (!imgPart?.inlineData?.data) {
        throw new Error(`Failed to generate scene ${idx + 1} image`);
      }
      const ext = imgPart.inlineData.mimeType?.includes('png') ? 'png' : 'jpg';
      const imgPath = path.join(tempDir, `${creatureId}_scene_${idx}.${ext}`);
      fs.writeFileSync(imgPath, Buffer.from(imgPart.inlineData.data, 'base64'));
      return imgPath;
    })
  );

  console.log(`[AI Video API] All 3 scenes generated! Rendering 10s cinematic MP4 with ffmpeg...`);

  // Animate each scene with smooth Ken Burns zoom/pan and stitch with cinematic transitions
  const clipPaths = [];
  const zoomFilters = [
    // Scene 0 (3.5s): Slow dramatic zoom-in onto holographic card
    `scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,zoompan=z='min(zoom+0.0025,1.25)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=105:s=1280x720:fps=30`,
    // Scene 1 (3.5s): Fast action zoom-in plunge with subtle upward pan
    `scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,zoompan=z='min(zoom+0.0035,1.35)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)-on*0.4':d=105:s=1280x720:fps=30`,
    // Scene 2 (4.0s): Epic zoom-out reveal of elemental climax
    `scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,zoompan=z='max(1.3-on*0.0025,1.0)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=120:s=1280x720:fps=30`
  ];

  for (let i = 0; i < imagePaths.length; i++) {
    const clipPath = path.join(tempDir, `${creatureId}_clip_${i}.mp4`);
    await execAsync(
      `ffmpeg -y -loop 1 -i "${imagePaths[i]}" -vf "${zoomFilters[i]},format=yuv420p" -t ${i === 2 ? '4' : '3.5'} -c:v libx264 -preset fast -crf 20 "${clipPath}"`
    );
    clipPaths.push(clipPath);
  }

  // Stitch clips with smooth crossfade transitions into final 10s MP4
  await execAsync(
    `ffmpeg -y -i "${clipPaths[0]}" -i "${clipPaths[1]}" -i "${clipPaths[2]}" ` +
      `-filter_complex "[0:v][1:v]xfade=transition=zoomin:duration=0.5:offset=3.0[v01];[v01][2:v]xfade=transition=fadewhite:duration=0.5:offset=6.0,format=yuv420p[vout]" ` +
      `-map "[vout]" -c:v libx264 -preset fast -crf 20 -movflags +faststart "${cachedFilePath}"`
  );

  console.log(`[AI Video API] Cinematic MP4 rendered successfully at ${cachedFilePath}`);
  return true;
}

/**
 * Serverless / API Route Handler for Creature Video Generation
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-gemini-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle Cache Query GET request
  if (req.method === 'GET') {
    const creatureId = req.query?.creatureId || new URL(req.url, 'http://localhost').searchParams.get('creatureId');
    if (!creatureId) {
      return res.status(400).json({ error: 'Missing creatureId parameter' });
    }

    const cachedFile = path.join(CACHE_DIR, `${creatureId}.mp4`);
    if (fs.existsSync(cachedFile)) {
      return res.status(200).json({
        cached: true,
        videoUrl: `/creature-videos/${creatureId}.mp4`,
        creatureId
      });
    }
    return res.status(200).json({ cached: false, creatureId });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const body = req.body || {};
    const {
      creatureId = 'creature-' + Date.now(),
      creatureName,
      creatureElement = 'Cosmic Magic',
      creatureDescription = '',
      creatureImageBase64,
      forceRegenerate = false
    } = body;

    // Resolve API key (request body > header > .env.local / env)
    const apiKey =
      body.apiKey ||
      req.headers['x-gemini-api-key'] ||
      loadEnvApiKey();

    if (!creatureName || !creatureImageBase64) {
      return res.status(400).json({
        error: 'Missing required fields: creatureName, creatureImageBase64'
      });
    }

    // 0. Check local disk cache first (unless forceRegenerate is requested)
    const cachedFilePath = path.join(CACHE_DIR, `${creatureId}.mp4`);
    if (!forceRegenerate && fs.existsSync(cachedFilePath)) {
      console.log(`[AI Video API] Found cached video for ${creatureId}`);
      return res.status(200).json({
        success: true,
        cached: true,
        engine: 'Cached AI Video',
        creatureId,
        videoUrl: `/creature-videos/${creatureId}.mp4?t=${Date.now()}`
      });
    }

    if (!apiKey) {
      return res.status(401).json({
        error: 'Missing GEMINI_API_KEY. Please set GEMINI_API_KEY in .env.local or provide it in the AI Key settings.',
        needsKey: true
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const cleanImageBase64 = creatureImageBase64.replace(/^data:image\/\w+;base64,/, '');

    // =========================================================================
    // STAGE 1: Prompt Generation via gemini-3.8-flash
    // =========================================================================
    console.log(`[AI Video API] Stage 1: Generating prompts with gemini-3.8-flash for ${creatureName}...`);

    const encounterMode = Math.random() < 0.5 ? 'epic magical elemental duel / sparring clash' : 'cooperative team-up combo attack side-by-side';

    const promptResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: 'image/png',
                data: cleanImageBase64
              }
            },
            {
              text: `You are a high-end cinematic VFX director for an action fantasy creature game.
Creature Name: "${creatureName}"
Elemental Power: "${creatureElement}"
Lore Description: "${creatureDescription}"
Target Encounter Style: "${encounterMode}"

Other fantastical creatures inhabiting this world include: Chrono-Phoenix (cosmic flame bird), Nebula-Kraken (starlight cephalopod), Astro-Leviathan (supernova dragon), Quantum-Yeti (ice cyber beast), Mecha-Pegasus (jet-winged cyber steed), Storm-Griffin (lightning sky-hunter), Crystal-Golem (giant geode guardian), Lunar-Moth (starlight winged moth), Volt-Fox (electric plasma fox), Aqua-Slime (torrential water slime), Copper-Scarab (clockwork brass beetle), Ember-Sprite (wildfire flame spirit), Breeze-Bunny (aero wind rabbit), and Moss-Turtle (ancient forest stone turtle).

Analyze this collectible card image and output a JSON object containing two specific, vivid visual prompts:

1. "cardPrompt": Focus on an animated 3D holographic foil collectible trading card with iridescent metallic reflections, volumetric shimmering light rays, floating glowing elemental particles, and ${creatureName} dynamically emerging from the frame ready for action.
2. "adventurePrompt": MUST show active multi-creature interaction—NEVER solo exploration or running alone! Describe the camera dramatically plunging through the card into an Unreal Engine 5 3D fantasy arena or landscape where "${creatureName}" engages in an "${encounterMode}" with one of the other distinct fantasy creatures listed above (pick a visually contrasting creature and describe its appearance clearly!). Show dynamic choreography: either clashing dazzling ${creatureElement} energy beams, dodging elemental shockwaves, and trading magical strikes in an exciting fantasy duel, OR fighting side-by-side with an allied creature to combine their two elemental powers into a synchronized combo wave against a towering elemental boss/obstacle. Keep the action colorful, family-friendly fantasy magic (no gore or blood).

Respond ONLY with valid JSON matching:
{
  "cardPrompt": "...",
  "adventurePrompt": "..."
}`
            }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json'
      }
    });

    let prompts = { cardPrompt: '', adventurePrompt: '' };
    try {
      prompts = JSON.parse(promptResponse.text);
    } catch (e) {
      console.warn('[AI Video API] Error parsing JSON prompts, using fallback:', e);
      prompts = {
        cardPrompt: `3D holographic foil collectible card of ${creatureName} with floating sparkling ${creatureElement} particles, metallic sheen, and animated creature movements.`,
        adventurePrompt: `Camera plunges into an Unreal Engine 5 fantasy arena where ${creatureName} clashes dazzling ${creatureElement} beams and teams up in dynamic action choreography with a glowing Crystal-Golem and lightning Storm-Griffin.`
      };
    }

    console.log('[AI Video API] Generated Prompts:', prompts);

    // =========================================================================
    // STAGE 2 & 3: Try Real Veo Video via Vertex AI / Agent Platform (veo-3.1 / veo-2.0)
    // Uses Service Account (gcp-key.json / GOOGLE_APPLICATION_CREDENTIALS) when present.
    // Fall back to Gemini 3.1 AI Cinema only if Veo is unavailable.
    // =========================================================================
    let engineUsed = 'Veo 3.1';
    try {
      const localKeyPath = path.resolve(process.cwd(), 'gcp-key.json');
      let vertexAi;
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS || fs.existsSync(localKeyPath)) {
        if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(localKeyPath)) {
          process.env.GOOGLE_APPLICATION_CREDENTIALS = localKeyPath;
        }
        let projectId = process.env.GOOGLE_CLOUD_PROJECT || '369253971470';
        try {
          const saJson = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf-8'));
          if (saJson.project_id) projectId = saJson.project_id;
        } catch (e) {}
        vertexAi = new GoogleGenAI({
          vertexai: true,
          project: projectId,
          location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'
        });
      } else {
        vertexAi = new GoogleGenAI({ vertexai: true, apiKey });
      }
      const veoModels = ['veo-3.1-fast-generate-001', 'veo-3.1-generate-001', 'veo-2.0-generate-001'];
      let operation1 = null;
      let activeVeoModel = null;
      let lastVeoErr = null;

      for (const candidateModel of veoModels) {
        try {
          console.log(`[AI Video API] Stage 2: Calling ${candidateModel} (Agent Platform / Vertex AI) for 4s card reveal...`);
          operation1 = await vertexAi.models.generateVideos({
            model: candidateModel,
            source: {
              prompt: prompts.cardPrompt,
              image: {
                imageBytes: cleanImageBase64,
                mimeType: 'image/png'
              }
            },
            config: {
              durationSeconds: candidateModel.startsWith('veo-3') ? 4 : 5,
              aspectRatio: '16:9'
            }
          });
          activeVeoModel = candidateModel;
          engineUsed = candidateModel.startsWith('veo-3') ? 'Veo 3.1 (Cinematic AI)' : 'Veo 2 (Cinematic AI)';
          break;
        } catch (mErr) {
          lastVeoErr = mErr;
          console.warn(`[AI Video API] ${candidateModel} failed: ${mErr.message?.slice(0, 140)}`);
          // If Vertex AI API itself is disabled (403), don't loop through all models
          if (mErr.message?.includes('PERMISSION_DENIED') || mErr.message?.includes('SERVICE_DISABLED')) {
            throw mErr;
          }
        }
      }

      if (!operation1 || !activeVeoModel) {
        throw lastVeoErr || new Error('No Veo model available');
      }

      let pollCount = 0;
      while (!operation1.done && pollCount < 45) {
        await new Promise((r) => setTimeout(r, 6000));
        pollCount++;
        operation1 = await vertexAi.operations.getVideosOperation({ operation: operation1 });
        console.log(`[AI Video API] Stage 2 (${activeVeoModel}) poll #${pollCount}: done=${operation1.done}`);
      }

      const cardVideoResult = operation1.response?.generatedVideos?.[0];
      if (!cardVideoResult?.video) {
        throw new Error(`No video returned from ${activeVeoModel}`);
      }

      // Extract bytes (Vertex AI returns videoBytes directly or via files.download)
      let cardBuffer;
      if (cardVideoResult.video.videoBytes) {
        cardBuffer = Buffer.from(cardVideoResult.video.videoBytes, 'base64');
      } else {
        const cardDownload = await vertexAi.files.download({ file: cardVideoResult.video });
        cardBuffer = Buffer.from(await cardDownload.arrayBuffer());
      }

      // Save Stage 2 clip and extract its final frame for seamless Stage 3 continuity
      const tempDir = path.resolve(CACHE_DIR, 'tmp');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      const cardPath = path.join(tempDir, `${creatureId}_card.mp4`);
      const lastFramePath = path.join(tempDir, `${creatureId}_lastframe.jpg`);
      fs.writeFileSync(cardPath, cardBuffer);

      let lastFrameBase64 = cleanImageBase64;
      let lastFrameMime = 'image/png';
      try {
        await execAsync(`ffmpeg -y -sseof -0.1 -i "${cardPath}" -update 1 -q:v 2 "${lastFramePath}"`);
        if (fs.existsSync(lastFramePath)) {
          lastFrameBase64 = fs.readFileSync(lastFramePath).toString('base64');
          lastFrameMime = 'image/jpeg';
        }
      } catch (e) {
        console.warn('[AI Video API] Could not extract last frame, using card image for Stage 3');
      }

      // Stage 3: Extend with 8s 3D Adventure Run (never discard Stage 2 if Stage 3 fails!)
      let stitched = false;
      try {
        console.log(`[AI Video API] Stage 3: Extending video with ${activeVeoModel} for 8s 3D Adventure...`);
        let operation2 = await vertexAi.models.generateVideos({
          model: activeVeoModel,
          source: {
            prompt: prompts.adventurePrompt,
            image: {
              imageBytes: lastFrameBase64,
              mimeType: lastFrameMime
            }
          },
          config: {
            durationSeconds: 8,
            aspectRatio: '16:9'
          }
        });

        let pollCount2 = 0;
        while (!operation2.done && pollCount2 < 50) {
          await new Promise((r) => setTimeout(r, 6000));
          pollCount2++;
          operation2 = await vertexAi.operations.getVideosOperation({ operation: operation2 });
          console.log(`[AI Video API] Stage 3 (${activeVeoModel}) poll #${pollCount2}: done=${operation2.done}`);
        }

        const advVideoResult = operation2.response?.generatedVideos?.[0];
        if (advVideoResult?.video) {
          let advBuffer;
          if (advVideoResult.video.videoBytes) {
            advBuffer = Buffer.from(advVideoResult.video.videoBytes, 'base64');
          } else {
            const advDownload = await vertexAi.files.download({ file: advVideoResult.video });
            advBuffer = Buffer.from(await advDownload.arrayBuffer());
          }

          const advPath = path.join(tempDir, `${creatureId}_adv.mp4`);
          const listPath = path.join(tempDir, `${creatureId}_list.txt`);
          fs.writeFileSync(advPath, advBuffer);
          fs.writeFileSync(listPath, `file '${cardPath}'\nfile '${advPath}'\n`);

          await execAsync(`ffmpeg -y -f concat -safe 0 -i "${listPath}" -c:v libx264 -pix_fmt yuv420p -c:a aac -movflags +faststart "${cachedFilePath}"`);
          stitched = fs.existsSync(cachedFilePath);
        } else {
          console.warn('[AI Video API] Stage 3 returned no video; keeping Stage 2 Veo clip.', operation2.error || operation2.response?.raiMediaFilteredReasons);
        }
      } catch (stage3Err) {
        console.warn('[AI Video API] Stage 3 failed; keeping Stage 2 Veo clip:', stage3Err.message);
      }

      if (!stitched) {
        fs.copyFileSync(cardPath, cachedFilePath);
      }
    } catch (veoErr) {
      console.warn(`[AI Video API] Veo unavailable (${veoErr.message?.slice(0, 160)}). Switching to Gemini 3.1 AI Cinema...`);
      engineUsed = 'Gemini 3.1 AI Cinema (Stills)';
      await generateGeminiCinemaVideo(ai, {
        creatureId,
        creatureName,
        creatureElement,
        prompts,
        cachedFilePath
      });
    }

    return res.status(200).json({
      success: true,
      cached: false,
      engine: engineUsed,
      creatureId,
      videoUrl: `/creature-videos/${creatureId}.mp4?t=${Date.now()}`,
      prompts,
      hasAdventureExtension: true
    });
  } catch (error) {
    console.error('[AI Video API] Fatal error in generate-creature-video:', error);
    return res.status(500).json({
      error: error.message || 'Video generation failed',
      details: error.stack
    });
  }
}
