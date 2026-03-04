// ==========================================
// 1. CONFIGURATION
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyCWlPC2mEHC89h2XaWtzhBKBPVSgeMKcPc",
  authDomain: "jollyperson-web.firebaseapp.com",
  databaseURL: "https://jollyperson-web-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "jollyperson-web",
  storageBucket: "jollyperson-web.firebasestorage.app",
  messagingSenderId: "243223570950",
  appId: "1:243223570950:web:ffec8fd683fe6d7f14b187"
};

let db;
try {
  firebase.initializeApp(firebaseConfig);
  db = firebase.database();
  console.log("Firebase initialized successfully");
} catch (e) {
  console.error("Firebase Init Error:", e);
  alert("Database connection failed. Check console.");
}

// ==========================================
// 2. STATE & DOM ELEMENTS
// ==========================================
let myRoomId = null;
let iAmHost = false;
let myPlayerRef = null; // Store reference to self for cleanup
let hostRealWord = "";
let hostWordVisible = false;

// Timer State
let timerInterval = null;
let timeLeft = 120;
let lastHiddenStr = "";
let lastBadGuessesStr = "";
let lastChances = 5;

const els = {
  screens: {
    lobby: document.getElementById('screen-lobby'),
    setup: document.getElementById('screen-setup'),
    waiting: document.getElementById('screen-waiting'),
    game: document.getElementById('screen-game')
  },
  inputs: {
    joinCode: document.getElementById('join-code'),
    word: document.getElementById('word-input'),
    chances: document.getElementById('chances-input'),
    guess: document.getElementById('guess-input')
  },
  btns: {
    create: document.getElementById('btn-create'),
    join: document.getElementById('btn-join'),
    start: document.getElementById('btn-start-game'),
    submit: document.getElementById('btn-submit'),
    restart: document.getElementById('btn-restart')
  },
  displays: {
    room: document.getElementById('room-display'),
    gameRoomCode: document.getElementById('game-room-code'),
    lobbyMsg: document.getElementById('lobby-msg'),
    setupStatus: document.getElementById('setup-status'),
    playerCount: document.getElementById('player-count-display'),
    gameLiveCount: document.getElementById('game-live-count'),
    hiddenWord: document.getElementById('hidden-word'),
    chances: document.getElementById('game-chances'),
    badGuesses: document.getElementById('bad-guesses'),
    gameMsg: document.getElementById('game-msg'),
    hostReveal: document.getElementById('host-reveal'),
    hostRevealToggle: document.getElementById('host-reveal-toggle'),
    timer: document.getElementById('timer')
  }
};

// ==========================================
// 3. EVENT LISTENERS
// ==========================================
els.btns.create.addEventListener('click', createRoom);
els.btns.join.addEventListener('click', joinRoom);
els.btns.start.addEventListener('click', hostStartGame);
els.btns.submit.addEventListener('click', playerGuess);

els.displays.hostRevealToggle.addEventListener('click', toggleHostReveal);

els.inputs.joinCode.addEventListener('keypress', (e) => { if(e.key === 'Enter') joinRoom(); });
els.inputs.guess.addEventListener('keypress', (e) => { if(e.key === 'Enter') playerGuess(); });

els.btns.restart.addEventListener('click', () => location.reload());

// FIX: Force Cleanup on Close
window.addEventListener('beforeunload', () => {
    if (myPlayerRef) myPlayerRef.remove();
});

