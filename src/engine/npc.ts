import type { Beat, Classification, Line, MetaState, NpcTurn, Option, Register, Scenario } from "../types";
import { detectRegister } from "./scoring";
import { lockedCount } from "./storage";

/**
 * The NPC system prompt. Kept here as the contract for when turns are routed
 * through an LLM proxy (Sonnet). The local engine below enforces the same rules
 * deterministically. Note what is NOT in here: no permission to explain grammar,
 * no permission to acknowledge being an AI, no permission to switch to English.
 */
export const NPC_SYSTEM_PROMPT = `You are a character in Tokyo. You are not a teacher. You are not an assistant.
Stay in character at all times. Speak only Japanese in the "japanese" field.
You have a hidden true_intent and a reveal_rule. NEVER state the true_intent directly.
Deflect using the reveal_rule (ちょっと…, 難しいですね, changing the subject).
If the player is unclear, say え？ or repeat yourself. Do not correct their grammar. Do not explain anything.
If the player speaks English, respond in Japanese only: すみません、日本語でお願いします。
Output strictly the JSON schema: {japanese, furigana, romaji, english, register, true_meaning, state_delta, objective_met}.
The true_meaning field is for the debrief system only and must never appear in "japanese" or "english".`;

export interface NpcState {
  patience: number;
  maxPatience: number;
}

export interface PlayerInput {
  optionId?: string;
  text?: string;
  freeze?: boolean;
}

export interface Classified {
  classification: Classification;
  option?: Option;
  playerText: string;
  playerRegister: Register | null;
  slow?: boolean;
}

const REPAIR_JA = /(もう一度|もういちど|ゆっくり|何ですか|なんですか|もう一回|もういっかい|聞こえません|わかりません)/;
const REPAIR_RO = /(mou ?ichido|yukkuri|nan ?desu ?ka|mou ?ikkai|wakarimasen)/i;
const HAS_JA = /[\u3040-\u30ff\u4e00-\u9faf]/;

export function classify(beat: Beat, input: PlayerInput): Classified {
  if (input.freeze) return { classification: "freeze", playerText: "", playerRegister: null };

  if (input.optionId) {
    if (input.optionId === "repair_again") return { classification: "repair", playerText: "もう一度お願いします", playerRegister: "polite" };
    if (input.optionId === "repair_slow") return { classification: "repair", playerText: "ゆっくりお願いします", playerRegister: "polite", slow: true };
    if (input.optionId === "repair_what") return { classification: "repair", playerText: "これは何ですか", playerRegister: "polite", slow: true };
    const opt = beat.options.find((o) => o.id === input.optionId)!;
    return { classification: kindToClass(opt), option: opt, playerText: opt.japanese, playerRegister: opt.register };
  }

  const text = (input.text ?? "").trim();
  if (!text) return { classification: "freeze", playerText: "", playerRegister: null };
  const lower = text.toLowerCase();
  const isJa = HAS_JA.test(text);

  if ((isJa && REPAIR_JA.test(text)) || (!isJa && REPAIR_RO.test(lower))) {
    return { classification: "repair", playerText: text, playerRegister: detectRegister(text), slow: /ゆっくり|yukkuri/.test(lower) };
  }

  // match against option keys, correct/detect first
  const ordered = [...beat.options].sort((a, b) => rank(a) - rank(b));
  for (const opt of ordered) {
    if (opt.kind === "english") continue;
    const keys = (opt.keys ?? []).map((k) => k.toLowerCase());
    if (keys.some((k) => k && lower.includes(k))) {
      return { classification: kindToClass(opt), option: opt, playerText: text, playerRegister: detectRegister(text) };
    }
  }
  if (!isJa) return { classification: "english", playerText: text, playerRegister: null };
  return { classification: "misunderstood", playerText: text, playerRegister: detectRegister(text) };
}

function rank(o: Option) {
  return o.kind === "detect" ? 0 : o.kind === "correct" ? 1 : 2;
}

function kindToClass(o: Option): Classification {
  if (o.kind === "english") return "english";
  if (o.kind === "detect") return "detect";
  if (o.failsObjective) return "objective_fail";
  if (o.kind === "correct") return "correct";
  return o.reaction ? "wrong" : "misunderstood";
}

