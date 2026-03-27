import { WIDTH, HEIGHT, input, initInput, clearInput, drawRect, drawText, COLORS } from './utils.js';
import { STORIES } from './story.js';
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

// Level flow definition
const FLOW = [
    { type: 'scene', create: () => new TitleScreen() },
    { type: 'story', key: 'level1_intro' },
    { type: 'level', create: () => new Level1() },
    { type: 'story', key: 'level1_outro' },
    { type: 'story', key: 'level2_intro' },
    { type: 'level', create: () => new Level2() },
    { type: 'story', key: 'level2_outro' },
    { type: 'story', key: 'level3_intro' },
    { type: 'level', create: () => new Level3() },
    { type: 'story', key: 'level3_outro' },
    { type: 'story', key: 'level4_intro' },
    { type: 'level', create: () => new Level4() },
    { type: 'story', key: 'level4_outro' },
    { type: 'story', key: 'level5_intro' },
    { type: 'level', create: () => new Level5() },
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

    function typeNext() {
        if (charIdx < allText.length) {
            textContent += allText[charIdx];
            storyTextEl.innerHTML = html + textContent.replace(/\n/g, '<br>');
            charIdx++;
            setTimeout(typeNext, allText[charIdx - 1] === '\n' ? 150 : 30);
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
        showStory(step.key);
    } else if (step.type === 'scene' || step.type === 'level') {
        hideStory();
        currentScene = SCENES.PLAYING;
        currentLevel = step.create();
    }
}

continueBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    advanceFlow();
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
        currentLevel.update(dt / FRAME_TIME);
        currentLevel.draw(ctx);

        if (currentLevel.complete) {
            advanceFlow();
        }
    }

    clearInput();
    requestAnimationFrame(gameLoop);
}

// Start
advanceFlow();
requestAnimationFrame(gameLoop);
