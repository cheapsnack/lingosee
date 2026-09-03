import { phraseLabel } from "../engine/sensei";
import type { SenseiReport } from "../types";

interface Props {
  report: SenseiReport;
  forgiven: boolean;
  onContinue: () => void;
}

export default function Debrief({ report, forgiven, onContinue }: Props) {
  const s = report.scores;
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-10">
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.4em] text-zinc-500">先生 · debrief · day {report.day}</div>
          <h2 className="mt-1 text-2xl font-bold text-zinc-50">{report.headline}</h2>
        </div>
        <div className="rounded border border-zinc-700 px-2 py-1 text-[10px] uppercase tracking-widest text-zinc-400">out of character</div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Score label="理解" sub="Comprehension" v={s.comprehension} />
        <Score label="修復" sub="Repair" v={s.repair} highlight />
        <Score label="敬語" sub="Register" v={s.register} />
        <Score label="速さ" sub="Speed" v={s.speed} />
      </div>

      {forgiven && (
        <div className="mt-4 rounded-lg border border-emerald-900 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">
          Zero support taps this day. One strike refunded.
        </div>
      )}

      {report.notes.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">What happened</div>
          <ul className="space-y-2">
            {report.notes.map((n, i) => (
              <li key={i} className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm leading-relaxed text-zinc-200">
                {n}
              </li>
            ))}
          </ul>
        </div>
      )}

      {report.reveals.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">What they said · what they meant</div>
          <div className="divide-y divide-zinc-800 overflow-hidden rounded-lg border border-zinc-800">
            {report.reveals.map((r, i) => (
              <div key={i} className="grid grid-cols-1 gap-1 bg-zinc-900/40 px-4 py-3 sm:grid-cols-2 sm:gap-4">
                <div className="text-zinc-100">「{r.said}」</div>
                <div className="text-sm italic text-amber-200/90">{r.meant}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {report.phrasesCleared.length > 0 && (
        <div className="mt-6 text-sm text-zinc-400">
          <span className="text-[10px] uppercase tracking-widest text-zinc-500">Phrases used successfully · </span>
          {report.phrasesCleared.map(phraseLabel).join(" · ")}
        </div>
      )}

      <button onClick={onContinue} className="mt-8 self-start rounded-md bg-zinc-50 px-6 py-3 font-semibold text-zinc-950 hover:bg-white">
        60-second review →
      </button>
    </div>
  );
}

function Score({ label, sub, v, highlight }: { label: string; sub: string; v: number; highlight?: boolean }) {
  const color = v >= 70 ? "text-emerald-400" : v >= 40 ? "text-amber-400" : "text-red-400";
  return (
    <div className={`rounded-lg border p-3 ${highlight ? "border-sky-900 bg-sky-950/20" : "border-zinc-800 bg-zinc-900/50"}`}>
      <div className="flex items-baseline justify-between">
        <span className="text-lg font-bold text-zinc-100">{label}</span>
        <span className={`font-mono text-xl ${color}`}>{v}</span>
      </div>
      <div className="text-[10px] uppercase tracking-widest text-zinc-500">{sub}</div>
      <div className="mt-2 h-1 w-full rounded-full bg-zinc-800">
        <div className={`h-full rounded-full ${v >= 70 ? "bg-emerald-400" : v >= 40 ? "bg-amber-400" : "bg-red-400"}`} style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}
