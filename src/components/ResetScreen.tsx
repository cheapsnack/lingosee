import { useEffect, useState } from "react";
import { strikeVerb } from "../engine/sensei";
import { analysePattern } from "../engine/storage";
import type { MetaState, RunState } from "../types";

interface Props {
  run: RunState;
  meta: MetaState;
  onRestart: () => void;
  onHome: () => void;
}

type Stage = "black" | "line" | "day1" | "card";

export default function ResetScreen({ run, meta, onRestart, onHome }: Props) {
  const [stage, setStage] = useState<Stage>("black");
  const pattern = analysePattern(meta.history);
  const deaths = meta.history.filter((h) => h.death_day !== null);

  useEffect(() => {
    const t1 = setTimeout(() => {
      setStage("line");
      // Spec §10: record your own or use TTS. This is TTS, deadpan.
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance("Ah. Here we go again.");
        u.lang = "en-US";
        u.rate = 0.82;
        u.pitch = 0.75;
        window.speechSynthesis.speak(u);
      }
    }, 900);
    const t2 = setTimeout(() => setStage("day1"), 3600);
    const t3 = setTimeout(() => setStage("card"), 5600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  if (stage === "black") return <div className="min-h-screen bg-black" />;

  if (stage === "line")
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6">
        <p className="fade-in text-center text-xl italic text-zinc-500">"Ah shit. Here we go again."</p>
      </div>
    );

  if (stage === "day1")
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="fade-in text-center">
          <div className="text-[11px] uppercase tracking-[0.5em] text-zinc-600">Narita</div>
          <div className="text-7xl font-black tracking-tight text-zinc-100">DAY 1</div>
        </div>
      </div>
    );

  const lastStrikes = run.strikes;

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-12">
      <div className="fade-in">
        <div className="text-[11px] uppercase tracking-[0.4em] text-red-500">反省 · hansei</div>
        <h2 className="mt-2 text-3xl font-bold leading-tight text-zinc-50">{pattern?.headline ?? `Run ${run.runNumber} ended on Day ${run.day}.`}</h2>
        {pattern && <p className="mt-3 text-zinc-300">{pattern.detail}</p>}
        {pattern?.repeatedLocation && pattern.repeatCount >= 2 && (
          <p className="mt-3 rounded-lg border border-red-900/60 bg-red-950/20 px-4 py-3 text-sm text-red-200">
            {pattern.repeatedLocation} is your wall. Whatever you're doing when you get there, the other thing is worth trying — and もう一度お願いします is always on the table.
          </p>
        )}

        <div className="mt-6">
          <div className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">This run's three strikes</div>
          <ul className="space-y-1 text-sm">
            {lastStrikes.map((s, i) => (
              <li key={i} className="flex items-center gap-3 rounded border border-zinc-800 bg-zinc-900/40 px-3 py-2">
                <span className="font-black text-red-500">×</span>
                <span className="text-zinc-200">Day {s.day} · {s.location}</span>
                <span className="ml-auto text-zinc-400">you {strikeVerb(s)}</span>
              </li>
            ))}
          </ul>
        </div>

        {deaths.length > 1 && (
          <div className="mt-6">
            <div className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">Graveyard</div>
            <div className="flex flex-wrap gap-2">
              {deaths.slice(-10).map((h) => (
                <div key={h.run_number} className="rounded border border-zinc-800 bg-zinc-900/40 px-3 py-1.5 text-xs">
                  <span className="text-zinc-500">run {h.run_number}</span>
                  <span className="ml-2 text-zinc-200">☠ {h.death_location}</span>
                  <span className="ml-1 text-zinc-600">d{h.death_day}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 text-xs text-zinc-500">
          Vocabulary survives. Wallet, meiwaku, strikes and the day counter do not. The officer will speak a little faster this time.
        </div>

        <div className="mt-8 flex gap-3">
          <button onClick={onRestart} className="rounded-md bg-zinc-50 px-6 py-3 font-semibold text-zinc-950 hover:bg-white">
            Run {run.runNumber + 1} — Day 1
          </button>
          <button onClick={onHome} className="rounded-md border border-zinc-700 px-5 py-3 text-zinc-300 hover:border-zinc-500">
            Title
          </button>
        </div>
      </div>
    </div>
  );
}
