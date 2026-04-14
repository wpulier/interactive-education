"""Lesson Generation Service — FastAPI application."""

import os
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, Header, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

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
    source_title: str | None = None
    source_author: str | None = None
    source_publication: str | None = None


class JobResponse(BaseModel):
    job_id: str
    status: str


class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    progress: dict
    error: str | None = None


class LessonSourceInfo(BaseModel):
    source_type: str
    source_title: str | None = None
    source_author: str | None = None
    source_publication: str | None = None
    source_url: str | None = None


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
    source_info: LessonSourceInfo | None = None


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
    source_title: str | None = None,
    source_author: str | None = None,
    source_publication: str | None = None,
):
    """Run pipeline in background with its own DB session."""
    async with SessionLocal() as db:
        await run_pipeline(
            db, job_id, source_type, content, subject_slug,
            file_bytes, user_id, user_name,
            source_title, source_author, source_publication,
        )


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
        request.source_title,
        request.source_author,
        request.source_publication,
    )

    return JobResponse(job_id=str(job.id), status="pending")


@app.post("/api/generate/pdf", response_model=JobResponse)
async def generate_from_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    subject_slug: str = Form(...),
    source_title: str | None = Form(None),
    source_author: str | None = Form(None),
    source_publication: str | None = Form(None),
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
        source_title,
        source_author,
        source_publication,
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
    result = await db.execute(
        select(Lesson)
        .where(Lesson.id == lesson_id)
        .options(joinedload(Lesson.curriculum).joinedload(Curriculum.source))
    )
    lesson = result.scalars().first()
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
    query = (
        select(Lesson)
        .where(Lesson.is_current == True)
        .options(joinedload(Lesson.curriculum).joinedload(Curriculum.source))
    )
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
    source_info = None
    if lesson.curriculum and lesson.curriculum.source:
        src = lesson.curriculum.source
        source_info = LessonSourceInfo(
            source_type=src.type,
            source_title=src.title,
            source_author=src.author,
            source_publication=src.publication,
            source_url=src.original_url,
        )
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
        source_info=source_info,
    )


# --- User-specific endpoints ---


class UserJobResponse(BaseModel):
    job_id: str
    status: str
    progress: dict
    error: str | None = None
    created_at: str
    completed_at: str | None = None
    subject_slug: str | None = None
    section_slug: str | None = None


@app.get("/api/users/{user_id}/jobs", response_model=list[UserJobResponse])
async def list_user_jobs(user_id: str, db: AsyncSession = Depends(get_db)):
    """List all jobs for a specific user."""
    result = await db.execute(
        select(Job).where(Job.user_id == user_id).order_by(Job.created_at.desc())
    )
    jobs = result.scalars().all()

    # For completed jobs, look up the curriculum they produced (Job → Source → Curriculum)
    source_ids = [j.source_id for j in jobs if j.status == "complete" and j.source_id]
    curriculum_by_source: dict = {}
    if source_ids:
        cur_result = await db.execute(
            select(Curriculum).where(Curriculum.source_id.in_(source_ids))
        )
        for c in cur_result.scalars().all():
            curriculum_by_source[c.source_id] = c

    responses = []
    for j in jobs:
        subject_slug = None
        section_slug = None
        if j.status == "complete" and j.source_id:
            cur = curriculum_by_source.get(j.source_id)
            if cur:
                subject_slug = cur.subject_slug
                section_slug = cur.structure.get("slug") if isinstance(cur.structure, dict) else None
        responses.append(
            UserJobResponse(
                job_id=str(j.id),
                status=j.status,
                progress=j.progress or {},
                error=j.error,
                created_at=j.created_at.isoformat() if j.created_at else "",
                completed_at=j.completed_at.isoformat() if j.completed_at else None,
                subject_slug=subject_slug,
                section_slug=section_slug,
            )
        )
    return responses


@app.delete("/api/jobs/{job_id}")
async def delete_job(job_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a failed job."""
    job = await db.get(Job, job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    if job.status not in ("failed",):
        raise HTTPException(400, "Only failed jobs can be deleted")
    await db.delete(job)
    await db.commit()
    return {"ok": True}


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
        .options(joinedload(Lesson.curriculum).joinedload(Curriculum.source))
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
    source_type: str | None = None
    source_title: str | None = None


@app.get("/api/community/lessons", response_model=list[CommunityLessonResponse])
async def list_community_lessons(
    subject: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """List community-generated lessons, optionally filtered by subject."""
    query = (
        select(Lesson)
        .where(Lesson.is_current == True, Lesson.concept_slug != "overview")
        .options(joinedload(Lesson.curriculum).joinedload(Curriculum.source))
    )
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
            source_type=l.curriculum.source.type if l.curriculum and l.curriculum.source else None,
            source_title=l.curriculum.source.title if l.curriculum and l.curriculum.source else None,
        )
        for l in lessons
    ]
