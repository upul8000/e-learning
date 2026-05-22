// --------------------------------------------------------------
// EXTERNAL DATA LOADING
// --------------------------------------------------------------
let phraseList = [];
let cluePool = [];
let currentPhraseIndex = 0;
let currentPhraseText = "";
let currentClues = [];
let currentLetterMap = {};

// Game state
let incorrectAttempts = 0;
let gameActive = true;
let gameWon = false;
let dataLoaded = false;

// DOM elements
const mainPhraseContainer = document.getElementById('main-phrase');
const cluesContainer = document.getElementById('clues-container');
const winMessageDiv = document.getElementById('win-message');
const statusMsgDiv = document.getElementById('status-message');
const attemptCounterSpan = document.getElementById('attempt-counter');
const checkBtn = document.getElementById('check-btn');
const resetBtn = document.getElementById('reset-btn');
const nextBtn = document.getElementById('next-btn');

// Helper functions
function getUniqueLetters(phraseText) {
    return new Set(phraseText.replace(/[^A-Z]/g, ''));
}

function getAllValidClues(phraseText) {
    const phraseLetters = getUniqueLetters(phraseText);
    const valid = [];
    for (let clue of cluePool) {
        const wordLetters = clue.word.toUpperCase();
        let allPresent = true;
        for (let ch of wordLetters) {
            if (!phraseLetters.has(ch)) {
                allPresent = false;
                break;
            }
        }
        if (allPresent) valid.push(clue);
    }
    return valid;
}

function selectCoveringClues(phraseText, maxClues = 6) {
    const phraseLettersSet = getUniqueLetters(phraseText);
    const requiredLetters = new Set(phraseLettersSet);
    const validClues = getAllValidClues(phraseText);
    
    if (validClues.length === 0) return [];
    
    const sortedClues = [...validClues].sort((a, b) => a.word.length - b.word.length);
    const selected = [];
    const covered = new Set();
    
    while (covered.size < requiredLetters.size && selected.length < maxClues) {
        let bestClue = null;
        let bestNewCoverage = 0;
        
        for (let clue of sortedClues) {
            if (selected.includes(clue)) continue;
            const clueLetters = new Set(clue.word.toUpperCase().split(''));
            let newCount = 0;
            for (let letter of clueLetters) {
                if (requiredLetters.has(letter) && !covered.has(letter)) newCount++;
            }
            if (newCount > bestNewCoverage) {
                bestNewCoverage = newCount;
                bestClue = clue;
            }
        }
        
        if (bestClue === null) break;
        
        selected.push(bestClue);
        const newLetters = new Set(bestClue.word.toUpperCase().split(''));
        for (let letter of newLetters) {
            if (requiredLetters.has(letter)) covered.add(letter);
        }
    }
    
    if (covered.size < requiredLetters.size) {
        for (let clue of validClues) {
            const clueLetters = new Set(clue.word.toUpperCase().split(''));
            let missing = false;
            for (let letter of requiredLetters) {
                if (!covered.has(letter) && clueLetters.has(letter)) {
                    covered.add(letter);
                    missing = true;
                }
            }
            if (missing && !selected.includes(clue)) selected.push(clue);
            if (covered.size === requiredLetters.size) break;
        }
    }
    
    return selected;
}

function buildLetterMap(phraseText) {
    const uniqueLetters = [...new Set(phraseText.replace(/[^A-Z]/g, ''))];
    const map = {};
    uniqueLetters.forEach((letter, idx) => { map[letter] = idx + 1; });
    return map;
}

// NEW FUNCTION: Display solved phrase as normal text
function displaySolvedPhrase() {
    mainPhraseContainer.innerHTML = '';
    
    const words = currentPhraseText.split(' ');
    words.forEach(word => {
        const wordBlock = document.createElement('div');
        wordBlock.className = 'word-block solved-word';
        
        // Create a span for the entire word
        const wordSpan = document.createElement('span');
        wordSpan.className = 'solved-word-text';
        wordSpan.textContent = word;
        wordBlock.appendChild(wordSpan);
        
        mainPhraseContainer.appendChild(wordBlock);
    });
}

// NEW FUNCTION: Display solved clues as normal text
function displaySolvedClues() {
    cluesContainer.innerHTML = '';
    
    currentClues.forEach(clue => {
        const row = document.createElement('div');
        row.className = 'clue-row solved-clue-row';
        
        const textDiv = document.createElement('div');
        textDiv.className = 'clue-text';
        textDiv.innerHTML = `<strong>Definition:</strong> ${clue.definition}`;
        
        const answerDiv = document.createElement('div');
        answerDiv.className = 'solved-answer';
        answerDiv.innerHTML = `<strong>Answer:</strong> ${clue.word.toUpperCase()}`;
        
        row.appendChild(textDiv);
        row.appendChild(answerDiv);
        cluesContainer.appendChild(row);
    });
}

