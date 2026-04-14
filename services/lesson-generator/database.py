import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/lessons",
)

# Railway provides DATABASE_URL with postgresql:// prefix — convert for asyncpg
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(DATABASE_URL, echo=False)
SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db():
    async with SessionLocal() as session:
        yield session


async def init_db():
    from models import Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Add columns to existing tables (idempotent, no Alembic needed)
    async with engine.begin() as conn:
        for stmt in [
            "ALTER TABLE jobs ADD COLUMN IF NOT EXISTS user_id VARCHAR(255)",
            "ALTER TABLE lessons ADD COLUMN IF NOT EXISTS user_id VARCHAR(255)",
            "ALTER TABLE lessons ADD COLUMN IF NOT EXISTS user_name VARCHAR(255)",
            "ALTER TABLE curriculums ADD COLUMN IF NOT EXISTS user_id VARCHAR(255)",
            "ALTER TABLE curriculums ADD COLUMN IF NOT EXISTS user_name VARCHAR(255)",
        ]:
            await conn.execute(text(stmt))
