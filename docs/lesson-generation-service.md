# Lesson Generation Service

The lesson generation service turns source material (text, URLs, PDFs) into interactive React lesson components via the Claude API, stores them in PostgreSQL, and serves them to the frontend for dynamic rendering.

## Architecture

```
┌─────────────────────┐     ┌──────────────────────┐     ┌────────────┐
│  Next.js Frontend   │────▶│  FastAPI Backend      │────▶│ PostgreSQL │
│  (Railway)          │     │  (Railway)            │     │ (Railway)  │
│                     │     │                       │     │            │
│  interactive-       │     │  lesson-generator-    │     │  Internal  │
│  education-         │     │  production.up.       │     │  only      │
│  production.up.     │     │  railway.app          │     │            │
│  railway.app        │     │                       │     │            │
└─────────────────────┘     └──────────────────────┘     └────────────┘
```

**Railway Project:** https://railway.com/project/7b29df88-bb13-4a26-984d-291d62c45f1c

## Services

| Service | Type | URL |
|---------|------|-----|
| `interactive-education` | Next.js frontend | https://interactive-education-production.up.railway.app |
| `lesson-generator` | FastAPI backend | https://lesson-generator-production.up.railway.app |
| `Postgres` | PostgreSQL database | Internal (`postgres.railway.internal:5432`) |

## Environment Variables

### lesson-generator (FastAPI)

| Variable | Description | Source |
|----------|-------------|--------|
| `ANTHROPIC_API_KEY` | Claude API key for lesson generation | Set manually |
| `DATABASE_URL` | PostgreSQL connection string | Railway Postgres reference (`${{Postgres.DATABASE_URL}}`) |
| `PORT` | Server port (8000) | Set manually |

### interactive-education (Next.js)

| Variable | Description | Value |
|----------|-------------|-------|
| `NEXT_PUBLIC_GENERATOR_API_URL` | URL to the lesson-generator API | `https://lesson-generator-production.up.railway.app` |

## API Endpoints

### Health
```
GET /
→ { "service": "lesson-generator", "status": "ok" }
```

### Generation
```
POST /api/generate
Body: { "source_type": "text"|"url", "content": "...", "subject_slug": "community" }
→ { "job_id": "uuid", "status": "pending" }

POST /api/generate/pdf
Body: multipart/form-data with file + subject_slug
→ { "job_id": "uuid", "status": "pending" }
```

### Job Status
```
GET /api/jobs/{job_id}
→ { "job_id": "...", "status": "pending"|"processing"|"complete"|"failed", "progress": {...}, "error": null }
```

### Lessons
```
GET /api/lessons?subject={slug}&section={slug}
→ [{ "id", "subject_slug", "section_slug", "concept_slug", "title", "description", "code", "version", "source_excerpt" }]

GET /api/lessons/{lesson_id}
→ single lesson object
```

### Curriculums
```
GET /api/curriculums?subject={slug}
→ [{ "id", "subject_slug", "structure": { title, slug, description, type, concepts: [...] } }]
```

## Generation Pipeline

When a user submits source material, the pipeline runs as a background task:

```
1. INGEST
   - text: use as-is
   - url: fetch page, extract with BeautifulSoup
   - pdf: extract text with PyPDF2

2. DECOMPOSE (Claude API)
   - Input: extracted text
   - Output: JSON curriculum structure with sections and concepts

3. GENERATE (Claude API, per concept)
   - Input: concept metadata + relevant source excerpt + style guide
   - Output: TSX component code (string)
   - Also generates an overview lesson for the section

4. STORE (PostgreSQL)
   - Saves source material, curriculum structure, and lesson code
   - Each lesson is versioned with is_current flag
```

## Database Schema

```sql
sources     — uploaded text/url/pdf content
curriculums — generated curriculum structures (JSON)
lessons     — individual TSX lesson components (code as text)
jobs        — generation job tracking with progress
```

See `services/lesson-generator/models.py` for the full SQLAlchemy models.

## Dynamic Rendering

Generated lessons are stored as TSX code strings. The frontend renders them client-side:

1. Fetch the code string from the API
2. Strip `"use client"` and `import` statements
3. Transform TSX to JavaScript using **Sucrase**
4. Create a `Function` with React and hooks in scope
5. Render the resulting component

This is handled by `src/components/dynamic-lesson.tsx`.

## Deployment

### Deploying the lesson-generator (FastAPI)

From the project root:
```bash
railway service link lesson-generator
railway up --service lesson-generator --path-as-root services/lesson-generator
```

The `--path-as-root` flag is required because the FastAPI service lives in a subdirectory. Without it, Railway uploads the entire repo and tries to build it as a Next.js app.

### Deploying the frontend (Next.js)

The frontend is deployed via Railway's GitHub integration or manual upload:
```bash
railway service link interactive-education
railway redeploy --service interactive-education --yes
```

If `NEXT_PUBLIC_GENERATOR_API_URL` changes, the frontend must be redeployed since `NEXT_PUBLIC_` variables are baked in at build time.

## File Structure

```
services/
  lesson-generator/
    main.py           # FastAPI app, all endpoints
    pipeline.py       # Ingest → Decompose → Generate → Store
    ingestion.py      # Text/URL/PDF extraction
    prompts.py        # Claude API prompt templates + style guide
    models.py         # SQLAlchemy models (Source, Curriculum, Lesson, Job)
    database.py       # Async PostgreSQL connection
    requirements.txt  # Python dependencies
    Dockerfile        # Python 3.12-slim, uvicorn
    railway.json      # Railway deploy config

src/
  app/generate/page.tsx         # Generation UI (submit, poll, view results)
  components/dynamic-lesson.tsx # Client-side TSX renderer
  lib/api.ts                    # API client for the generation service
```

## Troubleshooting

- **502 from lesson-generator:** Check `railway service logs --service lesson-generator`. Common causes: PORT not expanding (must use shell-form CMD in Dockerfile), database connection timeout.
- **Frontend not reaching API:** Verify `NEXT_PUBLIC_GENERATOR_API_URL` is set on the `interactive-education` service. Redeploy frontend after changing it.
- **Database init fails:** The service logs a warning and continues. Tables are created lazily. Check `DATABASE_URL` uses `postgresql+asyncpg://` prefix.
- **Deploy uploads wrong files:** Always use `--path-as-root services/lesson-generator` when deploying the API. Without it, Railway sees the repo root and builds Next.js.
