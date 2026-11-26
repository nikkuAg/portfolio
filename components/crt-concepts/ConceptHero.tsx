"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { ConceptSwitcher, HeroCopy, TVControls, type Variant } from "./HeroChrome";
import { ecoControl, fearParams, sigParams, terrainParams } from "./fear-params";
import { tv } from "./tv-store";
import s from "./concepts.module.css";

// canvases only ever load on the client, after the HTML copy is on screen
const BroadcastScene = dynamic(() => import("./BroadcastScene").then((m) => m.BroadcastScene), {
  ssr: false,
});
const RoomScene = dynamic(() => import("./RoomScene").then((m) => m.RoomScene), {
  ssr: false,
});
const FearField = dynamic(() => import("./FearField").then((m) => m.FearField), {
  ssr: false,
});
const Artillery = dynamic(() => import("./Artillery").then((m) => m.Artillery), {
  ssr: false,
});
const Signature = dynamic(() => import("./Signature").then((m) => m.Signature), {
  ssr: false,
});
const Terrain = dynamic(() => import("./Terrain").then((m) => m.Terrain), {
  ssr: false,
});
const Level = dynamic(() => import("./Level").then((m) => m.Level), {
  ssr: false,
});
const WorkMap = dynamic(() => import("./WorkMap").then((m) => m.WorkMap), {
  ssr: false,
});
const VisitTrace = dynamic(() => import("./VisitTrace").then((m) => m.VisitTrace), {
  ssr: false,
});
const Ecosystem = dynamic(() => import("./Ecosystem").then((m) => m.Ecosystem), {
  ssr: false,
});
const BangaloreSky = dynamic(() => import("./BangaloreSky").then((m) => m.BangaloreSky), {
  ssr: false,
});
const Playground = dynamic(() => import("./Playground").then((m) => m.Playground), {
  ssr: false,
});
const FlowField = dynamic(() => import("./FlowField").then((m) => m.FlowField), {
  ssr: false,
});
const MorphField = dynamic(() => import("./MorphField").then((m) => m.MorphField), {
  ssr: false,
});
const TinyWorld = dynamic(() => import("./TinyWorld").then((m) => m.TinyWorld), {
  ssr: false,
});
const Garage = dynamic(() => import("./Garage").then((m) => m.Garage), {
  ssr: false,
});
const Sequencer = dynamic(() => import("./Sequencer").then((m) => m.Sequencer), {
  ssr: false,
});
const Controller = dynamic(() => import("./Controller").then((m) => m.Controller), {
  ssr: false,
});
const YourMove = dynamic(() => import("./YourMove").then((m) => m.YourMove), {
  ssr: false,
});
const PanToss = dynamic(() => import("./PanToss").then((m) => m.PanToss), {
  ssr: false,
});
const TheBooth = dynamic(() => import("./TheBooth").then((m) => m.TheBooth), {
  ssr: false,
});
const RaceMe = dynamic(() => import("./RaceMe").then((m) => m.RaceMe), {
  ssr: false,
});
const AskMe = dynamic(() => import("./AskMe").then((m) => m.AskMe), {
  ssr: false,
});
const TheCanvas = dynamic(() => import("./TheCanvas").then((m) => m.TheCanvas), {
  ssr: false,
});
const PlayerSelect = dynamic(() => import("./PlayerSelect").then((m) => m.PlayerSelect), {
  ssr: false,
});
const SideAB = dynamic(() => import("./SideAB").then((m) => m.SideAB), {
  ssr: false,
});
const LightsOut = dynamic(() => import("./LightsOut").then((m) => m.LightsOut), {
  ssr: false,
});
const TheMix = dynamic(() => import("./TheMix").then((m) => m.TheMix), {
  ssr: false,
});
const TypeMosaic = dynamic(() => import("./TypeMosaic").then((m) => m.TypeMosaic), {
  ssr: false,
});
const Harmonograph = dynamic(() => import("./Harmonograph").then((m) => m.Harmonograph), {
  ssr: false,
});
const Sparkler = dynamic(() => import("./Sparkler").then((m) => m.Sparkler), {
  ssr: false,
});
const ShatteredGlass = dynamic(() => import("./ShatteredGlass").then((m) => m.ShatteredGlass), {
  ssr: false,
});
const IronFilings = dynamic(() => import("./IronFilings").then((m) => m.IronFilings), {
  ssr: false,
});
const StringArt = dynamic(() => import("./StringArt").then((m) => m.StringArt), {
  ssr: false,
});
const FallingSand = dynamic(() => import("./FallingSand").then((m) => m.FallingSand), {
  ssr: false,
});
const InkWash = dynamic(() => import("./InkWash").then((m) => m.InkWash), {
  ssr: false,
});

