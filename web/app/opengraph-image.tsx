import { ImageResponse } from "next/og";

export const alt = "City-Maps — Bucharest neighbourhood livability";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Same hexagon + pin motif and gradient as app/icon.svg — keep them in sync.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#09090b",
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      >
        <svg width="200" height="200" viewBox="0 0 32 32" style={{ marginBottom: 28 }}>
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
          </defs>
          <polygon
            points="30,16 23,28.12 9,28.12 2,16 9,3.88 23,3.88"
            fill="url(#g)"
            stroke="#052e16"
            strokeOpacity={0.35}
            strokeWidth={1}
          />
          <path
            transform="translate(4,4)"
            d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
            fill="#ffffff"
          />
        </svg>
        <div style={{ display: "flex", fontSize: 76, fontWeight: 700, color: "#fafafa" }}>City-Maps</div>
        <div style={{ display: "flex", fontSize: 34, color: "#a1a1aa", marginTop: 14 }}>
          Bucharest neighbourhood livability
        </div>
      </div>
    ),
    { ...size },
  );
}
