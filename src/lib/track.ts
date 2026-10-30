// Google Analytics 4 events. Sends nothing unless the visitor accepted analytics
// (ConsentAnalytics loads gtag only after consent).
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export type EventParams = Record<string, string | number | boolean | undefined>;

export function track(name: string, params: EventParams = {}) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", name, params);
}
