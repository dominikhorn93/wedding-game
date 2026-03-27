import { WIDTH, HEIGHT, COLORS, input, drawRect, drawText, clamp, randInt, randFloat, spawnParticles, Particle } from '../utils.js';
import { drawHannah, drawJustin, drawHeart, drawConfetti, drawRing } from '../sprites.js';
import { sfxJump, sfxFlower, sfxJitters, sfxWedding } from '../audio.js';

// Level 5: Wedding Day - Doodle Jump to the altar!
// World coords: Y increases UPWARD. player.y = feet position.
export class Level5 {
    constructor() {
        this.complete = false;
        this.failed = false;
        this.timer = 0;
        this.frame = 0;

        this.targetHeight = 1200;
        this.cameraY = 0;       // world Y of camera bottom edge
        this.maxCameraY = 0;

        // Player (y = feet position in world coords, Y goes up)
        this.player = {
            x: WIDTH / 2 - 8,
            y: 10,
            w: 20,
            h: 30,
            vx: 0,
            vy: 6, // start with an upward jump
        };
        this.gravity = 0.18;
        this.jumpPower = 5.5;
        this.moveSpeed = 3;

        // Platforms
        this.platforms = [];
        this.generatePlatforms();

        // Collectible flowers on some platforms
        this.flowers = [];
        this.score = 0;

        // Obstacles
        this.obstacles = [];

        // Populate flowers & obstacles
        for (const p of this.platforms) {
            if (p.type === 'ground' || p.type === 'altar') continue;
            if (Math.random() > 0.6) {
                this.flowers.push({
                    x: p.x + randInt(4, p.w - 12),
                    y: p.y + 10,
                    collected: false,
                    color: [COLORS.pink, COLORS.gold, '#ff88aa', '#ffaa88'][randInt(0, 3)],
                });
            }
            if (Math.random() > 0.9 && p.y > 300 && p.y < this.targetHeight - 300) {
                this.obstacles.push({
                    baseX: p.x + p.w / 2,
                    y: p.y + 22,
                    w: 20,
                    h: 10,
                    phase: randFloat(0, Math.PI * 2),
                    text: ['Jitters', 'Nerves!', 'Cold feet', 'Doubt'][randInt(0, 3)],
                    alive: true,
                });
            }
        }

        // Confetti for finish
        this.confetti = [];
        this.confettiColors = [COLORS.pink, COLORS.gold, COLORS.white, COLORS.blue, '#ff88aa'];

        this.finished = false;
        this.finishTimer = 0;
        this.particles = [];

        // Background clouds
        this.clouds = [];
        for (let i = 0; i < 15; i++) {
            this.clouds.push({
                x: randFloat(-20, WIDTH),
                y: randFloat(0, this.targetHeight + 300),
                w: randInt(30, 60),
                speed: randFloat(0.1, 0.3),
            });
        }
    }

    generatePlatforms() {
        // Wide ground
        this.platforms.push({ x: 0, y: 0, w: WIDTH, type: 'ground' });

        let y = 40;
        while (y < this.targetHeight - 50) {
            const difficulty = clamp(y / this.targetHeight, 0, 1);
            const gap = 20 + difficulty * 8;
            const w = Math.max(40, 65 - difficulty * 18);
            const x = randInt(5, WIDTH - w - 5);

            let type = 'normal';
            if (y > 500 && Math.random() > 0.8) type = 'moving';
            if (y > 900 && Math.random() > 0.9) type = 'crumble';

            this.platforms.push({
                x, y, w, type,
                origX: x,
                movePhase: randFloat(0, Math.PI * 2),
                moveRange: randInt(20, 40),
                crumbleTimer: 0,
                crumbling: false,
            });

            y += gap + randInt(0, 8);
        }

        // Altar platform at the very top
        this.platforms.push({
            x: WIDTH / 2 - 40, y: this.targetHeight, w: 80, type: 'altar',
        });
    }

