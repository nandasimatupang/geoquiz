const STORAGE_KEY = 'geoquiz_progress';

export const MAX_SPRINT_SCORES = 20;

/**
 * Default empty stats structure.
 */
function emptyStats() {
  return {
    game1: { bestStreak: 0, totalGuesses: 0, correctGuesses: 0 },
    game2: { bestStreak: 0, totalRounds: 0, correctRounds: 0 },
    game3: { bestStreak: 0, totalFlags: 0, correctFlags: 0 },
    game4: { bestScore: 0, totalSprints: 0, sprintScores: [], totalFoundInSprints: 0 },
  };
}

/**
 * Save current progress to localStorage.
 * @param {object} opts
 * @param {number} opts.score
 * @param {number} opts.totalFound
 * @param {Set<string>} opts.allFound
 * @param {Set<string>} opts.completedLetters
 * @param {number} [opts.bestStreak]
 * @param {object} [opts.gameStats] - partial per-game stats to merge in
 */
export function saveProgress({ score, totalFound, allFound, completedLetters, bestStreak, gameStats }) {
  try {
    // Load existing data to merge game stats
    let existing = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) existing = JSON.parse(raw);
    } catch {}

    if (bestStreak === undefined) {
      bestStreak = existing?.bestStreak || 0;
    }

    const stats = existing?.stats ? { ...emptyStats(), ...existing.stats } : emptyStats();

    // Merge in any per-game stats updates
    if (gameStats) {
      if (gameStats.game1) stats.game1 = { ...stats.game1, ...gameStats.game1 };
      if (gameStats.game2) stats.game2 = { ...stats.game2, ...gameStats.game2 };
      if (gameStats.game3) stats.game3 = { ...stats.game3, ...gameStats.game3 };
      if (gameStats.game4) stats.game4 = { ...stats.game4, ...gameStats.game4 };
    }

    const payload = {
      score,
      totalFound,
      allFound: [...allFound],
      completedLetters: [...completedLetters],
      bestStreak: bestStreak || 0,
      stats,
      savedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage might be full or disabled — silently ignore
  }
}

/**
 * Load previously saved progress from localStorage.
 * Returns null if nothing is saved or data is corrupt.
 * @returns {{ score: number, totalFound: number, allFound: Set<string>, completedLetters: Set<string>, bestStreak: number, stats: object } | null}
 */
export function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data.score !== 'number') return null;

    return {
      score: data.score,
      totalFound: data.totalFound,
      allFound: new Set(data.allFound || []),
      completedLetters: new Set(data.completedLetters || []),
      bestStreak: data.bestStreak || 0,
      stats: data.stats ? { ...emptyStats(), ...data.stats } : emptyStats(),
    };
  } catch {
    return null;
  }
}

/**
 * Clear all saved progress (for debugging/reset).
 */
export function clearProgress() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
