// Placeholder table of contents.
// This is example data only, standing in for the real book structure
// until the actual volumes/chapters/sections are supplied.

import { base } from "$app/paths"

export type TocSubsection = {
  id: string
  number: string
  title: string
  slug: string
}

export type TocSection = {
  id: string
  number: string
  title: string
  slug: string
  subsections: TocSubsection[]
}

export type TocChapter = {
  id: string
  number: string
  title: string
  slug: string
  sections: TocSection[]
}

export type TocVolume = {
  id: string
  number: string
  title: string
  slug: string
  chapters: TocChapter[]
}

export const toc: TocVolume[] = [
  {
    id: "vol-1",
    number: "I",
    title: "Fundamental Algorithms",
    slug: "vol-1",
    chapters: [
      {
        id: "ch-1",
        number: "1",
        title: "Basic Concepts",
        slug: "ch-1",
        sections: [
          { id: "1-1", number: "1.1", title: "Algorithms", slug: "1-1", subsections: [] },
          {
            id: "1-2",
            number: "1.2",
            title: "Mathematical Preliminaries",
            slug: "1-2",
            subsections: [
              {
                id: "1-2-1",
                number: "1.2.1",
                title: "Mathematical Induction",
                slug: "1-2-1",
              },
            ],
          },
        ],
      },
    ],
  },
]

export function chapterHref(volume: TocVolume, chapter: TocChapter): string {
  return `${base}/${volume.slug}/${chapter.slug}`
}

export function sectionHref(volume: TocVolume, chapter: TocChapter, section: TocSection): string {
  return `${base}/${volume.slug}/${chapter.slug}/${section.slug}`
}

export function subsectionHref(
  volume: TocVolume,
  chapter: TocChapter,
  section: TocSection,
  subsection: TocSubsection,
): string {
  return `${sectionHref(volume, chapter, section)}/${subsection.slug}`
}

export type TocPath = {
  volume: TocVolume
  chapter?: TocChapter
  section?: TocSection
  subsection?: TocSubsection
}

export function resolvePath(pathname: string): TocPath | undefined {
  const relative = base && pathname.startsWith(base) ? pathname.slice(base.length) : pathname
  const [volumeSlug, chapterSlug, sectionSlug, subsectionSlug] = relative.split("/").filter(Boolean)

  const volume = toc.find((v) => v.slug === volumeSlug)
  if (!volume) return undefined

  const chapter = chapterSlug ? volume.chapters.find((c) => c.slug === chapterSlug) : undefined
  if (chapterSlug && !chapter) return { volume }

  const section =
    chapter && sectionSlug ? chapter.sections.find((s) => s.slug === sectionSlug) : undefined
  if (sectionSlug && !section) return { volume, chapter }

  const subsection =
    section && subsectionSlug
      ? section.subsections.find((s) => s.slug === subsectionSlug)
      : undefined

  return { volume, chapter, section, subsection }
}
