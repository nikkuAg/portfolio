"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import s from "./morph.module.css";

// The canvas only ever loads on the client, after the HTML below is on
// screen: the name and the line about me are real text from
// the first paint, readable with no JavaScript at all.
const MorphField = dynamic(() => import("./MorphField").then((m) => m.MorphField), {
  ssr: false,
});

/** True once the intro loader is out of the way, so the entrance is seen. */
function useEntrance() {
  const [go, setGo] = useState(false);
  useEffect(() => {
    const start = () => setGo(true);
    let raf = 0;
    // the loader already ran this session: play straight away
    if (sessionStorage.getItem("loader-done") === "1") raf = requestAnimationFrame(start);
    window.addEventListener("loader-done", start);
    // never leave the hero waiting if the loader is changed or removed
    const fallback = window.setTimeout(start, 6000);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("loader-done", start);
      window.clearTimeout(fallback);
    };
  }, []);
  return go;
}

export function MorphHero() {
  const go = useEntrance();
  return (
    <section id="top" className={s.hero} data-ready={go || undefined}>
      <div className={s.stage}>
        <MorphField go={go} />
      </div>
      <div className={s.content} data-hero-words>
        <h1 className={s.name} data-hero-name>
          <span className={s.line}>
            <span>Divyansh</span>
          </span>
          <span className={s.line}>
            <span>Agarwal</span>
          </span>
        </h1>
        <div className={s.side} data-hero-side>
          <p className={s.lede}>
            Full-stack engineer in Bangalore. I build interfaces, the services
            behind them, and small games on the side.
          </p>
        </div>
      </div>
    </section>
  );
}
