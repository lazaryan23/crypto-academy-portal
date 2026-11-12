import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

export const alt = `${siteConfig.name} — ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
          background: "radial-gradient(circle at 85% 20%, #3b2a7a 0%, #0b1020 55%)",
          color: "#f1f5f9",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <svg width="88" height="88" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 16l2-6 6-2-2 6-6 2" />
            <circle cx="12" cy="12" r="9" />
            <path d="M12 3v2M12 19v2M3 12h2M19 12h2" />
          </svg>
          <div style={{ fontSize: 72, fontWeight: 800 }}>{siteConfig.name}</div>
        </div>
        <div style={{ marginTop: 40, fontSize: 56, fontWeight: 700, lineHeight: 1.15, display: "flex", flexWrap: "wrap" }}>
          <span>Track the crypto market.&nbsp;</span>
          <span style={{ color: "#22d3ee" }}>Learn to trade it safely.</span>
        </div>
        <div style={{ marginTop: 32, fontSize: 30, color: "#94a3b8" }}>Live prices · Futures academy · Long-term investing guide</div>
      </div>
    ),
    size,
  );
}
