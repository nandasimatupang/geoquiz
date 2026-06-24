import { $ } from './utils.js';
import { state, updateHeader, showScreen, handleRoute } from './state.js';
import { LETTERS } from './data/countries.js';
import { renderPicker, startLetter, submitG1Guess, useClue, g1, skipCurrent, tryAgain } from './game1.js';
import { showStats } from './stats.js';
import { startGame2, skipRound, handleMcClick, setDifficulty, stopGame } from './game2.js';
import { startFlagGame, onFlagOptionClick, stopFlagGame, setContinentFilter } from './game3.js';
import { startSprint, onSprintInput, onSprintKeydown, submitSprintGuess, onSprintPlayAgain, stopSprint } from './game4.js';
import { fetchTopoData } from './map-renderer.js';
import { loadProgress } from './persist.js';
import { preloadFlagImages } from './data/flags.js';
// ── Clean up leftover query params (e.g. ?t=...) ──
if (window.location.search) {
  const cleanUrl = window.location.origin + window.location.pathname + window.location.hash;
  window.history.replaceState({}, document.title, cleanUrl);
}

// ── Restore saved progress (hoisted before any handlers) ──
const saved = loadProgress();
if (saved) {
  state.gameData.game1 = saved.games.game1;
  state.gameData.game2 = saved.games.game2;
  state.gameData.game3 = saved.games.game3;
  state.gameData.game4 = saved.games.game4;
  g1.completedLetters = state.gameData.game1.completedLetters;
}

// ── Helper: stop whichever game is currently running ──
function stopCurrentGame() {
  if (state.currentGame === 'game1') {
    const input = $('country-input');
    if (input) input.blur();
  } else if (state.currentGame === 'game2') {
    stopGame();
  } else if (state.currentGame === 'game3') {
    stopFlagGame();
  } else if (state.currentGame === 'game4') {
    stopSprint();
  }
}


// ── Stats Button ──
const scoreboardBtn = $('scoreboard-btn');
if (scoreboardBtn) {
  scoreboardBtn.addEventListener('click', () => {
    stopCurrentGame();
    showStats();
  });
}

// ── Stats Back Button ──
const statsBackBtn = $('stats-back-btn');
if (statsBackBtn) {
  statsBackBtn.addEventListener('click', () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      showScreen('home-screen');
    }
  });
}

// ── Logo Click → Home ──
const logoBtn = $('logo-btn');
if (logoBtn) {
  logoBtn.addEventListener('click', () => {
    stopCurrentGame();
    showScreen('home-screen');
    state.currentGame = null;
  });
}

// ── Game Selection Cards ──
document.querySelectorAll('.game-card').forEach((card) => {
  card.addEventListener('click', () => {
    const game = card.dataset.game;
    if (game === 'game1') {
      state.currentGame = 'game1';
      showScreen('picker-screen');
      renderPicker();
    } else if (game === 'game2') {
      startGame2();
    } else if (game === 'game3') {
      startFlagGame(state.bestStreak);
    } else if (game === 'game4') {
      startSprint(state.bestStreak);
    }
  });
});
// ── Game 1 Event Listeners ──

const letterGrid = $('letter-grid');
if (letterGrid) {
  letterGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.letter-btn');
    if (btn) {
      g1.isRandomMode = false;
      startLetter(btn.dataset.letter);
    }
  });
}

const randomBtn = $('random-btn');
if (randomBtn) {
  randomBtn.addEventListener('click', () => {
    const avail = LETTERS.filter((l) => !g1.completedLetters.has(l));
    const pool = avail.length > 0 ? avail : LETTERS;
    g1.isRandomMode = true;
    startLetter(pool[Math.floor(Math.random() * pool.length)]);
  });
}

const backBtn = $('back-btn');
if (backBtn) {
  backBtn.addEventListener('click', () => {
    showScreen('picker-screen');
    renderPicker();
    const input = $('country-input');
    if (input) input.blur();
  });
}

function handleGameButton(btn, callback) {
  if (!btn) return;
  btn.addEventListener('mousedown', (e) => e.preventDefault());
  btn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    callback(e);
  });
  btn.addEventListener('click', callback);
}

const clueBtn = $('clue-btn');
handleGameButton(clueBtn, useClue);

const g1SkipBtn = $('g1-skip-btn');
handleGameButton(g1SkipBtn, skipCurrent);

