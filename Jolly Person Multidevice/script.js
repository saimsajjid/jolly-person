// ------------------------------------------------
// GAME STATE
// ------------------------------------------------
const state = {
  word: "",
  hiddenWord: [],
  chances: 0,
  incorrectGuesses: new Set(),
  timeLeft: 120,
  timerInterval: null,
  isGameOver: false
};

// ------------------------------------------------
// DOM ELEMENTS
// ------------------------------------------------
const els = {
  modeContainer: document.getElementById('mode-selection-container'), // NEW
  setupContainer: document.getElementById('setup-container'),
  readyContainer: document.getElementById('ready-container'),
  gameContainer: document.getElementById('game-container'),

  // Mode Buttons
  btnModeSingle: document.getElementById('btn-mode-single'), // NEW
  btnModeMulti: document.getElementById('btn-mode-multi'),   // NEW

  wordInput: document.getElementById('word-input'),
  toggleWordBtn: document.getElementById('toggle-word'),
  chancesInput: document.getElementById('chances-input'),
  suggestionText: document.getElementById('suggestion-text'),
  guessInput: document.getElementById('guess-input'),
  hiddenWordDisplay: document.getElementById('hidden-word'),
  chancesDisplay: document.getElementById('chances'),
  incorrectDisplay: document.getElementById('incorrect-letters'),
  timerDisplay: document.getElementById('timer'),
  messageDisplay: document.getElementById('message'),
  btnStart: document.getElementById('btn-start'),
  btnReady: document.getElementById('btn-ready'),
  btnGuess: document.getElementById('btn-guess'),
  btnRestart: document.getElementById('btn-restart')
};

// ------------------------------------------------
// INITIALIZATION & EVENT LISTENERS
// ------------------------------------------------
function init() {
  // MODE SELECTION LOGIC
  els.btnModeSingle.addEventListener('click', startSinglePlayer);
  els.btnModeMulti.addEventListener('click', () => {
      window.location.href = "multidevice.html";
  });

  // STANDARD GAME LOGIC
  els.btnStart.addEventListener('click', setupGame);
  els.btnReady.addEventListener('click', startPlaying);
  els.btnGuess.addEventListener('click', handleGuess);
  els.btnRestart.addEventListener('click', resetGame);

  // Setup Screen Enter Key & Logic
  els.wordInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') els.chancesInput.focus(); });
  els.wordInput.addEventListener('input', updateChanceSuggestion);
  els.toggleWordBtn.addEventListener('click', toggleWordVisibility);

  els.chancesInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') setupGame(); });

  // Game Screen Enter Key
  els.guessInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') handleGuess(); });
}

// ------------------------------------------------
// MODE SELECTION
// ------------------------------------------------
function startSinglePlayer() {
    // Hide Mode Screen
    els.modeContainer.classList.remove('active');
    els.modeContainer.style.display = 'none';

    // Show Setup Screen
    els.setupContainer.style.display = 'block';
    setTimeout(() => els.setupContainer.classList.add('active'), 10);
}

// ------------------------------------------------
// NEW FEATURES LOGIC
// ------------------------------------------------

// Feature 1: Password Toggle
function toggleWordVisibility() {
  const type = els.wordInput.getAttribute('type') === 'password' ? 'text' : 'password';
  els.wordInput.setAttribute('type', type);
  els.toggleWordBtn.innerText = type === 'password' ? '👁️' : '🙈';
}

// Feature 2: Smart Chance Suggestion
function updateChanceSuggestion() {
  const val = els.wordInput.value.trim();
  if (!val) {
      els.suggestionText.innerText = "";
      return;
  }

  let suggestion = Math.ceil(val.length * 0.6);

  // Vowels check
  const vowels = val.match(/[aeiou]/gi);
  if (!vowels || vowels.length < 2) suggestion += 1;

  // Repeating letters check
  if (/(.)\1/.test(val)) suggestion += 1;

  // Cap at 10
  if (suggestion > 10) suggestion = 10;

  els.suggestionText.innerText = `Suggested chances: ${suggestion}`;
}

// ------------------------------------------------
// CORE LOGIC
// ------------------------------------------------

// PHASE 1: Host Logic
function setupGame() {
  const wordVal = els.wordInput.value.trim().toLowerCase();
  const chancesVal = parseInt(els.chancesInput.value);

  if (!wordVal || isNaN(chancesVal) || chancesVal < 1) {
    showMessage("Please enter a valid word and chances!", "warn");
    triggerAnimation(els.setupContainer, 'anim-wrong');
    return;
  }

  // Initialize State
  state.word = wordVal;
  state.chances = chancesVal;
  state.hiddenWord = wordVal.split('').map(char => char === ' ' ? '&nbsp;' : '_');
  state.incorrectGuesses.clear();
  state.isGameOver = false;

  // Transition: Setup -> Ready Screen
  els.setupContainer.classList.remove('active');
  els.setupContainer.style.display = 'none';

  els.readyContainer.style.display = 'block';
  setTimeout(() => els.readyContainer.classList.add('active'), 10);
}

