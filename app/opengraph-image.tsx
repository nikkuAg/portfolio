import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { SITE_URL } from "@/lib/site";

export const alt =
  "Divyansh Agarwal · Full-stack engineer. Interfaces, services, and the wires between them.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The share card: DA mark top-left, the handwritten signature as the hero
// (raster export from the design handoff — OG renderers can't load the
// webfont), tagline + domain in the chrome. Same black/phosphor system as
// the site, dot grain included.
export default async function OG() {
  const [sig, mark] = await Promise.all([
    readFile(join(process.cwd(), "public/signature-full.png")),
    readFile(join(process.cwd(), "public/da-512.png")),
  ]);
  const sigSrc = `data:image/png;base64,${sig.toString("base64")}`;
  const markSrc = `data:image/png;base64,${mark.toString("base64")}`;
  const domain = SITE_URL.replace(/^https?:\/\//, "");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          // matches the signature PNG's baked background exactly (#0b0b0b,
          // measured), so the raster sits invisibly on the card
          background: "#0b0b0b",
          padding: 56,
          fontFamily: "monospace",
        }}
      >
        {/* header row — mark + status */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          { }
          <img src={markSrc} width={84} height={84} alt="" />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              color: "#c8ff3d",
              fontSize: 22,
              letterSpacing: 6,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                background: "#c8ff3d",
              }}
            />
            INBOX OPEN
          </div>
        </div>

        {/* signature hero */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          { }
          <img src={sigSrc} width={800} alt="" />
        </div>

        {/* footer row — role + domain */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            color: "#9c9c9c",
            fontSize: 24,
            letterSpacing: 5,
          }}
        >
          <div style={{ display: "flex" }}>FULL-STACK ENGINEER</div>
          <div style={{ display: "flex", color: "#c8ff3d" }}>{domain}</div>
        </div>

        {/* corner ticks */}
        {(
          [
            { top: 20, left: 20, bt: 2, bl: 2 },
            { top: 20, right: 20, bt: 2, br: 2 },
            { bottom: 20, left: 20, bb: 2, bl: 2 },
            { bottom: 20, right: 20, bb: 2, br: 2 },
          ] as const
        ).map((c, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: 22,
              height: 22,
              borderColor: "rgba(200,255,61,0.45)",
              borderStyle: "solid",
              borderTopWidth: "bt" in c ? 2 : 0,
              borderBottomWidth: "bb" in c ? 2 : 0,
              borderLeftWidth: "bl" in c ? 2 : 0,
              borderRightWidth: "br" in c ? 2 : 0,
              ...("top" in c ? { top: c.top } : {}),
              ...("bottom" in c ? { bottom: c.bottom } : {}),
              ...("left" in c ? { left: c.left } : {}),
              ...("right" in c ? { right: c.right } : {}),
            }}
          />
        ))}
      </div>
    ),
    { ...size },
  );
}
