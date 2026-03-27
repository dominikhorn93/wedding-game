// Retro sound effects via Web Audio API - no files needed

let ctx = null;
let enabled = true;
let musicPlaying = false;
let musicGain = null;
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

// Noise burst (for impacts)
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

// === GAME SOUND EFFECTS ===

// Intro chime - magical/dreamy opening sound
export function sfxIntro() {
    // Soft ascending chime
    playTone(330, 0.3, 'sine', 0.06, 0);     // E
    playTone(392, 0.3, 'sine', 0.06, 0.2);   // G
    playTone(494, 0.3, 'sine', 0.06, 0.4);   // B
    playTone(587, 0.3, 'sine', 0.07, 0.6);   // D
    playTone(659, 0.4, 'sine', 0.08, 0.8);   // E high
    playTone(784, 0.5, 'sine', 0.08, 1.0);   // G high
    // Sparkle on top
    playTone(1319, 0.15, 'sine', 0.04, 1.2);
    playTone(1568, 0.2, 'sine', 0.03, 1.35);
}

// Typewriter tick - small blip for each character
export function sfxTypeTick() {
    if (!enabled) return;
    try {
        const ac = getCtx();
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        // Randomize pitch slightly for natural feel
        const freq = 800 + Math.random() * 400;
        osc.type = 'square';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.03, ac.currentTime);
        gain.gain.linearRampToValueAtTime(0, ac.currentTime + 0.02);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start();
        osc.stop(ac.currentTime + 0.025);
    } catch (e) { /* ignore */ }
}

export function sfxJump() {
    playSweep(250, 500, 0.12, 'square', 0.1);
}

export function sfxCollect() {
    playTone(880, 0.06, 'square', 0.1);
    playTone(1100, 0.08, 'square', 0.1, 0.06);
}

export function sfxCatchBox() {
    playTone(440, 0.05, 'square', 0.1);
    playTone(660, 0.08, 'square', 0.1, 0.05);
}

export function sfxDropBox() {
    playSweep(300, 100, 0.2, 'sawtooth', 0.1);
    playNoise(0.12, 0.06);
}

export function sfxHit() {
    playSweep(400, 120, 0.15, 'square', 0.1);
    playNoise(0.1, 0.05);
}

export function sfxHeartClick() {
    playTone(660, 0.05, 'sine', 0.12);
    playTone(880, 0.06, 'sine', 0.12, 0.04);
    playTone(1100, 0.08, 'sine', 0.1, 0.08);
}

export function sfxLandmark() {
    // Happy arpeggio
    playTone(523, 0.1, 'square', 0.1, 0);      // C
    playTone(659, 0.1, 'square', 0.1, 0.1);     // E
    playTone(784, 0.1, 'square', 0.1, 0.2);     // G
    playTone(1047, 0.15, 'square', 0.12, 0.3);  // C high
}

export function sfxLevelComplete() {
    // Victory fanfare
    playTone(523, 0.12, 'square', 0.1, 0);
    playTone(523, 0.12, 'square', 0.1, 0.15);
    playTone(523, 0.12, 'square', 0.1, 0.3);
    playTone(659, 0.15, 'square', 0.1, 0.45);
    playTone(784, 0.2, 'square', 0.12, 0.6);
    playTone(1047, 0.3, 'square', 0.12, 0.85);
}

export function sfxClick() {
    playTone(600, 0.04, 'square', 0.08);
}

export function sfxWedding() {
    // Wedding bells / chime
    playTone(1047, 0.3, 'sine', 0.1, 0);
    playTone(1319, 0.3, 'sine', 0.1, 0.15);
    playTone(1568, 0.3, 'sine', 0.1, 0.3);
    playTone(2093, 0.5, 'sine', 0.12, 0.45);
    playTone(1568, 0.3, 'sine', 0.08, 0.7);
    playTone(2093, 0.6, 'sine', 0.12, 0.85);
}

export function sfxPorsche() {
    // Engine rev
    playSweep(80, 200, 0.3, 'sawtooth', 0.08);
    playSweep(200, 350, 0.2, 'sawtooth', 0.06);
}

// === SIMPLE BACKGROUND MUSIC ===
// A gentle looping melody

const MELODY_NOTES = [
    // Simple romantic melody (note, duration, pause)
    [392, 0.3], // G
    [440, 0.3], // A
    [494, 0.3], // B
    [523, 0.5], // C
    [494, 0.3], // B
    [440, 0.3], // A
    [392, 0.5], // G
    [0, 0.3],   // rest
    [330, 0.3], // E
    [392, 0.3], // G
    [440, 0.3], // A
    [494, 0.5], // B
    [440, 0.3], // A
    [392, 0.3], // G
    [330, 0.5], // E
    [0, 0.5],   // rest
];

let melodyIndex = 0;

function playMelodyNote() {
    if (!musicPlaying || !enabled) return;
    const [freq, dur] = MELODY_NOTES[melodyIndex % MELODY_NOTES.length];
    if (freq > 0) {
        try {
            const ac = getCtx();
            const osc = ac.createOscillator();
            const gain = ac.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;

            if (!musicGain) {
                musicGain = ac.createGain();
                musicGain.connect(ac.destination);
            }
            musicGain.gain.value = 0.04;

            gain.gain.setValueAtTime(0, ac.currentTime);
            gain.gain.linearRampToValueAtTime(0.04, ac.currentTime + 0.02);
            gain.gain.linearRampToValueAtTime(0, ac.currentTime + dur * 0.9);
            osc.connect(gain);
            gain.connect(musicGain);
            osc.start();
            osc.stop(ac.currentTime + dur);
        } catch (e) { /* ignore */ }
    }
    melodyIndex++;
    musicTimeout = setTimeout(playMelodyNote, dur * 1000);
}

export function startMusic() {
    if (musicPlaying) return;
    musicPlaying = true;
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
