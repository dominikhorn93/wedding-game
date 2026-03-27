import { WIDTH, HEIGHT, COLORS, input, drawRect, drawText, clamp, randInt, Particle, spawnParticles, lerp } from '../utils.js';
import { drawPerson } from '../sprites.js';
import { sfxSchunkel, sfxProst } from '../audio.js';

// Level: Oktoberfest - "Ein Prosit!" Schunkeln (swaying) rhythm game
// Sway left/right in sync with the pendulum to build the Stimmung meter.
// At 60 % Stimmung Dominik & Camilla join the beer tent!

export class LevelOktoberfest {
    constructor() {
        this.complete = false;
        this.failed = false;

        // Stimmung (atmosphere) meter — 0-100, start at 30
        this.stimmung = 30;

        // Pendulum
        this.swayTime = 0;
        this.swaySpeed = 0.055;
        this.swayPos = 0;          // -1 … +1

        // Hit-zone threshold (|swayPos| must exceed this)
        this.hitZone = 0.65;

        // Zone tracking
        this.canHitLeft = true;
        this.canHitRight = true;
        this.wasInLeft = false;
        this.wasInRight = false;

        // Key debounce
        this.prevLeft = false;
        this.prevRight = false;

        // Combo
        this.combo = 0;

        // Flash text
        this.flashText = '';
        this.flashTimer = 0;
        this.flashColor = COLORS.gold;

        // Hit/miss feedback
        this.hitFlash = 0;
        this.missFlash = 0;

        // Phases 0-3
        this.phase = 0;
        this.dominikCamillaArrived = false;
        this.dcArriveTime = -1;

        // Celebration (Prost!)
        this.celebrating = false;
        this.celebrateTimer = 0;

        // General
        this.timer = 0;
        this.particles = [];

        // Garland lights
        this.lights = [];
        for (let i = 0; i < 16; i++) {
            this.lights.push({
                x: 5 + i * 20,
                phase: i * 0.8,
                color: ['#ff4444', '#ffcc00', '#44dd44', '#4488ff', '#ff44ff'][i % 5],
            });
        }

        // Decorative floating pretzels
        this.pretzels = [];
        this.pretzelSpawnTimer = 0;

        // Bench-people sway offset
        this.benchSway = 0;

        // Hint countdown
        this.hintTimer = 240;
    }

