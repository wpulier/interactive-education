"""Source material ingestion — extract text from various input types."""

from dataclasses import dataclass

import httpx
from bs4 import BeautifulSoup
from PyPDF2 import PdfReader
from io import BytesIO


@dataclass
class IngestResult:
    text: str
    extracted_title: str | None = None


async def ingest_text(content: str) -> IngestResult:
    """Pass through raw text."""
    return IngestResult(text=content.strip())


async def ingest_url(url: str) -> IngestResult:
    """Fetch a URL and extract readable text content."""
    async with httpx.AsyncClient(follow_redirects=True, timeout=30) as client:
        response = await client.get(url)
        response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")

    # Extract page title before stripping tags
    extracted_title = soup.title.string.strip() if soup.title and soup.title.string else None

    # Remove script, style, nav, footer elements
    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()

    # Try to find the main content area
    main = soup.find("main") or soup.find("article") or soup.find("body")
    if not main:
        main = soup

    # Extract text with paragraph separation
    text = main.get_text(separator="\n\n", strip=True)
    return IngestResult(text=text, extracted_title=extracted_title)


async def ingest_pdf(file_bytes: bytes) -> IngestResult:
    """Extract text from a PDF file."""
    reader = PdfReader(BytesIO(file_bytes))
    pages = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            pages.append(text.strip())
    return IngestResult(text="\n\n".join(pages))
