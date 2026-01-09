import { WORDS } from './words.js';

const NUMBER_OF_GUESSES = 6;
const WORD_LENGTH = 5;

// Game State
let solution = ""; // The word to guess
let guesses = []; // Array of strings
let currentGuess = ""; // Current string being typed
let gameOver = false;
let gameMode = 'daily'; // 'daily' or 'unlimited'
let dailyIndex = null;

// Statistics (could be loaded from localStorage)
let stats = {
    gamesPlayed: 0,
    gamesWon: 0,
    currentStreak: 0,
    maxStreak: 0
};

// Initialization
document.addEventListener("DOMContentLoaded", () => {
    initGame();
    setupKeyboard();
    initGame();
    setupKeyboard();
    setupHelpModal();
});

function setupHelpModal() {
    const modal = document.getElementById("help-modal");
    const helpBtn = document.getElementById("help-btn");
    const closeBtn = modal.querySelector(".close-btn");

    // Close on click outside
    window.addEventListener("click", (e) => {
        if (e.target === modal) modal.classList.remove("show");
    });

    closeBtn.onclick = () => modal.classList.remove("show");
    helpBtn.onclick = () => modal.classList.add("show");

    // Show on first visit
    if (!localStorage.getItem("neno_visited")) {
        modal.classList.add("show");
        localStorage.setItem("neno_visited", "true");
    }
}

function initGame() {
    const board = document.getElementById("board");
    board.innerHTML = "";

    // Reset core vars
    guesses = [];
    currentGuess = "";
    gameOver = false;
    guesses = [];
    currentGuess = "";
    gameOver = false;
    document.getElementById("game-over-modal").classList.remove("show");
    document.getElementById("game-controls").classList.add("hidden"); // Hide controls on new game

    if (gameMode === 'daily') {
        const today = new Date();
        // Use UTC date to ensure global consistency or Local date?
        // Plan said: "Day Index using Epoch time / 24 hours" -> Global
        const dayIndex = Math.floor(Date.now() / 86400000);
        dailyIndex = dayIndex;

        solution = WORDS[dayIndex % WORDS.length];

        // Restore progress
        const savedData = loadDailyProgress(); // { guesses: [], status: 'IN_PROGRESS' | 'WIN' | 'LOSS' }

        if (savedData) {
            guesses = savedData.guesses;
            // Re-render board
            // We need to render rows for existing guesses
        }

    } else {
        // Unlimited
        solution = WORDS[Math.floor(Math.random() * WORDS.length)];
    }

    // Create Board grid
    for (let i = 0; i < NUMBER_OF_GUESSES; i++) {
        const row = document.createElement("div");
        row.className = "row";
        for (let j = 0; j < WORD_LENGTH; j++) {
            const tile = document.createElement("div");
            tile.className = "tile";
            // Pre-fill if we have restored guesses
            if (i < guesses.length) {
                tile.textContent = guesses[i][j];
                // We need to set colors too! 
                // But revealTileColors applies animation... we want instant restore.
            }
            row.appendChild(tile);
        }
        board.appendChild(row);
    }

    // If restoring, apply colors instantly
    if (gameMode === 'daily' && guesses.length > 0) {
        guesses.forEach((guess, i) => {
            revealTileColors(guess, true, i); // true = instant, pass row index
        });

        // Check if game was already over
        const savedData = loadDailyProgress();
        if (savedData && (savedData.status === 'WIN' || savedData.status === 'LOSS')) {
            gameOver = true;
            setTimeout(() => endGame(savedData.status === 'WIN'), 500);
        }
    }

    // Reset keyboard
    const keys = document.querySelectorAll(".key");
    keys.forEach(key => {
        key.style.backgroundColor = "";
    });

    // Hide modals
    document.getElementById("game-over-modal").classList.remove("show");
}

// Helper to save daily progress
function saveDailyProgress(status = "IN_PROGRESS") {
    const data = {
        dayIndex: dailyIndex,
        guesses: guesses,
        status: status
    };
    localStorage.setItem('neno_daily_progress', JSON.stringify(data));
}

function loadDailyProgress() {
    const data = JSON.parse(localStorage.getItem('neno_daily_progress'));
    if (data && data.dayIndex === dailyIndex) {
        return data;
    }
    return null;
}

// User Input Handling
document.addEventListener("keydown", (e) => {
    if (gameOver) return;

    const key = e.key;
    if (key === "Enter") {
        submitGuess();
    } else if (key === "Backspace") {
        deleteKey();
    } else if (/^[a-zA-Z]$/.test(key)) {
        addKey(key.toLowerCase());
    }
});

