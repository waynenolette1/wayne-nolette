# CLAUDE.md

Portfolio site for Wayne Nolette. Astro v5, static build, GitHub Pages.

**Live:** https://wayne-nolette.github.io/wayne-nolette/
**Dev:** `npm run dev` → http://localhost:4321/wayne-nolette/

## Commands

```bash
npm run dev          # Dev server (port 4321)
npm run build        # Type check + static build → dist/
npm run test         # Vitest (15 tests, 9 files)
npm run e2e          # Playwright E2E (builds first, serves static)
npm run lint         # ESLint
npm run format       # Prettier
```

## Pages

All routes require the `/wayne-nolette/` base path prefix.

| Route                 | File                             | Layout          |
| --------------------- | -------------------------------- | --------------- |
| `/`                   | `pages/index.astro`              | BaseLayout      |
| `/writing/`           | `pages/writing/index.astro`      | BaseLayout      |
| `/writing/[id]/`      | `pages/writing/[id].astro`       | PostLayout      |
| `/case-studies/`      | `pages/case-studies/index.astro` | BaseLayout      |
| `/case-studies/[id]/` | `pages/case-studies/[id].astro`  | CaseStudyLayout |
| `/adrs/`              | `pages/adrs/index.astro`         | BaseLayout      |
| `/adrs/[id]/`         | `pages/adrs/[id].astro`          | ArticleLayout   |
| `/resume/`            | `pages/resume.astro`             | BaseLayout      |
| `/404`                | `pages/404.astro`                | BaseLayout      |
| `/offline`            | `pages/offline.astro`            | BaseLayout      |

**Content counts:** 11 writing articles, 4 case studies, 3 ADRs (18 markdown files total, 25 pages rendered).

## Content Collections

| Collection      | Path                        | Layout                  | Key Fields                                                          |
| --------------- | --------------------------- | ----------------------- | ------------------------------------------------------------------- |
| `writing/`      | `src/content/writing/`      | `PostLayout.astro`      | pubDate, tags, draft, featured, confidenceLevel, depth              |
| `case-studies/` | `src/content/case-studies/` | `CaseStudyLayout.astro` | order, role, outcome, tech, skills, metrics, ownership              |
| `adrs/`         | `src/content/adrs/`         | `pages/adrs/[id].astro` | status (accepted\|proposed\|deprecated\|superseded), deciders, tags |

Schemas validated via Zod in `src/content.config.ts`.

## File Map

### Config (root)

| File                       | Purpose                                                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `site.config.mjs`          | **Single source of truth** for `BASE_PATH` (`/wayne-nolette/`) and `SITE_URL`. Imported by astro.config.mjs and remark-base-path.mjs |
| `astro.config.mjs`         | Astro config: static output, MDX + sitemap integrations, Shiki syntax highlighting, hover prefetch strategy                          |
| `vitest.config.ts`         | jsdom environment, 80% coverage threshold, mocks mermaid                                                                             |
| `playwright.config.ts`     | 5 browser projects (Chrome, Safari, iPad, iPhone, Pixel), serves dist/ with base path                                                |
| `remark-base-path.mjs`     | Remark plugin: prepends base path to relative markdown links/images                                                                  |
| `rehype-table-wrapper.mjs` | Rehype plugin: wraps `<table>` in `<div class="table-scroll">` for horizontal scroll                                                 |

### src/layouts/

