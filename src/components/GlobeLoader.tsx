"use client";

import dynamic from "next/dynamic";

const RadarGlobe = dynamic(() => import("./RadarGlobe"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-full bg-cyan-500/5" />,
});

export default function GlobeLoader({ cities }: { cities: string[] }) {
  return <RadarGlobe cities={cities} />;
}