// ==========================================
// 4. LOBBY LOGIC
// ==========================================
function showScreen(screenName) {
  Object.values(els.screens).forEach(el => {
    el.classList.remove('active');
    el.style.display = 'none';
  });
  const target = els.screens[screenName];
  target.style.display = 'block';
  setTimeout(() => target.classList.add('active'), 10);
}

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function createRoom() {
  const customCode = els.inputs.joinCode.value.trim().toUpperCase();
  let code = (customCode.length >= 3) ? customCode : generateRoomCode();

  myRoomId = code;
  iAmHost = true;

  const roomRef = db.ref('rooms/' + code);

  // 1. NUCLEAR WIPE: Clear room completely first to remove zombies
  roomRef.set(null).then(() => {
      roomRef.update({ status: 'waiting' });

      // 2. Add Host
      myPlayerRef = roomRef.child('players').push();
      myPlayerRef.set({ role: 'host', joined: Date.now() });
      myPlayerRef.onDisconnect().remove();
  });

  // 3. LISTEN FOR PLAYERS
  roomRef.child('players').on('value', (snapshot) => {
    const players = snapshot.val() || {};
    const count = Object.keys(players).length;

    els.displays.playerCount.innerText = count;
    els.displays.gameLiveCount.innerText = count;

    if (count > 1) {
      els.displays.playerCount.style.color = "var(--success)";
      els.displays.setupStatus.innerText = "Players Connected!";
      els.displays.setupStatus.style.color = "var(--success)";
    } else {
      els.displays.playerCount.style.color = "var(--accent)";
      els.displays.setupStatus.innerText = "Waiting for players...";
      els.displays.setupStatus.style.color = "var(--accent)";
    }
  });

  els.displays.room.innerText = code;
  showScreen('setup');
}

function joinRoom() {
  const rawInput = els.inputs.joinCode.value;
  const code = rawInput.trim().toUpperCase();

  if (code.length !== 4) { alert("Code must be 4 characters."); return; }

  els.btns.join.innerText = "Connecting...";
  els.btns.join.disabled = true;

  db.ref('rooms/' + code).once('value')
  .then(snapshot => {
    if (snapshot.exists()) {
      myRoomId = code;
      iAmHost = false;

      // Add Guest
      myPlayerRef = db.ref('rooms/' + code + '/players').push();
      myPlayerRef.set({ role: 'guest', joined: Date.now() });
      myPlayerRef.onDisconnect().remove();

      showScreen('waiting');
      listenToGame();
    } else {
      alert("Room not found!");
      els.btns.join.innerText = "Join Room";
      els.btns.join.disabled = false;
    }
  })
  .catch(error => {
      console.error("Join Error:", error);
      alert("Connection error.");
      els.btns.join.innerText = "Join Room";
      els.btns.join.disabled = false;
    });
}

// ==========================================
// 5. GAME START (HOST)
// ==========================================
function hostStartGame() {
  const word = els.inputs.word.value.trim().toLowerCase();
  const chances = parseInt(els.inputs.chances.value);

  if (!word || chances < 1) return;

  // Space Handling
  const hiddenArray = word.split('').map(char => char === ' ' ? '&nbsp;' : '_');

  db.ref('rooms/' + myRoomId).update({
      word: word,
      hiddenWord: hiddenArray,
      chances: chances,
      badGuesses: "",
      status: 'playing'
  });

  listenToGame();
}

// ==========================================
// 6. SYNC LOGIC (The Brain)
// ==========================================
function listenToGame() {
  db.ref('rooms/' + myRoomId).on('value', (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      // Transition
      if (data.status === 'playing' || data.status === 'win' || data.status === 'loss') {
          if (!els.screens.game.classList.contains('active')) {
              showScreen('game');
              setupRoleUI(data.word);
              els.displays.gameRoomCode.innerText = myRoomId;
          }
      }

      // Stats
      const currentHiddenStr = data.hiddenWord ? data.hiddenWord.join(' ') : "";
      els.displays.hiddenWord.innerHTML = currentHiddenStr;
      els.displays.chances.innerText = data.chances !== undefined ? data.chances : 0;
      els.displays.badGuesses.innerText = data.badGuesses ? data.badGuesses : "None";

      // Timer Logic
      if (currentHiddenStr !== lastHiddenStr ||
          data.badGuesses !== lastBadGuessesStr ||
          (data.chances !== undefined && data.chances !== lastChances)) {

          lastHiddenStr = currentHiddenStr;
          lastBadGuessesStr = data.badGuesses || "";
          lastChances = data.chances;

          if (data.status === 'playing') resetTimer();
      }

      if (data.status === 'win') endGame(true, data.word);
      if (data.status === 'loss') endGame(false, data.word);
  });
}

