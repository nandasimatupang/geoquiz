import { $, normalize, showToast, shuffle, escapeAttr } from './utils.js';
import { state, updateHeader, showScreen } from './state.js';
import { COUNTRIES_BY_LETTER, LETTERS } from './data/countries.js';
import { CONTINENTS, continentClass } from './data/continents.js';
import { countryFlagEmoji } from './data/flags.js';
import { saveProgress, loadProgress } from './persist.js';

// ── Game 1 State ──
export const g1 = {
  completedLetters: new Set(),
  currentLetter: null,
  // Countries already found for this letter (normalized names)
  revealedCountries: new Set(),
  // Order in which countries were found this letter (newest-first display)
  foundOrder: [],
  // One-at-a-time focus queue (only countries not yet found)
  queue: [],
  queueIndex: 0,
  // Per-country clue state
  currentClueLevel: 0,
  revealedPositions: new Set(),
  streak: 0,
  bestStreak: 0,
  _lastRenderedLetter: null,
  _advancing: false, // guards against double-submit during the success delay
  isRandomMode: false,
};

const MAX_CLUES = 3;

// ── DOM refs (resolved lazily) ──
function dom() {
  return {
    currentLetterEl: $('current-letter'),
    progressBar: $('progress-bar'),
    progressText: $('progress-text'),
    foundList: $('g1-found-list'),
    foundCount: $('found-count'),
    countryInput: $('country-input'),
    submitBtn: $('submit-btn'),
    inputFeedback: $('input-feedback'),
    foundBadge: $('found-badge'),
    clueBtn: $('clue-btn'),
    streakEl: $('g1-streak'),
    focusCard: document.querySelector('.g1-focus-card'),
    focusContinent: $('g1-focus-continent'),
    focusName: $('g1-focus-name'),
    inputWrap: $('country-input')?.closest('.g1-input-wrap'),
  };
}

// ── Helpers ──

/**
 * Indices of letters that are pre-revealed: the first letter of every word.
 * Spaces are skipped; only alphabetic chars count as "letter positions".
 */
function wordStartIndices(name) {
  const indices = new Set();
  let prevWasSpace = true;
  for (let i = 0; i < name.length; i++) {
    const ch = name[i];
    if (ch === ' ' || ch === '-' || ch === "'") {
      prevWasSpace = true;
      continue;
    }
    if (prevWasSpace) indices.add(i);
    prevWasSpace = false;
  }
  return indices;
}

/** Indexes of every alphabetic character in the name (eligible for clue reveals). */
function letterIndices(name) {
  const indices = [];
  for (let i = 0; i < name.length; i++) {
    const ch = name[i];
    if (ch !== ' ' && ch !== '-' && ch !== "'") indices.push(i);
  }
  return indices;
}

function isLetterChar(ch) {
  return ch !== ' ' && ch !== '-' && ch !== "'";
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
  g1.foundOrder = [];
  g1.queue = [];
  g1.queueIndex = 0;
  g1.currentClueLevel = 0;
  g1.revealedPositions = new Set();
  g1.streak = 0;
  g1.bestStreak = 0;
  g1._lastRenderedLetter = null;
  g1._advancing = false;
}

// ── Build the focus queue (shuffled, only not-yet-found countries) ──
function buildQueue(letter) {
  const all = COUNTRIES_BY_LETTER[letter] || [];
  const remaining = all.filter((c) => !g1.revealedCountries.has(normalize(c)));
  return shuffle(remaining);
}

function resetClueStateForCurrent() {
  const focused = currentFocused();
  g1.revealedPositions = focused ? wordStartIndices(focused) : new Set();
  g1.currentClueLevel = 0;
}

function currentFocused() {
  return g1.queue[g1.queueIndex] || null;
}

// ── Clue System (per country, up to MAX_CLUES reveals) ──
export function useClue() {
  const focused = currentFocused();
  if (!focused) return;

  if (g1.currentClueLevel >= MAX_CLUES) {
    // Reveal full name
    const allIndices = letterIndices(focused);
    allIndices.forEach((i) => g1.revealedPositions.add(i));
    renderFocusCard();
    return;
  }

  // Candidate positions: letters not already revealed.
  const candidates = letterIndices(focused).filter(
    (i) => !g1.revealedPositions.has(i)
  );
  if (candidates.length === 0) return;

  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  g1.revealedPositions.add(pick);
  g1.currentClueLevel++;

  const remaining = Math.max(0, MAX_CLUES - g1.currentClueLevel);
  renderFocusCard();
}

