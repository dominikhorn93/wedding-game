import { WIDTH, HEIGHT, COLORS, input, drawRect, drawText, rectsOverlap, clamp, randInt, randFloat, Particle, spawnParticles } from '../utils.js';
import { drawHannah, drawJustin, drawHeart, drawConfetti, drawRing } from '../sprites.js';
import { sfxCollect, sfxHit, sfxWedding } from '../audio.js';

// Level 5: Wedding Day - Guide the couple down the aisle
export class Level5 {
    constructor() {
        this.complete = false;
        this.timer = 0;
        this.frame = 0;

        // The couple walks up the aisle (scrolling level)
        this.scrollY = 0;
        this.aisleLength = 600;
        this.progress = 0; // 0 to 1

        // Player position (the couple moves together)
        this.player = {
            x: WIDTH / 2 - 10,
            y: HEIGHT - 60,
            w: 20,
            h: 20,
            speed: 1.2,
        };

        // Flowers (collectibles that line the aisle)
        this.flowers = [];
        for (let i = 0; i < 30; i++) {
            const side = i % 2 === 0 ? -1 : 1;
            this.flowers.push({
                x: WIDTH/2 + side * (40 + randInt(0, 30)),
                scrollY: i * 20 + randInt(0, 10),
                w: 6,
                h: 6,
                collected: false,
                color: [COLORS.pink, COLORS.gold, COLORS.white, '#ff88aa', '#ffaa88'][randInt(0, 4)],
            });
        }

        // Jitters / obstacles (fun things to dodge)
        this.obstacles = [];
        this.obstacleTypes = [
            { text: 'Nerves!', w: 24, h: 10 },
            { text: 'Jitters', w: 28, h: 10 },
            { text: 'Cold feet', w: 36, h: 10 },
            { text: 'Tears!', w: 24, h: 10 },
        ];
        for (let i = 0; i < 12; i++) {
            const type = this.obstacleTypes[i % this.obstacleTypes.length];
            const side = (i % 3 === 0) ? 0 : (i % 2 === 0 ? -1 : 1);
            this.obstacles.push({
                x: WIDTH/2 + side * randInt(20, 50),
                scrollY: 40 + i * 45 + randInt(0, 20),
                w: type.w,
                h: type.h,
                text: type.text,
                wobble: randFloat(0, Math.PI * 2),
            });
        }

        // Confetti
        this.confettiPieces = [];
        this.confettiColors = [COLORS.pink, COLORS.gold, COLORS.white, COLORS.blue, COLORS.green, '#ff88aa'];

        // Guests (seated on either side)
        this.guests = [];
        for (let i = 0; i < 25; i++) {
            const side = i % 2 === 0 ? -1 : 1;
            this.guests.push({
                x: WIDTH/2 + side * (65 + randInt(0, 30)),
                scrollY: i * 24,
                color: ['#4a4a6a', '#5a4a5a', '#4a5a5a', '#5a5a5a'][randInt(0, 3)],
            });
        }

        this.particles = [];
        this.score = 0;
        this.finished = false;
        this.finishTimer = 0;

        // Altar at the end
        this.altarY = -20;
    }

