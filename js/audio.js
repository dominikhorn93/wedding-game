// Retro sound effects via Web Audio API - no files needed
// Each level has its own sound palette to match the mood

let ctx = null;
let enabled = true;
let musicPlaying = false;
let currentMelody = null;
let musicTimeout = null;

function getCtx() {
    if (!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctx.state === 'suspended') {
        ctx.resume();
    }
    return ctx;
}

// Mobile audio unlock: resume AudioContext on first user interaction
function unlockAudio() {
    getCtx();
    document.removeEventListener('touchstart', unlockAudio);
    document.removeEventListener('touchend', unlockAudio);
    document.removeEventListener('click', unlockAudio);
}
document.addEventListener('touchstart', unlockAudio, { once: false });
document.addEventListener('touchend', unlockAudio, { once: false });
document.addEventListener('click', unlockAudio, { once: false });

// Core: play a tone with envelope
function playTone(freq, duration = 0.1, type = 'square', volume = 0.15, delay = 0) {
    if (!enabled) return;
    try {
        const ac = getCtx();
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, ac.currentTime + delay);
        gain.gain.linearRampToValueAtTime(volume, ac.currentTime + delay + 0.01);
        gain.gain.linearRampToValueAtTime(0, ac.currentTime + delay + duration);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start(ac.currentTime + delay);
        osc.stop(ac.currentTime + delay + duration + 0.01);
    } catch (e) { /* ignore audio errors */ }
}

// Frequency sweep
function playSweep(startFreq, endFreq, duration = 0.15, type = 'square', volume = 0.12) {
    if (!enabled) return;
    try {
        const ac = getCtx();
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(startFreq, ac.currentTime);
        osc.frequency.linearRampToValueAtTime(endFreq, ac.currentTime + duration);
        gain.gain.setValueAtTime(volume, ac.currentTime);
        gain.gain.linearRampToValueAtTime(0, ac.currentTime + duration);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start();
        osc.stop(ac.currentTime + duration + 0.01);
    } catch (e) { /* ignore */ }
}

// Noise burst
function playNoise(duration = 0.08, volume = 0.08) {
    if (!enabled) return;
    try {
        const ac = getCtx();
        const bufferSize = ac.sampleRate * duration;
        const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }
        const source = ac.createBufferSource();
        const gain = ac.createGain();
        source.buffer = buffer;
        gain.gain.setValueAtTime(volume, ac.currentTime);
        gain.gain.linearRampToValueAtTime(0, ac.currentTime + duration);
        source.connect(gain);
        gain.connect(ac.destination);
        source.start();
    } catch (e) { /* ignore */ }
}

// ========================================
// GLOBAL UI SOUNDS
// ========================================

// Intro chime - magical/dreamy opening
export function sfxIntro() {
    playTone(330, 0.3, 'sine', 0.06, 0);
    playTone(392, 0.3, 'sine', 0.06, 0.2);
    playTone(494, 0.3, 'sine', 0.06, 0.4);
    playTone(587, 0.3, 'sine', 0.07, 0.6);
    playTone(659, 0.4, 'sine', 0.08, 0.8);
    playTone(784, 0.5, 'sine', 0.08, 1.0);
    playTone(1319, 0.15, 'sine', 0.04, 1.2);
    playTone(1568, 0.2, 'sine', 0.03, 1.35);
}

// Typewriter tick
export function sfxTypeTick() {
    if (!enabled) return;
    try {
        const ac = getCtx();
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'square';
        osc.frequency.value = 800 + Math.random() * 400;
        gain.gain.setValueAtTime(0.025, ac.currentTime);
        gain.gain.linearRampToValueAtTime(0, ac.currentTime + 0.018);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start();
        osc.stop(ac.currentTime + 0.02);
    } catch (e) { /* ignore */ }
}

export function sfxClick() {
    playTone(600, 0.04, 'square', 0.08);
}

