import { WIDTH, HEIGHT, COLORS, input, drawRect, drawText, rectsOverlap, clamp, randInt, randFloat, Particle, spawnParticles } from '../utils.js';
import { drawHannah, drawMusicNote, drawPerson } from '../sprites.js';
import { sfxMusicNote, sfxAwkward } from '../audio.js';

// Level 3: The Concert Mix-Up - Dodge awkward moments, collect music notes
export class Level3 {
    constructor() {
        this.complete = false;
        this.failed = false;
        this.timer = 0;
        this.frame = 0;
        this.score = 0;
        this.targetScore = 20;
        this.health = 5;

        // Hannah (player)
        this.player = {
            x: WIDTH / 2,
            y: HEIGHT - 55,
            w: 12,
            h: 20,
            speed: 2,
        };

        // Music notes (collectibles)
        this.notes = [];
        this.noteTimer = 0;

        // Awkward moments (obstacles)
        this.obstacles = [];
        this.obstacleTimer = 0;
        this.obstacleTexts = [
            '😬', 'AWKWARD', '!!', '???', 'cringe', 'oof', 'yikes',
        ];

        // Justin with his date (background characters moving around)
        this.justinPos = { x: WIDTH - 80, y: HEIGHT - 85 };
        this.justinDir = -1;

        // Crowd silhouettes
        this.crowd = [];
        for (let i = 0; i < 20; i++) {
            this.crowd.push({
                x: randInt(0, WIDTH - 8),
                y: randInt(HEIGHT - 85, HEIGHT - 50),
                bounce: randFloat(0, Math.PI * 2),
                color: ['#2a2a3e', '#3a2a3e', '#2a3a3e', '#333344'][i % 4],
            });
        }

        // Stage lights
        this.lights = [];
        for (let i = 0; i < 5; i++) {
            this.lights.push({
                x: 30 + i * 65,
                phase: i * 1.2,
                color: [COLORS.pink, COLORS.blue, COLORS.purple, COLORS.gold, COLORS.green][i],
            });
        }

        this.particles = [];

        // "LOCAL NATIVES" banner
        this.bannerFlash = 0;
    }

