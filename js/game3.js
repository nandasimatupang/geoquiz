import { $, normalize, showToast, shuffle, escapeAttr } from './utils.js';
import { state, updateHeader, showScreen } from './state.js';
import { ALL_COUNTRIES } from './data/countries.js';
import { CONTINENTS } from './data/continents.js';
import { countryFlag, countryFlagEmoji, COUNTRY_ISO } from './data/flags.js';
import { saveProgress, loadProgress } from './persist.js';
import { g1 } from './game1.js';

// ── Difficulty tiers ──
// Well-known flags — user starts here for early success (dopamine)
const EASY_COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'France', 'Germany',
  'Italy', 'Spain', 'Brazil', 'Argentina', 'Japan', 'China', 'India',
  'Australia', 'Russia', 'Mexico', 'South Korea', 'Sweden', 'Switzerland',
  'Netherlands', 'Egypt', 'South Africa', 'Nigeria', 'Turkey', 'Greece',
  'Portugal', 'Norway', 'Ireland', 'New Zealand', 'Thailand', 'Israel',
  'Poland', 'Denmark', 'Finland', 'Cuba', 'Jamaica',
];

const MEDIUM_COUNTRIES = ALL_COUNTRIES.filter(
  (c) => !EASY_COUNTRIES.includes(c)
);

// ── Continent list ──
const CONTINENT_NAMES = ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'];

// ── Preload all easy flags at module init ──
// This ensures the first flag shown loads instantly from cache
import { preloadFlagImages } from './data/flags.js';
preloadFlagImages(EASY_COUNTRIES);

// ── DOM refs ──
function dom() {
  return {
    flagRound: $('flag-round'),
    flagStreak: $('flag-streak'),
    flagBest: $('flag-best'),
    flagDisplay: $('flag-display'),
    flagOptions: $('flag-options'),
    flagProgress: $('flag-progress'),
    flagProgressText: $('flag-progress-text'),
  };
}

// ── Helpers ──
function isContinentComplete(continent) {
  const countries = ALL_COUNTRIES.filter((c) => CONTINENTS[c] === continent);
  return countries.every((c) => state.allFound.has(normalize(c)));
}



// ── Reset State ──
export function resetGame3State() {
  currentStreak = 0;
  bestStreak = 0;
  flagCountry = null;
  flagRoundNum = 0;
  flagAnswering = false;
  flagEasyPhase = true;
  flagEasyCorrect = 0;
  flagStop = false;
  selectedContinent = null;
}

// ── Game 3 State ──
let currentStreak = 0;
let bestStreak = 0;
let flagCountry = null;
let flagRoundNum = 0;
let flagAnswering = false;
let flagEasyPhase = true;
let flagEasyCorrect = 0;
let flagStop = false;
let selectedContinent = null; // null = all, or continent name string

// ── Helper: get active country pool based on continent filter ──
function getActivePool() {
  if (selectedContinent) {
    return ALL_COUNTRIES.filter((c) => CONTINENTS[c] === selectedContinent);
  }
  return ALL_COUNTRIES;
}

function getActiveEasyCountries() {
  if (selectedContinent) {
    return EASY_COUNTRIES.filter((c) => CONTINENTS[c] === selectedContinent);
  }
  return EASY_COUNTRIES;
}

function getActiveMediumCountries() {
  const active = getActivePool();
  const easy = getActiveEasyCountries();
  return active.filter((c) => !easy.includes(c));
}

// ── Generate Options ──
function generateFlagOptions(correctName) {
  const continent = CONTINENTS[correctName] || '';
  const pool = getActivePool();
  const sameContinent = [];
  const otherContinent = [];
  pool.forEach((c) => {
    if (c !== correctName) {
      if (CONTINENTS[c] === continent) sameContinent.push(c);
      else otherContinent.push(c);
    }
  });
  shuffle(sameContinent);
  shuffle(otherContinent);
  const distractors = sameContinent.slice(0, 3).concat(
    otherContinent.slice(0, Math.max(0, 3 - sameContinent.length))
  );
  // If still not enough distractors (very small continent pool), fall back to ALL_COUNTRIES
  if (distractors.length < 3) {
    const fallback = ALL_COUNTRIES.filter((c) => c !== correctName);
    shuffle(fallback);
    distractors.push(...fallback.slice(0, 3 - distractors.length));
  }
  return shuffle([correctName, ...distractors.slice(0, 3)]);
}

