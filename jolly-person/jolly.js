let word = "";
let hiddenWord = [];
let chances = 0;
let incorrectGuesses = new Set();
let timeLeft = 120;
let timerInterval;
let isGameOver = false; // Track game state

function startGame() {
  const wordInput = document.getElementById("word-input").value.toLowerCase();
  const chancesInput = parseInt(document.getElementById("chances-input").value);

  if (!wordInput || chancesInput < 1) {
    alert("Please enter a valid word and number of chances!");
    return;
  }

  word = wordInput;
  chances = chancesInput;
  hiddenWord = Array(word.length).fill("_");
  incorrectGuesses.clear();
  isGameOver = false; // Reset game state
  document.getElementById("setup-container").style.display = "none";
  document.getElementById("game-container").style.display = "block";
  // Enable inputs when starting new game
  document.getElementById("guess-input").disabled = false;
  document.querySelector("button[onclick='makeGuess()']").disabled = false;

  startTimer();
  updateDisplay();
}

function updateDisplay() {
  document.getElementById("hidden-word").innerText = hiddenWord.join(" ");
  document.getElementById("chances").innerText = chances;
  document.getElementById("incorrect-letters").innerText =
    [...incorrectGuesses].join(", ") || "None";
}

function makeGuess() {
  if (isGameOver || chances <= 0) return; // Block if game ended

  const guess = document.getElementById("guess-input").value.toLowerCase();
  document.getElementById("guess-input").value = "";

  if (!guess || guess.length !== 1) {
    document.getElementById("message").innerText =
      "Please enter a single letter!";
    return;
  }

  if (incorrectGuesses.has(guess) || hiddenWord.includes(guess)) {
    document.getElementById(
      "message"
    ).innerText = `You've already guessed "${guess}". Try a different letter!`;
    return;
  }

  clearInterval(timerInterval); // Reset Timer
  startTimer();

  document.getElementById("message").innerText = "";

  if (word.includes(guess)) {
    for (let i = 0; i < word.length; i++) {
      if (word[i] === guess) hiddenWord[i] = guess;
    }
  } else {
    chances--;
    incorrectGuesses.add(guess);
  }

  updateDisplay();

  // Check win/loss conditions
  if (!hiddenWord.includes("_")) {
    document.getElementById("message").innerText = "🎉 You won!";
    isGameOver = true;
    clearInterval(timerInterval);
    disableInputs();
  } else if (chances <= 0) {
    document.getElementById(
      "message"
    ).innerText = `😢 You lost! The word was "${word}".`;
    isGameOver = true;
    clearInterval(timerInterval);
    disableInputs();
  }
}

function startTimer() {
  timeLeft = 120;
  document.getElementById("timer").innerText = `⏳ Time Left: ${timeLeft}s`;
  timerInterval = setInterval(() => {
    timeLeft--;
    document.getElementById("timer").innerText = `⏳ Time Left: ${timeLeft}s`;
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      if (isGameOver) return; // Ignore if game already ended

      chances--;
      updateDisplay();

      // Check if timer expiration caused loss
      if (chances <= 0 || !hiddenWord.includes("_")) {
        isGameOver = true;
        clearInterval(timerInterval);
        if (chances <= 0) {
          document.getElementById(
            "message"
          ).innerText = `😢 You lost! The word was "${word}".`;
        } else {
          document.getElementById("message").innerText = "🎉 You won!";
        }
        disableInputs();
      } else {
        startTimer(); // Restart timer if game continues
      }
    }
  }, 1000);
}

function disableInputs() {
  document.getElementById("guess-input").disabled = true;
  document.querySelector("button[onclick='makeGuess()']").disabled = true;
}

function startNewGame() {
  location.reload();
}

// ... rest of your code (event listeners, etc.)
document
  .getElementById("guess-input")
  .addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
      makeGuess();
    }
  });
