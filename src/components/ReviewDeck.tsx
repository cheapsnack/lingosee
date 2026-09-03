import { useEffect, useState } from "react";
import { PHRASES, type Phrase } from "../data/phrases";
import { leitnerGet } from "../engine/storage";
import type { MetaState } from "../types";

interface Props {
  meta: MetaState;
  cleared: string[]; // phrase ids used successfully today
  onResult: (phraseId: string, ok: boolean) => void;
  onDone: () => void;
}

interface Card {
  phrase: Phrase;
  choices: Phrase[];
}

const DECK_SECONDS = 60;

export default function ReviewDeck({ meta, cleared, onResult, onDone }: Props) {
  // Built once on mount — meta changes during the deck must not reshuffle it.
  const [cards] = useState<Card[]>(() => {
    const all = Object.values(PHRASES);
    const due = Object.entries(meta.leitner)
      .filter(([id, e]) => !e.locked && e.box <= 3 && !cleared.includes(id) && PHRASES[id])
      .sort((a, b) => a[1].box - b[1].box)
      .map(([id]) => id);
    const ids = Array.from(new Set([...cleared, ...due])).slice(0, 8);
    return ids.map((id) => {
      const phrase = PHRASES[id];
      const distractors = all.filter((p) => p.id !== id).sort(() => Math.random() - 0.5).slice(0, 2);
      return { phrase, choices: [phrase, ...distractors].sort(() => Math.random() - 0.5) };
    });
  });

  const [idx, setIdx] = useState(0);
  const [left, setLeft] = useState(DECK_SECONDS);
  const [flash, setFlash] = useState<"ok" | "bad" | null>(null);
  const [results, setResults] = useState<{ id: string; ok: boolean }[]>([]);

  useEffect(() => {
    if (cards.length === 0) return;
    const id = setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(id);
  }, [cards.length]);

  const finished = idx >= cards.length || left <= 0 || cards.length === 0;

  const answer = (choice: Phrase) => {
    if (flash) return;
    const card = cards[idx];
    const ok = choice.id === card.phrase.id;
    onResult(card.phrase.id, ok);
    setResults((r) => [...r, { id: card.phrase.id, ok }]);
    setFlash(ok ? "ok" : "bad");
    setTimeout(() => {
      setFlash(null);
      setIdx((i) => i + 1);
    }, ok ? 450 : 1100);
  };

  if (finished) {
    const okCount = results.filter((r) => r.ok).length;
    return (
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-10">
        <div className="text-[11px] uppercase tracking-[0.4em] text-zinc-500">復習 · review</div>
        <h2 className="mt-2 text-3xl font-bold text-zinc-50">
          {cards.length === 0 ? "Nothing to review yet." : `${okCount} / ${results.length}`}
        </h2>
        {results.length > 0 && (
          <ul className="mt-6 space-y-1 text-sm">
            {results.map((r, i) => {
              const e = leitnerGet(meta, r.id);
              return (
                <li key={i} className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-900/40 px-3 py-2">
                  <span className={r.ok ? "text-zinc-200" : "text-red-300"}>{PHRASES[r.id].japanese}</span>
                  <span className="font-mono text-xs text-zinc-500">
                    box {e.box}/5 {e.locked && <span className="text-emerald-500">· 定着</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <button onClick={onDone} className="mt-8 self-start rounded-md bg-zinc-50 px-6 py-3 font-semibold text-zinc-950 hover:bg-white">
          Next day →
        </button>
      </div>
    );
  }

  const card = cards[idx];
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-10">
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span className="uppercase tracking-[0.3em]">復習 · {idx + 1}/{cards.length}</span>
        <span className={`font-mono text-lg ${left <= 10 ? "text-red-400" : "text-zinc-300"}`}>{left}s</span>
      </div>
      <div className="mt-2 h-1 w-full rounded-full bg-zinc-800">
        <div className="h-full rounded-full bg-zinc-300 transition-[width] duration-1000" style={{ width: `${(left / DECK_SECONDS) * 100}%` }} />
      </div>

      <div className={`mt-12 rounded-2xl border p-8 text-center transition ${flash === "ok" ? "border-emerald-600 bg-emerald-950/30" : flash === "bad" ? "border-red-600 bg-red-950/30" : "border-zinc-800 bg-zinc-900/50"}`}>
        <div className="text-[10px] uppercase tracking-widest text-zinc-500">How do you say</div>
        <div className="mt-2 text-2xl font-semibold text-zinc-50">{card.phrase.english}</div>
        {flash === "bad" && <div className="mt-3 text-sm text-red-300">→ {card.phrase.japanese} · dropped a box</div>}
      </div>

      <div className="mt-6 grid gap-2">
        {card.choices.map((c) => (
          <button key={c.id} onClick={() => answer(c)} className="rounded-lg border border-zinc-700 bg-zinc-900/70 px-4 py-3 text-left text-lg text-zinc-50 transition hover:border-zinc-400 hover:bg-zinc-800">
            {c.japanese}
            {!leitnerGet(meta, c.id).locked && <span className="ml-3 text-xs text-zinc-500">{c.furigana}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
