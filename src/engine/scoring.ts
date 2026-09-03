import type { Classification, Register } from "../types";

/**
 * Thesis constraint #1: repair scores higher than a lucky guess.
 *
 * A "lucky guess" is the best case for a guesser: correct, first try, fast, no support.
 *   = XP_CORRECT + XP_SPEED + XP_REGISTER = 15
 * A repair-then-correct on the same beat:
 *   = XP_REPAIR_FIRST + XP_CORRECT_AFTER_REPAIR + XP_REGISTER = 22
 *
 * If you change these numbers, run the acceptance suite (engine/acceptance.ts).
 */
export const XP = {
  CORRECT: 10,
  CORRECT_AFTER_REPAIR: 8,
  CORRECT_AFTER_REVEAL: 5,
  DETECT: 20,
  SPEED: 3,
  REGISTER: 2,
  REPAIR_FIRST: 12,
  REPAIR_AGAIN: 3,
  REVEAL_COST: -4,
  SLOW_COST: -1,
  MISUNDERSTOOD: 0,
  WRONG: 0,
  ENGLISH: 0,
  FREEZE: 0,
} as const;

export interface ScoreCtx {
  repairsThisBeat: number; // repairs used before this response, on this beat
  supportUsed: number; // 0 none, 1 replay, 2 slow, 3 reveal
  responseMs: number | null;
  timerMs: number;
  playerRegister: Register | null;
  expectedRegister: Register;
}

export function scoreTurn(c: Classification, ctx: ScoreCtx): number {
  const registerBonus = ctx.playerRegister && ctx.playerRegister === ctx.expectedRegister ? XP.REGISTER : 0;
  switch (c) {
    case "repair":
      return ctx.repairsThisBeat === 0 ? XP.REPAIR_FIRST : XP.REPAIR_AGAIN;
    case "detect":
      return XP.DETECT + registerBonus;
    case "correct": {
      let base: number = XP.CORRECT;
      if (ctx.supportUsed >= 3) base = XP.CORRECT_AFTER_REVEAL;
      else if (ctx.repairsThisBeat > 0) base = XP.CORRECT_AFTER_REPAIR;
      const fast = ctx.responseMs !== null && ctx.responseMs <= ctx.timerMs * 0.4 && ctx.supportUsed === 0 && ctx.repairsThisBeat === 0;
      return base + (fast ? XP.SPEED : 0) + registerBonus;
    }
    case "misunderstood":
      return XP.MISUNDERSTOOD;
    case "wrong":
    case "objective_fail":
      return XP.WRONG;
    case "english":
      return XP.ENGLISH;
    case "freeze":
      return XP.FREEZE;
  }
}

export function levelFor(xp: number) {
  const level = Math.floor(Math.sqrt(xp / 25)) + 1;
  const floor = 25 * (level - 1) ** 2;
  const ceil = 25 * level ** 2;
  return { level, progress: (xp - floor) / (ceil - floor) };
}

/** Register detection for free-text input. */
export function detectRegister(text: string): Register {
  const t = text.trim();
  if (/(いただけ|いただき|恐れ入り|おそれいり|ございま|いたします|でしょうか|お伺い|申し訳|かしこまり|失礼ですが|osore|gozaima|itadake|deshou ka)/.test(t)) return "keigo";
  if (/(です|ます|ません|でした|ましょう|ください|お願い|おねがい|onegai|desu|masu|masen|kudasai)/.test(t)) return "polite";
  return "casual";
}