export function ConceptHero({ variant }: { variant: Variant }) {
  const hero = useRef<HTMLElement>(null);

  // preview links: ?ch=3 opens the set on a channel, ?p=0.6 parks the room
  // concept part-way through its fly-in
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const ch = Number(q.get("ch"));
    if (ch >= 1) tv.tune(ch - 1);
    const p = Number(q.get("p"));
    const el = hero.current;
    if (p > 0 && el) {
      const span = el.offsetHeight - window.innerHeight;
      window.scrollTo(0, el.offsetTop + span * Math.min(1, p));
    }
  }, []);

  const isTV = variant === "broadcast" || variant === "room";

  return (
    <>
      <section id="top" ref={hero} className={s.hero} data-variant={variant}>
        <div className={s.pin}>
          <div className={s.stage}>
            {variant === "broadcast" && <BroadcastScene heroRef={hero} />}
            {variant === "room" && <RoomScene heroRef={hero} />}
            {variant === "fear" && <FearField />}
            {variant === "artillery" && <Artillery />}
            {variant === "signature" && <Signature />}
            {variant === "terrain" && <Terrain />}
            {variant === "level" && <Level />}
            {variant === "workmap" && <WorkMap />}
            {variant === "trace" && <VisitTrace />}
            {variant === "eco" && <Ecosystem />}
            {variant === "sky" && <BangaloreSky />}
            {variant === "playground" && <Playground />}
            {variant === "flow" && <FlowField />}
            {variant === "morph" && <MorphField />}
            {variant === "world" && <TinyWorld />}
            {variant === "garage" && <Garage />}
            {variant === "seq" && <Sequencer />}
            {variant === "controller" && <Controller />}
            {variant === "move" && <YourMove />}
            {variant === "pan" && <PanToss />}
            {variant === "booth" && <TheBooth />}
            {variant === "race" && <RaceMe />}
            {variant === "ask" && <AskMe />}
            {variant === "canvas" && <TheCanvas />}
            {variant === "select" && <PlayerSelect />}
            {variant === "record" && <SideAB />}
            {variant === "lights" && <LightsOut />}
            {variant === "mix" && <TheMix />}
            {variant === "mosaic" && <TypeMosaic />}
            {variant === "harmono" && <Harmonograph />}
            {variant === "sparkler" && <Sparkler />}
            {variant === "glass" && <ShatteredGlass />}
            {variant === "filings" && <IronFilings />}
            {variant === "strings" && <StringArt />}
            {variant === "sand" && <FallingSand />}
            {variant === "ink" && <InkWash />}
          </div>
          {variant === "workmap" && (
            <HeroCopy placement="side">
              <p className={s.hint} data-show>
                Every hill is something I built, and the tallest is the one
                most people used. Point at a peak to see it; click to open it.
              </p>
            </HeroCopy>
          )}
          {variant === "trace" && <HeroCopy placement="side" />}
          {variant === "eco" && <EcoCopy />}
          {variant === "sky" && <HeroCopy />}
          {variant === "playground" && (
            <HeroCopy placement="side">
              <p className={s.hint} data-show>
                A few controls I built by hand, for the feel of them. Flip the
                sky, press the button, turn the dial, fling the slider.
              </p>
            </HeroCopy>
          )}
          {variant === "flow" && <HeroCopy placement="side" />}
          {variant === "morph" && (
            <HeroCopy placement="side">
              <p className={s.hint} data-show>
                The ink keeps drawing who I am. Move through it and it scatters.
              </p>
            </HeroCopy>
          )}
          {(variant === "lights" || variant === "ask") && <HeroCopy placement="side" />}
          {variant in HINTS && (
            <HeroCopy placement="side">
              <p className={s.hint} data-show>
                {HINTS[variant]}
              </p>
            </HeroCopy>
          )}
          {variant === "signature" && <SignatureCopy />}
          {variant === "terrain" && <TerrainCopy />}
          {variant === "level" && (
            <HeroCopy nameHidden>
              <p className={s.hint} data-show>
                The name is the level. Click or tap anywhere above the ground
                to send the runner there, or play with the arrow keys and
                space. Left alone, it plays itself.
              </p>
            </HeroCopy>
          )}
          {isTV && (
            <HeroCopy>
              <TVControls />
            </HeroCopy>
          )}
          {variant === "fear" && <FearCopy />}
          {variant === "artillery" && (
            <HeroCopy placement="top">
              <p className={s.hint} data-show>
                Drag back from the cannon and let go. Hit a flag to jump to
                that section. A nod to 29.8N, the artillery game I made at
                IIT Roorkee.
              </p>
            </HeroCopy>
          )}
        </div>
      </section>
      <ConceptSwitcher current={variant} />
    </>
  );
}