| File                    | Used By                                | Key Details                                                                                                                                                           |
| ----------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BaseLayout.astro`      | All pages                              | HTML head, nav, mobile menu, SearchDialog, Web Vitals, error handler, View Transition ClientRouter. ~3400 lines with inline scripts                                   |
| `ArticleLayout.astro`   | PostLayout, CaseStudyLayout, ADR pages | Reading progress bar, TOC (desktop+mobile), breadcrumbs, code copy buttons. Named slots: header-badges, header-meta, header-tags, header-extra, footer-extra, related |
| `PostLayout.astro`      | Writing articles                       | Wraps ArticleLayout. Shows date, reading time, confidence, depth badges                                                                                               |
| `CaseStudyLayout.astro` | Case studies                           | Wraps ArticleLayout. Shows metrics hero, TL;DR with role/duration/outcome/tech/skills                                                                                 |

### src/styles/

| File             | Lines  | Purpose                                                                                                                               |
| ---------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `global.css`     | ~2,275 | Design tokens (`--color-*`, `--spacing-*`, `--font-*`), base element styles, utilities (`.sr-only`, `.card`, `.tag`), dark theme only |
| `components.css` | ~1,360 | Buttons, content-wrapper grid, TOC, mobile TOC, reading progress bar, tables, status badges, related articles, page header            |
| `info-tags.css`  | ~154   | `.info-box` family (TL;DR/Article Info boxes), `.labeled-tags` family (tag strips) — shared by PostLayout, CaseStudyLayout, ADR pages |
| `print.css`      | ~397   | Print-specific: hides nav, optimizes article layout                                                                                   |

> `@font-face` declarations are inline in `BaseLayout.astro` (not a CSS file) so font URLs can use `import.meta.env.BASE_URL`.

### src/utils/

| File                  | Exports                                                                  |
| --------------------- | ------------------------------------------------------------------------ |
| `article-features.ts` | `ARTICLE_LAYOUT_SCRIPT` — inline script string for View Transitions      |
| `search.ts`           | `highlightSearchTerms()`, `getContentSnippet()`                          |
| `collections.ts`      | `sortByDateDesc()`, `sortByOrder()`, `groupByYear()`, `getSortedYears()` |
| `performance.ts`      | `WEB_VITALS_SCRIPT`, `DEV_PERFORMANCE_REPORTER`                          |
| `errors.ts`           | `GLOBAL_ERROR_HANDLER`                                                   |
| `seo.ts`              | `generateBreadcrumbSchema()`                                             |
| `date.ts`             | `formatDate()`                                                           |
| `reading-time.ts`     | `calculateReadingTime()`                                                 |

### src/components/

| File                 | Purpose                                                             |
| -------------------- | ------------------------------------------------------------------- |
| `SearchDialog.astro` | Fuse.js full-text search across all collections. Cmd/Ctrl+K trigger |
| `ContactCTA.astro`   | Reusable footer contact card with email link                        |

### src/config/

| File           | Exports                                                                                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `constants.ts` | `SITE_CONFIG` (name, email, github, linkedin, basePath, domain, siteUrl, timing constants, scroll config, TOC config), `ADR_STATUS_COLORS`, `ADRStatus` type |

### src/lib/

| File         | Purpose                                                               |
| ------------ | --------------------------------------------------------------------- |
| `metrics.ts` | Typed metric data for resume impact highlights and case study metrics |

### scripts/

| File                       | Purpose                                                      |
| -------------------------- | ------------------------------------------------------------ |
| `shared.mjs`               | `slugify()`, `escapeYaml()`, `question()`, `closeReadline()` |
| `new-post.mjs`             | Scaffold blog post with frontmatter                          |
| `new-case-study.mjs`       | Scaffold case study with frontmatter                         |
| `optimize-images.mjs`      | Sharp-based WebP/AVIF conversion with responsive widths      |
| `analyze-bundle.mjs`       | JS/CSS sizes (raw + gzipped) with threshold warnings         |
| `debug-css.mjs`            | Playwright CSS debugging (requires dev server)               |
| `extract-critical-css.mjs` | Above-the-fold CSS extraction                                |
| `audit-screenshots.mjs`    | Full-page screenshot audit across viewports                  |

### e2e/

| File                             | Tests                                                   |
| -------------------------------- | ------------------------------------------------------- |
| `all-pages.spec.ts`              | All pages load across 5 browser configs                 |
| `accessibility.spec.ts`          | WCAG 2.1 AA: headings, ARIA, contrast, focus            |
| `comprehensive-features.spec.ts` | Theme switching, article features, TOC, code copy       |
| `interactive-features.spec.ts`   | Search, keyboard shortcuts (j/k, Cmd+K, Escape), scroll |
| `mobile-specific.spec.ts`        | Touch, viewport, mobile menu, reading progress          |
| `search-features.spec.ts`        | Fuzzy search, content filtering, keyboard nav           |
| `performance.spec.ts`            | Load times, Web Vitals, resource counts, caching        |

## Content Cross-Linking

Writing articles link to their parent case study via the `project` frontmatter field (e.g., `project: 'ie-hub-platform'`).

- **Writing → Case Study**: Single line before "What I Learned": `This is part of the [Case Study Title](/wayne-nolette/case-studies/slug/) project.`
- **Case Study → Writing**: `## Related Deep Dives` section before `## Results`, with bullet links + one-line descriptions
- **ADR → Both**: `## Related` section at end with `### Case Studies` and `### Writing` subsections

When adding a new writing article, add the `project` field and a cross-link line. When adding a case study, add a Related Deep Dives section.

## Content Conventions

