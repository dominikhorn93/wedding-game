import { WIDTH, HEIGHT, COLORS, input, drawRect, drawText, rectsOverlap, clamp, randInt, randFloat, Particle, spawnParticles } from '../utils.js';
import { drawHannah, drawJustin, drawBox } from '../sprites.js';
import { sfxCatchBox, sfxDropBox } from '../audio.js';

// Level 1: The Big Move - Catch falling boxes
export class Level1 {
    constructor() {
        this.complete = false;
        this.failed = false;
        this.timer = 0;
        this.score = 0;
        this.targetScore = 15;
        this.missed = 0;
        this.maxMissed = 5;

        // Player (catching platform - Hannah & Justin together)
        this.player = {
            x: WIDTH / 2 - 16,
            y: HEIGHT - 50,
            w: 32,
            h: 16,
            speed: 3,
        };

        // Falling boxes
        this.boxes = [];
        this.spawnTimer = 0;
        this.spawnInterval = 50;
        this.minSpawnInterval = 25;

        // Particles
        this.particles = [];

        // Special box labels
        this.labels = ['', '', '', 'FRGILE', '', '', 'BOOKS', '', 'HEAVY', '', '', 'STUFF', '', '', ''];

        // Animation frame counter
        this.frame = 0;

        // Ground
        this.groundY = HEIGHT - 24;

        // Fumble animation state
        this.fumble = {
            active: false,
            timer: 0,
            text: '',
            x: 0,
        };
        this.fumbleTexts = [
            'Oops!', 'Butterfingers!', 'Too hungover!',
            'Flip flop fail!', 'Need coffee...', 'Zzz...',
            'Nope!', '*yawn*', 'Whoops!', 'My back!',
        ];
        this.fumbleIndex = 0;

        // Wobble for characters when fumbling
        this.wobble = 0;

        // Heat shimmer particles
        this.heatShimmer = [];
        for (let i = 0; i < 15; i++) {
            this.heatShimmer.push({
                x: randFloat(0, WIDTH),
                y: randFloat(40, this.groundY),
                phase: randFloat(0, Math.PI * 2),
                speed: randFloat(0.3, 0.8),
            });
        }
    }

    spawnBox() {
        const specialIdx = this.score;
        const label = this.labels[specialIdx] || '';
        this.boxes.push({
            x: randInt(10, WIDTH - 26),
            y: -16,
            w: 16,
            h: 16,
            speed: 0.8 + this.score * 0.05,
            label,
        });
    }

