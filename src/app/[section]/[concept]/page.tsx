import { notFound } from "next/navigation";
import { curriculum, getConcept } from "@/curriculum";

export function generateStaticParams() {
  return curriculum.flatMap((s) =>
    s.concepts.map((c) => ({ section: s.slug, concept: c.slug }))
  );
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ section: string; concept: string }>;
}) {
  const { section: sectionSlug, concept: conceptSlug } = await params;
  const result = getConcept(sectionSlug, conceptSlug);
  if (!result) notFound();

  // Dynamic import of the lesson component based on section/concept slug
  let LessonComponent: React.ComponentType;
  try {
    const mod = await import(`@/lessons/${sectionSlug}/${conceptSlug}`);
    LessonComponent = mod.default;
  } catch {
    notFound();
  }

  return <LessonComponent />;
}
