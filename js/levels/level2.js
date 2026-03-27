import { WIDTH, HEIGHT, COLORS, input, drawRect, drawText, rectsOverlap, clamp, randInt, randFloat, spawnParticles, Particle } from '../utils.js';
import { drawHannah, drawJustin, drawStar, drawHeart } from '../sprites.js';

// Level 2: Philly Nights - Side-scrolling run through Philly
export class Level2 {
    constructor() {
        this.complete = false;
        this.timer = 0;
        this.frame = 0;

        this.groundY = HEIGHT - 32;
        this.scrollX = 0;
        this.scrollSpeed = 1.2;
        this.totalLength = 2400;

        // Player
        this.player = {
            x: 50,
            y: this.groundY - 20,
            w: 16,
            h: 20,
            vy: 0,
            grounded: true,
            jumpPower: -4.5,
        };
        this.gravity = 0.18;

        // Landmarks along the route
        this.landmarks = [
            { name: 'Frankford Hall', desc: 'Beers with friends!', scrollX: 600, w: 70, h: 55, color: '#6a4a2a', roofColor: '#8a5a2a', reached: false },
            { name: 'Group Hangouts', desc: 'The crew is growing!', scrollX: 1300, w: 65, h: 50, color: '#4a2a6a', roofColor: '#6a3a8a', reached: false },
            { name: 'Boogie Nights', desc: 'Atlantic City baby!', scrollX: 2050, w: 75, h: 55, color: '#2a4a6a', roofColor: '#3a5a8a', reached: false },
        ];
        this.landmarksReached = 0;
        this.showLandmarkPopup = null;
        this.popupTimer = 0;

        // Collectible beers/stars along the route
        this.collectibles = [];
        this.score = 0;
        this.generateCollectibles();

        // Obstacles to jump over
        this.obstacles = [];
        this.generateObstacles();

        // Background city buildings (parallax)
        this.bgBuildings = [];
        for (let i = 0; i < 40; i++) {
            this.bgBuildings.push({
                x: i * 80 + randInt(-10, 10),
                w: randInt(30, 55),
                h: randInt(40, 80),
                color: ['#2a2a3e', '#332a3e', '#2a333e', '#3a3040', '#2a2a44'][randInt(0, 4)],
                windows: randInt(2, 4),
            });
        }

        // Street lamps
        this.lamps = [];
        for (let i = 0; i < 30; i++) {
            this.lamps.push({ x: 100 + i * 90 });
        }

        // Friends that join you (accumulate as you visit landmarks)
        this.friends = [];

        // Neon signs / city details
        this.neonSigns = [];
        for (let i = 0; i < 15; i++) {
            this.neonSigns.push({
                x: 200 + i * 170 + randInt(-30, 30),
                y: randInt(30, 60),
                text: ['BAR', 'OPEN', 'PUB', 'LIVE', 'EATS', 'BEER', 'CLUB'][randInt(0, 6)],
                color: [COLORS.pink, COLORS.blue, COLORS.green, COLORS.gold, COLORS.purple][randInt(0, 4)],
                phase: randFloat(0, Math.PI * 2),
            });
        }

        this.particles = [];

        // Stars in the sky
        this.stars = [];
        for (let i = 0; i < 50; i++) {
            this.stars.push({
                x: randFloat(0, WIDTH),
                y: randFloat(2, 50),
                twinkle: randFloat(0, Math.PI * 2),
                size: randInt(1, 2),
            });
        }

        // Hidden Porsche easter egg
        this.porsche = { scrollX: 1750, found: false, sparkleTimer: 0 };

        this.justJumped = false;
    }

    generateCollectibles() {
        // Place beer mugs and friendship stars along the route
        for (let x = 120; x < this.totalLength - 100; x += randInt(40, 80)) {
            // Skip areas near landmarks
            const nearLandmark = this.landmarks.some(l => Math.abs(x - l.scrollX) < 80);
            if (nearLandmark) continue;

            const isHigh = Math.random() > 0.5;
            this.collectibles.push({
                scrollX: x,
                y: isHigh ? this.groundY - 55 : this.groundY - 35,
                w: 8,
                h: 8,
                collected: false,
                type: Math.random() > 0.3 ? 'beer' : 'star',
            });
        }
    }

