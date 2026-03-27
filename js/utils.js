// Game constants
export const WIDTH = 320;
export const HEIGHT = 240;
export const SCALE = 1;

// Colors
export const COLORS = {
    bg: '#0f0f23',
    gold: '#e6c86e',
    pink: '#e88ca5',
    darkPink: '#c4657e',
    white: '#f0e6d3',
    dark: '#1a1a2e',
    green: '#7ec88e',
    blue: '#6eb5e6',
    red: '#e66e6e',
    darkRed: '#a04040',
    brown: '#8b6941',
    lightBrown: '#c49a6c',
    gray: '#888899',
    darkGray: '#444455',
    lightGray: '#aaaabb',
    purple: '#9b6ec8',
    orange: '#e6a86e',
    skin: '#f5d0a9',
    skinDark: '#d4a574',
};

// Input state
export const input = {
    keys: {},
    mouse: { x: 0, y: 0, down: false, clicked: false },
    touch: { active: false, x: 0, y: 0 },
};

export function initInput(canvas) {
    window.addEventListener('keydown', e => {
        input.keys[e.key] = true;
        input.keys[e.code] = true;
        // Prevent arrow keys from scrolling the page
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
            e.preventDefault();
        }
    });
    window.addEventListener('keyup', e => {
        input.keys[e.key] = false;
        input.keys[e.code] = false;
    });

    function getCanvasPos(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (clientX - rect.left) / rect.width * WIDTH,
            y: (clientY - rect.top) / rect.height * HEIGHT,
        };
    }

    canvas.addEventListener('mousemove', e => {
        const pos = getCanvasPos(e.clientX, e.clientY);
        input.mouse.x = pos.x;
        input.mouse.y = pos.y;
    });
    canvas.addEventListener('mousedown', e => {
        input.mouse.down = true;
        input.mouse.clicked = true;
        const pos = getCanvasPos(e.clientX, e.clientY);
        input.mouse.x = pos.x;
        input.mouse.y = pos.y;
    });
    // Listen on window so mouseup is caught even when overlay is on top
    window.addEventListener('mouseup', () => { input.mouse.down = false; });

    canvas.addEventListener('touchstart', e => {
        e.preventDefault();
        const t = e.touches[0];
        const pos = getCanvasPos(t.clientX, t.clientY);
        input.touch.active = true;
        input.touch.x = pos.x;
        input.touch.y = pos.y;
        input.mouse.down = true;
        input.mouse.clicked = true;
        input.mouse.x = pos.x;
        input.mouse.y = pos.y;
    }, { passive: false });
    canvas.addEventListener('touchmove', e => {
        e.preventDefault();
        const t = e.touches[0];
        const pos = getCanvasPos(t.clientX, t.clientY);
        input.touch.x = pos.x;
        input.touch.y = pos.y;
        input.mouse.x = pos.x;
        input.mouse.y = pos.y;
    }, { passive: false });
    canvas.addEventListener('touchend', e => {
        e.preventDefault();
        input.touch.active = false;
        input.mouse.down = false;
    }, { passive: false });
}

export function clearInput() {
    input.mouse.clicked = false;
}

// Drawing helpers
export function drawRect(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(x), Math.floor(y), w, h);
}

export function drawText(ctx, text, x, y, color = COLORS.white, size = 8, align = 'center') {
    ctx.fillStyle = color;
    ctx.font = `${size}px "Press Start 2P", monospace`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, Math.floor(x), Math.floor(y));
}

export function drawTextWrapped(ctx, text, x, y, maxWidth, color = COLORS.white, size = 8, lineHeight = 20) {
    ctx.fillStyle = color;
    ctx.font = `${size}px "Press Start 2P", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (const word of words) {
        const testLine = line ? line + ' ' + word : word;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && line) {
            ctx.fillText(line, x, currentY);
            line = word;
            currentY += lineHeight;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line, x, currentY);
    return currentY + lineHeight;
}

// Collision detection
export function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
}

export function pointInRect(px, py, rect) {
    return px >= rect.x && px <= rect.x + rect.w &&
           py >= rect.y && py <= rect.y + rect.h;
}

// Utility
export function lerp(a, b, t) {
    return a + (b - a) * t;
}

export function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

export function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randFloat(min, max) {
    return Math.random() * (max - min) + min;
}

// Simple particle system
export class Particle {
    constructor(x, y, vx, vy, color, life = 60, size = 2) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.life = life;
        this.maxLife = life;
        this.size = size;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.05; // gravity
        this.life--;
    }

    draw(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.globalAlpha = alpha;
        drawRect(ctx, this.x, this.y, this.size, this.size, this.color);
        ctx.globalAlpha = 1;
    }

    get dead() { return this.life <= 0; }
}

export function spawnParticles(particles, x, y, count, colors, speed = 2) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = Math.random() * speed;
        const color = colors[Math.floor(Math.random() * colors.length)];
        particles.push(new Particle(
            x, y,
            Math.cos(angle) * spd,
            Math.sin(angle) * spd - 1,
            color,
            randInt(30, 80),
            randInt(1, 3)
        ));
    }
}
