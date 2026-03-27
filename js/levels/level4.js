import { WIDTH, HEIGHT, COLORS, input, drawRect, drawText, pointInRect, randInt, randFloat, Particle, spawnParticles } from '../utils.js';
import { drawHannah, drawJustin, drawHeart, drawMusicNote } from '../sprites.js';
import { sfxHeartClick, sfxCombo } from '../audio.js';

// Level 4: The Real First Date - Rhythm/clicking game at The Fillmore
export class Level4 {
    constructor() {
        this.complete = false;
        this.failed = false;
        this.drainStarted = false;
        this.timer = 0;
        this.frame = 0;

        // Love meter
        this.love = 0;
        this.maxLove = 100;

        // Floating hearts to click/tap
        this.hearts = [];
        this.spawnTimer = 0;

        // Missed clicks penalty
        this.combo = 0;
        this.maxCombo = 0;

        // Particles
        this.particles = [];

        // Stage lights
        this.lights = [];
        for (let i = 0; i < 6; i++) {
            this.lights.push({
                x: 15 + i * 58,
                phase: i * 0.8,
                color: [COLORS.pink, COLORS.purple, COLORS.blue, COLORS.gold, COLORS.pink, COLORS.purple][i],
            });
        }

        // Floating music notes (decorative)
        this.bgNotes = [];
        for (let i = 0; i < 8; i++) {
            this.bgNotes.push({
                x: randInt(10, WIDTH - 20),
                y: randInt(40, HEIGHT - 60),
                phase: randFloat(0, Math.PI * 2),
                speed: randFloat(0.2, 0.5),
            });
        }

        // Characters sway
        this.swayPhase = 0;
    }

