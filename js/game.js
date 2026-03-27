import { WIDTH, HEIGHT, input, initInput, clearInput, drawRect, drawText, COLORS } from './utils.js';
import { STORIES } from './story.js';
import { sfxClick, sfxLevelComplete, sfxTypeTick, sfxHit, startMusic, stopMusic, toggleSound } from './audio.js';
import { TitleScreen } from './levels/title.js';
import { Level1 } from './levels/level1.js';
import { Level2 } from './levels/level2.js';
import { Level3 } from './levels/level3.js';
import { Level4 } from './levels/level4.js';
import { Level5 } from './levels/level5.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('ui-overlay');
const storyTextEl = document.getElementById('story-text');
const continueBtn = document.getElementById('continue-btn');

canvas.width = WIDTH;
canvas.height = HEIGHT;

// Disable smoothing for crisp pixels
ctx.imageSmoothingEnabled = false;

initInput(canvas);

// Game state
const SCENES = {
    TITLE: 'title',
    STORY: 'story',
    PLAYING: 'playing',
};

let currentScene = SCENES.TITLE;
let currentLevel = null;
let currentStoryKey = null;
let nextAction = null;
let levelIndex = 0;

// Retry state
let retryScreen = false;
let retryTimer = 0;
let lastLevelStep = null;

// Level flow definition
const FLOW = [
    { type: 'scene', create: () => new TitleScreen() },
    { type: 'story', key: 'level1_intro' },
    { type: 'level', create: () => new Level1(), music: 'moving' },
    { type: 'story', key: 'level1_outro' },
    { type: 'story', key: 'level2_intro' },
    { type: 'level', create: () => new Level2(), music: 'nightout' },
    { type: 'story', key: 'level2_outro' },
    { type: 'story', key: 'level3_intro' },
    { type: 'level', create: () => new Level3(), music: 'concert' },
    { type: 'story', key: 'level3_outro' },
    { type: 'story', key: 'level4_intro' },
    { type: 'level', create: () => new Level4(), music: 'date' },
    { type: 'story', key: 'level4_outro' },
    { type: 'story', key: 'level5_intro' },
    { type: 'level', create: () => new Level5(), music: 'wedding' },
    { type: 'story', key: 'finale' },
];

let flowIndex = 0;

function showStory(key) {
    const story = STORIES[key];
    currentScene = SCENES.STORY;
    overlay.classList.remove('hidden');
    overlay.classList.add('active');

    storyTextEl.innerHTML = '';
    continueBtn.classList.add('hidden');

    // Build text with title if present
    let html = '';
    if (story.title) {
        html += `<div style="color:${COLORS.gold};font-size:12px;margin-bottom:8px;">${story.title}</div>`;
    }
    if (story.subtitle) {
        html += `<div style="color:${COLORS.pink};font-size:8px;margin-bottom:16px;">${story.subtitle}</div>`;
    }

    // Typewriter effect
    let lineIdx = 0;
    let charIdx = 0;
    let textContent = '';
    const allText = story.lines.join('\n');

    let tickCounter = 0;
    function typeNext() {
        if (charIdx < allText.length) {
            const ch = allText[charIdx];
            textContent += ch;
            storyTextEl.innerHTML = html + textContent.replace(/\n/g, '<br>');
            charIdx++;
            // Play tick sound every 2nd visible character (not on spaces/newlines)
            if (ch !== ' ' && ch !== '\n') {
                tickCounter++;
                if (tickCounter % 2 === 0) sfxTypeTick();
            }
            setTimeout(typeNext, ch === '\n' ? 150 : 30);
        } else {
            continueBtn.classList.remove('hidden');
            continueBtn.classList.add('visible');
        }
    }

    typeNext();

    // Allow skipping by clicking on overlay
    const skipHandler = () => {
        if (charIdx < allText.length) {
            charIdx = allText.length;
            textContent = allText;
            storyTextEl.innerHTML = html + textContent.replace(/\n/g, '<br>');
            continueBtn.classList.remove('hidden');
            continueBtn.classList.add('visible');
        }
    };
    overlay.addEventListener('click', skipHandler, { once: false });

    // Store cleanup
    overlay._skipHandler = skipHandler;
}

