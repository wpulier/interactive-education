import { redirect } from "next/navigation";
import { subjects } from "@/registry";
import type { Section } from "@/types";

export async function generateStaticParams() {
  const params: { subject: string; section: string }[] = [];
  for (const subject of subjects) {
    try {
      const mod = await import(`@/subjects/${subject.slug}/curriculum`);
      const sections = mod.sections as Section[];
      for (const section of sections) {
        params.push({ subject: subject.slug, section: section.slug });
      }
    } catch {
      // skip subjects with missing curricula
    }
  }
  return params;
}

export default async function SectionPage({
  params,
}: {
  params: Promise<{ subject: string; section: string }>;
}) {
  const { subject: subjectSlug, section: sectionSlug } = await params;
  redirect(`/${subjectSlug}/${sectionSlug}/overview`);
}
