# Architecture

Static portfolio site built with Astro v5. All pages pre-rendered at build time from Markdown content.

## Overview

```
src/content/*.md → Zod validation → Astro templates → dist/ (static HTML)
                                                           ↓
                                                    GitHub Pages
```

## Content Collections

Three collections in `src/content/`:

| Collection      | Purpose                     | Key Fields                     |
| --------------- | --------------------------- | ------------------------------ |
| `writing/`      | Technical articles          | pubDate, tags, draft, featured |
| `case-studies/` | Production project writeups | order, role, outcome, tech     |
| `adrs/`         | Architecture decisions      | status, deciders               |

All frontmatter validated via Zod schemas in `src/content.config.ts`.

## Directory Structure

```
src/
├── components/        # Reusable UI components
│   ├── ContactCTA.astro             # Call-to-action section
│   ├── PerformanceComparison.astro  # Before/after performance viz
│   └── SearchDialog.astro           # Global search modal (Cmd+K)
├── config/            # Site constants (SITE_CONFIG, timing, scroll, TOC)
├── content/           # Markdown content (collections)
├── layouts/           # Page templates
│   ├── BaseLayout.astro       # Shared header/footer/meta/scripts
│   ├── ArticleLayout.astro    # Shared article layout (TOC, progress bar)
│   ├── PostLayout.astro       # Writing article layout
│   └── CaseStudyLayout.astro  # Case study layout
├── lib/               # Third-party integrations (metrics)
├── pages/             # File-based routing
├── styles/            # CSS
│   ├── global.css        # Design tokens, base styles, utilities
│   ├── components.css    # Shared component styles (buttons, etc.)
│   ├── fonts.css         # Self-hosted font definitions
│   └── print.css         # Print-specific styles
└── utils/             # Helpers (dates, reading time, SEO, errors, search)
```

## Key Files

- `astro.config.mjs` — Output: static, base: `/wayne-nolette/`, MDX + sitemap
- `src/content.config.ts` — Collection schemas with Zod validation
- `src/config/constants.ts` — Centralized site config (name, basePath, domain, siteUrl, timing constants)
- `src/layouts/BaseLayout.astro` — Header, footer, meta tags, View Transitions, mobile menu, keyboard shortcuts
- `src/layouts/ArticleLayout.astro` — Shared layout for all article types (TOC, progress bar, code copy)

## Features

### View Transitions

Uses Astro's View Transitions API for smooth page navigation without full reloads. Persistent elements maintained across navigation via `transition:persist`.

### Mermaid Diagrams

Lazy-loaded from CDN with interactive controls:

- Zoom in/out with proper scrollable area expansion
- Pan navigation (up/down/left/right)
- Mobile touch support with gesture handling
- Reset to default view
- Full-screen expand mode

### Mobile Experience

- Slide-out navigation with focus trap and backdrop
- 48px minimum touch targets
- Active states for all interactive elements
- Pull-to-refresh indicator (visual only)
- Safe area inset support for notched devices

### Accessibility

- Skip link for keyboard navigation
- Reduced motion support (`prefers-reduced-motion`)
- Focus visible states on all interactive elements
- ARIA labels on icon-only buttons
- Semantic HTML structure

### Search

Global search (Cmd+K / Ctrl+K) with:

- Fuzzy matching across all content
- Search history with recent queries
- Keyboard navigation
- Highlighted search terms in results

### Performance

- Self-hosted fonts (Inter, JetBrains Mono) with `font-display: swap`
- Content-visibility optimization for long pages
- CSS containment for rendering performance
- Lazy-loaded external resources (Mermaid, analytics)
- Speculative prefetching for faster navigation

### SEO

- JSON-LD structured data (Person, Website, Article, Breadcrumbs)
- Open Graph and Twitter meta tags
- RSS feed
- Sitemap generation

## Styles

### Design Tokens

CSS custom properties in `global.css`:

- Colors: `--color-*` (with light/dark theme support)
- Spacing: `--spacing-*` (xs through 3xl)
- Typography: `--font-*`, `--text-*`
- Borders: `--radius-*`, `--color-border*`
- Shadows: `--shadow-*`
- Transitions: `--transition-*`

### Theme

Dark theme by default with light theme support via `[data-theme="light"]` attribute. Toggle in header persists to localStorage.

## Build

```bash
npm run build   # Type check + static build → dist/
npm run preview # Preview production build locally
```

Deploys to GitHub Pages on push to `main` via GitHub Actions.
