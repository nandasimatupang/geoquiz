import { $, normalize, showToast, shuffle, escapeAttr } from './utils.js';
import { state, updateHeader, showScreen } from './state.js';
import { ALL_COUNTRIES, COUNTRIES_BY_LETTER } from './data/countries.js';
import { CONTINENTS } from './data/continents.js';
import { countryFlagEmoji } from './data/flags.js';
import { fetchTopoData, drawCountryOutline, drawCountryWithNeighbors } from './map-renderer.js';
import { saveProgress, loadProgress } from './persist.js';
import { g1 } from './game1.js';
import { initGlobe, showGlobe, hideGlobe, setGlobeFound } from './globe-progress.js';

// ── DOM refs (lazily resolved) ──
function dom() {
  return {
    mapCanvas: $('map-canvas'),
    mapLoading: $('map-loading'),
    mapSkipBtn: $('map-skip-btn'),
    mapRoundEl: $('map-round'),
    mcOptions: $('mc-options'),
    streakEl: $('g2-streak'),
    globeCount: $('g2-globe-count'),
  };
}

// ── Game 2 State ──
let stopMapGame = false;
let mapCountries = [];
let mapCurrent = null;
let mapRound = 0;
let mcAnswering = false;
let g2Streak = 0;
let g2BestStreak = 0;
let difficulty = 'normal'; // 'normal' or 'hard'

// ── Reset State ──
export function resetGame2State() {
  stopMapGame = false;
  mapCountries = [];
  mapCurrent = null;
  mapRound = 0;
  mcAnswering = false;
  g2Streak = 0;
  g2BestStreak = 0;
  difficulty = 'normal';
}

// ── Generate Multiple Choice Options ──
function generateOptions(correctName) {
  const continent = CONTINENTS[correctName] || '';
  const sameContinent = [];
  const otherContinent = [];
  ALL_COUNTRIES.forEach((c) => {
    if (c !== correctName) {
      if (CONTINENTS[c] === continent) sameContinent.push(c);
      else otherContinent.push(c);
    }
  });
  shuffle(sameContinent);
  shuffle(otherContinent);
  const distractors = sameContinent.slice(0, 3).concat(otherContinent.slice(0, Math.max(0, 3 - sameContinent.length)));
  return shuffle([correctName, ...distractors.slice(0, 3)]);
}

