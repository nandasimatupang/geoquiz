import { $, normalize, showToast, shuffle, escapeAttr } from './utils.js';
import { state, updateHeader, showScreen } from './state.js';
import { ALL_COUNTRIES } from './data/countries.js';
import { CONTINENTS } from './data/continents.js';
import { countryFlag, countryFlagEmoji, COUNTRY_ISO } from './data/flags.js';
import { CAPITALS } from './data/capitals.js';
import { saveProgress, loadProgress } from './persist.js';
import { g1 } from './game1.js';

const CONTINENT_NAMES = ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'];

function dom() {
  return {
    capitalRound: $('capital-round'),
    capitalStreak: $('capital-streak'),
    capitalBest: $('capital-best'),
    capitalDisplay: $('capital-country-display'),
    capitalOptions: $('capital-options'),
    capitalProgress: $('capital-progress'),
    capitalProgressText: $('capital-progress-text'),
  };
}

let currentStreak = 0;
let bestStreak = 0;
let currentCountry = null;
let roundNum = 0;
let answering = false;
let gameStop = false;
let selectedContinent = null;

export function resetGame4State() {
  currentStreak = 0;
  bestStreak = 0;
  currentCountry = null;
  roundNum = 0;
  answering = false;
  gameStop = false;
  selectedContinent = null;
}

function isContinentComplete(continent) {
  const countries = ALL_COUNTRIES.filter((c) => CONTINENTS[c] === continent);
  return countries.every((c) => state.allFound.has(normalize(c)));
}

function getActivePool() {
  if (selectedContinent) {
    return ALL_COUNTRIES.filter((c) => CONTINENTS[c] === selectedContinent);
  }
  return ALL_COUNTRIES;
}

function generateOptions(correctName) {
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
  if (distractors.length < 3) {
    const fallback = ALL_COUNTRIES.filter((c) => c !== correctName);
    shuffle(fallback);
    distractors.push(...fallback.slice(0, 3 - distractors.length));
  }
  return shuffle([correctName, ...distractors.slice(0, 3)]);
}

function pickCountry() {
  const activePool = getActivePool();
  const allUnfound = activePool.filter((c) => !state.allFound.has(normalize(c)));
  const pool = allUnfound.length > 0 ? allUnfound : activePool;
  return pool[Math.floor(Math.random() * pool.length)];
}

function preloadNextFlags(count = 8) {
  const seen = new Set();
  let attempts = 0;
  while (seen.size < count && attempts < count * 4) {
    attempts++;
    const name = pickCountry();
    const iso = COUNTRY_ISO[name];
    if (iso && !seen.has(name)) {
      seen.add(name);
      const img = new Image();
      img.src = `https://flagcdn.com/${iso}.svg`;
    }
  }
}

function updateContinentMarkers() {
  document.querySelectorAll('#capital-continent-filter .fc-btn').forEach((btn) => {
    const continent = btn.dataset.continent;
    if (continent && continent !== 'all' && isContinentComplete(continent)) {
      btn.classList.add('completed');
    } else {
      btn.classList.remove('completed');
    }
  });
}

function showCompletion() {
  const d = dom();
  answering = false;
  if (d.capitalOptions) d.capitalOptions.innerHTML = '';

  let icon, title, desc;
  if (selectedContinent) {
    icon = '<i class="ph-duotone ph-confetti"></i>';
    title = 'Continent Complete!';
    desc = `You found every capital in ${selectedContinent}!`;
  } else if (CONTINENT_NAMES.every((c) => isContinentComplete(c))) {
    icon = '<i class="ph-duotone ph-globe"></i>';
    title = 'World Complete!';
    desc = 'You found every capital in the world! Amazing!';
  } else {
    const next = CONTINENT_NAMES.find((c) => !isContinentComplete(c));
    icon = '<i class="ph-duotone ph-star"></i>';
    title = 'Keep Going!';
    const done = CONTINENT_NAMES.filter((c) => isContinentComplete(c)).length;
    desc = `${done} / 6 continents complete. Ready for ${next}?`;
  }

  if (d.capitalDisplay) {
    d.capitalDisplay.innerHTML = `
      <div class="flag-completion">
        <span class="flag-completion-icon">${icon}</span>
        <h3 class="flag-completion-title">${title}</h3>
        <p class="flag-completion-desc">${desc}</p>
      </div>`;
  }
  updateContinentMarkers();
}

function renderRound() {
  if (gameStop) return;
  const d = dom();
  if (!d.capitalDisplay) return;

  const activePool = getActivePool();
  const remaining = activePool.filter((c) => !state.allFound.has(normalize(c)));
  if (remaining.length === 0) {
    showCompletion();
    return;
  }

  currentCountry = pickCountry();
  roundNum++;
  if (d.capitalRound) d.capitalRound.textContent = `Round ${roundNum}`;
  if (d.capitalStreak) {
    d.capitalStreak.innerHTML = currentStreak > 0 ? `<i class="ph-bold ph-fire"></i> ${currentStreak}` : '—';
    d.capitalStreak.className = currentStreak >= 5 ? 'g3-streak hot' : (currentStreak > 0 ? 'g3-streak active' : 'g3-streak');
  }
  if (d.capitalBest) d.capitalBest.textContent = `Best: ${bestStreak}`;

  const total = activePool.length;
  const found = activePool.filter((c) => state.allFound.has(normalize(c))).length;
  const pct = total > 0 ? Math.round((found / total) * 100) : 0;
  if (d.capitalProgress) d.capitalProgress.style.width = `${pct}%`;
  if (d.capitalProgressText) d.capitalProgressText.textContent = `${found} / ${total}`;

  const iso = COUNTRY_ISO[currentCountry];
  let flagHTML = '';
  if (iso) {
    flagHTML = countryFlag(currentCountry);
  } else {
    flagHTML = `<span class="flag-emoji-placeholder">${countryFlagEmoji(currentCountry)}</span>`;
  }

  if (d.capitalDisplay) {
    d.capitalDisplay.innerHTML = `
      <div class="capital-flag">${flagHTML}</div>
      <span class="capital-name">${currentCountry}</span>
    `;
  }

  const options = generateOptions(currentCountry);
  answering = true;
  if (d.capitalOptions) {
    d.capitalOptions.innerHTML = options
      .map((name) => `<button class="flag-option" data-country="${escapeAttr(name)}">
          <span class="fo-name">${escapeAttr(CAPITALS[name] || 'Unknown')}</span>
        </button>`)
      .join('');
  }

  preloadNextFlags();
}