function setupRoleUI(secretWord) {
  if (iAmHost) {
      document.getElementById('role-indicator').innerText = "Spectating Mode";
      document.getElementById('player-controls').style.display = 'none';
      document.getElementById('host-controls').style.display = 'block';

      hostRealWord = secretWord;
      hostWordVisible = false;
      els.displays.hostReveal.innerText = "•".repeat(secretWord.length);
      els.displays.hostRevealToggle.innerHTML = '<i class="fa-solid fa-eye"></i>';
  } else {
      document.getElementById('role-indicator').innerText = "Guess the Word";
      document.getElementById('player-controls').style.display = 'block';
      document.getElementById('host-controls').style.display = 'none';

      setTimeout(() => els.inputs.guess.focus(), 100);
      resetTimer();
  }
}

function toggleHostReveal() {
    hostWordVisible = !hostWordVisible;
    if (hostWordVisible) {
        els.displays.hostReveal.innerText = hostRealWord;
        els.displays.hostRevealToggle.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
    } else {
        els.displays.hostReveal.innerText = "•".repeat(hostRealWord.length);
        els.displays.hostRevealToggle.innerHTML = '<i class="fa-solid fa-eye"></i>';
    }
}

// ==========================================
// 7. TIMER LOGIC
// ==========================================
function resetTimer() {
  clearInterval(timerInterval);
  timeLeft = 120;
  els.displays.timer.innerHTML = `<i class="fa-solid fa-hourglass-half"></i> ${timeLeft}s`;

  timerInterval = setInterval(() => {
      timeLeft--;
      els.displays.timer.innerHTML = `<i class="fa-solid fa-hourglass-half"></i> ${timeLeft}s`;

      if (timeLeft <= 0) {
          if (!iAmHost) handleTimeout();
          else clearInterval(timerInterval);
      }
  }, 1000);
}

function handleTimeout() {
  clearInterval(timerInterval);

  db.ref('rooms/' + myRoomId).once('value').then(snapshot => {
      const data = snapshot.val();
      if (data.status !== 'playing') return;

      let newChances = data.chances - 1;
      let newStatus = newChances <= 0 ? 'loss' : 'playing';

      db.ref('rooms/' + myRoomId).update({
          chances: newChances,
          status: newStatus
      });

      els.displays.gameMsg.innerText = "Time's up! You lost a chance.";
      setTimeout(() => {
          if(els.displays.gameMsg.innerText.includes("Time's up"))
             els.displays.gameMsg.innerText = "";
      }, 3000);
  });
}

// ==========================================
// 8. PLAYER ACTIONS
// ==========================================
function playerGuess() {
  const guess = els.inputs.guess.value.toLowerCase();
  els.inputs.guess.value = '';
  els.inputs.guess.focus();

  if (!guess) return;

  db.ref('rooms/' + myRoomId).once('value').then(snapshot => {
      const data = snapshot.val();
      if (data.status !== 'playing') return;

      let newHidden = [...data.hiddenWord];
      let newChances = data.chances;
      let newBadGuesses = data.badGuesses ? data.badGuesses.split(', ') : [];

      if (data.word.includes(guess)) {
          for (let i = 0; i < data.word.length; i++) {
              if (data.word[i] === guess) newHidden[i] = guess;
          }
      } else {
          if (!newBadGuesses.includes(guess)) {
              newBadGuesses.push(guess);
              newChances--;
          }
      }

      let newStatus = 'playing';
      if (!newHidden.includes('_')) newStatus = 'win';
      if (newChances <= 0) newStatus = 'loss';

      db.ref('rooms/' + myRoomId).update({
          hiddenWord: newHidden,
          chances: newChances,
          badGuesses: newBadGuesses.join(', '),
          status: newStatus
      });
  });
}

function endGame(isWin, word) {
  clearInterval(timerInterval);

  els.displays.gameMsg.innerHTML = isWin ? '<i class="fa-solid fa-trophy"></i> GAME WON!' : '<i class="fa-solid fa-heart-crack"></i> GAME OVER!';
  els.displays.gameMsg.style.color = isWin ? "var(--success)" : "var(--error)";
  els.displays.hiddenWord.innerText = word.split('').join(' ');

  if (iAmHost) {
      els.displays.hostReveal.innerText = word;
      els.displays.hostRevealToggle.style.display = 'none';
  }

  els.btns.submit.disabled = true;
  els.inputs.guess.disabled = true;
  els.btns.restart.style.display = 'block';
}
