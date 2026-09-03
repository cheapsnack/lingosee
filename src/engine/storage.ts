import type { LeitnerEntry, MetaState, RunHistoryEntry } from "../types";

const KEY = "tokyo_survival_meta_v1";

const DEFAULT_META: MetaState = {
  runsStarted: 0,
  runsCompleted: 0,
  totalXp: 0,
  freeTextUnlocked: false,
  leitner: {},
  history: [],
};

export function loadMeta(): MetaState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_META };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_META, ...parsed, leitner: parsed.leitner ?? {}, history: parsed.history ?? [] };
  } catch {
    return { ...DEFAULT_META };
  }
}

export function saveMeta(meta: MetaState) {
  localStorage.setItem(KEY, JSON.stringify(meta));
}

export function resetMeta() {
  localStorage.removeItem(KEY);
}

// ---------- Leitner ----------
export const LOCK_CLEARS = 3;
export const FREE_TEXT_XP = 120;

export function leitnerGet(meta: MetaState, phraseId: string): LeitnerEntry {
  return meta.leitner[phraseId] ?? { box: 1, clears: 0, locked: false, lastSeen: 0 };
}

export function leitnerSuccess(meta: MetaState, phraseId: string): MetaState {
  const e = leitnerGet(meta, phraseId);
  const clears = e.clears + 1;
  const box = Math.min(5, e.box + 1);
  const locked = e.locked || clears >= LOCK_CLEARS;
  return { ...meta, leitner: { ...meta.leitner, [phraseId]: { box, clears, locked, lastSeen: Date.now() } } };
}

export function leitnerFail(meta: MetaState, phraseId: string): MetaState {
  const e = leitnerGet(meta, phraseId);
  return {
    ...meta,
    leitner: { ...meta.leitner, [phraseId]: { ...e, box: Math.max(1, e.box - 1), locked: false, lastSeen: Date.now() } },
  };
}

export function isLocked(meta: MetaState, phraseId?: string): boolean {
  if (!phraseId) return false;
  return leitnerGet(meta, phraseId).locked;
}

export function lockedCount(meta: MetaState): number {
  return Object.values(meta.leitner).filter((e) => e.locked).length;
}

// ---------- Run history ----------
export function recordRun(meta: MetaState, entry: RunHistoryEntry): MetaState {
  return { ...meta, history: [...meta.history, entry].slice(-30) };
}

/** Difficulty ratchet: same content, less scaffolding. */
export function ratchet(meta: MetaState) {
  const r = meta.runsStarted; // 1-indexed after start
  const level = Math.max(0, r - 1);
  return {
    ttsRate: Math.min(1.15, 0.8 + level * 0.08),
    timerScale: Math.max(0.55, 1 - level * 0.1),
    showRomaji: level < 2,
    label: level === 0 ? "First arrival" : level === 1 ? "They speak a little faster now" : level === 2 ? "No romaji. No mercy." : "Run " + r + ": native speed",
  };
}

// ---------- 反省 pattern analysis ----------
export interface Pattern {
  headline: string;
  detail: string;
  repeatedLocation: string | null;
  repeatCount: number;
  dominantStrike: string | null;
}

export function analysePattern(history: RunHistoryEntry[]): Pattern | null {
  const deaths = history.filter((h) => h.death_day !== null);
  if (deaths.length === 0) return null;
  const last = deaths[deaths.length - 1];

  // consecutive deaths at same location
  let streak = 0;
  for (let i = deaths.length - 1; i >= 0; i--) {
    if (deaths[i].death_location === last.death_location) streak++;
    else break;
  }
  // dominant strike type across all runs
  const counts: Record<string, number> = {};
  for (const h of deaths) for (const s of h.strikes) counts[s.type] = (counts[s.type] ?? 0) + 1;
  const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const dominantLabel = dominant === "freeze" ? "froze" : dominant === "english" ? "bailed to English" : "failed the objective";

  const lastStrikeTypes = last.strikes.map((s) => s.type);
  const lastDominant = lastStrikeTypes.filter((t) => t === dominant).length;

  let headline: string;
  if (streak >= 2) {
    headline = `You died at ${last.death_location}. ${ordinal(streak)} run in a row.`;
  } else if (deaths.length >= 2) {
    const prev = deaths[deaths.length - 2];
    headline = `Run ${last.run_number} ended at ${last.death_location}. Run ${prev.run_number} ended at ${prev.death_location}.`;
  } else {
    headline = `Run ${last.run_number} ended at ${last.death_location}, Day ${last.death_day}.`;
  }

  const detail =
    lastDominant >= 2
      ? `${lastDominant} of your 3 strikes this run: you ${dominantLabel}. Across all runs you've ${dominantLabel} ${counts[dominant!]} times.`
      : `Across ${deaths.length} run${deaths.length > 1 ? "s" : ""}, your most common wall is that you ${dominantLabel} (${counts[dominant!] ?? 0}×).`;

  return { headline, detail, repeatedLocation: streak >= 2 ? last.death_location : null, repeatCount: streak, dominantStrike: dominant };
}

function ordinal(n: number) {
  return n === 1 ? "First" : n === 2 ? "Second" : n === 3 ? "Third" : n === 4 ? "Fourth" : `${n}th`;
}
