/** Astro BASE_URL always ends with `/`. Join paths without producing `//…` (protocol-relative). */
export const BASE = import.meta.env.BASE_URL.replace(/\/?$/, '/')
export function withBase(path: string): string {
  return BASE + path.replace(/^\//, '')
}
