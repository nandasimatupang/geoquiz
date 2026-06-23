import { $, normalize } from './utils.js';
import { state, showScreen } from './state.js';
import { ALL_COUNTRIES, LETTERS, COUNTRIES_BY_LETTER } from './data/countries.js';
import { CONTINENTS } from './data/continents.js';
import { loadProgress, clearProgress } from './persist.js';
import { resetGame1State } from './game1.js';
import { resetGame2State } from './game2.js';
import { resetGame3State } from './game3.js';
import { resetGame4State } from './game4.js';
import { resetBestStreak } from './state.js';

const CONTINENT_NAMES = ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'];

/**
 * Check if a country name is in the allFound set.
 * The allFound set stores normalized names.
 */
function isFound(name, gameId) {
  return state.gameData[gameId].allFound.has(normalize(name));
}

/**
 * Compute aggregate stats from current state + saved data.
 */
function computeStats() {
  const saved = loadProgress();
  const stats = saved?.stats || {
    game1: { bestStreak: 0, totalGuesses: 0, correctGuesses: 0 },
    game2: { bestStreak: 0, totalRounds: 0, correctRounds: 0 },
    game3: { bestStreak: 0, totalFlags: 0, correctFlags: 0 },
    game4: { bestScore: 0, totalSprints: 0, sprintScores: [], totalFoundInSprints: 0 },
  };

  // Derive completed letters from persisted Set
  const completedLettersSet = saved?.games?.game1?.completedLetters || new Set();
  const completedLetters = LETTERS.filter((l) => completedLettersSet.has(l));
  const remainingLetters = LETTERS.filter((l) => !completedLettersSet.has(l));

  // Total countries found (global aggregation for display if needed)
  const totalCountries = ALL_COUNTRIES.length;
  // Let's use the maximum found among all games as the overall "foundCount"
  const foundCount = Math.max(
    state.gameData.game1.allFound.size,
    state.gameData.game2.allFound.size,
    state.gameData.game3.allFound.size,
    state.gameData.game4.allFound.size
  );
  const foundPct = totalCountries > 0 ? Math.round((foundCount / totalCountries) * 100) : 0;

  // Game 1: letter progress
  let g1LetterFound = 0;
  let g1LetterTotal = 0;
  LETTERS.forEach((l) => {
    const countries = COUNTRIES_BY_LETTER[l] || [];
    g1LetterTotal += countries.length;
    countries.forEach((c) => {
      if (isFound(c, 'game1')) g1LetterFound++;
    });
  });

  // Continent breakdown
  const continentProgress = CONTINENT_NAMES.map((name) => {
    const countries = ALL_COUNTRIES.filter((c) => CONTINENTS[c] === name);
    const found = countries.filter((c) => isFound(c, 'game3')).length;
    return {
      name,
      total: countries.length,
      found,
      pct: countries.length > 0 ? Math.round((found / countries.length) * 100) : 0,
    };
  });

  // Sprint averages
  const sprintScores = stats.game4?.sprintScores || [];
  const avgSprint = sprintScores.length > 0
    ? Math.round(sprintScores.reduce((a, b) => a + b, 0) / sprintScores.length)
    : 0;

  // Per-game accuracy
  const g1Accuracy = stats.game1?.totalGuesses > 0
    ? Math.round((stats.game1.correctGuesses / stats.game1.totalGuesses) * 100)
    : 0;
  const g2Accuracy = stats.game2?.totalRounds > 0
    ? Math.round((stats.game2.correctRounds / stats.game2.totalRounds) * 100)
    : 0;
  const g3Accuracy = stats.game3?.totalFlags > 0
    ? Math.round((stats.game3.correctFlags / stats.game3.totalFlags) * 100)
    : 0;

  // Overall totals (excluding sprint — sprints don't have wrong-answer tracking)
  const totalCorrect = (stats.game1?.correctGuesses || 0) +
    (stats.game2?.correctRounds || 0) +
    (stats.game3?.correctFlags || 0);

  const totalAttempts = (stats.game1?.totalGuesses || 0) +
    (stats.game2?.totalRounds || 0) +
    (stats.game3?.totalFlags || 0);

  const overallAccuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

  return {
    foundCount,
    totalCountries,
    foundPct,
    completedLetters,
    remainingLetters,
    g1LetterFound,
    g1LetterTotal,
    continentProgress,
    avgSprint,
    g1Accuracy,
    g2Accuracy,
    g3Accuracy,
    overallAccuracy,
    totalCorrect,
    totalAttempts,
    stats,
  };
}