function pickRandomCountry() {
  const available = mapCountries.filter((c) => !state.allFound.has(normalize(c.name)));
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

// ── Render Options ──
function renderOptions(options, correctName) {
  const d = dom();
  if (!d.mcOptions) return;
  mcAnswering = true;
  d.mcOptions.innerHTML = options
    .map((name) => {
      return `<button class="mc-option" data-country="${escapeAttr(name)}">
        <span class="mc-flag">${countryFlagEmoji(name)}</span>
        <span class="mc-name">${escapeAttr(name)}</span>
      </button>`;
    })
    .join('');
}

// ── Handle Option Click ──
function handleOptionClick(selectedName) {
  if (!mcAnswering || !mapCurrent) return;
  mcAnswering = false;

  const correctName = mapCurrent.name;
  const d = dom();
  if (!d.mcOptions) return;
  const allBtns = d.mcOptions.querySelectorAll('.mc-option');
  allBtns.forEach((btn) => (btn.disabled = true));

  if (selectedName === correctName) {
    const btn = d.mcOptions.querySelector(`.mc-option[data-country="${correctName}"]`);
    if (btn) btn.classList.add('correct');
    showToast(`✓ ${countryFlagEmoji(correctName)} ${correctName}!`, 'success');

    // Update streak
    g2Streak++;
    if (g2Streak > g2BestStreak) g2BestStreak = g2Streak;
    updateMapStreak();
    if (d.streakEl) {
      d.streakEl.classList.add('pop');
      setTimeout(() => { if (d.streakEl) d.streakEl.classList.remove('pop'); }, 400);
    }

    if (!state.allFound.has(normalize(correctName))) {
      state.allFound.add(normalize(correctName));
      state.score++;
      state.totalFound++;
      setGlobeFound(state.allFound);
    }
    // Save per-game stats
    const saved = loadProgress();
    const g2Stats = saved?.stats?.game2 || { bestStreak: 0, totalRounds: 0, correctRounds: 0 };
    g2Stats.totalRounds++;
    g2Stats.correctRounds++;
    if (g2Streak > g2Stats.bestStreak) g2Stats.bestStreak = g2Streak;
    saveProgress({
      gameId: 'game2',
      score: state.score,
      totalFound: state.totalFound,
      allFound: state.allFound,
      completedLetters: g1.completedLetters,
      gameStats: { game2: g2Stats },
    });
    updateHeader();

    setTimeout(() => {
      if (!stopMapGame) {
        mcAnswering = true;
        startMapRound();
      }
    }, 1200);
  } else {
    allBtns.forEach((btn) => {
      if (btn.dataset.country === selectedName) btn.classList.add('wrong');
      if (btn.dataset.country === correctName) btn.classList.add('correct');
    });
    showToast(`✗ It was ${countryFlagEmoji(correctName)} ${correctName}`, 'error');
    // Save wrong attempt to stats
    const saved2 = loadProgress();
    const g2Stats2 = saved2?.stats?.game2 || { bestStreak: 0, totalRounds: 0, correctRounds: 0 };
    g2Stats2.totalRounds++;
    saveProgress({
      gameId: 'game2',
      score: state.score,
      totalFound: state.totalFound,
      allFound: state.allFound,
      completedLetters: g1.completedLetters,
      gameStats: { game2: g2Stats2 },
    });
    // Reset streak on wrong
    g2Streak = 0;
    updateMapStreak();
    setTimeout(() => {
      if (!stopMapGame) {
        mcAnswering = true;
        startMapRound();
      }
    }, 1800);
  }
}

// ── Update globe progress count ──
function updateGlobeCount() {
  const d = dom();
  if (!d.globeCount) return;
  const found = state.allFound.size;
  const total = ALL_COUNTRIES.length;
  d.globeCount.textContent = `${found} / ${total}`;
  const fill = document.getElementById('g2-progress-fill');
  if (fill) {
    fill.style.width = `${(found / total) * 100}%`;
  }
}

// ── Start a Round ──
function startMapRound() {
  if (stopMapGame) return;
  mapCurrent = pickRandomCountry();
  if (!mapCurrent) {
    // All countries found — show completion
    const d = dom();
    if (d.mapCanvas) {
      const ctx = d.mapCanvas.getContext('2d');
      const rect = d.mapCanvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      d.mapCanvas.width = Math.round(rect.width * dpr);
      d.mapCanvas.height = Math.round(rect.height * dpr);
      ctx.scale(dpr, dpr);
      const bg = ctx.createRadialGradient(rect.width / 2, rect.height / 2, 0, rect.width / 2, rect.height / 2, rect.width * 0.6);
      bg.addColorStop(0, '#0f1f3a');
      bg.addColorStop(0.5, '#0a1628');
      bg.addColorStop(1, '#060e1a');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, rect.width, rect.height);
      ctx.fillStyle = '#10b981';
      ctx.font = `bold ${Math.min(rect.width * 0.08, 36)}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('🎉 All countries found!', rect.width / 2, rect.height / 2 - 20);
      ctx.fillStyle = '#94a3b8';
      ctx.font = `${Math.min(rect.width * 0.04, 18)}px Inter, sans-serif`;
      ctx.fillText('You completed every country on the map!', rect.width / 2, rect.height / 2 + 30);
    }
    if (d.mcOptions) d.mcOptions.innerHTML = '';
    mcAnswering = false;
    return;
  }
  mapRound++;
  const d = dom();
  if (d.mapRoundEl) d.mapRoundEl.textContent = `Round ${mapRound}`;
  updateMapStreak();
  updateGlobeCount();

  if (difficulty === 'normal') {
    // Normal mode: draw target country + 4 nearby neighbors with target highlighted
    drawCountryWithNeighbors(mapCurrent.name, mapCountries);
  } else {
    // Hard mode: only the selected country's outline
    drawCountryOutline(mapCurrent.feature);
  }

  const options = generateOptions(mapCurrent.name);
  renderOptions(options, mapCurrent.name);

  if (d.mapCanvas) d.mapCanvas.classList.remove('hidden');
  if (d.mapLoading) d.mapLoading.classList.add('hidden');
}

function updateMapStreak() {
  const d = dom();
  if (!d.streakEl) return;
  if (g2Streak > 0) {
    d.streakEl.innerHTML = `<i class="ph-bold ph-fire"></i> ${g2Streak}`;
    d.streakEl.className = g2Streak >= 5 ? 'g2-streak hot' : 'g2-streak active';
  } else {
    d.streakEl.textContent = '—';
    d.streakEl.className = 'g2-streak';
  }
}

// ── Start Game 2 ──
export async function startGame2() {
  state.currentGame = 'game2';
  stopMapGame = false;
  mapRound = 0;
  mcAnswering = false;
  mapCurrent = null;
  g2Streak = 0;
  showScreen('mapgame-screen');
  updateHeader();

  const data = await fetchTopoData();
  if (mapCountries.length === 0 && data && data.length > 0) {
    mapCountries = data;
    initGlobe(mapCountries);
  }
  
  showGlobe(state.allFound);

  if (mapCountries.length > 0 && !stopMapGame) {
    startMapRound();
  }
}

// ── Public API for main.js ──
export function skipRound() {
  if (!mapCurrent || !mcAnswering) return;
  mcAnswering = false;
  const d = dom();
  if (d.mcOptions) {
    d.mcOptions.querySelectorAll('.mc-option').forEach((btn) => (btn.disabled = true));
  }
  showToast(`Skipped! It was ${countryFlagEmoji(mapCurrent.name)} ${mapCurrent.name}`, 'info');
  setTimeout(() => {
    if (!stopMapGame) startMapRound();
  }, 800);
}

export function handleMcClick(e) {
  const btn = e.target.closest('.mc-option');
  if (btn && !btn.disabled) handleOptionClick(btn.dataset.country);
}

export function setDifficulty(diff) {
  difficulty = diff;
  // Update active button styles
  document.querySelectorAll('.diff-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.diff === diff);
  });
  // Re-render the current round immediately if in game 2
  if (state.currentGame === 'game2' && mapCurrent && !stopMapGame) {
    const d = dom();
    if (difficulty === 'normal') {
      drawCountryWithNeighbors(mapCurrent.name, mapCountries);
    } else {
      drawCountryOutline(mapCurrent.feature);
    }
    if (d.mapCanvas) {
      d.mapCanvas.classList.remove('hidden');
    }
  }
}

export function stopGame() {
  stopMapGame = true;
}
