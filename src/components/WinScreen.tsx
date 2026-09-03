import { lockedCount } from "../engine/storage";
import type { MetaState, RunState } from "../types";

interface Props {
  run: RunState;
  meta: MetaState;
  onHome: () => void;
}

export default function WinScreen({ run, meta, onHome }: Props) {
  const corrected = run.transcript.some((t) => t.classification === "correct" && t.day === 6 && t.beatId === "d6_close") && meta.runsCompleted >= 2;
  const repairs = run.transcript.filter((t) => t.classification === "repair").length;
  const freezes = run.strikes.filter((s) => s.type === "freeze").length;
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-12">
      <div className="fade-in">
        <div className="text-[11px] uppercase tracking-[0.4em] text-emerald-500">Run {run.runNumber} · complete</div>
        <h2 className="mt-2 text-5xl font-black text-zinc-50">生き残った。</h2>
        <p className="mt-2 text-lg text-zinc-400">You have keys. You have an address. Nobody said いいえ to you once.</p>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="XP" v={String(run.xp)} />
          <Stat label="Repairs" v={String(repairs)} />
          <Stat label="Strikes" v={`${run.strikes.length}/3`} />
          <Stat label="Wallet" v={`¥${run.wallet.toLocaleString()}`} />
        </div>

        <div className="mt-6 space-y-2 text-sm text-zinc-300">
          <p>Meiwaku finished at {run.meiwaku}. {run.meiwaku >= 40 ? "The neighbourhood knows your name, and not fondly." : "The neighbourhood barely noticed you. That's the goal."}</p>
          <p>{freezes === 0 ? "You never froze. Every time you didn't understand, you said so. That's the whole game." : `You froze ${freezes} time${freezes > 1 ? "s" : ""}. Next run, notice the moment before the freeze — that's where もう一度 goes.`}</p>
          <p>{lockedCount(meta)} phrases are 定着 — locked in. They'll show without furigana or gloss from now on. They're yours.</p>
        </div>

        {corrected && (
          <div className="mt-6 rounded-lg border border-amber-700/60 bg-amber-950/20 px-4 py-3 text-sm text-amber-100">
            <div className="text-[10px] uppercase tracking-widest text-amber-400">Secret ending</div>
            Tanaka corrected your Japanese instead of praising it. Nobody says 上手 to a resident. You stopped being a guest.
          </div>
        )}

        <button onClick={onHome} className="mt-8 self-start rounded-md bg-zinc-50 px-6 py-3 font-semibold text-zinc-950 hover:bg-white">
          Title
        </button>
      </div>
    </div>
  );
}

function Stat({ label, v }: { label: string; v: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
      <div className="text-xl font-bold text-zinc-100">{v}</div>
      <div className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</div>
    </div>
  );
}
