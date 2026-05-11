import { ImageResponse } from "next/og";

export const alt =
  "Divyansh Agarwal — Full-stack engineer. Interfaces, services, and the wires between them.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#0a0a0a",
          color: "#f5f5f5",
          fontFamily: "monospace",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 18,
            color: "#9c9c9c",
            letterSpacing: 4,
          }}
        >
          <span>DIVYANSH AGARWAL</span>
          <span>PORTFOLIO · 2026</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span
            style={{
              fontSize: 88,
              lineHeight: 1.05,
              color: "#f5f5f5",
              fontFamily: "Georgia, serif",
              fontStyle: "italic",
              maxWidth: 1000,
            }}
          >
            Interfaces, services,
          </span>
          <span
            style={{
              fontSize: 88,
              lineHeight: 1.05,
              color: "#c8ff3d",
              fontFamily: "Georgia, serif",
              fontStyle: "italic",
              maxWidth: 1000,
            }}
          >
            and the wires between them.
          </span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 16,
            color: "#9c9c9c",
            letterSpacing: 3,
          }}
        >
          <span>FULL-STACK ENGINEER</span>
          <span>github.com/nikkuAg</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
