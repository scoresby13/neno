import { WORDS } from './words.js';

const NUMBER_OF_GUESSES = 6;
const WORD_LENGTH = 5;
const FLIP_DELAY = 300; // ms between each tile flip
const REVEAL_TIME = WORD_LENGTH * FLIP_DELAY + 250;

const DAY_MS = 86400000;
// The daily word changes at midnight East Africa Time (UTC+3)
const DAY_OFFSET_MS = 3 * 60 * 60 * 1000;
// Share numbering: 8 Jan 2026 is Neno #0
const FIRST_DAY = Date.UTC(2026, 0, 8) / DAY_MS;

// Swahili doesn't use Q or X
const KEYBOARD_ROWS = ["wertyuiop", "asdfghjkl", "zcvbnm"];
const LETTERS = new Set(KEYBOARD_ROWS.join(""));

const VALID_WORDS = new Set(WORDS);
// WORDS is alphabetical, so daily words follow a fixed shuffled order instead.
// Note: adding or removing words changes this order.
const DAILY_WORDS = seededShuffle(WORDS, 20260108);

const KEY_PRIORITY = { absent: 1, present: 2, correct: 3 };
const EMOJI = { correct: "🟩", present: "🟨", absent: "⬜" };

// Game State
let solution = ""; // The word to guess
let guesses = []; // Array of strings
let currentGuess = ""; // Current string being typed
let gameOver = false;
let isRevealing = false; // Block input while tiles flip
let gameMode = 'daily'; // 'daily' or 'unlimited'
let dailyIndex = null;
let countdownTimer = null;

// Initialization
document.addEventListener("DOMContentLoaded", () => {
    setupKeyboard();
    setupModals();
    setupButtons();
    initGame();
});

function seededShuffle(list, seed) {
    // mulberry32 PRNG, so every player gets the same order
    let a = seed;
    const random = () => {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const result = [...list];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

function getDayIndex() {
    return Math.floor((Date.now() + DAY_OFFSET_MS) / DAY_MS);
}

function setupModals() {
    document.querySelectorAll(".modal").forEach(modal => {
        // Close on click outside (on the backdrop) or on the X
        modal.addEventListener("click", (e) => {
            if (e.target === modal) modal.classList.remove("show");
        });
        modal.querySelector(".close-btn").onclick = () => modal.classList.remove("show");
    });

    const helpModal = document.getElementById("help-modal");
    document.getElementById("help-btn").onclick = () => helpModal.classList.add("show");

    document.getElementById("stats-btn").onclick = () => {
        renderStats(document.getElementById("stats-modal-body"));
        document.getElementById("stats-modal").classList.add("show");
    };

    // Show help on first visit
    if (!localStorage.getItem("neno_visited")) {
        helpModal.classList.add("show");
        localStorage.setItem("neno_visited", "true");
    }
}

function setupButtons() {
    const playUnlimited = () => {
        gameMode = 'unlimited';
        initGame();
    };
    document.getElementById("unlimited-btn").onclick = playUnlimited;
    document.getElementById("play-again-btn").onclick = playUnlimited;
    document.getElementById("persistent-next-btn").onclick = playUnlimited;

    document.getElementById("share-btn").onclick = shareResult;
    document.getElementById("persistent-share-btn").onclick = shareResult;

    document.getElementById("meaning-btn").onclick = openMeaning;
    document.getElementById("persistent-meaning-btn").onclick = openMeaning;
}

function initGame() {
    guesses = [];
    currentGuess = "";
    gameOver = false;
    isRevealing = false;
    let savedStatus = null;

    document.getElementById("game-over-modal").classList.remove("show");
    document.getElementById("game-controls").classList.add("hidden"); // Hide controls on new game

    if (gameMode === 'daily') {
        dailyIndex = getDayIndex();
        const savedData = loadDailyProgress(); // { guesses: [], status: 'IN_PROGRESS' | 'WIN' | 'LOSS', solution }
        if (savedData) {
            guesses = savedData.guesses;
            savedStatus = savedData.status;
            // Saves from before the shuffled order don't store the word; they used the alphabetical order
            solution = savedData.solution || WORDS[dailyIndex % WORDS.length];
        } else {
            solution = DAILY_WORDS[dailyIndex % DAILY_WORDS.length];
        }
    } else {
        solution = WORDS[Math.floor(Math.random() * WORDS.length)];
    }

    // Create Board grid
    const board = document.getElementById("board");
    board.innerHTML = "";
    for (let i = 0; i < NUMBER_OF_GUESSES; i++) {
        const row = document.createElement("div");
        row.className = "row";
        for (let j = 0; j < WORD_LENGTH; j++) {
            const tile = document.createElement("div");
            tile.className = "tile";
            row.appendChild(tile);
        }
        board.appendChild(row);
    }

    // Reset keyboard
    document.querySelectorAll(".key").forEach(key => delete key.dataset.state);

    // Restore earlier guesses instantly
    guesses.forEach((_, i) => revealRow(i, true));

    if (savedStatus === 'WIN' || savedStatus === 'LOSS') {
        gameOver = true;
        setTimeout(() => showResults(savedStatus === 'WIN'), 500);
    }
}

// Helper to save daily progress
function saveDailyProgress(status = "IN_PROGRESS") {
    const data = {
        dayIndex: dailyIndex,
        solution: solution,
        guesses: guesses,
        status: status
    };
    localStorage.setItem('neno_daily_progress', JSON.stringify(data));
}

function loadDailyProgress() {
    try {
        const data = JSON.parse(localStorage.getItem('neno_daily_progress'));
        if (data && data.dayIndex === dailyIndex) {
            return data;
        }
    } catch (e) {
        // Corrupt save, start fresh
    }
    return null;
}

// User Input Handling
document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return; // Leave browser shortcuts alone

    const key = e.key;
    if (key === "Enter") {
        // Stop Enter from also clicking whichever button has focus
        e.preventDefault();
        submitGuess();
    } else if (key === "Backspace") {
        deleteKey();
    } else if (key.length === 1 && LETTERS.has(key.toLowerCase())) {
        addKey(key.toLowerCase());
    }
});