    update(dt) {
        this.timer += dt;
        this.frame = Math.floor(this.timer / 15) % 2;

        if (this.finished) {
            this.finishTimer += dt;
            // Spawn celebration confetti
            if (this.finishTimer % 3 < 1.5) {
                this.confettiPieces.push({
                    x: randInt(0, WIDTH),
                    y: -5,
                    vx: randFloat(-1, 1),
                    vy: randFloat(0.5, 2),
                    color: this.confettiColors[randInt(0, this.confettiColors.length - 1)],
                    rotation: randFloat(0, Math.PI * 2),
                    rotSpeed: randFloat(-0.1, 0.1),
                    size: randInt(2, 5),
                });
            }

            // Update confetti
            for (let i = this.confettiPieces.length - 1; i >= 0; i--) {
                const c = this.confettiPieces[i];
                c.x += c.vx;
                c.y += c.vy;
                c.rotation += c.rotSpeed;
                if (c.y > HEIGHT + 10) this.confettiPieces.splice(i, 1);
            }

            if (this.finishTimer > 180) {
                this.complete = true;
            }
            return;
        }

        // Auto-scroll forward + player can move left/right
        this.scrollY += 0.5 * dt;
        this.progress = Math.min(1, this.scrollY / this.aisleLength);

        // Player horizontal movement
        let dx = 0;
        if (input.keys['ArrowLeft'] || input.keys['a']) dx = -1;
        if (input.keys['ArrowRight'] || input.keys['d']) dx = 1;

        if (input.mouse.down || input.touch.active) {
            const mx = input.mouse.x;
            if (Math.abs(mx - (this.player.x + 10)) > 4) {
                dx = mx > this.player.x + 10 ? 1 : -1;
            }
        }

        this.player.x += dx * this.player.speed * dt;
        this.player.x = clamp(this.player.x, WIDTH/2 - 55, WIDTH/2 + 35);

        // Check flower collection
        for (const f of this.flowers) {
            if (f.collected) continue;
            const fy = f.scrollY - this.scrollY + HEIGHT - 60;
            if (fy > -10 && fy < HEIGHT + 10) {
                if (rectsOverlap(
                    { x: this.player.x, y: this.player.y, w: this.player.w, h: this.player.h },
                    { x: f.x - 3, y: fy - 3, w: f.w + 6, h: f.h + 6 }
                )) {
                    f.collected = true;
                    this.score++;
                    sfxCollect();
                    spawnParticles(this.particles, f.x + 3, fy + 3, 5,
                        [f.color, COLORS.white]);
                }
            }
        }

        // Check obstacle collision (just makes you wobble, no real penalty)
        for (const o of this.obstacles) {
            const oy = o.scrollY - this.scrollY + HEIGHT - 60;
            if (oy > -10 && oy < HEIGHT + 10) {
                o.wobble += 0.05;
                const ox = o.x + Math.sin(o.wobble) * 8;
                if (rectsOverlap(
                    { x: this.player.x, y: this.player.y, w: this.player.w, h: this.player.h },
                    { x: ox, y: oy, w: o.w, h: o.h }
                )) {
                    // Push player slightly
                    sfxHit();
                    this.player.x += (this.player.x > ox ? 2 : -2);
                    spawnParticles(this.particles, ox + o.w/2, oy, 3,
                        [COLORS.orange, COLORS.gold]);
                    o.scrollY -= 100; // Move obstacle away
                }
            }
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].dead) this.particles.splice(i, 1);
        }

        // Reached the altar
        if (this.progress >= 1 && !this.finished) {
            this.finished = true;
            sfxWedding();
            this.finishTimer = 0;
        }
    }

    draw(ctx) {
        // Outdoor venue background
        drawRect(ctx, 0, 0, WIDTH, HEIGHT, '#2a4a2a'); // green ground

        // Sky gradient at top
        drawRect(ctx, 0, 0, WIDTH, 40, '#4a7aaa');
        drawRect(ctx, 0, 40, WIDTH, 20, '#5a8aba');

        // Trees in background
        for (let i = 0; i < 8; i++) {
            const tx = i * 42 + 10;
            drawRect(ctx, tx + 4, 20, 6, 20, '#5a3a2a');
            drawRect(ctx, tx, 8, 14, 16, '#2a6a2a');
            drawRect(ctx, tx + 2, 4, 10, 12, '#3a7a3a');
        }

        // Aisle (carpet)
        drawRect(ctx, WIDTH/2 - 20, 50, 40, HEIGHT - 50, '#f0e6d3');
        drawRect(ctx, WIDTH/2 - 18, 50, 36, HEIGHT - 50, '#e6d3c0');
        // Aisle decorations
        for (let y = 50; y < HEIGHT; y += 30) {
            drawRect(ctx, WIDTH/2 - 22, y, 4, 4, COLORS.pink);
            drawRect(ctx, WIDTH/2 + 18, y, 4, 4, COLORS.pink);
        }

        // Guest seats
        for (const g of this.guests) {
            const gy = g.scrollY - this.scrollY + HEIGHT - 60;
            if (gy < -20 || gy > HEIGHT + 20) continue;
            // Chair
            drawRect(ctx, g.x - 1, gy + 6, 10, 8, '#6a5a4a');
            // Person sitting
            drawRect(ctx, g.x, gy, 8, 10, g.color);
            drawRect(ctx, g.x + 1, gy - 4, 6, 5, COLORS.skin);
        }

        // Flowers
        for (const f of this.flowers) {
            if (f.collected) continue;
            const fy = f.scrollY - this.scrollY + HEIGHT - 60;
            if (fy < -10 || fy > HEIGHT + 10) continue;
            // Flower shape
            drawRect(ctx, f.x + 1, fy + 4, 2, 4, '#3a7a3a'); // stem
            drawRect(ctx, f.x, fy, f.w, f.h - 2, f.color);
            drawRect(ctx, f.x + 2, fy + 1, 2, 2, COLORS.gold); // center
        }

        // Obstacles
        for (const o of this.obstacles) {
            const oy = o.scrollY - this.scrollY + HEIGHT - 60;
            if (oy < -10 || oy > HEIGHT + 10) continue;
            o.wobble += 0;
            const ox = o.x + Math.sin(o.wobble) * 8;
            ctx.globalAlpha = 0.7;
            drawRect(ctx, ox, oy, o.w, o.h, 'rgba(200, 100, 50, 0.6)');
            drawText(ctx, o.text, ox + o.w/2, oy + o.h/2, COLORS.white, 4);
            ctx.globalAlpha = 1;
        }

        // Altar (at the end)
        if (this.finished || this.progress > 0.8) {
            const altarScreenY = Math.max(50, 70 - (this.progress - 0.8) * 200);
            drawRect(ctx, WIDTH/2 - 30, altarScreenY, 60, 40, '#eee8dd');
            drawRect(ctx, WIDTH/2 - 28, altarScreenY + 2, 56, 36, '#f5f0e8');
            // Arch
            drawRect(ctx, WIDTH/2 - 32, altarScreenY - 10, 4, 50, '#8a7a6a');
            drawRect(ctx, WIDTH/2 + 28, altarScreenY - 10, 4, 50, '#8a7a6a');
            drawRect(ctx, WIDTH/2 - 32, altarScreenY - 14, 64, 6, '#8a7a6a');
            // Flowers on arch
            drawRect(ctx, WIDTH/2 - 30, altarScreenY - 12, 8, 6, COLORS.pink);
            drawRect(ctx, WIDTH/2 + 22, altarScreenY - 12, 8, 6, COLORS.pink);
            drawRect(ctx, WIDTH/2 - 4, altarScreenY - 16, 8, 6, COLORS.gold);
        }

        // The couple (player)
        if (!this.finished) {
            drawHannah(ctx, this.player.x - 8, this.player.y - 16, this.frame, 2, 'wedding');
            drawJustin(ctx, this.player.x + 8, this.player.y - 16, this.frame, 2, 'wedding');
        }

        // Particles
        for (const p of this.particles) p.draw(ctx);

        // Progress bar
        drawRect(ctx, 10, HEIGHT - 12, WIDTH - 20, 6, COLORS.darkGray);
        drawRect(ctx, 10, HEIGHT - 12, (WIDTH - 20) * this.progress, 6, COLORS.gold);
        drawText(ctx, 'Aisle', 6, HEIGHT - 9, COLORS.white, 3);

        // Flower count
        drawText(ctx, `Flowers: ${this.score}`, WIDTH - 40, 8, COLORS.white, 5);

        // Confetti (celebration)
        for (const c of this.confettiPieces) {
            drawConfetti(ctx, c.x, c.y, c.color, c.size, c.rotation);
        }

        // Finish screen
        if (this.finished) {
            const fadeIn = Math.min(1, this.finishTimer / 60);
            ctx.globalAlpha = fadeIn;

            // Couple at altar
            drawHannah(ctx, WIDTH/2 - 16, 80, 0, 2, 'wedding');
            drawJustin(ctx, WIDTH/2 + 4, 80, 0, 2, 'wedding');

            // Ring between them
            const ringBounce = Math.sin(this.finishTimer * 0.05) * 3;
            drawRing(ctx, WIDTH/2 - 5, 72 + ringBounce, 10);

            // Hearts rising
            for (let i = 0; i < 5; i++) {
                const hx = WIDTH/2 - 10 + Math.sin(this.finishTimer * 0.03 + i) * 30;
                const hy = 60 - (this.finishTimer * 0.3 + i * 15) % 80;
                ctx.globalAlpha = fadeIn * 0.6;
                drawHeart(ctx, hx, hy, 6, COLORS.pink);
            }
            ctx.globalAlpha = fadeIn;

            // Text
            if (this.finishTimer > 30) {
                drawText(ctx, 'Congratulations!', WIDTH/2, 140, COLORS.gold, 10);
            }
            if (this.finishTimer > 60) {
                drawText(ctx, 'Hannah & Justin', WIDTH/2, 158, COLORS.pink, 8);
            }
            if (this.finishTimer > 90) {
                drawText(ctx, 'March 28, 2026', WIDTH/2, 175, COLORS.white, 6);
            }

            ctx.globalAlpha = 1;
        }
    }
}
