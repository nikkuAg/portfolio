# portfolio

> Interfaces, services, and the wires between them.

The personal portfolio of **Divyansh Agarwal** (`@nikkuAg`) — full-stack engineer with frontend forte, plus backend, infra, and games. Built as an editorial single-page experience with a few interactive set-pieces.

🔗 **Live:** _coming soon_
🐙 **Source:** [github.com/nikkuAg/portfolio](https://github.com/nikkuAg/portfolio)

---

## What's on it

| # | Section | Centerpiece |
|---|---------|-------------|
| 00 | **Hero** | A working CRT television. Snake auto-pilots in the background; an italic-serif typewriter introduces the site, then hover the screen to take over the controls (arrows / WASD, space to pause). |
| 01 | **About** | An editorial bio next to a force-directed **skill constellation** — chips connected by phosphor lines, each chip drifting on its own noise frequency so the graph never sits still. |
| 02 | **Projects** | A scroll-pinned **card deck**. Each scroll tick flicks the top card off with a spring rotation; the next card pops up while the side panel crossfades to its detail. Click a card behind the top to jump to it. |
| 03 | **Experience** | A scroll-pinned **chalkboard timeline**. 11 flagged roles laid along a curved chalk path; a chalk character walks from oldest to newest as you scroll. Hover any flag to lock its detail in the panel below. |
| 04 | **Contact** | Big italic ask, direct mailto, and the four socials (email · GitHub · LinkedIn · phone). |
| -- | **Loader** | A CRT power-on/off sequence on entry — line-zap → screen open → load counter + scanlines → vertical collapse → horizontal collapse → phosphor dot. Skipped on revisit (sessionStorage). |

The whole experience runs under a custom cursor (lime dot + ring with mix-blend-mode interaction states), Lenis smooth scroll, and a phosphor lime palette (`#c8ff3d`) on dark.

---

## Stack

- **Framework:** [Next.js 16](https://nextjs.org) (App Router · Turbopack) on **React 19** + **TypeScript 5**
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com) with `@theme` design tokens · custom GLSL shaders · `next/font` (Geist Sans, Geist Mono, Instrument Serif)
- **3D / Graphics:** [Three.js](https://threejs.org), [@react-three/fiber v9](https://r3f.docs.pmnd.rs), [@react-three/drei](https://github.com/pmndrs/drei), [@react-three/postprocessing](https://github.com/pmndrs/react-postprocessing) — used for the CRT hero scene
- **Motion:** [`motion`](https://motion.dev) (formerly Framer Motion) for component animation · [GSAP](https://gsap.com) for utility tweens · [Lenis](https://github.com/darkroomengineering/lenis) for smooth scroll
- **Math / utility:** [maath](https://github.com/pmndrs/maath)

> **Heads up — this is *not* the Next.js you may know.** Next.js 16 ships breaking changes (async params, Cache Components, Turbopack defaults). When extending, read `node_modules/next/dist/docs/` rather than older guides. See [`AGENTS.md`](./AGENTS.md).

---

## Local development

```bash
# install
npm install

# dev — http://localhost:3000
npm run dev

# typecheck + bundle
npm run build

# lint
npm run lint
```

Requires Node 20+. No `.env` is needed for the basic site.

---

## Project structure

```
portfolio/
├── app/                       # Next.js App Router entry
│   ├── layout.tsx             # fonts, providers, Lenis, custom cursor
│   ├── page.tsx               # composed sections
│   ├── globals.css            # @theme tokens + animations
│   ├── icon.tsx               # generated favicon
│   └── opengraph-image.tsx    # generated OG image
│
├── components/
│   ├── hero/                  # CRT screen, snake, hero overlay, GLSL shader
│   ├── about/                 # SkillsConstellation (force-directed graph)
│   ├── projects/              # ProjectsSection (scroll-pinned card deck)
│   ├── experience/            # ExperienceSection (scroll-pinned chalk path)
│   ├── contact/               # ContactSection
│   ├── footer/                # Footer
│   ├── ui/                    # Loader, custom cursor, etc.
│   └── providers/             # Lenis provider, etc.
│
├── content/                   # ←—— ALL site copy lives here
│   ├── about.ts               # bio paragraphs + tagline + skills array
│   ├── experience.ts          # 11 roles (newest first)
│   ├── projects.ts            # project list
│   └── socials.ts             # email, GitHub, LinkedIn, phone
│
├── lib/                       # utilities
├── public/                    # static assets
├── .claude/commands/          # Claude Code slash commands (incl. /content)
├── AGENTS.md                  # heads-up note for AI assistants
└── CLAUDE.md                  # → re-exports AGENTS.md
```

---

## Editing site content

All copy lives under [`content/`](./content/). To add, edit, reorder, or remove a project / role / skill / social link, you can edit those files directly — or use the bundled Claude Code skill:

```
/content                                # show what's there + menu
/content add project                    # wizard for a new project
/content edit experience finrep         # edit a role by company slug
/content delete project rank-matrix     # remove by slug
/content reorder experience             # reorder roles
```

The `/content` skill knows the schema for each file (e.g. `experience.type` must be one of `fulltime` / `internship` / `gsoc` / `leadership`), validates fields, runs `npm run build` after each change, and avoids touching anything outside the four content files. See [`.claude/commands/content.md`](./.claude/commands/content.md).

If you're not using Claude Code, just edit the four `content/*.ts` files — they're typed.

---

## Notable interactions

- **Snake works.** Hover the CRT after the typewriter completes to dismiss the overlay. Then arrows or WASD to play, space to pause, R to restart.
- **The constellation drifts.** Each chip carries its own random noise phase + frequency, so the graph never visually settles. Hover any chip to highlight its neighbors.
- **Scrolling drives both Projects and Experience.** Both sections pin and run for ~3 viewports of scroll while their internal animations play out.
- **Custom cursor disappears on touch.** The whole `cursor: none !important` rule is gated on `@media (pointer: fine)`.
- **`prefers-reduced-motion`** is honored throughout — the loader skips, the chalk character stops walking, marquees freeze, and the constellation noise turns off.

---

## Credits

- Fonts: [Geist](https://vercel.com/font) by Vercel · Instrument Serif by [Instrument](https://fonts.google.com/specimen/Instrument+Serif)
- Snake game logic, CRT shader, force simulation, chalk timeline, and card-deck physics — all hand-built; see `components/`

---

## License

Source code released under the MIT license — see [`LICENSE`](./LICENSE) once added. Site copy, project descriptions, screenshots, and personal photography remain © Divyansh Agarwal; please don't redeploy them as-is.