function setupKeyboard() {
    const rows = [
        "qwertyuiop",
        "asdfghjkl",
        "zxcvbnm"
    ];

    const container = document.getElementById("keyboard-container");
    container.innerHTML = "";

    rows.forEach((rowString, index) => {
        const rowDiv = document.createElement("div");
        rowDiv.className = "keyboard-row";

        // Add Enter buttons and Backspace to the last row for better mobile layout logic often used
        if (index === 2) {
            // Add Enter
            const enterKey = document.createElement("button");
            enterKey.className = "key wide";
            enterKey.textContent = "Enter";
            enterKey.onclick = submitGuess;
            rowDiv.appendChild(enterKey);
        }

        for (let char of rowString) {
            const button = document.createElement("button");
            button.className = "key";
            button.dataset.key = char;
            button.textContent = char;
            button.onclick = () => addKey(char);
            rowDiv.appendChild(button);
        }

        if (index === 2) {
            // Add Backspace
            const bsKey = document.createElement("button");
            bsKey.className = "key wide";
            bsKey.textContent = "⌫";
            bsKey.onclick = deleteKey;
            rowDiv.appendChild(bsKey);
        }

        container.appendChild(rowDiv);
    });
}

function addKey(key) {
    if (currentGuess.length < WORD_LENGTH) {
        currentGuess += key;
        updateBoard();
    }
}

function deleteKey() {
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
    toast.style.background = "white";
    toast.style.color = "black";
    toast.style.padding = "10px 20px";
    toast.style.borderRadius = "4px";
    toast.style.marginBottom = "5px";
    toast.style.fontWeight = "bold";
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 2000);
}

function submitGuess() {
    if (currentGuess.length !== WORD_LENGTH) {
        showToast("Haitoshi (Not enough letters)");
        shakeRow();
        return;
    }

    if (!WORDS.includes(currentGuess)) {
        showToast("Si neno (Not in dictionary)");
        shakeRow();
        return;
    }

    guesses.push(currentGuess);
    revealTileColors(currentGuess);

    if (currentGuess === solution) {
        endGame(true);
    } else if (guesses.length === NUMBER_OF_GUESSES) {
        if (gameMode === 'daily') saveDailyProgress("LOSS");
        endGame(false);
        return;
    } else {
        currentGuess = "";
    }

    // Save progress if daily
    if (gameMode === 'daily') saveDailyProgress();
}

function shakeRow() {
    const row = document.getElementById("board").children[guesses.length];
    row.classList.add("shake");
    setTimeout(() => row.classList.remove("shake"), 500);
}

// Better revealTileColors overwriting the whole function 
function revealTileColors(guess, instant = false, specificRowIndex = null) {
    const currentRowIndex = specificRowIndex !== null ? specificRowIndex : guesses.length - 1;
    const row = document.getElementById("board").children[currentRowIndex];

    // Check state logic (same as before)
    const solutionChars = solution.split("");
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
            const index = solutionChars.indexOf(guessChars[i]);
            solutionChars[index] = null;
        }
    }

    // Apply colors
    for (let i = 0; i < WORD_LENGTH; i++) {
        const tile = row.children[i];

        if (instant) {
            // No animation
            tile.classList.add("flip"); // Apply flipped style (if any) or just state
            tile.setAttribute("data-state", states[i]);

            // Update keyboard instantly
            const keyButton = document.querySelector(`.key[data-key='${guess[i]}']`);
            if (keyButton) {
                if (states[i] === 'correct') keyButton.style.backgroundColor = 'var(--color-correct)';
                else if (states[i] === 'present' && keyButton.style.backgroundColor !== 'var(--color-correct)') keyButton.style.backgroundColor = 'var(--color-present)';
                else if (states[i] === 'absent' && keyButton.style.backgroundColor !== 'var(--color-present)' && keyButton.style.backgroundColor !== 'var(--color-correct)') keyButton.style.backgroundColor = 'var(--color-absent)';
            }
        } else {
            // Animation logic (existing)
            setTimeout(() => {
                tile.classList.add("flip");
                tile.setAttribute("data-state", states[i]);
            }, i * 300);

            setTimeout(() => {
                const keyButton = document.querySelector(`.key[data-key='${guess[i]}']`);
                if (keyButton) {
                    if (states[i] === 'correct') keyButton.style.backgroundColor = 'var(--color-correct)';
                    else if (states[i] === 'present' && keyButton.style.backgroundColor !== 'var(--color-correct)') keyButton.style.backgroundColor = 'var(--color-present)';
                    else if (states[i] === 'absent' && keyButton.style.backgroundColor !== 'var(--color-present)' && keyButton.style.backgroundColor !== 'var(--color-correct)') keyButton.style.backgroundColor = 'var(--color-absent)';
                }
            }, (i * 300) + 250);
        }
    }
}

