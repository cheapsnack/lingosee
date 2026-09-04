# Lingosee

Lingosee is a browser-based, voice-first roguelike for practicing conversational Japanese. You play through a sequence of real-life scenarios in Japan, replying to NPCs by speaking (or typing) in Japanese. Three strikes—freezing, falling back to English, or failing the scene's objective—send you back to Day 1. Asking for repetition or clarification is explicitly rewarded, not penalized: that's the core design idea.

## How it plays

- Six scenarios are currently built: airport immigration, buying a train ticket, reading a platform announcement, catching the right bus, a timed convenience-store checkout, and negotiating with a real-estate agent.
- Each scenario gives you a short objective (e.g. “get stamped in,” “buy the cheapest ticket,” “catch the bus to Kichijoji before it leaves”) and a small set of phrases that will advance the conversation.
- Voice output reads NPC lines aloud with the browser's `speechSynthesis` API; voice input listens via `SpeechRecognition` on Chrome/Edge and falls back to tap-to-reply and typed input on other browsers.
- After each day a “Sensei” debrief explains what worked and what didn't, and a review deck tracks vocabulary mastery.
- Progress (vocabulary mastery, run history) is stored locally in `localStorage`.

## Tech stack

- React 19
- TanStack Start + TanStack Router
- Vite 8
- Tailwind CSS 4
- Radix UI / shadcn-style primitives
- TypeScript

There is no backend API and no LLM calls anywhere in the app. NPC dialogue, branching, and scoring are fully scripted and deterministic, driven by content objects in `src/data/scenarios.ts` and `src/data/phrases.ts`, and resolved by `src/engine/npc.ts`, `src/engine/scoring.ts`, and `src/engine/sensei.ts`. Voice and persistence live in `src/engine/speech.ts` and `src/engine/storage.ts`. An automated acceptance-test suite is in `src/engine/acceptance.ts`.

## Project structure

- `src/components/` — screens and UI (`Landing`, `Scene`, `Debrief`, `ReviewDeck`, `ResetScreen`, `WinScreen`, `HUD`), plus `components/ui/` for shared shadcn-style primitives.
- `src/engine/` — all game logic: NPC turn resolution, scoring, the Sensei debrief, speech, persisted storage, and the acceptance suite.
- `src/data/` — scenario and phrase content.
- `src/routes/` — TanStack Router route definitions.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

Other real scripts available:

```sh
npm run build    # production build
npm run lint     # ESLint + Prettier checks
npm run format   # Prettier formatting
npm run preview  # preview the production build
```

## Build with Lovable

This project was built with [Lovable](https://lovable.dev).

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Built with

- React 19
- TanStack Start + TanStack Router
- Vite 8
- Tailwind CSS 4
- Radix UI / shadcn-style components
- TypeScript
