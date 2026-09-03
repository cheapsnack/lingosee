import { useEffect, useState } from "react";
import { checkSupport, type BrowserSupport } from "../engine/speech";
import { analysePattern, lockedCount, ratchet } from "../engine/storage";
import type { MetaState } from "../types";

interface Props {
  meta: MetaState;
  onStart: () => void;
  onWipe: () => void;
}

export default function Landing({ meta, onStart, onWipe }: Props) {
  const [support, setSupport] = useState<BrowserSupport>(() => checkSupport());
  useEffect(() => {
    const refresh = () => setSupport(checkSupport());
    if ("speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = refresh;
      window.speechSynthesis.getVoices();
    }
    const t = setTimeout(refresh, 800);
    return () => clearTimeout(t);
  }, []);

  const pattern = analysePattern(meta.history);
  const r = ratchet({ ...meta, runsStarted: meta.runsStarted + 1 });
  const locked = lockedCount(meta);

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-12">
      <div className="mb-10">
        <div className="text-[11px] uppercase tracking-[0.4em] text-red-500">Narita → Tokyo</div>
        <h1 className="mt-2 text-5xl font-black tracking-tight text-zinc-50 sm:text-6xl">
          東京<span className="text-zinc-600">サバイバル</span>
        </h1>
        <p className="mt-1 text-lg text-zinc-400">Tokyo Survival</p>
      </div>

      <div className="space-y-4 text-zinc-300">
        <p>
          You land with no Japanese. Six conversations stand between you and an apartment. Freeze three times and you're back at
          immigration, listening to that line again.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Rule title="Strikes" items={["Freeze — no answer in time", "Bail to English", "Blow the objective"]} tone="red" />
          <Rule title="Not strikes" items={["Wrong grammar", "Being misunderstood", "Asking for a repeat"]} tone="green" />
          <Rule title="Scoring" items={["もう一度お願いします beats a lucky guess", "Reading the room beats both", "見せて costs XP"]} tone="zinc" />
        </div>
      </div>

      {/* browser check */}
      <div className={`mt-8 rounded-lg border px-4 py-3 text-sm ${support.stt ? "border-emerald-900 bg-emerald-950/30 text-emerald-200" : support.tts ? "border-amber-900 bg-amber-950/30 text-amber-200" : "border-red-900 bg-red-950/30 text-red-200"}`}>
        <div className="mb-1 text-[10px] uppercase tracking-widest opacity-70">Browser check</div>
        <div>{support.label}</div>
        <div className="mt-1 flex gap-4 text-xs opacity-80">
          <span>{support.tts ? "✓" : "✗"} NPC speech</span>
          <span>{support.jaVoice ? "✓" : "△"} Japanese voice</span>
          <span>{support.stt ? "✓" : "✗"} Mic input</span>
          <span>✓ Tap-to-reply</span>
        </div>
      </div>

      {/* persistence summary */}
      {meta.runsStarted > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
          <Stat label="Runs" value={String(meta.runsStarted)} />
          <Stat label="Survived" value={String(meta.runsCompleted)} />
          <Stat label="定着 locked in" value={String(locked)} />
        </div>
      )}
      {pattern && (
        <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-300">
          <span className="text-[10px] uppercase tracking-widest text-zinc-500">反省 · last time</span>
          <div className="mt-1">{pattern.headline}</div>
        </div>
      )}

      <div className="mt-8 flex items-center gap-4">
        <button
          onClick={onStart}
          className="rounded-md bg-zinc-50 px-6 py-3 text-base font-semibold text-zinc-950 transition hover:bg-white active:scale-[0.98]"
        >
          {meta.runsStarted === 0 ? "Land at Narita" : `Run ${meta.runsStarted + 1} — Day 1`}
        </button>
        <div className="text-xs text-zinc-500">
          <div>{r.label}</div>
          <div>Timers ×{r.timerScale.toFixed(2)} · speech ×{r.ttsRate.toFixed(2)}</div>
        </div>
      </div>

      {meta.runsStarted > 0 && (
        <button onClick={onWipe} className="mt-10 self-start text-xs text-zinc-600 underline-offset-2 hover:text-zinc-400 hover:underline">
          Wipe all progress
        </button>
      )}
    </div>
  );
}

function Rule({ title, items, tone }: { title: string; items: string[]; tone: "red" | "green" | "zinc" }) {
  const c = tone === "red" ? "border-red-900/60 text-red-300" : tone === "green" ? "border-emerald-900/60 text-emerald-300" : "border-zinc-800 text-zinc-300";
  return (
    <div className={`rounded-lg border bg-zinc-900/40 p-3 ${c}`}>
      <div className="mb-1.5 text-[10px] uppercase tracking-widest opacity-80">{title}</div>
      <ul className="space-y-0.5 text-xs text-zinc-300">
        {items.map((i) => (
          <li key={i}>· {i}</li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 py-2">
      <div className="text-xl font-bold text-zinc-100">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</div>
    </div>
  );
}
