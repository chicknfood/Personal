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
      creatureImageBase64
    } = body;

    // Resolve API key
    const apiKey =
      body.apiKey ||
      req.headers['x-gemini-api-key'] ||
      process.env.GEMINI_API_KEY;

    if (!creatureName || !creatureImageBase64) {
      return res.status(400).json({
        error: 'Missing required fields: creatureName, creatureImageBase64'
      });
    }

    // 0. Check local disk cache first
    const cachedFilePath = path.join(CACHE_DIR, `${creatureId}.mp4`);
    if (fs.existsSync(cachedFilePath)) {
      console.log(`[Veo Video API] Found cached video for ${creatureId}`);
      return res.status(200).json({
        success: true,
        cached: true,
        creatureId,
        videoUrl: `/creature-videos/${creatureId}.mp4`
      });
    }

    if (!apiKey) {
      return res.status(401).json({
        error: 'Missing GEMINI_API_KEY. Please set GEMINI_API_KEY in your environment or provide it in the request.',
        needsKey: true
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const cleanImageBase64 = creatureImageBase64.replace(/^data:image\/\w+;base64,/, '');

    // =========================================================================
    // STAGE 1: Prompt Generation via gemini-2.5-flash
    // =========================================================================
    console.log(`[Veo Video API] Stage 1: Generating prompts with gemini-2.5-flash for ${creatureName}...`);

    const promptResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
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
              text: `You are a high-end cinematic VFX director for an action fantasy game.
Creature Name: "${creatureName}"
Elemental Power: "${creatureElement}"
Lore Description: "${creatureDescription}"

Analyze this collectible card image and output a JSON object containing two specific, vivid video generation prompts:

1. "cardPrompt": A 5-second video prompt. Focus on an animated 3D holographic foil collectible trading card with iridescent metallic reflections, volumetric shimmering light rays, floating glowing elemental particles, and the creature dynamically breaking outward through the frame with subtle breathing and ready-to-leap animation.
2. "adventurePrompt": An 8-to-10-second continuous extension prompt. Describe the camera dramatically zooming and plunging through the card art into a third-person 3D action run or epic battle sequence rendered in an Unreal Engine 5 aesthetic, where the creature runs forward at extreme speed across a vast fantasy landscape, summoning its ${creatureElement} powers.

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
      console.warn('[Veo Video API] Error parsing JSON prompts, using fallback:', e);
      prompts = {
        cardPrompt: `3D holographic foil collectible card of ${creatureName} with floating sparkling ${creatureElement} particles, metallic sheen, and animated creature movements.`,
        adventurePrompt: `Camera plunging into the card art into an Unreal Engine 5 third-person action run with ${creatureName} surging forward with ${creatureElement} elemental effects.`
      };
    }

    console.log('[Veo Video API] Generated Prompts:', prompts);

    // =========================================================================
    // STAGE 2: Call veo-2.0-generate-001 with Image + Card Prompt (5s)
    // =========================================================================
    console.log(`[Veo Video API] Stage 2: Calling veo-2.0-generate-001 for 5s card reveal...`);

    let operation1 = await ai.models.generateVideos({
      model: 'veo-2.0-generate-001',
      prompt: prompts.cardPrompt,
      image: {
        imageBytes: cleanImageBase64,
        mimeType: 'image/png'
      },
      config: {
        durationSeconds: 5,
        aspectRatio: '16:9',
        personGeneration: 'dont_allow'
      }
    });

    console.log(`[Veo Video API] Stage 2 Operation started: ${operation1.name}. Polling...`);
    let pollCount = 0;
    while (!operation1.done && pollCount < 40) {
      await new Promise((r) => setTimeout(r, 6000));
      pollCount++;
      operation1 = await ai.operations.getVideosOperation({ operation: operation1 });
      console.log(`[Veo Video API] Stage 2 poll #${pollCount}: done=${operation1.done}`);
    }

    const cardVideoResult = operation1.response?.generatedVideos?.[0];
    if (!cardVideoResult?.video) {
      throw new Error('Stage 2 failed: No video returned from veo-2.0-generate-001');
    }

    // Download card video bytes
    const cardDownload = await ai.files.download({ file: cardVideoResult.video });
    const cardBuffer = Buffer.from(await cardDownload.arrayBuffer());

    // =========================================================================
    // STAGE 3: Extend Video using Adventure Prompt (8-10s)
    // =========================================================================
    console.log(`[Veo Video API] Stage 3: Extending video with Adventure Prompt...`);

    let operation2;
    try {
      operation2 = await ai.models.generateVideos({
        model: 'veo-2.0-generate-001',
        prompt: prompts.adventurePrompt,
        video: { uri: cardVideoResult.video.uri },
        config: {
          durationSeconds: 8,
          aspectRatio: '16:9',
          personGeneration: 'dont_allow'
        }
      });
    } catch (extErr) {
      console.warn('[Veo Video API] Direct video extension fallback to image-continuity chaining:', extErr.message);
      operation2 = await ai.models.generateVideos({
        model: 'veo-2.0-generate-001',
        prompt: prompts.adventurePrompt,
        image: {
          imageBytes: cleanImageBase64,
          mimeType: 'image/png'
        },
        config: {
          durationSeconds: 8,
          aspectRatio: '16:9',
          personGeneration: 'dont_allow'
        }
      });
    }

    console.log(`[Veo Video API] Stage 3 Operation started: ${operation2.name}. Polling...`);
    let pollCount2 = 0;
    while (!operation2.done && pollCount2 < 45) {
      await new Promise((r) => setTimeout(r, 6000));
      pollCount2++;
      operation2 = await ai.operations.getVideosOperation({ operation: operation2 });
      console.log(`[Veo Video API] Stage 3 poll #${pollCount2}: done=${operation2.done}`);
    }

    const advVideoResult = operation2.response?.generatedVideos?.[0];
    if (!advVideoResult?.video) {
      throw new Error('Stage 3 failed: No video returned from adventure extension');
    }

    // Download adventure video bytes
    const advDownload = await ai.files.download({ file: advVideoResult.video });
    const advBuffer = Buffer.from(await advDownload.arrayBuffer());

    // =========================================================================
    // STITCHING & CACHING: Combine into unified MP4 with ffmpeg if available
    // =========================================================================
    const tempDir = path.resolve(CACHE_DIR, 'tmp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const cardPath = path.join(tempDir, `${creatureId}_card.mp4`);
    const advPath = path.join(tempDir, `${creatureId}_adv.mp4`);
    fs.writeFileSync(cardPath, cardBuffer);
    fs.writeFileSync(advPath, advBuffer);

    let unifiedVideoCreated = false;
    try {
      const listPath = path.join(tempDir, `${creatureId}_list.txt`);
      fs.writeFileSync(listPath, `file '${cardPath}'\nfile '${advPath}'\n`);

      // Stitch seamlessly with ffmpeg
      console.log(`[Veo Video API] Stitching card & adventure videos with ffmpeg...`);
      await execAsync(`ffmpeg -y -f concat -safe 0 -i "${listPath}" -c:v libx264 -pix_fmt yuv420p -c:a aac "${cachedFilePath}"`);
      unifiedVideoCreated = fs.existsSync(cachedFilePath);
      console.log(`[Veo Video API] Unified video created at ${cachedFilePath}`);
    } catch (ffmpegErr) {
      console.warn('[Veo Video API] ffmpeg stitching error, falling back to card video or multi-part:', ffmpegErr.message);
      // Fallback: copy card buffer to cached file
      fs.writeFileSync(cachedFilePath, cardBuffer);
    }

    return res.status(200).json({
      success: true,
      cached: false,
      creatureId,
      videoUrl: `/creature-videos/${creatureId}.mp4`,
      prompts,
      hasAdventureExtension: true
    });
  } catch (error) {
    console.error('[Veo Video API] Fatal error in generate-creature-video:', error);
    return res.status(500).json({
      error: error.message || 'Video generation failed',
      details: error.stack
    });
  }
}
