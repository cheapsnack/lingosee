export interface BrowserSupport {
  tts: boolean;
  jaVoice: boolean;
  stt: boolean;
  label: string;
}

type SR = typeof window extends { SpeechRecognition: infer T } ? T : any;

function getSR(): SR | null {
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function checkSupport(): BrowserSupport {
  const tts = typeof window !== "undefined" && "speechSynthesis" in window;
  const stt = !!getSR();
  const voices = tts ? window.speechSynthesis.getVoices() : [];
  const jaVoice = voices.some((v) => v.lang.toLowerCase().startsWith("ja"));
  const label = !tts
    ? "No speech synthesis — NPC lines will be text-only."
    : !stt
    ? "NPC speech works. Mic input isn't supported here (Chrome/Edge recommended). Tap-to-reply is fully available."
    : "Full support: NPC speech and mic input.";
  return { tts, jaVoice, stt, label };
}

let currentUtterance: SpeechSynthesisUtterance | null = null;

export function speak(text: string, rate = 1, onEnd?: () => void): () => void {
  if (!("speechSynthesis" in window)) {
    const t = setTimeout(() => onEnd?.(), Math.min(4000, 600 + text.length * 120 / rate));
    return () => clearTimeout(t);
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/[（(].*?[)）]/g, ""));
  u.lang = "ja-JP";
  u.rate = rate;
  const voices = window.speechSynthesis.getVoices();
  const ja = voices.find((v) => v.lang.toLowerCase().startsWith("ja"));
  if (ja) u.voice = ja;
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    onEnd?.();
  };
  u.onend = finish;
  u.onerror = finish;
  currentUtterance = u;
  window.speechSynthesis.speak(u);
  // Safety: some browsers never fire onend
  const guard = setTimeout(finish, 1500 + (text.length * 220) / rate);
  return () => {
    clearTimeout(guard);
    done = true; // cancelled: do not fire onEnd
    if (currentUtterance === u) window.speechSynthesis.cancel();
  };
}

export function stopSpeaking() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

export function listen(onResult: (text: string) => void, onEnd: () => void): (() => void) | null {
  const SRC = getSR();
  if (!SRC) return null;
  const r = new SRC();
  r.lang = "ja-JP";
  r.interimResults = false;
  r.maxAlternatives = 1;
  r.onresult = (e: any) => {
    const t = e.results?.[0]?.[0]?.transcript ?? "";
    onResult(t);
  };
  r.onend = onEnd;
  r.onerror = onEnd;
  try {
    r.start();
  } catch {
    onEnd();
    return null;
  }
  return () => {
    try { r.stop(); } catch { /* noop */ }
  };
}