function hideStory() {
    overlay.classList.add('hidden');
    overlay.classList.remove('active');
    continueBtn.classList.add('hidden');
    if (overlay._skipHandler) {
        overlay.removeEventListener('click', overlay._skipHandler);
        overlay._skipHandler = null;
    }
}

function advanceFlow() {
    if (flowIndex >= FLOW.length) {
        // Game complete - go back to title
        flowIndex = 0;
    }

    const step = FLOW[flowIndex];
    flowIndex++;

    if (step.type === 'story') {
        startMusic('default');
        showStory(step.key);
    } else if (step.type === 'scene' || step.type === 'level') {
        hideStory();
        currentScene = SCENES.PLAYING;
        currentLevel = step.create();
        lastLevelStep = step;
        if (step.music) startMusic(step.music);
    }
}

continueBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    sfxClick();
    advanceFlow();
});

// Sound toggle button (top-right, always visible)
const soundBtn = document.createElement('button');
soundBtn.id = 'sound-btn';
soundBtn.textContent = 'Sound: ON';
soundBtn.style.cssText = 'position:absolute;top:8px;right:8px;font-family:"Press Start 2P",monospace;font-size:6px;background:#222;color:#e6c86e;border:1px solid #e6c86e;padding:4px 8px;cursor:pointer;z-index:100;';
document.getElementById('game-container').appendChild(soundBtn);
soundBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const on = toggleSound();
    soundBtn.textContent = on ? 'Sound: ON' : 'Sound: OFF';
});

// Main game loop
let lastTime = 0;
const TARGET_FPS = 60;
const FRAME_TIME = 1000 / TARGET_FPS;

function gameLoop(timestamp) {
    const dt = Math.min(timestamp - lastTime, FRAME_TIME * 3);
    lastTime = timestamp;

    // Clear
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    if (currentScene === SCENES.PLAYING && currentLevel) {
        if (retryScreen) {
            // Draw frozen level behind
            currentLevel.draw(ctx);
            // Dark overlay
            ctx.fillStyle = 'rgba(10, 10, 25, 0.75)';
            ctx.fillRect(0, 0, WIDTH, HEIGHT);
            retryTimer += dt / FRAME_TIME;
            // Retry text
            const bounce = Math.sin(retryTimer * 0.06) * 2;
            drawText(ctx, 'Oops!', WIDTH/2, HEIGHT/2 - 20 + bounce, COLORS.pink, 14);
            if (retryTimer > 30) {
                drawText(ctx, 'Try again?', WIDTH/2, HEIGHT/2 + 10, COLORS.white, 8);
            }
            if (retryTimer > 50 && Math.floor(retryTimer / 20) % 2 === 0) {
                drawText(ctx, 'Click or press Enter', WIDTH/2, HEIGHT/2 + 30, COLORS.gold, 6);
            }
            // Retry on click/key
            if (retryTimer > 50 && (input.mouse.clicked || input.keys['Enter'] || input.keys[' '])) {
                retryScreen = false;
                retryTimer = 0;
                sfxClick();
                currentLevel = lastLevelStep.create();
                if (lastLevelStep.music) startMusic(lastLevelStep.music);
            }
        } else {
            currentLevel.update(dt / FRAME_TIME);
            currentLevel.draw(ctx);

            if (currentLevel.complete) {
                sfxLevelComplete();
                advanceFlow();
            }
            if (currentLevel.failed) {
                sfxHit();
                retryScreen = true;
                retryTimer = 0;
                stopMusic();
            }
        }
    }

    clearInput();
    requestAnimationFrame(gameLoop);
}

// Start
advanceFlow();
requestAnimationFrame(gameLoop);
