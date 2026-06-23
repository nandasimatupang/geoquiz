/**
 * Screen ID → URL hash mapping for routing.
 * Uses history.pushState to avoid triggering hashchange events.
 */
const HASH_MAP = {
  'home-screen': 'home',
  'picker-screen': 'picker',
  'game-screen': 'game1',
  'mapgame-screen': 'mapgame',
  'flaggame-screen': 'flags',
  'sprint-screen': 'sprint',
  'stats-screen': 'stats',
};

// Reverse: hash → screen ID
const SCREEN_FROM_HASH = Object.fromEntries(
  Object.entries(HASH_MAP).map(([id, hash]) => [hash, id])
);

import { $ } from './utils.js';

export const state = {
  score: 0,
  totalFound: 0,
  allFound: new Set(),
  currentGame: null, // 'game1' or 'game2'
  bestStreak: 0,
};

export function resetBestStreak() {
  state.bestStreak = 0;
}

export function updateHeader() {
  // Header no longer shows global score/found — kept as no-op for compat
}

/**
 * Show a screen by its DOM id and update the URL hash via pushState.
 * pushState does NOT fire hashchange, so no circular loops.
 */
export function showScreen(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  const el = $(id);
  if (el) el.classList.add('active');

  const hash = HASH_MAP[id];
  if (hash) {
    history.pushState(null, '', '#' + hash);
  }
}

/**
 * Called on hashchange (user back/forward) or initial load.
 * Navigates to the screen matching the current hash.
 */
export function handleRoute() {
  const hash = window.location.hash.replace('#', '') || 'home';
  const screenId = SCREEN_FROM_HASH[hash];

  if (!screenId) {
    history.replaceState(null, '', '#home');
    return;
  }

  const el = $(screenId);
  if (!el) return;

  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  el.classList.add('active');

  // Game-specific screens can't restore full state from URL alone.
  // Silently redirect to picker without pushing an extra history entry.
  if (screenId === 'game-screen') {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    const picker = $('picker-screen');
    if (picker) picker.classList.add('active');
    history.replaceState(null, '', '#picker');
    state.currentGame = 'game1';
    return;
  }
  if (screenId === 'mapgame-screen') {
    state.currentGame = null;
    return;
  }
  if (screenId === 'picker-screen') {
    state.currentGame = 'game1';
    return;
  }
  if (screenId === 'flaggame-screen') {
    state.currentGame = null;
    return;
  }
  if (screenId === 'sprint-screen') {
    state.currentGame = null;
    return;
  }
  if (screenId === 'home-screen') {
    state.currentGame = null;
  }
  if (screenId === 'stats-screen') {
    state.currentGame = null;
    return;
  }
}
