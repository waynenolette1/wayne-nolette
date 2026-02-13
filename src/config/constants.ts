/**
 * Centralized constants for the portfolio site.
 * Avoids magic strings/numbers scattered throughout the codebase.
 */

// ======================
// Site Configuration
// ======================

export const SITE_CONFIG = {
  name: 'Wayne Nolette',
  title: 'Tech Manager | AI Systems & Cloud Automation',
  email: 'Waynenolette@gmail.com',
  github: 'https://github.com/waynenolette1',
  linkedin: 'https://www.linkedin.com/in/wayne-nolette-376416168',
  description:
    'Tech Manager specializing in AI systems, cloud automation, and data-powered decisioning. Building scalable systems, automating workflows, and improving engineering visibility through software at ZoomInfo.',
  /** Base path for the site — derived from Astro config at build time */
  basePath: import.meta.env.BASE_URL,
  /** Full domain for analytics and external links */
  domain: new URL(import.meta.env.SITE).hostname,
  /** Full site URL */
  siteUrl: `${import.meta.env.SITE}${import.meta.env.BASE_URL}`,
} as const;

// ======================
// ADR Status Configuration
// ======================

export const ADR_STATUS_COLORS = {
  accepted: 'var(--color-success)',
  proposed: 'var(--color-warning)',
  deprecated: 'var(--color-text-muted)',
  superseded: 'var(--color-text-muted)',
} as const;

export type ADRStatus = keyof typeof ADR_STATUS_COLORS;
