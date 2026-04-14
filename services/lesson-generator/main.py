"""Lesson Generation Service — FastAPI application."""

import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db, init_db, SessionLocal
from models import Job, Lesson, Curriculum, Source
from pipeline import run_pipeline


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="Lesson Generator", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Request/Response models ---


class GenerateTextRequest(BaseModel):
    source_type: str  # "text" or "url"
    content: str
    subject_slug: str


class JobResponse(BaseModel):
    job_id: str
    status: str


class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    progress: dict
    error: str | None = None


class LessonResponse(BaseModel):
    id: str
    subject_slug: str
    section_slug: str
    concept_slug: str
    title: str
    description: str | None
    code: str
    version: int
    source_excerpt: str | None


class CurriculumResponse(BaseModel):
    id: str
    subject_slug: str
    structure: dict


# --- Background task wrapper ---


async def _run_pipeline_bg(
    job_id: str,
    source_type: str,
    content: str,
    subject_slug: str,
    file_bytes: bytes | None = None,
):
    """Run pipeline in background with its own DB session."""
    async with SessionLocal() as db:
        await run_pipeline(db, job_id, source_type, content, subject_slug, file_bytes)


# --- Endpoints ---


@app.get("/")
async def root():
    return {"service": "lesson-generator", "status": "ok"}


@app.post("/api/generate", response_model=JobResponse)
async def generate_from_text(
    request: GenerateTextRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Start lesson generation from text or URL source."""
    if request.source_type not in ("text", "url"):
        raise HTTPException(400, "source_type must be 'text' or 'url'")

    job = Job(id=uuid.uuid4(), status="pending", progress={"stage": "queued"})
    db.add(job)
    await db.commit()

    background_tasks.add_task(
        _run_pipeline_bg,
        str(job.id),
        request.source_type,
        request.content,
        request.subject_slug,
    )

    return JobResponse(job_id=str(job.id), status="pending")


@app.post("/api/generate/pdf", response_model=JobResponse)
async def generate_from_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    subject_slug: str = Form(...),
    db: AsyncSession = Depends(get_db),
):
    """Start lesson generation from a PDF upload."""
    file_bytes = await file.read()

    job = Job(id=uuid.uuid4(), status="pending", progress={"stage": "queued"})
    db.add(job)
    await db.commit()

    background_tasks.add_task(
        _run_pipeline_bg,
        str(job.id),
        "pdf",
        file.filename or "uploaded.pdf",
        subject_slug,
        file_bytes,
    )

    return JobResponse(job_id=str(job.id), status="pending")


@app.get("/api/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str, db: AsyncSession = Depends(get_db)):
    """Get the status of a generation job."""
    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return JobStatusResponse(
        job_id=str(job.id),
        status=job.status,
        progress=job.progress or {},
        error=job.error,
    )


@app.get("/api/lessons/{lesson_id}", response_model=LessonResponse)
async def get_lesson(lesson_id: str, db: AsyncSession = Depends(get_db)):
    """Get a single lesson by ID."""
    lesson = await db.get(Lesson, lesson_id)
    if not lesson:
        raise HTTPException(404, "Lesson not found")
    return _lesson_to_response(lesson)


@app.get("/api/lessons", response_model=list[LessonResponse])
async def list_lessons(
    subject: str | None = None,
    section: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """List lessons, optionally filtered by subject and section."""
    query = select(Lesson).where(Lesson.is_current == True)
    if subject:
        query = query.where(Lesson.subject_slug == subject)
    if section:
        query = query.where(Lesson.section_slug == section)
    query = query.order_by(Lesson.created_at)

    result = await db.execute(query)
    lessons = result.scalars().all()
    return [_lesson_to_response(l) for l in lessons]


@app.get("/api/curriculums", response_model=list[CurriculumResponse])
async def list_curriculums(
    subject: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """List curriculum structures, optionally filtered by subject."""
    query = select(Curriculum)
    if subject:
        query = query.where(Curriculum.subject_slug == subject)
    query = query.order_by(Curriculum.created_at.desc())

    result = await db.execute(query)
    curriculums = result.scalars().all()
    return [
        CurriculumResponse(id=str(c.id), subject_slug=c.subject_slug, structure=c.structure)
        for c in curriculums
    ]


def _lesson_to_response(lesson: Lesson) -> LessonResponse:
    return LessonResponse(
        id=str(lesson.id),
        subject_slug=lesson.subject_slug,
        section_slug=lesson.section_slug,
        concept_slug=lesson.concept_slug,
        title=lesson.title,
        description=lesson.description,
        code=lesson.code,
        version=lesson.version,
        source_excerpt=lesson.source_excerpt,
    )
