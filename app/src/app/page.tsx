"use client";

// This whole page is one client-only, localStorage-persisted (zustand
// `persist`) interactive tool — there is nothing to server-render here that
// a returning visitor's persisted state wouldn't immediately diverge from
// anyway. Server-rendering it produced a hydration mismatch the moment any
// persisted field (asOf, scenarios, tasks...) differed from the hardcoded
// defaults, which is true for every single visit after the first. Disabling
// SSR for this component removes that whole category of mismatch instead of
// patching each individual differing field as it's found.
import dynamic from "next/dynamic";

const FlatGantt = dynamic(() => import("@/components/FlatGantt/FlatGantt").then((m) => m.FlatGantt), {
  ssr: false,
});

export default function Page() {
  return <FlatGantt />;
}
