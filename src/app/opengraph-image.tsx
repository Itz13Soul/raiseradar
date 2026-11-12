import { ImageResponse } from "next/og";

export const alt = "RaiseRadar: Indian startup funding rounds turned into hiring signals";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "linear-gradient(135deg,#050912 0%,#0b1d33 60%,#0e3a4a 100%)", color: "#e6edf7" }}>
        <div style={{ display: "flex", alignItems: "center", fontSize: 36, fontWeight: 700 }}>
          <div style={{ width: 22, height: 22, borderRadius: 11, background: "#67e8f9", marginRight: 16 }} />
          RaiseRadar
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.1 }}>Funding news tells you who raised. This tells you who will hire.</div>
          <div style={{ marginTop: 28, fontSize: 30, color: "#9fb3c8" }}>Indian startup funding rounds, turned into likely roles and a note to send.</div>
        </div>
      </div>
    ),
    size,
  );
}
