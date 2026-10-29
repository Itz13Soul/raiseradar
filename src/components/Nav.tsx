"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/deals", label: "Deals" },
  { href: "/insights", label: "Insights" },
  { href: "/brief", label: "Weekly brief" },
  { href: "/method", label: "Method" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#050912]/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-y-2 px-4 py-3">
        <Link href="/" className="font-display flex items-center gap-2.5 text-base font-semibold">
          <span className="relative flex h-3 w-3 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400/50 motion-reduce:animate-none" />
            <span className="relative inline-block h-2 w-2 rounded-full bg-cyan-300" />
          </span>
          RaiseRadar
        </Link>
        <nav aria-label="Primary" className="flex flex-wrap items-center gap-1 text-sm">
          {LINKS.map((l) => {
            const active = path === l.href || path.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-3 py-1.5 transition-colors ${active ? "bg-white/10 text-white" : "text-zinc-300 hover:bg-white/5 hover:text-white"}`}
              >
                {l.label}
              </Link>
            );
          })}
          <Link href="/deals" className="ml-2 rounded-full bg-cyan-300 px-4 py-1.5 font-semibold text-zinc-950 transition hover:bg-cyan-200">
            Browse deals
          </Link>
        </nav>
      </div>
    </header>
  );
}
