# Portfolio UX research, section by section

The evidence base for the redesign. Every section of the site gets the
principles it should follow, the evidence behind each one, a scorecard for
the current site (divyanshagarwal.me, November 2026), and the changes ranked
by impact. Nothing goes on a page without a reason from here, or a reason
written down for departing from it.

**How much to trust each point**
- No rigorous study exists of how hiring managers read *developer portfolio
  sites*. Most evidence carries over from résumé eye-tracking, NN/g scrolling
  and About-page research, NN/g's survey of 204 hiring managers (UX
  portfolios, but the same skim behaviour), and WCAG.
- Points tagged *[secondary]* rest on summaries or practitioner writing.
  *[judgment]* means reasoned, not sourced.
- Circulating figures to treat as **unverified**: "recruiters spend 55–60 s
  on a portfolio", "58% of recruiters want metrics". The Ladders 7.4 s résumé
  figure is real but its method isn't published.

---

## 0. Cross-cutting rules (apply to every section)

| # | Rule | Evidence |
|---|------|----------|
| X1 | **Meaning in under ~1 s, value proposition within 10 s.** People decide to stay or leave in the first 10 s and judge looks in about 50 ms. | [NN/g, how long users stay](https://www.nngroup.com/articles/how-long-do-users-stay-on-web-pages/); [Lindgaard 2006](https://www.nature.com/news/2006/060109/full/news060109-13.html) |
| X2 | **Novel visuals inside a familiar frame.** Unfamiliar layouts are rated uglier even when simple. Pick one novelty, not novelty everywhere. | [Tuch et al., Google Research 2012](https://research.google/pubs/the-role-of-visual-complexity-and-prototypicality-regarding-first-impression-of-websites-working-towards-understanding-aesthetic-judgments/); [Jakob's law](https://lawsofux.com/jakobs-law/) |
| X3 | **Readers skim, along the top and left edge.** 57% of viewing time is above the fold and 74% in the first two screens. F-pattern on desktop and mobile. | [NN/g scrolling & attention](https://www.nngroup.com/articles/scrolling-and-attention/); [NN/g F-pattern](https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/) |
| X4 | **No scroll-jacking around text people must read.** Most users were disoriented. The worst case is changed scroll speed *plus* text to read. Keep any scroll-jack short, decorative, below the fold, and off on mobile. | [NN/g Scrolljacking 101](https://www.nngroup.com/articles/scrolljacking-101/) |
| X5 | **All real content lives in the DOM as text.** Canvas content is invisible to Ctrl+F, screen readers, translation and search. Canvas isn't an LCP candidate. | [Chrome for Developers](https://developer.chrome.com/docs/modern-web-guidance/guides/visual-design/expose-canvas-content-to-browser-features); [web.dev LCP](https://web.dev/articles/lcp) |
| X6 | **Motion safety.** Motion that plays on its own for more than 5 s needs pause, stop or hide (WCAG 2.2.2, Level A, and tickers are named explicitly). Honour `prefers-reduced-motion` in JS loops too. Parallax and large camera moves are vestibular triggers. | [W3C 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide); [W3C C39](https://www.w3.org/WAI/WCAG22/Techniques/css/C39); [A List Apart](https://alistapart.com/article/designing-safer-web-animation-for-motion-sensitivity) |
| X7 | **Strong signifiers.** Weak ones cost 22% more time and 25% more fixations. Interactive things must look interactive and be labelled. | [NN/g flat UI](https://nngroup.com/articles/flat-ui-less-attention-cause-uncertainty) |
| X8 | **Proof over claims.** Hiring managers look for previous work, projects and GitHub. Unbacked claims carry little weight; recruiters judged résumés barely better than chance. Make claims checkable. | HackerRank 2018 *[secondary]*; [interviewing.io](https://interviewing.io/blog/for-six-years-we-ran-the-largest-blind-eng-hiring-experiment-of-all-time-here-s-what-happened) *[secondary]*; Stanford credibility guideline 1 *[secondary]* |
| X9 | **Touch targets of at least 24×24 CSS px (WCAG 2.5.8 AA), aim for 44–48.** No meaning carried by hover alone. | [Smashing on 2.5.8](https://smashingmagazine.com/2024/07/getting-bottom-minimum-wcag-conformant-interactive-element-size/) |

---

## 1. Hero, the first viewport

### Principles
1. **First signal in about 1 s.** Name, role and one proof point readable
   right after first paint. Meaning that waits for an animation is the
   anti-pattern (X1).
2. **One dominant focal element, with text beside it, not inside it.** A
   single hero object plus a separate text column in the top-left scan path
   (X3). The "composed grid" reel (title, dominant visual, supporting media,
   proof card, CTA) is a sound structure *[judgment: no study compares grid
   heroes with centred ones]*.
3. **Value proposition in one sentence of real text.** Who you are and what
   you do, for example "Full-stack engineer. I build X; also games and 3D".
   ([NN/g homepage](https://nngroup.com/articles/homepage-design-principles/))
4. **Explicit CTA hierarchy.** One filled primary ("View projects"), one
   outline secondary ("Résumé"). A bouncing arrow is not a CTA.
   ([Fitts's law](https://lawsofux.com/fitts-law/), X7)
5. **Proof above the fold.** Current role and company, a shipped project or a
   metric. ([NN/g hiring-manager survey](https://nngroup.com/articles/ux-design-portfolios/);
   [Ladders via HR Dive](https://www.hrdive.com/news/eye-tracking-study-shows-recruiters-look-at-resumes-for-7-seconds/541582/))
6. **Interactive heroes are optional and signposted.** A labelled affordance
   ("▶ Play"), and the site fully usable without playing. Hiding controls
   roughly halves how often people find them.
   ([NN/g hamburger study](https://www.nngroup.com/articles/hamburger-menus/))
7. **Loaders.** Acceptable only when they mask real loading, last at most
   about 1–2 s, can be skipped, and run once. Attention is lost at 10 s.
   Intros are things people want to skip, and animation must not block
   content.
   ([NN/g response times](https://www.nngroup.com/videos/3-response-time-limits-interaction-design/);
   [Opquast 127](https://checklists.opquast.com/en/web-quality-assurance/the-course-of-video-or-any-animation-does-not-block-access-to-navigation-or-content))
8. **LCP of 2.5 s or less on real text.** Render the h1 fully in SSR HTML; never
   feed it through a typing timer (X5).
9. **Mobile.** `100svh`, not `100vh`. CTAs in the lower-middle area. Every hover
   effect needs a tap equivalent.
   ([web.dev viewport units](https://web.dev/blog/viewport-units);
   [Hoober, UXmatters](https://www.uxmatters.com/mt/archives/2017/07/design-for-fingers-touch-and-people-part-3.php))

### Scorecard: current site and the four concepts

A = the desk you scroll into · B = the broadcast set with channels · C = the
fear-factor particle name · D = the 29.8N artillery range

| Principle | Now | A | B | C | D |
|---|---|---|---|---|---|
| First signal ≤1 s | **Fail**: 5–8 s loader, then typed name | Partial | Partial | Pass | Partial |
| Familiar frame | Partial | Partial | Partial | Pass | Partial |
| Top-left text | Fail: name inside the TV | Pass\* | Pass\* | Pass | Pass\* |
| One focal element | Pass | Pass | Partial: channels compete | Pass | Partial |
| Value prop in text | Partial: typed late | Pass\* | Pass\* | Pass\* | Pass\* |
| CTA pair | **Fail**: ↓ arrow only | Pass\* | Pass\* | Pass\* | Pass\* |
| Proof above fold | Fail | Fail | **Pass**: projects reel | Fail | Fail |
| Interaction optional | Partial: knob hidden | Partial | Partial | Pass: passive | Partial: flags navigate, but HTML links too |
| LCP on real text | **Fail**: typed h1 | Pass\* | Pass\* | Pass\*: h1 is sr-only text | Pass\* |
| Motion safety | Partial: no pause | **Fail**: scroll camera dolly | Partial | Partial: constant motion near text | Partial |
| Mobile | Partial | Fail: scroll-jack on mobile | Pass | Partial: needs a touch story | Partial: aim grip is scoped |

\* already true in the prototypes because they share the HTML copy block
(name, lede, Résumé and Skip to projects buttons).

**Reading of the scorecard.** B and C are the strongest bases. B can carry
proof (the reel) and a value proposition (teletext). C is the simplest and
most familiar. D works best as an easter egg or a section-level toy, not as
navigation. A's scroll-into-the-TV is a first-viewport scroll-jack, which is
exactly what NN/g advises against, though it could survive as a short,
opt-in, desktop-only moment.

### Top changes, ranked
1. Name, role and tagline as static SSR text on first paint; no typed h1.
2. Loader at most about 1.5 s or tied to real loading; keep the skip; content
   and nav visible behind a short CRT wipe.
3. CTA pair plus a proof card in the first viewport.
4. Interactivity labelled and optional, with a pause control for ambient
   motion.
5. WebGL: lazy mount after the text paints, adaptive DPR, a performance
   monitor on mobile ([R3F scaling](https://r3f.docs.pmnd.rs/advanced/scaling-performance)).

---

## 2. Navigation and global chrome

1. **Sticky nav: small, opaque, hidden on scroll down, revealed on scroll up**
   with a 300–400 ms slide. It is also the escape hatch from any scroll-jack.
   ([NN/g sticky headers](https://www.nngroup.com/articles/sticky-headers/))
2. **Visible nav on desktop.** Hidden navigation was used 27% of the time
   versus 48% for visible.
   ([NN/g](https://www.nngroup.com/articles/find-navigation-desktop-not-hamburger/))
3. **Résumé as one persistent, labelled target**, opening the PDF in a new tab
   with its file size shown *[judgment]*.
4. **Custom cursor.** It overrides OS cursor-size and contrast settings, which
   hurts low-vision users *[secondary]*. Keep it gated on `(pointer: fine)`
   (done), with no lag (over 0.1 s feels detached), and turn it off under
   reduced motion and forced-colors.
5. **Lenis.** Anchors go through `lenis.scrollTo` and move focus to the
   target. Manually test Ctrl+F, Space/PageDown and Home/End.
6. **Back-to-top** only on pages longer than about 4 screens: bottom-right,
   text-labelled, shown after scrolling up.
   ([NN/g](https://www.nngroup.com/articles/back-to-top/))

---

## 3. About

### Principles
1. **Role, domain and level in the first line**; one short phrase removes
   most confusion.
   ([NN/g About-Us](https://www.nngroup.com/articles/about-us-information-on-websites/))
2. **A 60–120 word summary first, depth behind it.** Users read about a
   quarter of a page's text; walls of text lower satisfaction.
3. **Personality second to facts.**
   ([Josh Comeau's About page](https://www.joshwcomeau.com/about-josh/):
   career facts first, fun facts after.)
4. **A real photo.** Portraits got 10% more viewing time than bios that took
   316% more space.
   ([NN/g photos](https://www.nngroup.com/articles/photos-as-web-content/))
5. **Skills tied to proof; no self-rated bars or levels.** Each skill links to
   where it was used, as Brittany Chiang does with tags under each role.
6. **8–12 core skills, strongest first.** Items in the middle of long lists
   are recalled least.
   ([serial position](https://lawsofux.com/serial-position-effect/))
7. **A fresh, specific, dated status.** Avoid "Available" next to a full-time
   "Now" with no explanation. ([Simon Willison](https://simonwillison.net/about/))
8. **Verify and contact next to the bio**: email, résumé, GitHub, LinkedIn.
9. **Motion never delays reading.** Chips are readable without scrolling or
   hovering.
10. **Credentials as a differentiator, not the lead**, for example "applied
    maths, which is why simulation and research projects".

### Scorecard (current)
| Principle | Rating | Why |
|---|---|---|
| First line | Partial | The skill tree competes for attention |
| Short summary | Fail | Three equal paragraphs, no summary |
| Personality | Pass | The game framing fits |
| Photo | Fail | None |
| Skills tied to proof | Fail | Chips don't link to projects |
| Not over-listed | Partial | 26 skills |
| Status | Partial | Undated; "Available" vs "Now: Finrep" (and **now out of date**: rune.ai) |
| Contact nearby | Fail | Contact only in the footer section |
| Motion | Partial | Animate-in on scroll, glow near the cursor |
| Credentials | Partial | Present but not framed |

### Top changes
1. A one-line headline plus a 2–3 sentence summary above the skill tree.
2. Skill chips link or filter to the projects that use them ("Go → Presence
   Server"), which turns the tree into proof.
3. Add a real photo.
4. A dated status that reads true ("Full-time at rune.ai · open to … ·
   updated Nov 2026").
5. Email, résumé and GitHub beside the bio; chips visible without motion.

**Exemplars:** [brittanychiang.com](https://brittanychiang.com/) ·
[joshwcomeau.com/about-josh](https://www.joshwcomeau.com/about-josh/) ·
[simonwillison.net/about](https://simonwillison.net/about/) ·
[redblobgames.com](https://www.redblobgames.com/), the closest match to a
maths-and-games profile.

---

## 4. Projects

### Principles
1. **3–5 deep projects plus an archive.** Quality over quantity, and
   carousels of 5 frames or fewer.
   ([NN/g portfolios](https://www.nngroup.com/articles/ux-design-portfolios/);
   [NN/g carousels](https://www.nngroup.com/articles/designing-effective-carousels/))
2. **Best and most relevant first**, matched to the jobs you want.
3. **Case-study anatomy:** problem, your role and team, constraints, the
   decisions and the alternatives you rejected, outcome, learnings.
   ([Emil Kowalski's Sonner write-up](https://emilkowal.ski/ui/building-a-toast-component)
   is the engineering model.)
4. **Show the messy middle:** an architecture sketch, what broke first, what
   you'd change.
5. **Visuals that carry information:** a real screenshot or a 5–15 s muted
   loop on every card.
6. **Games playable or watchable fast:** a 30–90 s clip with the strongest
   footage first, plus an in-browser or itch.io build *[practitioner]*.
   ([dukope.com](https://dukope.com/))
7. **Progressive disclosure:** card → `/projects/<slug>` detail page with a
   summary first, at most two levels deep.
   ([NN/g](https://www.nngroup.com/articles/progressive-disclosure/))
8. **No scroll-pinned deck for reading text** (X4).
9. **No hidden content in carousels.** On mobile, use a vertical list, or show
   "3 / 7", a peeking next card and real buttons; dots are a poor cue.
10. **Credible metrics:** baseline → result, how it was measured, the
    timeframe, your part, and a link to evidence where possible.
11. **State your role on team projects.**
12. **Source links with context.** A README with a summary, GIF and run steps;
    say why when there's no link (NDA, retired).
13. **Mobile is its own design.**
14. **Group by target job:** Production web / Games and simulation.

### Scorecard (current)
| Principle | Rating | Why |
|---|---|---|
| Count | Fail | 7 equal cards, no featured tier |
| Best first | Pass | Rank Matrix pinned first, on purpose |
| Case-study anatomy | Fail | Tagline, description and chips only |
| Process | Fail | None |
| Visuals | Fail | No screenshots or video |
| Games playable | Partial | Badges, no clip or build |
| Disclosure | Partial | Side panel only, no detail pages |
| Scroll-jacking | Fail | Pinned deck tied to scroll |
| Carousel | Partial | 7 frames; mobile swipe |
| Metrics | Partial | Real numbers with no baseline or method |
| Role | Fail | Not stated |
| Source links | Partial | No "why no link" notes |
| Grouping | Fail | Web, research and games mixed |

### Top changes
1. Replace the pinned deck with normal scrolling: 3–4 featured projects (Rank
   Matrix, Presence Server, one game, Prey & Predator) plus a compact archive
   table. Use a vertical list on mobile.
2. A screenshot or muted loop on every card; a clip or WebGL/itch build for
   the games.
3. A detail page per featured project: summary, problem, constraints, role,
   2–3 decisions with rejected alternatives, outcome, what I'd change.
4. Checkable metrics ("79k users" with a timeframe and source; "64% faster",
   with which metric, before and after, and how it was measured).
5. Group by target role; state role and team size on each card.

**Exemplars:** [brittanychiang.com](https://brittanychiang.com/) and
[its archive](https://brittanychiang.com/archive) ·
[Sonner write-up](https://emilkowal.ski/ui/building-a-toast-component) ·
[dukope.com](https://dukope.com/) · [redblobgames.com](https://www.redblobgames.com/) ·
[bruno-simon.com](https://bruno-simon.com/) (inspiration for the games only).

---

## 5. Experience

### Principles
1. **A titles-first, simple structure**: Title · Company · Dates on one
   left-aligned line, then one outcome line. Recruiters look at titles most;
   multi-column and cluttered layouts did poorly.
   ([Ladders via HR Dive](https://www.hrdive.com/news/eye-tracking-study-shows-recruiters-look-at-resumes-for-7-seconds/541582/))
2. **The whole list visible at a glance**; no one-role-at-a-time reveal.
   ([NN/g portfolios](https://www.nngroup.com/articles/ux-design-portfolios/))
3. **Newest and most relevant first.**
4. **4–6 roles in full, older ones collapsed**, never the current one.
   Brittany Chiang shows 6, then "View full résumé".
   ([NN/g accordions](https://www.nngroup.com/articles/accordions-on-desktop/))
5. **Quantified, believable impact**: baseline, mechanism, scope ("cut infra
   cost 75% ($X→$Y/mo) by …").
6. **Internship and full-time visibly distinct**: a badge on the title line.
   Nest several roles at one company (Athleo) *[judgment]*.
7. **A list with a light timeline**, not timeline-as-art. Alternating
   left/right layouts break the left-edge scan.
8. **No scroll-jacking for content people must read and compare.** Recruiters
   are task-focused users, the least patient group (X4).
9. **Every role's text in the DOM**, for Ctrl+F, screen readers and SEO (X5).
10. **A deep link per role** (`#exp-bny`) *[judgment]*.
11. **Logos optional; text carries the meaning.**
12. **Mobile: a plain vertical list with normal scrolling.**

### Scorecard (current)
| Principle | Rating | Why |
|---|---|---|
| Scan order | Partial | The HUD shows title, company and dates, one role at a time |
| At a glance | Fail | You can't see all 11 roles on desktop |
| Recency | Pass | Newest first |
| Count / collapse | Fail | 11 roles at equal weight |
| Metrics | Partial | No baselines or scope |
| Intern vs FT | Partial | The type exists; prominence is weak |
| List over art | Fail (desktop), Pass (fallback) | |
| Scroll-jacking | Fail | Pinned for many viewports with snap, and requires reading: NN/g's worst case |
| In the DOM | Likely fail | The HUD swaps per gate (needs checking) |
| Deep links | Fail | None |
| Mobile | Fail | The 3D flight runs on mobile too |

### Top changes
1. A static, scannable list by default on every device. The 3D portal flight
   becomes an opt-in "Fly through" mode or a short, unpinned interlude.
2. Collapse to the top 4–5 roles, an "Earlier" group, and a résumé link.
3. All role text always in the DOM.
4. Rewrite metrics with baseline, mechanism and scope.
5. Per-role anchors, and internship badges on the title line.

**Exemplars:** [brittanychiang.com](https://brittanychiang.com/) is the
reference pattern · [bruno-simon.com](https://bruno-simon.com/) shows
immersive and findable can coexist.

---

## 6. Contact and footer

### Principles
1. **A real, visible email address; a form only in addition.** Users
   hesitate to type their email into forms.
   ([NN/g Contact Us](https://www.nngroup.com/articles/contact-us-pages/))
2. **A copy-email button next to the `mailto:` link**, which fails silently
   for webmail users, with an `aria-live` "Copied" message
   ([rauno.me](https://rauno.me/)).
3. **Few channels, only ones you answer.**
4. **The phone number is a trade-off**: put it in the résumé PDF, or show it
   labelled with hours. `tel:` does little on desktop *[judgment]*.
5. **State a response time** (most people expect about 24 h) **and your hours
   in your time zone.**
6. **Time zone, yes; a ticking clock is optional.** Auto-updating content
   falls under WCAG 2.2.2. Update at most once a minute with `aria-live`
   off, or keep it static.
7. **Decorative motion stops within 5 s or gets a control**: the ticker needs
   a pause; the signature draws once and is `aria-hidden`.
8. **Booking calendar optional, secondary at most.**
9. **End on one clear CTA plus an availability line**: target roles,
   remote or location, notice period.
   ([peak-end rule](https://lawsofux.com/articles/2020/peak-end-rule))
10. **The footer repeats the essentials**: email, résumé, GitHub, LinkedIn,
    section links. Never © only.
11. **Plain accessible names**: "CH·01" can be decoration, but the link name
    is "GitHub".
12. **Targets of at least 24 px**; the magnetic hover must not move the hit
    area on touch.

### Scorecard (current)
| Principle | Rating | Why |
|---|---|---|
| Visible email | Pass | Large email link |
| Copy affordance | Fail | No copy button |
| Channel count | Pass | 4 |
| Phone exposure | Partial | Public on the site |
| Response time | Pass | "Response < 24h" |
| Clock | Partial | Live clock without controls |
| Decorative motion | Partial/Fail | An endless ticker, no pause |
| Final CTA | Partial | A witty heading with no availability line |
| Footer | Fail | © and back-to-top only |
| Labels | Partial | "CH·01" names |
| Targets | Check | Magnetic hit area |

### Top changes
1. A copy-email button with a live "Copied" confirmation.
2. A one-line availability statement next to the CTA.
3. Pausable or self-stopping ticker; the clock updates once a minute or is
   static; the signature `aria-hidden`.
4. Footer expanded: email, résumé, GitHub, LinkedIn, section links.
5. Plain accessible names; working hours in IST; consider moving the phone
   number into the PDF.

**Exemplars:** [rauno.me](https://rauno.me/) (copy email) ·
[taniarascia.com/me](https://www.taniarascia.com/me) ·
[paco.me](https://paco.me/) · [jhey.dev](https://jhey.dev/).

---

## 7. Mobile, across the site

1. Touch targets at least 24 px (aim for 44–48) (X9).
2. No pinning or scroll-jacking on mobile, or a short mobile-specific
   version (X4).
3. Gestures never fight page scroll: scope `touch-action` to an explicit
   grip or play mode (the D concept's cannon grip does this).
4. Performance budget: about 300–350 KiB of gzipped JS for p75 devices
   *[secondary]*. Adaptive DPR, instancing, canvas mounted after text paint.
5. Reduced motion detected in JS loops as well as CSS (already done in the
   repo).
6. `svh` for heroes, `dvh` only where reflow is acceptable.
7. Don't lock orientation (WCAG 1.3.4); games reflow for landscape, and the
   gamepad never covers content.
8. Nothing that means something only on hover: particles that flee the cursor
   need a touch behaviour (C has an autonomous predator plus touch drag).

---

## 8. What this means for the redesign

- **Biggest wins regardless of hero choice:** an SSR text hero with a CTA
  pair and proof; a shorter loader; Projects and Experience unpinned with
  real case studies and a scannable list; a real footer.
- **The immersive pieces stay, but as layers, not gates.** Each 3D or game
  moment is opt-in or decorative, with every piece of content also present
  as plain DOM text.
- **Content updates are a separate task once the design is final**, starting
  with the current role (now rune.ai).
