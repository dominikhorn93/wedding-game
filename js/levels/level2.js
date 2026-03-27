import { WIDTH, HEIGHT, COLORS, input, drawRect, drawText, rectsOverlap, clamp, randInt, randFloat, spawnParticles, Particle } from '../utils.js';
import { drawHannah, drawJustin, drawStar, drawHeart, drawPerson } from '../sprites.js';
import { sfxJump, sfxCollect, sfxHit, sfxLandmark, sfxPorsche } from '../audio.js';

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
            jumpPower: -5.0,
        };
        this.gravity = 0.16;

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

        this.failed = false;
        this.health = 4;

        // Stumble animation
        this.stumble = { active: false, timer: 0, text: '' };
        this.stumbleTexts = [
            'Oof!', 'Watch it!', 'Clumsy!', 'Ouch!',
            'My toe!', 'Who put that there?!', 'Whoa!', '*trips*',
        ];
        this.stumbleIndex = 0;
        this.tumbleAngle = 0;
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
        const types = [0, 1, 2, 3, 4]; // scooter, taxi, dog walker, street musician, drunk friend
        for (let x = 180; x < this.totalLength - 100; x += randInt(90, 160)) {
            const nearLandmark = this.landmarks.some(l => Math.abs(x - l.scrollX) < 90);
            if (nearLandmark) continue;

            const type = types[randInt(0, types.length - 1)];
            this.obstacles.push({
                scrollX: x,
                y: this.groundY,
                w: type === 1 ? 28 : type === 3 ? 16 : 14,
                h: type === 1 ? 14 : type === 4 ? 16 : 12,
                type,
                // 0=parked scooter, 1=taxi pulling up, 2=dog on leash
                // 3=street musician, 4=wobbly drunk friend
                wobble: randFloat(0, Math.PI * 2),
            });
        }
    }

    update(dt) {
        if (this.failed) return;
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
            sfxJump();
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
                sfxLandmark();
                this.landmarksReached++;
                this.showLandmarkPopup = lm;
                this.popupTimer = 0;

                // Add a friend (scale 2 = ~16px wide, offset accordingly)
                this.friends.push({
                    offset: -24 - this.friends.length * 20,
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
                sfxCollect();
                const screenX = c.scrollX - this.scrollX;
                spawnParticles(this.particles, screenX, c.y, 5,
                    c.type === 'beer' ? [COLORS.gold, COLORS.orange] : [COLORS.gold, COLORS.white]);
            }
        }

        // Check obstacle collisions (use tighter hitboxes matching visual sprites)
        for (const o of this.obstacles) {
            const ox = o.scrollX - this.scrollX;
            if (ox > -20 && ox < WIDTH) {
                // Hitbox matching visual per type
                let hx, hy, hw, hh;
                if (o.type === 1) { hx = ox + 2; hy = o.y - o.h; hw = o.w - 4; hh = o.h; } // taxi (wider)
                else { hx = ox + 2; hy = o.y - o.h; hw = o.w - 4; hh = o.h; }

                // Also shrink player hitbox slightly for fairness
                if (rectsOverlap(
                    { x: this.player.x + 3, y: this.player.y + 4, w: this.player.w - 6, h: this.player.h - 4 },
                    { x: hx, y: hy, w: hw, h: hh }
                )) {
                    // Stumble!
                    sfxHit();
                    this.health--;
                    this.scrollX -= 3;
                    if (this.health <= 0) this.failed = true;
                    spawnParticles(this.particles, this.player.x, this.player.y, 6,
                        [COLORS.red, COLORS.orange]);
                    o.scrollX -= 1000;
                    // Trigger stumble animation
                    this.stumble.active = true;
                    this.stumble.timer = 60;
                    this.stumble.text = this.stumbleTexts[this.stumbleIndex % this.stumbleTexts.length];
                    this.stumbleIndex++;
                    this.tumbleAngle = 0.4;
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
                sfxPorsche();
                this.porsche.sparkleTimer = 100;
                spawnParticles(this.particles, porscheScreenX + 16, this.groundY - 8, 10,
                    [COLORS.gold, COLORS.white, COLORS.orange]);
            }
        }
        if (this.porsche.sparkleTimer > 0) this.porsche.sparkleTimer -= dt;

        // Update stumble
        if (this.stumble.active) {
            this.stumble.timer -= dt;
            this.tumbleAngle *= 0.92;
            if (this.stumble.timer <= 0) {
                this.stumble.active = false;
                this.tumbleAngle = 0;
            }
        }

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
            this.drawPorsche(ctx, porscheX, this.groundY - 18);
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

            const oy = o.y;
            if (o.type === 0) {
                // Parked e-scooter (knocked over)
                const ty = oy - o.h;
                drawRect(ctx, ox + 2, ty + 2, 10, 2, '#555555');        // deck
                drawRect(ctx, ox + 1, ty, 3, 4, '#666666');             // handlebar post
                drawRect(ctx, ox, ty - 1, 5, 2, '#777777');             // handlebar
                drawRect(ctx, ox + 10, ty + 2, 3, 3, '#444444');        // rear
                drawRect(ctx, ox + 2, ty + 4, 4, 4, '#333333');         // front wheel
                drawRect(ctx, ox + 9, ty + 4, 4, 4, '#333333');         // rear wheel
                drawRect(ctx, ox + 3, ty + 5, 2, 2, '#555555');         // spoke
                drawRect(ctx, ox + 10, ty + 5, 2, 2, '#555555');
                // Blinking light
                if (Math.floor(this.timer / 20) % 2 === 0) {
                    drawRect(ctx, ox, ty - 2, 2, 2, '#44ff44');
                }
            } else if (o.type === 1) {
                // Taxi pulling up (side view)
                const ty = oy - o.h;
                // Body
                drawRect(ctx, ox, ty + 4, o.w, 8, '#f0cc00');
                drawRect(ctx, ox + 6, ty + 1, 10, 5, '#f0cc00');        // roof
                // Taxi sign on roof
                drawRect(ctx, ox + 9, ty - 1, 6, 3, '#ffffff');
                drawText(ctx, 'TAXI', ox + 12, ty, '#222222', 2);
                // Windows
                drawRect(ctx, ox + 7, ty + 2, 4, 3, '#88bbdd');
                drawRect(ctx, ox + 12, ty + 2, 3, 3, '#88bbdd');
                // Wheels
                drawRect(ctx, ox + 3, ty + 11, 5, 3, '#222222');
                drawRect(ctx, ox + 20, ty + 11, 5, 3, '#222222');
                // Headlights
                drawRect(ctx, ox + o.w - 1, ty + 6, 2, 2, '#ffee88');
                // Taillights
                drawRect(ctx, ox, ty + 6, 2, 2, '#ee3333');
            } else if (o.type === 2) {
                // Dog on leash (cute pixel dog)
                const ty = oy - o.h;
                // Leash post (going off screen to imaginary owner)
                drawRect(ctx, ox + 10, ty - 2, 1, 6, '#886644');
                // Dog body
                drawRect(ctx, ox + 2, ty + 3, 8, 5, '#bb8844');
                drawRect(ctx, ox + 3, ty + 4, 6, 3, '#cc9955');
                // Head
                drawRect(ctx, ox, ty + 2, 4, 4, '#bb8844');
                drawRect(ctx, ox, ty + 3, 3, 2, '#cc9955');
                // Ears
                drawRect(ctx, ox, ty + 1, 2, 2, '#aa7733');
                // Eye
                drawRect(ctx, ox + 1, ty + 3, 1, 1, '#222222');
                // Nose
                drawRect(ctx, ox - 1, ty + 4, 1, 1, '#333333');
                // Tail (wagging)
                const wagX = Math.sin(this.timer * 0.2 + (o.wobble || 0)) * 2;
                drawRect(ctx, ox + 10 + wagX, ty + 2, 2, 2, '#bb8844');
                // Legs
                drawRect(ctx, ox + 2, ty + 8, 2, 4, '#aa7733');
                drawRect(ctx, ox + 7, ty + 8, 2, 4, '#aa7733');
            } else if (o.type === 3) {
                // Street musician with open guitar case
                const ty = oy - 16;
                // Person
                drawRect(ctx, ox + 4, ty, 4, 4, '#553322');             // hat
                drawRect(ctx, ox + 5, ty + 4, 4, 3, COLORS.skin);      // face
                drawRect(ctx, ox + 4, ty + 7, 6, 6, '#664488');         // body
                drawRect(ctx, ox + 3, ty + 13, 3, 4, '#222233');        // legs
                drawRect(ctx, ox + 8, ty + 13, 3, 4, '#222233');
                // Guitar
                drawRect(ctx, ox + 1, ty + 8, 3, 6, '#884422');
                drawRect(ctx, ox + 1, ty + 6, 1, 4, '#aa8844');         // neck
                // Open case on ground with coins
                drawRect(ctx, ox - 1, oy - 3, 10, 3, '#333333');
                drawRect(ctx, ox, oy - 2, 8, 1, '#221111');
                // Coins
                drawRect(ctx, ox + 1, oy - 2, 2, 1, COLORS.gold);
                drawRect(ctx, ox + 5, oy - 2, 2, 1, '#cccccc');
                // Music notes floating
                const noteY = ty - 4 + Math.sin(this.timer * 0.08 + (o.wobble || 0)) * 3;
                drawRect(ctx, ox + 10, noteY, 2, 4, COLORS.gold);
                drawRect(ctx, ox + 12, noteY, 2, 1, COLORS.gold);
            } else {
                // Wobbly drunk friend stumbling
                const ty = oy - 16;
                const wobble = Math.sin(this.timer * 0.1 + (o.wobble || 0)) * 3;
                ctx.save();
                ctx.translate(ox + 7, oy);
                ctx.rotate(wobble * 0.06);
                ctx.translate(-(ox + 7), -oy);
                // Person stumbling
                drawRect(ctx, ox + 4, ty + 1, 4, 4, '#996633');         // hair
                drawRect(ctx, ox + 4, ty + 4, 5, 3, COLORS.skin);      // face
                drawRect(ctx, ox + 3, ty + 7, 7, 6, '#33aa55');         // green shirt
                drawRect(ctx, ox + 3, ty + 13, 3, 3, '#222233');        // legs
                drawRect(ctx, ox + 7, ty + 13, 3, 3, '#222233');
                // Arms out (balancing)
                drawRect(ctx, ox, ty + 8, 3, 2, COLORS.skin);
                drawRect(ctx, ox + 10, ty + 9, 3, 2, COLORS.skin);
                // Solo cup in hand
                drawRect(ctx, ox + 11, ty + 8, 3, 3, '#ffffff');
                drawRect(ctx, ox + 11, ty + 8, 3, 1, '#cc2222');
                ctx.restore();
                // Dizzy stars
                const starAngle = this.timer * 0.12 + (o.wobble || 0);
                const sx = ox + 7 + Math.cos(starAngle) * 8;
                const sy = ty - 2 + Math.sin(starAngle) * 4;
                drawRect(ctx, sx, sy, 2, 2, COLORS.gold);
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

        // Friends following behind (same size as player characters)
        for (let i = this.friends.length - 1; i >= 0; i--) {
            const f = this.friends[i];
            const fx = this.player.x + f.offset;
            const friendFrame = Math.floor(this.timer / 10 + i * 5) % 2;
            drawPerson(ctx, fx, this.groundY - 28, {
                hairColor: f.hair,
                shirtColor: f.color,
                pantsColor: '#2a2a3e',
                isGirl: i % 2 === 0,
                scale: 2,
                frame: friendFrame,
            });
        }

        // Player characters (with tumble rotation on stumble)
        const py = this.player.y;

        ctx.save();
        if (this.tumbleAngle > 0.01) {
            ctx.translate(this.player.x + 8, py);
            ctx.rotate(Math.sin(this.timer * 0.4) * this.tumbleAngle);
            ctx.translate(-(this.player.x + 8), -py);
        }
        drawHannah(ctx, this.player.x - 4, py - 8, this.frame, 2, 'nightout');
        drawJustin(ctx, this.player.x + 10, py - 8, this.frame, 2, 'nightout');
        ctx.restore();

        // Stumble speech bubble + dizzy stars
        if (this.stumble.active) {
            const fadeIn = Math.min(1, (60 - this.stumble.timer) / 8);
            const fadeOut = Math.min(1, this.stumble.timer / 12);
            const alpha = Math.min(fadeIn, fadeOut);
            const rise = (60 - this.stumble.timer) * 0.35;

            ctx.globalAlpha = alpha;
            // Speech bubble
            const bx = this.player.x + 10;
            const by = py - 20 - rise;
            const tw = this.stumble.text.length * 4.5 + 14;
            drawRect(ctx, bx - tw/2, by - 7, tw, 14, '#ffffff');
            drawRect(ctx, bx - 1, by + 6, 3, 3, '#ffffff');
            drawText(ctx, this.stumble.text, bx, by, COLORS.red, 4);
            ctx.globalAlpha = 1;

            // Dizzy stars
            ctx.globalAlpha = alpha * 0.9;
            for (let i = 0; i < 4; i++) {
                const angle = this.timer * 0.15 + i * (Math.PI / 2);
                const sx = this.player.x + 10 + Math.cos(angle) * 16;
                const sy = py - 10 + Math.sin(angle) * 5;
                drawRect(ctx, sx, sy, 2, 2, COLORS.gold);
                drawRect(ctx, sx + 1, sy - 1, 1, 1, '#ffffff');
            }
            ctx.globalAlpha = 1;
        }

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

        // Health hearts
        for (let i = 0; i < 4; i++) {
            const c = i < this.health ? COLORS.pink : '#333344';
            drawRect(ctx, WIDTH / 2 - 22 + i * 12, 16, 8, 8, c);
        }

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
    // Detailed Porsche 911 pixel art (side view, ~36x18)
    drawPorsche(ctx, x, y) {
        // Shadow on ground
        ctx.globalAlpha = 0.25;
        drawRect(ctx, x + 2, y + 16, 32, 2, '#000000');
        ctx.globalAlpha = 1;

        // Iconic 911 body - silver metallic
        // Lower body
        drawRect(ctx, x + 2, y + 7, 32, 6, '#b8b8c0');
        // Front fender (sloped hood)
        drawRect(ctx, x + 1, y + 5, 8, 4, '#c0c0c8');
        drawRect(ctx, x, y + 6, 4, 3, '#b0b0b8');
        // Roof section (low, sleek)
        drawRect(ctx, x + 8, y + 2, 12, 5, '#c8c8d0');
        // Rear sloping roofline (signature 911)
        drawRect(ctx, x + 20, y + 3, 4, 4, '#c0c0c8');
        drawRect(ctx, x + 24, y + 4, 3, 4, '#b8b8c0');
        // Rear deck / engine cover (flat back)
        drawRect(ctx, x + 27, y + 5, 6, 5, '#b0b0b8');
        // Rear spoiler hint
        drawRect(ctx, x + 28, y + 4, 5, 1, '#a0a0a8');

        // Windshield
        drawRect(ctx, x + 9, y + 2, 5, 4, '#4477aa');
        drawRect(ctx, x + 10, y + 3, 3, 2, '#5588bb'); // reflection
        // Rear window (small, sloped - classic 911)
        drawRect(ctx, x + 15, y + 2, 5, 4, '#4477aa');
        drawRect(ctx, x + 16, y + 3, 2, 2, '#5588bb');

        // Side window
        drawRect(ctx, x + 14, y + 3, 1, 3, '#b8b8c0'); // B-pillar

        // Front bumper
        drawRect(ctx, x - 1, y + 9, 4, 3, '#a0a0a8');
        // Rear bumper
        drawRect(ctx, x + 32, y + 9, 3, 3, '#a0a0a8');

        // Iconic round headlights
        drawRect(ctx, x - 1, y + 5, 3, 3, '#ffee66');
        drawRect(ctx, x, y + 6, 1, 1, '#ffffff');
        // Taillights (horizontal bar - modern 911)
        drawRect(ctx, x + 33, y + 6, 2, 2, '#ee2222');
        drawRect(ctx, x + 33, y + 8, 2, 1, '#ff4444');

        // Door line
        drawRect(ctx, x + 13, y + 5, 1, 7, '#a8a8b0');
        // Door handle
        drawRect(ctx, x + 15, y + 7, 2, 1, '#888890');

        // Side vent / intake
        drawRect(ctx, x + 22, y + 8, 4, 2, '#888890');
        drawRect(ctx, x + 23, y + 9, 2, 1, '#666670');

        // Wheels - detailed with spokes
        // Front wheel
        drawRect(ctx, x + 4, y + 12, 7, 5, '#1a1a1a');
        drawRect(ctx, x + 5, y + 13, 5, 3, '#333333');
        drawRect(ctx, x + 6, y + 14, 3, 1, '#888888'); // spoke
        drawRect(ctx, x + 7, y + 13, 1, 3, '#888888'); // spoke
        // Rear wheel (slightly bigger - RWD stance)
        drawRect(ctx, x + 24, y + 12, 8, 5, '#1a1a1a');
        drawRect(ctx, x + 25, y + 13, 6, 3, '#333333');
        drawRect(ctx, x + 27, y + 14, 3, 1, '#888888');
        drawRect(ctx, x + 28, y + 13, 1, 3, '#888888');

        // Porsche crest (tiny gold on front fender)
        drawRect(ctx, x + 3, y + 7, 2, 2, COLORS.gold);
        drawRect(ctx, x + 4, y + 8, 1, 1, '#cc0000');

        // Metallic shine highlights
        ctx.globalAlpha = 0.2;
        drawRect(ctx, x + 2, y + 5, 30, 1, '#ffffff');
        drawRect(ctx, x + 9, y + 2, 10, 1, '#ffffff');
        ctx.globalAlpha = 1;
    }
}