function FearCopy() {
  const [k, setK] = useState(fearParams.k);
  return (
    <HeroCopy nameHidden placement="right">
      <p className={s.hint} data-show>
        The dots run from your cursor. It&rsquo;s the prey and predator
        &ldquo;fear&rdquo; model from my maths research at IIT Roorkee,
        running live.
      </p>
      <label className={s.slider}>
        How scared the prey are
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={k}
          onChange={(e) => {
            const v = Number(e.target.value);
            fearParams.k = v;
            setK(v);
          }}
        />
      </label>
    </HeroCopy>
  );
}

function SignatureCopy() {
  const [k, setK] = useState(sigParams.k);
  const [max, setMax] = useState(sigParams.max);
  // mirror the opening ramp until the visitor takes the slider
  useEffect(() => {
    const id = window.setInterval(() => {
      setK(sigParams.k);
      setMax(sigParams.max);
      if (sigParams.touched) window.clearInterval(id);
    }, 80);
    return () => window.clearInterval(id);
  }, []);
  return (
    <HeroCopy nameHidden>
      <p className={s.hint} data-show>
        My signature, drawn by {k} spinning circles chained end to end: a
        Fourier series, the kind of maths I studied at IIT Roorkee. Fewer
        circles, shakier hand.
      </p>
      <label className={s.slider}>
        Circles
        <input
          type="range"
          min={1}
          max={max}
          step={1}
          value={k}
          onChange={(e) => {
            const v = Number(e.target.value);
            sigParams.touched = true;
            sigParams.k = v;
            setK(v);
          }}
        />
      </label>
    </HeroCopy>
  );
}

type Knob = keyof typeof terrainParams;

/** A number in the code you can drag sideways, or nudge with the arrow keys. */
function Scrub({ name, min, max, step, digits }: { name: Knob; min: number; max: number; step: number; digits: number }) {
  const [v, setV] = useState(terrainParams[name]);
  const drag = useRef<{ x: number; v: number } | null>(null);
  const set = (n: number) => {
    const c = Math.min(max, Math.max(min, Math.round(n / step) * step));
    terrainParams[name] = c;
    setV(c);
  };
  return (
    <span
      className={s.scrub}
      role="slider"
      tabIndex={0}
      aria-label={name}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Number(v.toFixed(digits))}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { x: e.clientX, v };
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        set(drag.current.v + ((e.clientX - drag.current.x) / 120) * (max - min) * 0.25);
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowUp") set(v + step);
        else if (e.key === "ArrowLeft" || e.key === "ArrowDown") set(v - step);
        else return;
        e.preventDefault();
      }}
    >
      {v.toFixed(digits)}
    </span>
  );
}

