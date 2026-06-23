import { $, normalize } from './utils.js';
import { COUNTRY_SET, ALL_COUNTRIES } from './data/countries.js';
import { state, updateHeader, showScreen } from './state.js';
import { countryFlagEmoji } from './data/flags.js';
import { saveProgress, loadProgress, MAX_SPRINT_SCORES } from './persist.js';
import { g1 } from './game1.js';

const SPRINT_DURATION = 60; // seconds
const COUNTDOWN_INTERVAL = 50; // ms for smooth timer bar

// ── DOM refs ──
function dom() {
  return {
    sprintTimer: $('sprint-timer'),
    sprintTimerBar: $('sprint-timer-bar'),
    sprintScore: $('sprint-score'),
    sprintBest: $('sprint-best'),
    sprintInput: $('sprint-input'),
    sprintSubmitBtn: $('sprint-submit-btn'),
    sprintFeedback: $('sprint-feedback'),
    sprintList: $('sprint-list'),
    sprintOverlay: $('sprint-overlay'),
    sprintResultScore: $('sprint-result-score'),
    sprintResultBest: $('sprint-result-best'),
    sprintResultNewBest: $('sprint-result-newbest'),
    sprintResultList: $('sprint-result-list'),
    sprintPlayAgain: $('sprint-play-again'),
    sprintHomeBtn: $('sprint-home-btn'),
  };
}

// ── Reset State ──
export function resetGame4State() {
  sprintRunning = false;
  sprintTimeLeft = 60;
  sprintScore = 0;
  sprintBest = 0;
  sprintFound = new Set();
  if (sprintIntervalId) {
    clearInterval(sprintIntervalId);
    sprintIntervalId = null;
  }
}

// ── State ──
let sprintRunning = false;
let sprintTimeLeft = SPRINT_DURATION;
let sprintScore = 0;
let sprintBest = 0;
let sprintFound = new Set(); // countries found in current sprint
let sprintIntervalId = null;

