import { COLORS, drawRect } from './utils.js';

// All sprites are drawn programmatically as pixel art on canvas

// Draw a person sprite (8x16 base size)
export function drawPerson(ctx, x, y, options = {}) {
    const {
        hairColor = COLORS.brown,
        shirtColor = COLORS.blue,
        pantsColor = COLORS.dark,
        skinColor = COLORS.skin,
        isGirl = false,
        scale = 2,
        frame = 0, // 0 or 1 for walk animation
    } = options;

    const s = scale;
    const px = Math.floor(x);
    const py = Math.floor(y);

    // Hair
    if (isGirl) {
        // Longer hair for Hannah
        drawRect(ctx, px + 1*s, py - 1*s, 6*s, 3*s, hairColor);
        drawRect(ctx, px + 0*s, py + 2*s, 2*s, 5*s, hairColor); // left hair
        drawRect(ctx, px + 6*s, py + 2*s, 2*s, 5*s, hairColor); // right hair
    } else {
        // Short hair for Justin
        drawRect(ctx, px + 1*s, py, 6*s, 2*s, hairColor);
    }

    // Head
    drawRect(ctx, px + 2*s, py + 1*s, 4*s, 4*s, skinColor);

    // Eyes
    drawRect(ctx, px + 3*s, py + 2*s, 1*s, 1*s, COLORS.dark);
    drawRect(ctx, px + 5*s, py + 2*s, 1*s, 1*s, COLORS.dark);

    // Smile
    drawRect(ctx, px + 3*s, py + 4*s, 2*s, 1*s, COLORS.darkPink);

    // Body / Shirt
    if (isGirl) {
        // Dress-like top
        drawRect(ctx, px + 1*s, py + 5*s, 6*s, 4*s, shirtColor);
        drawRect(ctx, px + 0*s, py + 8*s, 8*s, 2*s, shirtColor); // flared
    } else {
        drawRect(ctx, px + 1*s, py + 5*s, 6*s, 5*s, shirtColor);
    }

    // Arms
    const armOffset = frame % 2 === 0 ? 0 : 1*s;
    drawRect(ctx, px - 1*s, py + 5*s + armOffset, 2*s, 4*s, skinColor);
    drawRect(ctx, px + 7*s, py + 5*s - armOffset, 2*s, 4*s, skinColor);

    // Pants / Legs
    if (!isGirl) {
        const legSpread = frame % 2 === 0 ? 0 : 1*s;
        drawRect(ctx, px + 1*s - legSpread, py + 10*s, 3*s, 4*s, pantsColor);
        drawRect(ctx, px + 4*s + legSpread, py + 10*s, 3*s, 4*s, pantsColor);
    } else {
        drawRect(ctx, px + 2*s, py + 10*s, 2*s, 3*s, skinColor);
        drawRect(ctx, px + 5*s, py + 10*s, 2*s, 3*s, skinColor);
    }

    // Shoes
    if (isGirl) {
        drawRect(ctx, px + 2*s, py + 13*s, 2*s, 1*s, COLORS.darkPink);
        drawRect(ctx, px + 5*s, py + 13*s, 2*s, 1*s, COLORS.darkPink);
    } else {
        drawRect(ctx, px + 1*s, py + 14*s, 3*s, 1*s, COLORS.darkGray);
        drawRect(ctx, px + 4*s, py + 14*s, 3*s, 1*s, COLORS.darkGray);
    }
}

export function drawHannah(ctx, x, y, frame = 0, scale = 2, wedding = false) {
    drawPerson(ctx, x, y, {
        hairColor: '#2a1a0e',
        shirtColor: wedding ? '#f5f0f0' : COLORS.pink,
        isGirl: true,
        scale,
        frame,
    });
}

export function drawJustin(ctx, x, y, frame = 0, scale = 2, wedding = false) {
    drawPerson(ctx, x, y, {
        hairColor: COLORS.brown,
        shirtColor: wedding ? '#1a1a2e' : COLORS.blue,
        pantsColor: wedding ? '#1a1a2e' : '#2a2a3e',
        isGirl: false,
        scale,
        frame,
    });
}

// Box sprite (for moving level)
export function drawBox(ctx, x, y, size = 16, label = '') {
    const px = Math.floor(x);
    const py = Math.floor(y);
    drawRect(ctx, px, py, size, size, COLORS.lightBrown);
    drawRect(ctx, px + 1, py + 1, size - 2, size - 2, COLORS.brown);
    // Tape
    drawRect(ctx, px + size/2 - 2, py, 4, size, COLORS.orange);
    drawRect(ctx, px, py + size/2 - 2, size, 4, COLORS.orange);
    if (label) {
        ctx.fillStyle = COLORS.white;
        ctx.font = '4px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(label, px + size/2, py + size/2 + 1);
    }
}