    update(dt) {
        if (this.failed) return;
        this.timer += dt;
        this.frame = Math.floor(this.timer / 20) % 2;
        this.swayPhase += 0.03;

        // Spawn clickable hearts
        this.spawnTimer += dt;
        const spawnRate = Math.max(12, 28 - this.love * 0.12);
        if (this.spawnTimer > spawnRate) {
            this.spawnTimer = 0;
            this.hearts.push({
                x: randInt(20, WIDTH - 30),
                y: randInt(50, HEIGHT - 70),
                size: randInt(12, 20),
                life: 110,
                maxLife: 110,
                hit: false,
                // Pulsing animation
                phase: randFloat(0, Math.PI * 2),
            });
        }

        // Update hearts
        for (let i = this.hearts.length - 1; i >= 0; i--) {
            const h = this.hearts[i];
            h.life -= dt;
            h.phase += 0.08;

            if (h.life <= 0) {
                if (!h.hit && this.combo > 2) {
                    this.combo = Math.max(0, this.combo - 2); // gentle penalty
                }
                this.hearts.splice(i, 1);
            }
        }

        // Click detection
        if (input.mouse.clicked) {
            let hitAny = false;
            for (let i = this.hearts.length - 1; i >= 0; i--) {
                const h = this.hearts[i];
                if (!h.hit && pointInRect(input.mouse.x, input.mouse.y, {
                    x: h.x - 8,
                    y: h.y - 8,
                    w: h.size + 16,
                    h: h.size + 16,
                })) {
                    h.hit = true;
                    this.combo++;
                    this.maxCombo = Math.max(this.maxCombo, this.combo);
                    if (this.combo > 0 && this.combo % 5 === 0) {
                        sfxCombo();
                    } else {
                        sfxHeartClick();
                    }

                    // Love gain scales with combo
                    const gain = Math.min(7, 3 + Math.floor(this.combo / 2));
                    this.love = Math.min(this.maxLove, this.love + gain);

                    // Particles
                    spawnParticles(this.particles, h.x + h.size/2, h.y + h.size/2, 8,
                        [COLORS.pink, COLORS.gold, COLORS.white], 3);

                    this.hearts.splice(i, 1);
                    hitAny = true;
                    break;
                }
            }
        }

        // Update bg notes
        for (const n of this.bgNotes) {
            n.y -= n.speed * dt;
            n.x += Math.sin(this.timer * 0.02 + n.phase) * 0.2;
            if (n.y < 30) {
                n.y = HEIGHT - 40;
                n.x = randInt(10, WIDTH - 20);
            }
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].dead) this.particles.splice(i, 1);
        }

        // Win check BEFORE drain
        if (this.love >= this.maxLove) {
            this.complete = true;
            return;
        }

        // Love drains very slowly (gentle pressure, not punishing)
        if (this.love >= 40) this.drainStarted = true;
        if (this.drainStarted) {
            this.love = Math.max(0, this.love - 0.02 * dt);
            if (this.love <= 0) this.failed = true;
        }
    }

    draw(ctx) {
        // Dark venue - The Fillmore
        drawRect(ctx, 0, 0, WIDTH, HEIGHT, '#0a0a18');

        // Stage lights
        for (const light of this.lights) {
            const intensity = Math.sin(this.timer * 0.05 + light.phase) * 0.3 + 0.4;
            ctx.globalAlpha = intensity * 0.25;
            ctx.beginPath();
            ctx.moveTo(light.x, 0);
            ctx.lineTo(light.x - 40, HEIGHT);
            ctx.lineTo(light.x + 40, HEIGHT);
            ctx.closePath();
            ctx.fillStyle = light.color;
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Stage
        drawRect(ctx, 0, 0, WIDTH, 30, '#141428');
        drawRect(ctx, 0, 28, WIDTH, 4, '#222244');

        // "THE FILLMORE" text
        drawText(ctx, 'THE FILLMORE', WIDTH/2, 10, COLORS.gold, 6);

        // "LOCAL NATIVES" on stage
        const glow = Math.sin(this.timer * 0.04) * 0.2 + 0.8;
        ctx.globalAlpha = glow;
        drawText(ctx, 'LOCAL NATIVES', WIDTH/2, 22, COLORS.pink, 5);
        ctx.globalAlpha = 1;

        // Background music notes (decorative)
        for (const n of this.bgNotes) {
            ctx.globalAlpha = 0.15;
            drawMusicNote(ctx, n.x, n.y, 6, COLORS.gold);
        }
        ctx.globalAlpha = 1;

        // Characters (center bottom, swaying)
        const sway = Math.sin(this.swayPhase) * 3;
        const charY = HEIGHT - 60;
        drawHannah(ctx, WIDTH/2 - 20 + sway, charY, this.frame, 2, 'date');
        drawJustin(ctx, WIDTH/2 + 6 - sway, charY, this.frame, 2, 'date');

        // Clickable hearts
        for (const h of this.hearts) {
            const lifeRatio = h.life / h.maxLife;
            const pulse = Math.sin(h.phase) * 2;
            const size = h.size + pulse;

            // Warning flash when about to expire
            if (lifeRatio < 0.3) {
                ctx.globalAlpha = lifeRatio / 0.3 * (Math.sin(this.timer * 0.2) * 0.3 + 0.7);
            } else {
                ctx.globalAlpha = Math.min(1, lifeRatio * 2);
            }

            // Glow effect
            drawRect(ctx, h.x - 2, h.y - 2, size + 4, size + 4, COLORS.darkPink);
            drawHeart(ctx, h.x, h.y, size, COLORS.pink);

            ctx.globalAlpha = 1;
        }

        // Particles
        for (const p of this.particles) p.draw(ctx);

        // Love Meter (top of screen)
        const meterX = 30;
        const meterY = 38;
        const meterW = WIDTH - 60;
        const meterH = 10;

        drawRect(ctx, meterX - 1, meterY - 1, meterW + 2, meterH + 2, COLORS.darkGray);
        drawRect(ctx, meterX, meterY, meterW, meterH, COLORS.dark);

        const fillW = (this.love / this.maxLove) * meterW;
        // Gradient-like effect
        drawRect(ctx, meterX, meterY, fillW, meterH, COLORS.pink);
        if (fillW > 4) {
            drawRect(ctx, meterX, meterY, fillW, meterH / 2, COLORS.darkPink);
        }

        // Hearts on the meter edges
        drawHeart(ctx, meterX - 12, meterY, 10, COLORS.pink);
        drawHeart(ctx, meterX + meterW + 2, meterY, 10, COLORS.pink);

        // Love meter label
        const lovePercent = Math.floor((this.love / this.maxLove) * 100);
        drawText(ctx, `Love: ${lovePercent}%`, WIDTH/2, meterY + 5, COLORS.white, 5);

        // Combo display
        if (this.combo > 1) {
            const comboScale = Math.min(1, this.combo * 0.1);
            const comboBounce = Math.sin(this.timer * 0.1) * 2;
            drawText(ctx, `${this.combo}x Combo!`, WIDTH/2, HEIGHT - 14 + comboBounce,
                COLORS.gold, 6);
        }

        // Hint
        if (this.timer < 120 && this.love < 10) {
            const hintAlpha = Math.sin(this.timer * 0.05) * 0.3 + 0.5;
            ctx.globalAlpha = hintAlpha;
            drawText(ctx, 'Tap the hearts!', WIDTH/2, HEIGHT - 30, COLORS.white, 5);
            ctx.globalAlpha = 1;
        }
    }
}