function setupKeyboard() {
    const container = document.getElementById("keyboard-container");
    container.innerHTML = "";

    KEYBOARD_ROWS.forEach((rowString, index) => {
        const rowDiv = document.createElement("div");
        rowDiv.className = "keyboard-row";
        const isLastRow = index === KEYBOARD_ROWS.length - 1;

        if (isLastRow) {
            const enterKey = document.createElement("button");
            enterKey.className = "key wide";
            enterKey.textContent = "Enter";
            enterKey.onclick = submitGuess;
            rowDiv.appendChild(enterKey);
        }

        for (const char of rowString) {
            const button = document.createElement("button");
            button.className = "key";
            button.dataset.key = char;
            button.textContent = char;
            button.onclick = () => addKey(char);
            rowDiv.appendChild(button);
        }

        if (isLastRow) {
            const bsKey = document.createElement("button");
            bsKey.className = "key wide";
            bsKey.textContent = "⌫";
            bsKey.setAttribute("aria-label", "Futa (Backspace)");
            bsKey.onclick = deleteKey;
            rowDiv.appendChild(bsKey);
        }

        container.appendChild(rowDiv);
    });
}

function addKey(key) {
    if (gameOver || isRevealing) return;
    if (currentGuess.length < WORD_LENGTH) {
        currentGuess += key;
        updateBoard();
    }
}

function deleteKey() {
    if (gameOver || isRevealing) return;
    if (currentGuess.length > 0) {
        currentGuess = currentGuess.slice(0, -1);
        updateBoard();
    }
}

function updateBoard() {
    const row = document.getElementById("board").children[guesses.length];
    for (let i = 0; i < WORD_LENGTH; i++) {
        const tile = row.children[i];
        tile.textContent = currentGuess[i] || "";
        tile.setAttribute("data-state", currentGuess[i] ? "active" : "empty");
    }
}

function showToast(message) {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 2000);
}

function submitGuess() {
    if (gameOver || isRevealing) return;

    if (currentGuess.length !== WORD_LENGTH) {
        showToast("Haitoshi (Not enough letters)");
        shakeRow();
        return;
    }

    if (!VALID_WORDS.has(currentGuess)) {
        showToast("Si neno (Not in dictionary)");
        shakeRow();
        return;
    }

    const guess = currentGuess;
    guesses.push(guess);
    currentGuess = "";
    revealRow(guesses.length - 1, false);

    isRevealing = true;
    setTimeout(() => { isRevealing = false; }, REVEAL_TIME);

    const won = guess === solution;
    if (won || guesses.length === NUMBER_OF_GUESSES) {
        endGame(won);
    } else if (gameMode === 'daily') {
        saveDailyProgress();
    }
}

