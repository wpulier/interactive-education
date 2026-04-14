"""Lesson generation pipeline: Ingest → Decompose → Generate → Store."""

import json
import os
import re
from datetime import datetime, timezone

import anthropic
from sqlalchemy.ext.asyncio import AsyncSession

from models import Source, Curriculum, Lesson, Job
from ingestion import ingest_text, ingest_url, ingest_pdf
from prompts import DECOMPOSE_SYSTEM, DECOMPOSE_USER, GENERATE_SYSTEM, GENERATE_USER

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))

MODEL = "claude-sonnet-4-20250514"


async def run_pipeline(
    db: AsyncSession,
    job_id: str,
    source_type: str,
    content: str,
    subject_slug: str,
    file_bytes: bytes | None = None,
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
            extracted = await ingest_text(content)
        elif source_type == "url":
            extracted = await ingest_url(content)
        elif source_type == "pdf":
            if not file_bytes:
                raise ValueError("PDF source requires file_bytes")
            extracted = await ingest_pdf(file_bytes)
        else:
            raise ValueError(f"Unknown source type: {source_type}")

        if not extracted or len(extracted.strip()) < 50:
            raise ValueError("Extracted content is too short to generate lessons from")

        # Save source
        source = Source(
            type=source_type,
            title=content[:200] if source_type == "text" else content,
            content=extracted,
            original_url=content if source_type == "url" else None,
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

        decompose_response = client.messages.create(
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
        )
        db.add(curriculum)
        await db.flush()
        await db.commit()

        concepts = structure.get("concepts", [])
        total = len(concepts)

        # 3. GENERATE — one lesson per concept
        for i, concept in enumerate(concepts):
            job.progress = {
                "stage": "generating",
                "detail": f"Creating lesson {i + 1}/{total}: {concept['title']}",
                "current": i + 1,
                "total": total,
            }
            await db.commit()

            # Find relevant source excerpt for this concept
            source_excerpt = _extract_relevant_excerpt(extracted, concept["title"], concept.get("description", ""))

            generate_response = client.messages.create(
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
                        ),
                    }
                ],
            )

            code = generate_response.content[0].text.strip()
            # Clean markdown fences if present
            if code.startswith("```"):
                code = re.sub(r"^```\w*\n?", "", code)
                code = re.sub(r"\n?```$", "", code)

            lesson = Lesson(
                curriculum_id=curriculum.id,
                subject_slug=subject_slug,
                section_slug=structure.get("slug", "generated"),
                concept_slug=concept["slug"],
                title=concept["title"],
                description=concept.get("description", ""),
                code=code,
                source_excerpt=source_excerpt[:5000],
            )
            db.add(lesson)
            await db.flush()

        # Also generate an overview lesson
        job.progress = {
            "stage": "generating",
            "detail": "Creating overview lesson",
            "current": total + 1,
            "total": total + 1,
        }
        await db.commit()

        overview_response = client.messages.create(
            model=MODEL,
            max_tokens=8192,
            system=GENERATE_SYSTEM,
            messages=[
                {
                    "role": "user",
                    "content": f"""Create an overview/introduction lesson for a section called "{structure.get('title', 'Overview')}".

DESCRIPTION: {structure.get('description', '')}

This is the first lesson a student will see when entering this section. It should:
- Define and explain the core topic
- Explain why it matters
- Preview what the student will learn in the upcoming lessons: {', '.join(c['title'] for c in concepts)}
- Include at least one interactive element that gives a taste of the subject

Make it engaging and set the stage for the deeper lessons that follow.""",
                }
            ],
        )

        overview_code = overview_response.content[0].text.strip()
        if overview_code.startswith("```"):
            overview_code = re.sub(r"^```\w*\n?", "", overview_code)
            overview_code = re.sub(r"\n?```$", "", overview_code)

        overview_lesson = Lesson(
            curriculum_id=curriculum.id,
            subject_slug=subject_slug,
            section_slug=structure.get("slug", "generated"),
            concept_slug="overview",
            title="Overview",
            description=f"Introduction to {structure.get('title', 'this section')}",
            code=overview_code,
        )
        db.add(overview_lesson)
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


def _extract_relevant_excerpt(full_text: str, title: str, description: str) -> str:
    """Extract the most relevant portion of source text for a concept.

    Simple heuristic: search for the title in the text and take surrounding context.
    Falls back to the beginning of the text if title not found.
    """
    title_lower = title.lower()
    text_lower = full_text.lower()

    # Try to find the title in the text
    idx = text_lower.find(title_lower)
    if idx == -1:
        # Try first significant word of the title
        words = [w for w in title_lower.split() if len(w) > 3]
        for word in words:
            idx = text_lower.find(word)
            if idx != -1:
                break

    if idx != -1:
        # Take ~3000 chars around the match
        start = max(0, idx - 500)
        end = min(len(full_text), idx + 2500)
        return full_text[start:end]

    # Fallback: return first chunk
    return full_text[:3000]
