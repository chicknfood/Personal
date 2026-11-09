/**
 * Generates an animated cinematic 3D Adventure video Blob directly in the browser
 * using Canvas 2D + MediaRecorder.
 * Used for offline mode, zero-config demos, or instant fallback previews.
 */
export async function generateSimulatedCreatureVideo(creature, { onProgress = () => {} } = {}) {
  const width = 854;
  const height = 480;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Canvas 2D context unavailable');

  // Choose supported mimeType
  const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')
    ? 'video/mp4;codecs=avc1'
    : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm';

  const stream = canvas.captureStream(24);
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2500000 });
  const chunks = [];

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const totalFrames = 24 * 6; // 6 seconds total (0-3s card reveal, 3-6s 3D adventure plunge)
  let currentFrame = 0;

  recorder.start();

  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType.split(';')[0] });
      resolve({
        videoBlob: blob,
        videoUrl: URL.createObjectURL(blob),
        prompts: {
          cardPrompt: `3D holographic foil collectible card of ${creature.name} (${creature.element}) with metallic iridescent reflection, particle shaders, and floating elemental aura.`,
          adventurePrompt: `Camera plunges through ${creature.name}'s card portal into a third-person 3D action run in Unreal Engine 5 aesthetic with high-speed volumetric lighting and elemental explosions.`
        }
      });
    };
    recorder.onerror = reject;

    function renderFrame() {
      const t = currentFrame / 30; // seconds
      const progress = currentFrame / totalFrames;
      onProgress(progress);

      ctx.clearRect(0, 0, width, height);

      if (t < 3.0) {
        // --- PHASE 1: 3D HOLOGRAPHIC FOIL CARD (0s - 3s) ---
        // Deep cosmic background
        const bg = ctx.createRadialGradient(width / 2, height / 2, 40, width / 2, height / 2, width);
        bg.addColorStop(0, '#1e1b4b');
        bg.addColorStop(1, '#020617');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        // Floating glowing particles
        for (let i = 0; i < 35; i++) {
          const px = (Math.sin(i * 12 + t * 2) * 0.4 + 0.5) * width;
          const py = ((i * 37 + t * 45) % height);
          ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + Math.sin(t * 5 + i) * 0.3})`;
          ctx.beginPath();
          ctx.arc(px, py, 2 + (i % 3), 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw 3D Tilting Card
        ctx.save();
        ctx.translate(width / 2, height / 2);
        const cardAngle = Math.sin(t * 2.5) * 0.08;
        const cardTilt = Math.cos(t * 2) * 0.05;
        ctx.rotate(cardAngle);
        ctx.scale(1 + Math.sin(t * 3) * 0.02, 1);

        // Card Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        roundRect(ctx, -140 + 10, -200 + 15, 280, 400, 24);
        ctx.fill();

        // Card Base
        const cardGrad = ctx.createLinearGradient(-140, -200, 140, 200);
        cardGrad.addColorStop(0, '#0f172a');
        cardGrad.addColorStop(1, '#1e1b4b');
        ctx.fillStyle = cardGrad;
        roundRect(ctx, -140, -200, 280, 400, 24);
        ctx.fill();

        // Holographic sheen sweep
        const sweepX = -200 + ((t * 200) % 500);
        const sheen = ctx.createLinearGradient(sweepX, -200, sweepX + 100, 200);
        sheen.addColorStop(0, 'rgba(255, 0, 128, 0)');
        sheen.addColorStop(0.3, 'rgba(0, 255, 200, 0.4)');
        sheen.addColorStop(0.5, 'rgba(255, 255, 255, 0.7)');
        sheen.addColorStop(0.7, 'rgba(180, 0, 255, 0.4)');
        sheen.addColorStop(1, 'rgba(255, 0, 128, 0)');

        ctx.strokeStyle = sheen;
        ctx.lineWidth = 10;
        roundRect(ctx, -140, -200, 280, 400, 24);
        ctx.stroke();

        // Creature Aura
        const aura = ctx.createRadialGradient(0, -30, 20, 0, -30, 120);
        aura.addColorStop(0, 'rgba(244, 63, 94, 0.6)');
        aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(0, -30, 120, 0, Math.PI * 2);
        ctx.fill();

        // Creature Emoji
        ctx.font = '100px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(creature.emoji, 0, -30);

        // Card Texts
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px system-ui, sans-serif';
        ctx.fillText(creature.name, 0, 75);

        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`⚡ ${creature.element || 'MYTHIC'}`, 0, 105);

        ctx.fillStyle = '#fb7185';
        ctx.font = '800 13px system-ui, sans-serif';
        ctx.fillText(`◆ 3D COLLECTIBLE CARD ◆`, 0, 135);

        ctx.restore();

        // Floating Title Banner
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = '900 24px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`✨ 3D HOLOGRAPHIC REVEAL: ${creature.name.toUpperCase()} ✨`, width / 2, 45);

      } else {
        // --- PHASE 2: 3D ADVENTURE ACTION RUN (3s - 6s) ---
        const advTime = t - 3.0;
        const speed = advTime * 12;

        // Unreal 5 Cyber/Fantasy Grid Floor
        ctx.fillStyle = '#050510';
        ctx.fillRect(0, 0, width, height);

        // Perspective speed grid
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)';
        ctx.lineWidth = 1.5;
        const horizonY = height * 0.45;

        // Radial speed lines into distance
        for (let angle = 0; angle < Math.PI; angle += Math.PI / 12) {
          const startX = width / 2 + Math.cos(angle) * 40;
          const startY = horizonY + Math.sin(angle) * 20;
          const endX = width / 2 + Math.cos(angle) * width;
          const endY = horizonY + Math.sin(angle) * height;
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }

        // Horizontal moving grid lines
        for (let i = 1; i <= 10; i++) {
          const dist = ((i * 35 + speed * 40) % 250);
          const y = horizonY + (dist * dist) / 250;
          if (y < height) {
            ctx.strokeStyle = `rgba(56, 189, 248, ${Math.min(1, dist / 180)})`;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
          }
        }

        // Volumetric Skyline / Mountains
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(0, horizonY);
        for (let x = 0; x <= width; x += 60) {
          const my = horizonY - 40 - Math.sin(x * 0.02 + 1) * 30;
          ctx.lineTo(x, my);
        }
        ctx.lineTo(width, horizonY);
        ctx.closePath();
        ctx.fill();

        // 3D Creature in Third-Person Sprint
        ctx.save();
        const creatureBob = Math.abs(Math.sin(advTime * 8)) * 25;
        const creatureScale = 1.0 + Math.sin(advTime * 2) * 0.1;
        const creatureY = height * 0.75 - creatureBob;
        ctx.translate(width / 2, creatureY);
        ctx.scale(creatureScale, creatureScale);

        // Elemental energy shockwave trail behind creature
        for (let j = 0; j < 6; j++) {
          const trailY = 40 + j * 18;
          const trailAlpha = 0.5 - j * 0.08;
          ctx.fillStyle = `rgba(244, 63, 94, ${trailAlpha})`;
          ctx.beginPath();
          ctx.ellipse(0, trailY, 60 - j * 8, 12, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // Creature Sprint Emoji
        ctx.font = '120px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(creature.emoji, 0, 0);

        ctx.restore();

        // Third-person HUD overlay
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 18px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`⚔️ 3D UNREAL ENGINE ADVENTURE RUN`, 30, 45);

        ctx.fillStyle = '#f43f5e';
        ctx.font = 'bold 15px system-ui, sans-serif';
        ctx.fillText(`POWER: ${creature.element.toUpperCase()}`, 30, 72);

        ctx.textAlign = 'right';
        ctx.fillStyle = '#10b981';
        ctx.fillText(`SPEED: ${(450 + Math.floor(advTime * 65))} KM/H`, width - 30, 45);
      }

      currentFrame++;
      if (currentFrame < totalFrames) {
        setTimeout(renderFrame, 16);
      } else {
        recorder.stop();
      }
    }

    renderFrame();

    // Safety timeout: ensure recorder stops even if frame scheduling is throttled
    setTimeout(() => {
      if (recorder.state === 'recording') {
        recorder.stop();
      }
    }, 6000);
  });
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
