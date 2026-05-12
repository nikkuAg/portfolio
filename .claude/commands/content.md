---
description: Add, edit, delete, reorder, or list portfolio content (experience · projects · skills · socials · bio)
argument-hint: <add|edit|delete|reorder|list> <experience|project|skill|social|bio|about> [identifier]
---

You are managing **site copy** for the portfolio. ALL site copy lives in four files under `content/`:

| File | Exports | Schema |
|------|---------|--------|
| `content/experience.ts` | `experience: ExperienceItem[]` (newest-first) | `{ company, role, start, end, location?, type, highlights[], stack[] }` where `type` is `"fulltime" \| "internship" \| "gsoc" \| "leadership"` |
| `content/projects.ts` | `projects: Project[]` | `{ slug, title, category, year, tagline, description, tech[], href?, github?, playable?, cover? }` where `category` is `"build" \| "game" \| "research"` |
| `content/about.ts` | `about` object | `{ name, initials, title, tagline, location, available, education{school,degree,period}, bio[], skills[] }` |
| `content/socials.ts` | `socials: Social[]` | `{ label, href, handle }` |

**The rest of the codebase reads from those files.** Do not touch any component, do not touch any other content. Your job ends at the four files above (plus running a build to verify).

---

## Arguments

`$ARGUMENTS` will be in the form `<verb> <kind> [identifier]`:

- **verb** — `add` · `edit` · `delete` · `reorder` · `list`
- **kind** — `experience` · `project` · `skill` · `social` · `bio` · `about`
  - `experience` → `content/experience.ts` array
  - `project` → `content/projects.ts` array
  - `skill` → `content/about.ts` → `skills[]` array
  - `social` → `content/socials.ts` array
  - `bio` → `content/about.ts` → `bio[]` paragraphs
  - `about` → other top-level fields on `content/about.ts` (name, title, tagline, location, available, education)
- **identifier** — for `edit` / `delete`, the unique key of the item:
  - experience → company name (case-insensitive substring match) or 1-based index
  - project → `slug` (e.g. `rank-matrix`) or 1-based index
  - skill → exact label (e.g. `TypeScript`) or 1-based index
  - social → `label` (e.g. `GitHub`) or 1-based index

If the user invoked `/content` with no arguments, show the menu in the **Default behavior** section below.

---

## Workflow for every operation

1. **Read the relevant file first** with `Read` — never edit blind.
2. **Show the user what's there** (numbered list, with the field that identifies each item) before mutating.
3. **For `add` / `edit`:** wizard-prompt the user for fields one at a time using `AskUserQuestion` when the values aren't obvious from `$ARGUMENTS`. For long free-text fields (descriptions, highlights), ask in a single message and let them type freely. Show defaults when sensible (e.g. `end: "Present"` for current roles).
4. **Validate** before writing:
   - `experience.type` ∈ `{fulltime, internship, gsoc, leadership}`
   - `project.category` ∈ `{build, game, research}`
   - `project.slug` — kebab-case, unique within `projects[]`
   - `social.href` — must be a valid URL or `mailto:` / `tel:` scheme
   - URLs in `project.href` / `project.github` — sane http(s)
   - Required fields are present and non-empty strings
5. **For `delete`:** confirm with `AskUserQuestion` before removing — show the full item that's about to be cut.
6. **Edit the file** with the `Edit` tool. Match the existing style: 2-space indent, double-quoted strings, trailing commas, blank line between array items only if the existing file does.
7. **Verify** with `npm run build` after every change. If TypeScript fails, the edit is wrong — fix the file (don't just report and stop).
8. **Report** what changed in 1–2 sentences. Mention the new array length (or "removed N, now M items") so the user can sanity-check.

---

## Schema details + sensible defaults

### Experience (`content/experience.ts`) — newest first

```ts
{
  company: "Finrep.ai",
  role: "Full Stack Engineer",
  start: "Nov 2025",            // "Mon YYYY" format throughout this file
  end: "Present",               // "Present" or "Mon YYYY"
  location: "Remote",           // optional
  type: "fulltime",             // "fulltime" | "internship" | "gsoc" | "leadership"
  highlights: [                 // 1–4 sentences. Each is a separate bullet on the site.
    "Building core product as one of the early engineers...",
  ],
  stack: ["TypeScript", "Next.js", "React", "Node.js"],
}
```

When the user adds a new role:
- Default `end` to `"Present"` and ask if it's still current.
- If they say it's current, also ask whether to **demote the previous current role** (set its `end` to the new role's `start - 1 month` or whatever they specify).
- Insert at the correct position in the array based on `start` so the newest-first invariant holds. (Sort by parsed start date desc.)