/**
 * Render the full stats page.
 */
export function renderStats() {
  const data = computeStats();

  // ── Game 1 Stats ──
  const g1El = $('stats-game1');
  if (g1El) {
    const completedStr = data.completedLetters.map((l) => `<span class="stats-letter-done">${l}</span>`).join('');
    const remainingStr = data.remainingLetters.map((l) => `<span class="stats-letter-todo">${l}</span>`).join('');
    g1El.innerHTML = `
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-icon">🔤</span>
          <h3>Guess by Letter</h3>
        </div>
        <div class="stat-grid">
          <div class="stat-item">
            <span class="stat-value">${data.completedLetters.length} / ${LETTERS.length}</span>
            <span class="stat-label">Letters Done</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${data.stats.game1?.bestStreak || 0}</span>
            <span class="stat-label">Best Streak 🔥</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${data.g1Accuracy}%</span>
            <span class="stat-label">Accuracy</span>
          </div>
        </div>
        <div class="stats-letter-row">
          <div class="stats-letter-label">Completed</div>
          <div class="stats-letter-badges">${completedStr || '<span class="stats-letter-none">None yet</span>'}</div>
        </div>
        <div class="stats-letter-row">
          <div class="stats-letter-label">Remaining</div>
          <div class="stats-letter-badges">${remainingStr}</div>
        </div>
      </div>
    `;
  }

  // ── Game 2 Stats ──
  const g2El = $('stats-game2');
  if (g2El) {
    g2El.innerHTML = `
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-icon">🗺️</span>
          <h3>Guess the Shape</h3>
        </div>
        <div class="stat-grid">
          <div class="stat-item">
            <span class="stat-value">${data.stats.game2?.bestStreak || 0}</span>
            <span class="stat-label">Best Streak 🔥</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${data.stats.game2?.totalRounds || 0}</span>
            <span class="stat-label">Rounds Played</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${data.g2Accuracy}%</span>
            <span class="stat-label">Accuracy</span>
          </div>
        </div>
      </div>
    `;
  }

  // ── Game 3 Stats ──
  const g3El = $('stats-game3');
  if (g3El) {
    g3El.innerHTML = `
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-icon">🏁</span>
          <h3>Flag Guesser</h3>
        </div>
        <div class="stat-grid">
          <div class="stat-item">
            <span class="stat-value">${data.stats.game3?.bestStreak || 0}</span>
            <span class="stat-label">Best Streak 🔥</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${data.stats.game3?.correctFlags || 0}</span>
            <span class="stat-label">Flags Identified</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${data.g3Accuracy}%</span>
            <span class="stat-label">Accuracy</span>
          </div>
        </div>
        <div class="stats-continent-section">
          <div class="stats-letter-label">By Continent</div>
          ${data.continentProgress.map((c) => `
            <div class="stats-continent-row">
              <span class="stats-continent-name">${c.name}</span>
              <div class="stats-continent-bar-track">
                <div class="stats-continent-bar-fill" style="width:${c.pct}%"></div>
              </div>
              <span class="stats-continent-count">${c.found} / ${c.total}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // ── Game 4 Stats ──
  const g4El = $('stats-game4');
  if (g4El) {
    const sprintScores = data.stats.game4?.sprintScores || [];
    const recentScores = [...sprintScores].reverse().slice(0, 10);
    const maxSprint = Math.max(...sprintScores, 1);
    g4El.innerHTML = `
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-icon">⏱️</span>
          <h3>Timed Sprint</h3>
        </div>
        <div class="stat-grid">
          <div class="stat-item">
            <span class="stat-value">${data.stats.game4?.bestScore || 0}</span>
            <span class="stat-label">Best Score 🏆</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${data.stats.game4?.totalSprints || 0}</span>
            <span class="stat-label">Sprints Played</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${data.avgSprint}</span>
            <span class="stat-label">Avg Score</span>
          </div>
        </div>
        ${recentScores.length > 1 ? `
          <div class="stats-sprint-history">
            <div class="stats-letter-label">Recent Scores</div>
            <div class="stats-sprint-bars">
              ${recentScores.map((s) => {
                const h = Math.max(4, (s / maxSprint) * 60);
                const isBest = s === data.stats.game4?.bestScore;
                return `<div class="stats-sprint-bar-wrap" title="${s}">
                  <div class="stats-sprint-bar ${isBest ? 'stats-sprint-bar-best' : ''}" style="height:${h}px"></div>
                </div>`;
              }).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  // ── Overall Accuracy ──
  const accuracyEl = $('stats-accuracy');
  if (accuracyEl) {
    const circumference = data.overallAccuracy * 3.27; // 327 / 100
    accuracyEl.innerHTML = `
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-icon">🎯</span>
          <h3>Overall Accuracy</h3>
        </div>
        <div class="stat-accuracy-ring">
          <svg viewBox="0 0 120 120" width="120" height="120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(6, 182, 212, 0.1)" stroke-width="10"/>
            <circle cx="60" cy="60" r="52" fill="none" stroke="#06b6d4" stroke-width="10"
              stroke-linecap="round" stroke-dasharray="${circumference} 327"
              transform="rotate(-90 60 60)" style="transition: stroke-dasharray 1s ease"/>
          </svg>
          <div class="stat-accuracy-center">
            <span class="stat-accuracy-value">${data.overallAccuracy}%</span>
            <span class="stat-accuracy-label">correct</span>
          </div>
        </div>
        <div class="stat-accuracy-detail">
          <span>${data.totalCorrect} correct out of ${data.totalAttempts} total guesses</span>
        </div>
      </div>
    `;
  }
}

/**
 * Navigate to the stats screen and render it.
 */
export function showStats() {
  // Ensure we stop any active game when going to stats
  state.currentGame = null;
  showScreen('stats-screen');
  renderStats();

  // Wire up reset button
  const resetBtn = $('stats-reset-btn');
  if (resetBtn) {
    // Remove old listener by cloning (simple approach)
    const newBtn = resetBtn.cloneNode(true);
    resetBtn.parentNode.replaceChild(newBtn, resetBtn);
    newBtn.addEventListener('click', handleResetData);
  }
}

/**
 * Show the reset confirmation modal.
 */
export function handleResetData() {
  const modal = $('confirm-modal');
  if (!modal) return;
  modal.classList.remove('hidden');

  const btnCancel = $('confirm-cancel-btn');
  const btnYes = $('confirm-yes-btn');

  const newCancel = btnCancel.cloneNode(true);
  btnCancel.parentNode.replaceChild(newCancel, btnCancel);
  newCancel.addEventListener('click', () => modal.classList.add('hidden'));

  const newYes = btnYes.cloneNode(true);
  btnYes.parentNode.replaceChild(newYes, btnYes);
  newYes.addEventListener('click', () => {
    modal.classList.add('hidden');
    executeResetData();
  });
}

function executeResetData() {
  // 1) Clear localStorage
  clearProgress();

  // 2) Reset all in-memory state across every game module
  state.gameData.game1 = { score: 0, totalFound: 0, allFound: new Set(), bestStreak: 0, completedLetters: new Set() };
  state.gameData.game2 = { score: 0, totalFound: 0, allFound: new Set(), bestStreak: 0 };
  state.gameData.game3 = { score: 0, totalFound: 0, allFound: new Set(), bestStreak: 0 };
  state.gameData.game4 = { score: 0, totalFound: 0, allFound: new Set(), bestStreak: 0 };

  resetGame1State();
  resetGame2State();
  resetGame3State();
  resetGame4State();
  resetBestStreak();

  // 3) Navigate to home so the user sees a fresh start immediately
  showScreen('home-screen');

  // 4) Hard redirect to ensure all module state is fully cleared.
  setTimeout(() => {
    window.location.href = window.location.pathname + '#home';
    window.location.reload();
  }, 200);
}
