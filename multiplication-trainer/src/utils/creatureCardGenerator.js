/**
 * Generates a clean high-resolution crop of the creature collectible card asset
 * using an off-screen HTML5 Canvas.
 * Returns a base64 encoded PNG string.
 */
export async function generateCreatureCardAsset(creature) {
  const width = 768;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  // 1. Base card background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  if (creature.rarity === 'Mythic') {
    bgGrad.addColorStop(0, '#3b0764');
    bgGrad.addColorStop(0.5, '#1e1b4b');
    bgGrad.addColorStop(1, '#09090b');
  } else if (creature.rarity === 'Legendary') {
    bgGrad.addColorStop(0, '#581c87');
    bgGrad.addColorStop(0.5, '#311042');
    bgGrad.addColorStop(1, '#0f172a');
  } else if (creature.rarity === 'Rare') {
    bgGrad.addColorStop(0, '#0c4a6e');
    bgGrad.addColorStop(0.5, '#1e293b');
    bgGrad.addColorStop(1, '#020617');
  } else if (creature.rarity === 'Uncommon') {
    bgGrad.addColorStop(0, '#7c2d12');
    bgGrad.addColorStop(0.5, '#292524');
    bgGrad.addColorStop(1, '#0c0a09');
  } else if (creature.rarity === 'Apprentice') {
    bgGrad.addColorStop(0, '#3b0764');
    bgGrad.addColorStop(0.5, '#1e1b4b');
    bgGrad.addColorStop(1, '#0f172a');
  } else if (creature.rarity === 'Novice') {
    bgGrad.addColorStop(0, '#14532d');
    bgGrad.addColorStop(0.5, '#0f172a');
    bgGrad.addColorStop(1, '#020617');
  } else {
    bgGrad.addColorStop(0, '#064e3b');
    bgGrad.addColorStop(0.5, '#1c1917');
    bgGrad.addColorStop(1, '#09090b');
  }

  ctx.fillStyle = bgGrad;
  roundRect(ctx, 20, 20, width - 40, height - 40, 40);
  ctx.fill();

  // 2. Holographic foil border with rainbow sheen
  const foilGrad = ctx.createLinearGradient(0, 0, width, height);
  foilGrad.addColorStop(0.0, '#ff007f');
  foilGrad.addColorStop(0.2, '#ffae00');
  foilGrad.addColorStop(0.4, '#00ffc8');
  foilGrad.addColorStop(0.6, '#0084ff');
  foilGrad.addColorStop(0.8, '#b700ff');
  foilGrad.addColorStop(1.0, '#ff007f');

  ctx.lineWidth = 14;
  ctx.strokeStyle = foilGrad;
  roundRect(ctx, 20, 20, width - 40, height - 40, 40);
  ctx.stroke();

  // Inner subtle border
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  roundRect(ctx, 35, 35, width - 70, height - 70, 30);
  ctx.stroke();

  // 3. Central elemental aura glow
  const cx = width / 2;
  const cy = height * 0.42;
  const auraGrad = ctx.createRadialGradient(cx, cy, 30, cx, cy, 320);
  if (creature.rarity === 'Mythic') {
    auraGrad.addColorStop(0, 'rgba(244, 63, 94, 0.55)');
    auraGrad.addColorStop(0.5, 'rgba(234, 88, 12, 0.25)');
    auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  } else if (creature.rarity === 'Legendary') {
    auraGrad.addColorStop(0, 'rgba(192, 38, 211, 0.55)');
    auraGrad.addColorStop(0.5, 'rgba(99, 102, 241, 0.25)');
    auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  } else {
    auraGrad.addColorStop(0, 'rgba(56, 189, 248, 0.55)');
    auraGrad.addColorStop(0.5, 'rgba(45, 212, 191, 0.25)');
    auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  }
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 320, 0, Math.PI * 2);
  ctx.fill();

  // Floating geometric / starlight particles
  for (let i = 0; i < 40; i++) {
    const px = 60 + Math.random() * (width - 120);
    const py = 60 + Math.random() * (height - 120);
    const radius = 2 + Math.random() * 4;
    ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.random() * 0.6})`;
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Creature emoji asset in center
  ctx.save();
  ctx.font = '240px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 15;
  ctx.fillText(creature.emoji, cx, cy);
  ctx.restore();

  // 5. Header: Rarity & Level
  ctx.textAlign = 'center';
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.letterSpacing = '4px';
  ctx.fillText(`★ COLLECTIBLE BESTIARY #${creature.id.toUpperCase()} ★`, cx, 80);

  // 6. Name Banner
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 48px system-ui, sans-serif';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 4;
  ctx.fillText(creature.name, cx, height * 0.70);

  // 7. Element & Rarity Badges
  ctx.shadowBlur = 0;
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText(`⚡ ELEMENT: ${creature.element ? creature.element.toUpperCase() : 'COSMIC'}`, cx, height * 0.76);

  ctx.font = '800 22px system-ui, sans-serif';
  ctx.fillStyle =
    creature.rarity === 'Mythic' ? '#fb7185' :
    creature.rarity === 'Legendary' ? '#e879f9' :
    creature.rarity === 'Rare' ? '#60a5fa' :
    creature.rarity === 'Uncommon' ? '#fb923c' :
    creature.rarity === 'Apprentice' ? '#a78bfa' :
    creature.rarity === 'Novice' ? '#a3e635' :
    creature.rarity === 'Basic' ? '#94a3b8' : '#34d399';
  ctx.fillText(`◆ ${creature.rarity.toUpperCase()} GRADE TIER ◆`, cx, height * 0.81);

  // 8. Description box at bottom
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  roundRect(ctx, 60, height * 0.85, width - 120, 95, 20);
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  roundRect(ctx, 60, height * 0.85, width - 120, 95, 20);
  ctx.stroke();

  ctx.font = '500 20px system-ui, sans-serif';
  ctx.fillStyle = '#e2e8f0';
  wrapText(ctx, creature.description, cx, height * 0.89, width - 160, 26);

  return canvas.toDataURL('image/png');
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

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let lineY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, lineY);
      line = words[n] + ' ';
      lineY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, lineY);
}