### Project (`content/projects.ts`)

```ts
{
  slug: "rank-matrix",          // unique kebab-case
  title: "Rank Matrix",
  category: "build",            // "build" | "game" | "research"
  year: "2022",                 // "YYYY" or "YYYY-YY"
  tagline: "One short sentence.",  // <= ~70 chars
  description: "2–4 sentences explaining what it is and what you did.",
  tech: ["Django", "React", "MySQL", "Redis"],
  href: "https://...",          // optional — live URL
  github: "https://github.com/nikkuAg/...", // optional
  playable: true,               // optional — true for games with an inline play link
  cover: "/projects/foo.png",   // optional — preview image in /public
  color: "#ff5dc8",             // optional — per-project accent hex; overrides
                                //   the category default (build/game/research)
                                //   for the deck card border, glow, gradient,
                                //   title, and corner ticks. Side-panel
                                //   category label uses it too.
}
```

Order in this file roughly tracks recency or curation, not strict chronology. When adding, ask the user where they want it (default: append).

**Category default colors** (used when `color` is omitted):
- `build` → `#ff9b3d` (warm amber)
- `game` → `#c8ff3d` (phosphor lime)
- `research` → `#7aa8ff` (cool blue)

If the user provides a `color`, validate it's a 3- or 6-digit hex (`#RGB` or `#RRGGBB`) before writing. Reject CSS names / rgb() — only hex.

### Skill (`content/about.ts` → `skills[]`)

A flat string array of technology names. Used by the **about section's prose listing** (the constellation graph in `components/about/SkillsConstellation.tsx` has its **own** node list — do NOT touch that file from this skill; the constellation is a separate, hand-curated graph). When the user adds a skill, just append to `about.skills`.

If the user asks to add a skill **to the constellation specifically**, tell them: "The constellation has a separate hand-curated node + link graph in `components/about/SkillsConstellation.tsx`. I can't safely touch that from this skill — open the file and I'll edit it directly if you want."

### Social (`content/socials.ts`)

```ts
{ label: "GitHub", href: "https://github.com/nikkuAg", handle: "@nikkuAg" }
```

Order matters — it's the visual order in the contact section. Default new entries to **append** unless the user picks a position.

### Bio (`content/about.ts` → `bio[]`)

An array of paragraph strings. `add` appends; `edit` replaces an indexed paragraph; `delete` removes by index; `reorder` lets the user shuffle.

### About (other top-level fields)

`name`, `initials`, `title`, `tagline`, `location`, `available`, `education.{school,degree,period}` — straightforward string / boolean edits. Always show old → new before writing.

---

## Default behavior (when invoked with no `$ARGUMENTS`)

Show a quick summary:

```
PORTFOLIO CONTENT

  experience (N roles)   →  newest: <company>, oldest: <company>
  projects (N projects)  →  <slug>, <slug>, ...
  about.bio (N paras)    →  bio paragraphs in content/about.ts
  about.skills (N items) →  prose skill list (NOT the constellation)
  socials (N entries)    →  Email, GitHub, ...

Run `/content <verb> <kind> [id]` — e.g.:
  /content add project
  /content edit experience finrep
  /content delete social Phone
  /content reorder experience
  /content list projects
```

Then ask `AskUserQuestion` for what they want to do — verbs as options, kind as a follow-up.

---

## Hard rules

- **Never** modify any file outside `content/*.ts`. If the user asks for a change that requires editing a component, refuse and tell them which component to open.
- **Never** delete without explicit confirmation in the same turn.
- **Never** silently change schema (e.g. don't add a new optional field to `Project` from this skill — that requires editing `content/projects.ts`'s type definition AND probably a component, which is out of scope).
- **Always** run `npm run build` after a write; if it fails, fix the content file you just wrote (the most likely cause is a missing comma, an unescaped quote in a string, or a wrong enum value).
- **Always** preserve the comments in the file (e.g. `// chronological — newest first (resume convention)` in `experience.ts`) — they document an invariant.
- Treat the user's name "nikku" and "Divyansh" as the same person.
