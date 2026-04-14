# Music Education Webapp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold a Next.js music education webapp with registry-driven routing and port the time-signatures interactive lesson as the first concept.

**Architecture:** A curriculum registry (`src/curriculum.ts`) defines sections and concepts. Two dynamic route segments (`[section]` and `[concept]`) resolve against it. Each lesson is a fully standalone page — no shared shell imposed. Home and section pages auto-generate from the registry.

**Tech Stack:** Next.js 14+ (App Router), React 18+, TypeScript, Tailwind CSS

---

## File Structure

```
musiceducation/
  package.json
  tsconfig.json
  next.config.ts
  tailwind.config.ts
  postcss.config.mjs
  CLAUDE.md                                    # Project instructions
  docs/
    curriculum-registry.md                      # Registry documentation
  src/
    curriculum.ts                               # Central content registry
    app/
      layout.tsx                                # Root layout (fonts, global styles)
      page.tsx                                  # Home page (lists sections)
      globals.css                               # Tailwind directives + CSS variables
      [section]/
        page.tsx                                # Section page (lists concepts)
        [concept]/
          page.tsx                              # Dynamic lesson resolver
    lessons/
      rhythm/
        time-signatures/
          index.tsx                             # Time signatures interactive lesson
```

---

### Task 1: Initialize Next.js project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

- [ ] **Step 1: Scaffold Next.js with TypeScript and Tailwind**

Run from the project root (`musiceducation/`):

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --no-import-alias --use-npm
```

When prompted, accept defaults. This will create the full Next.js scaffold in the current directory. The `--app` flag uses the App Router. The `--src-dir` flag puts app code under `src/`.

If it asks about overwriting existing files, accept — the only existing files are in `docs/`, `lesson_chapters/`, and `lesson_interactive/` which won't conflict.

- [ ] **Step 2: Verify the scaffold runs**

```bash
npm run dev
```

Open `http://localhost:3000` in a browser. Confirm you see the default Next.js welcome page. Kill the dev server.

- [ ] **Step 3: Clean the default scaffold**

Replace `src/app/page.tsx` with a minimal placeholder:

```tsx
export default function Home() {
  return (
    <main>
      <h1>Music Education</h1>
    </main>
  );
}
```

Replace `src/app/globals.css` with just the Tailwind directives:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Remove any default Next.js images or SVGs from `public/` that were scaffolded (e.g., `next.svg`, `vercel.svg`, `globe.svg`, `file.svg`, `window.svg`).

- [ ] **Step 4: Configure fonts in root layout**

Replace `src/app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import "./globals.css";

const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const serif = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Music Education",
  description: "Interactive music theory lessons",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body className="font-sans bg-[var(--bg)] text-[var(--text)] antialiased">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Add CSS variables and Tailwind config**

Update `src/app/globals.css` to:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --bg: #FAF9F6;
    --bg2: #F0EFEB;
    --text: #1A1A18;
    --text2: #6B6A65;
    --text3: #9C9B96;
    --accent: #2E6FBA;
    --accent-light: #E6F0FB;
    --accent-med: #85B7EB;
    --border: rgba(0, 0, 0, 0.1);
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #1A1A18;
      --bg2: #2A2A26;
      --text: #E8E6E0;
      --text2: #9C9B96;
      --text3: #6B6A65;
      --accent: #5B9AE0;
      --accent-light: #1E3350;
      --accent-med: #3A6FA0;
      --border: rgba(255, 255, 255, 0.1);
    }
  }
}
```

Update `tailwind.config.ts` to extend with the custom fonts:

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 6: Verify fonts and variables load**

```bash
npm run dev
```

Open `http://localhost:3000`. Confirm "Music Education" renders with DM Sans. Inspect the body element and verify CSS variables (`--bg`, `--text`, etc.) are applied. Kill the dev server.

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: initialize Next.js project with Tailwind, fonts, and CSS variables"
```

---

### Task 2: Create the curriculum registry

**Files:**
- Create: `src/curriculum.ts`

- [ ] **Step 1: Create the curriculum registry**

Create `src/curriculum.ts`:

```ts
export type Concept = {
  slug: string;
  title: string;
  description: string;
};

