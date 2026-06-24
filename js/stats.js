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

  const completedLettersSet = saved?.games?.game1?.completedLetters || new Set();
  const completedLetters = LETTERS.filter((l) => completedLettersSet.has(l));
  const remainingLetters = LETTERS.filter((l) => !completedLettersSet.has(l));

  // Total countries found (global aggregation for display if needed)
  const totalCountries = ALL_COUNTRIES.length;
  const overallTotalTarget = totalCountries * 3;

  // Sum of progress across game 1, 2, and 3
  const foundCount = state.gameData.game1.allFound.size +
                     state.gameData.game2.allFound.size +
                     state.gameData.game3.allFound.size;
                     
  const foundPct = overallTotalTarget > 0 ? Math.round((foundCount / overallTotalTarget) * 100) : 0;

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

  // Per-game completion
  const g1Completion = totalCountries > 0 ? Math.round((state.gameData.game1.allFound.size / totalCountries) * 100) : 0;
  const g2Completion = totalCountries > 0 ? Math.round((state.gameData.game2.allFound.size / totalCountries) * 100) : 0;
  const g3Completion = totalCountries > 0 ? Math.round((state.gameData.game3.allFound.size / totalCountries) * 100) : 0;

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
    overallTotalTarget,
    foundPct,
    completedLetters,
    remainingLetters,
    g1LetterFound,
    g1LetterTotal,
    continentProgress,
    avgSprint,
    g1Completion,
    g2Completion,
    g3Completion,
    overallAccuracy,
    totalCorrect,
    totalAttempts,
    stats,
  };
}

function getMiniRingHTML(percentage) {
  const circumference = percentage * 1.256;
  return `
    <div class="mini-ring-wrapper" title="Completion">
      <svg viewBox="0 0 50 50" width="36" height="36">
        <circle cx="25" cy="25" r="20" fill="none" stroke="rgba(6, 182, 212, 0.1)" stroke-width="5"/>
        <circle cx="25" cy="25" r="20" fill="none" stroke="#06b6d4" stroke-width="5"
          stroke-linecap="round" stroke-dasharray="${circumference} 125.6"
          transform="rotate(-90 25 25)" style="transition: stroke-dasharray 1s ease"/>
      </svg>
      <div class="mini-ring-center">${percentage}%</div>
    </div>
  `;
}

