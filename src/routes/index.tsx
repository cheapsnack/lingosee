import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const App = lazy(() => import("../App"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "東京サバイバル — Tokyo Survival" },
      {
        name: "description",
        content:
          "A deterministic Japanese-language survival roguelike: three strikes, five days in Tokyo, and a sensei who reads your whole transcript.",
      },
      { property: "og:title", content: "東京サバイバル — Tokyo Survival" },
      {
        property: "og:description",
        content:
          "Survive five days in Tokyo using Japanese only. Meiwaku meter, three strikes, spaced-repetition review deck.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <ClientOnly fallback={<div className="min-h-screen bg-zinc-950" />}>
      <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
        <App />
      </Suspense>
    </ClientOnly>
  );
}
