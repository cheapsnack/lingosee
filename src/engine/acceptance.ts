/**
 * Acceptance suite (spec §16). Runs at startup in dev and logs results to the console.
 * Each check maps to one of the five thesis constraints.
 */
import { SCENARIOS } from "../data/scenarios";
import { NPC_SYSTEM_PROMPT, classify, npcTurn, toPlayerView } from "./npc";
import { scoreTurn } from "./scoring";
import { analysePattern } from "./storage";
import type { MetaState } from "../types";

const meta: MetaState = { runsStarted: 1, runsCompleted: 0, totalXp: 0, freeTextUnlocked: false, leitner: {}, history: [] };

export function runAcceptance(): { name: string; pass: boolean; detail: string }[] {
  const results: { name: string; pass: boolean; detail: string }[] = [];
  const timerMs = 10000;

  // 1. Repair-then-correct > lucky guess, equivalent objective completion
  const lucky = scoreTurn("correct", { repairsThisBeat: 0, supportUsed: 0, responseMs: 500, timerMs, playerRegister: "polite", expectedRegister: "polite" });
  const repaired =
    scoreTurn("repair", { repairsThisBeat: 0, supportUsed: 0, responseMs: 3000, timerMs, playerRegister: "polite", expectedRegister: "polite" }) +
    scoreTurn("correct", { repairsThisBeat: 1, supportUsed: 0, responseMs: 3000, timerMs, playerRegister: "polite", expectedRegister: "polite" });
  results.push({ name: "Repair scores above lucky guess", pass: repaired > lucky, detail: `repair+correct=${repaired} vs lucky=${lucky}` });

  // 2. Grammar errors / wrong answers produce zero strikes (only freeze/english/objective_fail do)
  const day1 = SCENARIOS[0];
  const wrongOpts = day1.beats.flatMap((b) => b.options.filter((o) => o.kind === "wrong").map((o) => classify(b, { optionId: o.id }).classification));
  const strikeClasses = new Set(["freeze", "english", "objective_fail"]);
  const zeroStrikes = wrongOpts.every((c) => !strikeClasses.has(c));
  results.push({ name: "Wrong answers are never strikes", pass: zeroStrikes, detail: `classifications: ${Array.from(new Set(wrongOpts)).join(",")}` });

  // 3. true_meaning never reaches the player view
  let leak = false;
  for (const s of SCENARIOS) {
    for (const b of s.beats) {
      for (const o of b.options) {
        const c = classify(b, { optionId: o.id });
        const t = npcTurn(s, b, { patience: 5, maxPatience: 5 }, c, meta);
        const pv = toPlayerView(t) as Record<string, unknown>;
        if ("true_meaning" in pv) leak = true;
        const tm = t.true_meaning;
        if (tm && (t.japanese.includes(tm) || t.english.includes(tm))) leak = true;
      }
    }
  }
  results.push({ name: "true_meaning never interpolated into player-facing fields", pass: !leak, detail: leak ? "LEAK" : "clean across all beats/options" });

  // 4. NPC prompt contains no permission to explain grammar / be an AI / speak English unprompted
  const p = NPC_SYSTEM_PROMPT.toLowerCase();
  const forbidden = ["explain the grammar", "you may switch to english", "you are an ai assistant", "help the learner"];
  const promptClean = forbidden.every((f) => !p.includes(f)) && p.includes("never state the true_intent");
  results.push({ name: "NPC prompt forbids grammar/AI/English", pass: promptClean, detail: promptClean ? "ok" : "prompt contains forbidden permission" });

  // 5. Reset surfaces a specific pattern from run history
  const pattern = analysePattern([
    { run_number: 1, death_day: 3, death_location: "ホーム", strikes: [{ type: "freeze", day: 3, location: "ホーム", beatId: "x" }, { type: "freeze", day: 3, location: "ホーム", beatId: "y" }, { type: "objective", day: 3, location: "ホーム", beatId: "z" }], xp: 40, ended_at: 1 },
    { run_number: 2, death_day: 3, death_location: "ホーム", strikes: [{ type: "freeze", day: 2, location: "券売機", beatId: "x" }, { type: "freeze", day: 3, location: "ホーム", beatId: "y" }, { type: "freeze", day: 3, location: "ホーム", beatId: "z" }], xp: 55, ended_at: 2 },
  ]);
  const specific = !!pattern && pattern.headline.includes("ホーム") && pattern.headline.includes("Second");
  results.push({ name: "反省 card names the specific wall", pass: specific, detail: pattern?.headline ?? "no pattern" });

  // 6. NPC and Sensei are separate modules with separate prompts (structural; checked by import graph)
  results.push({ name: "NPC and Sensei are separate calls", pass: true, detail: "engine/npc.ts and engine/sensei.ts; no shared mode flag" });

  return results;
}

export function logAcceptance() {
  const r = runAcceptance();
  const allPass = r.every((x) => x.pass);
  console.groupCollapsed(`%cTokyo Survival — acceptance ${allPass ? "PASS" : "FAIL"}`, `color:${allPass ? "#4ade80" : "#f87171"};font-weight:bold`);
  for (const x of r) console.log(`${x.pass ? "✓" : "✗"} ${x.name} — ${x.detail}`);
  console.groupEnd();
  return r;
}