export type Section = {
  slug: string;
  title: string;
  description: string;
  concepts: Concept[];
};

export const curriculum: Section[] = [
  {
    slug: "rhythm",
    title: "Rhythm",
    description: "How music is organized in time.",
    concepts: [
      {
        slug: "time-signatures",
        title: "Time Signatures",
        description: "How beats are grouped into measures.",
      },
    ],
  },
];

export function getSection(slug: string): Section | undefined {
  return curriculum.find((s) => s.slug === slug);
}

export function getConcept(
  sectionSlug: string,
  conceptSlug: string
): { section: Section; concept: Concept } | undefined {
  const section = getSection(sectionSlug);
  if (!section) return undefined;
  const concept = section.concepts.find((c) => c.slug === conceptSlug);
  if (!concept) return undefined;
  return { section, concept };
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/curriculum.ts
git commit -m "feat: add curriculum registry with types and lookup helpers"
```

---

### Task 3: Build the home page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Build the home page**

Replace `src/app/page.tsx` with:

```tsx
import Link from "next/link";
import { curriculum } from "@/curriculum";

export default function Home() {
  return (
    <main className="max-w-[720px] mx-auto px-6 py-12">
      <h1 className="font-serif text-4xl mb-1 tracking-tight">
        Music Education
      </h1>
      <p className="text-[var(--text2)] mb-10">
        Interactive lessons in music theory.
      </p>

      <div className="space-y-4">
        {curriculum.map((section) => (
          <Link
            key={section.slug}
            href={`/${section.slug}`}
            className="block p-5 rounded-2xl bg-[var(--bg2)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
          >
            <div className="flex items-baseline justify-between">
              <h2 className="font-serif text-xl">{section.title}</h2>
              <span className="text-xs text-[var(--text3)]">
                {section.concepts.length}{" "}
                {section.concepts.length === 1 ? "lesson" : "lessons"}
              </span>
            </div>
            <p className="text-sm text-[var(--text2)] mt-1">
              {section.description}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify it renders**

```bash
npm run dev
```

Open `http://localhost:3000`. Confirm you see "Music Education" heading, the "Rhythm" section card with "1 lesson" badge and description. Click the card — it should navigate to `/rhythm` (which will 404 for now, that's expected). Kill the dev server.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: build home page listing sections from curriculum registry"
```

---

### Task 4: Build the section page (dynamic route)

**Files:**
- Create: `src/app/[section]/page.tsx`

- [ ] **Step 1: Create the section page**

Create `src/app/[section]/page.tsx`:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { curriculum, getSection } from "@/curriculum";

export function generateStaticParams() {
  return curriculum.map((s) => ({ section: s.slug }));
}

export default async function SectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section: sectionSlug } = await params;
  const section = getSection(sectionSlug);
  if (!section) notFound();

  return (
    <main className="max-w-[720px] mx-auto px-6 py-12">
      <Link
        href="/"
        className="text-sm text-[var(--text3)] hover:text-[var(--accent)] transition-colors"
      >
        &larr; Home
      </Link>

      <h1 className="font-serif text-3xl mt-4 mb-1 tracking-tight">
        {section.title}
      </h1>
      <p className="text-[var(--text2)] mb-8">{section.description}</p>

      <ol className="space-y-3">
        {section.concepts.map((concept, i) => (
          <li key={concept.slug}>
            <Link
              href={`/${section.slug}/${concept.slug}`}
              className="flex items-baseline gap-4 p-4 rounded-xl bg-[var(--bg2)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
            >
              <span className="font-serif text-lg text-[var(--text3)] w-6 text-right shrink-0">
                {i + 1}
              </span>
              <div>
                <h2 className="font-medium text-[0.95rem]">{concept.title}</h2>
                <p className="text-sm text-[var(--text2)] mt-0.5">
                  {concept.description}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </main>
  );
}
```

- [ ] **Step 2: Verify it renders**

```bash
npm run dev
```

Open `http://localhost:3000/rhythm`. Confirm you see "Rhythm" heading, back link to Home, and "1. Time Signatures" listed with description. Click the back link — should go to `/`. Click "Time Signatures" — will 404 for now. Try `/nonexistent` — should show Next.js 404 page. Kill the dev server.

- [ ] **Step 3: Commit**

```bash
git add src/app/\\[section\\]/page.tsx
git commit -m "feat: build dynamic section page listing concepts from registry"
```

---

### Task 5: Build the dynamic lesson resolver

**Files:**
- Create: `src/app/[section]/[concept]/page.tsx`

This is the dynamic route that validates the section/concept slug pair against the registry, then renders the lesson. For now it renders a placeholder — the actual time-signatures lesson component is built in Task 6.

- [ ] **Step 1: Create the lesson resolver page**

Create `src/app/[section]/[concept]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { curriculum, getConcept } from "@/curriculum";

export function generateStaticParams() {
  return curriculum.flatMap((s) =>
    s.concepts.map((c) => ({ section: s.slug, concept: c.slug }))
  );
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ section: string; concept: string }>;
}) {
  const { section: sectionSlug, concept: conceptSlug } = await params;
  const result = getConcept(sectionSlug, conceptSlug);
  if (!result) notFound();

  // Dynamic import of the lesson component based on section/concept slug
  let LessonComponent: React.ComponentType;
  try {
    const mod = await import(`@/lessons/${sectionSlug}/${conceptSlug}`);
    LessonComponent = mod.default;
  } catch {
    notFound();
  }

  return <LessonComponent />;
}
```

- [ ] **Step 2: Create the lessons directory with a placeholder**

Create `src/lessons/rhythm/time-signatures/index.tsx`:

```tsx
import Link from "next/link";

export default function TimeSignaturesLesson() {
  return (
    <div className="max-w-[720px] mx-auto px-6 py-12">
      <Link
        href="/rhythm"
        className="text-sm text-[var(--text3)] hover:text-[var(--accent)] transition-colors"
      >
        &larr; Rhythm
      </Link>
      <h1 className="font-serif text-3xl mt-4 mb-4">Time Signatures</h1>
      <p className="text-[var(--text2)]">Lesson content coming soon.</p>
    </div>
  );
}
```

- [ ] **Step 3: Verify the full navigation flow**

```bash
npm run dev
```

Open `http://localhost:3000`. Click "Rhythm" → click "Time Signatures". Confirm you see the placeholder lesson with the back link to Rhythm. Click the back link — should return to the section page. Try `/rhythm/nonexistent` — should show 404. Try `/nonexistent/anything` — should show 404. Kill the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/app/\\[section\\]/\\[concept\\]/page.tsx src/lessons/rhythm/time-signatures/index.tsx
git commit -m "feat: add dynamic lesson resolver with placeholder time-signatures lesson"
```

---

### Task 6: Port the time-signatures interactive lesson

**Files:**
- Modify: `src/lessons/rhythm/time-signatures/index.tsx`

This ports the existing vanilla HTML/JS lesson into a React component. The lesson is a client component (needs Web Audio API, DOM interaction, state).

- [ ] **Step 1: Port the full interactive lesson**

Replace `src/lessons/rhythm/time-signatures/index.tsx` with the full React port:

```tsx
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";

const SIGS: Record<
  string,
  { m: string; d: string; a: number[]; g: number[] }
> = {
  "4/4": {
    m: "4 quarter-note beats per measure",
    d: "The default pulse of pop, rock, hip-hop, and most Western music.",
    a: [3, 1, 2, 1],
    g: [4],
  },
  "3/4": {
    m: "3 quarter-note beats per measure",
    d: "Waltz time — a lilting ONE-two-three cycle.",
    a: [3, 1, 1],
    g: [3],
  },
  "6/8": {
    m: "6 eighth-note beats per measure",
    d: "Compound duple — feels like 2 big swaying beats, each split into 3.",
    a: [3, 1, 1, 2, 1, 1],
    g: [3, 3],
  },
  "2/4": {
    m: "2 quarter-note beats per measure",
    d: "March time — LEFT-right, LEFT-right.",
    a: [3, 1],
    g: [2],
  },
  "5/4": {
    m: "5 quarter-note beats per measure",
    d: 'Odd meter, usually 3+2. Think "Take Five" by Dave Brubeck.',
    a: [3, 1, 1, 2, 1],
    g: [3, 2],
  },
  "7/8": {
    m: "7 eighth-note beats per measure",
    d: "Asymmetric groove (2+2+3) — Balkan folk, prog rock.",
    a: [3, 1, 2, 1, 3, 1, 1],
    g: [2, 2, 3],
  },
};

const SIG_KEYS = Object.keys(SIGS);
const STRONG = "#2E6FBA";
const MED = "#85B7EB";
const WEAK = "#C4C3BE";

function accentColor(a: number) {
  return a === 3 ? STRONG : a === 2 ? MED : WEAK;
}
function accentHeight(a: number) {
  return a === 3 ? 76 : a === 2 ? 56 : 40;
}

function buildBars(sig: (typeof SIGS)[string], top: number) {
  const measures = 2;
  const n = sig.a.length;
  const usable = 636;
  const mg = 24;
  const iw = (usable - (measures - 1) * mg) / measures;
  const bw = iw / n;
  const gap = 4;
  const rects: {
    idx: number;
    x: number;
    y: number;
    w: number;
    h: number;
    fill: string;
    label: number;
  }[] = [];
  const barLines: { x: number }[] = [];
  let x = 22;

  for (let m = 0; m < measures; m++) {
    let gi = 0;
    let gc = 0;
    for (let i = 0; i < n; i++) {
      const a = sig.a[i];
      const h = accentHeight(a);
      rects.push({
        idx: m * n + i,
        x,
        y: 96 - h,
        w: bw - gap,
        h,
        fill: accentColor(a),
        label: i + 1,
      });
      gc++;
      if (gc >= sig.g[gi] && gi < sig.g.length - 1) {
        x += bw + 3;
        gi++;
        gc = 0;
      } else {
        x += bw;
      }
    }
    if (m < measures - 1) {
      barLines.push({ x: x + 4 });
      x += mg;
    }
  }
  return { rects, barLines, total: n * measures };
}

export default function TimeSignaturesLesson() {
  const [sig, setSig] = useState("4/4");
  const [bpm, setBpm] = useState(100);
  const [playing, setPlaying] = useState(false);
  const [activeBeat, setActiveBeat] = useState(-1);

  const ctxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playingRef = useRef(false);
  const curRef = useRef(0);

  const current = SIGS[sig];
  const top = current.a.length;
  const bot = sig.includes("/8") ? 8 : 4;
  const { rects, barLines, total } = buildBars(current, top);

  const beep = useCallback(
    (accent: number) => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      try {
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = accent === 3 ? 1200 : accent === 2 ? 900 : 660;
        gain.gain.value = accent === 3 ? 0.6 : accent === 2 ? 0.35 : 0.18;
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        osc.start(t);
        osc.stop(t + 0.06);
      } catch {}
    },
    []
  );

  const tick = useCallback(() => {
    if (!playingRef.current) return;
    const s = SIGS[sig];
    const n = s.a.length;
    const tot = n * 2;
    const beatInMeasure = curRef.current % n;
    const accent = s.a[beatInMeasure];

    setActiveBeat(curRef.current % tot);
    beep(accent);

    const ms = bot === 8 ? 60000 / bpm / 1.5 : 60000 / bpm;
    curRef.current = (curRef.current + 1) % tot;
    timerRef.current = setTimeout(tick, ms);
  }, [sig, bpm, bot, beep]);

  const start = useCallback(() => {
    if (!ctxRef.current) {
      try {
        ctxRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      } catch {
        ctxRef.current = null;
      }
    }
    if (ctxRef.current?.state === "suspended") ctxRef.current.resume();

    playingRef.current = true;
    setPlaying(true);
    curRef.current = 0;
    tick();
  }, [tick]);

  const stop = useCallback(() => {
    playingRef.current = false;
    setPlaying(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    setActiveBeat(-1);
  }, []);

  useEffect(() => {
    return () => {
      playingRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const pickSig = (key: string) => {
    if (playing) stop();
    setSig(key);
  };

  const beatInMeasure = activeBeat >= 0 ? activeBeat % top : -1;

  return (
    <div
      className="min-h-screen"
      style={{
        fontFamily: "var(--font-sans), system-ui, sans-serif",
        background: "var(--bg)",
        color: "var(--text)",
      }}
    >
      <div className="max-w-[720px] mx-auto px-6 py-12">
        <Link
          href="/rhythm"
          className="text-sm hover:opacity-70 transition-opacity"
          style={{ color: "var(--text3)" }}
        >
          &larr; Rhythm
        </Link>

        <h1
          className="text-4xl mt-4 mb-1 tracking-tight"
          style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
        >
          Time signatures
        </h1>
        <p className="text-[1.05rem] mb-10" style={{ color: "var(--text2)" }}>
          An interactive guide to how rhythm is organized in music.
        </p>

        <h2
          className="text-2xl mt-10 mb-4"
          style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
        >
          What is a time signature?
        </h2>
        <p className="text-[0.95rem] mb-4 leading-relaxed">
          A time signature is the pair of stacked numbers you see at the start
          of a piece of sheet music. It answers two questions:{" "}
          <strong>how many beats</strong> are in each measure, and{" "}
          <strong>what kind of note</strong> gets one beat.
        </p>

        <div
          className="rounded-r-lg py-4 px-5 my-6 text-[0.92rem]"
          style={{
            background: "var(--accent-light)",
            borderLeft: "3px solid var(--accent)",
          }}
        >
          <strong>Top number</strong> = how many beats per measure.
          <br />
          <strong>Bottom number</strong> = which note value equals one beat (4 =
          quarter note, 8 = eighth note).
        </div>

        <p className="text-[0.95rem] mb-4 leading-relaxed">
          So <strong>3/4</strong> means &ldquo;three quarter-note beats per
          measure&rdquo; — that&rsquo;s waltz time. <strong>6/8</strong> means
          &ldquo;six eighth-note beats,&rdquo; but those six are usually felt as
          two big groups of three, giving it a swaying, compound feel.
        </p>

        <h2
          className="text-2xl mt-10 mb-4"
          style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
        >
          Strong and weak beats
        </h2>
        <p className="text-[0.95rem] mb-4 leading-relaxed">
          Not all beats are created equal. The first beat of every measure (the{" "}
          <strong>downbeat</strong>) is the strongest — it&rsquo;s where your
          foot lands hardest. Other beats are weaker, creating a recurring
          pattern of emphasis that defines the groove. A march (2/4) feels
          completely different from a waltz (3/4) because their accent patterns
          differ, even at the same tempo.
        </p>

        <h2
          className="text-2xl mt-10 mb-4"
          style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
        >
          Try it yourself
        </h2>
        <p className="text-[0.95rem] mb-4" style={{ color: "var(--text2)" }}>
          Pick a time signature, hit play, and listen to how the accent pattern
          changes. Adjust tempo to feel it at different speeds.
        </p>

        {/* ===== Interactive Metronome ===== */}
        <div
          className="rounded-2xl p-7 my-8"
          style={{ background: "var(--bg2)" }}
        >
          {/* Signature selector buttons */}
          <div className="flex flex-wrap gap-2 mb-5">
            {SIG_KEYS.map((key) => (
              <button
                key={key}
                onClick={() => pickSig(key)}
                className="px-4 py-1.5 rounded-lg text-[0.85rem] font-medium border transition-all cursor-pointer select-none"
                style={{
                  background:
                    sig === key ? "var(--accent)" : "var(--bg)",
                  color: sig === key ? "#fff" : "var(--text)",
                  borderColor:
                    sig === key ? "var(--accent)" : "var(--border)",
                }}
              >
                {key}
              </button>
            ))}
          </div>

          {/* Time signature display */}
          <div className="flex items-baseline gap-3.5 mb-4">
            <div
              className="flex flex-col items-center min-w-[44px] text-[2.6rem] leading-none"
              style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
            >
              <span>{top}</span>
              <span
                className="w-[30px] h-[2px] my-0.5"
                style={{ background: "var(--text)" }}
              />
              <span>{bot}</span>
            </div>
            <div>
              <p className="text-[0.95rem] font-medium">{current.m}</p>
              <p className="text-[0.82rem] mt-0.5" style={{ color: "var(--text2)" }}>
                {current.d}
              </p>
            </div>
          </div>

          {/* Beat counters */}
          <div className="flex justify-center gap-2 mb-3">
            {Array.from({ length: top }, (_, i) => (
              <span
                key={i}
                className="text-[1.6rem] min-w-[36px] text-center inline-block transition-all duration-[60ms]"
                style={{
                  fontFamily: "var(--font-serif), Georgia, serif",
                  color:
                    beatInMeasure === i
                      ? accentColor(current.a[i])
                      : "var(--text3)",
                  transform:
                    beatInMeasure === i ? "scale(1.25)" : "scale(1)",
                }}
              >
                {i + 1}
              </span>
            ))}
          </div>

          {/* SVG beat grid */}
          <svg width="100%" viewBox="0 0 680 120" role="img">
            <title>Beat visualization</title>
            <desc>Vertical bars representing beat accents</desc>
            {barLines.map((bl, i) => (
              <line
                key={`bl-${i}`}
                x1={bl.x}
                y1={10}
                x2={bl.x}
                y2={96}
                stroke="var(--text3)"
                strokeWidth={1.5}
                opacity={0.3}
              />
            ))}
            {rects.map((r) => (
              <g key={r.idx}>
                <rect
                  x={r.x}
                  y={r.y}
                  width={r.w}
                  height={r.h}
                  rx={4}
                  fill={r.fill}
                  opacity={activeBeat === r.idx ? 1 : 0.5}
                  style={{
                    transition: "opacity 60ms, transform 60ms",
                    transformOrigin: "center bottom",
                  }}
                />
                <text
                  x={r.x + r.w / 2}
                  y={110}
                  textAnchor="middle"
                  style={{ fontSize: "11px", fill: "var(--text2)" }}
                >
                  {r.label}
                </text>
              </g>
            ))}
          </svg>

          {/* Controls */}
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={() => (playing ? stop() : start())}
              className="px-5 py-2 rounded-lg text-[0.85rem] font-semibold border-none text-white cursor-pointer select-none transition-all active:scale-[0.97]"
              style={{ background: "var(--accent)" }}
            >
              {playing ? "Stop" : "Play"}
            </button>
            <label
              className="text-[0.8rem]"
              style={{ color: "var(--text2)" }}
            >
              Tempo
            </label>
            <input
              type="range"
              min={60}
              max={180}
              value={bpm}
              step={1}
              onChange={(e) => setBpm(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-[0.85rem] min-w-[28px] text-right">
              {bpm}
            </span>
            <label
              className="text-[0.8rem]"
              style={{ color: "var(--text2)" }}
            >
              bpm
            </label>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4">
            {[
              { color: STRONG, label: "Strong (downbeat)" },
              { color: MED, label: "Medium" },
              { color: WEAK, label: "Weak" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-1.5 text-[0.78rem]"
                style={{ color: "var(--text2)" }}
              >
                <span
                  className="w-3 h-3 rounded-sm inline-block"
                  style={{ background: item.color }}
                />
                {item.label}
              </div>
            ))}
          </div>
        </div>

        {/* Remaining educational content */}
        <h2
          className="text-2xl mt-10 mb-4"
          style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
        >
          Common time signatures
        </h2>

        <p className="text-[0.95rem] mb-4 leading-relaxed">
          <strong>4/4 — &ldquo;common time&rdquo;</strong>
          <br />
          Four quarter-note beats. The backbone of rock, pop, funk, hip-hop,
          electronic, and most Western music. If you&rsquo;re tapping your foot
          to a song, odds are it&rsquo;s in 4/4.
        </p>

        <p className="text-[0.95rem] mb-4 leading-relaxed">
          <strong>3/4 — waltz time</strong>
          <br />
          Three quarter-note beats: ONE-two-three, ONE-two-three. This gives
          music a lilting, dance-like sway. Think waltzes, many folk songs, and
          ballads.
        </p>

        <p className="text-[0.95rem] mb-4 leading-relaxed">
          <strong>6/8 — compound duple</strong>
          <br />
          Six eighth notes grouped in two sets of three. It feels like two big
          beats, each subdivided into three — creating a rolling, swaying
          quality. Common in Irish jigs, blues, and ballads.
        </p>

        <p className="text-[0.95rem] mb-4 leading-relaxed">
          <strong>2/4 — march time</strong>
          <br />
          Two quarter-note beats: LEFT-right, LEFT-right. Simple, driving, and
          forward-moving. Polkas and marches live here.
        </p>

        <h2
          className="text-2xl mt-10 mb-4"
          style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
        >
          Odd meters
        </h2>
        <p className="text-[0.95rem] mb-4 leading-relaxed">
          Once you leave the comfort of 2, 3, and 4, things get interesting. Odd
          time signatures like 5/4 and 7/8 divide beats into asymmetric groups —
          creating grooves that feel slightly &ldquo;off&rdquo; in the best way.
        </p>

        <p className="text-[0.95rem] mb-4 leading-relaxed">
          <strong>5/4</strong> is usually felt as 3+2 or 2+3. Dave
          Brubeck&rsquo;s &ldquo;Take Five&rdquo; is the classic example — that
          distinctive, swinging-but-uneven groove.
        </p>

        <p className="text-[0.95rem] mb-4 leading-relaxed">
          <strong>7/8</strong> is often grouped 2+2+3 or 3+2+2. It shows up
          throughout Balkan folk music, progressive rock, and film scores. Once
          you start hearing it, you&rsquo;ll notice it everywhere.
        </p>

        <div
          className="rounded-r-lg py-4 px-5 my-6 text-[0.92rem]"
          style={{
            background: "var(--accent-light)",
            borderLeft: "3px solid var(--accent)",
          }}
        >
          <strong>The bottom line:</strong> A time signature is just a way of
          telling musicians how to count. The top number says how high to count,
          the bottom number says what you&rsquo;re counting. Everything else —
          the groove, the feel, the swing — comes from how musicians interpret
          that pattern.
        </div>

        <div
          className="mt-12 pt-6 text-[0.8rem]"
          style={{
            borderTop: "1px solid var(--border)",
            color: "var(--text3)",
          }}
        >
          Made as an interactive lesson. Open in any browser.
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the full lesson works**

```bash
npm run dev
```

Open `http://localhost:3000/rhythm/time-signatures`. Test the following:

1. All 6 time signature buttons switch the display (4/4, 3/4, 6/8, 2/4, 5/4, 7/8)
2. Click Play — the metronome ticks, beat grid highlights in sequence, counters pulse
3. Click Stop — animation and sound stop, all beats reset to dim
4. Move the tempo slider — BPM value updates
5. Switch time signatures while playing — should stop and reset
6. Back link ("← Rhythm") navigates to the section page
7. Dark mode works (toggle system preference or use browser devtools)
8. The educational text content matches the original HTML lesson

Kill the dev server.

- [ ] **Step 3: Commit**

```bash
git add src/lessons/rhythm/time-signatures/index.tsx
git commit -m "feat: port time-signatures interactive lesson to React"
```

---

### Task 7: Create documentation and CLAUDE.md

**Files:**
- Create: `CLAUDE.md`
- Create: `docs/curriculum-registry.md`

- [ ] **Step 1: Create CLAUDE.md**

Create `CLAUDE.md` at the project root:

```markdown
# Music Education Webapp

## Project Structure

- `src/curriculum.ts` — Central curriculum registry. Single source of truth for all sections, concepts, and lesson metadata.
- `src/app/` — Next.js App Router pages. Dynamic routes `[section]` and `[concept]` resolve against the registry.
- `src/lessons/` — Interactive lesson components organized by `section/concept/`.

## Critical Rule: Curriculum Registry

**Every new lesson MUST be registered in `src/curriculum.ts`.**

When adding a new lesson:
1. Add the concept entry to the appropriate section in `src/curriculum.ts` (slug, title, description)
2. Create the lesson component at `src/lessons/[section]/[concept]/index.tsx`
3. The home page and section pages auto-update from the registry

See `docs/curriculum-registry.md` for full documentation.

## Conventions

- Lessons are fully standalone — no shared layout or shell. Each lesson owns its entire page.
- Only convention per lesson: include a back link to the parent section in the top-left.
- Lessons are client components (`"use client"`) when they need interactivity.
- Array order in the curriculum registry = learning progression = display order.

## Stack

- Next.js 14+ (App Router), React, TypeScript, Tailwind CSS
- No backend, no auth, no database

## Commands

- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run lint` — Run ESLint
```

- [ ] **Step 2: Create curriculum registry documentation**

Create `docs/curriculum-registry.md`:

```markdown
# Curriculum Registry

The curriculum registry (`src/curriculum.ts`) is the single source of truth for all content in the music education webapp. It defines sections, concepts, their ordering, and metadata.

## Structure

```typescript
type Concept = {
  slug: string;       // URL segment — must match the folder name in src/lessons/
  title: string;      // Display name shown in navigation
  description: string; // One-liner shown in section listing
};

type Section = {
  slug: string;       // URL segment
  title: string;      // Display name
  description: string; // Shown on the home page
  concepts: Concept[]; // Ordered list — array position = learning progression
};
```

## Adding a New Lesson

1. **Register it** — Add a `Concept` entry to the appropriate section's `concepts` array in `src/curriculum.ts`. Position it in the array where it belongs in the learning progression.

2. **Create the component** — Create `src/lessons/[section-slug]/[concept-slug]/index.tsx`. This is a React component that renders the entire lesson page.

3. **Done** — The home page, section page, and routing automatically pick up the new entry.

### Example

To add a "Note Values" lesson to the Rhythm section:

```typescript
// src/curriculum.ts
{
  slug: "rhythm",
  title: "Rhythm",
  description: "How music is organized in time.",
  concepts: [
    { slug: "time-signatures", title: "Time Signatures", description: "How beats are grouped into measures." },
    { slug: "note-values", title: "Note Values", description: "How long each note lasts." },  // ← new
  ],
}
```

Then create `src/lessons/rhythm/note-values/index.tsx` with your lesson component.

## Adding a New Section

Add a new `Section` entry to the `curriculum` array in `src/curriculum.ts`. No new route files are needed — the dynamic routes handle it automatically.

## Conventions

- **Slugs** must be lowercase, kebab-case, and match the folder name in `src/lessons/`.
- **Order matters** — array position determines display order and learning progression.
- **Lessons are standalone** — each lesson component owns its full page. No shared shell is imposed. The only convention is a back link (`← Section Title`) in the top-left.
- **Client components** — lessons that need interactivity (most of them) should use `"use client"` at the top.
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md docs/curriculum-registry.md
git commit -m "docs: add CLAUDE.md and curriculum registry documentation"
```

---

### Task 8: Final verification

- [ ] **Step 1: Run the build**

```bash
npm run build
```

Expected: builds successfully with no errors. The dynamic routes should generate static pages for the known paths.

- [ ] **Step 2: Run the full navigation flow one more time**

```bash
npm run dev
```

Walk the full flow:
1. `http://localhost:3000` — Home page shows "Rhythm" section with "1 lesson"
2. Click "Rhythm" → `/rhythm` — shows numbered concept list
3. Click "Time Signatures" → `/rhythm/time-signatures` — full interactive lesson
4. Test metronome: play, stop, switch signatures, adjust tempo
5. Back link returns to section page
6. Try invalid URLs (`/foo`, `/rhythm/foo`) — both show 404

Kill the dev server.

- [ ] **Step 3: Final commit if any cleanup was needed**

```bash
git status
```

If there are any uncommitted changes from fixes, commit them:

```bash
git add .
git commit -m "chore: final cleanup after verification"
```