    // ------------------------------------------------------------------ update
    update(dt) {
        this.timer += dt;

        // === celebration ===
        if (this.celebrating) {
            this.celebrateTimer += dt;
            if (Math.floor(this.celebrateTimer) % 4 === 0) {
                spawnParticles(this.particles, randInt(30, WIDTH - 30), randInt(10, 60), 2,
                    [COLORS.gold, COLORS.blue, '#ffffff', COLORS.pink, '#44dd44'], 2);
            }
            if (this.celebrateTimer > 200) this.complete = true;
            this.particles = this.particles.filter(p => { p.update(); return !p.dead; });
            return;
        }

        // === pendulum ===
        const speedMult = 1 + (this.stimmung / 100) * 0.3;
        this.swayTime += this.swaySpeed * dt * speedMult;
        this.swayPos = Math.sin(this.swayTime);
        this.benchSway = Math.sin(this.swayTime - 0.4) * 4;

        const inLeft  = this.swayPos < -this.hitZone;
        const inRight = this.swayPos >  this.hitZone;

        // Miss: left zone without hit
        if (this.wasInLeft && !inLeft && this.canHitLeft) this.onMiss();
        if (this.wasInRight && !inRight && this.canHitRight) this.onMiss();

        // Reset on zone entry
        if (inLeft  && !this.wasInLeft)  this.canHitLeft  = true;
        if (inRight && !this.wasInRight) this.canHitRight = true;

        this.wasInLeft  = inLeft;
        this.wasInRight = inRight;

        // === input (keyboard) ===
        const leftDown  = !!(input.keys['ArrowLeft']  || input.keys['a'] || input.keys['A']);
        const rightDown = !!(input.keys['ArrowRight'] || input.keys['d'] || input.keys['D']);
        const leftPressed  = leftDown  && !this.prevLeft;
        const rightPressed = rightDown && !this.prevRight;
        this.prevLeft  = leftDown;
        this.prevRight = rightDown;

        // Touch / click → left/right half
        const tapLeft  = input.mouse.clicked && input.mouse.x < WIDTH / 2;
        const tapRight = input.mouse.clicked && input.mouse.x >= WIDTH / 2;

        const wantLeft  = leftPressed  || tapLeft;
        const wantRight = rightPressed || tapRight;

        if (wantLeft && inLeft && this.canHitLeft) {
            this.onHit(); this.canHitLeft = false;
        } else if (wantRight && inRight && this.canHitRight) {
            this.onHit(); this.canHitRight = false;
        } else if ((wantLeft || wantRight) && !inLeft && !inRight) {
            this.onMiss();
        }

        // === win / fail (check BEFORE drain so 100% isn't lost) ===
        if (this.stimmung >= 100) {
            this.stimmung = 100;
            this.celebrating = true;
            this.celebrateTimer = 0;
            sfxProst();
            spawnParticles(this.particles, WIDTH / 2, 80, 50,
                [COLORS.gold, COLORS.blue, '#ffffff', COLORS.pink, '#44dd44'], 4);
        }

        // === drain ===
        this.stimmung = Math.max(0, this.stimmung - 0.008 * dt);

        // === phase milestones ===
        if (this.stimmung >= 40 && this.phase < 1) {
            this.phase = 1;
            this.showFlash('Stimmung steigt!', COLORS.gold);
        }
        if (this.stimmung >= 60 && this.phase < 2) {
            this.phase = 2;
            this.dominikCamillaArrived = true;
            this.dcArriveTime = this.timer;
            this.showFlash('Dominik & Camilla!', COLORS.pink);
            spawnParticles(this.particles, WIDTH / 2, HEIGHT / 2, 15,
                [COLORS.gold, COLORS.pink, '#ffffff'], 3);
        }
        if (this.stimmung >= 82 && this.phase < 3) {
            this.phase = 3;
            this.showFlash('OANS, ZWOA, DREI!', '#ffdd00');
        }

        if (this.stimmung <= 0) this.failed = true;

        // === timers ===
        if (this.flashTimer > 0) this.flashTimer -= dt;
        if (this.hitFlash  > 0) this.hitFlash  -= dt;
        if (this.missFlash > 0) this.missFlash -= dt;
        if (this.hintTimer > 0) this.hintTimer -= dt;

        // === floating pretzels (decorative) ===
        this.pretzelSpawnTimer += dt;
        if (this.pretzelSpawnTimer > 160 && this.pretzels.length < 2) {
            this.pretzelSpawnTimer = 0;
            this.pretzels.push({
                x: randInt(40, WIDTH - 40),
                y: -12,
                vy: 0.22 + Math.random() * 0.12,
                rot: Math.random() * Math.PI * 2,
            });
        }
        for (let i = this.pretzels.length - 1; i >= 0; i--) {
            const p = this.pretzels[i];
            p.y += p.vy * dt;
            p.rot += 0.015 * dt;
            if (p.y > HEIGHT + 15) this.pretzels.splice(i, 1);
        }

        // === particles ===
        this.particles = this.particles.filter(p => { p.update(); return !p.dead; });
    }

    onHit() {
        this.combo++;
        const bonus = Math.min(this.combo, 5);
        this.stimmung = clamp(this.stimmung + 4 + bonus, 0, 100);
        this.hitFlash = 10;
        sfxSchunkel();
        if (this.combo === 5)       this.showFlash('Wunderbar!', COLORS.gold);
        else if (this.combo === 10) this.showFlash('Fantastisch!', COLORS.pink);
        else if (this.combo === 20) this.showFlash('WAHNSINN!', '#ffff00');
    }

    onMiss() {
        if (this.combo > 0 || this.stimmung > 5) {
            this.combo = 0;
            this.stimmung = Math.max(0, this.stimmung - 2);
            this.missFlash = 10;
        }
    }

    showFlash(text, color) {
        this.flashText = text;
        this.flashColor = color;
        this.flashTimer = 90;
    }