// ── Pick a country based on difficulty phase ──
function pickFlagCountry() {
  const activePool = getActivePool();
  const activeEasy = getActiveEasyCountries();
  const activeMedium = getActiveMediumCountries();

  let pool;
  const allUnfound = activePool.filter(
    (c) => !state.allFound.has(normalize(c))
  );

  // Easy phase: start with well-known flags, gradually mix in medium
  if (flagEasyPhase && flagEasyCorrect < 5) {
    const availEasy = activeEasy.filter(
      (c) => !state.allFound.has(normalize(c))
    );
    pool = availEasy.length > 0 ? availEasy : allUnfound;
    if (pool.length === 0) pool = activePool;
  } else if (flagEasyPhase && flagEasyCorrect < 10) {
    const availEasy = activeEasy.filter(
      (c) => !state.allFound.has(normalize(c))
    );
    const availMedium = activeMedium.filter(
      (c) => !state.allFound.has(normalize(c))
    );
    const easyPool = availEasy.length > 0 ? availEasy : allUnfound;
    const medPool = availMedium.length > 0 ? availMedium : allUnfound;
    pool = Math.random() < 0.7
      ? [easyPool[Math.floor(Math.random() * easyPool.length)]]
      : [medPool[Math.floor(Math.random() * medPool.length)]];
    if (!pool[0]) pool = allUnfound;
  } else {
    pool = allUnfound.length > 0 ? allUnfound : activePool;
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── Background flag preloading ──
function preloadNextFlags(count = 8) {
  const seen = new Set();
  let attempts = 0;
  while (seen.size < count && attempts < count * 4) {
    attempts++;
    const name = pickFlagCountry();
    const iso = COUNTRY_ISO[name];
    if (iso && !seen.has(name)) {
      seen.add(name);
      const img = new Image();
      img.src = `https://flagcdn.com/${iso}.svg`;
    }
  }
}

// ── Update continent filter markers ──
function updateContinentMarkers() {
  document.querySelectorAll('.fc-btn').forEach((btn) => {
    const continent = btn.dataset.continent;
    if (continent && continent !== 'all' && isContinentComplete(continent)) {
      btn.classList.add('completed');
    } else {
      btn.classList.remove('completed');
    }
  });
}

// ── Show completion screen ──
function showCompletion() {
  const d = dom();
  flagAnswering = false;
  if (d.flagOptions) d.flagOptions.innerHTML = '';

  let icon, title, desc;
  if (selectedContinent) {
    icon = '<i class="ph-duotone ph-confetti"></i>';
    title = 'Continent Complete!';
    desc = `You found every country in ${selectedContinent}!`;
  } else if (CONTINENT_NAMES.every((c) => isContinentComplete(c))) {
    icon = '<i class="ph-duotone ph-globe"></i>';
    title = 'World Complete!';
    desc = 'You found every country in the world! Amazing!';
  } else {
    // Some continents done — suggest next
    const next = CONTINENT_NAMES.find((c) => !isContinentComplete(c));
    icon = '<i class="ph-duotone ph-star"></i>';
    title = 'Keep Going!';
    const done = CONTINENT_NAMES.filter((c) => isContinentComplete(c)).length;
    desc = `${done} / 6 continents complete. Ready for ${next}?`;
  }

  if (d.flagDisplay) {
    d.flagDisplay.innerHTML = `
      <div class="flag-completion">
        <span class="flag-completion-icon">${icon}</span>
        <h3 class="flag-completion-title">${title}</h3>
        <p class="flag-completion-desc">${desc}</p>
      </div>`;
  }

  updateContinentMarkers();
}

// ── Continent filter click ──
export function setContinentFilter(continent) {
  selectedContinent = continent === 'all' ? null : continent;
  // Update active filter button styles
  document.querySelectorAll('.fc-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.continent === continent);
  });
  // Restart the game with new filter (preserve streak)
  if (!flagStop) {
    updateContinentMarkers();
    renderFlagRound();
  }
}

// ── Render the flag ──
function renderFlagRound() {
  if (flagStop) return;
  const d = dom();
  if (!d.flagDisplay) return;

  // Check if there are any remaining countries to guess
  const activePool = getActivePool();
  const remaining = activePool.filter((c) => !state.allFound.has(normalize(c)));
  if (remaining.length === 0) {
    showCompletion();
    return;
  }

  flagCountry = pickFlagCountry();
  flagRoundNum++;
  if (d.flagRound) d.flagRound.textContent = `Round ${flagRoundNum}`;
  if (d.flagStreak) {
    d.flagStreak.innerHTML = currentStreak > 0 ? `<i class="ph-bold ph-fire"></i> ${currentStreak}` : '—';
    d.flagStreak.className = currentStreak >= 5 ? 'flag-streak hot' : 'flag-streak';
  }
  if (d.flagBest) d.flagBest.textContent = `Best: ${bestStreak}`;

  const total = activePool.length;
  const found = activePool.filter((c) => state.allFound.has(normalize(c))).length;
  const pct = total > 0 ? Math.round((found / total) * 100) : 0;
  if (d.flagProgress) d.flagProgress.style.width = `${pct}%`;
  if (d.flagProgressText) d.flagProgressText.textContent = `${found} / ${total}`;

  // Show the real flag image directly — thanks to preloading it's likely in cache and
  // renders instantly with no emoji flash. The img tag handles loading natively.
  const iso = COUNTRY_ISO[flagCountry];
  if (d.flagDisplay) {
    if (iso) {
      d.flagDisplay.innerHTML = countryFlag(flagCountry);
    } else {
      // Fallback: no ISO code for this country
      d.flagDisplay.innerHTML = `<span class="flag-emoji-placeholder">${countryFlagEmoji(flagCountry)}</span>`;
    }
  }

  // Show options immediately
  const options = generateFlagOptions(flagCountry);
  flagAnswering = true;
  if (d.flagOptions) {
    d.flagOptions.innerHTML = options
      .map((name) => `<button class="flag-option" data-country="${escapeAttr(name)}">
          <span class="fo-name">${escapeAttr(name)}</span>
        </button>`)
      .join('');
  }

  // Aggressively warm browser cache for upcoming flags
  preloadNextFlags();
}


// ── Handle option click ──
function handleFlagClick(selectedName) {
  if (!flagAnswering || !flagCountry || flagStop) return;
  flagAnswering = false;

  const correctName = flagCountry;
  const d = dom();
  if (!d.flagOptions) return;
  const allBtns = d.flagOptions.querySelectorAll('.flag-option');
  allBtns.forEach((btn) => (btn.disabled = true));

  if (selectedName === correctName) {
    // ── CORRECT ──
    const btn = d.flagOptions.querySelector(`.flag-option[data-country="${correctName}"]`);
    if (btn) btn.classList.add('correct');
    showToast(`✓ ${countryFlagEmoji(correctName)} ${correctName}!`, 'success');

    currentStreak++;
    if (currentStreak > bestStreak) {
      bestStreak = currentStreak;
    }

    flagEasyCorrect++;

    if (!state.allFound.has(normalize(correctName))) {
      state.allFound.add(normalize(correctName));
      state.score++;
      state.totalFound++;
    }

    const saved = loadProgress();
    const g3Stats = saved?.stats?.game3 || { bestStreak: 0, totalFlags: 0, correctFlags: 0 };
    g3Stats.totalFlags++;
    g3Stats.correctFlags++;
    if (currentStreak > g3Stats.bestStreak) g3Stats.bestStreak = currentStreak;
    saveProgress({
      gameId: 'game3',
      score: state.score,
      totalFound: state.totalFound,
      allFound: state.allFound,
      completedLetters: g1.completedLetters,
      bestStreak,
      gameStats: { game3: g3Stats },
    });

    updateHeader();

    // Update streak display immediately
    if (d.flagStreak) {
      d.flagStreak.innerHTML = `<i class="ph-bold ph-fire"></i> ${currentStreak}`;
      d.flagStreak.className = currentStreak >= 5 ? 'flag-streak hot' : 'flag-streak';
    }
    if (d.flagBest) d.flagBest.textContent = `Best: ${bestStreak}`;

    // Animate the flag on correct
    if (d.flagDisplay) {
      d.flagDisplay.classList.remove('flag-pop');
      void d.flagDisplay.offsetWidth;
      d.flagDisplay.classList.add('flag-pop');
    }

    setTimeout(() => {
      if (!flagStop) renderFlagRound();
    }, 700);
  } else {
    // ── WRONG ──
    allBtns.forEach((btn) => {
      if (btn.dataset.country === selectedName) btn.classList.add('wrong');
      if (btn.dataset.country === correctName) btn.classList.add('correct');
    });
    // Track wrong flag guess
    const saved = loadProgress();
    const g3Stats = saved?.stats?.game3 || { bestStreak: 0, totalFlags: 0, correctFlags: 0 };
    g3Stats.totalFlags++;
    saveProgress({
      gameId: 'game3',
      score: state.score,
      totalFound: state.totalFound,
      allFound: state.allFound,
      completedLetters: g1.completedLetters,
      bestStreak,
      gameStats: { game3: g3Stats },
    });

    showToast(`✗ It was ${countryFlagEmoji(correctName)} ${correctName}`, 'error');

    // Reset streak
    currentStreak = 0;
    flagEasyCorrect = Math.max(0, flagEasyCorrect - 1); // slow down easy phase

    if (d.flagStreak) {
      d.flagStreak.textContent = '—';
      d.flagStreak.className = 'flag-streak';
    }

    setTimeout(() => {
      if (!flagStop) renderFlagRound();
    }, 1500);
  }

  // Check if a continent was just completed
  if (correctName && !flagStop) {
    const continent = CONTINENTS[correctName];
    if (continent && isContinentComplete(continent)) {
      showToast(`🎉 ${continent} complete! All flags found!`, 'success');
      updateContinentMarkers();
    }
  }

  updateFlagProgress();
}

function updateFlagProgress() {
  const d = dom();
  const activePool = getActivePool();
  const total = activePool.length;
  const found = activePool.filter((c) => state.allFound.has(normalize(c))).length;
  const pct = total > 0 ? Math.round((found / total) * 100) : 0;
  if (d.flagProgress) d.flagProgress.style.width = `${pct}%`;
  if (d.flagProgressText) d.flagProgressText.textContent = `${found} / ${total}`;
  updateContinentMarkers();
}

// ── Start Game 3 ──
export function startFlagGame(bestStreakVal = 0) {
  state.currentGame = 'game3';
  flagStop = false;
  currentStreak = 0;
  flagRoundNum = 0;
  flagAnswering = false;
  flagCountry = null;
  flagEasyPhase = true;
  flagEasyCorrect = 0;
  bestStreak = bestStreakVal;
  selectedContinent = null;

  // Reset filter pills to 'All'
  document.querySelectorAll('.fc-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.continent === 'all');
  });

  showScreen('flaggame-screen');
  updateHeader();
  renderFlagRound();
}

// ── Public API ──
export function onFlagOptionClick(e) {
  const btn = e.target.closest('.flag-option');
  if (btn && !btn.disabled) handleFlagClick(btn.dataset.country);
}

export function stopFlagGame() {
  flagStop = true;
}
