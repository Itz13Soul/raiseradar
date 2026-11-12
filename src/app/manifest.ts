import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RaiseRadar",
    short_name: "RaiseRadar",
    description: "Indian startup funding rounds turned into hiring signals.",
    start_url: "/",
    display: "standalone",
    background_color: "#050912",
    theme_color: "#050912",
  };
}