    update(dt) {
        if (this.failed) return;
        this.timer += dt;
        this.frame = Math.floor(this.timer / 15) % 2;

        // Spawn boxes
        this.spawnTimer += dt;
        const interval = Math.max(this.minSpawnInterval, this.spawnInterval - this.score * 2);
        if (this.spawnTimer >= interval) {
            this.spawnTimer = 0;
            this.spawnBox();
        }

        // Player movement
        const moveLeft = input.keys['ArrowLeft'] || input.keys['a'] || input.keys['A'];
        const moveRight = input.keys['ArrowRight'] || input.keys['d'] || input.keys['D'];

        if (input.mouse.down || input.touch.active) {
            const targetX = input.mouse.x - this.player.w / 2;
            if (Math.abs(targetX - this.player.x) > 2) {
                this.player.x += (targetX > this.player.x ? 1 : -1) * this.player.speed * dt * 1.5;
            }
        } else if (moveLeft) {
            this.player.x -= this.player.speed * dt;
        } else if (moveRight) {
            this.player.x += this.player.speed * dt;
        }
        this.player.x = clamp(this.player.x, 0, WIDTH - this.player.w);

        // Update boxes
        for (let i = this.boxes.length - 1; i >= 0; i--) {
            const box = this.boxes[i];
            box.y += box.speed * dt;

            if (rectsOverlap(box, {
                x: this.player.x - 4,
                y: this.player.y - 4,
                w: this.player.w + 8,
                h: this.player.h + 8
            })) {
                this.score++;
                sfxCatchBox();
                spawnParticles(this.particles, box.x + 8, box.y + 8, 6,
                    [COLORS.gold, COLORS.orange, COLORS.lightBrown]);
                this.boxes.splice(i, 1);
                continue;
            }

            if (box.y > this.groundY) {
                this.missed++;
                sfxDropBox();
                spawnParticles(this.particles, box.x + 8, this.groundY, 4,
                    [COLORS.red, COLORS.darkRed]);
                // Trigger fumble animation
                this.fumble.active = true;
                this.fumble.timer = 70;
                this.fumble.text = this.fumbleTexts[this.fumbleIndex % this.fumbleTexts.length];
                this.fumble.x = box.x;
                this.fumbleIndex++;
                this.wobble = 1.0;
                this.boxes.splice(i, 1);
            }
        }

        // Update fumble animation
        if (this.fumble.active) {
            this.fumble.timer -= dt;
            this.wobble *= 0.94;
            if (this.fumble.timer <= 0) {
                this.fumble.active = false;
                this.wobble = 0;
            }
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].dead) this.particles.splice(i, 1);
        }

        // Heat shimmer
        for (const h of this.heatShimmer) {
            h.phase += 0.04;
            h.y -= h.speed * dt * 0.3;
            if (h.y < 30) {
                h.y = this.groundY;
                h.x = randFloat(0, WIDTH);
            }
        }

        if (this.score >= this.targetScore) {
            this.complete = true;
        }

        if (this.missed >= this.maxMissed) {
            this.failed = true;
        }
    }

    draw(ctx) {
        // Hot summer sky - gradient from bright blue to hazy white
        drawRect(ctx, 0, 0, WIDTH, HEIGHT, '#87CEEB');
        drawRect(ctx, 0, 0, WIDTH, 15, '#6bb8e0');
        drawRect(ctx, 0, 15, WIDTH, 15, '#7ec4e6');
        drawRect(ctx, 0, 55, WIDTH, 20, '#a8daf0');
        // Hazy horizon
        drawRect(ctx, 0, 70, WIDTH, 10, '#c8e8f4');

        // Scorching sun (top right)
        drawRect(ctx, WIDTH - 35, 6, 20, 20, '#fff4a0');
        drawRect(ctx, WIDTH - 37, 10, 24, 12, '#fff4a0');
        drawRect(ctx, WIDTH - 33, 4, 16, 24, '#fff4a0');
        // Sun glow
        ctx.globalAlpha = 0.3 + Math.sin(this.timer * 0.03) * 0.1;
        drawRect(ctx, WIDTH - 42, 1, 34, 30, '#ffee88');
        ctx.globalAlpha = 1;

        // Sun rays
        ctx.globalAlpha = 0.08;
        for (let i = 0; i < 6; i++) {
            const angle = (this.timer * 0.005) + i * Math.PI / 3;
            const rx = WIDTH - 25 + Math.cos(angle) * 30;
            const ry = 16 + Math.sin(angle) * 30;
            drawRect(ctx, rx - 1, ry - 1, 3, 3, '#fff4a0');
        }
        ctx.globalAlpha = 1;

        // Background apartment building (left)
        this.drawApartment(ctx, 8, 30, 55, 50);

        // Background house (right side)
        this.drawHouse(ctx, WIDTH - 70, 45, 55, 35);

        // Background tree
        drawRect(ctx, 95, 48, 4, 32, '#6a5030');
        drawRect(ctx, 87, 35, 20, 18, '#4a8a4a');
        drawRect(ctx, 91, 30, 12, 12, '#5a9a5a');

        // Another small tree
        drawRect(ctx, 140, 55, 3, 25, '#6a5030');
        drawRect(ctx, 134, 45, 15, 14, '#4a8a4a');

        // Sidewalk / driveway
        drawRect(ctx, 0, this.groundY - 4, WIDTH, 4, '#b0a898');

        // Moving truck (parked on the street)
        this.drawMovingTruck(ctx, WIDTH / 2 - 48, this.groundY - 42);

        // Progress bar above truck
        const progress = this.score / this.targetScore;
        drawRect(ctx, WIDTH / 2 - 38, this.groundY - 48, 76, 5, COLORS.darkGray);
        drawRect(ctx, WIDTH / 2 - 38, this.groundY - 48, 76 * progress, 5, COLORS.green);
        drawRect(ctx, WIDTH / 2 - 38, this.groundY - 48, 76 * progress, 2, '#8ae89a');

        // Ground - hot asphalt street
        drawRect(ctx, 0, this.groundY, WIDTH, HEIGHT - this.groundY, '#555555');
        drawRect(ctx, 0, this.groundY, WIDTH, 1, '#666666');
        // Road markings
        for (let x = 0; x < WIDTH; x += 20) {
            drawRect(ctx, x + 4, this.groundY + 10, 10, 2, '#777766');
        }

        // Heat shimmer effect
        for (const h of this.heatShimmer) {
            const wobble = Math.sin(h.phase) * 2;
            ctx.globalAlpha = 0.06;
            drawRect(ctx, h.x + wobble, h.y, 2, 1, '#ffffff');
            ctx.globalAlpha = 1;
        }

        // Falling boxes
        for (const box of this.boxes) {
            drawBox(ctx, box.x, box.y, 16, box.label);
        }

        // Player characters (in flip flops!)
        const px = this.player.x;
        const py = this.player.y;

        // Wobble when fumbling
        const wobbleOffset = this.wobble * Math.sin(this.timer * 0.5) * 6;

        // Catching arms visual
        drawRect(ctx, px - 2, py + 10, this.player.w + 4, 3, COLORS.brown);
        drawRect(ctx, px - 2, py + 10, 3, 3, COLORS.skin);
        drawRect(ctx, px + this.player.w - 1, py + 10, 3, 3, COLORS.skin);

        ctx.save();
        ctx.translate(px + 8, py + 10);
        ctx.rotate(wobbleOffset * 0.05);
        ctx.translate(-(px + 8), -(py + 10));
        drawHannah(ctx, px - 4, py - 16, this.frame, 2, 'casual');
        ctx.restore();

        ctx.save();
        ctx.translate(px + 24, py + 10);
        ctx.rotate(-wobbleOffset * 0.05);
        ctx.translate(-(px + 24), -(py + 10));
        drawJustin(ctx, px + 16, py - 16, this.frame, 2, 'casual');
        ctx.restore();

        // Fumble reaction
        if (this.fumble.active) {
            const fadeIn = Math.min(1, (70 - this.fumble.timer) / 10);
            const fadeOut = Math.min(1, this.fumble.timer / 15);
            const alpha = Math.min(fadeIn, fadeOut);
            const rise = (70 - this.fumble.timer) * 0.4;

            ctx.globalAlpha = alpha;
            // Speech bubble
            const bubbleX = px + 16;
            const bubbleY = py - 28 - rise;
            const textW = this.fumble.text.length * 5 + 12;
            drawRect(ctx, bubbleX - textW/2, bubbleY - 7, textW, 14, '#ffffff');
            drawRect(ctx, bubbleX - textW/2 + 1, bubbleY - 6, textW - 2, 12, '#ffffff');
            // Bubble tail
            drawRect(ctx, bubbleX - 2, bubbleY + 6, 4, 3, '#ffffff');
            drawRect(ctx, bubbleX - 1, bubbleY + 8, 2, 2, '#ffffff');
            // Text
            drawText(ctx, this.fumble.text, bubbleX, bubbleY, COLORS.red, 5);
            ctx.globalAlpha = 1;

            // Dizzy stars around characters
            for (let i = 0; i < 3; i++) {
                const angle = this.timer * 0.12 + i * (Math.PI * 2 / 3);
                const sx = px + 16 + Math.cos(angle) * 14;
                const sy = py - 14 + Math.sin(angle) * 6;
                ctx.globalAlpha = alpha * 0.8;
                drawRect(ctx, sx, sy, 2, 2, COLORS.gold);
                drawRect(ctx, sx + 1, sy - 1, 1, 1, COLORS.gold);
                drawRect(ctx, sx - 1, sy + 1, 1, 1, COLORS.gold);
                ctx.globalAlpha = 1;
            }
        }

        // Sweat drops (it's scorching!)
        if (this.timer % 80 < 40) {
            ctx.globalAlpha = 0.7;
            drawRect(ctx, px + 2 + wobbleOffset * 0.5, py - 18 + (this.timer % 40) * 0.3, 1, 2, '#6bb8e0');
            drawRect(ctx, px + 24 - wobbleOffset * 0.5, py - 16 + ((this.timer + 20) % 40) * 0.3, 1, 2, '#6bb8e0');
            ctx.globalAlpha = 1;
        }

        // Particles
        for (const p of this.particles) p.draw(ctx);

        // UI - Box count
        drawText(ctx, `Boxes: ${this.score}/${this.targetScore}`, WIDTH/2, this.groundY + 18, COLORS.white, 6);

        // Missed indicator (top left)
        drawText(ctx, 'OOPS:', 20, 8, COLORS.white, 4);
        for (let i = 0; i < this.maxMissed; i++) {
            const c = i < this.missed ? COLORS.red : '#444444';
            drawRect(ctx, 44 + i * 8, 5, 5, 5, c);
        }
    }

    // Detailed apartment building
    drawApartment(ctx, x, y, w, h) {
        // Main structure
        drawRect(ctx, x, y, w, h, '#8a7060');
        drawRect(ctx, x + 1, y + 1, w - 2, h - 2, '#937a68');
        // Roof edge
        drawRect(ctx, x - 2, y - 3, w + 4, 4, '#6a5a4a');
        // Windows (3 floors, 3 columns)
        for (let fy = 0; fy < 3; fy++) {
            for (let fx = 0; fx < 3; fx++) {
                const wx = x + 6 + fx * 16;
                const wy = y + 6 + fy * 14;
                drawRect(ctx, wx, wy, 8, 8, '#1a1a3e');
                drawRect(ctx, wx + 1, wy + 1, 6, 6, '#3a4a6a');
                // Window frame
                drawRect(ctx, wx + 4, wy, 1, 8, '#7a6a5a');
                drawRect(ctx, wx, wy + 4, 8, 1, '#7a6a5a');
                // Some windows lit
                if ((fx + fy) % 3 === 0) {
                    ctx.globalAlpha = 0.3;
                    drawRect(ctx, wx + 1, wy + 1, 6, 6, '#ffee88');
                    ctx.globalAlpha = 1;
                }
            }
        }
        // Door
        drawRect(ctx, x + w/2 - 6, y + h - 14, 12, 14, '#5a4030');
        drawRect(ctx, x + w/2 - 4, y + h - 12, 8, 12, '#4a3020');
        drawRect(ctx, x + w/2 + 2, y + h - 7, 2, 2, COLORS.gold); // doorknob
        // Steps
        drawRect(ctx, x + w/2 - 8, y + h - 2, 16, 3, '#aaa098');
    }

    // Detailed house
    drawHouse(ctx, x, y, w, h) {
        // Main structure
        drawRect(ctx, x, y, w, h, '#c8b898');
        drawRect(ctx, x + 1, y + 1, w - 2, h - 2, '#d4c4a8');
        // Pitched roof
        for (let i = 0; i < 14; i++) {
            drawRect(ctx, x + w/2 - i * 2 - 1, y - i - 1, i * 4 + 2, 2, '#8a4030');
        }
        // Roof cap
        drawRect(ctx, x - 3, y - 1, w + 6, 3, '#7a3828');
        // Windows
        drawRect(ctx, x + 6, y + 8, 10, 10, '#1a1a3e');
        drawRect(ctx, x + 7, y + 9, 8, 8, '#5577aa');
        drawRect(ctx, x + 11, y + 8, 1, 10, '#c8b898');
        drawRect(ctx, x + 6, y + 13, 10, 1, '#c8b898');

        drawRect(ctx, x + w - 18, y + 8, 10, 10, '#1a1a3e');
        drawRect(ctx, x + w - 17, y + 9, 8, 8, '#5577aa');
        drawRect(ctx, x + w - 13, y + 8, 1, 10, '#c8b898');
        drawRect(ctx, x + w - 18, y + 13, 10, 1, '#c8b898');
        // Door
        drawRect(ctx, x + w/2 - 5, y + h - 16, 10, 16, '#6a4030');
        drawRect(ctx, x + w/2 - 3, y + h - 14, 6, 14, '#5a3525');
        drawRect(ctx, x + w/2 + 1, y + h - 8, 2, 2, COLORS.gold);
        // Doorstep
        drawRect(ctx, x + w/2 - 7, y + h - 1, 14, 2, '#aaa098');
        // Chimney
        drawRect(ctx, x + w - 14, y - 16, 6, 16, '#8a6050');
    }

    // Detailed moving truck
    drawMovingTruck(ctx, x, y) {
        const px = Math.floor(x);
        const py = Math.floor(y);
        // Cargo area - big box
        drawRect(ctx, px, py, 56, 36, '#e8e0d0');
        drawRect(ctx, px + 1, py + 1, 54, 34, '#d8d0c0');
        // Cargo door ridges
        for (let i = 0; i < 5; i++) {
            drawRect(ctx, px + 1, py + 4 + i * 6, 54, 1, '#c0b8a8');
        }
        // Cargo door handle
        drawRect(ctx, px + 24, py + 32, 8, 3, '#888888');
        // "MOVING" text on truck
        drawText(ctx, 'MOVING', px + 28, py + 16, '#888880', 5);
        // Cab
        drawRect(ctx, px + 56, py + 8, 28, 28, '#e05050');
        drawRect(ctx, px + 57, py + 9, 26, 26, '#d04040');
        // Windshield
        drawRect(ctx, px + 62, py + 12, 16, 10, '#88bbdd');
        drawRect(ctx, px + 63, py + 13, 14, 8, '#aaddee');
        // Windshield reflection
        ctx.globalAlpha = 0.3;
        drawRect(ctx, px + 64, py + 13, 4, 8, '#ffffff');
        ctx.globalAlpha = 1;
        // Side mirror
        drawRect(ctx, px + 55, py + 14, 3, 4, '#444444');
        // Fender
        drawRect(ctx, px + 56, py + 34, 28, 2, '#333333');
        // Wheels
        drawRect(ctx, px + 8, py + 34, 12, 7, '#222222');
        drawRect(ctx, px + 10, py + 35, 8, 5, '#444444');
        drawRect(ctx, px + 12, py + 36, 4, 3, '#666666'); // hubcap
        drawRect(ctx, px + 36, py + 34, 12, 7, '#222222');
        drawRect(ctx, px + 38, py + 35, 8, 5, '#444444');
        drawRect(ctx, px + 40, py + 36, 4, 3, '#666666');
        drawRect(ctx, px + 66, py + 34, 12, 7, '#222222');
        drawRect(ctx, px + 68, py + 35, 8, 5, '#444444');
        drawRect(ctx, px + 70, py + 36, 4, 3, '#666666');
        // Headlight
        drawRect(ctx, px + 82, py + 20, 3, 4, '#ffee88');
        // Taillight
        drawRect(ctx, px - 1, py + 28, 2, 4, '#ee4444');
        // License plate
        drawRect(ctx, px + 76, py + 30, 8, 4, '#ffffff');
        drawText(ctx, 'PA', px + 80, py + 32, '#333333', 3);
    }
}