const ACKS: Line[] = [
  { japanese: "はい。", furigana: "はい。", romaji: "hai.", english: "Okay.", register: "polite" },
  { japanese: "はい、わかりました。", furigana: "はい、わかりました。", romaji: "hai, wakarimashita.", english: "Okay, got it.", register: "polite" },
  { japanese: "ええ。", furigana: "ええ。", romaji: "ee.", english: "Right.", register: "polite" },
];

/**
 * Produce the NPC's structured turn. Pure function of (scenario, beat, state, classified input).
 */
export function npcTurn(
  scenario: Scenario,
  beat: Beat,
  state: NpcState,
  c: Classified,
  meta: MetaState,
): NpcTurn {
  const npc = scenario.npc;
  const delta: NpcTurn["state_delta"] = {};
  const lowPatience = state.patience <= 1;
  const base = (line: Line, extra: Partial<NpcTurn> = {}): NpcTurn => ({
    japanese: line.japanese,
    furigana: line.furigana,
    romaji: line.romaji,
    english: line.english,
    register: line.register,
    true_meaning: line.true_meaning ?? "",
    state_delta: delta,
    objective_met: false,
    classification: c.classification,
    advance: false,
    ...extra,
  });
  const terse = (line: Line, meaning: string): Line =>
    lowPatience
      ? { ...line, japanese: "…" + line.japanese, furigana: "…" + line.furigana, romaji: "..." + line.romaji, true_meaning: meaning + " (Patience is nearly gone.)" }
      : { ...line, true_meaning: meaning };

  switch (c.classification) {
    case "freeze": {
      delta.patience = -1;
      const line: Line = { ...beat.npc, japanese: "…あの？ " + beat.npc.japanese, furigana: "…あの？ " + beat.npc.furigana, romaji: "...ano? " + beat.npc.romaji, english: "...Hello? " + beat.npc.english };
      return base(terse(line, "You froze. I'm asking again, and I'm less patient about it."));
    }
    case "english": {
      delta.patience = -1;
      delta.meiwaku = 5;
      const line: Line = { japanese: "すみません、日本語でお願いします。", furigana: "すみません、にほんごでおねがいします。", romaji: "sumimasen, nihongo de onegai shimasu.", english: "Sorry — Japanese, please.", register: "polite" };
      return base(terse(line, "I don't do English. That wasn't a choice I made to be difficult; it's just the room you're in."));
    }
    case "repair": {
      // Repair is respected, not punished. Patience ticks only if abused.
      const repeated = c.slow;
      const line: Line = { ...beat.npc };
      if (repeated) {
        line.japanese = beat.npc.japanese;
        line.english = "(slowly) " + beat.npc.english;
      }
      return base(terse(line, "Fine. Asking again" + (repeated ? ", slowly" : "") + ". Asking is normal; I'd rather this than a guess."), { slow: repeated });
    }
    case "misunderstood": {
      delta.patience = -1;
      const line: Line = { ...beat.npc, japanese: "え？ " + beat.npc.japanese, furigana: "え？ " + beat.npc.furigana, romaji: "e? " + beat.npc.romaji, english: "Eh? " + beat.npc.english };
      const meaning = c.option?.senseiNote ? "That didn't answer what I asked." : "I didn't get that at all. Same question.";
      return base(terse(line, meaning));
    }
    case "wrong": {
      const opt = c.option!;
      applyOptionDelta(opt, delta);
      const line = opt.reaction ?? { ...beat.npc, japanese: "え？ " + beat.npc.japanese, furigana: "え？ " + beat.npc.furigana, romaji: "e? " + beat.npc.romaji, english: "Eh? " + beat.npc.english };
      return base(terse(line, line.true_meaning ?? "Not what I asked. Repeating myself."));
    }
    case "objective_fail": {
      const opt = c.option!;
      applyOptionDelta(opt, delta);
      const line = opt.reaction ?? beat.npc;
      return base({ ...line, true_meaning: line.true_meaning ?? "That decision failed the objective." });
    }
    case "detect":
    case "correct": {
      const opt = c.option!;
      applyOptionDelta(opt, delta);
      registerEffects(opt.register, npc.register_expected, opt, delta);
      const line = opt.reaction ?? ACKS[(beat.id.length + opt.id.charCodeAt(0)) % ACKS.length];
      let out = base(
        { ...line, true_meaning: line.true_meaning ?? (c.classification === "detect" ? "You read the indirection. Good." : "Fine. Moving on.") },
        { advance: true, objective_met: !!beat.final || !!opt.completes },
      );
      out = jouzu(out, scenario, beat, opt, meta);
      return out;
    }
  }
}

