import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PHRASES, REPAIR_PHRASE_IDS } from "../data/phrases";
import { classify, lineForPlayer, npcTurn, toPlayerView, type PlayerInput, type PlayerViewTurn } from "../engine/npc";
import { XP, scoreTurn } from "../engine/scoring";
import { listen, speak, stopSpeaking } from "../engine/speech";
import { isLocked, ratchet } from "../engine/storage";
import type { MetaState, OffenceEvent, Option, RunState, Scenario, Strike, TurnRecord } from "../types";
import HUD from "./HUD";

interface Props {
  scenario: Scenario;
  run: RunState;
  meta: MetaState;
  tts: boolean;
  stt: boolean;
  dead: boolean;
  onTurn: (rec: TurnRecord, delta: { wallet?: number; meiwaku?: number; xp: number; offence?: OffenceEvent }) => void;
  onStrike: (s: Strike) => void;
  onSupport: (xpCost: number) => void;
  onComplete: () => void;
}

type Phase = "intro" | "speaking" | "speaking_support" | "awaiting" | "thinking" | "reacting" | "done";

export default function Scene({ scenario, run, meta, tts, stt, dead, onTurn, onStrike, onSupport, onComplete }: Props) {
  const r = useMemo(() => ratchet(meta), [meta]);
  const coldOpen = !!scenario.coldOpen && run.meiwaku >= 40;

  const [beatIdx, setBeatIdx] = useState(0);
  const [patience, setPatience] = useState(scenario.npc.patience - (coldOpen ? 1 : 0));
  const [phase, setPhase] = useState<Phase>("intro");
  const [revealed, setRevealed] = useState(!tts);
  const [supportUsed, setSupportUsed] = useState(0);
  const [repairs, setRepairs] = useState(0);
  const [timeLeft, setTimeLeft] = useState(1);
  const [lastTurn, setLastTurn] = useState<PlayerViewTurn | null>(null);
  const [playerSaid, setPlayerSaid] = useState<string | null>(null);
  const [stamp, setStamp] = useState(false);
  const [freeText, setFreeText] = useState("");
  const [listening, setListening] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const beat = scenario.beats[beatIdx];
  const timerSec = Math.max(3, (beat.timer ?? scenario.timer_seconds) * r.timerScale);
  const npcLine = beatIdx === 0 && coldOpen ? scenario.coldOpen! : beat.npc;
  const playerLine = lineForPlayer(lastTurn && !lastTurn.advance ? lastTurn : npcLine);

  const cancelSpeech = useRef<(() => void) | null>(null);
  const awaitingStart = useRef<number>(0);
  const deadline = useRef<number>(0);
  const busy = useRef(false);
  const handleRef = useRef<(input: PlayerInput) => void>(() => {});

  const shuffled = useMemo(() => {
    const arr = [...beat.options];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [beat]);

  // ---- speak helper
  const say = useCallback(
    (text: string, rate: number, then: () => void) => {
      cancelSpeech.current?.();
      cancelSpeech.current = speak(text, rate, () => {
        cancelSpeech.current = null;
        then();
      });
    },
    [],
  );

  const startAwaiting = useCallback(() => {
    awaitingStart.current = Date.now();
    deadline.current = Date.now() + timerSec * 1000;
    setTimeLeft(1);
    setPhase("awaiting");
  }, [timerSec]);

  // ---- speak the beat line whenever phase becomes 'speaking'
  useEffect(() => {
    if (phase !== "speaking") return;
    const rate = r.ttsRate * (beat.rate ?? 1);
    say(npcLine.japanese, rate, startAwaiting);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, beatIdx]);

  // ---- timer
  useEffect(() => {
    if (phase !== "awaiting" || dead) return;
    const id = setInterval(() => {
      const left = (deadline.current - Date.now()) / (timerSec * 1000);
      setTimeLeft(Math.max(0, left));
      if (left <= 0) {
        clearInterval(id);
        handleRef.current({ freeze: true });
      }
    }, 100);
    return () => clearInterval(id);
  }, [phase, timerSec, dead]);

  useEffect(() => () => { cancelSpeech.current?.(); stopSpeaking(); }, []);
  useEffect(() => { if (dead) { cancelSpeech.current?.(); stopSpeaking(); } }, [dead]);

  // ---- support tiers: replay (free) → slow (-1) → reveal (-4)
  const support = (tier: 1 | 2 | 3) => {
    if (phase !== "awaiting") return;
    if (tier > supportUsed) {
      setSupportUsed(tier);
      if (tier === 2) onSupport(XP.SLOW_COST);
      if (tier === 3) onSupport(XP.REVEAL_COST);
    }
    if (tier === 3) { setRevealed(true); return; }
    const rate = (tier === 2 ? 0.7 : r.ttsRate) * (beat.rate ?? 1);
    setPhase("speaking_support");
    say(playerLine.japanese, rate, startAwaiting);
  };

  // ---- main input handler
  const handleInput = (input: PlayerInput) => {
    if (busy.current || dead) return;
    if (phase !== "awaiting" && !input.freeze) return;
    busy.current = true;
    cancelSpeech.current?.();

    const responseMs = input.freeze ? null : Date.now() - awaitingStart.current;
    const c = classify(beat, input);
    const turn = npcTurn(scenario, beat, { patience, maxPatience: scenario.npc.patience }, c, meta);
    const view = toPlayerView(turn);

    // scoring
    const xp = scoreTurn(c.classification, {
      repairsThisBeat: repairs,
      supportUsed,
      responseMs,
      timerMs: timerSec * 1000,
      playerRegister: c.playerRegister,
      expectedRegister: scenario.npc.register_expected,
    });

    const delta = { ...turn.state_delta };
    const newPatience = patience + (delta.patience ?? 0);
    if (newPatience <= 0 && !turn.advance) delta.meiwaku = (delta.meiwaku ?? 0) + 5;
    setPatience(Math.max(0, newPatience));

    const rec: TurnRecord = {
      day: scenario.day,
      beatId: beat.id,
      npcLine: npcLine,
      playerText: c.playerText,
      playerRegister: c.playerRegister,
      classification: c.classification,
      xp,
      responseMs,
      supportUsed,
      registerExpected: scenario.npc.register_expected,
      senseiNote: c.option?.senseiNote,
      phraseId: c.classification === "repair" ? (c.slow ? "yukkuri" : "mou_ichido") : c.option?.phraseId,
    };
    const offence: OffenceEvent | undefined = (delta.meiwaku ?? 0) > 0 ? { type: scenario.offenceLabel, day: scenario.day, amount: delta.meiwaku! } : undefined;
    onTurn(rec, { wallet: delta.wallet, meiwaku: delta.meiwaku, xp, offence });

    const isStrike = c.classification === "freeze" || c.classification === "english" || c.classification === "objective_fail";
    if (isStrike) {
      setStamp(true);
      onStrike({ type: c.classification === "freeze" ? "freeze" : c.classification === "english" ? "english" : "objective", day: scenario.day, location: scenario.locationJa, beatId: beat.id });
      setTimeout(() => setStamp(false), 1300);
    }

    setPlayerSaid(input.freeze ? "…" : c.playerText);
    setLastTurn(view);
    setFreeText("");
    if (c.classification === "repair") setRepairs((n) => n + 1);
    setHint(
      c.classification === "repair" ? `+${xp} xp · repair` :
      c.classification === "detect" ? `+${xp} xp · you read the room` :
      c.classification === "correct" ? `+${xp} xp` :
      c.classification === "misunderstood" ? "misunderstood · not a strike" :
      c.classification === "wrong" ? "not a strike" : null,
    );

    // latency cover then speak reaction
    setPhase("thinking");
    setTimeout(() => {
      setPhase("reacting");
      const rate = (turn.slow ? 0.7 : r.ttsRate) * (turn.advance ? 1 : beat.rate ?? 1);
      say(view.japanese, rate, () => {
        busy.current = false;
        if (turn.advance) {
          if (turn.objective_met) {
            setPhase("done");
            setTimeout(onComplete, 1400);
          } else {
            setTimeout(() => {
              setBeatIdx((i) => i + 1);
              setRevealed(!tts);
              setSupportUsed(0);
              setRepairs(0);
              setLastTurn(null);
              setPlayerSaid(null);
              setHint(null);
              setPhase("speaking");
            }, 900);
          }
        } else {
          startAwaiting();
        }
      });
    }, 450 + Math.random() * 500);
  };

  handleRef.current = handleInput;

  const submitFree = () => {
    const t = freeText.trim();
    if (!t) return;
    handleInput({ text: t });
  };

  const mic = () => {
    if (listening) return;
    setListening(true);
    const stop = listen(
      (text) => { setFreeText(text); setTimeout(() => handleInput({ text }), 50); },
      () => setListening(false),
    );
    if (!stop) setListening(false);
  };

  // ---- intro screen
  if (phase === "intro") {
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-12">
        <div className="text-[11px] uppercase tracking-[0.4em] text-zinc-500">Day {scenario.day}</div>
        <h2 className="mt-2 text-5xl font-black text-zinc-50">{scenario.locationJa}</h2>
        <div className="text-zinc-500">{scenario.location}</div>
        <p className="mt-6 text-lg leading-relaxed text-zinc-300">{scenario.intro}</p>
        {coldOpen && <p className="mt-3 text-sm text-amber-400">Your meiwaku is {run.meiwaku}. This one starts cold.</p>}
        <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-sm">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Objective</div>
          <div className="mt-1 text-zinc-200">{scenario.objective}</div>
          <div className="mt-2 text-xs text-zinc-500">
            Timer {timerSec.toFixed(0)}s per turn · strikes on: {scenario.fail_conditions.join(", ")}
          </div>
        </div>
        <button onClick={() => setPhase("speaking")} className="mt-8 self-start rounded-md bg-zinc-50 px-6 py-3 font-semibold text-zinc-950 hover:bg-white">
          Enter
        </button>
      </div>
    );
  }

  const showText = revealed || (lastTurn?.advance ?? false) || phase === "done";
  const speaking = phase === "speaking" || phase === "speaking_support" || phase === "reacting";
  const canAct = phase === "awaiting" && !dead;
  const isAdvancing = !!lastTurn?.advance;

  return (
    <div className={`relative mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-5 transition-all duration-[2000ms] ${dead ? "grayscale" : ""}`}>
      <HUD day={scenario.day} locationJa={scenario.locationJa} location={scenario.location} wallet={run.wallet} meiwaku={run.meiwaku} xp={run.xp} strikes={run.strikes} drained={dead} />

      {/* NPC bubble */}
      <div className="mt-6 flex-1">
        <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
          <span>
            {scenario.npc.name}
            <span className="ml-2 text-zinc-700">{"●".repeat(Math.max(0, patience))}{"○".repeat(Math.max(0, scenario.npc.patience - patience))}</span>
          </span>
          <span className="flex items-center gap-1">
            {speaking && <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />}
            {phase === "thinking" && <span className="italic text-zinc-400">えーと…</span>}
            {speaking && phase !== "reacting" && <span>speaking</span>}
          </span>
        </div>

        <div className={`rounded-2xl rounded-tl-sm border p-5 transition ${isAdvancing ? "border-emerald-900 bg-emerald-950/20" : "border-zinc-800 bg-zinc-900/60"}`}>
          {showText ? (
            <>
              <div className="text-2xl leading-snug text-zinc-50">{playerLine.japanese}</div>
              <div className="mt-1 text-sm text-zinc-500">{playerLine.furigana}</div>
              {r.showRomaji && <div className="text-xs text-zinc-600">{playerLine.romaji}</div>}
              <div className="mt-2 text-sm text-zinc-300">{playerLine.english}</div>
            </>
          ) : (
            <div className="select-none">
              <div className="text-2xl tracking-widest text-zinc-700 blur-[3px]">{"●".repeat(Math.min(18, Math.max(6, playerLine.japanese.length)))}</div>
              <div className="mt-2 text-xs text-zinc-600">audio only · 見せて to reveal (−4 xp)</div>
            </div>
          )}
        </div>

        {/* support tiers */}
        <div className="mt-2 flex gap-2 text-xs">
          <SupportBtn onClick={() => support(1)} disabled={!canAct} label="🔊 replay" sub="free" />
          <SupportBtn onClick={() => support(2)} disabled={!canAct} label="🐢 slow" sub="−1" />
          <SupportBtn onClick={() => support(3)} disabled={!canAct || revealed} label="見せて" sub="−4" />
          {hint && <span className={`ml-auto self-center ${hint.startsWith("+") ? "text-emerald-400" : "text-zinc-500"}`}>{hint}</span>}
        </div>

        {playerSaid && (
          <div className="mt-3 flex justify-end">
            <div className="max-w-[80%] rounded-2xl rounded-tr-sm border border-zinc-700 bg-zinc-800/60 px-4 py-2 text-sm text-zinc-200">{playerSaid}</div>
          </div>
        )}
      </div>

      {/* timer */}
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full transition-[width] duration-100 ${timeLeft < 0.3 ? "bg-red-500" : timeLeft < 0.6 ? "bg-amber-400" : "bg-zinc-300"}`}
          style={{ width: `${canAct ? timeLeft * 100 : 100}%`, opacity: canAct ? 1 : 0.15 }}
        />
      </div>

      {/* options */}
      <div className={`mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 ${canAct ? "" : "pointer-events-none opacity-40"}`}>
        {shuffled.map((o) => (
          <OptionBtn key={o.id} o={o} locked={isLocked(meta, o.phraseId)} showRomaji={r.showRomaji} onClick={() => handleInput({ optionId: o.id })} />
        ))}
      </div>

      {/* repair row */}
      <div className={`mt-2 grid grid-cols-3 gap-2 ${canAct ? "" : "pointer-events-none opacity-40"}`}>
        {REPAIR_PHRASE_IDS.map((id, i) => {
          const p = PHRASES[id];
          const optId = i === 0 ? "repair_again" : i === 1 ? "repair_slow" : "repair_what";
          return (
            <button key={id} onClick={() => handleInput({ optionId: optId })} className="rounded-md border border-sky-900/60 bg-sky-950/30 px-2 py-2 text-left transition hover:border-sky-700 hover:bg-sky-950/60">
              <div className="text-sm text-sky-100">{p.japanese}</div>
              <div className="text-[10px] text-sky-400/70">{p.english}</div>
            </button>
          );
        })}
      </div>

      {/* free text (unlocked by XP) */}
      {meta.freeTextUnlocked ? (
        <div className={`mt-2 flex gap-2 ${canAct ? "" : "pointer-events-none opacity-40"}`}>
          <input
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitFree()}
            placeholder="日本語で入力… (or romaji)"
            className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
          />
          {stt && (
            <button onClick={mic} className={`rounded-md border px-3 text-sm ${listening ? "animate-pulse border-red-500 text-red-400" : "border-zinc-700 text-zinc-300 hover:border-zinc-500"}`}>
              🎤
            </button>
          )}
          <button onClick={submitFree} className="rounded-md bg-zinc-100 px-3 text-sm font-semibold text-zinc-900">
            言う
          </button>
        </div>
      ) : (
        <div className="mt-2 text-center text-[10px] uppercase tracking-widest text-zinc-600">free speech unlocks at 120 xp</div>
      )}

      {/* strike stamp */}
      {stamp && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="stamp select-none text-[14rem] font-black leading-none text-red-600">×</div>
        </div>
      )}
    </div>
  );
}

function SupportBtn({ onClick, disabled, label, sub }: { onClick: () => void; disabled: boolean; label: string; sub: string }) {
  return (
    <button onClick={onClick} disabled={disabled} className="rounded border border-zinc-800 px-2 py-1 text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200 disabled:opacity-40">
      {label} <span className="text-zinc-600">{sub}</span>
    </button>
  );
}

function OptionBtn({ o, locked, showRomaji, onClick }: { o: Option; locked: boolean; showRomaji: boolean; onClick: () => void }) {
  const isEnglish = o.kind === "english";
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-3 py-2.5 text-left transition active:scale-[0.99] ${
        isEnglish ? "border-zinc-800 bg-zinc-950 hover:border-zinc-600" : "border-zinc-700 bg-zinc-900/70 hover:border-zinc-400 hover:bg-zinc-800"
      }`}
    >
      <div className={`text-base ${isEnglish ? "italic text-zinc-400" : "text-zinc-50"}`}>{o.japanese}</div>
      {!isEnglish && !locked && (
        <>
          <div className="text-[11px] text-zinc-500">{o.furigana}{showRomaji && <span className="ml-2 text-zinc-600">{o.romaji}</span>}</div>
          <div className="text-xs text-zinc-400">{o.english}</div>
        </>
      )}
      {!isEnglish && locked && <div className="text-[10px] uppercase tracking-widest text-emerald-600">定着</div>}
      {isEnglish && <div className="text-[10px] uppercase tracking-widest text-red-900">english</div>}
    </button>
  );
}