function shakeRow() {
    const row = document.getElementById("board").children[guesses.length];
    row.classList.add("shake");
    setTimeout(() => row.classList.remove("shake"), 500);
}

// Returns 'correct' | 'present' | 'absent' for each letter, handling repeated letters
function evaluateGuess(guess, answer) {
    const solutionChars = answer.split("");
    const guessChars = guess.split("");
    const states = new Array(WORD_LENGTH).fill("absent");

    // Pass 1: Correct
    for (let i = 0; i < WORD_LENGTH; i++) {
        if (guessChars[i] === solutionChars[i]) {
            states[i] = "correct";
            solutionChars[i] = null;
            guessChars[i] = null;
        }
    }
    // Pass 2: Present
    for (let i = 0; i < WORD_LENGTH; i++) {
        if (guessChars[i] && solutionChars.includes(guessChars[i])) {
            states[i] = "present";
            solutionChars[solutionChars.indexOf(guessChars[i])] = null;
        }
    }
    return states;
}

function revealRow(rowIndex, instant) {
    const guess = guesses[rowIndex];
    const row = document.getElementById("board").children[rowIndex];
    const states = evaluateGuess(guess, solution);

    states.forEach((state, i) => {
        const tile = row.children[i];
        tile.textContent = guess[i];

        if (instant) {
            tile.setAttribute("data-state", state);
            updateKey(guess[i], state);
            return;
        }

        setTimeout(() => {
            tile.classList.add("flip");
            tile.setAttribute("data-state", state);
        }, i * FLIP_DELAY);
        setTimeout(() => updateKey(guess[i], state), i * FLIP_DELAY + 250);
    });
}

// A key only ever upgrades: absent -> present -> correct
function updateKey(letter, state) {
    const key = document.querySelector(`.key[data-key='${letter}']`);
    if (key && KEY_PRIORITY[state] > (KEY_PRIORITY[key.dataset.state] || 0)) {
        key.dataset.state = state;
    }
}

function endGame(win) {
    gameOver = true;

    if (gameMode === 'daily') {
        saveDailyProgress(win ? "WIN" : "LOSS");
        recordDailyResult(win);
    }

    setTimeout(() => showResults(win), REVEAL_TIME);
}

function showResults(win) {
    const isDaily = gameMode === 'daily';

    document.getElementById("result-title").textContent = win ? getFeedback(guesses.length) : "Pole! (Game Over)";
    document.getElementById("solution-reveal").textContent = `Neno lilikuwa: ${solution.toUpperCase()}`; // The word was...
    renderStats(document.getElementById("stats"), isDaily && win ? guesses.length : null);

    // The daily can't be replayed, so offer unlimited mode instead
    document.getElementById("play-again-btn").style.display = isDaily ? 'none' : 'inline-block';
    document.getElementById("unlimited-btn").style.display = isDaily ? 'inline-block' : 'none';
    document.getElementById("persistent-next-btn").textContent = isDaily ? "Cheza Bila Kikomo ➡️" : "Cheza Tena ➡️";

    // Persistent controls stay visible behind the modal once it's closed
    document.getElementById("game-controls").classList.remove("hidden");
    document.getElementById("game-over-modal").classList.add("show");
}

function openMeaning() {
    window.open(`https://www.google.com/search?q=meaning+of+${solution}+in+swahili`, "_blank");
}

// Statistics (daily games only)
function loadStats() {
    const defaults = {
        gamesPlayed: 0,
        gamesWon: 0,
        currentStreak: 0,
        maxStreak: 0,
        guessDistribution: new Array(NUMBER_OF_GUESSES).fill(0),
        lastPlayedDay: null,
        lastWonDay: null
    };
    try {
        return { ...defaults, ...JSON.parse(localStorage.getItem('neno_stats')) };
    } catch (e) {
        return defaults;
    }
}