// ── Letter Picker ──
export function renderPicker() {
  const letterGrid = $('letter-grid');
  if (!letterGrid) return;
  letterGrid.innerHTML = LETTERS.map((l) => {
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
  // Restore already-found countries for this letter from the global pool.
  const foundForLetter = COUNTRIES_BY_LETTER[letter].filter((c) =>
    state.allFound.has(normalize(c))
  );
  g1.revealedCountries = new Set(foundForLetter.map((c) => normalize(c)));
  g1.foundOrder = [...foundForLetter]; // display order (will be shown newest-first)
  g1.streak = 0;
  g1._advancing = false;

  g1.queue = buildQueue(letter);
  g1.queueIndex = 0;
  resetClueStateForCurrent();

  showScreen('game-screen');
  updateProgress();
  renderFoundList();

  if (g1.queue.length === 0) {
    renderCompletion();
  } else {
    restoreFocusChrome();
    renderFocusCard();
  }

  const d = dom();
  if (d.countryInput) {
    d.countryInput.value = '';
    d.countryInput.focus();
  }
  updateG1SubmitBtn();
  updateClueButton();
  setG1Feedback('');
}

// ── Dynamically resize tile board if the word is very long ──
function updateFocusNameClass(focused) {
  const d = dom();
  if (!d.focusName || !focused) return;
  const words = focused.split(/[\s-']/);
  const maxWordLen = Math.max(...words.map(w => w.length));
  
  let classes = 'g1-focus-name';
  if (maxWordLen >= 12) classes += ' word-xs';
  else if (maxWordLen >= 9) classes += ' word-sm';
  d.focusName.className = classes;
}

// ── Render the focus card (one country) ──
export function renderFocusCard() {
  const d = dom();
  if (!d.focusName) return;
  const focused = currentFocused();
  if (!focused) {
    renderCompletion();
    return;
  }

  // Continent badge
  const continent = CONTINENTS[focused] || 'Unknown';
  if (d.focusContinent) {
    d.focusContinent.className = `continent-badge ${continentClass(continent)}`;
    d.focusContinent.textContent = continent;
  }

  // Build tiles + spaces
  updateFocusNameClass(focused);
  let html = '<span class="g1-word">';
  for (let i = 0; i < focused.length; i++) {
    const ch = focused[i];
    if (ch === ' ' || ch === '-' || ch === "'") {
      html += `</span><span class="g1-space"></span><span class="g1-word">`;
      continue;
    }
    if (g1.revealedPositions.has(i)) {
      html += `<span class="g1-tile revealed">${escapeAttr(ch)}</span>`;
    } else {
      html += `<span class="g1-tile blank"></span>`;
    }
  }
  html += '</span>';
  html = html.replace(/<span class="g1-word"><\/span>/g, '');
  d.focusName.innerHTML = html;
  updateClueButton();
}

// ── Update the clue button state ──
function updateClueButton() {
  const d = dom();
  if (!d.clueBtn) return;
  const focused = currentFocused();
  if (!focused) {
    d.clueBtn.disabled = true;
    return;
  }
  
  const remaining = Math.max(0, MAX_CLUES - g1.currentClueLevel);
  if (g1.currentClueLevel >= MAX_CLUES) {
    // Check if fully revealed
    const allIndices = letterIndices(focused);
    const allRevealed = allIndices.every((i) => g1.revealedPositions.has(i));
    
    d.clueBtn.innerHTML = `<i class="ph-bold ph-eye"></i> Reveal`;
    d.clueBtn.dataset.clues = '0';
    d.clueBtn.title = 'Reveal full answer';
    d.clueBtn.disabled = allRevealed;
  } else {
    d.clueBtn.innerHTML = `<i class="ph-bold ph-lightbulb"></i> Clue`;
    d.clueBtn.dataset.clues = String(remaining);
    d.clueBtn.title = `${remaining} clue${remaining === 1 ? '' : 's'} left`;
    d.clueBtn.disabled = false;
  }
}

// ── Render the found-countries list (newest first) ──
export function renderFoundList() {
  const d = dom();
  if (!d.foundList) return;
  const total = (COUNTRIES_BY_LETTER[g1.currentLetter] || []).length;
  const found = g1.foundOrder.length;

  if (d.foundCount) d.foundCount.textContent = String(found);
  if (d.foundBadge) d.foundBadge.textContent = `${found} / ${total}`;

  if (found === 0) {
    d.foundList.innerHTML = `<div class="g1-found-empty">Found countries will appear here</div>`;
    return;
  }

  // Newest first
  const ordered = [...g1.foundOrder].reverse();
  d.foundList.innerHTML = ordered
    .map((c) => {
      const continent = CONTINENTS[c] || 'Unknown';
      const cl = continentClass(continent);
      const flag = countryFlagEmoji(c);
      return `<div class="g1-found-item">
        <span class="g1-found-name"><span class="country-flag">${flag}</span> ${escapeAttr(c)}</span>
        <span class="continent-badge ${cl}">${continent}</span>
      </div>`;
    })
    .join('');
}

// ── Update progress bar / text / streak ──
function updateProgress() {
  const d = dom();
  if (!d.currentLetterEl) return;
  const countries = COUNTRIES_BY_LETTER[g1.currentLetter] || [];
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

  if (d.progressBar) d.progressBar.style.width = `${total > 0 ? (revealed / total) * 100 : 0}%`;
  if (d.progressText) d.progressText.textContent = `${revealed} / ${total}`;

  if (d.streakEl) {
    if (g1.streak > 0) {
      d.streakEl.innerHTML = `<i class="ph-bold ph-fire"></i> ${g1.streak}`;
      d.streakEl.className = g1.streak >= 5 ? 'g1-streak hot' : 'g1-streak active';
    } else {
      d.streakEl.textContent = '—';
      d.streakEl.className = 'g1-streak';
    }
  }
  updateHeader();
}

// ── Persist a snapshot of game1 state + stats ──
function persist(gameStatsMutator) {
  const saved = loadProgress();
  const g1Stats = saved?.stats?.game1 || { bestStreak: 0, totalGuesses: 0, correctGuesses: 0 };
  if (gameStatsMutator) gameStatsMutator(g1Stats);
  if (g1.streak > g1Stats.bestStreak) g1Stats.bestStreak = g1.streak;
  saveProgress({
    gameId: 'game1',
    score: state.score,
    totalFound: state.totalFound,
    allFound: state.allFound,
    completedLetters: g1.completedLetters,
    gameStats: { game1: g1Stats },
  });
}

// ── Render completion / end-of-round state in the focus card ──
function renderFocusMessage(title, desc, showTryAgain, showNextBtn = false) {
  const d = dom();
  if (!d.focusName) return;
  // Hide chrome for the message state
  const header = document.querySelector('.g1-focus-header');
  if (header) header.style.display = 'none';
  const inputRow = document.querySelector('.g1-input-row');
  if (inputRow) inputRow.style.display = 'none';

  d.focusName.innerHTML = `
    <div class="g1-focus-message">
      <div class="g1-focus-message-title">${title}</div>
      <div class="g1-focus-message-desc">${desc}</div>
      <div class="g1-focus-message-actions">
        ${showTryAgain ? `<button id="g1-tryagain-btn" class="btn btn-secondary g1-tryagain-btn"><i class="ph-bold ph-arrows-clockwise"></i> Try Remaining</button>` : ''}
        ${showNextBtn ? `<button id="g1-next-btn" class="btn btn-primary"><i class="ph-bold ph-arrow-right"></i> Next Letter</button>` : ''}
      </div>
    </div>`;
}

function restoreFocusChrome() {
  const header = document.querySelector('.g1-focus-header');
  if (header) header.style.display = '';
  const inputRow = document.querySelector('.g1-input-row');
  if (inputRow) inputRow.style.display = '';
}

// ── Completion: every country for this letter found ──
function renderCompletion() {
  const countries = COUNTRIES_BY_LETTER[g1.currentLetter] || [];
  g1.completedLetters.add(g1.currentLetter);
  persist();
  renderFocusMessage(
    '🎉 All found!',
    `You named all ${countries.length} countries for ${g1.currentLetter}.`,
    false,
    true
  );
}

// ── End of round: queue exhausted but some remain unfound (skipped) ──
function renderEndOfRound() {
  const countries = COUNTRIES_BY_LETTER[g1.currentLetter] || [];
  const found = g1.revealedCountries.size;
  const remaining = countries.length - found;
  renderFocusMessage(
    'Round done!',
    `Found ${found} of ${countries.length}. ${remaining} still to find.`,
    remaining > 0,
    true
  );
}

// ── Advance to the next country in the queue ──
function advanceQueue(afterCorrect) {
  g1.queueIndex++;
  if (g1.queueIndex < g1.queue.length) {
    resetClueStateForCurrent();
    restoreFocusChrome();
    renderFocusCard();
    return;
  }
  // Queue exhausted
  const countries = COUNTRIES_BY_LETTER[g1.currentLetter] || [];
  if (g1.revealedCountries.size >= countries.length) {
    renderCompletion();
    setTimeout(() => {
      renderPicker();
    }, 400);
  } else {
    renderEndOfRound();
  }
}

// ── Try Again: rebuild the queue from remaining unfound countries ──
export function tryAgain() {
  const countries = COUNTRIES_BY_LETTER[g1.currentLetter] || [];
  if (g1.revealedCountries.size >= countries.length) {
    renderCompletion();
    return;
  }
  g1.queue = buildQueue(g1.currentLetter);
  g1.queueIndex = 0;
  g1._advancing = false;
  resetClueStateForCurrent();
  restoreFocusChrome();
  renderFocusCard();
  updateClueButton();
  const d = dom();
  if (d.countryInput) d.countryInput.focus();
}

// ── Skip the current country ──
export function skipCurrent() {
  if (g1._advancing) return;
  const focused = currentFocused();
  if (!focused) return;
  g1._advancing = true;
  advanceQueue(false);
  g1._advancing = false;
  const d = dom();
  if (d.countryInput) d.countryInput.focus();
}

// ── Submit Guess (focus / strict) ──
export function submitG1Guess() {
  if (g1._advancing) return;
  const d = dom();
  if (!d.countryInput) return;
  const raw = d.countryInput.value.trim();
  if (!raw) return;

  const focused = currentFocused();
  if (!focused) return; // round done / completed

  const countries = COUNTRIES_BY_LETTER[g1.currentLetter];
  if (!countries) return;

  const norm = normalize(raw);
  const focusedNorm = normalize(focused);

  // Invalid input
  if (!norm) {
    flashError(d, `"${raw}" is not a valid country name`);
    return;
  }

  // ── Exact match with the focused country ──
  if (norm === focusedNorm) {
    g1._advancing = true;
    g1.revealedCountries.add(focusedNorm);
    g1.foundOrder.push(focused);
    g1.streak++;
    if (g1.streak > g1.bestStreak) g1.bestStreak = g1.streak;

    if (!state.allFound.has(focusedNorm)) {
      state.allFound.add(focusedNorm);
      state.score++;
      state.totalFound++;
    }
    persist((s) => { s.totalGuesses++; s.correctGuesses++; });

    // Reveal the full name on the card, then prepend to the found list.
    revealFull(focused);
    if (d.inputWrap) d.inputWrap.classList.add('success');
    setG1Feedback(`✓ ${countryFlagEmoji(focused)} ${focused}`, 'success');
    d.countryInput.value = '';
    updateG1SubmitBtn();

    renderFoundList();
    updateProgress();

    setTimeout(() => {
      if (d.inputWrap) d.inputWrap.classList.remove('success');
      advanceQueue(true);
      g1._advancing = false;
      const d2 = dom();
      if (d2.countryInput) d2.countryInput.focus();
    }, 900);
    return;
  }

  // ── Valid country for this letter, but not the focused one ──
  const matchesOther = countries.some((c) => normalize(c) === norm);
  if (matchesOther) {
    g1.streak = 0;
    persist((s) => { s.totalGuesses++; });
    flashWarn(d, `That's a country for ${g1.currentLetter}, but not this one!`);
    updateProgress();
    return;
  }

  // ── Not a country at all ──
  g1.streak = 0;
  persist((s) => { s.totalGuesses++; });
  flashError(d, `"${raw}" is not a country starting with "${g1.currentLetter}"`);
  updateProgress();
}

// Reveal every letter tile of the focused country (used on correct guess)
function revealFull(focused) {
  const d = dom();
  if (!d.focusName) return;
  updateFocusNameClass(focused);
  let html = '<span class="g1-word">';
  for (let i = 0; i < focused.length; i++) {
    const ch = focused[i];
    if (!isLetterChar(ch)) {
      html += `</span><span class="g1-space"></span><span class="g1-word">`;
      continue;
    }
    html += `<span class="g1-tile revealed">${escapeAttr(ch)}</span>`;
  }
  html += '</span>';
  html = html.replace(/<span class="g1-word"><\/span>/g, '');
  d.focusName.innerHTML = html;
}

function flashError(d, msg) {
  if (d.inputWrap) d.inputWrap.classList.add('error');
  setG1Feedback(msg, 'error');
  d.countryInput.value = '';
  updateG1SubmitBtn();
  setTimeout(() => { if (d.inputWrap) d.inputWrap.classList.remove('error'); }, 400);
}

function flashWarn(d, msg) {
  if (d.inputWrap) d.inputWrap.classList.add('error');
  setG1Feedback(msg, 'info');
  d.countryInput.value = '';
  updateG1SubmitBtn();
  setTimeout(() => { if (d.inputWrap) d.inputWrap.classList.remove('error'); }, 400);
}