// Victory fanfare (between levels)
export function sfxLevelComplete() {
    playTone(523, 0.12, 'square', 0.08, 0);
    playTone(523, 0.12, 'square', 0.08, 0.15);
    playTone(523, 0.12, 'square', 0.08, 0.3);
    playTone(659, 0.15, 'square', 0.08, 0.45);
    playTone(784, 0.2, 'square', 0.1, 0.6);
    playTone(1047, 0.3, 'square', 0.1, 0.85);
}

// ========================================
// LEVEL 1: THE BIG MOVE - Hot summer day
// Clunky, heavy, physical sounds
// ========================================

// Heavy box thud when caught
export function sfxCatchBox() {
    playTone(180, 0.06, 'square', 0.1);
    playNoise(0.04, 0.06);
    playTone(350, 0.08, 'sine', 0.06, 0.06); // small success chime
}

// Box crash on ground - cardboard crumple
export function sfxDropBox() {
    playSweep(250, 80, 0.15, 'sawtooth', 0.08);
    playNoise(0.15, 0.08);
    // Sad descending tone
    playTone(300, 0.08, 'square', 0.05, 0.05);
    playTone(200, 0.12, 'square', 0.05, 0.1);
}

// ========================================
// LEVEL 2: PHILLY NIGHTS - Upbeat city
// Bouncy, energetic, urban sounds
// ========================================

// Springy jump
export function sfxJump() {
    playSweep(200, 550, 0.1, 'square', 0.08);
    playTone(550, 0.04, 'sine', 0.04, 0.1);
}

// Coin-like beer/star collect
export function sfxCollect() {
    playTone(880, 0.05, 'square', 0.08);
    playTone(1175, 0.07, 'square', 0.08, 0.05);
}

// Trip/stumble on obstacle
export function sfxHit() {
    playSweep(350, 100, 0.12, 'square', 0.08);
    playNoise(0.08, 0.05);
    playTone(150, 0.1, 'square', 0.04, 0.08);
}

// Arrive at a bar/landmark - party horn
export function sfxLandmark() {
    playTone(523, 0.08, 'square', 0.08, 0);
    playTone(659, 0.08, 'square', 0.08, 0.08);
    playTone(784, 0.08, 'square', 0.08, 0.16);
    playTone(1047, 0.2, 'square', 0.1, 0.24);
    // Party sparkle
    playTone(1568, 0.08, 'sine', 0.04, 0.35);
    playTone(2093, 0.1, 'sine', 0.03, 0.4);
}

// Hidden porsche - engine rev
export function sfxPorsche() {
    playSweep(60, 150, 0.25, 'sawtooth', 0.06);
    playSweep(150, 300, 0.2, 'sawtooth', 0.05);
    playSweep(300, 500, 0.15, 'sawtooth', 0.04);
}

// ========================================
// LEVEL 3: CONCERT MIX-UP - Live music
// Musical, chaotic, bass-heavy
// ========================================

// Collect music note - actual musical tone
export function sfxMusicNote() {
    const notes = [523, 587, 659, 698, 784, 880];
    const note = notes[Math.floor(Math.random() * notes.length)];
    playTone(note, 0.12, 'sine', 0.1);
    playTone(note * 1.5, 0.08, 'sine', 0.04, 0.06); // harmonic
}

// Awkward moment hit - record scratch feel
export function sfxAwkward() {
    playSweep(800, 200, 0.1, 'sawtooth', 0.06);
    playNoise(0.06, 0.04);
    playTone(150, 0.15, 'square', 0.05, 0.05);
}

// ========================================
// LEVEL 4: REAL FIRST DATE - Romantic
// Warm, soft, glowing, heart sounds
// ========================================

// Heart click - warm ascending sparkle
export function sfxHeartClick() {
    playTone(523, 0.06, 'sine', 0.1);
    playTone(659, 0.06, 'sine', 0.1, 0.04);
    playTone(784, 0.08, 'sine', 0.1, 0.08);
    playTone(1047, 0.1, 'sine', 0.06, 0.12);
}

