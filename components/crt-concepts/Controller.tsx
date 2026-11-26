"use client";

import { useEffect, useRef, useState } from "react";
import { RESUME_URL } from "@/lib/site";
import { smoothScrollTo } from "@/lib/scroll";
import s from "./more.module.css";

// Concept AG: the controller. The hero is a console-style home screen and
// the controller under it drives it: left/right moves along the row, the
// bottom face button opens the tile. It works with the arrow keys, by
// clicking the pad, and with a real gamepad through the Gamepad API (plug
// one in and it just works). Until someone takes over, it pages through
// the tiles by itself.

type Tile = { id: string; title: string; sub: string; color: string; go: () => void };

const TILES: Tile[] = [
  { id: "about", title: "About", sub: "Who I am", color: "#c8ff3d", go: () => smoothScrollTo("#about") },
  { id: "projects", title: "Projects", sub: "Things I've built", color: "#4aa8ff", go: () => smoothScrollTo("#projects") },
  { id: "experience", title: "Experience", sub: "Where I've worked", color: "#ffad42", go: () => smoothScrollTo("#experience") },
  { id: "contact", title: "Contact", sub: "Say hi", color: "#ff7ab6", go: () => smoothScrollTo("#contact") },
  { id: "resume", title: "Résumé", sub: "Opens the PDF", color: "#f3efe6", go: () => window.open(RESUME_URL, "_blank", "noopener") },
];

export function Controller() {
  const [cur, setCur] = useState(0);
  const [pressed, setPressed] = useState<string | null>(null);
  const [pad, setPad] = useState<string | null>(null);
  const touched = useRef(false);
  const curRef = useRef(0);

  const flash = (b: string) => {
    setPressed(b);
    window.setTimeout(() => setPressed((p) => (p === b ? null : p)), 170);
  };
  const move = (d: number, byYou = true) => {
    if (byYou) touched.current = true;
    curRef.current = (curRef.current + d + TILES.length) % TILES.length;
    setCur(curRef.current);
    flash(d > 0 ? "right" : "left");
  };
  const select = () => {
    touched.current = true;
    flash("a");
    window.setTimeout(() => TILES[curRef.current].go(), 180);
  };

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const auto = window.setInterval(() => {
      if (!touched.current && !reduce) move(1, false);
    }, 2400);
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,textarea,select")) return;
      if (window.scrollY > window.innerHeight * 0.5) return;
      if (e.key === "ArrowRight" || e.key === "d") move(1);
      else if (e.key === "ArrowLeft" || e.key === "a") move(-1);
      else if ((e.key === "Enter" || e.key === " ") && !(e.target as HTMLElement).closest("a,button")) select();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);

    // a real gamepad: poll it each frame, with edge detection so a held
    // stick doesn't scroll forever
    let raf = 0;
    let prev = { l: false, r: false, a: false };
    const onConnect = (e: GamepadEvent) => setPad(e.gamepad.id.split("(")[0].trim() || "Controller");
    const onDisconnect = () => setPad(null);
    const poll = () => {
      raf = requestAnimationFrame(poll);
      const gp = navigator.getGamepads?.().find((g) => g);
      if (!gp) return;
      const x = gp.axes[0] ?? 0;
      const l = x < -0.5 || !!gp.buttons[14]?.pressed;
      const r = x > 0.5 || !!gp.buttons[15]?.pressed;
      const a = !!gp.buttons[0]?.pressed;
      if (l && !prev.l) move(-1);
      if (r && !prev.r) move(1);
      if (a && !prev.a) select();
      prev = { l, r, a };
    };
    raf = requestAnimationFrame(poll);
    window.addEventListener("gamepadconnected", onConnect);
    window.addEventListener("gamepaddisconnected", onDisconnect);
    return () => {
      window.clearInterval(auto);
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("gamepadconnected", onConnect);
      window.removeEventListener("gamepaddisconnected", onDisconnect);
    };
    // move()/select() only touch refs and setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const t = TILES[cur];

  return (
    <div className={s.console} style={{ ["--tc" as string]: t.color }}>
      <div className={s.tiles} role="listbox" aria-label="Where to?" aria-activedescendant={`tile-${t.id}`}>
        {TILES.map((tile, i) => (
          <button
            key={tile.id}
            id={`tile-${tile.id}`}
            type="button"
            role="option"
            aria-selected={i === cur}
            className={s.tile}
            style={{ ["--c" as string]: tile.color }}
            onClick={() => {
              touched.current = true;
              curRef.current = i;
              setCur(i);
              if (i === cur) select();
            }}
          >
            <span className={s.tileTitle}>{tile.title}</span>
            <span className={s.tileSub}>{tile.sub}</span>
          </button>
        ))}
      </div>
      <p className={s.consoleHint}>
        {pad ? `${pad} connected. Use the stick and the bottom button.` : "Arrow keys, the pad below, or plug in a real controller."}
      </p>
      <svg className={s.pad} viewBox="0 0 360 170" role="group" aria-label="Controller">
        <path className={s.padBody} d="M80 18h200c34 0 56 24 66 66 10 44 4 80-24 80-20 0-30-16-44-38-6-10-12-14-24-14H106c-12 0-18 4-24 14-14 22-24 38-44 38-28 0-34-36-24-80 10-42 32-66 66-66Z" />
        {/* d-pad */}
        <g className={s.dpad}>
          <rect x="84" y="50" width="22" height="64" rx="5" />
          <rect x="63" y="71" width="64" height="22" rx="5" />
          <rect className={s.hit} data-on={pressed === "left" || undefined} x="63" y="71" width="22" height="22" rx="5" onClick={() => move(-1)} />
          <rect className={s.hit} data-on={pressed === "right" || undefined} x="105" y="71" width="22" height="22" rx="5" onClick={() => move(1)} />
        </g>
        {/* face buttons */}
        <g className={s.face4}>
          <circle cx="272" cy="56" r="12" />
          <circle cx="250" cy="78" r="12" />
          <circle cx="294" cy="78" r="12" />
          <circle className={s.hitA} data-on={pressed === "a" || undefined} cx="272" cy="100" r="13" onClick={select} />
        </g>
        {/* sticks */}
        <circle className={s.stick} cx="136" cy="122" r="17" />
        <circle className={s.stick} cx="224" cy="122" r="17" />
        <circle className={s.light} cx="180" cy="36" r="4" />
      </svg>
    </div>
  );
}
