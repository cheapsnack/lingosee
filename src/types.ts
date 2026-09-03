// ---------- Content ----------
export type Register = "casual" | "polite" | "keigo";

export interface Line {
  japanese: string;
  furigana: string;
  romaji: string;
  english: string;
  register: Register;
  /** SENSEI-ONLY. Never rendered in-scene. */
  true_meaning?: string;
}

export type OptionKind = "correct" | "wrong" | "english" | "detect";

export interface Option {
  id: string;
  japanese: string;
  furigana: string;
  romaji: string;
  english: string;
  kind: OptionKind;
  register: Register;
  /** id in the phrase dictionary; enables Leitner tracking */
  phraseId?: string;
  /** hidden effects */
  wallet?: number;
  meiwaku?: number;
  patience?: number;
  /** if true, choosing it fails the scene objective (strike) */
  failsObjective?: boolean;
  /** NPC's in-character reaction line */
  reaction?: Line;
  /** Sensei's out-of-character note, shown at day end only */
  senseiNote?: string;
  /** keywords for free-text matching */
  keys?: string[];
  /** if true, choosing it ends the scene immediately (e.g. taxi) */
  completes?: boolean;
}

export interface Beat {
  id: string;
  npc: Line;
  options: Option[];
  /** override scenario timer for this beat */
  timer?: number;
  /** TTS rate multiplier (garbled announcement etc) */
  rate?: number;
  /** if true, the correct answer completes the scene */
  final?: boolean;
  /** callback: phraseId this beat deliberately re-uses from an earlier day */
  callbackOf?: string;
}

export interface HiddenState {
  npc_id: string;
  name: string;
  surface: string;
  true_intent: string;
  reveal_rule: string;
  softens_if: string[];
  hardens_if: string[];
  patience: number;
  register_expected: Register;
}

export interface Scenario {
  day: number;
  location: string;
  locationJa: string;
  objective: string;
  timer_seconds: number;
  npc: HiddenState;
  target_phrases: string[];
  fail_conditions: string[];
  beats: Beat[];
  intro: string;
  /** offence type logged when the player accrues meiwaku here */
  offenceLabel: string;
  /** used instead of beats[0].npc when accumulated meiwaku is high */
  coldOpen?: Line;
}

// ---------- Structured NPC output (spec §11) ----------
export interface NpcTurn {
  japanese: string;
  furigana: string;
  romaji: string;
  english: string;
  register: Register;
  /** SENSEI-ONLY */
  true_meaning: string;
  state_delta: { patience?: number; meiwaku?: number; wallet?: number };
  objective_met: boolean;
  /** what the engine classified the player's input as */
  classification: Classification;
  /** whether to advance to the next beat */
  advance: boolean;
  /** whether to replay the current beat slowly */
  slow?: boolean;
  /** 上手 mechanic marker */
  flag?: "jouzu_praise" | "jouzu_correct";
}

export type Classification =
  | "correct"
  | "detect"
  | "wrong"
  | "misunderstood"
  | "repair"
  | "english"
  | "freeze"
  | "objective_fail";

// ---------- Run state ----------
export type StrikeType = "freeze" | "english" | "objective";

export interface Strike {
  type: StrikeType;
  day: number;
  location: string;
  beatId: string;
}

export interface TurnRecord {
  day: number;
  beatId: string;
  npcLine: Line;
  playerText: string;
  playerRegister: Register | null;
  classification: Classification;
  xp: number;
  responseMs: number | null;
  supportUsed: number; // 0 none, 1 replay, 2 slow, 3 reveal
  registerExpected: Register;
  senseiNote?: string;
  phraseId?: string;
}

export interface OffenceEvent {
  type: string;
  day: number;
  amount: number;
}

export interface RunState {
  runNumber: number;
  day: number;
  wallet: number;
  meiwaku: number;
  xp: number;
  strikes: Strike[];
  transcript: TurnRecord[];
  offences: OffenceEvent[];
  forgivenessUsed: boolean;
}

// ---------- Persistence ----------
export interface RunHistoryEntry {
  run_number: number;
  death_day: number | null; // null = survived
  death_location: string | null;
  strikes: Strike[];
  xp: number;
  ended_at: number;
}

export interface LeitnerEntry {
  box: number; // 1-5
  clears: number;
  locked: boolean;
  lastSeen: number;
}

export interface MetaState {
  runsStarted: number;
  runsCompleted: number;
  totalXp: number;
  freeTextUnlocked: boolean;
  leitner: Record<string, LeitnerEntry>;
  history: RunHistoryEntry[];
}

// ---------- Sensei ----------
export interface SenseiReport {
  day: number;
  scores: { comprehension: number; repair: number; register: number; speed: number };
  headline: string;
  notes: string[];
  reveals: { said: string; meant: string }[];
  phrasesCleared: string[];
}