    // -------------------------------------------------------------------- draw
    draw(ctx) {
        const sway  = this.benchSway;
        const frame = Math.floor(this.timer / 20) % 2;

        // ── sky ──
        drawRect(ctx, 0, 0, WIDTH, 12, '#0a0a2e');
        for (let i = 0; i < 8; i++) {
            drawRect(ctx, (i * 41 + 15) % WIDTH, 2 + (i * 7) % 8, 1, 1, '#ffffff');
        }

        // ── tent roof (Bavarian diamonds) ──
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 21; col++) {
                const blue = (row + col) % 2 === 0;
                drawRect(ctx, col * 16, 12 + row * 8, 16, 8, blue ? '#1155aa' : '#dde8ff');
            }
        }
        drawRect(ctx, 0, 44, WIDTH, 4, '#6B4F10');
        drawRect(ctx, 0, 45, WIDTH, 2, '#8B6914');

        // ── warm interior ──
        drawRect(ctx, 0, 48, WIDTH, HEIGHT - 48, '#1e1008');
        ctx.globalAlpha = 0.05;
        drawRect(ctx, 30, 52, WIDTH - 60, 90, '#ffaa44');
        ctx.globalAlpha = 1;
        for (let x = 0; x < WIDTH; x += 32) drawRect(ctx, x, 48, 1, HEIGHT - 48, '#150a04');

        // ── garland lights ──
        for (const l of this.lights) {
            const glow = 0.5 + 0.5 * Math.sin(this.timer * 0.06 + l.phase);
            const y = 52 + Math.sin(l.x * 0.04 + 0.5) * 4;
            drawRect(ctx, l.x, 48, 1, y - 47, '#445522');
            ctx.globalAlpha = 0.5 + glow * 0.5;
            drawRect(ctx, l.x - 2, y, 4, 4, l.color);
            ctx.globalAlpha = glow * 0.12;
            drawRect(ctx, l.x - 6, y - 4, 12, 12, l.color);
            ctx.globalAlpha = 1;
        }

        // ── "EIN PROSIT!" banner ──
        drawRect(ctx, WIDTH / 2 - 56, 62, 112, 14, '#6B4F10');
        drawRect(ctx, WIDTH / 2 - 55, 63, 110, 12, '#8B6914');
        drawText(ctx, 'EIN PROSIT!', WIDTH / 2, 69, '#ffeecc', 6);

        // ── back table ──
        const tableY = 112;
        drawRect(ctx, 15, tableY, WIDTH - 30, 5, '#8B6914');
        drawRect(ctx, 15, tableY + 1, WIDTH - 30, 2, '#A0791E');
        for (const lx of [25, 100, 180, WIDTH - 30]) drawRect(ctx, lx, tableY + 5, 3, 25, '#6B4F10');

        // ── back-row guests (behind table, same size as front row) ──
        this.drawGuest(ctx, 30 + sway * 0.7,  88, '#cc5533', '#442211', false, 1.8, frame);
        this.drawGuest(ctx, 90 + sway * 0.7,  90, '#5588bb', '#1a0a00', true,  1.8, frame);
        this.drawGuest(ctx, 210 + sway * 0.7, 88, '#aa5588', '#331a11', true,  1.8, frame);
        if (this.phase >= 1) {
            this.drawGuest(ctx, 155 + sway * 0.7, 89, '#55aa55', '#3a2a11', false, 1.8, frame);
            this.drawGuest(ctx, 265 + sway * 0.7, 90, '#ddaa44', '#221100', true,  1.8, frame);
        }

        // ── beer steins on table ──
        this.drawStein(ctx, 35,  tableY - 14);
        this.drawStein(ctx, 82,  tableY - 13);
        this.drawStein(ctx, 135, tableY - 14);
        this.drawStein(ctx, 195, tableY - 13);
        this.drawStein(ctx, 252, tableY - 14);

        // ── front bench ──
        const benchY = 150;
        drawRect(ctx, 10, benchY, WIDTH - 20, 4, '#8B6914');
        drawRect(ctx, 10, benchY + 1, WIDTH - 20, 1, '#A0791E');
        for (const lx of [18, WIDTH / 2, WIDTH - 23]) drawRect(ctx, lx, benchY + 4, 3, 10, '#6B4F10');

        // ── front-row: Hannah & Justin (always present, centre) ──
        // Hannah — blue Dirndl
        drawPerson(ctx, 132 + sway, benchY - 27, {
            hairColor: '#2a1a0e', shirtColor: '#2266bb',
            shoeColor: '#aa8855', skinColor: COLORS.skin,
            isGirl: true, scale: 1.8, frame,
        });
        // Justin — green shirt / Lederhosen
        drawPerson(ctx, 157 + sway, benchY - 28, {
            hairColor: COLORS.brown, shirtColor: '#448844',
            pantsColor: '#8B6914', shoeColor: '#5a3a0a',
            isGirl: false, scale: 1.8, frame,
        });

        // ── Dominik & Camilla (slide in at phase 2) ──
        if (this.dominikCamillaArrived) {
            const t = clamp((this.timer - this.dcArriveTime) / 60, 0, 1);
            // Dominik from left — braune Haare, blaues T-Shirt
            const domX = lerp(-20, 62, t) + sway;
            drawPerson(ctx, domX, benchY - 28, {
                hairColor: '#3a2511', shirtColor: '#3366bb',
                pantsColor: '#8B6914', shoeColor: '#4a2a05',
                isGirl: false, scale: 1.8, frame,
            });
            if (t >= 1) drawText(ctx, 'Dominik', domX + 10, benchY - 32, COLORS.gold, 3);

            // Camilla from right — blonde Haare, Dirndl
            const camX = lerp(WIDTH + 20, 218, t) + sway;
            drawPerson(ctx, camX, benchY - 27, {
                hairColor: '#d4a854', shirtColor: '#cc3355',
                shoeColor: '#aa7744', skinColor: COLORS.skin,
                isGirl: true, scale: 1.8, frame,
            });
            if (t >= 1) drawText(ctx, 'Camilla', camX + 10, benchY - 31, COLORS.pink, 3);
        }

        // ── floor ──
        drawRect(ctx, 0, benchY + 14, WIDTH, HEIGHT - benchY - 14, '#120804');
        for (let x = 0; x < WIDTH; x += 24) drawRect(ctx, x, benchY + 14, 1, HEIGHT - benchY - 14, '#0a0402');

        // ── sway indicator ──
        const indY = 175;
        const indW = 180;
        const indX = WIDTH / 2 - indW / 2;

        drawRect(ctx, indX - 1, indY - 1, indW + 2, 10, '#222233');
        drawRect(ctx, indX, indY, indW, 8, '#1a1a2e');

        const zoneW = Math.floor((1 - this.hitZone) / 2 * indW);
        const leftActive  = this.swayPos < -this.hitZone;
        const rightActive = this.swayPos >  this.hitZone;
        drawRect(ctx, indX, indY, zoneW, 8, leftActive ? '#44aa44' : '#1a3a1a');
        drawRect(ctx, indX + indW - zoneW, indY, zoneW, 8, rightActive ? '#44aa44' : '#1a3a1a');

        // hit / miss flash
        if (this.hitFlash > 0) {
            ctx.globalAlpha = this.hitFlash / 10;
            drawRect(ctx, indX, indY, zoneW, 8, '#88ff88');
            drawRect(ctx, indX + indW - zoneW, indY, zoneW, 8, '#88ff88');
            ctx.globalAlpha = 1;
        }
        if (this.missFlash > 0) {
            ctx.globalAlpha = this.missFlash / 10 * 0.5;
            drawRect(ctx, indX, indY, indW, 8, '#ff4444');
            ctx.globalAlpha = 1;
        }

        // pendulum marker
        const markerX = indX + (this.swayPos + 1) / 2 * indW;
        drawRect(ctx, markerX - 3, indY - 3, 6, 14, COLORS.gold);
        drawRect(ctx, markerX - 2, indY - 2, 4, 12, '#ffdd44');

        // direction arrows
        if (leftActive)  drawText(ctx, '<', indX - 10, indY + 4, '#66ff66', 7);
        if (rightActive) drawText(ctx, '>', indX + indW + 10, indY + 4, '#66ff66', 7);

        // ── STIMMUNG meter (top) ──
        const meterX = 40;
        const meterY = 3;
        const meterW = WIDTH - 80;
        const meterH = 8;
        drawRect(ctx, meterX - 1, meterY - 1, meterW + 2, meterH + 2, '#444455');
        drawRect(ctx, meterX, meterY, meterW, meterH, '#1a1a2e');
        const fillW = (this.stimmung / 100) * meterW;
        const mColor = this.stimmung > 80 ? '#ffaa00' : this.stimmung > 50 ? COLORS.gold : '#cc8833';
        drawRect(ctx, meterX, meterY, fillW, meterH, mColor);
        drawText(ctx, 'STIMMUNG', meterX - 2, meterY + 4, COLORS.white, 3, 'right');
        drawText(ctx, `${Math.floor(this.stimmung)}%`, meterX + meterW + 2, meterY + 4, COLORS.white, 3, 'left');

        // ── floating pretzels ──
        for (const p of this.pretzels) this.drawPretzel(ctx, p.x, p.y, p.rot);

        // ── combo ──
        if (this.combo >= 3) {
            const cc = this.combo >= 15 ? '#ffff00' : this.combo >= 10 ? COLORS.pink : COLORS.gold;
            drawText(ctx, `${this.combo}x`, WIDTH - 22, 56, cc, this.combo >= 15 ? 8 : 6);
        }

        // ── flash text ──
        if (this.flashTimer > 0) {
            const a = clamp(this.flashTimer / 30, 0, 1);
            const sz = clamp(Math.floor(8 + (90 - this.flashTimer) * 0.25), 6, 12);
            ctx.globalAlpha = a;
            drawText(ctx, this.flashText, WIDTH / 2, 86, this.flashColor, sz);
            ctx.globalAlpha = 1;
        }

        // ── hint ──
        if (this.hintTimer > 0) {
            ctx.globalAlpha = clamp(this.hintTimer / 60, 0, 0.9);
            drawText(ctx, 'Sway LEFT / RIGHT', WIDTH / 2, 192, COLORS.white, 4);
            drawText(ctx, 'in the green zones!', WIDTH / 2, 200, COLORS.lightGray, 3);
            ctx.globalAlpha = 1;
        }

        // ── particles ──
        for (const p of this.particles) p.draw(ctx);

        // ── celebration overlay ──
        if (this.celebrating) {
            ctx.fillStyle = 'rgba(10,10,25,0.4)';
            ctx.fillRect(0, 0, WIDTH, HEIGHT);
            const b = Math.sin(this.celebrateTimer * 0.08) * 5;
            drawText(ctx, 'PROST!', WIDTH / 2, 68 + b, COLORS.gold, 22);
            if (this.celebrateTimer > 50) {
                drawText(ctx, 'Ein Prosit der', WIDTH / 2, 100, COLORS.white, 6);
                drawText(ctx, 'Gemuetlichkeit!', WIDTH / 2, 114, COLORS.white, 6);
            }
            if (this.celebrateTimer > 100)
                drawText(ctx, 'Auf Hannah & Justin!', WIDTH / 2, 135, COLORS.pink, 5);
            if (this.celebrateTimer > 130) {
                const h = Math.sin(this.celebrateTimer * 0.1) * 3;
                drawText(ctx, 'Dominik & Camilla', WIDTH / 2, 155 + h, COLORS.gold, 5);
            }
        }
    }

    // ----------------------------------------------------------------- helpers
    drawStein(ctx, x, y) {
        drawRect(ctx, x, y, 10, 13, '#ccbb44');
        drawRect(ctx, x + 1, y + 1, 8, 11, '#ddcc55');
        drawRect(ctx, x + 2, y + 3, 6, 7, '#cc8800');   // beer
        drawRect(ctx, x + 1, y + 1, 8, 3, '#ffffee');    // foam
        drawRect(ctx, x + 10, y + 3, 2, 1, '#ccbb44');   // handle
        drawRect(ctx, x + 11, y + 3, 2, 7, '#ccbb44');
        drawRect(ctx, x + 10, y + 9, 2, 1, '#ccbb44');
    }

    drawPretzel(ctx, x, y, rot = 0) {
        ctx.save();
        ctx.translate(Math.floor(x), Math.floor(y));
        ctx.rotate(rot);
        ctx.fillStyle = '#c49050';
        ctx.fillRect(-6, -2, 12, 4);
        ctx.fillRect(-8, -6, 4, 5);
        ctx.fillRect(4,  -6, 4, 5);
        ctx.fillRect(-7, -8, 2, 3);
        ctx.fillRect(5,  -8, 2, 3);
        ctx.fillStyle = '#ffffee';   // salt
        ctx.fillRect(-3, -1, 1, 1);
        ctx.fillRect(2,  -1, 1, 1);
        ctx.fillRect(-6, -5, 1, 1);
        ctx.fillRect(5,  -5, 1, 1);
        ctx.restore();
    }

    drawGuest(ctx, x, y, shirt, hair, isGirl, scale, frame) {
        drawPerson(ctx, x, y, {
            hairColor: hair, shirtColor: shirt,
            pantsColor: isGirl ? undefined : '#8B6914',
            shoeColor: '#5a3a0a', skinColor: COLORS.skin,
            isGirl, scale, frame,
        });
    }
}
