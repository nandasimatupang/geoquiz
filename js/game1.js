import { $, normalize, showToast, escapeAttr } from './utils.js';
import { state, updateHeader, showScreen } from './state.js';
import { COUNTRIES_BY_LETTER, LETTERS } from './data/countries.js';
import { CONTINENTS, continentClass } from './data/continents.js';
import { countryFlagEmoji } from './data/flags.js';
import { saveProgress, loadProgress } from './persist.js';

// ── Game 1 State ──
export const g1 = {
  completedLetters: new Set(),
  currentLetter: null,
  revealedCountries: new Set(),
  clueLevel: 0,
  secondClueLetters: new Map(),
  streak: 0,
  bestStreak: 0,
  _lastRenderedLetter: null,
};

// ── DOM refs (resolved lazily) ──
function dom() {
  return {
    letterGrid: $('letter-grid'),
    currentLetterEl: $('current-letter'),
    progressBar: $('progress-bar'),
    progressText: $('progress-text'),
    g1CountryList: $('country-list'),
    countryInput: $('country-input'),
    submitBtn: $('submit-btn'),
    inputFeedback: $('input-feedback'),
    foundBadge: $('found-badge'),
    listLetterLabel: $('list-letter-label'),
    clueBtn: $('clue-btn'),
    streakEl: $('g1-streak'),
  };
}

// ── Helpers ──
function buildFirstName(name) {
  return name.split('').map((ch, i) => (i === 0 ? ch : '_')).join(' ');
}

function buildPartialName(name, idx) {
  return name.split('').map((ch, i) => {
    if (i === 0) return ch;
    if (i === idx) return ch.toLowerCase();
    return '_';
  }).join(' ');
}

function setG1Feedback(text, type = '') {
  const d = dom();
  if (!d.inputFeedback) return;
  d.inputFeedback.textContent = text;
  d.inputFeedback.className = `input-feedback ${type}`;
}

function updateG1SubmitBtn() {
  const d = dom();
  if (!d.submitBtn || !d.countryInput) return;
  d.submitBtn.disabled = d.countryInput.value.trim().length === 0;
}

// ── Reset State ──
export function resetGame1State() {
  g1.completedLetters = new Set();
  g1.currentLetter = null;
  g1.revealedCountries = new Set();
  g1.clueLevel = 0;
  g1.secondClueLetters = new Map();
  g1.streak = 0;
  g1.bestStreak = 0;
  g1._lastRenderedLetter = null;
}

// ── Clue System ──
export function useClue() {
  if (g1.clueLevel >= 2) return;
  g1.clueLevel++;
  if (g1.clueLevel === 1) {
    showToast('💡 First letter revealed for all countries!', 'info');
  } else {
    const countries = COUNTRIES_BY_LETTER[g1.currentLetter];
    if (countries) {
      countries.forEach((c) => {
        if (!g1.revealedCountries.has(normalize(c)) && c.length > 1) {
          g1.secondClueLetters.set(normalize(c), 1 + Math.floor(Math.random() * (c.length - 1)));
        }
      });
    }
    showToast('💡 Extra random letter revealed for each country!', 'info');
  }
  renderG1();
}

// ── Letter Picker ──
export function renderPicker() {
  const d = dom();
  if (!d.letterGrid) return;
  d.letterGrid.innerHTML = LETTERS.map((l) => {
    const done = g1.completedLetters.has(l);
    const countries = COUNTRIES_BY_LETTER[l];
    const total = countries.length;
    const found = countries.filter((c) => state.allFound.has(normalize(c))).length;
    const pct = total > 0 ? Math.round((found / total) * 100) : 0;
    return `<button class="letter-btn${done ? ' completed' : ''}" data-letter="${l}" title="${found}/${total}">
      <span class="letter-btn-text">${l}</span>
      <span class="letter-progress">
        <span class="letter-progress-bar" style="width:${pct}%"></span>
      </span>
    </button>`;
  }).join('');
}

// ── Start a Letter ──
export function startLetter(letter) {
  if (!COUNTRIES_BY_LETTER[letter]) return;
  g1.currentLetter = letter;
  // Restore any previously found countries for this letter from the global pool
  g1.revealedCountries = new Set(
    COUNTRIES_BY_LETTER[letter]
      .filter((c) => state.allFound.has(normalize(c)))
      .map((c) => normalize(c))
  );
  g1.clueLevel = 0;
  g1.secondClueLetters = new Map();
  g1.streak = 0;
  showScreen('game-screen');
  renderG1();
  const d = dom();
  if (d.countryInput) {
    d.countryInput.value = '';
    d.countryInput.focus();
  }
  updateG1SubmitBtn();
  setG1Feedback('');
}