// Moving truck
export function drawTruck(ctx, x, y) {
    const px = Math.floor(x);
    const py = Math.floor(y);
    // Cargo area
    drawRect(ctx, px, py, 60, 40, COLORS.lightGray);
    drawRect(ctx, px + 2, py + 2, 56, 36, COLORS.gray);
    // Cab
    drawRect(ctx, px + 60, py + 10, 25, 30, COLORS.blue);
    drawRect(ctx, px + 65, py + 15, 15, 12, '#87ceeb'); // window
    // Wheels
    drawRect(ctx, px + 10, py + 38, 12, 8, COLORS.darkGray);
    drawRect(ctx, px + 38, py + 38, 12, 8, COLORS.darkGray);
    drawRect(ctx, px + 68, py + 38, 12, 8, COLORS.darkGray);
    // Text on truck
    ctx.fillStyle = COLORS.dark;
    ctx.font = '5px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MOVE', px + 30, py + 22);
}

// Heart
export function drawHeart(ctx, x, y, size = 8, color = COLORS.pink) {
    const s = size / 8;
    const px = Math.floor(x);
    const py = Math.floor(y);
    ctx.fillStyle = color;
    // Pixel heart shape
    ctx.fillRect(px + 1*s, py, 2*s, 1*s);
    ctx.fillRect(px + 5*s, py, 2*s, 1*s);
    ctx.fillRect(px, py + 1*s, 8*s, 1*s);
    ctx.fillRect(px, py + 2*s, 8*s, 1*s);
    ctx.fillRect(px + 1*s, py + 3*s, 6*s, 1*s);
    ctx.fillRect(px + 2*s, py + 4*s, 4*s, 1*s);
    ctx.fillRect(px + 3*s, py + 5*s, 2*s, 1*s);
}

// Music note
export function drawMusicNote(ctx, x, y, size = 8, color = COLORS.gold) {
    const s = size / 8;
    const px = Math.floor(x);
    const py = Math.floor(y);
    ctx.fillStyle = color;
    // Note head
    ctx.fillRect(px, py + 5*s, 3*s, 2*s);
    // Stem
    ctx.fillRect(px + 2*s, py, 1*s, 6*s);
    // Flag
    ctx.fillRect(px + 3*s, py, 2*s, 1*s);
    ctx.fillRect(px + 3*s, py + 1*s, 1*s, 1*s);
}

// Star
export function drawStar(ctx, x, y, size = 8, color = COLORS.gold) {
    const s = size / 8;
    const px = Math.floor(x);
    const py = Math.floor(y);
    ctx.fillStyle = color;
    ctx.fillRect(px + 3*s, py, 2*s, 1*s);
    ctx.fillRect(px + 2*s, py + 1*s, 4*s, 1*s);
    ctx.fillRect(px, py + 2*s, 8*s, 1*s);
    ctx.fillRect(px + 1*s, py + 3*s, 6*s, 1*s);
    ctx.fillRect(px + 2*s, py + 4*s, 4*s, 1*s);
    ctx.fillRect(px + 1*s, py + 5*s, 2*s, 1*s);
    ctx.fillRect(px + 5*s, py + 5*s, 2*s, 1*s);
}

// Building (generic)
export function drawBuilding(ctx, x, y, w, h, color, windowColor = '#ffee88') {
    const px = Math.floor(x);
    const py = Math.floor(y);
    drawRect(ctx, px, py, w, h, color);
    // Windows
    for (let wy = py + 6; wy < py + h - 8; wy += 12) {
        for (let wx = px + 4; wx < px + w - 6; wx += 10) {
            drawRect(ctx, wx, wy, 6, 6, windowColor);
        }
    }
    // Door
    drawRect(ctx, px + w/2 - 5, py + h - 14, 10, 14, COLORS.brown);
}

// Car (side view pixel art - Porsche-ish)
export function drawCar(ctx, x, y, color = '#c0c0c0') {
    const px = Math.floor(x);
    const py = Math.floor(y);
    // Body
    drawRect(ctx, px + 4, py + 4, 24, 8, color);
    drawRect(ctx, px + 8, py, 14, 6, color);
    // Windows
    drawRect(ctx, px + 10, py + 1, 5, 4, '#87ceeb');
    drawRect(ctx, px + 17, py + 1, 4, 4, '#87ceeb');
    // Wheels
    drawRect(ctx, px + 6, py + 11, 6, 4, COLORS.darkGray);
    drawRect(ctx, px + 20, py + 11, 6, 4, COLORS.darkGray);
    // Headlight
    drawRect(ctx, px + 27, py + 5, 2, 3, COLORS.gold);
    // Taillight
    drawRect(ctx, px + 3, py + 5, 2, 3, COLORS.red);
}

// Ring
export function drawRing(ctx, x, y, size = 10) {
    const s = size / 10;
    const px = Math.floor(x);
    const py = Math.floor(y);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(px + 2*s, py, 6*s, 2*s);
    ctx.fillRect(px, py + 2*s, 2*s, 6*s);
    ctx.fillRect(px + 8*s, py + 2*s, 2*s, 6*s);
    ctx.fillRect(px + 2*s, py + 8*s, 6*s, 2*s);
    // Diamond
    ctx.fillStyle = '#aaeeff';
    ctx.fillRect(px + 3*s, py - 2*s, 4*s, 3*s);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(px + 4*s, py - 1*s, 2*s, 1*s);
}

// Confetti piece
export function drawConfetti(ctx, x, y, color, size = 3, rotation = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.fillStyle = color;
    ctx.fillRect(-size/2, -size/2, size, size * 0.5);
    ctx.restore();
}