    generateObstacles() {
        for (let x = 180; x < this.totalLength - 100; x += randInt(80, 150)) {
            const nearLandmark = this.landmarks.some(l => Math.abs(x - l.scrollX) < 90);
            if (nearLandmark) continue;

            const type = randInt(0, 2);
            this.obstacles.push({
                scrollX: x,
                y: this.groundY,
                w: type === 0 ? 14 : type === 1 ? 18 : 12,
                h: type === 0 ? 12 : type === 1 ? 8 : 14,
                type, // 0=hydrant, 1=puddle, 2=cone
            });
        }
    }

    update(dt) {
        this.timer += dt;
        this.frame = Math.floor(this.timer / 10) % 2;

        // Landmark popup pause
        if (this.showLandmarkPopup) {
            this.popupTimer += dt;
            if (this.popupTimer > 100) {
                this.showLandmarkPopup = null;
                this.popupTimer = 0;
            }
            return;
        }

        // Auto-scroll
        this.scrollX += this.scrollSpeed * dt;

        // Jump
        const jumpPressed = input.keys['ArrowUp'] || input.keys['w'] || input.keys['W'] || input.keys[' '] || input.keys['Space'];
        const tapJump = input.mouse.clicked;

        if ((jumpPressed || tapJump) && this.player.grounded) {
            this.player.vy = this.player.jumpPower;
            this.player.grounded = false;
        }

        // Gravity
        if (!this.player.grounded) {
            this.player.vy += this.gravity * dt;
            this.player.y += this.player.vy * dt;

            if (this.player.y >= this.groundY - this.player.h) {
                this.player.y = this.groundY - this.player.h;
                this.player.vy = 0;
                this.player.grounded = true;
            }
        }

        // Check landmark collisions
        for (const lm of this.landmarks) {
            if (!lm.reached && this.scrollX > lm.scrollX - 60 && this.scrollX < lm.scrollX + lm.w) {
                lm.reached = true;
                this.landmarksReached++;
                this.showLandmarkPopup = lm;
                this.popupTimer = 0;

                // Add a friend
                this.friends.push({
                    offset: -20 - this.friends.length * 16,
                    color: ['#6a8a6a', '#8a6a6a', '#6a6a8a', '#8a8a6a'][this.friends.length % 4],
                    hair: ['#5a3a1a', '#2a1a0e', '#8a6a3a', '#3a2a1a'][this.friends.length % 4],
                });

                spawnParticles(this.particles, WIDTH / 2, HEIGHT / 2, 15,
                    [COLORS.gold, COLORS.pink, COLORS.green, COLORS.blue]);
            }
        }

        // Check collectible collisions
        const playerWorldX = this.scrollX + this.player.x;
        for (const c of this.collectibles) {
            if (c.collected) continue;
            if (Math.abs(c.scrollX - playerWorldX) < 14 &&
                Math.abs(c.y - this.player.y) < 18) {
                c.collected = true;
                this.score++;
                const screenX = c.scrollX - this.scrollX;
                spawnParticles(this.particles, screenX, c.y, 5,
                    c.type === 'beer' ? [COLORS.gold, COLORS.orange] : [COLORS.gold, COLORS.white]);
            }
        }

        // Check obstacle collisions
        for (const o of this.obstacles) {
            const ox = o.scrollX - this.scrollX;
            if (ox > -20 && ox < WIDTH) {
                if (rectsOverlap(
                    { x: this.player.x, y: this.player.y, w: this.player.w, h: this.player.h },
                    { x: ox, y: o.y - o.h, w: o.w, h: o.h }
                )) {
                    // Bump back slightly, lose a collectible
                    this.scrollX -= 3;
                    if (this.score > 0) this.score--;
                    spawnParticles(this.particles, this.player.x, this.player.y, 4,
                        [COLORS.red, COLORS.orange]);
                    o.scrollX -= 1000; // Remove obstacle
                }
            }
        }

        // Porsche easter egg
        if (!this.porsche.found) {
            const porscheScreenX = this.porsche.scrollX - this.scrollX;
            if (porscheScreenX > -10 && porscheScreenX < WIDTH &&
                Math.abs(this.porsche.scrollX - playerWorldX) < 30 &&
                this.player.y > this.groundY - 30) {
                this.porsche.found = true;
                this.porsche.sparkleTimer = 100;
                spawnParticles(this.particles, porscheScreenX + 16, this.groundY - 8, 10,
                    [COLORS.gold, COLORS.white, COLORS.orange]);
            }
        }
        if (this.porsche.sparkleTimer > 0) this.porsche.sparkleTimer -= dt;

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            if (this.particles[i].dead) this.particles.splice(i, 1);
        }