    update(dt) {
        if (this.failed) return;
        this.timer += dt;
        this.frame = Math.floor(this.timer / 12) % 2;

        // --- Finish celebration ---
        if (this.finished) {
            this.finishTimer += dt;
            if (this.finishTimer % 3 < 1.5) {
                this.confetti.push({
                    x: randInt(0, WIDTH),
                    y: this.cameraY + HEIGHT + 5,
                    vx: randFloat(-0.8, 0.8),
                    vy: randFloat(0.5, 2),
                    color: this.confettiColors[randInt(0, this.confettiColors.length - 1)],
                    rot: randFloat(0, Math.PI * 2),
                    rotSpd: randFloat(-0.1, 0.1),
                    size: randInt(2, 5),
                });
            }
            for (let i = this.confetti.length - 1; i >= 0; i--) {
                const c = this.confetti[i];
                c.x += c.vx;
                c.y += c.vy;
                c.vy -= 0.01;
                c.rot += c.rotSpd;
            }
            if (this.finishTimer > 200) this.complete = true;
            return;
        }

        // --- Movement ---
        let dx = 0;
        if (input.keys['ArrowLeft'] || input.keys['a'] || input.keys['A']) dx = -1;
        if (input.keys['ArrowRight'] || input.keys['d'] || input.keys['D']) dx = 1;

        if (input.mouse.down || input.touch.active) {
            const mx = input.mouse.x;
            if (mx < WIDTH / 3) dx = -1;
            else if (mx > WIDTH * 2 / 3) dx = 1;
        }

        this.player.x += dx * this.moveSpeed * dt;
        // Wrap around (Doodle Jump style)
        if (this.player.x < -this.player.w) this.player.x = WIDTH;
        if (this.player.x > WIDTH) this.player.x = -this.player.w;

        // --- Physics (Y goes up) ---
        this.player.vy -= this.gravity * dt;  // gravity pulls vy down
        this.player.y += this.player.vy * dt; // apply velocity

        // --- Platform collision (only when falling: vy < 0) ---
        if (this.player.vy < 0) {
            for (const p of this.platforms) {
                if (p.crumbling && p.crumbleTimer > 18) continue;

                let px = p.x;
                if (p.type === 'moving') {
                    px = p.origX + Math.sin(this.timer * 0.04 + p.movePhase) * p.moveRange;
                }

                // Player feet (player.y) pass through platform top
                const feetPrev = this.player.y - this.player.vy * dt;
                const feetNow = this.player.y;
                const platTop = p.y + 4;

                // Generous collision: feet were above platform, now at or below it
                const crossedPlatform = feetPrev >= platTop - 2 && feetNow <= platTop + Math.abs(this.player.vy * dt) + 2;

                if (
                    this.player.x + this.player.w > px + 2 &&
                    this.player.x < px + p.w - 2 &&
                    crossedPlatform
                ) {
                    // Land!
                    this.player.y = platTop;
                    this.player.vy = this.jumpPower;
                    sfxJump();

                    if (p.type === 'crumble' && !p.crumbling) {
                        p.crumbling = true;
                        p.crumbleTimer = 0;
                    }
                    if (p.type === 'altar') {
                        this.finished = true;
                        this.finishTimer = 0;
                        sfxWedding();
                    }
                    break;
                }
            }
        }

        // Update crumbling & moving platforms
        for (const p of this.platforms) {
            if (p.crumbling) p.crumbleTimer += dt;
            if (p.type === 'moving') {
                p.x = p.origX + Math.sin(this.timer * 0.04 + p.movePhase) * p.moveRange;
            }
        }

        // --- Camera follows upward only ---
        const desiredCam = this.player.y - HEIGHT * 0.55;
        if (desiredCam > this.cameraY) {
            this.cameraY += (desiredCam - this.cameraY) * 0.08;
        }
        this.maxCameraY = Math.max(this.maxCameraY, this.cameraY);

        // --- Collect flowers ---
        for (const f of this.flowers) {
            if (f.collected) continue;
            const ddx = Math.abs((this.player.x + 10) - (f.x + 3));
            const ddy = Math.abs((this.player.y + 15) - f.y);
            if (ddx < 16 && ddy < 16) {
                f.collected = true;
                this.score++;
                sfxFlower();
                spawnParticles(this.particles, f.x, f.y, 5, [f.color, COLORS.white]);
            }
        }

        // --- Obstacles ---
        for (const o of this.obstacles) {
            if (!o.alive) continue;
            o.phase += 0.03;
            const ox = o.baseX + Math.sin(o.phase) * 18;
            const ddx = Math.abs((this.player.x + 10) - ox);
            const ddy = Math.abs((this.player.y + 15) - o.y);
            if (ddx < 16 && ddy < 14) {
                this.player.vy = -2; // knock down
                sfxJitters();
                spawnParticles(this.particles, ox, o.y, 5, [COLORS.orange, COLORS.red]);
                o.alive = false;
            }
        }

        // --- Particles ---
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].dead) this.particles.splice(i, 1);
        }

        // Clouds
        for (const c of this.clouds) {
            c.x += c.speed * dt;
            if (c.x > WIDTH + 20) c.x = -c.w - 10;
        }

        // --- Fail: fell below camera ---
        if (this.player.y < this.cameraY - 40 && this.maxCameraY > 60) {
            this.failed = true;
        }
    }

    // Convert world Y (up=positive) to screen Y (down=positive)
    toScreen(worldY) {
        return HEIGHT - (worldY - this.cameraY);
    }

    draw(ctx) {
        // Sky: gets brighter higher up
        const hRatio = clamp(this.cameraY / this.targetHeight, 0, 1);
        const r = Math.floor(80 + hRatio * 100);
        const g = Math.floor(140 + hRatio * 80);
        const b = Math.floor(210 + hRatio * 40);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        // Clouds (fixed on screen, just drift sideways)
        for (const c of this.clouds) {
            const sy = (c.y % HEIGHT);
            if (sy < -20 || sy > HEIGHT + 20) continue;
            ctx.globalAlpha = 0.35;
            drawRect(ctx, c.x, sy, c.w, 8, '#ffffff');
            drawRect(ctx, c.x + 5, sy - 4, c.w - 10, 6, '#ffffff');
            drawRect(ctx, c.x + 3, sy + 6, c.w - 6, 4, '#ffffff');
            ctx.globalAlpha = 1;
        }

        // --- Platforms ---
        for (const p of this.platforms) {
            let px = p.x;
            if (p.type === 'moving') {
                px = p.origX + Math.sin(this.timer * 0.04 + p.movePhase) * p.moveRange;
            }
            const sy = this.toScreen(p.y);
            if (sy < -50 || sy > HEIGHT + 20) continue;

            if (p.type === 'ground') {
                drawRect(ctx, 0, sy, WIDTH, HEIGHT - sy + 10, '#5a8a5a');
                drawRect(ctx, 0, sy - 2, WIDTH, 4, '#6aaa6a');
                // Grass
                for (let gx = 0; gx < WIDTH; gx += 8) {
                    drawRect(ctx, gx + 2, sy - 4, 2, 3, '#4a9a4a');
                }
            } else if (p.type === 'altar') {
                // Grand altar platform
                drawRect(ctx, px, sy - 6, p.w, 10, '#f0e8dd');
                drawRect(ctx, px + 2, sy - 4, p.w - 4, 6, '#e8ddd0');
                // Arch
                drawRect(ctx, px + 2, sy - 50, 5, 50, '#9a8a7a');
                drawRect(ctx, px + p.w - 7, sy - 50, 5, 50, '#9a8a7a');
                drawRect(ctx, px, sy - 52, p.w, 5, '#9a8a7a');
                // Flowers on arch
                for (let fx = px + 8; fx < px + p.w - 8; fx += 10) {
                    drawRect(ctx, fx, sy - 50, 6, 5, [COLORS.pink, COLORS.gold, '#ff88aa'][fx % 3]);
                }
                // Red carpet
                drawRect(ctx, px + p.w / 2 - 8, sy - 4, 16, 8, '#cc4444');
            } else if (p.type === 'crumble') {
                if (p.crumbling && p.crumbleTimer > 18) continue;
                const shake = p.crumbling ? Math.sin(p.crumbleTimer * 0.8) * 2 : 0;
                const alpha = p.crumbling ? Math.max(0, 1 - p.crumbleTimer / 20) : 1;
                ctx.globalAlpha = alpha;
                drawRect(ctx, px + shake, sy - 4, p.w, 8, '#cc9966');
                drawRect(ctx, px + shake + 1, sy - 2, p.w - 2, 4, '#ddaa77');
                drawRect(ctx, px + p.w / 3 + shake, sy - 4, 1, 8, '#aa7744');
                drawRect(ctx, px + p.w * 2 / 3 + shake, sy - 3, 1, 7, '#aa7744');
                ctx.globalAlpha = 1;
            } else if (p.type === 'moving') {
                drawRect(ctx, px, sy - 4, p.w, 8, '#7799cc');
                drawRect(ctx, px + 1, sy - 2, p.w - 2, 4, '#88aadd');
                // Arrow indicators
                const arrowPulse = Math.sin(this.timer * 0.08) * 0.5 + 0.5;
                ctx.globalAlpha = arrowPulse;
                drawRect(ctx, px - 5, sy - 2, 4, 4, '#6688bb');
                drawRect(ctx, px + p.w + 1, sy - 2, 4, 4, '#6688bb');
                ctx.globalAlpha = 1;
            } else {
                // Normal
                drawRect(ctx, px, sy - 4, p.w, 8, '#5aaa5a');
                drawRect(ctx, px + 1, sy - 2, p.w - 2, 4, '#6abb6a');
                // Grass tufts
                drawRect(ctx, px + 3, sy - 6, 2, 3, '#4a9a4a');
                drawRect(ctx, px + p.w - 6, sy - 6, 2, 3, '#4a9a4a');
                if (p.w > 40) drawRect(ctx, px + p.w / 2, sy - 5, 2, 2, '#4a9a4a');
            }
        }

        // --- Flowers ---
        for (const f of this.flowers) {
            if (f.collected) continue;
            const sy = this.toScreen(f.y);
            if (sy < -10 || sy > HEIGHT + 10) continue;
            const bob = Math.sin(this.timer * 0.06 + f.x) * 2;
            drawRect(ctx, f.x + 2, sy + 2 + bob, 2, 5, '#3a8a3a'); // stem
            drawRect(ctx, f.x, sy - 2 + bob, 6, 5, f.color);        // petals
            drawRect(ctx, f.x + 2, sy + bob, 2, 2, COLORS.gold);    // center
        }

        // --- Obstacles ---
        for (const o of this.obstacles) {
            if (!o.alive) continue;
            const sy = this.toScreen(o.y);
            if (sy < -20 || sy > HEIGHT + 20) continue;
            const ox = o.baseX + Math.sin(o.phase) * 18;
            ctx.globalAlpha = 0.8;
            drawRect(ctx, ox - o.w / 2, sy - o.h / 2, o.w, o.h, '#dd6644');
            drawRect(ctx, ox - o.w / 2 + 1, sy - o.h / 2 + 1, o.w - 2, o.h - 2, '#ee7755');
            drawText(ctx, o.text, ox, sy, COLORS.white, 4);
            ctx.globalAlpha = 1;
        }

        // --- Player ---
        const psy = this.toScreen(this.player.y);
        // Draw sprite above feet position
        drawHannah(ctx, this.player.x - 2, psy - 30, this.frame, 2, 'wedding');
        drawJustin(ctx, this.player.x + 10, psy - 30, this.frame, 2, 'wedding');

        // --- Particles ---
        for (const p of this.particles) {
            const origDraw = p.y;
            // Convert particle world Y to screen
            ctx.save();
            const pScreenY = this.toScreen(origDraw + this.cameraY);
            p.draw(ctx);
            ctx.restore();
        }

        // --- Confetti ---
        for (const c of this.confetti) {
            const sy = this.toScreen(c.y);
            drawConfetti(ctx, c.x, sy, c.color, c.size, c.rot);
        }

        // --- Finish overlay ---
        if (this.finished) {
            const fadeIn = clamp(this.finishTimer / 60, 0, 1);
            ctx.globalAlpha = fadeIn * 0.6;
            drawRect(ctx, 0, 0, WIDTH, HEIGHT, '#0a0a1a');
            ctx.globalAlpha = fadeIn;

            // Couple
            drawHannah(ctx, WIDTH / 2 - 18, HEIGHT / 2 - 30, 0, 2, 'wedding');
            drawJustin(ctx, WIDTH / 2 + 4, HEIGHT / 2 - 30, 0, 2, 'wedding');

            const ringBounce = Math.sin(this.finishTimer * 0.05) * 3;
            drawRing(ctx, WIDTH / 2 - 5, HEIGHT / 2 - 38 + ringBounce, 10);

            for (let i = 0; i < 6; i++) {
                const hx = WIDTH / 2 + Math.sin(this.finishTimer * 0.03 + i * 1.1) * 40;
                const hy = HEIGHT / 2 - 50 - (this.finishTimer * 0.4 + i * 12) % 80;
                ctx.globalAlpha = fadeIn * 0.5;
                drawHeart(ctx, hx, hy, 6, COLORS.pink);
            }
            ctx.globalAlpha = fadeIn;

            if (this.finishTimer > 30) drawText(ctx, 'Congratulations!', WIDTH / 2, 40, COLORS.gold, 10);
            if (this.finishTimer > 60) drawText(ctx, 'Hannah & Justin', WIDTH / 2, 60, COLORS.pink, 8);
            if (this.finishTimer > 90) drawText(ctx, 'March 28, 2026', WIDTH / 2, 78, COLORS.white, 6);
            ctx.globalAlpha = 1;
        }

        // --- UI ---
        // Height progress bar (right side)
        const progress = clamp(this.player.y / this.targetHeight, 0, 1);
        drawRect(ctx, WIDTH - 10, 24, 4, HEIGHT - 40, '#22334466');
        drawRect(ctx, WIDTH - 10, 24 + (HEIGHT - 40) * (1 - progress), 4, (HEIGHT - 40) * progress, COLORS.gold);
        drawRect(ctx, WIDTH - 12, 20, 8, 5, COLORS.pink); // altar icon top

        // Flower count
        drawText(ctx, `${this.score}`, 22, 18, COLORS.gold, 6);
        drawRect(ctx, 8, 14, 6, 6, COLORS.pink);

        // Height percent
        drawText(ctx, `${Math.floor(progress * 100)}%`, WIDTH - 8, HEIGHT - 8, COLORS.white, 4);

        // Hint at start
        if (this.timer < 120 && this.cameraY < 30) {
            const a = Math.sin(this.timer * 0.06) * 0.3 + 0.6;
            ctx.globalAlpha = a;
            drawText(ctx, 'LEFT/RIGHT to steer!', WIDTH / 2, HEIGHT - 16, COLORS.white, 5);
            ctx.globalAlpha = 1;
        }

        // Touch buttons (visible on touch devices)
        if ('ontouchstart' in window) {
            const leftActive = input.mouse.down && input.mouse.x < WIDTH / 3;
            const rightActive = input.mouse.down && input.mouse.x > WIDTH * 2 / 3;
            const btnW = 54;
            const btnH = 40;
            const btnY = HEIGHT - btnH - 6;
            const btnLX = 8;
            const btnRX = WIDTH - btnW - 8;

            // Left button
            ctx.globalAlpha = leftActive ? 0.85 : 0.45;
            drawRect(ctx, btnLX, btnY, btnW, btnH, '#1a1a2e');
            drawRect(ctx, btnLX, btnY, btnW, 2, COLORS.gold);
            drawRect(ctx, btnLX, btnY + btnH - 2, btnW, 2, COLORS.gold);
            drawRect(ctx, btnLX, btnY, 2, btnH, COLORS.gold);
            drawRect(ctx, btnLX + btnW - 2, btnY, 2, btnH, COLORS.gold);
            drawText(ctx, '<', btnLX + btnW / 2, btnY + btnH / 2, COLORS.gold, 18);

            // Right button
            ctx.globalAlpha = rightActive ? 0.85 : 0.45;
            drawRect(ctx, btnRX, btnY, btnW, btnH, '#1a1a2e');
            drawRect(ctx, btnRX, btnY, btnW, 2, COLORS.gold);
            drawRect(ctx, btnRX, btnY + btnH - 2, btnW, 2, COLORS.gold);
            drawRect(ctx, btnRX, btnY, 2, btnH, COLORS.gold);
            drawRect(ctx, btnRX + btnW - 2, btnY, 2, btnH, COLORS.gold);
            drawText(ctx, '>', btnRX + btnW / 2, btnY + btnH / 2, COLORS.gold, 18);

            ctx.globalAlpha = 1;
        }
    }
}
