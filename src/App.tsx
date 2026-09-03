import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Debrief from "./components/Debrief";
import Landing from "./components/Landing";
import ResetScreen from "./components/ResetScreen";
import ReviewDeck from "./components/ReviewDeck";
import Scene from "./components/Scene";
import WinScreen from "./components/WinScreen";
import { FINAL_DAY, SCENARIOS } from "./data/scenarios";
import { logAcceptance } from "./engine/acceptance";
import { senseiDebrief } from "./engine/sensei";
import { checkSupport, stopSpeaking } from "./engine/speech";
import { FREE_TEXT_XP, leitnerFail, leitnerSuccess, loadMeta, recordRun, resetMeta, saveMeta } from "./engine/storage";
import type { MetaState, OffenceEvent, RunState, SenseiReport, Strike, TurnRecord } from "./types";

type Phase = "landing" | "scene" | "debrief" | "review" | "reset" | "win";

const START_WALLET = 30000;

function freshRun(runNumber: number): RunState {
  return { runNumber, day: 1, wallet: START_WALLET, meiwaku: 0, xp: 0, strikes: [], transcript: [], offences: [], forgivenessUsed: false };
}

export default function App() {
  const [meta, setMetaState] = useState<MetaState>(() => loadMeta());
  const [phase, setPhase] = useState<Phase>("landing");
  const [run, setRun] = useState<RunState>(() => freshRun(1));
  const [report, setReport] = useState<SenseiReport | null>(null);
  const [forgiven, setForgiven] = useState(false);
  const [dead, setDead] = useState(false);
  const [sceneKey, setSceneKey] = useState(0);
  const [acceptancePass, setAcceptancePass] = useState<number | null>(null);
  const support = useMemo(() => checkSupport(), []);
  const runRef = useRef(run);
  runRef.current = run;

  const setMeta = useCallback((updater: (m: MetaState) => MetaState) => {
    setMetaState((m) => {
      const next = updater(m);
      saveMeta(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const r = logAcceptance();
    setAcceptancePass(r.filter((x) => x.pass).length);
  }, []);

  const scenario = SCENARIOS[run.day - 1];

  // ---------- run lifecycle
  const startRun = () => {
    stopSpeaking();
    const runNumber = meta.runsStarted + 1;
    setMeta((m) => ({ ...m, runsStarted: runNumber }));
    setRun(freshRun(runNumber));
    setDead(false);
    setForgiven(false);
    setReport(null);
    setSceneKey((k) => k + 1);
    setPhase("scene");
  };

  const onTurn = (rec: TurnRecord, delta: { wallet?: number; meiwaku?: number; xp: number; offence?: OffenceEvent }) => {
    setRun((r) => ({
      ...r,
      transcript: [...r.transcript, rec],
      wallet: r.wallet + (delta.wallet ?? 0),
      meiwaku: Math.max(0, Math.min(100, r.meiwaku + (delta.meiwaku ?? 0))),
      xp: Math.max(0, r.xp + delta.xp),
      offences: delta.offence ? [...r.offences, delta.offence] : r.offences,
    }));
    setMeta((m) => {
      let next = { ...m, totalXp: m.totalXp + Math.max(0, delta.xp) };
      if (!next.freeTextUnlocked && next.totalXp >= FREE_TEXT_XP) next.freeTextUnlocked = true;
      if ((rec.classification === "correct" || rec.classification === "detect" || rec.classification === "repair") && rec.phraseId) {
        next = leitnerSuccess(next, rec.phraseId);
      }
      return next;
    });
  };

  const onSupport = (cost: number) => setRun((r) => ({ ...r, xp: Math.max(0, r.xp + cost) }));

  const onStrike = (s: Strike) => {
    const r = runRef.current;
    const strikes = [...r.strikes, s];
    setRun((prev) => ({ ...prev, strikes }));
    if (strikes.length >= 3) {
      setDead(true);
      setMeta((m) =>
        recordRun(m, {
          run_number: r.runNumber,
          death_day: r.day,
          death_location: s.location,
          strikes,
          xp: r.xp,
          ended_at: Date.now(),
        }),
      );
      setTimeout(() => setPhase("reset"), 2600);
    }
  };

  const onComplete = () => {
    stopSpeaking();
    const r = runRef.current;
    const dayTurns = r.transcript.filter((t) => t.day === r.day);
    const zeroSupport = dayTurns.length > 0 && dayTurns.every((t) => t.supportUsed === 0);
    let strikes = r.strikes;
    let forgivenessUsed = r.forgivenessUsed;
    let didForgive = false;
    if (!forgivenessUsed && zeroSupport && strikes.length > 0) {
      strikes = strikes.slice(0, -1);
      forgivenessUsed = true;
      didForgive = true;
    }
    // Sensei: separate call, separate prompt, full transcript + hidden state.
    const rep = senseiDebrief(SCENARIOS[r.day - 1], r.transcript, r.strikes, r.offences, r.meiwaku);
    setReport(rep);
    setForgiven(didForgive);
    setRun((prev) => ({ ...prev, strikes, forgivenessUsed }));
    setPhase("debrief");
  };

  const onReviewResult = (phraseId: string, ok: boolean) => {
    setMeta((m) => (ok ? leitnerSuccess(m, phraseId) : leitnerFail(m, phraseId)));
  };

  const onReviewDone = () => {
    if (run.day >= FINAL_DAY) {
      setMeta((m) =>
        recordRun({ ...m, runsCompleted: m.runsCompleted + 1 }, {
          run_number: run.runNumber,
          death_day: null,
          death_location: null,
          strikes: run.strikes,
          xp: run.xp,
          ended_at: Date.now(),
        }),
      );
      setPhase("win");
      return;
    }
    setRun((r) => ({ ...r, day: r.day + 1 }));
    setSceneKey((k) => k + 1);
    setPhase("scene");
  };

  const goHome = () => {
    stopSpeaking();
    setPhase("landing");
  };

  const wipe = () => {
    if (!confirm("Wipe all runs, vocabulary and history?")) return;
    resetMeta();
    setMetaState(loadMeta());
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-red-500/30">
      {phase === "landing" && (
        <>
          <Landing meta={meta} onStart={startRun} onWipe={wipe} />
          {acceptancePass !== null && (
            <div className="pb-6 text-center text-[10px] uppercase tracking-widest text-zinc-700">
              thesis acceptance suite: {acceptancePass}/6 pass · details in console
            </div>
          )}
        </>
      )}
      {phase === "scene" && (
        <Scene
          key={sceneKey}
          scenario={scenario}
          run={run}
          meta={meta}
          tts={support.tts}
          stt={support.stt}
          dead={dead}
          onTurn={onTurn}
          onStrike={onStrike}
          onSupport={onSupport}
          onComplete={onComplete}
        />
      )}
      {phase === "debrief" && report && <Debrief report={report} forgiven={forgiven} onContinue={() => setPhase("review")} />}
      {phase === "review" && report && <ReviewDeck meta={meta} cleared={report.phrasesCleared} onResult={onReviewResult} onDone={onReviewDone} />}
      {phase === "reset" && <ResetScreen run={run} meta={meta} onRestart={startRun} onHome={goHome} />}
      {phase === "win" && <WinScreen run={run} meta={meta} onHome={goHome} />}
    </div>
  );
}
