import type { Metadata } from "next";
import { Geist, Geist_Mono, Bricolage_Grotesque } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import ConsentAnalytics, { AnalyticsSettingsButton } from "../components/ConsentAnalytics";
import Link from "next/link";
import Nav from "../components/Nav";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const display = Bricolage_Grotesque({ variable: "--font-display", subsets: ["latin"], weight: ["500", "600", "700"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RaiseRadar",
  description: "Indian funding rounds turned into hiring signals: likely roles, who to reach, and what to say.",
  authors: [{ name: "Divyansh Srivastava" }],
  creator: "Divyansh Srivastava",
  openGraph: { title: "RaiseRadar", type: "website", siteName: "RaiseRadar" },
  twitter: { card: "summary", title: "RaiseRadar" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col text-zinc-100">
        <a href="#main" className="skip-link">Skip to content</a>
        <Nav />
        <div id="main" tabIndex={-1} className="flex-1 outline-none">{children}</div>
        <footer className="mx-auto w-full max-w-6xl px-4 py-8 text-xs text-zinc-400">
          © 2026 Divyansh Srivastava. All rights reserved. Developed by Divyansh Srivastava.{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-zinc-300">Privacy</Link>{" · "}<AnalyticsSettingsButton />
        </footer>
        <Analytics />
        <ConsentAnalytics app="RaiseRadar" />
      </body>
    </html>
  );
}
