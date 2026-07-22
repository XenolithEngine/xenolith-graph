import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import react from '@astrojs/react'
import vue from '@astrojs/vue'
import { readFile, writeFile, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

// Starlight ships @astrojs/sitemap which always emits sitemap-index.xml + sitemap-0.xml. We want
// the standard /sitemap.xml URL (single file, ~98 entries — well below the 50k shard threshold),
// so we rename sitemap-0.xml → sitemap.xml and delete the index after build. Robots.txt points at
// /sitemap.xml accordingly.
const collapseSitemap = () => ({
  name: 'xenolith-collapse-sitemap',
  hooks: {
    'astro:build:done': async ({ dir }) => {
      const root = fileURLToPath(dir)
      try {
        const shard = await readFile(`${root}sitemap-0.xml`, 'utf8')
        await writeFile(`${root}sitemap.xml`, shard)
        await rm(`${root}sitemap-0.xml`)
        await rm(`${root}sitemap-index.xml`)
      } catch {
        // First-run / no sitemap yet — nothing to collapse.
      }
    },
  },
})

export default defineConfig({
  site: 'https://graph.xenolith.studio',
  // Served at the domain root (graph.xenolith.studio) — no `base` prefix. The old
  // project-pages URL (xenolithengine.github.io/xenolith-graph) 301s here via the
  // GitHub Pages custom domain, so previously published links keep working.
  // Redirects for URLs we promised in already-published artifacts (npm READMEs, social posts).
  // Keep these forever — bumping the React adapter from npm with a different link would mean
  // republishing all packages.
  redirects: {
    // Astro normalises trailing-slash variants — declaring both forms collides. Single canonical
    // entry covers both `/guides/quickstart` and `/guides/quickstart/` requests.
    '/guides/quickstart': '/guides/install/',
  },
  vite: {
    // Force a single physical copy of PIXI (its extensions self-register on import; two copies →
    // "Extension type shape-builder already has a handler") and pre-bundle it so Vite optimizes in
    // ONE pass — otherwise discovering a new demo import mid-load triggers a re-optimize and PIXI
    // ends up loaded from two optimize generations on the same page.
    optimizeDeps: { include: ['pixi.js', 'react', 'react-dom', 'react-dom/client', 'vue'] },
    resolve: {
      dedupe: ['pixi.js', 'react', 'react-dom', 'vue'],
      alias: {
        '@xenolithengine/graph-core':         new URL('../../packages/core/src/index.ts',         import.meta.url).pathname,
        '@xenolithengine/graph-render-pixi':  new URL('../../packages/render-pixi/src/index.ts',  import.meta.url).pathname,
        '@xenolithengine/graph-editor':       new URL('../../packages/editor/src/index.ts',       import.meta.url).pathname,
        '@xenolithengine/graph-adapter-core': new URL('../../packages/adapter-core/src/index.ts', import.meta.url).pathname,
        '@xenolithengine/graph-react':        new URL('../../packages/react/src/index.tsx',       import.meta.url).pathname,
        '@xenolithengine/graph-vue':          new URL('../../packages/vue/src/index.ts',          import.meta.url).pathname,
        '@xenolithengine/graph-svelte':       new URL('../../packages/svelte/src/index.ts',       import.meta.url).pathname,
        '@xenolithengine/graph-solid':        new URL('../../packages/solid/src/index.ts',        import.meta.url).pathname,
        '@xenolithengine/graph-angular':      new URL('../../packages/angular/src/index.ts',      import.meta.url).pathname,
        '@xenolithengine/graph-theme-xen':           new URL('../../packages/theme-xen/src/index.ts',           import.meta.url).pathname,
        '@xenolithengine/graph-theme-liquid-glass':  new URL('../../packages/theme-liquid-glass/src/index.ts',  import.meta.url).pathname,
        '@xenolithengine/graph-theme-synthwave':     new URL('../../packages/theme-synthwave/src/index.ts',     import.meta.url).pathname,
        '@xenolithengine/graph-theme-holographic':   new URL('../../packages/theme-holographic/src/index.ts',   import.meta.url).pathname,
        '@xenolithengine/graph-theme-daylight':      new URL('../../packages/theme-daylight/src/index.ts',      import.meta.url).pathname,
        '@xenolithengine/graph-plugin-autolayout/dagre': new URL('../../packages/plugin-autolayout/src/adapters/dagre.ts', import.meta.url).pathname,
        '@xenolithengine/graph-plugin-autolayout/elk':   new URL('../../packages/plugin-autolayout/src/adapters/elk.ts',   import.meta.url).pathname,
        '@xenolithengine/graph-plugin-autolayout':       new URL('../../packages/plugin-autolayout/src/index.ts',           import.meta.url).pathname,
      },
    },
    build: { target: 'es2022' },
    esbuild: { target: 'es2022' },
  },
  integrations: [
    react(),
    vue(),
    starlight({
      title: 'Xenolith Graph',
      logo: { src: './src/assets/logo.png', alt: 'Xenolith Graph', replacesTitle: false },
      favicon: '/favicon-64.png',
      customCss: [
        new URL('./src/styles/fonts.css',   import.meta.url).pathname,
        new URL('./src/styles/theme.css',   import.meta.url).pathname,
        new URL('./src/styles/landing.css', import.meta.url).pathname,
      ],
      defaultLocale: 'root',
      locales: {
        root: { label: 'English', lang: 'en' },
        ru:   { label: 'Русский', lang: 'ru' },
        zh:   { label: '中文',    lang: 'zh' },
      },
      components: {
        ThemeSelect:   './src/components/Empty.astro',
        ThemeProvider: './src/components/DarkOnly.astro',
      },
      expressiveCode: {
        themes: ['vesper'],
        styleOverrides: {
          borderRadius: '10px',
          borderColor: 'rgba(217, 202, 160, 0.18)',
          codeBackground: '#0F1010',
          frames: { shadowColor: 'transparent' },
        },
      },
      social: {
        github: 'https://github.com/XenolithEngine/xenolith-graph',
      },
      sidebar: [
        {
          label: 'Explore',
          translations: { ru: 'Обзор', zh: '探索' },
          items: [
            { label: 'Learn',      link: '/learn/',      attrs: { target: '_self' } },
            { label: 'Examples',   link: '/examples/',   attrs: { target: '_self' } },
            { label: 'Playground', link: '/playground/', attrs: { target: '_self' } },
          ],
        },
        {
          label: 'Getting Started',
          translations: { ru: 'Начало работы', zh: '开始使用' },
          items: [
            { slug: 'guides/install' },
            { slug: 'guides/init' },
            { slug: 'guides/api' },
          ],
        },
        {
          label: 'Features',
          translations: { ru: 'Возможности', zh: '功能' },
          items: [
            { slug: 'guides/widgets' },
            { slug: 'guides/icons' },
            { slug: 'guides/macros-templates' },
            { slug: 'guides/events-commands' },
            { slug: 'guides/save-export' },
            { slug: 'guides/plugins' },
          ],
        },
        {
          label: 'Framework adapters',
          translations: { ru: 'Адаптеры', zh: '框架适配器' },
          items: [
            { slug: 'guides/react' },
            { slug: 'guides/vue' },
          ],
        },
        {
          label: 'Customisation',
          translations: { ru: 'Кастомизация', zh: '自定义' },
          items: [
            { slug: 'guides/theme' },
          ],
        },
        {
          label: 'LLMs / AI agents',
          translations: { ru: 'LLM / ИИ-агенты', zh: 'LLM / AI 代理' },
          items: [
            { slug: 'llms' },
            { slug: 'integrations/ai-agents' },
          ],
        },
      ],
      head: [
        { tag: 'meta', attrs: { name: 'google-site-verification', content: '3175SdIF7FEG-pbpeKgSN8XVl5kmWm4oCzHHgUM3LDg' } },
        { tag: 'meta', attrs: { property: 'og:image',        content: 'https://graph.xenolith.studio/og.png' } },
        { tag: 'meta', attrs: { property: 'og:image:width',  content: '1200' } },
        { tag: 'meta', attrs: { property: 'og:image:height', content: '630' } },
        { tag: 'meta', attrs: { name: 'twitter:card',        content: 'summary_large_image' } },
        { tag: 'meta', attrs: { name: 'twitter:image',       content: 'https://graph.xenolith.studio/og.png' } },
        { tag: 'meta', attrs: { name: 'twitter:site',        content: '@xenolithengine' } },
        { tag: 'meta', attrs: { name: 'twitter:creator',     content: '@xenolithengine' } },
        // AI / LLM discovery — https://llmstxt.org
        { tag: 'link', attrs: { rel: 'alternate', type: 'text/plain', href: 'https://graph.xenolith.studio/llms.txt',      title: 'llms.txt (LLM-friendly index)' } },
        { tag: 'link', attrs: { rel: 'alternate', type: 'text/plain', href: 'https://graph.xenolith.studio/llms-full.txt', title: 'llms-full.txt (every guide concatenated)' } },
        { tag: 'link', attrs: { rel: 'alternate', type: 'text/markdown', href: 'https://graph.xenolith.studio/agents.md', title: 'agents.md (AI agent manifesto)' } },
        // Schema.org Organization — helps Google Knowledge Graph + AI crawlers understand who ships this.
        { tag: 'script', attrs: { type: 'application/ld+json' }, content: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'XenolithEngine',
          url: 'https://graph.xenolith.studio/',
          logo: 'https://graph.xenolith.studio/favicon-64.png',
          sameAs: ['https://github.com/XenolithEngine'],
        }) },
        // SoftwareApplication structured data so AI/search engines categorise the project correctly.
        { tag: 'script', attrs: { type: 'application/ld+json' }, content: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'XenolithGraph',
          applicationCategory: 'DeveloperApplication',
          operatingSystem: 'Web browser',
          description: 'Drop-in node-graph editor for the web — Blueprint-style typed pins, in-node widgets, macros, AI-native via MCP. WebGL renderer.',
          url: 'https://graph.xenolith.studio/',
          license: 'https://opensource.org/licenses/MIT',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        }) },
      ],
    }),
    // MUST be after starlight() — Starlight registers @astrojs/sitemap internally; integration
    // hooks run in registration order, so this needs to fire AFTER sitemap files are written.
    collapseSitemap(),
  ],
})
