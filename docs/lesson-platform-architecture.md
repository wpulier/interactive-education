# Lesson Platform Architecture

## The Core Idea

Every interactive lesson is a **code file** — a self-contained React component, similar to Anthropic's Artifacts. The lesson IS the code. This is the fundamental insight that makes the entire system work:

- **Lessons can be dramatically augmented** without risking the wider system — each lesson is an isolated component
- **Every version is saved** — mess up an edit, roll back instantly
- **Editing is just code modification** — an agent reads the current file, modifies it, saves a new version
- **Display is already solved** — the existing lesson viewer (tabs, progress, prev/next) wraps any component automatically

The platform has three independent subsystems that build on this foundation:

```
Sources → [Generation Service] → Lesson Files → [Dynamic Serving] → Display
                                       ↕
                                 [Lesson Editor]
                                 (agent + versioning)
```

---

## Sub-project 1: Lesson Generation Service

**What it does:** Takes source material and produces structured curriculum + interactive React lesson components.

**Input:** Any combination of:
- Text (pasted, uploaded docs, PDFs)
- URLs (articles, Wikipedia pages)
- YouTube videos (transcripts)
- Books/chapters (uploaded files)
- User notes, images, outlines

**Output:** A structured package:
- Curriculum structure (sections, concepts, ordering) matching our data model
- One React component (`.tsx` file) per concept — each a standalone interactive lesson
- Source mapping — which parts of the original material back each lesson

**Pipeline:**

```
1. INGEST     → Normalize all source material into text/structured content
2. DECOMPOSE  → Claude API analyzes the source → produces curriculum structure
                 (sections, concepts, ordering, descriptions)
3. GENERATE   → For each concept, Claude API generates a React lesson component
                 with interactive elements, educational content, callouts
4. VALIDATE   → Type-check the generated components, verify they compile
5. STORE      → Save lesson files + curriculum + source mappings
```

### Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **API** | **FastAPI** (Python) | Best-in-class for async pipelines, Claude SDK is excellent in Python, easy job management |
| **Job Queue** | **Redis + Celery** (or **FastAPI BackgroundTasks** for MVP) | Book-length sources need long processing — can't block the request. Jobs report progress |
| **AI** | **Claude API** (Anthropic SDK) | Generates both the curriculum structure (JSON) and the lesson components (TSX code) |
| **File Processing** | **PyPDF2**, **youtube-transcript-api**, **BeautifulSoup** | Extract text from PDFs, YouTube transcripts, web pages |
| **Validation** | **TypeScript compiler** (subprocess) | Type-check generated `.tsx` files before storing |
| **Hosting** | **Railway** | Simple deployment, persistent storage, scales horizontally for workers |

### Claude API Usage

Two-phase generation with structured outputs:

**Phase 1 — Decomposition** (one call):
```
Input:  Source material (full text or chunked)
Prompt: "Analyze this material. Produce a curriculum structure."
Output: JSON → { sections: [{ title, slug, description, type, concepts: [...] }] }
```

**Phase 2 — Lesson Generation** (one call per concept):
```
Input:  Concept metadata + relevant source excerpt + style guide
Prompt: "Create an interactive React lesson component for this concept."
Output: TSX code → a complete React component matching our lesson conventions
```

The style guide includes our conventions: use CSS variables for theming, Web Audio API for sound, SVG for visualizations, `"use client"` directive, no back links (layout handles it).

### Processing Times

- Single concept lesson: ~30 seconds
- Full chapter breakdown (10 concepts): ~5-8 minutes
- Full book (30+ chapters): ~30-60 minutes (parallelizable across concepts)

---

## Sub-project 2: Dynamic Lesson Serving

**What it does:** Stores and serves community-generated lessons dynamically, with versioning and source backing.

**The problem:** Right now, lessons are static `.tsx` files committed to the git repo. This works for curated content but doesn't scale for community-generated lessons. We need:

- **Dynamic storage** — lessons stored in a database, not the repo
- **Versioning** — every edit creates a new version, previous versions are accessible
- **Source backing** — each lesson links to the source material it was generated from, users can "flip" between the lesson and its source

### How Lessons Are Stored

Each lesson record:
```
{
  id: string
  subject_slug: string
  section_slug: string
  concept_slug: string
  version: number
  code: string              // The full TSX component source code
  source_id: string         // Reference to the source material
  created_at: timestamp
  created_by: string        // User ID (future auth)
  is_current: boolean       // Which version is active
}
```