// ── Render Game Screen ──
export function renderG1() {
  const d = dom();
  if (!d.currentLetterEl) return;
  const countries = COUNTRIES_BY_LETTER[g1.currentLetter];
  const total = countries.length;
  const revealed = g1.revealedCountries.size;

  d.currentLetterEl.textContent = g1.currentLetter;
  // Only trigger pop-in animation when the letter actually changes
  if (g1._lastRenderedLetter !== g1.currentLetter) {
    d.currentLetterEl.classList.remove('pop-in');
    void d.currentLetterEl.offsetWidth;
    d.currentLetterEl.classList.add('pop-in');
    g1._lastRenderedLetter = g1.currentLetter;
  }

  if (d.listLetterLabel) d.listLetterLabel.textContent = g1.currentLetter;
  if (d.progressBar) d.progressBar.style.width = `${total > 0 ? (revealed / total) * 100 : 0}%`;
  if (d.progressText) d.progressText.textContent = `${revealed} / ${total} countries found`;
  if (d.foundBadge) d.foundBadge.textContent = `${revealed} / ${total}`;

  if (d.g1CountryList) {
    d.g1CountryList.innerHTML = countries
      .map((c) => {
        const continent = CONTINENTS[c] || 'Unknown';
        const cl = continentClass(continent);
        const isRev = g1.revealedCountries.has(normalize(c));
        const flag = isRev ? countryFlagEmoji(c) : '';
        let nameContent, nameClass;
        if (isRev) {
          nameContent = `${flag} ${c}`;
          nameClass = 'revealed';
        } else if (g1.clueLevel >= 2 && g1.secondClueLetters.has(normalize(c))) {
          nameContent = buildPartialName(c, g1.secondClueLetters.get(normalize(c)));
          nameClass = 'hidden partial';
        } else if (g1.clueLevel >= 1) {
          nameContent = buildFirstName(c);
          nameClass = 'hidden partial';
        } else {
          nameContent = '???';
          nameClass = 'hidden';
        }
        return `<div class="country-row${isRev ? ' revealed' : ''}">
          <span class="continent-badge ${cl}">${continent}</span>
          <span class="country-name ${nameClass}">${nameContent}</span>
        </div>`;
      })
      .join('');
    d.g1CountryList.scrollTop = 0;
  }

  if (d.clueBtn) {
    d.clueBtn.textContent = `💡 Clue (${g1.clueLevel}/2)`;
    d.clueBtn.disabled = g1.clueLevel >= 2;
  }

  // Update streak display
  if (d.streakEl) {
    if (g1.streak > 0) {
      d.streakEl.textContent = `🔥 ${g1.streak}`;
      d.streakEl.className = g1.streak >= 5 ? 'g1-streak hot' : 'g1-streak';
    } else {
      d.streakEl.textContent = '—';
      d.streakEl.className = 'g1-streak';
    }
  }

  updateHeader();
}

// ── Submit Guess ──
export function submitG1Guess() {
  const d = dom();
  if (!d.countryInput) return;
  const raw = d.countryInput.value.trim();
  if (!raw) return;
  const countries = COUNTRIES_BY_LETTER[g1.currentLetter];
  if (!countries) return;
  const norm = normalize(raw);
  if (!norm) {
    d.countryInput.classList.add('error');
    setG1Feedback('Please type a valid country name', 'error');
    showToast('Not a match!', 'error');
    d.countryInput.value = '';
    updateG1SubmitBtn();
    setTimeout(() => d.countryInput.classList.remove('error'), 400);
    return;
  }
  const matched = countries.find((c) => normalize(c) === norm);
  if (!matched) {
    // Wrong guess — record in stats, reset streak
    const saved = loadProgress();
    const g1Stats = saved?.stats?.game1 || { bestStreak: 0, totalGuesses: 0, correctGuesses: 0 };
    g1Stats.totalGuesses++;
    saveProgress({
      score: state.score,
      totalFound: state.totalFound,
      allFound: state.allFound,
      completedLetters: g1.completedLetters,
      gameStats: { game1: g1Stats },
    });
    g1.streak = 0;
    d.countryInput.classList.add('error');
    setG1Feedback(`"${raw}" is not a country starting with "${g1.currentLetter}"`, 'error');
    showToast('Not a match!', 'error');
    d.countryInput.value = '';
    updateG1SubmitBtn();
    renderG1();
    setTimeout(() => d.countryInput.classList.remove('error'), 400);
    return;
  }
  if (g1.revealedCountries.has(norm)) {
    d.countryInput.classList.add('error');
    setG1Feedback(`"${matched}" already found!`, 'error');
    showToast('Already found!', 'error');
    d.countryInput.value = '';
    updateG1SubmitBtn();
    setTimeout(() => d.countryInput.classList.remove('error'), 400);
    return;
  }
  g1.revealedCountries.add(norm);

  // Update streak
  g1.streak++;
  if (g1.streak > g1.bestStreak) g1.bestStreak = g1.streak;

  if (!state.allFound.has(norm)) {
    state.allFound.add(norm);
    state.score++;
    state.totalFound++;
    const saved = loadProgress();
    const g1Stats = saved?.stats?.game1 || { bestStreak: 0, totalGuesses: 0, correctGuesses: 0 };
    g1Stats.totalGuesses++;
    g1Stats.correctGuesses++;
    if (g1.streak > g1Stats.bestStreak) g1Stats.bestStreak = g1.streak;
    saveProgress({
      score: state.score,
      totalFound: state.totalFound,
      allFound: state.allFound,
      completedLetters: g1.completedLetters,
      gameStats: { game1: g1Stats },
    });
  }
  d.countryInput.classList.add('success');
  setG1Feedback(`✓ ${matched}`, 'success');
  showToast(`✓ ${matched}`, 'success');
  d.countryInput.value = '';
  updateG1SubmitBtn();
  renderG1();
  setTimeout(() => d.countryInput.classList.remove('success'), 400);

  if (g1.revealedCountries.size === countries.length) {
    g1.completedLetters.add(g1.currentLetter);
    const saved = loadProgress();
    const g1Stats = saved?.stats?.game1 || { bestStreak: 0, totalGuesses: 0, correctGuesses: 0 };
    if (g1.streak > g1Stats.bestStreak) g1Stats.bestStreak = g1.streak;
    saveProgress({
      score: state.score,
      totalFound: state.totalFound,
      allFound: state.allFound,
      completedLetters: g1.completedLetters,
      gameStats: { game1: g1Stats },
    });
    setTimeout(() => {
      renderPicker();
      showToast(`🌟 All ${countries.length} countries found for ${g1.currentLetter}!`, 'info');
    }, 600);
  }
}