// Modified renderGame function
function renderGame() {
    mainPhraseContainer.innerHTML = '';
    cluesContainer.innerHTML = '';
    
    const words = currentPhraseText.split(' ');
    words.forEach(word => {
        const wordBlock = document.createElement('div');
        wordBlock.className = 'word-block';
        for (let ch of word) {
            const tile = document.createElement('div');
            tile.className = 'tile';
            if (/[A-Z]/.test(ch)) {
                const num = currentLetterMap[ch];
                tile.innerHTML = `<input type="text" maxlength="1" class="tile-input" data-num="${num}" data-char="${ch}"><span>${num}</span>`;
            } else {
                tile.innerHTML = `<span class="punctuation">${ch}</span>`;
            }
            wordBlock.appendChild(tile);
        }
        mainPhraseContainer.appendChild(wordBlock);
    });
    
    currentClues.forEach(clue => {
        const row = document.createElement('div');
        row.className = 'clue-row';
        const textDiv = document.createElement('div');
        textDiv.className = 'clue-text';
        textDiv.innerHTML = `<strong>Definition:</strong> ${clue.definition}`;
        const inputsDiv = document.createElement('div');
        inputsDiv.className = 'clue-inputs';
        for (let letter of clue.word) {
            const tile = document.createElement('div');
            tile.className = 'tile';
            const num = currentLetterMap[letter];
            tile.innerHTML = `<input type="text" maxlength="1" class="tile-input" data-num="${num}" data-char="${letter}"><span>${num}</span>`;
            inputsDiv.appendChild(tile);
        }
        row.appendChild(textDiv);
        row.appendChild(inputsDiv);
        cluesContainer.appendChild(row);
    });
    
    attachSyncAndWinDetection();
}

function resetCurrentPuzzle() {
    if (!dataLoaded) return;
    incorrectAttempts = 0;
    gameActive = true;
    gameWon = false;
    winMessageDiv.style.display = 'none';
    statusMsgDiv.style.display = 'none';
    updateAttemptDisplay();
    
    // Re-render with tiles
    renderGame();
    
    showStatusMessage("Puzzle reset. Good luck!", false);
    setTimeout(() => {
        if (statusMsgDiv.textContent.includes("reset")) statusMsgDiv.style.display = 'none';
    }, 1500);
}

function loadPuzzle(index) {
    if (!dataLoaded) return;
    if (index >= phraseList.length) index = 0;
    if (index < 0) index = phraseList.length - 1;
    currentPhraseIndex = index;
    currentPhraseText = phraseList[currentPhraseIndex].text.toUpperCase();
    currentClues = selectCoveringClues(currentPhraseText, 6);
    if (currentClues.length === 0) {
        currentClues = getAllValidClues(currentPhraseText).slice(0, 4);
    }
    currentLetterMap = buildLetterMap(currentPhraseText);
    
    incorrectAttempts = 0;
    gameActive = true;
    gameWon = false;
    winMessageDiv.style.display = 'none';
    statusMsgDiv.style.display = 'none';
    updateAttemptDisplay();
    attemptCounterSpan.style.color = "#475569";
    renderGame();
    showStatusMessage(`New puzzle: "${currentPhraseText}"`, false);
    setTimeout(() => {
        if (statusMsgDiv.textContent.includes("New puzzle")) statusMsgDiv.style.display = 'none';
    }, 2000);
}

function updateAttemptDisplay() {
    if (!gameActive || gameWon) return;
    attemptCounterSpan.textContent = `❌ Incorrect checks: ${incorrectAttempts} / 3`;
    if (incorrectAttempts >= 3) {
        attemptCounterSpan.style.color = "#b91c1c";
    } else {
        attemptCounterSpan.style.color = "#475569";
    }
}

function showStatusMessage(text, isError = false, isWin = false) {
    statusMsgDiv.style.display = 'block';
    statusMsgDiv.textContent = text;
    statusMsgDiv.classList.remove('win-msg', 'loss-msg');
    if (isWin) {
        statusMsgDiv.classList.add('win-msg');
    } else if (isError) {
        statusMsgDiv.classList.add('loss-msg');
    }
    if (!isWin && incorrectAttempts < 3 && gameActive) {
        setTimeout(() => {
            if (statusMsgDiv.textContent === text) statusMsgDiv.style.display = 'none';
        }, 2500);
    }
}

function getNextEmptyInput(currentInput) {
    const allInputs = Array.from(document.querySelectorAll('.tile-input'));
    const currentIndex = allInputs.indexOf(currentInput);
    if (currentIndex === -1) return null;
    for (let i = currentIndex + 1; i < allInputs.length; i++) {
        const inp = allInputs[i];
        if (!inp.disabled && inp.value.trim() === '') return inp;
    }
    return null;
}