Each source record:
```
{
  id: string
  type: "text" | "url" | "pdf" | "youtube" | "book"
  title: string
  content: string           // Extracted text
  original_url?: string     // If from URL/YouTube
  original_file?: string    // If uploaded
  metadata: {}              // Author, year, etc.
}
```

### Serving Dynamic Lessons

The Next.js app needs to serve both:
- **Static lessons** (committed to repo) — existing behavior, fast
- **Dynamic lessons** (from database) — community content, rendered at runtime

The concept page resolver checks: does a static file exist? If yes, use it. If no, fetch from the database. Dynamic lessons are rendered using a **sandboxed component renderer** — the stored TSX code is compiled and executed client-side (similar to how Artifacts work).

### Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Database** | **PostgreSQL** (via Supabase or Railway) | Structured data, versioning queries, JSON support for metadata |
| **ORM** | **Drizzle** or **Prisma** | Type-safe database access from Next.js |
| **Component Runtime** | **SWC** or **Sucrase** (client-side TSX→JS) | Compile stored TSX code to executable JavaScript at runtime |
| **File Storage** | **S3 / Supabase Storage** | Store uploaded source files (PDFs, images) |
| **API** | **Next.js API routes** or **tRPC** | Serve lesson data to the frontend |

### The "Flip" UX — Source Backing

Every community lesson has a split view or toggle:
- **Lesson view** — the interactive lesson (default)
- **Source view** — the original material this lesson was generated from

For a chapter of Origin of Species: the lesson view teaches the concept interactively, the source view shows the actual chapter text. For a YouTube video: the source view embeds the video. This creates transparency — you can always see what the lesson is based on.

---

## Sub-project 3: Lesson Editor

**What it does:** Lets users modify lessons by talking to an AI agent that has access to the lesson's code file.

**The flow:**
```
User: "Make the diagram bigger and add a quiz at the end"
  → Agent reads current lesson code (the TSX component)
  → Agent modifies the code
  → New version is saved (old version preserved)
  → Lesson in the app updates to show the new version
```

This is essentially **Artifacts-style editing** scoped to a single lesson component. The agent sees one file, modifies it, and the change is live.

### Key Design Decisions

- **Each edit = new version** — never overwrite. Version history is always available.
- **Agent sees only the lesson file** — isolated context, can't break other lessons or the framework
- **Preview before publish** — show the edited version side-by-side with current before making it live
- **Rollback** — one click to revert to any previous version

### Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Agent** | **Claude API** with tool use | Reads the current lesson code, produces modified version |
| **Chat Interface** | **React chat component** (in the app) | User talks to the agent in-context while viewing the lesson |
| **Versioning** | **PostgreSQL** (same as Sub-project 2) | Each edit inserts a new version row |
| **Preview** | **Client-side TSX compiler** (same as Sub-project 2) | Render the edited version before publishing |

---

## Build Order

```
Sub-project 1 (Generation)  →  Must exist first. It produces the lesson files.
         ↓
Sub-project 2 (Serving)     →  Needed to serve generated lessons dynamically.
         ↓
Sub-project 3 (Editor)      →  Builds on the versioning and rendering from Sub-project 2.
```

Sub-project 1 can be built and tested independently — it produces files that can be manually added to the repo. Sub-project 2 is needed before community features go live. Sub-project 3 is the final polish.

---

## Unified Tech Stack Summary

| Concern | Technology |
|---------|-----------|
| **Frontend** | Next.js 14+ (App Router), React, TypeScript, Tailwind CSS |
| **Generation API** | FastAPI (Python), hosted on Railway |
| **AI** | Claude API (Anthropic SDK) — both generation and editing |
| **Job Queue** | Redis + Celery (or BackgroundTasks for MVP) |
| **Database** | PostgreSQL (Supabase or Railway Postgres) |
| **ORM** | Drizzle or Prisma |
| **File Storage** | S3 or Supabase Storage |
| **Runtime Rendering** | Client-side TSX compiler (SWC/Sucrase) for dynamic lessons |
| **Source Processing** | PyPDF2, youtube-transcript-api, BeautifulSoup |
| **Deployment** | Vercel (frontend), Railway (API + workers + database) |

---

## What Stays The Same

The existing framework is untouched:
- `src/registry.ts` — subjects
- `src/subjects/*/curriculum.ts` — curated content
- `src/app/` — routing, lesson viewer, tabs, progress, nav
- Static lessons in `src/subjects/*/lessons/` — curated, committed to repo

Community lessons live alongside this system but are served dynamically from the database. The lesson viewer wraps both static and dynamic lessons identically — the user can't tell the difference.
