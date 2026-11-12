import type { Metadata } from "next";
import AuthGate from "../../components/AuthGate";
import MyTabs from "../../components/MyTabs";

export const metadata: Metadata = {
  title: "My radar",
  robots: { index: false, follow: false },
};

export default function MyLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-10">
      <AuthGate>
        <MyTabs />
        {children}
      </AuthGate>
    </main>
  );
}