function applyOptionDelta(opt: Option, delta: NpcTurn["state_delta"]) {
  if (opt.wallet) delta.wallet = (delta.wallet ?? 0) + opt.wallet;
  if (opt.meiwaku) delta.meiwaku = (delta.meiwaku ?? 0) + opt.meiwaku;
  if (opt.patience) delta.patience = (delta.patience ?? 0) + opt.patience;
}

/** Generic register consequences when the option doesn't already encode them. */
function registerEffects(actual: Register, expected: Register, opt: Option, delta: NpcTurn["state_delta"]) {
  if (opt.meiwaku !== undefined) return;
  const order: Register[] = ["casual", "polite", "keigo"];
  const gap = order.indexOf(actual) - order.indexOf(expected);
  if (gap < 0) delta.meiwaku = (delta.meiwaku ?? 0) + 4 * -gap; // too casual
  if (gap > 1) delta.meiwaku = (delta.meiwaku ?? 0) + 2; // absurdly formal
}

/**
 * The 上手 mechanic. Early runs: praise for minimal effort. Later runs: a correction instead.
 * The correction is the secret-ending trigger — the moment you stopped being a guest.
 */
function jouzu(turn: NpcTurn, scenario: Scenario, beat: Beat, opt: Option, meta: MetaState): NpcTurn {
  const veteran = meta.runsCompleted >= 1 || lockedCount(meta) >= 8;
  if (scenario.day === 1 && beat.id === "d1_purpose") {
    if (!veteran) {
      return {
        ...turn,
        japanese: turn.japanese + " 日本語、上手ですね。",
        furigana: turn.furigana + " にほんご、じょうずですね。",
        romaji: turn.romaji + " nihongo, jouzu desu ne.",
        english: turn.english + " Your Japanese is good.",
        true_meaning: "You said one word. I say this to everyone. It costs me nothing.",
        flag: "jouzu_praise",
      };
    }
    if (opt.register === "casual") {
      return {
        ...turn,
        japanese: "観光「です」、ね。",
        furigana: "かんこう「です」、ね。",
        romaji: "kankou 'desu', ne.",
        english: "Sightseeing — 'desu'. Right.",
        true_meaning: "I corrected you instead of praising you. I wouldn't bother if you were a tourist.",
        flag: "jouzu_correct",
      };
    }
  }
  if (scenario.day === 6 && beat.id === "d6_close" && veteran && opt.id === "a") {
    return {
      ...turn,
      japanese: "こちらこそ。…「ございます」、少し早いですね。もう少しゆっくりで大丈夫ですよ。",
      furigana: "こちらこそ。…「ございます」、すこしはやいですね。もうすこしゆっくりでだいじょうぶですよ。",
      romaji: "kochira koso. ...'gozaimasu', sukoshi hayai desu ne. mou sukoshi yukkuri de daijoubu desu yo.",
      english: "Likewise. ...Your 'gozaimasu' is a little rushed. You can take it slower.",
      true_meaning: "No 上手. A correction. You're not a guest here anymore.",
      flag: "jouzu_correct",
    };
  }
  return turn;
}

/** What the scene UI is allowed to see. true_meaning is removed. Do not bypass. */
export type PlayerViewTurn = Omit<NpcTurn, "true_meaning">;
export function toPlayerView(turn: NpcTurn): PlayerViewTurn {
  const { true_meaning: _hidden, ...rest } = turn;
  void _hidden;
  return rest;
}

/** Strip the sensei-only field from a Line before it reaches the scene. */
export function lineForPlayer(line: Line): Omit<Line, "true_meaning"> {
  const { true_meaning: _hidden, ...rest } = line;
  void _hidden;
  return rest;
}
