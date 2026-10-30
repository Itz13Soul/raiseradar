"use client";
import { useEffect, useSyncExternalStore } from "react";

const KEY = "analytics-consent";
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

function readChoice(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

const EVT = "analytics-consent-change";
let memoryChoice: string | null = null; // used when storage is blocked

function saveChoice(v: "yes" | "no" | null) {
  memoryChoice = v;
  try {
    if (v === null) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, v);
  } catch {
    /* storage blocked: the choice lasts for this page view only */
  }
  window.dispatchEvent(new Event(EVT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVT, cb);
    window.removeEventListener("storage", cb);
  };
}
const snapshot = () => readChoice() ?? memoryChoice;
const serverSnapshot = () => "ssr"; // never render the banner on the server

function loadGa(id: string, app: string) {
  if (typeof window.gtag === "function") return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", id, { anonymize_ip: true, app_name: app });
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(s);
}

// Loads Google Analytics only after the visitor clicks Accept. No GA script,
// cookie or request happens before that, or at all if they decline.
export default function ConsentAnalytics({ app }: { app: string }) {
  const choice = useSyncExternalStore(subscribe, snapshot, serverSnapshot);

  useEffect(() => {
    if (choice === "yes" && GA_ID) loadGa(GA_ID, app);
  }, [choice, app]);

  if (!GA_ID || choice !== null) return null;

  return (
    <div role="dialog" aria-live="polite" aria-label="Analytics consent" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-xl border border-white/15 bg-zinc-900/95 p-4 text-sm text-zinc-200 shadow-xl backdrop-blur">
      <p>
        Can this site use Google Analytics to count visits and which features are used? It sets cookies only if you accept. Nothing you type is sent to analytics.
      </p>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => { saveChoice("yes"); }} className="rounded-md bg-white px-3 py-1.5 font-semibold text-zinc-950 hover:bg-zinc-200">
          Accept
        </button>
        <button type="button" onClick={() => { saveChoice("no"); if (GA_ID) (window as unknown as Record<string, boolean>)[`ga-disable-${GA_ID}`] = true; }} className="rounded-md border border-white/20 px-3 py-1.5 hover:bg-white/10">
          Decline
        </button>
      </div>
    </div>
  );
}

export function AnalyticsSettingsButton() {
  return (
    <button
      type="button"
      onClick={() => saveChoice(null)}
      className="underline underline-offset-2 hover:text-zinc-300"
    >
      Analytics settings
    </button>
  );
}