// Try Again / Next buttons are dynamically rendered into the focus card — delegate.
const gameScreen = $('game-screen');
if (gameScreen) {
  gameScreen.addEventListener('click', (e) => {
    if (e.target.closest('#g1-tryagain-btn')) tryAgain();
    
    if (e.target.closest('#g1-next-btn') || e.target.closest('#g1-top-next-btn')) {
      const avail = LETTERS.filter((l) => !g1.completedLetters.has(l));
      if (avail.length === 0) {
        showScreen('picker-screen');
        renderPicker();
        return;
      }
      let next = null;
      if (g1.isRandomMode) {
        next = avail[Math.floor(Math.random() * avail.length)];
      } else {
        const idx = LETTERS.indexOf(g1.currentLetter);
        for (let i = 1; i <= LETTERS.length; i++) {
          const l = LETTERS[(idx + i) % LETTERS.length];
          if (!g1.completedLetters.has(l)) {
            next = l;
            break;
          }
        }
      }
      if (next) {
        startLetter(next);
      } else {
        showScreen('picker-screen');
        renderPicker();
      }
    }
  });
}

const countryInput = $('country-input');
const submitBtn = $('submit-btn');

if (countryInput) {
  countryInput.addEventListener('input', () => {
    const sb = $('submit-btn');
    const fb = $('input-feedback');
    if (sb) sb.disabled = countryInput.value.trim().length === 0;
    if (fb) {
      fb.textContent = countryInput.value.trim().length > 0 ? 'Press Enter to submit' : '';
      fb.className = 'input-feedback info';
    }
  });

  countryInput.addEventListener('focus', () => {
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 150);
  });
  countryInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); submitG1Guess(); }
  });
}

if (submitBtn) submitBtn.addEventListener('click', submitG1Guess);

// ── Game 2 Event Listeners ──

const mcOptions = $('mc-options');
if (mcOptions) mcOptions.addEventListener('click', handleMcClick);

const mapSkipBtn = $('map-skip-btn');
if (mapSkipBtn) mapSkipBtn.addEventListener('click', skipRound);

const mapBackBtn = $('map-back-btn');
if (mapBackBtn) {
  mapBackBtn.addEventListener('click', () => {
    stopGame();
    showScreen('home-screen');
    state.currentGame = null;
  });
}

const mapDifficulty = $('map-difficulty');
if (mapDifficulty) {
  mapDifficulty.addEventListener('click', (e) => {
    const btn = e.target.closest('.diff-btn');
    if (btn && !btn.classList.contains('active')) {
      setDifficulty(btn.dataset.diff);
    }
  });
}

// ── Game 4 Event Listeners ──

const sprintInput = $('sprint-input');
const sprintSubmitBtn = $('sprint-submit-btn');

if (sprintInput) {
  sprintInput.addEventListener('input', onSprintInput);
  sprintInput.addEventListener('keydown', onSprintKeydown);
}

if (sprintSubmitBtn) sprintSubmitBtn.addEventListener('click', submitSprintGuess);

const sprintPlayAgain = $('sprint-play-again');
if (sprintPlayAgain) sprintPlayAgain.addEventListener('click', onSprintPlayAgain);

const sprintHomeBtn = $('sprint-home-btn');
if (sprintHomeBtn) {
  sprintHomeBtn.addEventListener('click', () => {
    stopSprint();
    showScreen('home-screen');
    state.currentGame = null;
  });
}

// ── Game 3 Event Listeners ──

const flagOptions = $('flag-options');
if (flagOptions) flagOptions.addEventListener('click', onFlagOptionClick);

const flagFilter = $('flag-continent-filter');
if (flagFilter) {
  flagFilter.addEventListener('click', (e) => {
    const btn = e.target.closest('.fc-btn');
    if (btn && !btn.classList.contains('active')) {
      setContinentFilter(btn.dataset.continent);
    }
  });
}

// ── Routing ──
// After handleRoute activates a screen from URL, init any game-specific content
function onRoute() {
  const active = document.querySelector('.screen.active');
  if (!active) return;
  if (active.id === 'picker-screen') {
    renderPicker();
  }
  if (active.id === 'mapgame-screen') {
    startGame2();
  }
  if (active.id === 'flaggame-screen') {
    startFlagGame(state.bestStreak);
  }
  if (active.id === 'sprint-screen') {
    startSprint(state.bestStreak);
  }
}

window.addEventListener('hashchange', () => {
  handleRoute();
  onRoute();
});

// ── Preload: map data for instant map game start, and first batch of flags ──
fetchTopoData();
preloadFlagImages(['United States', 'United Kingdom', 'France', 'Germany', 'Japan', 'Brazil', 'Canada', 'Australia', 'Italy', 'Spain', 'China', 'India']);

// ── Init ──
updateHeader();
handleRoute();
onRoute();
