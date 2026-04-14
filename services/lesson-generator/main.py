"""Lesson Generation Service — FastAPI application."""

import os
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, Header, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db, init_db, SessionLocal
from models import Job, Lesson, Curriculum, Source
from pipeline import run_pipeline


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await init_db()
    except Exception as e:
        print(f"[WARNING] init_db failed: {e}")
    yield


app = FastAPI(title="Lesson Generator", lifespan=lifespan)

ALLOWED_ORIGINS = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:3000",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
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
    user_id: str | None = None
    user_name: str | None = None


class CurriculumResponse(BaseModel):
    id: str
    subject_slug: str
    structure: dict
    user_id: str | None = None
    user_name: str | None = None
    created_at: str | None = None
    lesson_count: int | None = None


# --- Background task wrapper ---


async def _run_pipeline_bg(
    job_id: str,
    source_type: str,
    content: str,
    subject_slug: str,
    file_bytes: bytes | None = None,
    user_id: str | None = None,
    user_name: str | None = None,
):
    """Run pipeline in background with its own DB session."""
    async with SessionLocal() as db:
        await run_pipeline(db, job_id, source_type, content, subject_slug, file_bytes, user_id, user_name)


# --- Endpoints ---


@app.get("/")
async def root():
    return {"service": "lesson-generator", "status": "ok"}


@app.post("/api/generate", response_model=JobResponse)
async def generate_from_text(
    request: GenerateTextRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    x_user_id: str | None = Header(None),
    x_user_name: str | None = Header(None),
):
    """Start lesson generation from text or URL source."""
    if request.source_type not in ("text", "url"):
        raise HTTPException(400, "source_type must be 'text' or 'url'")

    job = Job(id=uuid.uuid4(), status="pending", progress={"stage": "queued"}, user_id=x_user_id)
    db.add(job)
    await db.commit()

    background_tasks.add_task(
        _run_pipeline_bg,
        str(job.id),
        request.source_type,
        request.content,
        request.subject_slug,
        None,
        x_user_id,
        x_user_name,
    )

    return JobResponse(job_id=str(job.id), status="pending")


@app.post("/api/generate/pdf", response_model=JobResponse)
async def generate_from_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    subject_slug: str = Form(...),
    db: AsyncSession = Depends(get_db),
    x_user_id: str | None = Header(None),
    x_user_name: str | None = Header(None),
):
    """Start lesson generation from a PDF upload."""
    file_bytes = await file.read()

    job = Job(id=uuid.uuid4(), status="pending", progress={"stage": "queued"}, user_id=x_user_id)
    db.add(job)
    await db.commit()

    background_tasks.add_task(
        _run_pipeline_bg,
        str(job.id),
        "pdf",
        file.filename or "uploaded.pdf",
        subject_slug,
        file_bytes,
        x_user_id,
        x_user_name,
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

    # Get lesson counts per curriculum
    count_query = (
        select(Lesson.curriculum_id, func.count(Lesson.id))
        .where(Lesson.is_current == True)
        .group_by(Lesson.curriculum_id)
    )
    count_result = await db.execute(count_query)
    counts = dict(count_result.all())

    return [
        CurriculumResponse(
            id=str(c.id),
            subject_slug=c.subject_slug,
            structure=c.structure,
            user_id=c.user_id,
            user_name=c.user_name,
            created_at=c.created_at.isoformat() if c.created_at else None,
            lesson_count=counts.get(c.id, 0),
        )
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
        user_id=lesson.user_id,
        user_name=lesson.user_name,
    )


# --- User-specific endpoints ---


class UserJobResponse(BaseModel):
    job_id: str
    status: str
    progress: dict
    error: str | None = None
    created_at: str
    completed_at: str | None = None


@app.get("/api/users/{user_id}/jobs", response_model=list[UserJobResponse])
async def list_user_jobs(user_id: str, db: AsyncSession = Depends(get_db)):
    """List all jobs for a specific user."""
    result = await db.execute(
        select(Job).where(Job.user_id == user_id).order_by(Job.created_at.desc())
    )
    jobs = result.scalars().all()
    return [
        UserJobResponse(
            job_id=str(j.id),
            status=j.status,
            progress=j.progress or {},
            error=j.error,
            created_at=j.created_at.isoformat() if j.created_at else "",
            completed_at=j.completed_at.isoformat() if j.completed_at else None,
        )
        for j in jobs
    ]


@app.get("/api/users/{user_id}/curriculums", response_model=list[CurriculumResponse])
async def list_user_curriculums(user_id: str, db: AsyncSession = Depends(get_db)):
    """List all curriculums created by a specific user."""
    result = await db.execute(
        select(Curriculum).where(Curriculum.user_id == user_id).order_by(Curriculum.created_at.desc())
    )
    curriculums = result.scalars().all()

    # Get lesson counts per curriculum
    curriculum_ids = [c.id for c in curriculums]
    if curriculum_ids:
        count_query = (
            select(Lesson.curriculum_id, func.count(Lesson.id))
            .where(Lesson.is_current == True, Lesson.curriculum_id.in_(curriculum_ids))
            .group_by(Lesson.curriculum_id)
        )
        count_result = await db.execute(count_query)
        counts = dict(count_result.all())
    else:
        counts = {}

    return [
        CurriculumResponse(
            id=str(c.id),
            subject_slug=c.subject_slug,
            structure=c.structure,
            user_id=c.user_id,
            user_name=c.user_name,
            created_at=c.created_at.isoformat() if c.created_at else None,
            lesson_count=counts.get(c.id, 0),
        )
        for c in curriculums
    ]


@app.get("/api/users/{user_id}/lessons", response_model=list[LessonResponse])
async def list_user_lessons(user_id: str, db: AsyncSession = Depends(get_db)):
    """List all lessons created by a specific user."""
    result = await db.execute(
        select(Lesson)
        .where(Lesson.user_id == user_id, Lesson.is_current == True)
        .order_by(Lesson.created_at.desc())
    )
    lessons = result.scalars().all()
    return [_lesson_to_response(l) for l in lessons]


class CommunityLessonResponse(BaseModel):
    id: str
    subject_slug: str
    section_slug: str
    concept_slug: str
    title: str
    description: str | None
    user_name: str | None
    created_at: str


@app.get("/api/community/lessons", response_model=list[CommunityLessonResponse])
async def list_community_lessons(
    subject: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """List community-generated lessons, optionally filtered by subject."""
    query = select(Lesson).where(Lesson.is_current == True, Lesson.concept_slug != "overview")
    if subject:
        query = query.where(Lesson.subject_slug == subject)
    query = query.order_by(Lesson.created_at.desc()).limit(50)

    result = await db.execute(query)
    lessons = result.scalars().all()
    return [
        CommunityLessonResponse(
            id=str(l.id),
            subject_slug=l.subject_slug,
            section_slug=l.section_slug,
            concept_slug=l.concept_slug,
            title=l.title,
            description=l.description,
            user_name=l.user_name,
            created_at=l.created_at.isoformat() if l.created_at else "",
        )
        for l in lessons
    ]
