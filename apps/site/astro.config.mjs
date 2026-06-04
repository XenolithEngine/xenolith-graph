import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import react from '@astrojs/react'
import vue from '@astrojs/vue'

export default defineConfig({
  site: 'https://xenolithengine.github.io',
  base: '/xenolith-graph',
  vite: {
    // Force a single physical copy of PIXI (its extensions self-register on import; two copies →
    // "Extension type shape-builder already has a handler") and pre-bundle it so Vite optimizes in
    // ONE pass — otherwise discovering a new demo import mid-load triggers a re-optimize and PIXI
    // ends up loaded from two optimize generations on the same page.
    optimizeDeps: { include: ['pixi.js', 'react', 'react-dom', 'react-dom/client', 'vue'] },
    resolve: {
      dedupe: ['pixi.js', 'react', 'react-dom', 'vue'],
      alias: {
        '@xenolithengine/core':         new URL('../../packages/core/src/index.ts',         import.meta.url).pathname,
        '@xenolithengine/render-pixi':  new URL('../../packages/render-pixi/src/index.ts',  import.meta.url).pathname,
        '@xenolithengine/editor':       new URL('../../packages/editor/src/index.ts',       import.meta.url).pathname,
        '@xenolithengine/adapter-core': new URL('../../packages/adapter-core/src/index.ts', import.meta.url).pathname,
        '@xenolithengine/react':        new URL('../../packages/react/src/index.tsx',       import.meta.url).pathname,
        '@xenolithengine/vue':          new URL('../../packages/vue/src/index.ts',          import.meta.url).pathname,
        '@xenolithengine/svelte':       new URL('../../packages/svelte/src/index.ts',       import.meta.url).pathname,
        '@xenolithengine/solid':        new URL('../../packages/solid/src/index.ts',        import.meta.url).pathname,
        '@xenolithengine/angular':      new URL('../../packages/angular/src/index.ts',      import.meta.url).pathname,
        '@xenolithengine/theme-xen':           new URL('../../packages/theme-xen/src/index.ts',           import.meta.url).pathname,
        '@xenolithengine/theme-liquid-glass':  new URL('../../packages/theme-liquid-glass/src/index.ts',  import.meta.url).pathname,
        '@xenolithengine/theme-synthwave':     new URL('../../packages/theme-synthwave/src/index.ts',     import.meta.url).pathname,
        '@xenolithengine/theme-holographic':   new URL('../../packages/theme-holographic/src/index.ts',   import.meta.url).pathname,
        '@xenolithengine/plugin-autolayout/dagre': new URL('../../packages/plugin-autolayout/src/adapters/dagre.ts', import.meta.url).pathname,
        '@xenolithengine/plugin-autolayout/elk':   new URL('../../packages/plugin-autolayout/src/adapters/elk.ts',   import.meta.url).pathname,
        '@xenolithengine/plugin-autolayout':       new URL('../../packages/plugin-autolayout/src/index.ts',           import.meta.url).pathname,
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
        { tag: 'meta', attrs: { property: 'og:image',        content: 'https://xenolithengine.github.io/xenolith-graph/og.png' } },
        { tag: 'meta', attrs: { property: 'og:image:width',  content: '1200' } },
        { tag: 'meta', attrs: { property: 'og:image:height', content: '630' } },
        { tag: 'meta', attrs: { name: 'twitter:card',        content: 'summary_large_image' } },
        { tag: 'meta', attrs: { name: 'twitter:image',       content: 'https://xenolithengine.github.io/xenolith-graph/og.png' } },
        { tag: 'meta', attrs: { name: 'twitter:site',        content: '@xenolithengine' } },
        { tag: 'meta', attrs: { name: 'twitter:creator',     content: '@xenolithengine' } },
        // AI / LLM discovery — https://llmstxt.org
        { tag: 'link', attrs: { rel: 'alternate', type: 'text/plain', href: 'https://xenolithengine.github.io/xenolith-graph/llms.txt',      title: 'llms.txt (LLM-friendly index)' } },
        { tag: 'link', attrs: { rel: 'alternate', type: 'text/plain', href: 'https://xenolithengine.github.io/xenolith-graph/llms-full.txt', title: 'llms-full.txt (every guide concatenated)' } },
        { tag: 'link', attrs: { rel: 'alternate', type: 'text/markdown', href: 'https://xenolithengine.github.io/xenolith-graph/agents.md', title: 'agents.md (AI agent manifesto)' } },
        // Schema.org Organization — helps Google Knowledge Graph + AI crawlers understand who ships this.
        { tag: 'script', attrs: { type: 'application/ld+json' }, content: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'XenolithEngine',
          url: 'https://xenolithengine.github.io/xenolith-graph/',
          logo: 'https://xenolithengine.github.io/xenolith-graph/favicon-64.png',
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
          url: 'https://xenolithengine.github.io/xenolith-graph/',
          license: 'https://opensource.org/licenses/MIT',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        }) },
      ],
    }),
  ],
})
