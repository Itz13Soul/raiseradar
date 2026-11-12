"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/my", label: "Matches" },
  { href: "/my/pipeline", label: "Pipeline" },
  { href: "/my/settings", label: "Alerts and account" },
];

export default function MyTabs() {
  const path = usePathname();
  return (
    <nav aria-label="My radar" className="mb-6 flex gap-1 border-b border-white/10 pb-2 text-sm">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} aria-current={path === t.href ? "page" : undefined} className={`rounded-full px-3 py-1.5 ${path === t.href ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"}`}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
