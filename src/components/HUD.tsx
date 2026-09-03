import { levelFor } from "../engine/scoring";
import type { Strike } from "../types";

interface Props {
  day: number;
  locationJa: string;
  location: string;
  wallet: number;
  meiwaku: number;
  xp: number;
  strikes: Strike[];
  drained?: boolean;
}

export default function HUD({ day, locationJa, location, wallet, meiwaku, xp, strikes, drained }: Props) {
  const lv = levelFor(xp);
  const walletV = drained ? 0 : wallet;
  const meiV = drained ? 0 : meiwaku;
  const xpV = drained ? 0 : lv.progress;
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3 text-xs sm:text-sm">
      {/* left: wallet + meiwaku */}
      <div className="space-y-2">
        <div className="flex items-baseline gap-2">
          <span className="text-zinc-500">¥</span>
          <span className={`font-mono text-lg tabular-nums transition-all duration-[1500ms] ${walletV < 5000 ? "text-red-400" : "text-zinc-100"}`}>
            {walletV.toLocaleString()}
          </span>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-widest text-zinc-500">
            <span>迷惑 meiwaku</span>
            <span className="font-mono">{meiV}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-red-500 transition-all duration-[1500ms]" style={{ width: `${Math.min(100, meiV)}%` }} />
          </div>
        </div>
      </div>

      {/* centre: day / location */}
      <div className="text-center">
        <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">Day {day}</div>
        <div className="text-xl font-semibold leading-tight text-zinc-100">{locationJa}</div>
        <div className="text-[11px] text-zinc-500">{location}</div>
      </div>

      {/* right: strikes + xp */}
      <div className="space-y-2 text-right">
        <div className="flex justify-end gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`inline-flex h-6 w-6 items-center justify-center rounded border text-base font-black leading-none ${
                i < strikes.length && !drained ? "border-red-500 bg-red-500/20 text-red-400" : "border-zinc-800 text-zinc-800"
              }`}
            >
              ×
            </span>
          ))}
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-widest text-zinc-500">
            <span>日本語 Lv{drained ? 1 : lv.level}</span>
            <span className="font-mono">{drained ? 0 : xp} xp</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-[1500ms]" style={{ width: `${Math.round(xpV * 100)}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
