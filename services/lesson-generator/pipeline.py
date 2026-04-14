"""Lesson generation pipeline: Ingest → Decompose → Generate → Store."""

import json
import os
import re
from datetime import datetime, timezone

import anthropic
from sqlalchemy.ext.asyncio import AsyncSession

from models import Source, Curriculum, Lesson, Job
from ingestion import ingest_text, ingest_url, ingest_pdf
from prompts import (
    DECOMPOSE_SYSTEM, DECOMPOSE_USER,
    GENERATE_SYSTEM, GENERATE_USER,
    GENERATE_OVERVIEW_USER,
)

client = anthropic.AsyncAnthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))

MODEL = "claude-sonnet-4-20250514"


async def run_pipeline(
    db: AsyncSession,
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
    """Run the full generation pipeline for a job."""
    job = await db.get(Job, job_id)
    if not job:
        return

    try:
        # 1. INGEST
        job.status = "processing"
        job.progress = {"stage": "ingesting", "detail": "Extracting content from source"}
        await db.commit()

        if source_type == "text":
            result = await ingest_text(content)
        elif source_type == "url":
            result = await ingest_url(content)
        elif source_type == "pdf":
            if not file_bytes:
                raise ValueError("PDF source requires file_bytes")
            result = await ingest_pdf(file_bytes)
        else:
            raise ValueError(f"Unknown source type: {source_type}")

        extracted = result.text

        if not extracted or len(extracted.strip()) < 50:
            raise ValueError("Extracted content is too short to generate lessons from")

        # Use auto-detected title as fallback for URL sources
        if not source_title and result.extracted_title:
            source_title = result.extracted_title

        # Save source
        source = Source(
            type=source_type,
            title=source_title or (content[:200] if source_type == "text" else content),
            content=extracted,
            original_url=content if source_type == "url" else None,
            author=source_author,
            publication=source_publication,
        )
        db.add(source)
        await db.flush()

        job.source_id = source.id
        await db.commit()

        # 2. DECOMPOSE
        job.progress = {"stage": "decomposing", "detail": "Analyzing content structure"}
        await db.commit()

        # Truncate content for decomposition if very long
        decompose_content = extracted[:30000] if len(extracted) > 30000 else extracted

        decompose_response = await client.messages.create(
            model=MODEL,
            max_tokens=4096,
            system=DECOMPOSE_SYSTEM,
            messages=[{"role": "user", "content": DECOMPOSE_USER.format(content=decompose_content)}],
        )

        raw_structure = decompose_response.content[0].text.strip()
        # Clean potential markdown fences
        if raw_structure.startswith("```"):
            raw_structure = re.sub(r"^```\w*\n?", "", raw_structure)
            raw_structure = re.sub(r"\n?```$", "", raw_structure)

        structure = json.loads(raw_structure)

        # Save curriculum
        curriculum = Curriculum(
            source_id=source.id,
            subject_slug=subject_slug,
            structure=structure,
            user_id=user_id,
            user_name=user_name,
        )
        db.add(curriculum)
        await db.flush()
        await db.commit()

        concepts = structure.get("concepts", [])
        total = len(concepts)

        # Source attribution context for prompt injection
        source_attr = {
            "source_type": source_type,
            "source_title": source.title or "",
            "source_author": source.author or "",
            "source_url": source.original_url or "",
        }

        # 3. GENERATE — overview FIRST, then one lesson per concept

        # 3a. Overview lesson (generated first since students see it first)
        job.progress = {
            "stage": "generating",
            "detail": "Creating overview lesson",
            "current": 1,
            "total": total + 1,
        }
        await db.commit()

        overview_excerpt = extracted[:5000]
        overview_response = await client.messages.create(
            model=MODEL,
            max_tokens=8192,
            system=GENERATE_SYSTEM,
            messages=[
                {
                    "role": "user",
                    "content": GENERATE_OVERVIEW_USER.format(
                        section_title=structure.get("title", "Overview"),
                        section_description=structure.get("description", ""),
                        concept_list=", ".join(c["title"] for c in concepts),
                        source_excerpt=overview_excerpt,
                        **source_attr,
                    ),
                }
            ],
        )

        overview_code = _clean_code(overview_response.content[0].text.strip())

        # Validate overview code
        valid, err = _validate_lesson(overview_code)
        if not valid:
            overview_code = await _retry_generation(
                GENERATE_SYSTEM,
                GENERATE_OVERVIEW_USER.format(
                    section_title=structure.get("title", "Overview"),
                    section_description=structure.get("description", ""),
                    concept_list=", ".join(c["title"] for c in concepts),
                    source_excerpt=overview_excerpt,
                    **source_attr,
                ),
                err,
            )

        overview_lesson = Lesson(
            curriculum_id=curriculum.id,
            subject_slug=subject_slug,
            section_slug=structure.get("slug", "generated"),
            concept_slug="overview",
            title="Overview",
            description=f"Introduction to {structure.get('title', 'this section')}",
            code=overview_code,
            source_excerpt=overview_excerpt,
            user_id=user_id,
            user_name=user_name,
        )
        db.add(overview_lesson)
        await db.flush()

        # 3b. Concept lessons
        for i, concept in enumerate(concepts):
            job.progress = {
                "stage": "generating",
                "detail": f"Creating lesson {i + 1}/{total}: {concept['title']}",
                "current": i + 2,  # +2 because overview is 1
                "total": total + 1,
            }
            await db.commit()

            # Find relevant source excerpt for this concept
            source_excerpt = _extract_relevant_excerpt(extracted, concept["title"], concept.get("description", ""))

            generate_response = await client.messages.create(
                model=MODEL,
                max_tokens=8192,
                system=GENERATE_SYSTEM,
                messages=[
                    {
                        "role": "user",
                        "content": GENERATE_USER.format(
                            title=concept["title"],
                            description=concept.get("description", ""),
                            section_title=structure.get("title", ""),
                            section_description=structure.get("description", ""),
                            source_excerpt=source_excerpt[:8000],
                            **source_attr,
                        ),
                    }
                ],
            )

            code = _clean_code(generate_response.content[0].text.strip())

            # Validate and retry once on failure
            valid, err = _validate_lesson(code)
            if not valid:
                code = await _retry_generation(
                    GENERATE_SYSTEM,
                    GENERATE_USER.format(
                        title=concept["title"],
                        description=concept.get("description", ""),
                        section_title=structure.get("title", ""),
                        section_description=structure.get("description", ""),
                        source_excerpt=source_excerpt[:8000],
                        **source_attr,
                    ),
                    err,
                )

            lesson = Lesson(
                curriculum_id=curriculum.id,
                subject_slug=subject_slug,
                section_slug=structure.get("slug", "generated"),
                concept_slug=concept["slug"],
                title=concept["title"],
                description=concept.get("description", ""),
                code=code,
                source_excerpt=source_excerpt[:5000],
                user_id=user_id,
                user_name=user_name,
            )
            db.add(lesson)
            await db.flush()

        await db.commit()

        # 4. COMPLETE
        job.status = "complete"
        job.progress = {
            "stage": "complete",
            "detail": f"Generated {total} lessons + overview",
            "total": total + 1,
        }
        job.completed_at = datetime.now(timezone.utc)
        await db.commit()

    except Exception as e:
        job.status = "failed"
        job.error = str(e)
        job.progress = {"stage": "failed", "detail": str(e)}
        await db.commit()
        raise


def _clean_code(code: str) -> str:
    """Strip markdown fences from generated code."""
    if code.startswith("```"):
        code = re.sub(r"^```\w*\n?", "", code)
        code = re.sub(r"\n?```\s*$", "", code)
    return code


def _validate_lesson(code: str) -> tuple[bool, str]:
    """Basic validation of a generated HTML lesson artifact."""
    if "<!DOCTYPE" not in code and "<html" not in code:
        return False, "Missing HTML document structure — output must be a complete HTML file"

    if "<div id=\"root\">" not in code and "<div id='root'>" not in code:
        return False, "Missing <div id='root'> mount point"

    if "ReactDOM" not in code:
        return False, "Missing ReactDOM render call"

    if 'type="text/babel"' not in code and "type='text/babel'" not in code:
        return False, "Missing script type='text/babel' — JSX requires Babel"

    return True, "OK"


async def _retry_generation(system: str, user_content: str, error: str) -> str:
    """Retry a failed generation once with the error message appended."""
    retry_response = await client.messages.create(
        model=MODEL,
        max_tokens=8192,
        system=system,
        messages=[
            {"role": "user", "content": user_content},
            {"role": "assistant", "content": "I'll fix the issue and regenerate."},
            {
                "role": "user",
                "content": f"Your previous output had a validation error: {error}. "
                "Please regenerate the complete component, fixing that issue.",
            },
        ],
    )
    return _clean_code(retry_response.content[0].text.strip())


def _extract_relevant_excerpt(full_text: str, title: str, description: str) -> str:
    """Extract the most relevant portion of source text for a concept.

    Uses keyword-density scoring across chunks to find the best match.
    """
    text_lower = full_text.lower()

    # Strategy 1: exact title match
    idx = text_lower.find(title.lower())
    if idx != -1:
        start = max(0, idx - 500)
        end = min(len(full_text), idx + 4500)
        return full_text[start:end]

    # Strategy 2: keyword density scoring over chunks
    keywords = set()
    for text in [title, description]:
        for word in text.lower().split():
            cleaned = re.sub(r"[^a-z]", "", word)
            if len(cleaned) > 3:
                keywords.add(cleaned)

    if not keywords:
        return full_text[:5000]

    # Score ~500-char chunks by keyword overlap
    chunk_size = 500
    overlap = 100
    best_score = 0
    best_start = 0

    for i in range(0, len(full_text), chunk_size - overlap):
        chunk_lower = full_text[i : i + chunk_size].lower()
        score = sum(1 for kw in keywords if kw in chunk_lower)
        if score > best_score:
            best_score = score
            best_start = i

    if best_score > 0:
        start = max(0, best_start - 500)
        end = min(len(full_text), best_start + 4500)
        return full_text[start:end]

    # Strategy 3: skip probable front matter, take first substantive content
    paragraphs = full_text.split("\n\n")
    content_start = 0
    for para in paragraphs:
        if len(para.strip()) > 100:
            content_start = full_text.find(para)
            break
    return full_text[content_start : content_start + 5000]