// PHASE 2: Player Ready Logic
function startPlaying() {
  // Transition: Ready Screen -> Game Screen
  els.readyContainer.classList.remove('active');
  els.readyContainer.style.display = 'none';

  els.gameContainer.style.display = 'block';
  setTimeout(() => els.gameContainer.classList.add('active'), 10);

  els.btnRestart.style.display = 'none';
  els.guessInput.disabled = false;
  els.btnGuess.disabled = false;
  els.guessInput.value = "";
  els.guessInput.focus();

  updateDisplay();
  startTimer();
}

function handleGuess() {
  if (state.isGameOver) return;

  const guess = els.guessInput.value.toLowerCase();
  els.guessInput.value = "";
  els.guessInput.focus();

  // Validation
  if (!guess || guess.length !== 1 || !/[a-z]/.test(guess)) {
    showMessage("Enter a single valid letter!", "warn");
    triggerAnimation(els.gameContainer, 'anim-wrong'); // Shake on invalid
    return;
  }

  if (state.incorrectGuesses.has(guess) || state.hiddenWord.includes(guess)) {
    showMessage(`Already guessed "${guess}"!`, "warn");
    triggerAnimation(els.guessInput, 'anim-wrong'); // Shake input
    return;
  }

  showMessage("");

  // Game Logic
  if (state.word.includes(guess)) {
    // Correct Guess
    triggerAnimation(els.hiddenWordDisplay, 'anim-correct');

    for (let i = 0; i < state.word.length; i++) {
      if (state.word[i] === guess) state.hiddenWord[i] = guess;
    }
    checkWinCondition();
  } else {
    // Wrong Guess
    triggerAnimation(els.gameContainer, 'anim-wrong');

    state.chances--;
    state.incorrectGuesses.add(guess);
    checkLossCondition();
  }

  if (!state.isGameOver) {
      startTimer();
  }

  updateDisplay();
}

function startTimer() {
  clearInterval(state.timerInterval);
  state.timeLeft = 120;
  els.timerDisplay.innerText = `⏳ ${state.timeLeft}s`;

  state.timerInterval = setInterval(() => {
    state.timeLeft--;
    els.timerDisplay.innerText = `⏳ ${state.timeLeft}s`;

    // TIMER LOGIC
    if (state.timeLeft <= 0) {
      state.chances--; // Reduce chance
      updateDisplay(); // Update UI

      checkLossCondition(); // Did they die?

      if (!state.isGameOver) {
          // Warning Logic
          showMessage("Time's up! You lost a chance.", "warn");
          triggerAnimation(els.gameContainer, 'anim-wrong');
          startTimer(); // Reset timer

          // NEW: Auto-remove message after 3 seconds
          setTimeout(() => {
              if (els.messageDisplay.innerText.includes("Time's up")) {
                  els.messageDisplay.innerText = "";
              }
          }, 3000);
      }
    }
  }, 1000);
}

function checkWinCondition() {
  if (!state.hiddenWord.includes('_')) {
    endGame(true, "🎉 Alhamdulillah! You won!");
  }
}

function checkLossCondition() {
  if (state.chances <= 0) {
    endGame(false, `💔 Game Over! Word was "${state.word}"`);
  }
}

function endGame(isWin, msg) {
  state.isGameOver = true;
  clearInterval(state.timerInterval);
  showMessage(msg, isWin ? "success" : "loss");

  els.guessInput.disabled = true;
  els.btnGuess.disabled = true;
  els.btnRestart.style.display = 'inline-block';

  if (!isWin) {
      els.hiddenWordDisplay.innerText = state.word.split('').join(' ');
  }
}

function resetGame() {
  els.gameContainer.classList.remove('active');
  els.gameContainer.style.display = 'none';

  // GO BACK TO MODE SELECTION
  els.modeContainer.style.display = 'block';
  setTimeout(() => els.modeContainer.classList.add('active'), 10);

  // Reset Inputs
  els.wordInput.value = "";
  els.suggestionText.innerText = ""; // Clear suggestion
  els.messageDisplay.innerText = "";
  clearInterval(state.timerInterval);
}

// ------------------------------------------------
// HELPERS & ANIMATION TRIGGERS
// ------------------------------------------------
function updateDisplay() {
  els.hiddenWordDisplay.innerHTML = state.hiddenWord.join(" ");
  els.chancesDisplay.innerText = state.chances;
  els.incorrectDisplay.innerText =
    state.incorrectGuesses.size > 0
    ? [...state.incorrectGuesses].join(", ").toUpperCase()
    : "None";
}

function showMessage(text, type = "neutral") {
  els.messageDisplay.innerText = text;
  els.messageDisplay.className = "";
  if (type === "warn") els.messageDisplay.classList.add("message-warn");
  if (type === "success") els.messageDisplay.classList.add("message-win");
  if (type === "loss") els.messageDisplay.classList.add("message-loss");
}

function triggerAnimation(element, className) {
  element.classList.remove(className);
  void element.offsetWidth; // Trigger reflow to restart animation
  element.classList.add(className);
  setTimeout(() => {
      element.classList.remove(className);
  }, 500);
}

// Run
init();