// Heart missed (expired) - soft sigh
export function sfxHeartMiss() {
    playSweep(500, 300, 0.15, 'sine', 0.04);
}

// Combo milestone
export function sfxCombo() {
    playTone(784, 0.05, 'sine', 0.08);
    playTone(988, 0.05, 'sine', 0.08, 0.05);
    playTone(1175, 0.05, 'sine', 0.08, 0.1);
    playTone(1568, 0.1, 'sine', 0.06, 0.15);
}

// ========================================
// OKTOBERFEST - Bavarian beer hall
// Cheerful, oom-pah, festive
// ========================================

// Sway hit - cheerful oom-pah accent
export function sfxSchunkel() {
    playTone(392, 0.08, 'square', 0.08);
    playTone(494, 0.06, 'sine', 0.06, 0.05);
}

// Grand cheers - glass clink + celebration chord
export function sfxProst() {
    playTone(2200, 0.04, 'sine', 0.06);
    playTone(3200, 0.03, 'sine', 0.04, 0.03);
    playTone(2800, 0.04, 'sine', 0.03, 0.06);
    playTone(523, 0.3, 'sine', 0.06, 0.1);
    playTone(659, 0.3, 'sine', 0.06, 0.1);
    playTone(784, 0.3, 'sine', 0.06, 0.1);
    playTone(1047, 0.4, 'sine', 0.08, 0.25);
}

// ========================================
// LEVEL 5: WEDDING DAY - Ceremonial
// Grand, elegant, bells, celebration
// ========================================

// Flower collect - light chime
export function sfxFlower() {
    playTone(1047, 0.08, 'sine', 0.06);
    playTone(1319, 0.1, 'sine', 0.05, 0.06);
}

// Jitters bump - gentle comedy
export function sfxJitters() {
    playTone(300, 0.06, 'square', 0.04);
    playTone(250, 0.08, 'square', 0.04, 0.05);
}

// Wedding ceremony - bells & triumph
export function sfxWedding() {
    // Bell chime pattern
    playTone(1047, 0.4, 'sine', 0.08, 0);
    playTone(1319, 0.4, 'sine', 0.08, 0.2);
    playTone(1568, 0.4, 'sine', 0.08, 0.4);
    playTone(2093, 0.6, 'sine', 0.1, 0.6);
    // Second ring
    playTone(1568, 0.3, 'sine', 0.06, 0.9);
    playTone(2093, 0.8, 'sine', 0.1, 1.1);
    // Triumphant chord underneath
    playTone(523, 0.8, 'sine', 0.04, 0.6);
    playTone(659, 0.8, 'sine', 0.04, 0.6);
    playTone(784, 0.8, 'sine', 0.04, 0.6);
}

// ========================================
// LEVEL-SPECIFIC BACKGROUND MUSIC
// Each level has its own melody loop
// ========================================