function getMiniScoreHTML(score) {
  return `
    <div class="mini-score-wrapper" title="Best Score">
      <i class="ph-duotone ph-trophy"></i>
      <span>${score}</span>
    </div>
  `;
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
      <div class="stat-card accordion-card" id="acc-card-g1">
        <div class="stat-card-header accordion-header" onclick="document.getElementById('acc-card-g1').classList.toggle('open')">
          <div class="accordion-title">
            <span class="stat-card-icon"><i class="ph-duotone ph-text-aa"></i></span>
            <h3>Guess by Letter</h3>
          </div>
          <div class="accordion-summary">
            ${getMiniRingHTML(data.g1Completion)}
            <i class="ph-bold ph-caret-down accordion-icon"></i>
          </div>
        </div>
        <div class="accordion-content">
          <div class="accordion-inner">
            <div class="stat-grid">
              <div class="stat-item">
                <span class="stat-value">${data.completedLetters.length} / ${LETTERS.length}</span>
                <span class="stat-label">Letters Done</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">${data.stats.game1?.bestStreak || 0}</span>
                <span class="stat-label">Best Streak <i class="ph-duotone ph-fire" style="color:var(--ocean-accent)"></i></span>
              </div>
              <div class="stat-item">
                <span class="stat-value">${data.g1Completion}%</span>
                <span class="stat-label">Completion</span>
              </div>
            </div>
            <div class="stats-letter-row" style="margin-top: 14px;">
              <div class="stats-letter-label">Completed</div>
              <div class="stats-letter-badges">${completedStr || '<span class="stats-letter-none">None yet</span>'}</div>
            </div>
            <div class="stats-letter-row">
              <div class="stats-letter-label">Remaining</div>
              <div class="stats-letter-badges">${remainingStr}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ── Game 2 Stats ──
  const g2El = $('stats-game2');
  if (g2El) {
    g2El.innerHTML = `
      <div class="stat-card accordion-card" id="acc-card-g2">
        <div class="stat-card-header accordion-header" onclick="document.getElementById('acc-card-g2').classList.toggle('open')">
          <div class="accordion-title">
            <span class="stat-card-icon"><i class="ph-duotone ph-map-trifold"></i></span>
            <h3>Guess the Shape</h3>
          </div>
          <div class="accordion-summary">
            ${getMiniRingHTML(data.g2Completion)}
            <i class="ph-bold ph-caret-down accordion-icon"></i>
          </div>
        </div>
        <div class="accordion-content">
          <div class="accordion-inner">
            <div class="stat-grid">
              <div class="stat-item">
                <span class="stat-value">${data.stats.game2?.bestStreak || 0}</span>
                <span class="stat-label">Best Streak <i class="ph-duotone ph-fire" style="color:var(--ocean-accent)"></i></span>
              </div>
              <div class="stat-item">
                <span class="stat-value">${data.stats.game2?.totalRounds || 0}</span>
                <span class="stat-label">Rounds Played</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">${data.g2Completion}%</span>
                <span class="stat-label">Completion</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ── Game 3 Stats ──
  const g3El = $('stats-game3');
  if (g3El) {
    g3El.innerHTML = `
      <div class="stat-card accordion-card" id="acc-card-g3">
        <div class="stat-card-header accordion-header" onclick="document.getElementById('acc-card-g3').classList.toggle('open')">
          <div class="accordion-title">
            <span class="stat-card-icon"><i class="ph-duotone ph-flag"></i></span>
            <h3>Flag Guesser</h3>
          </div>
          <div class="accordion-summary">
            ${getMiniRingHTML(data.g3Completion)}
            <i class="ph-bold ph-caret-down accordion-icon"></i>
          </div>
        </div>
        <div class="accordion-content">
          <div class="accordion-inner">
            <div class="stat-grid">
              <div class="stat-item">
                <span class="stat-value">${data.stats.game3?.bestStreak || 0}</span>
                <span class="stat-label">Best Streak <i class="ph-duotone ph-fire" style="color:var(--ocean-accent)"></i></span>
              </div>
              <div class="stat-item">
                <span class="stat-value">${data.stats.game3?.correctFlags || 0}</span>
                <span class="stat-label">Flags Identified</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">${data.g3Completion}%</span>
                <span class="stat-label">Completion</span>
              </div>
            </div>
            <div class="stats-continent-section" style="margin-top: 14px;">
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
      <div class="stat-card accordion-card" id="acc-card-g4">
        <div class="stat-card-header accordion-header" onclick="document.getElementById('acc-card-g4').classList.toggle('open')">
          <div class="accordion-title">
            <span class="stat-card-icon"><i class="ph-duotone ph-timer"></i></span>
            <h3>Timed Sprint</h3>
          </div>
          <div class="accordion-summary">
            ${getMiniScoreHTML(data.stats.game4?.bestScore || 0)}
            <i class="ph-bold ph-caret-down accordion-icon"></i>
          </div>
        </div>
        <div class="accordion-content">
          <div class="accordion-inner">
            <div class="stat-grid">
              <div class="stat-item">
                <span class="stat-value">${data.stats.game4?.bestScore || 0}</span>
                <span class="stat-label">Best Score <i class="ph-duotone ph-trophy" style="color:var(--ocean-accent)"></i></span>
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
              <div class="stats-sprint-history" style="margin-top: 14px;">
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
        </div>
      </div>
    `;
  }

  // ── Overall Progress ──
  const accuracyEl = $('stats-accuracy');
  if (accuracyEl) {
    const circumference = data.foundPct * 3.27; // 327 / 100
    accuracyEl.innerHTML = `
      <div class="stat-card">
        <div class="stat-card-header">
          <span class="stat-card-icon"><i class="ph-duotone ph-globe"></i></span>
          <h3>Overall Progress</h3>
        </div>
        <div class="stat-accuracy-ring">
          <svg viewBox="0 0 120 120" width="120" height="120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(6, 182, 212, 0.1)" stroke-width="10"/>
            <circle cx="60" cy="60" r="52" fill="none" stroke="#06b6d4" stroke-width="10"
              stroke-linecap="round" stroke-dasharray="${circumference} 327"
              transform="rotate(-90 60 60)" style="transition: stroke-dasharray 1s ease"/>
          </svg>
          <div class="stat-accuracy-center">
            <span class="stat-accuracy-value">${data.foundPct}%</span>
            <span class="stat-accuracy-label">completed</span>
          </div>
        </div>
        <div class="stat-accuracy-detail">
          <span>${data.foundCount} complete guesses out of ${data.overallTotalTarget} possible</span>
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
