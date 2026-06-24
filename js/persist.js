const STORAGE_KEY = 'geoquiz_progress';

/**
 * Default empty stats structure.
 */
function emptyStats() {
  return {
    game1: { bestStreak: 0, totalGuesses: 0, correctGuesses: 0 },
    game2: { bestStreak: 0, totalRounds: 0, correctRounds: 0 },
    game3: { bestStreak: 0, totalFlags: 0, correctFlags: 0 },
    game4: { bestScore: 0 },
  };
}

/**
 * Save current progress to localStorage.
 * @param {object} opts
 * @param {string} opts.gameId
 * @param {number} opts.score
 * @param {number} opts.totalFound
 * @param {Set<string>} opts.allFound
 * @param {Set<string>} opts.completedLetters
 * @param {number} [opts.bestStreak]
 * @param {object} [opts.gameStats] - partial per-game stats to merge in
 */
export function saveProgress({ gameId, score, totalFound, allFound, completedLetters, bestStreak, gameStats }) {
  try {
    let existing = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) existing = JSON.parse(raw);
    } catch {}

    existing = existing || { games: {} };
    if (!existing.games) existing.games = {};

    const stats = existing.stats ? { ...emptyStats(), ...existing.stats } : emptyStats();

    if (gameStats) {
      if (gameStats.game1) stats.game1 = { ...stats.game1, ...gameStats.game1 };
      if (gameStats.game2) stats.game2 = { ...stats.game2, ...gameStats.game2 };
      if (gameStats.game3) stats.game3 = { ...stats.game3, ...gameStats.game3 };
      if (gameStats.game4) stats.game4 = { ...stats.game4, ...gameStats.game4 };
    }

    if (gameId) {
      existing.games[gameId] = {
        score: score !== undefined ? score : existing.games[gameId]?.score || 0,
        totalFound: totalFound !== undefined ? totalFound : existing.games[gameId]?.totalFound || 0,
        allFound: allFound ? [...allFound] : existing.games[gameId]?.allFound || [],
        completedLetters: completedLetters ? [...completedLetters] : existing.games[gameId]?.completedLetters || [],
        bestStreak: bestStreak !== undefined ? bestStreak : existing.games[gameId]?.bestStreak || 0,
      };
    }

    const payload = {
      games: existing.games,
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
 */
export function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    let data = JSON.parse(raw);
    if (!data) return null;

    // Migrate from old format
    if (data.score !== undefined && !data.games) {
      data.games = {
        game1: {
          score: data.score,
          totalFound: data.totalFound,
          allFound: data.allFound || [],
          completedLetters: data.completedLetters || [],
          bestStreak: data.bestStreak || 0
        }
      };
    }
    
    if (!data.games) data.games = {};

    const restoredGames = {};
    for (let i = 1; i <= 4; i++) {
      const g = `game${i}`;
      const dg = data.games[g] || {};
      restoredGames[g] = {
        score: dg.score || 0,
        totalFound: dg.totalFound || 0,
        allFound: new Set(dg.allFound || []),
        completedLetters: new Set(dg.completedLetters || []),
        bestStreak: dg.bestStreak || 0
      };
    }

    return {
      games: restoredGames,
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