function moveToNextEmpty(currentInput) {
    const nextEmpty = getNextEmptyInput(currentInput);
    if (nextEmpty) nextEmpty.focus();
}

// MODIFIED handleWin function
function handleWin() {
    if (gameWon) return;
    gameWon = true;
    gameActive = false;
    winMessageDiv.style.display = 'block';
    showStatusMessage("🎉 PERFECT! You solved the puzzle! 🎉", false, true);
    
    // Display solved phrase and clues as normal text
    displaySolvedPhrase();
    displaySolvedClues();
    
    attemptCounterSpan.textContent = "✨ Puzzle completed! ✨";
}

function handleLoss() {
    if (gameWon) return;
    gameActive = false;
    gameWon = false;
    const allInputs = document.querySelectorAll('.tile-input');
    allInputs.forEach(inp => inp.disabled = true);
    showStatusMessage("💀 GAME OVER – You lost! Press 'Reset Puzzle' to try again.", true);
    attemptCounterSpan.textContent = "❌ Maximum incorrect attempts reached. Game over.";
    attemptCounterSpan.style.color = "#b91c1c";
}

function isPuzzleSolved() {
    const allInputs = document.querySelectorAll('.tile-input');
    for (let inp of allInputs) {
        const expected = inp.getAttribute('data-char');
        if (inp.value.toUpperCase() !== expected) return false;
    }
    return true;
}

function verifySolution() {
    if (!gameActive) {
        if (gameWon) showStatusMessage("You already won! Press Next Puzzle or Reset.", false);
        else showStatusMessage("Game over! Reset the puzzle to continue.", true);
        return;
    }
    if (isPuzzleSolved()) {
        handleWin();
    } else {
        incorrectAttempts++;
        updateAttemptDisplay();
        if (incorrectAttempts >= 3) {
            handleLoss();
        } else {
            const remaining = 3 - incorrectAttempts;
            showStatusMessage(`❌ Incorrect solution! ${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} left.`, true);
        }
    }
}

function attachSyncAndWinDetection() {
    const allInputs = document.querySelectorAll('.tile-input');
    allInputs.forEach(input => {
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);
    });
    const freshInputs = document.querySelectorAll('.tile-input');
    freshInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            if (!gameActive) return;
            let raw = e.target.value.toUpperCase();
            let filtered = raw.replace(/[^A-Z]/g, '');
            if (filtered.length > 1) filtered = filtered.charAt(0);
            const oldValue = e.target.value;
            e.target.value = filtered;
            const num = e.target.getAttribute('data-num');
            document.querySelectorAll(`.tile-input[data-num="${num}"]`).forEach(syncInp => {
                if (syncInp !== e.target && syncInp.value !== filtered) {
                    syncInp.value = filtered;
                }
            });
            if (filtered !== "" && (oldValue === "" || filtered !== oldValue)) {
                moveToNextEmpty(e.target);
            }
            if (gameActive && !gameWon && isPuzzleSolved()) {
                handleWin();
            }
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === ' ' || e.key === 'Space') e.preventDefault();
        });
    });
}

function enableGame() {
    checkBtn.disabled = false;
    resetBtn.disabled = false;
    nextBtn.disabled = false;
}

async function loadData() {
    try {
        const phrasesRes = await fetch('phrases.json');
        const cluesRes = await fetch('cluesPool.json');
        
        if (!phrasesRes.ok || !cluesRes.ok) throw new Error('Failed to load data files');
        
        const phrasesData = await phrasesRes.json();
        const cluesData = await cluesRes.json();
        
        phraseList = phrasesData.phrases;
        cluePool = cluesData.cluePool;
        
        if (!phraseList.length || !cluePool.length) throw new Error('Empty data');
        
        dataLoaded = true;
        enableGame();
        
        currentPhraseText = phraseList[0].text.toUpperCase();
        currentClues = selectCoveringClues(currentPhraseText, 6);
        if (currentClues.length === 0) {
            currentClues = getAllValidClues(currentPhraseText).slice(0, 4);
        }
        currentLetterMap = buildLetterMap(currentPhraseText);
        renderGame();
        updateAttemptDisplay();
        
    } catch (error) {
        console.error(error);
        mainPhraseContainer.innerHTML = '<div class="loading" style="color:red;">Error loading puzzles. Make sure phrases.json and cluesPool.json are in the same folder.</div>';
    }
}

loadData();

checkBtn.addEventListener('click', verifySolution);
resetBtn.addEventListener('click', resetCurrentPuzzle);
nextBtn.addEventListener('click', () => loadPuzzle(currentPhraseIndex + 1));
