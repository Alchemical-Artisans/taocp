// Placeholder table of contents.
// This is example data only, standing in for the real book structure
// until the actual volumes/chapters/sections are supplied.

export type TocSection = {
  id: string
  number: string
  title: string
  slug: string
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
    title: "Example Volume",
    slug: "vol-1",
    chapters: [
      {
        id: "ch-1",
        number: "1",
        title: "Example Chapter",
        slug: "ch-1",
        sections: [
          { id: "1-1", number: "1.1", title: "Example Section", slug: "1-1" },
          { id: "1-2", number: "1.2", title: "Another Example Section", slug: "1-2" },
        ],
      },
      {
        id: "ch-2",
        number: "2",
        title: "Second Example Chapter",
        slug: "ch-2",
        sections: [],
      },
    ],
  },
  {
    id: "vol-2",
    number: "II",
    title: "Second Example Volume",
    slug: "vol-2",
    chapters: [],
  },
]

export function chapterHref(volume: TocVolume, chapter: TocChapter): string {
  return `/${volume.slug}/${chapter.slug}`
}

export function sectionHref(volume: TocVolume, chapter: TocChapter, section: TocSection): string {
  return `/${volume.slug}/${chapter.slug}/${section.slug}`
}

export type TocPath = {
  volume: TocVolume
  chapter?: TocChapter
  section?: TocSection
}

export function resolvePath(pathname: string): TocPath | undefined {
  const [volumeSlug, chapterSlug, sectionSlug] = pathname.split("/").filter(Boolean)

  const volume = toc.find((v) => v.slug === volumeSlug)
  if (!volume) return undefined

  const chapter = chapterSlug ? volume.chapters.find((c) => c.slug === chapterSlug) : undefined
  if (chapterSlug && !chapter) return { volume }

  const section =
    chapter && sectionSlug ? chapter.sections.find((s) => s.slug === sectionSlug) : undefined

  return { volume, chapter, section }
}
