import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class Source(Base):
    __tablename__ = "sources"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type = Column(String(20), nullable=False)  # text, url, pdf
    title = Column(String(500))
    content = Column(Text, nullable=False)
    original_url = Column(String(2000))
    metadata_ = Column("metadata", JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    curriculums = relationship("Curriculum", back_populates="source")
    jobs = relationship("Job", back_populates="source")


class Curriculum(Base):
    __tablename__ = "curriculums"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_id = Column(UUID(as_uuid=True), ForeignKey("sources.id"))
    subject_slug = Column(String(100), nullable=False)
    structure = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    source = relationship("Source", back_populates="curriculums")
    lessons = relationship("Lesson", back_populates="curriculum")


class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    curriculum_id = Column(UUID(as_uuid=True), ForeignKey("curriculums.id"))
    subject_slug = Column(String(100), nullable=False)
    section_slug = Column(String(100), nullable=False)
    concept_slug = Column(String(100), nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    code = Column(Text, nullable=False)
    version = Column(Integer, default=1)
    is_current = Column(Boolean, default=True)
    source_excerpt = Column(Text)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    curriculum = relationship("Curriculum", back_populates="lessons")


class Job(Base):
    __tablename__ = "jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_id = Column(UUID(as_uuid=True), ForeignKey("sources.id"))
    status = Column(String(20), default="pending")
    progress = Column(JSON, default=dict)
    error = Column(Text)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime(timezone=True))

    source = relationship("Source", back_populates="jobs")