function endGame(win) {
    if (win) {
        showToast(getFeedback(guesses.length));
    }

    // Save final state for daily
    if (gameMode === 'daily') {
        saveDailyProgress(win ? "WIN" : "LOSS");
    }

    gameOver = true;
    setTimeout(() => {
        const modal = document.getElementById("game-over-modal");
        const title = document.getElementById("result-title");
        const reveal = document.getElementById("solution-reveal");
        const unlimitedBtn = document.getElementById("unlimited-btn");
        const playAgainBtn = document.getElementById("play-again-btn");
        const shareBtn = document.getElementById("share-btn"); // Added this line
        const meaningBtn = document.getElementById("meaning-btn"); // Added this line
        const closeResultsBtn = document.getElementById("game-over-close");

        title.textContent = win ? getFeedback(guesses.length) : "Pole! (Game Over)";

        reveal.textContent = `Neno lilikuwa: ${solution.toUpperCase()}`; // The word was...

        // Configure buttons based on mode
        if (gameMode === 'daily') {
            playAgainBtn.style.display = 'none'; // Cannot replay daily immediately
            unlimitedBtn.style.display = 'inline-block';

            // Allow replay if they want to treat it as "View Results" of today
            // Actually, if daily is done, "Cheza Tena" makes no sense unless it goes to unlimited
        } else {
            playAgainBtn.style.display = 'inline-block';
            unlimitedBtn.style.display = 'none'; // Already in unlimited
        }

        // Setup Button Listeners
        closeResultsBtn.onclick = () => {
            modal.classList.remove("show");
        };

        unlimitedBtn.onclick = () => {
            gameMode = 'unlimited';
            modal.classList.remove("show");
            initGame();
        };

        playAgainBtn.onclick = () => {
            modal.classList.remove("show");
            initGame();
        };

        shareBtn.onclick = shareResult;
        meaningBtn.onclick = () => {
            window.open(`https://www.google.com/search?q=meaning+of+${solution}+in+swahili`, "_blank");
        };

        modal.classList.add("show");

        // Show persistent controls (behind modal, visible when closed)
        const controls = document.getElementById("game-controls");
        controls.classList.remove("hidden");

        // Setup Persistent Buttons
        document.getElementById("persistent-share-btn").onclick = shareResult;
        document.getElementById("persistent-meaning-btn").onclick = () => {
            window.open(`https://www.google.com/search?q=meaning+of+${solution}+in+swahili`, "_blank");
        };

        const pNextBtn = document.getElementById("persistent-next-btn");
        if (gameMode === 'daily') {
            pNextBtn.innerHTML = "Cheza Bila Kikomo ➡️"; // Play Unlimited
            pNextBtn.onclick = () => {
                gameMode = 'unlimited';
                initGame();
            };
        } else {
            pNextBtn.innerHTML = "Cheza Tena ➡️"; // Play Again
            pNextBtn.onclick = () => {
                initGame();
            };
        }

    }, WORD_LENGTH * 300 + 500); // 1500 + 500 = 2000ms delay to wait for animation
}

function shareResult() {
    // Generate emoji grid
    let text = `Neno ${guesses.length}/${NUMBER_OF_GUESSES}\n\n`;
    for (const guess of guesses) {
        let rowStr = "";
        const solChars = solution.split("");
        // Re-calculate states for emojis
        // Note: For perfect accuracy we should reuse the logic in revealTileColors
        // But for simplicity of this snippet:
        // (This simple check is flawed for duplicate letters but sufficient for MVP visualization typically)
        // Let's copy logic from revealTileColors roughly or just store the states.
        // Actually, let's just cheat and check char by char for now, fixing duplicates is better.

        // Correct logic:
        const gChars = guess.split("");
        const sChars = solution.split("");
        const rowStates = new Array(5).fill("⬛"); // or ⬜

        // Green pass
        for (let i = 0; i < 5; i++) {
            if (gChars[i] === sChars[i]) {
                rowStates[i] = "🟩";
                sChars[i] = null;
                gChars[i] = null;
            }
        }
        // Yellow pass
        for (let i = 0; i < 5; i++) {
            if (gChars[i] !== null && sChars.includes(gChars[i])) {
                rowStates[i] = "🟨";
                sChars[sChars.indexOf(gChars[i])] = null;
            }
        }
        // Black pass
        for (let i = 0; i < 5; i++) {
            if (rowStates[i] === "⬛") rowStates[i] = "⬜"; // Use white for absent in dark mode
        }

        text += rowStates.join("") + "\n";
    }

    // Append URL to the text itself to ensure it survives "Copy" actions
    const fullText = text + "\n" + window.location.href;

    const shareData = {
        title: 'Neno',
        text: fullText
        // url: window.location.href // Intentionally omitted to force text sharing
    };

    if (navigator.share) {
        navigator.share(shareData).catch((err) => {
            console.error(err);
            // Fallback if share fails (e.g., user cancel or unsupported format)
            // But usually catch isn't triggered for simple cancel.
            // If it fails seriously, we try clipboard.
            navigator.clipboard.writeText(fullText);
            showToast("Imenakiliwa! (Copied to clipboard)");
        });
    } else {
        // Fallback
        navigator.clipboard.writeText(fullText);
        showToast("Imenakiliwa! (Copied to clipboard)");
    }
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
