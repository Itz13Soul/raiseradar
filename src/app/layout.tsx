import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Nav from "../components/Nav";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RaiseRadar",
  description: "Indian funding rounds turned into hiring signals: likely roles, who to reach, and what to say.",
  authors: [{ name: "Divyansh Srivastava" }],
  creator: "Divyansh Srivastava",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col text-zinc-100">
        <Nav />
        {children}
        <footer className="mx-auto w-full max-w-5xl px-4 py-8 text-xs text-zinc-500">
          © 2026 Divyansh Srivastava. All rights reserved. Developed by Divyansh Srivastava.
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