        // Star twinkle
        for (const s of this.stars) {
            s.twinkle += 0.03;
        }

        // Win condition
        if (this.scrollX >= this.totalLength && !this.showLandmarkPopup) {
            this.complete = true;
        }
    }

    draw(ctx) {
        // Night sky
        drawRect(ctx, 0, 0, WIDTH, HEIGHT, '#0e0e1e');
        drawRect(ctx, 0, 60, WIDTH, 30, '#121225');

        // Stars
        for (const s of this.stars) {
            const brightness = Math.sin(s.twinkle) * 0.3 + 0.6;
            ctx.globalAlpha = brightness;
            drawRect(ctx, s.x, s.y, s.size, s.size, '#ffffff');
        }
        ctx.globalAlpha = 1;

        // Moon
        drawRect(ctx, 40, 10, 12, 12, '#e8e4c8');
        drawRect(ctx, 42, 8, 8, 14, '#e8e4c8');
        drawRect(ctx, 38, 12, 14, 8, '#e8e4c8');
        // Moon crater
        drawRect(ctx, 44, 14, 3, 3, '#d8d4b8');

        // Background buildings (parallax - move at 0.3x speed)
        for (const b of this.bgBuildings) {
            const bx = b.x - this.scrollX * 0.3;
            const wrappedX = ((bx % (WIDTH + 200)) + WIDTH + 200) % (WIDTH + 200) - 100;
            const by = this.groundY - b.h;
            drawRect(ctx, wrappedX, by, b.w, b.h, b.color);
            // Windows
            for (let wy = 0; wy < b.windows; wy++) {
                for (let wx = 0; wx < 3; wx++) {
                    const winX = wrappedX + 5 + wx * (b.w / 3 - 2);
                    const winY = by + 6 + wy * 14;
                    if (winY < this.groundY - 10) {
                        const lit = ((wx + wy + Math.floor(b.x)) % 3 !== 0);
                        drawRect(ctx, winX, winY, 5, 5, lit ? '#ffee8866' : '#1a1a2e');
                    }
                }
            }
        }

        // Neon signs (parallax 0.5x)
        for (const n of this.neonSigns) {
            const nx = n.x - this.scrollX * 0.5;
            const wrappedNX = ((nx % (WIDTH + 200)) + WIDTH + 200) % (WIDTH + 200) - 100;
            const glow = Math.sin(this.timer * 0.06 + n.phase) * 0.3 + 0.5;
            ctx.globalAlpha = glow;
            drawText(ctx, n.text, wrappedNX, n.y, n.color, 5);
            ctx.globalAlpha = 1;
        }

        // Street lamps
        for (const lamp of this.lamps) {
            const lx = lamp.x - this.scrollX * 0.9;
            if (lx < -20 || lx > WIDTH + 20) continue;
            // Pole
            drawRect(ctx, lx, this.groundY - 40, 2, 40, '#555555');
            // Lamp head
            drawRect(ctx, lx - 3, this.groundY - 42, 8, 4, '#666666');
            // Light glow
            ctx.globalAlpha = 0.15;
            drawRect(ctx, lx - 12, this.groundY - 38, 26, 38, '#ffee88');
            ctx.globalAlpha = 0.06;
            drawRect(ctx, lx - 20, this.groundY - 30, 42, 30, '#ffee88');
            ctx.globalAlpha = 1;
            // Bulb
            drawRect(ctx, lx - 1, this.groundY - 39, 4, 2, '#ffee88');
        }

        // Landmarks
        for (const lm of this.landmarks) {
            const lx = lm.scrollX - this.scrollX;
            if (lx < -lm.w - 10 || lx > WIDTH + 10) continue;
            const ly = this.groundY - lm.h;

            // Building
            drawRect(ctx, lx, ly, lm.w, lm.h, lm.color);
            drawRect(ctx, lx + 2, ly + 2, lm.w - 4, lm.h - 4, lm.color);

            // Roof
            drawRect(ctx, lx - 3, ly - 4, lm.w + 6, 6, lm.roofColor);

            // Neon sign on building
            const glow = Math.sin(this.timer * 0.08 + lm.scrollX) * 0.2 + 0.8;
            ctx.globalAlpha = glow;
            drawText(ctx, lm.name, lx + lm.w / 2, ly - 10, COLORS.gold, 4);
            ctx.globalAlpha = 1;

            // Windows
            for (let wy = ly + 8; wy < ly + lm.h - 16; wy += 12) {
                for (let wx = lx + 6; wx < lx + lm.w - 8; wx += 14) {
                    drawRect(ctx, wx, wy, 8, 6, '#ffee88');
                    drawRect(ctx, wx + 1, wy + 1, 6, 4, '#ffe866');
                }
            }

            // Door with warm light
            drawRect(ctx, lx + lm.w / 2 - 6, ly + lm.h - 16, 12, 16, '#4a3020');
            drawRect(ctx, lx + lm.w / 2 - 4, ly + lm.h - 14, 8, 14, '#e8c870');
            ctx.globalAlpha = 0.15;
            drawRect(ctx, lx + lm.w / 2 - 10, ly + lm.h - 10, 20, 12, '#ffee88');
            ctx.globalAlpha = 1;

            // Star marker if not yet reached
            if (!lm.reached) {
                const bounce = Math.sin(this.timer * 0.08 + lm.scrollX) * 4;
                drawStar(ctx, lx + lm.w / 2 - 5, ly - 24 + bounce, 10, COLORS.gold);
            }
        }

        // Hidden Porsche
        const porscheX = this.porsche.scrollX - this.scrollX;
        if (porscheX > -40 && porscheX < WIDTH + 10) {
            this.drawPorsche(ctx, porscheX, this.groundY - 14);
            if (this.porsche.found && this.porsche.sparkleTimer > 0) {
                const alpha = Math.min(1, this.porsche.sparkleTimer / 30);
                ctx.globalAlpha = alpha;
                drawText(ctx, 'Nice car!', porscheX + 16, this.groundY - 22, COLORS.gold, 5);
                ctx.globalAlpha = 1;
            }
        }

        // Sidewalk
        drawRect(ctx, 0, this.groundY - 4, WIDTH, 4, '#555560');

        // Ground / street
        drawRect(ctx, 0, this.groundY, WIDTH, HEIGHT - this.groundY, '#333338');
        // Scrolling road markings
        for (let x = -(this.scrollX % 24); x < WIDTH; x += 24) {
            drawRect(ctx, x, this.groundY + 12, 12, 2, '#555550');
        }
        // Curb
        drawRect(ctx, 0, this.groundY - 1, WIDTH, 2, '#666668');

        // Obstacles
        for (const o of this.obstacles) {
            const ox = o.scrollX - this.scrollX;
            if (ox < -20 || ox > WIDTH + 20) continue;

            if (o.type === 0) {
                // Fire hydrant
                drawRect(ctx, ox + 3, o.y - o.h, 8, o.h, '#cc3333');
                drawRect(ctx, ox + 1, o.y - o.h + 2, 12, 3, '#dd4444');
                drawRect(ctx, ox + 5, o.y - o.h - 2, 4, 3, '#cc3333');
            } else if (o.type === 1) {
                // Puddle
                ctx.globalAlpha = 0.5;
                drawRect(ctx, ox, o.y - 2, o.w, 3, '#4466aa');
                drawRect(ctx, ox + 2, o.y - 3, o.w - 4, 2, '#5577bb');
                ctx.globalAlpha = 1;
            } else {
                // Traffic cone
                drawRect(ctx, ox + 3, o.y - o.h, 6, o.h, '#ff8833');
                drawRect(ctx, ox + 4, o.y - o.h + 3, 4, 2, '#ffffff');
                drawRect(ctx, ox + 4, o.y - o.h + 7, 4, 2, '#ffffff');
                drawRect(ctx, ox, o.y - 2, 12, 3, '#ff8833');
            }
        }

        // Collectibles
        for (const c of this.collectibles) {
            if (c.collected) continue;
            const cx = c.scrollX - this.scrollX;
            if (cx < -10 || cx > WIDTH + 10) continue;

            const bob = Math.sin(this.timer * 0.07 + c.scrollX * 0.1) * 2;

            if (c.type === 'beer') {
                // Beer mug pixel art
                const bx = cx, by = c.y + bob;
                drawRect(ctx, bx + 1, by, 6, 8, COLORS.gold);
                drawRect(ctx, bx + 2, by + 1, 4, 3, '#ffee88'); // foam
                drawRect(ctx, bx + 7, by + 2, 2, 4, COLORS.gold); // handle
                // Sparkle
                ctx.globalAlpha = Math.sin(this.timer * 0.1 + c.scrollX) * 0.3 + 0.4;
                drawRect(ctx, bx, by - 2, 1, 1, '#ffffff');
                ctx.globalAlpha = 1;
            } else {
                drawStar(ctx, cx, c.y + bob, 8, COLORS.gold);
            }
        }

        // Friends following behind
        for (let i = this.friends.length - 1; i >= 0; i--) {
            const f = this.friends[i];
            const fx = this.player.x + f.offset;
            const friendFrame = Math.floor(this.timer / 10 + i * 5) % 2;
            // Simple friend character
            drawRect(ctx, fx + 2, this.groundY - 18, 4, 4, f.hair); // head/hair
            drawRect(ctx, fx + 2, this.groundY - 14, 4, 3, COLORS.skin); // face
            drawRect(ctx, fx + 1, this.groundY - 11, 6, 6, f.color); // body
            const legOff = friendFrame === 0 ? 0 : 1;
            drawRect(ctx, fx + 1 - legOff, this.groundY - 5, 3, 5, '#2a2a3e');
            drawRect(ctx, fx + 4 + legOff, this.groundY - 5, 3, 5, '#2a2a3e');
        }

        // Player characters
        const py = this.player.y;
        drawHannah(ctx, this.player.x - 4, py - 8, this.frame, 1);
        drawJustin(ctx, this.player.x + 10, py - 8, this.frame, 1);

        // Jump effect
        if (!this.player.grounded) {
            ctx.globalAlpha = 0.3;
            drawRect(ctx, this.player.x, this.groundY - 2, 20, 2, '#ffffff');
            ctx.globalAlpha = 1;
        }

        // Particles
        for (const p of this.particles) p.draw(ctx);

        // --- UI ---

        // Progress bar (top)
        const progress = clamp(this.scrollX / this.totalLength, 0, 1);
        drawRect(ctx, 10, 6, WIDTH - 20, 5, '#222233');
        drawRect(ctx, 10, 6, (WIDTH - 20) * progress, 5, COLORS.gold);
        // Landmark markers on progress bar
        for (const lm of this.landmarks) {
            const lmProgress = lm.scrollX / this.totalLength;
            const lmX = 10 + (WIDTH - 20) * lmProgress;
            drawRect(ctx, lmX - 1, 4, 3, 9, lm.reached ? COLORS.green : COLORS.white);
        }
        // Player dot on progress bar
        const playerDot = 10 + (WIDTH - 20) * progress;
        drawRect(ctx, playerDot - 2, 3, 4, 11, COLORS.pink);

        // Score
        drawText(ctx, `${this.score}`, 24, 20, COLORS.gold, 6);
        // Beer icon next to score
        drawRect(ctx, 10, 16, 6, 8, COLORS.gold);
        drawRect(ctx, 11, 17, 4, 3, '#ffee88');

        // Landmarks visited
        drawText(ctx, `${this.landmarksReached}/3`, WIDTH - 20, 20, COLORS.white, 6);

        // Jump hint at start
        if (this.scrollX < 100) {
            const hintAlpha = Math.sin(this.timer * 0.06) * 0.3 + 0.6;
            ctx.globalAlpha = hintAlpha;
            drawText(ctx, 'UP / SPACE / TAP to jump!', WIDTH / 2, HEIGHT - 10, COLORS.white, 5);
            ctx.globalAlpha = 1;
        }

        // Landmark popup
        if (this.showLandmarkPopup) {
            const lm = this.showLandmarkPopup;
            const popAlpha = this.popupTimer < 10 ? this.popupTimer / 10 :
                this.popupTimer > 80 ? (100 - this.popupTimer) / 20 : 1;
            ctx.globalAlpha = popAlpha;

            drawRect(ctx, WIDTH / 2 - 90, HEIGHT / 2 - 30, 180, 60, COLORS.dark);
            drawRect(ctx, WIDTH / 2 - 88, HEIGHT / 2 - 28, 176, 56, '#1a1a3e');
            // Border glow
            drawRect(ctx, WIDTH / 2 - 90, HEIGHT / 2 - 30, 180, 2, COLORS.gold);
            drawRect(ctx, WIDTH / 2 - 90, HEIGHT / 2 + 28, 180, 2, COLORS.gold);

            drawText(ctx, lm.name, WIDTH / 2, HEIGHT / 2 - 12, COLORS.gold, 8);
            drawText(ctx, lm.desc, WIDTH / 2, HEIGHT / 2 + 6, COLORS.white, 5);

            // Celebration hearts
            for (let i = 0; i < 5; i++) {
                const hx = WIDTH / 2 - 40 + i * 20;
                const hy = HEIGHT / 2 + 18 + Math.sin(this.popupTimer * 0.08 + i) * 3;
                drawHeart(ctx, hx, hy, 6, COLORS.pink);
            }

            ctx.globalAlpha = 1;
        }
    }

    // Pixel art Porsche 911
    drawPorsche(ctx, x, y) {
        drawRect(ctx, x + 2, y + 14, 28, 2, 'rgba(0,0,0,0.3)');
        drawRect(ctx, x + 2, y + 6, 28, 6, '#c0c0c0');
        drawRect(ctx, x + 6, y + 3, 10, 4, '#c0c0c0');
        drawRect(ctx, x + 16, y + 4, 6, 3, '#c0c0c0');
        drawRect(ctx, x + 4, y + 2, 4, 2, '#c0c0c0');
        drawRect(ctx, x + 7, y + 3, 4, 3, '#6699bb');
        drawRect(ctx, x + 12, y + 3, 4, 3, '#6699bb');
        drawRect(ctx, x, y + 8, 4, 4, '#aaaaaa');
        drawRect(ctx, x + 28, y + 8, 3, 4, '#aaaaaa');
        drawRect(ctx, x, y + 6, 3, 2, '#ffee88');
        drawRect(ctx, x + 29, y + 7, 2, 2, '#ee4444');
        drawRect(ctx, x + 5, y + 11, 5, 4, '#222222');
        drawRect(ctx, x + 6, y + 12, 3, 2, '#666666');
        drawRect(ctx, x + 22, y + 11, 5, 4, '#222222');
        drawRect(ctx, x + 23, y + 12, 3, 2, '#666666');
        drawRect(ctx, x + 3, y + 7, 1, 1, COLORS.gold);
    }
}