- **Pseudocode**: UPPERCASE keywords (`FUNCTION`, `IF`, `RETURN`, `FOR EACH`), snake_case variables, 4-space indent. Use plain ``` blocks, not language-tagged.
- **Mermaid diagrams**: Use ```mermaid blocks. Flowchart TD for pipelines, sequenceDiagram for message flows, LR for data flows. Keep nodes under ~15.
- **Tags**: All lowercase, hyphenated (e.g., `data-engineering`, `six-sigma`). ~25 unique tags across 18 content pieces.
- **Product names**: BigQuery (not BQ), Cloud Run (not CloudRun), PagerDuty (not Pagerduty), DataDog (not Datadog).

## Key Patterns

### Inline Scripts (View Transitions)

All client scripts are **template literal strings** from `.ts` files, injected via `<script set:html={SCRIPT_NAME}>`. Not JS bundles. This is intentional for Astro View Transitions (see ADR 005).

### View Transition Guards

Every listener uses a `window.__*Registered` guard to prevent stacking across transitions. Guard properties declared in `src/types/global.d.ts`.

### Cleanup Registry (article-features.ts)

Article scripts use `onCleanup()` / `addListener()` / `trackTimeout()` for centralized teardown. `cleanup()` runs on `astro:before-swap`, `init()` on `astro:after-swap`.

### CSS Class Usage

- `.cta-primary` / `.cta-secondary` — index.astro hero
- `.contact-btn` — ArticleLayout.astro footer
- `.table-scroll` — added by `rehype-table-wrapper.mjs` at build time (NOT `.table-wrapper`)
- `.shiki` — added by Shiki at build time; its CSS must stay in global.css
- TOC: `.table-of-contents` / `.toc-header` / `.toc-nav` (desktop), `.mobile-toc-*` (mobile)
- ArticleLayout selectors use `.article-content :global(...)` only — always present via `class:list`

### CSS Tokens

- Spacing: `--spacing-xs` (0.25rem) → `--spacing-3xl` (8rem)
- Colors: `--color-text`, `--color-bg`, `--color-accent` (#2563eb), `--color-link`, `--color-text-muted`
- Fonts: `--font-body` (DM Sans), `--font-display` (Instrument Serif), `--font-mono` (JetBrains Mono)
- Dark theme only. Background: atmospheric noise texture + radial glow.

## Centralized Configuration

**Base path:** `site.config.mjs` exports `BASE_PATH` (`/wayne-nolette/`) and `SITE_URL`. Imported by `astro.config.mjs`, `remark-base-path.mjs`, and build scripts.

**Runtime:** `src/config/constants.ts` exports `SITE_CONFIG` with URLs, timing, scroll, TOC config. `basePath`, `domain`, `siteUrl` derive from `import.meta.env.BASE_URL` and `import.meta.env.SITE`.

In Astro templates, use `import.meta.env.BASE_URL` for the base path.

## Pitfalls

1. **Base path**: All links need `/wayne-nolette/` prefix. Use `SITE_CONFIG.basePath` or `import.meta.env.BASE_URL`, never hardcode.
2. **Global CSS specificity**: Base element styles in `global.css` can override scoped layout styles. Check there first.
3. **Scoped vs global**: Markdown content inside Astro components needs `:global()` wrapper.
4. **Port conflicts**: Dev server uses port 4321. Kill with `lsof -i :4321` if needed.
5. **Font loading**: Self-hosted fonts declared inline in `BaseLayout.astro` using `import.meta.env.BASE_URL`.
6. **No hardcoded URLs**: Use `SITE_CONFIG.domain` or `SITE_CONFIG.siteUrl`, never raw strings.
7. **Shiki CSS**: `.shiki` class added at build time — its CSS must stay in global.css even though grep won't find it in source.
8. **Table wrapper class**: rehype plugin adds `.table-scroll` (NOT `.table-wrapper`).
9. **Markdown links**: `remark-base-path.mjs` prepends base path to relative links. Links in markdown starting with `/wayne-nolette/` are absolute and bypass the plugin. Both work, but be consistent within a file.

## Style Guide

Short, blunt, confident. Active voice. Concrete numbers with units. Structure: Problem → Why → Decision → Tradeoffs → Results. First-person singular ("I built", "I chose"). TL;DR block at top of each article.

## Deployment

Auto-deploys on push to `main` via `.github/workflows/deploy.yml`. CI runs lint, build, test, and Lighthouse (`.github/workflows/ci.yml`).

### GitHub Pages Setup

1. Repo **Settings** > **Pages** > Source: **"GitHub Actions"**
2. Push to `main` — deploys automatically

## CSS Debug Tool

For diagnosing layout issues (requires `npm run dev` running):

```bash
node scripts/debug-css.mjs /path/ --inspect "h2,p"
node scripts/debug-css.mjs /path/ --bbox "h2,p,ul"
node scripts/debug-css.mjs /path/ --compare "h2,p"
node scripts/debug-css.mjs /path/ --rules "p"
```