function recordDailyResult(win) {
    const stats = loadStats();
    if (stats.lastPlayedDay === dailyIndex) return; // Already counted today

    stats.lastPlayedDay = dailyIndex;
    stats.gamesPlayed++;
    if (win) {
        stats.gamesWon++;
        stats.guessDistribution[guesses.length - 1]++;
        stats.currentStreak = stats.lastWonDay === dailyIndex - 1 ? stats.currentStreak + 1 : 1;
        stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
        stats.lastWonDay = dailyIndex;
    } else {
        stats.currentStreak = 0;
    }
    localStorage.setItem('neno_stats', JSON.stringify(stats));
}

function renderStats(container, highlightGuesses = null) {
    const stats = loadStats();
    // A streak is broken once a whole day passes without a win
    const streakAlive = stats.lastWonDay !== null && stats.lastWonDay >= getDayIndex() - 1;
    const winPercent = stats.gamesPlayed ? Math.round(stats.gamesWon / stats.gamesPlayed * 100) : 0;
    const maxCount = Math.max(1, ...stats.guessDistribution);

    const summary = [
        [stats.gamesPlayed, "Michezo<br>(Played)"],
        [winPercent, "% Ushindi<br>(Win %)"],
        [streakAlive ? stats.currentStreak : 0, "Mfululizo<br>(Streak)"],
        [stats.maxStreak, "Bora<br>(Max Streak)"]
    ].map(([value, label]) =>
        `<div class="stat"><div class="stat-value">${value}</div><div class="stat-label">${label}</div></div>`
    ).join("");

    const distribution = stats.guessDistribution.map((count, i) => {
        const highlight = highlightGuesses === i + 1 ? " highlight" : "";
        const width = Math.max(8, Math.round(count / maxCount * 100));
        return `<div class="dist-row"><span class="dist-guess">${i + 1}</span>` +
            `<div class="dist-bar${highlight}" style="width: ${width}%">${count}</div></div>`;
    }).join("");

    container.innerHTML = `
        <h3>Takwimu (Statistics)</h3>
        <div class="stats-row">${summary}</div>
        <h3>Majaribio (Guess Distribution)</h3>
        <div class="distribution">${distribution}</div>
        <p class="countdown">Neno lijalo (Next word): <strong class="countdown-time"></strong></p>
    `;

    startCountdown();
}

function startCountdown() {
    const update = () => {
        const msLeft = DAY_MS - ((Date.now() + DAY_OFFSET_MS) % DAY_MS);
        const totalSeconds = Math.floor(msLeft / 1000);
        const time = [Math.floor(totalSeconds / 3600), Math.floor(totalSeconds / 60) % 60, totalSeconds % 60]
            .map(n => String(n).padStart(2, "0"))
            .join(":");
        document.querySelectorAll(".countdown-time").forEach(el => { el.textContent = time; });
    };
    update();
    clearInterval(countdownTimer);
    countdownTimer = setInterval(update, 1000);
}

function shareResult() {
    const title = gameMode === 'daily' ? `Neno #${dailyIndex - FIRST_DAY}` : 'Neno ∞'; // Infinity symbol for unlimited
    const won = guesses[guesses.length - 1] === solution;
    const score = won ? guesses.length : "X";
    const grid = guesses
        .map(guess => evaluateGuess(guess, solution).map(state => EMOJI[state]).join(""))
        .join("\n");

    // URL goes in the text itself so it survives "Copy" actions
    const fullText = `${title} ${score}/${NUMBER_OF_GUESSES}\n\n${grid}\n\n${window.location.href}`;

    if (navigator.share) {
        navigator.share({ title: 'Neno', text: fullText }).catch((err) => {
            // Cancelling the share sheet isn't an error
            if (err.name !== 'AbortError') copyToClipboard(fullText);
        });
    } else {
        copyToClipboard(fullText);
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => showToast("Imenakiliwa! (Copied to clipboard)"))
        .catch(() => showToast("Imeshindikana kunakili (Could not copy)"));
}

function getFeedback(attempts) {
    switch (attempts) {
        case 1: return "Gwiji! (Genius)";
        case 2: return "Bora Sana! (Magnificent)";
        case 3: return "Vizuri Sana! (Impressive)";
        case 4: return "Vizuri! (Splendid)";
        case 5: return "Sawa! (Great)";
        case 6: return "Hatimaye! (Phew)";
        default: return "Hongera! (Congratulations)";
    }
}
