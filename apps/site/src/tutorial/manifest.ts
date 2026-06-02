// Tutorial chapter list — derived from MDX modules in ./chapters/*.mdx. Each chapter file owns
// its own metadata (frontmatter) AND its prose; this manifest just imports them and provides
// ordered access + prev/next helpers. New chapter? Drop an .mdx file in chapters/ — nothing here
// needs editing.

import type { AstroComponentFactory } from 'astro/runtime/server/index.js'

export type Framework = 'vanilla' | 'react' | 'vue' | 'svelte' | 'solid' | 'angular'

export const TUTORIAL_FRAMEWORKS: { key: Framework; label: string }[] = [
  { key: 'vanilla', label: 'JS' },
  { key: 'react',   label: 'React' },
  // Vue / Svelte / Solid / Angular wire through the same switcher once their adapter coverage is
  // verified per chapter. See feedback_tutorials_framework_native — adapter first, then chapter.
]

export interface TutorialChapterFrontmatter {
  id: string
  order: number
  title: string
  blurb: string
  delta: string
  /** Per-framework relative path to the entrypoint file (resolved through the [step].astro
   *  raw-code globs — paths look like `vanilla/01-mount.ts` or `tutorial/Chapter01.tsx`). */
  vanilla?: string
  react?: string
  vue?: string
  svelte?: string
  solid?: string
  angular?: string
}

export interface TutorialChapter extends TutorialChapterFrontmatter {
  /** The MDX-rendered narrative — `<Content />` rendered inside the chapter page. */
  Content: AstroComponentFactory
}

interface MdxModule {
  frontmatter: TutorialChapterFrontmatter
  Content: AstroComponentFactory
}

// Eager glob — every MDX in chapters/ becomes a chapter. `eager: true` so Astro inlines the
// modules at build time (we need synchronous access to metadata + Content during page render).
const modules = import.meta.glob<MdxModule>('./chapters/*.mdx', { eager: true })

export const TUTORIAL: TutorialChapter[] = Object.values(modules)
  .map((m) => ({ ...m.frontmatter, Content: m.Content }))
  .sort((a, b) => a.order - b.order)

/** Per-chapter map keyed by id — used by getStaticPaths in /learn/[step]/. */
export const TUTORIAL_BY_ID: Record<string, TutorialChapter> = Object.fromEntries(TUTORIAL.map((c) => [c.id, c]))

export function chapterIndex(id: string): number {
  return TUTORIAL.findIndex((c) => c.id === id)
}
export function nextChapter(id: string): TutorialChapter | undefined {
  const i = chapterIndex(id)
  return i >= 0 ? TUTORIAL[i + 1] : undefined
}
export function prevChapter(id: string): TutorialChapter | undefined {
  const i = chapterIndex(id)
  return i > 0 ? TUTORIAL[i - 1] : undefined
}

/** Returns the per-framework files list for a chapter as the existing DemoFrame plumbing expects.
 *  Each "impls" entry's `files[0]` is the canonical entrypoint shown first in "Show code". */
export function chapterImpls(c: TutorialChapter): Partial<Record<Framework, { files: string[] }>> {
  const out: Partial<Record<Framework, { files: string[] }>> = {}
  for (const fw of TUTORIAL_FRAMEWORKS) {
    const path = c[fw.key]
    if (path) out[fw.key] = { files: [path] }
  }
  return out
}