const MELODIES = {
    // Title / Story: gentle romantic
    default: {
        notes: [
            [392, 0.3], [440, 0.3], [494, 0.3], [523, 0.5],
            [494, 0.3], [440, 0.3], [392, 0.5], [0, 0.3],
            [330, 0.3], [392, 0.3], [440, 0.3], [494, 0.5],
            [440, 0.3], [392, 0.3], [330, 0.5], [0, 0.5],
        ],
        type: 'sine',
        volume: 0.035,
    },
    // L1: Upbeat working tune (hot day hauling boxes)
    moving: {
        notes: [
            [262, 0.2], [294, 0.2], [330, 0.2], [262, 0.2],
            [330, 0.2], [349, 0.2], [330, 0.4], [0, 0.2],
            [330, 0.2], [349, 0.2], [392, 0.2], [330, 0.2],
            [349, 0.2], [330, 0.2], [294, 0.4], [0, 0.2],
        ],
        type: 'square',
        volume: 0.025,
    },
    // L2: Fun city groove
    nightout: {
        notes: [
            [330, 0.15], [0, 0.05], [330, 0.15], [0, 0.05], [392, 0.2], [0, 0.1],
            [440, 0.15], [0, 0.05], [392, 0.2], [330, 0.3], [0, 0.2],
            [294, 0.15], [0, 0.05], [330, 0.15], [0, 0.05], [392, 0.2], [0, 0.1],
            [440, 0.2], [494, 0.2], [440, 0.3], [0, 0.3],
        ],
        type: 'square',
        volume: 0.025,
    },
    // L3: Tense/funny concert vibe
    concert: {
        notes: [
            [220, 0.2], [262, 0.2], [294, 0.2], [330, 0.3], [0, 0.1],
            [294, 0.2], [262, 0.2], [220, 0.3], [0, 0.2],
            [196, 0.2], [220, 0.2], [262, 0.3], [294, 0.2],
            [262, 0.2], [220, 0.3], [196, 0.3], [0, 0.3],
        ],
        type: 'sawtooth',
        volume: 0.02,
    },
    // L4: Soft romantic waltz
    date: {
        notes: [
            [392, 0.4], [494, 0.2], [523, 0.4], [0, 0.2],
            [587, 0.4], [523, 0.2], [494, 0.4], [0, 0.2],
            [440, 0.4], [494, 0.2], [523, 0.4], [0, 0.2],
            [587, 0.4], [659, 0.2], [587, 0.4], [0, 0.4],
        ],
        type: 'sine',
        volume: 0.035,
    },
    // Oktoberfest: Bavarian oom-pah polka
    oktoberfest: {
        notes: [
            [392, 0.2], [392, 0.2], [330, 0.2], [392, 0.4],
            [440, 0.2], [440, 0.2], [392, 0.2], [440, 0.4],
            [494, 0.2], [440, 0.2], [392, 0.2], [330, 0.2],
            [294, 0.2], [330, 0.2], [392, 0.4], [0, 0.3],
        ],
        type: 'square',
        volume: 0.028,
    },
    // L5: Grand wedding march
    wedding: {
        notes: [
            [523, 0.4], [0, 0.1], [523, 0.2], [523, 0.4], [0, 0.1],
            [659, 0.3], [587, 0.2], [523, 0.4], [0, 0.2],
            [587, 0.3], [659, 0.2], [698, 0.4], [0, 0.2],
            [659, 0.4], [0, 0.1], [587, 0.2], [523, 0.4], [0, 0.4],
        ],
        type: 'sine',
        volume: 0.035,
    },
};

let melodyIndex = 0;

function playMelodyNote() {
    if (!musicPlaying || !enabled) return;
    const melody = MELODIES[currentMelody] || MELODIES.default;
    const [freq, dur] = melody.notes[melodyIndex % melody.notes.length];
    if (freq > 0) {
        try {
            const ac = getCtx();
            const osc = ac.createOscillator();
            const gain = ac.createGain();
            osc.type = melody.type;
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, ac.currentTime);
            gain.gain.linearRampToValueAtTime(melody.volume, ac.currentTime + 0.02);
            gain.gain.linearRampToValueAtTime(0, ac.currentTime + dur * 0.9);
            osc.connect(gain);
            gain.connect(ac.destination);
            osc.start();
            osc.stop(ac.currentTime + dur);
        } catch (e) { /* ignore */ }
    }
    melodyIndex++;
    musicTimeout = setTimeout(playMelodyNote, dur * 1000);
}

export function startMusic(melodyName = 'default') {
    stopMusic();
    musicPlaying = true;
    currentMelody = melodyName;
    melodyIndex = 0;
    playMelodyNote();
}

export function stopMusic() {
    musicPlaying = false;
    if (musicTimeout) {
        clearTimeout(musicTimeout);
        musicTimeout = null;
    }
}

export function toggleSound() {
    enabled = !enabled;
    if (!enabled) stopMusic();
    return enabled;
}

export function isSoundEnabled() {
    return enabled;
}