    update(dt) {
        if (this.failed) return;
        this.timer += dt;
        this.frame = Math.floor(this.timer / 15) % 2;
        this.bannerFlash += 0.03;

        // Player movement
        let dx = 0;
        if (input.keys['ArrowLeft'] || input.keys['a']) dx = -1;
        if (input.keys['ArrowRight'] || input.keys['d']) dx = 1;

        if (input.mouse.down || input.touch.active) {
            const mx = input.mouse.x;
            if (Math.abs(mx - (this.player.x + 6)) > 4) {
                dx = mx > this.player.x + 6 ? 1 : -1;
            }
        }

        this.player.x += dx * this.player.speed * dt;
        this.player.x = clamp(this.player.x, 4, WIDTH - 16);

        // Spawn music notes
        this.noteTimer += dt;
        if (this.noteTimer > 25) {
            this.noteTimer = 0;
            this.notes.push({
                x: randInt(10, WIDTH - 18),
                y: -10,
                w: 8,
                h: 8,
                speed: randFloat(0.6, 1.2),
                wobble: randFloat(0, Math.PI * 2),
            });
        }

        // Spawn obstacles
        this.obstacleTimer += dt;
        const obstacleInterval = Math.max(30, 60 - this.score);
        if (this.obstacleTimer > obstacleInterval) {
            this.obstacleTimer = 0;
            this.obstacles.push({
                x: randInt(10, WIDTH - 30),
                y: -16,
                w: 24,
                h: 12,
                speed: randFloat(0.5, 1.0),
                text: this.obstacleTexts[randInt(0, this.obstacleTexts.length - 1)],
            });
        }

        // Update notes
        for (let i = this.notes.length - 1; i >= 0; i--) {
            const n = this.notes[i];
            n.y += n.speed * dt;
            n.x += Math.sin(this.timer * 0.05 + n.wobble) * 0.3;

            if (rectsOverlap(n, this.player)) {
                this.score++;
                sfxMusicNote();
                spawnParticles(this.particles, n.x + 4, n.y + 4, 4,
                    [COLORS.gold, COLORS.orange]);
                this.notes.splice(i, 1);
                continue;
            }
            if (n.y > HEIGHT) this.notes.splice(i, 1);
        }

        // Update obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const o = this.obstacles[i];
            o.y += o.speed * dt;

            if (rectsOverlap(o, this.player)) {
                this.health--;
                sfxAwkward();
                spawnParticles(this.particles, o.x + 12, o.y + 6, 6,
                    [COLORS.red, COLORS.darkRed]);
                this.obstacles.splice(i, 1);
                continue;
            }
            if (o.y > HEIGHT) this.obstacles.splice(i, 1);
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].dead) this.particles.splice(i, 1);
        }

        // Justin moving in background
        this.justinPos.x += this.justinDir * 0.3 * dt;
        if (this.justinPos.x < WIDTH/2) this.justinDir = 1;
        if (this.justinPos.x > WIDTH - 60) this.justinDir = -1;

        // Crowd bounce
        for (const c of this.crowd) {
            c.bounce += 0.05;
        }

        // Win condition
        if (this.score >= this.targetScore) {
            this.complete = true;
        }

        if (this.health <= 0) {
            this.failed = true;
        }
    }

    draw(ctx) {
        // Dark concert venue
        drawRect(ctx, 0, 0, WIDTH, HEIGHT, '#0a0a1a');

        // Stage
        drawRect(ctx, 0, 0, WIDTH, 35, '#1a1a2a');
        drawRect(ctx, 0, 33, WIDTH, 4, '#333344');

        // Stage lights
        for (const light of this.lights) {
            const intensity = Math.sin(this.timer * 0.06 + light.phase) * 0.4 + 0.5;
            ctx.globalAlpha = intensity * 0.3;
            // Light cone
            ctx.beginPath();
            ctx.moveTo(light.x, 0);
            ctx.lineTo(light.x - 30, HEIGHT);
            ctx.lineTo(light.x + 30, HEIGHT);
            ctx.closePath();
            ctx.fillStyle = light.color;
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // "LOCAL NATIVES" banner on stage
        const bannerGlow = Math.sin(this.bannerFlash) * 0.2 + 0.8;
        ctx.globalAlpha = bannerGlow;
        drawText(ctx, 'LOCAL NATIVES', WIDTH/2, 16, COLORS.gold, 8);
        ctx.globalAlpha = 1;

        // Band silhouettes on stage
        for (let i = 0; i < 4; i++) {
            const bx = 60 + i * 55;
            drawRect(ctx, bx, 18, 6, 14, '#222233');
            drawRect(ctx, bx + 1, 15, 4, 4, '#222233');
        }

        // Crowd silhouettes
        for (const c of this.crowd) {
            const bounce = Math.sin(c.bounce) * 2;
            drawRect(ctx, c.x, c.y + bounce, 8, 14, c.color);
            drawRect(ctx, c.x + 1, c.y + bounce - 4, 6, 5, c.color);
        }

        // Justin + date in background (awkward!) - same scale as Hannah
        drawPerson(ctx, this.justinPos.x, this.justinPos.y, {
            hairColor: COLORS.brown,
            shirtColor: '#555577',
            pantsColor: '#2a2a3e',
            scale: 2,
            frame: this.frame,
        });
        drawPerson(ctx, this.justinPos.x + 18, this.justinPos.y, {
            isGirl: true,
            hairColor: '#aa5533',
            shirtColor: '#aa66aa',
            scale: 2,
            frame: this.frame,
        });
        drawText(ctx, 'Justin + ???', this.justinPos.x + 16, this.justinPos.y - 6, COLORS.red, 4);

        // Music notes (collectibles)
        for (const n of this.notes) {
            drawMusicNote(ctx, n.x, n.y, 8, COLORS.gold);
        }

        // Obstacles
        for (const o of this.obstacles) {
            drawRect(ctx, o.x, o.y, o.w, o.h, 'rgba(230, 110, 110, 0.7)');
            drawText(ctx, o.text, o.x + o.w/2, o.y + o.h/2, COLORS.white, 5);
        }

        // Player (Hannah)
        drawHannah(ctx, this.player.x - 2, this.player.y - 8, this.frame, 2, 'concert');

        // Thought bubble
        const thoughtBounce = Math.sin(this.timer * 0.06) * 2;
        drawRect(ctx, this.player.x - 6, this.player.y - 22 + thoughtBounce, 28, 10, COLORS.white);
        drawText(ctx, '...', this.player.x + 8, this.player.y - 17 + thoughtBounce, COLORS.dark, 5);

        // Particles
        for (const p of this.particles) p.draw(ctx);

        // UI
        drawText(ctx, `Notes: ${this.score}/${this.targetScore}`, WIDTH/2, HEIGHT - 8, COLORS.white, 6);

        // Health hearts
        for (let i = 0; i < 5; i++) {
            const c = i < this.health ? COLORS.pink : COLORS.darkGray;
            drawRect(ctx, 6 + i * 10, HEIGHT - 14, 6, 6, c);
        }

        // Touch buttons (visible on touch devices)
        if ('ontouchstart' in window) {
            const leftActive = input.mouse.down && input.mouse.x < WIDTH / 2;
            const rightActive = input.mouse.down && input.mouse.x >= WIDTH / 2;
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