// ── Start Sprint ──
export function startSprint(bestVal = 0) {
  state.currentGame = 'game4';
  sprintBest = bestVal;
  sprintScore = 0;
  sprintTimeLeft = SPRINT_DURATION;
  sprintRunning = true;
  sprintFound = new Set();

  showScreen('sprint-screen');
  updateHeader();

  const d = dom();
  if (d.sprintTimer) d.sprintTimer.textContent = formatTime(SPRINT_DURATION);
  if (d.sprintTimerBar) d.sprintTimerBar.style.width = '100%';
  if (d.sprintScore) d.sprintScore.textContent = '0';
  if (d.sprintBest) d.sprintBest.textContent = `${sprintBest}`;
  if (d.sprintFeedback) { d.sprintFeedback.textContent = ''; d.sprintFeedback.className = 'sprint-feedback'; }
  if (d.sprintList) d.sprintList.innerHTML = '';
  if (d.sprintOverlay) d.sprintOverlay.classList.add('hidden');
  if (d.sprintInput) {
    d.sprintInput.value = '';
    d.sprintInput.disabled = false;
    d.sprintInput.focus();
  }
  if (d.sprintSubmitBtn) d.sprintSubmitBtn.disabled = true;

  // Start countdown timer (updates every 50ms for smooth bar)
  const startTime = Date.now();
  sprintIntervalId = setInterval(() => {
    const elapsed = (Date.now() - startTime) / 1000;
    sprintTimeLeft = Math.max(0, SPRINT_DURATION - elapsed);
    updateTimerDisplay();

    if (sprintTimeLeft <= 0) {
      endSprint();
    }
  }, COUNTDOWN_INTERVAL);
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function updateTimerDisplay() {
  const d = dom();
  const pct = (sprintTimeLeft / SPRINT_DURATION) * 100;
  if (d.sprintTimerBar) d.sprintTimerBar.style.width = `${pct}%`;
  if (d.sprintTimer) d.sprintTimer.textContent = formatTime(sprintTimeLeft);

  // Color change when low
  if (d.sprintTimerBar) {
    d.sprintTimerBar.className = 'sprint-timer-bar' +
      (sprintTimeLeft <= 10 ? ' sprint-timer-danger' : '') +
      (sprintTimeLeft <= 5 ? ' sprint-timer-critical' : '');
  }
}

// ── End Sprint ──
function endSprint() {
  if (!sprintRunning) return;
  sprintRunning = false;

  if (sprintIntervalId) {
    clearInterval(sprintIntervalId);
    sprintIntervalId = null;
  }

  const d = dom();
  if (d.sprintInput) d.sprintInput.disabled = true;
  if (d.sprintSubmitBtn) d.sprintSubmitBtn.disabled = true;

  // Check if new best — also save sprint stats
  const isNewBest = sprintScore > sprintBest;
  if (isNewBest) {
    sprintBest = sprintScore;
  }
  const saved = loadProgress();
  const g4Stats = saved?.stats?.game4 || { bestScore: 0, totalSprints: 0, sprintScores: [], totalFoundInSprints: 0 };
  g4Stats.totalSprints++;
  g4Stats.totalFoundInSprints += sprintFound.size;
  g4Stats.sprintScores.push(sprintScore);
  if (g4Stats.sprintScores.length > MAX_SPRINT_SCORES) g4Stats.sprintScores = g4Stats.sprintScores.slice(-MAX_SPRINT_SCORES);
  if (sprintScore > g4Stats.bestScore) g4Stats.bestScore = sprintScore;
  saveProgress({
    score: state.score,
    totalFound: state.totalFound,
    allFound: state.allFound,
    completedLetters: g1.completedLetters,
    bestStreak: sprintBest,
    gameStats: { game4: g4Stats },
  });

  // Show results overlay
  if (d.sprintOverlay) d.sprintOverlay.classList.remove('hidden');
  if (d.sprintResultScore) d.sprintResultScore.textContent = `${sprintScore}`;
  if (d.sprintResultBest) d.sprintResultBest.textContent = `${sprintBest}`;
  if (d.sprintResultNewBest) {
    d.sprintResultNewBest.classList.toggle('hidden', !isNewBest);
  }

  // Show list of found countries
  if (d.sprintResultList) {
    const sorted = [...sprintFound].sort();
    d.sprintResultList.innerHTML = sorted
      .map((c) => `<span class="sprint-result-item">${countryFlagEmoji(c)} ${c}</span>`)
      .join('');
  }
}

// ── Submit Guess ──
export function submitSprintGuess() {
  if (!sprintRunning) return;
  const d = dom();
  if (!d.sprintInput) return;

  const raw = d.sprintInput.value.trim();
  if (!raw) return;

  const norm = normalize(raw);
  if (!norm || !COUNTRY_SET.has(norm)) {
    // Not a country name at all
    d.sprintInput.classList.add('error');
    setFeedback(`"${raw}" is not a country`, 'error');
    d.sprintInput.value = '';
    updateSubmitBtn();
    setTimeout(() => d.sprintInput.classList.remove('error'), 400);
    return;
  }

  // Find the properly-cased name
  const matched = ALL_COUNTRIES.find((c) => normalize(c) === norm);
  if (!matched) {
    d.sprintInput.classList.add('error');
    setFeedback(`"${raw}" is not recognized`, 'error');
    d.sprintInput.value = '';
    updateSubmitBtn();
    setTimeout(() => d.sprintInput.classList.remove('error'), 400);
    return;
  }

  if (sprintFound.has(norm)) {
    // Already found this sprint
    d.sprintInput.classList.add('error');
    setFeedback(`${countryFlagEmoji(matched)} ${matched} — already got it!`, 'info');
    d.sprintInput.value = '';
    updateSubmitBtn();
    setTimeout(() => d.sprintInput.classList.remove('error'), 400);
    return;
  }

  // Correct!
  sprintFound.add(norm);
  sprintScore++;
  d.sprintInput.classList.add('success');
  setFeedback(`✓ ${countryFlagEmoji(matched)} ${matched}`, 'success');

  // Update global found set
  if (!state.allFound.has(norm)) {
    state.allFound.add(norm);
    state.score++;
    state.totalFound++;
  }

  updateHeader();
  if (d.sprintScore) d.sprintScore.textContent = `${sprintScore}`;

  // Add to list
  if (d.sprintList) {
    const row = document.createElement('div');
    row.className = 'sprint-list-item';
    row.textContent = `${countryFlagEmoji(matched)} ${matched}`;
    d.sprintList.prepend(row);
    // Limit visible items
    while (d.sprintList.children.length > 50) {
      d.sprintList.removeChild(d.sprintList.lastChild);
    }
  }

  d.sprintInput.value = '';
  updateSubmitBtn();
  setTimeout(() => d.sprintInput.classList.remove('success'), 400);
  d.sprintInput.focus();
}

function setFeedback(text, type = '') {
  const d = dom();
  if (!d.sprintFeedback) return;
  d.sprintFeedback.textContent = text;
  d.sprintFeedback.className = `sprint-feedback ${type}`;
}

function updateSubmitBtn() {
  const d = dom();
  if (!d.sprintSubmitBtn || !d.sprintInput) return;
  d.sprintSubmitBtn.disabled = d.sprintInput.value.trim().length === 0;
}

// ── Public API ──
export function onSprintInput(e) {
  updateSubmitBtn();
}

export function onSprintKeydown(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    submitSprintGuess();
  }
}

export function onSprintPlayAgain() {
  startSprint(sprintBest);
}

export function stopSprint() {
  if (sprintRunning && sprintFound.size > 0) {
    // Persist any progress found mid-sprint before stopping
    saveProgress({
      score: state.score,
      totalFound: state.totalFound,
      allFound: state.allFound,
      completedLetters: g1.completedLetters,
    });
  }
  sprintRunning = false;
  if (sprintIntervalId) {
    clearInterval(sprintIntervalId);
    sprintIntervalId = null;
  }
}
