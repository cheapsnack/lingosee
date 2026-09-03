import type { OffenceEvent, Scenario, SenseiReport, Strike, TurnRecord } from "../types";
import { PHRASES } from "../data/phrases";

/**
 * Sensei prompt contract. Separate call, separate system prompt, separate mind.
 * The Sensei is the ONLY component that receives true_meaning / true_intent.
 */
export const SENSEI_SYSTEM_PROMPT = `You are a debrief coach reviewing a transcript after a scene has ended.
You are not a character. Do not roleplay. Speak plainly in English.
You receive the full transcript, the NPC's hidden state (true_intent, reveal_rule), and each line's true_meaning.
Your job: name the exact moment the player misread the room, explain what the NPC actually meant,
and give one concrete thing to do differently. Never scold grammar. Freezing and quitting are the failures; being wrong is not.`;

export function senseiDebrief(
  scenario: Scenario,
  transcript: TurnRecord[],
  strikes: Strike[],
  offences: OffenceEvent[],
  meiwaku: number,
): SenseiReport {
  const day = scenario.day;
  const turns = transcript.filter((t) => t.day === day);
  const answered = turns.filter((t) => ["correct", "detect", "wrong", "misunderstood", "objective_fail"].includes(t.classification));
  const firstTry = turns.filter((t) => (t.classification === "correct" || t.classification === "detect") && t.supportUsed === 0);
  const repairs = turns.filter((t) => t.classification === "repair");
  const freezes = turns.filter((t) => t.classification === "freeze");
  const english = turns.filter((t) => t.classification === "english");
  const wrongs = turns.filter((t) => ["wrong", "misunderstood", "objective_fail"].includes(t.classification));

  // ---- four scores (0-100)
  const comprehension = answered.length ? Math.round((100 * (firstTry.length + 0.5 * turns.filter((t) => (t.classification === "correct" || t.classification === "detect") && t.supportUsed > 0).length)) / Math.max(1, scenario.beats.length)) : 0;

  // repair: rewarded for using repair when it was needed (freeze/wrong/misunderstood happened), penalised for freezing instead
  const needed = freezes.length + wrongs.length + repairs.length;
  const repair = needed === 0 ? (firstTry.length === scenario.beats.length ? 100 : 70) : Math.round(100 * (repairs.length / needed)) - freezes.length * 15;

  const registered = turns.filter((t) => t.playerRegister);
  const registerHits = registered.filter((t) => t.playerRegister === t.registerExpected).length;
  const register = registered.length ? Math.round((100 * registerHits) / registered.length) : 100;

  const timed = turns.filter((t) => t.responseMs !== null && t.classification !== "freeze");
  const avgMs = timed.length ? timed.reduce((a, t) => a + (t.responseMs ?? 0), 0) / timed.length : 0;
  const timerMs = scenario.timer_seconds * 1000;
  const speed = timed.length ? Math.max(0, Math.min(100, Math.round(100 - (avgMs / timerMs) * 80))) - freezes.length * 20 : 0;

  const clamp = (n: number) => Math.max(0, Math.min(100, n));
  const scores = { comprehension: clamp(comprehension), repair: clamp(repair), register: clamp(register), speed: clamp(speed) };

  // ---- notes
  const notes: string[] = [];
  const dayStrikes = strikes.filter((s) => s.day === day);
  if (freezes.length) {
    const b = scenario.beats.find((x) => x.id === freezes[0].beatId);
    notes.push(`You froze when ${scenario.npc.name} said 「${b?.npc.japanese ?? "…"}」. Freezing is the strike. もう一度お願いします would have cost you nothing and earned XP.`);
  }
  if (english.length) notes.push(`You switched to English ${english.length}×. ${scenario.npc.name} doesn't speak it and won't. That's a strike every time; a wrong Japanese answer never is.`);
  for (const t of turns) if (t.senseiNote && !notes.includes(t.senseiNote)) notes.push(t.senseiNote);
  if (repairs.length >= 1 && freezes.length === 0) notes.push(`You asked for a repeat ${repairs.length}× and never froze. That's the skill this game is about. Repair XP is scored above a lucky guess on purpose.`);
  if (registered.length && scores.register < 60) {
    const casualCount = registered.filter((t) => t.playerRegister === "casual").length;
    notes.push(casualCount > registered.length / 2
      ? `Register: you were casual with someone expecting ${scenario.npc.register_expected}. Meiwaku is now ${meiwaku}. It accumulates faster than it clears.`
      : `Register: you were more formal than the room. That reads as strange, not respectful.`);
  }
  if (scenario.day === 6 && meiwaku >= 40 && offences.length) {
    const worst = [...offences].sort((a, b) => b.amount - a.amount)[0];
    notes.push(`Tanaka opened cold because word got around: on Day ${worst.day} you ${worst.type}. The game remembers what you did; so does the neighbourhood.`);
  }
  if (dayStrikes.length === 0 && wrongs.length > 0) notes.push(`${wrongs.length} wrong answer${wrongs.length > 1 ? "s" : ""}, zero strikes. Being wrong isn't failure here. Only freezing, quitting, or blowing the objective is.`);
  if (turns.some((t) => t.classification === "detect")) notes.push(`You heard ちょっと…難しい and treated it as the 'no' it was, then found the door around it. Nobody will ever say いいえ to you in an office in this country. That was the lesson.`);

  // ---- reveals: what was said vs what was meant (the ONLY place true_meaning is shown)
  const reveals: { said: string; meant: string }[] = [];
  const seen = new Set<string>();
  for (const t of turns) {
    const m = t.npcLine.true_meaning;
    if (m && !seen.has(t.npcLine.japanese)) {
      seen.add(t.npcLine.japanese);
      reveals.push({ said: t.npcLine.japanese, meant: m });
    }
  }

  const phrasesCleared = Array.from(new Set(turns.filter((t) => (t.classification === "correct" || t.classification === "detect") && t.phraseId).map((t) => t.phraseId!)));

  const headline =
    dayStrikes.length === 0 && freezes.length === 0 && repairs.length > 0
      ? "Clean day. You repaired instead of freezing."
      : dayStrikes.length === 0
      ? "Cleared. No strikes."
      : dayStrikes.length === 1
      ? `Cleared, one strike: you ${strikeVerb(dayStrikes[0])}.`
      : `Cleared, barely. ${dayStrikes.length} strikes.`;

  return { day, scores, headline, notes: notes.slice(0, 6), reveals, phrasesCleared };
}

export function strikeVerb(s: Strike) {
  return s.type === "freeze" ? "froze" : s.type === "english" ? "bailed to English" : "failed the objective";
}

export function phraseLabel(id: string) {
  return PHRASES[id]?.japanese ?? id;
}