export function setCapitalContinentFilter(continent) {
  selectedContinent = continent === 'all' ? null : continent;
  document.querySelectorAll('#capital-continent-filter .fc-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.continent === continent);
  });
  if (!gameStop) {
    updateContinentMarkers();
    renderRound();
  }
}

function updateCapitalProgress() {
  const d = dom();
  const activePool = getActivePool();
  const total = activePool.length;
  const found = activePool.filter((c) => state.allFound.has(normalize(c))).length;
  const pct = total > 0 ? Math.round((found / total) * 100) : 0;
  if (d.capitalProgress) d.capitalProgress.style.width = `${pct}%`;
  if (d.capitalProgressText) d.capitalProgressText.textContent = `${found} / ${total}`;
  updateContinentMarkers();
}

function handleOptionClick(selectedName) {
  if (!answering || !currentCountry || gameStop) return;
  answering = false;

  const correctName = currentCountry;
  const d = dom();
  if (!d.capitalOptions) return;
  const allBtns = d.capitalOptions.querySelectorAll('.flag-option');
  allBtns.forEach((btn) => (btn.disabled = true));

  if (selectedName === correctName) {
    const btn = d.capitalOptions.querySelector(`.flag-option[data-country="${correctName}"]`);
    if (btn) btn.classList.add('correct');
    showToast(`✓ Correct!`, 'success');

    currentStreak++;
    if (currentStreak > bestStreak) {
      bestStreak = currentStreak;
    }

    if (!state.allFound.has(normalize(correctName))) {
      state.allFound.add(normalize(correctName));
      state.score++;
      state.totalFound++;
    }

    const saved = loadProgress();
    const g4Stats = saved?.stats?.game4 || { bestScore: 0, totalSprints: 0, sprintScores: [], totalFoundInSprints: 0 };
    if (currentStreak > g4Stats.bestScore) g4Stats.bestScore = currentStreak;
    saveProgress({
      gameId: 'game4',
      score: state.score,
      totalFound: state.totalFound,
      allFound: state.allFound,
      completedLetters: g1.completedLetters,
      bestStreak: bestStreak,
      gameStats: { game4: g4Stats },
    });
    
    updateHeader();

    if (d.capitalStreak) {
      d.capitalStreak.innerHTML = `<i class="ph-bold ph-fire"></i> ${currentStreak}`;
      d.capitalStreak.className = currentStreak >= 5 ? 'g3-streak hot pop' : (currentStreak > 0 ? 'g3-streak active pop' : 'g3-streak pop');
      setTimeout(() => {
        if (d.capitalStreak) d.capitalStreak.classList.remove('pop');
      }, 400);
    }
    if (d.capitalBest) d.capitalBest.textContent = `Best: ${bestStreak}`;

    if (d.capitalDisplay) {
      d.capitalDisplay.classList.remove('flag-pop');
      void d.capitalDisplay.offsetWidth;
      d.capitalDisplay.classList.add('flag-pop');
    }

    setTimeout(() => {
      if (!gameStop) renderRound();
    }, 700);
  } else {
    allBtns.forEach((btn) => {
      if (btn.dataset.country === selectedName) btn.classList.add('wrong');
      if (btn.dataset.country === correctName) btn.classList.add('correct');
    });

    const saved = loadProgress();
    const g4Stats = saved?.stats?.game4 || { bestScore: 0, totalSprints: 0, sprintScores: [], totalFoundInSprints: 0 };
    saveProgress({
      gameId: 'game4',
      score: state.score,
      totalFound: state.totalFound,
      allFound: state.allFound,
      completedLetters: g1.completedLetters,
      bestStreak: bestStreak,
      gameStats: { game4: g4Stats },
    });

    showToast(`✗ The capital is ${CAPITALS[correctName]}`, 'error');

    currentStreak = 0;

    if (d.capitalStreak) {
      d.capitalStreak.textContent = '—';
      d.capitalStreak.className = 'g3-streak';
    }

    setTimeout(() => {
      if (!gameStop) renderRound();
    }, 1500);
  }
  
  if (correctName && !gameStop) {
    const continent = CONTINENTS[correctName];
    if (continent && isContinentComplete(continent)) {
      showToast(`🎉 ${continent} capitals complete!`, 'success');
      updateContinentMarkers();
    }
  }

  updateCapitalProgress();
}

export function startCapitalGame(bestVal = 0) {
  state.currentGame = 'game4';
  gameStop = false;
  currentStreak = 0;
  roundNum = 0;
  answering = false;
  currentCountry = null;
  bestStreak = bestVal;
  selectedContinent = null;

  document.querySelectorAll('#capital-continent-filter .fc-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.continent === 'all');
  });

  showScreen('capitals-screen');
  updateHeader();
  renderRound();
}

export function onCapitalOptionClick(e) {
  const btn = e.target.closest('.flag-option');
  if (btn && !btn.disabled) handleOptionClick(btn.dataset.country);
}

export function stopCapitalGame() {
  gameStop = true;
}