function TerrainCopy() {
  return (
    <HeroCopy nameHidden placement="right">
      <pre className={s.code} aria-label="Shader inputs; drag a number to change the terrain">
        <code>
          <span className={s.cm}>{"// drag a number"}</span>
          {"\n"}float lift  = <Scrub name="lift" min={0} max={1.2} step={0.02} digits={2} />;
          {"\n"}float bands = <Scrub name="bands" min={4} max={40} step={1} digits={1} />;
          {"\n"}float warp  = <Scrub name="warp" min={0} max={3} step={0.05} digits={2} />;
          {"\n"}float flow  = <Scrub name="flow" min={0} max={0.3} step={0.01} digits={2} />;
          {"\n"}
          <span className={s.hideSm}>
            {"\n"}float h = fbm(p + warp * drift(p, t * flow));
            {"\n"}h += name(p) * lift;   <span className={s.cm}>{"// letters are hills"}</span>
            {"\n"}h += hill(p, pointer); <span className={s.cm}>{"// so is your cursor"}</span>
            {"\n"}color = contour(h * bands);
          </span>
        </code>
      </pre>
    </HeroCopy>
  );
}

function EcoCopy() {
  const [k, setK] = useState(fearParams.k);
  return (
    <HeroCopy placement="side">
      <p className={s.hint} data-show>
        A live run of the prey and predator model from my maths research at
        IIT Roorkee. Fear makes prey run sooner but breed less; watch what that
        does to both populations. Tap the field to drop in a predator.
      </p>
      <div className={s.ecoControls}>
        <label className={s.slider}>
          Fear
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={k}
            onChange={(e) => {
              const v = Number(e.target.value);
              fearParams.k = v;
              setK(v);
            }}
          />
        </label>
        <button type="button" className={s.secondary} onClick={() => ecoControl.addPredator?.()}>
          Add a predator
        </button>
      </div>
    </HeroCopy>
  );
}

const HINTS: Partial<Record<Variant, string>> = {
  ink: "My name in wet ink. Drag through it to smear it; give it a moment and it creeps back.",
  sand: "Built from sand. Touch it and the grains come loose and pile up; leave it and the breeze puts them back.",
  strings: "One thread, wound pin to pin, weaving the picture live. Sweep across the strings to pluck them.",
  filings: "Iron filings lined up along my name. Your pointer is a magnet; bring it close.",
  glass: "Etched into a pane of glass. Click anywhere on it and watch it shatter, then mend.",
  sparkler: "My signature in light, like a long exposure. Your pointer is a sparkler too; paint over it.",
  harmono: "A pendulum drawing machine, swinging its way into my initials. Drag across it to retune the pendulums.",
  mosaic: "My name set in type. Your pointer is a lens that bends and scrambles the letters.",
  mix: "Every channel is something I love. Push a fader to bring it into the mix; turn the sound on to hear it.",
  select: "Every character is a version of me. Use the arrow keys or tap to choose.",
  record: "The tracklist is the stuff I love. Pick a track, or grab the record and scratch it.",
  race: "I love F1. Race me: one lap, and the gap at the line is your reaction against a driver's.",
  booth: "The booth is always playing. Slide from 9 to 5 into after hours, and hit the pads (or keys 1 to 4).",
  pan: "Cooking is how I switch off. Flick the pan up to toss (or press space); a harder flick throws higher.",
  move: "Board games, my way: every space is something I love. Roll the dice (or press space).",
  controller: "Gamer, so the site has a controller. Arrow keys, the pad, or plug in a real gamepad.",
  seq: "Newest hobby: DJing. Every row is something I love; click the cells to write your own beat.",
  garage: "Ferrari fan, so here's a car. Drag to walk round it, rev it, open DRS, change the livery.",
  world: "A tiny island of the things I love, all running. Click anything on it to fly over.",
};
