import { WIDTH, HEIGHT, COLORS, input, drawRect, drawText, drawTextWrapped, randFloat } from '../utils.js';
import { drawHannah, drawJustin, drawHeart } from '../sprites.js';
import { sfxClick, sfxIntro, startMusic } from '../audio.js';

export class TitleScreen {
    constructor() {
        this.complete = false;
        this.timer = 0;
        this.hearts = [];
        this.twinkle = 0;
        this.introPlayed = false;

        // Floating hearts background
        for (let i = 0; i < 12; i++) {
            this.hearts.push({
                x: Math.random() * WIDTH,
                y: Math.random() * HEIGHT,
                speed: randFloat(0.2, 0.5),
                size: randFloat(4, 8),
                phase: Math.random() * Math.PI * 2,
            });
        }
    }

    update(dt) {
        this.timer += dt;
        this.twinkle += 0.05;

        // Play intro chime once (after first user interaction unlocks audio)
        if (!this.introPlayed && this.timer > 2) {
            this.introPlayed = true;
            sfxIntro();
        }

        // Animate hearts
        for (const h of this.hearts) {
            h.y -= h.speed * dt;
            h.x += Math.sin(this.timer * 0.02 + h.phase) * 0.3;
            if (h.y < -10) {
                h.y = HEIGHT + 10;
                h.x = Math.random() * WIDTH;
            }
        }

        // Click to start
        if (this.timer > 60 && input.mouse.clicked) {
            this.complete = true;
            sfxClick();
            startMusic();
        }
        // Key to start
        if (this.timer > 60 && (input.keys['Enter'] || input.keys[' '] || input.keys['Space'])) {
            this.complete = true;
            sfxClick();
            startMusic();
        }
    }

    draw(ctx) {
        // Background gradient effect
        drawRect(ctx, 0, 0, WIDTH, HEIGHT, '#0f0f23');

        // Stars
        for (let i = 0; i < 40; i++) {
            const sx = (i * 73 + 17) % WIDTH;
            const sy = (i * 47 + 31) % HEIGHT;
            const brightness = Math.sin(this.twinkle + i) * 0.3 + 0.7;
            ctx.globalAlpha = brightness * 0.6;
            drawRect(ctx, sx, sy, 1, 1, COLORS.white);
        }
        ctx.globalAlpha = 1;

        // Floating hearts
        for (const h of this.hearts) {
            ctx.globalAlpha = 0.3;
            drawHeart(ctx, h.x, h.y, h.size, COLORS.pink);
        }
        ctx.globalAlpha = 1;

        // Title
        const bounce = Math.sin(this.timer * 0.04) * 3;
        drawText(ctx, 'Hannah', WIDTH/2, 55 + bounce, COLORS.gold, 11);
        drawText(ctx, '&', WIDTH/2, 75 + bounce, COLORS.pink, 8);
        drawText(ctx, 'Justin', WIDTH/2, 95 + bounce, COLORS.gold, 11);
        drawText(ctx, 'A Love Story', WIDTH/2, 120 + bounce, COLORS.pink, 7);

        // Characters
        const hannahX = WIDTH/2 - 28;
        const justinX = WIDTH/2 + 12;
        const charY = 150;

        drawHannah(ctx, hannahX, charY, Math.floor(this.timer / 30) % 2, 2);
        drawJustin(ctx, justinX, charY, Math.floor(this.timer / 30) % 2, 2);

        // Heart between them
        const heartBeat = Math.sin(this.timer * 0.08) * 2;
        drawHeart(ctx, WIDTH/2 - 5, charY + 8 + heartBeat, 10, COLORS.pink);

        // Subtitle
        drawText(ctx, 'March 28, 2026', WIDTH/2, 230, COLORS.white, 6);
        drawText(ctx, 'Pen Ryn Estate', WIDTH/2, 244, COLORS.lightGray, 5);

        // Press start (blinking)
        if (this.timer > 60 && Math.floor(this.timer / 30) % 2 === 0) {
            drawText(ctx, 'Click or Press Enter', WIDTH/2, 285, COLORS.gold, 5);
        }

        // Bottom credit
        drawText(ctx, 'A gift with love', WIDTH/2, 305, COLORS.darkGray, 4);
        drawText(ctx, 'from Germany', WIDTH/2, 314, COLORS.darkGray, 4);
    }
}
