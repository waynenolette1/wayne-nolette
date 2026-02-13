# Wayne Nolette - Portfolio

Static portfolio site built with Astro v5. [Live site](https://wayne-nolette1.github.io/wayne-nolette/)

## What This Is

A technical portfolio showcasing professional work. Three content types:

- **Case Studies** — Deep dives on projects I've built (AI systems, SPC dashboards, quality tools)
- **Writing** — Technical articles on AI systems, cloud automation, engineering operations
- **ADRs** — Architecture Decision Records explaining why specific approaches were chosen

## Design Decisions

**Static generation over dynamic:** Every page pre-rendered at build time. No runtime dependencies, no server costs, instant loads. The content doesn't change frequently enough to justify complexity.

**Markdown content with Zod validation:** Content lives in `src/content/` as Markdown files. Zod schemas in `content.config.ts` validate frontmatter at build time. Catches broken links and missing fields before deploy.

**Minimal dependencies:** Astro + Fuse.js for search. No UI frameworks. CSS is vanilla with custom properties for theming. The goal is a codebase that's easy to understand in 5 minutes.

**Performance by default:** Self-hosted fonts, lazy loading, basic service worker for caching. No analytics tracking. Lighthouse scores consistently 95+.

## Project Structure

```
src/
├── components/     # Reusable UI (SearchDialog, ContactCTA)
├── config/         # Site constants, timing values
├── content/        # Markdown collections (writing, case-studies, adrs)
├── layouts/        # Page templates (BaseLayout, ArticleLayout)
├── pages/          # File-based routing
├── styles/         # CSS (global tokens, component styles)
└── utils/          # Date formatting, search, reading time
```

## Quick Start

```bash
npm install
npm run dev        # http://localhost:4321/wayne-nolette/
npm run build      # Type check + static build
npm run test       # Vitest unit tests
npm run e2e        # Playwright E2E tests
```

## Deployment

Deploys automatically to GitHub Pages on push to `main` via `.github/workflows/deploy.yml`.

Live at `https://wayne-nolette.github.io/wayne-nolette/`.

## Testing

Unit tests (Vitest) cover utilities. E2E tests (Playwright) cover user flows across desktop, mobile, and tablet viewports. Accessibility testing included.

## Screenshot Audit

Visual audit tool for comparing layout changes across viewports:

```bash
# Capture baseline screenshots
AUDIT_LABEL=before npm run audit:screenshots -- --pages-only --focused

# Make CSS/layout changes...

# Capture comparison screenshots
AUDIT_LABEL=after npm run audit:screenshots -- --pages-only --focused

# Viewport-only screenshots (more readable, not full-page)
npm run audit:screenshots -- --focused --viewport
```

Screenshots saved to `test-results/audit/{label}/`. Uses Playwright to capture mobile (390px), tablet (820px), and desktop (1440px) viewports. Images auto-downscaled to max 2000px for API compatibility.

---

Built with [Astro](https://astro.build). Deployed via GitHub Actions to GitHub Pages.
