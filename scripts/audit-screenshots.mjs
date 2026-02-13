/* eslint-disable no-undef */
/**
 * Comprehensive Playwright Audit Script
 *
 * Takes screenshots of every page across mobile, tablet, and desktop viewports.
 * Tests all interactive features and captures their states.
 *
 * Usage:
 *   node scripts/audit-screenshots.mjs
 *   node scripts/audit-screenshots.mjs --pages-only     # Skip interactive tests
 *   node scripts/audit-screenshots.mjs --features-only  # Only interactive tests
 *   AUDIT_LABEL=before node scripts/audit-screenshots.mjs  # Output to before/ folder
 *   AUDIT_LABEL=after node scripts/audit-screenshots.mjs   # Output to after/ folder
 *
 * Requires: npm run build && npm run preview (or dev server on port 4321)
 */

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { BASE_PATH } from '../site.config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUDIT_LABEL = process.env.AUDIT_LABEL || 'latest';
const OUT = join(__dirname, '..', 'test-results', 'audit', AUDIT_LABEL);
const BASE = `http://localhost:4321${BASE_PATH}`;
const MAX_DIMENSION = 2000; // Max pixels on longest side for Claude API compatibility

// Parse CLI args
const args = process.argv.slice(2);
const pagesOnly = args.includes('--pages-only');
const featuresOnly = args.includes('--features-only');
const focusedMode = args.includes('--focused'); // Only capture key writing pages
const viewportOnly = args.includes('--viewport'); // Capture viewport-sized screenshots (not full-page)

// ============================================================================
// VIEWPORTS
// ============================================================================
const VIEWPORTS = {
  mobile: {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  tablet: {
    width: 820,
    height: 1180,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  desktop: {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  },
};

// ============================================================================
// ALL PAGES
// ============================================================================

// Static pages
const STATIC_PAGES = [
  { path: '/', name: 'home' },
  { path: '/resume/', name: 'resume' },
  { path: '/offline/', name: 'offline' },
  { path: '/404/', name: '404' },
  { path: '/writing/', name: 'writing-index' },
  { path: '/case-studies/', name: 'case-studies-index' },
  { path: '/adrs/', name: 'adrs-index' },
];

// Writing articles (all 35)
const WRITING_PAGES = [
  '/writing/airflow-async-triggers-rate-limiting/',
  '/writing/anatomy-of-outage/',
  '/writing/async-task-orchestration-patterns/',
  '/writing/batch-geo-enrichment-spark/',
  '/writing/billing-correctness-rust/',
  '/writing/circuit-breakers-rust/',
  '/writing/clickhouse-denormalization-realtime-analytics/',
  '/writing/custom-mmdb-generation-go/',
  '/writing/debugging-p99-latency-spike/',
  '/writing/deferrable-operators-airflow/',
  '/writing/distributed-api-integration/',
  '/writing/dynamic-dag-generation-airflow/',
  '/writing/engineering-principles/',
  '/writing/ephemeral-spot-instances-ecs/',
  '/writing/extractive-context-compression/',
  '/writing/five-level-caching/',
  '/writing/growing-engineers-production-systems/',
  '/writing/hybrid-crawling-ml-extraction/',
  '/writing/hybrid-retrieval-ontology/',
  '/writing/hybrid-search-rust-clickhouse/',
  '/writing/intent-aware-confidence-scoring/',
  '/writing/intent-spike-detection/',
  '/writing/agents-vs-deterministic-pipelines-retrieval/',
  '/writing/multi-signal-reranking/',
  '/writing/observability-at-scale/',
  '/writing/production-control-loop-patterns/',
  '/writing/pure-functions-ml/',
  '/writing/quantifying-engineering-impact/',
  '/writing/query-decomposition-rrf/',
  '/writing/realtime-ml-inference-architecture/',
  '/writing/testing-310k-line-rust-codebase/',
  '/writing/tiered-classification/',
  '/writing/why-rules-not-ml-fraud-detection/',
  '/writing/zero-downtime-data-migration/',
  '/writing/zero-downtime-table-updates/',
].map((path) => ({ path, name: `writing-${path.split('/')[2]}` }));

// Case studies (all 7)
const CASE_STUDY_PAGES = [
  '/case-studies/fraud-detection-pipeline/',
  '/case-studies/batch-processing-platform/',
  '/case-studies/mcp-server-marketing-apis/',
  '/case-studies/production-rag-system/',
  '/case-studies/real-time-ml-inference/',
  '/case-studies/telemetry-ingestion-service/',
  '/case-studies/traffic-scoring-pipeline/',
].map((path) => ({ path, name: `case-study-${path.split('/')[2]}` }));

// ADRs (all 5)
const ADR_PAGES = [
  '/adrs/001-deterministic-over-agentic-rag/',
  '/adrs/002-tiered-classification/',
  '/adrs/003-rust-over-python/',
  '/adrs/004-rules-over-ml-fraud-detection/',
  '/adrs/005-testable-inline-scripts/',
].map((path) => ({ path, name: `adr-${path.split('/')[2]}` }));

// Focused subset for faster iteration (key writing pages with different content types)
const FOCUSED_PAGES = [
  { path: '/writing/', name: 'writing-index' },
  // Long article with code blocks
  {
    path: '/writing/circuit-breakers-rust/',
    name: 'writing-circuit-breakers-rust',
  },
  // Article with tables
  { path: '/writing/five-level-caching/', name: 'writing-five-level-caching' },
  // Article with diagrams/lists
  {
    path: '/writing/async-task-orchestration-patterns/',
    name: 'writing-async-task-orchestration',
  },
  // Shorter article
  { path: '/writing/anatomy-of-outage/', name: 'writing-anatomy-of-outage' },
  // Case study with tables and diagrams
  {
    path: '/case-studies/fraud-detection-pipeline/',
    name: 'case-study-fraud-detection',
  },
  // ADR page
  {
    path: '/adrs/004-rules-over-ml-fraud-detection/',
    name: 'adr-rules-over-ml',
  },
];

// All pages combined
const ALL_PAGES = focusedMode
  ? FOCUSED_PAGES
  : [...STATIC_PAGES, ...WRITING_PAGES, ...CASE_STUDY_PAGES, ...ADR_PAGES];

// ============================================================================
// HELPERS
// ============================================================================

function log(msg) {
  const time = new Date().toLocaleTimeString('en-US', { hour12: false });
  console.log(`[${time}] ${msg}`);
}

async function waitForNetworkIdle(page, timeout = 5000) {
  try {
    await page.waitForLoadState('networkidle', { timeout });
  } catch {
    // Continue even if networkidle times out
  }
}

/**
 * Wait for fonts to be ready
 */
async function waitForFonts(page) {
  try {
    await page.evaluate(() => document.fonts?.ready);
  } catch {
    // Continue if fonts API not available
  }
}

/**
 * Downscale image if either dimension exceeds MAX_DIMENSION
 */
async function downscaleIfNeeded(imagePath) {
  try {
    const image = sharp(imagePath);
    const metadata = await image.metadata();
    const { width, height } = metadata;

    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      const scale = MAX_DIMENSION / Math.max(width, height);
      const newWidth = Math.round(width * scale);
      const newHeight = Math.round(height * scale);

      // Read, resize, and overwrite
      const buffer = await sharp(imagePath)
        .resize(newWidth, newHeight, { fit: 'inside' })
        .png()
        .toBuffer();

      writeFileSync(imagePath, buffer);
      log(
        `    ↳ Downscaled from ${width}x${height} to ${newWidth}x${newHeight}`
      );
    }
  } catch (err) {
    log(`    [WARN] Failed to downscale ${imagePath}: ${err.message}`);
  }
}

async function screenshot(page, filename, options = {}) {
  const path = join(OUT, filename);
  await page.screenshot({ path, ...options });
  await downscaleIfNeeded(path);
  return path;
}

// ============================================================================
// PAGE SCREENSHOTS
// ============================================================================

async function captureAllPages(browser) {
  log('=== PAGE SCREENSHOTS ===');
  const results = { success: [], errors: [] };

  for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
    const subdir = join(OUT, 'pages', viewportName);
    mkdirSync(subdir, { recursive: true });

    log(`\nViewport: ${viewportName} (${viewport.width}x${viewport.height})`);

    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: viewport.deviceScaleFactor,
      isMobile: viewport.isMobile,
      hasTouch: viewport.hasTouch,
      reducedMotion: 'reduce', // Disable animations for stable screenshots
    });

    for (const { path, name } of ALL_PAGES) {
      const page = await context.newPage();
      const url = `${BASE}${path}`;

      try {
        const response = await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        });
        await waitForNetworkIdle(page);
        await waitForFonts(page);

        // Wait for layout to settle
        await page.waitForTimeout(200);

        const status = response?.status() || 0;
        if (status !== 200) {
          results.errors.push({ name, viewport: viewportName, status, url });
          log(`  [FAIL] ${name}: HTTP ${status}`);
        } else {
          // Use viewport-only mode for better readability (not scaled down as much)
          await screenshot(page, `pages/${viewportName}/${name}.png`, {
            fullPage: !viewportOnly,
          });
          results.success.push({ name, viewport: viewportName });
          log(`  [OK] ${name}`);
        }
      } catch (err) {
        results.errors.push({
          name,
          viewport: viewportName,
          error: err.message,
        });
        log(`  [ERR] ${name}: ${err.message}`);
      }

      await page.close();
    }

    await context.close();
  }

  return results;
}

// ============================================================================
// INTERACTIVE FEATURE TESTS
// ============================================================================

async function testInteractiveFeatures(browser) {
  log('\n=== INTERACTIVE FEATURES ===');
  const results = { success: [], errors: [] };

  for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
    const subdir = join(OUT, 'features', viewportName);
    mkdirSync(subdir, { recursive: true });

    log(`\nViewport: ${viewportName}`);

    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: viewport.deviceScaleFactor,
      isMobile: viewport.isMobile,
      hasTouch: viewport.hasTouch,
      reducedMotion: 'reduce', // Disable animations for stable screenshots
    });

    const page = await context.newPage();

    // ===== Search Dialog =====
    try {
      await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
      await waitForNetworkIdle(page);
      await page.waitForTimeout(300);

      // Open search
      const searchTrigger = page.locator('#search-trigger');
      if (await searchTrigger.isVisible()) {
        await searchTrigger.click();
        await page.waitForTimeout(400);
        await screenshot(page, `features/${viewportName}/search-open.png`);

        // Type search query
        const searchInput = page.locator('#search-input');
        await searchInput.fill('rust');
        await page.waitForTimeout(500);
        await screenshot(page, `features/${viewportName}/search-results.png`);

        // Close search
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);

        results.success.push({ feature: 'search', viewport: viewportName });
        log(`  [OK] Search dialog`);
      }
    } catch (err) {
      results.errors.push({
        feature: 'search',
        viewport: viewportName,
        error: err.message,
      });
      log(`  [ERR] Search dialog: ${err.message}`);
    }

    // ===== Mobile Menu (mobile/tablet only) =====
    if (viewport.isMobile) {
      try {
        await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
        await waitForNetworkIdle(page);
        await page.waitForTimeout(300);

        const menuBtn = page.locator('.mobile-menu-btn');
        if (await menuBtn.isVisible()) {
          await menuBtn.click();
          await page.waitForTimeout(400);
          await screenshot(
            page,
            `features/${viewportName}/mobile-menu-open.png`
          );

          // Close menu
          await menuBtn.click();
          await page.waitForTimeout(300);

          results.success.push({
            feature: 'mobile-menu',
            viewport: viewportName,
          });
          log(`  [OK] Mobile menu`);
        }
      } catch (err) {
        results.errors.push({
          feature: 'mobile-menu',
          viewport: viewportName,
          error: err.message,
        });
        log(`  [ERR] Mobile menu: ${err.message}`);
      }
    }

    // ===== Keyboard Shortcuts Help =====
    try {
      await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
      await waitForNetworkIdle(page);
      await page.waitForTimeout(300);
      await page.click('body');
      await page.keyboard.press('/');
      await page.waitForTimeout(400);

      const overlay = page.locator('#shortcuts-help');
      if (await overlay.isVisible()) {
        await screenshot(
          page,
          `features/${viewportName}/keyboard-shortcuts.png`
        );
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);

        results.success.push({
          feature: 'keyboard-shortcuts',
          viewport: viewportName,
        });
        log(`  [OK] Keyboard shortcuts`);
      }
    } catch (err) {
      results.errors.push({
        feature: 'keyboard-shortcuts',
        viewport: viewportName,
        error: err.message,
      });
      log(`  [ERR] Keyboard shortcuts: ${err.message}`);
    }

    // ===== Reading Progress Bar =====
    try {
      await page.goto(`${BASE}/writing/circuit-breakers-rust/`, {
        waitUntil: 'domcontentloaded',
      });
      await waitForNetworkIdle(page);
      await page.waitForTimeout(300);

      // Scroll halfway down
      await page.evaluate(() =>
        window.scrollTo(0, document.body.scrollHeight / 2)
      );
      await page.waitForTimeout(300);
      await screenshot(page, `features/${viewportName}/progress-bar-50.png`, {
        fullPage: false,
      });

      // Scroll to bottom
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(300);
      await screenshot(page, `features/${viewportName}/progress-bar-100.png`, {
        fullPage: false,
      });

      results.success.push({ feature: 'progress-bar', viewport: viewportName });
      log(`  [OK] Reading progress bar`);
    } catch (err) {
      results.errors.push({
        feature: 'progress-bar',
        viewport: viewportName,
        error: err.message,
      });
      log(`  [ERR] Reading progress bar: ${err.message}`);
    }

    // ===== Table of Contents (Desktop only) =====
    if (!viewport.isMobile) {
      try {
        await page.goto(`${BASE}/writing/circuit-breakers-rust/`, {
          waitUntil: 'domcontentloaded',
        });
        await waitForNetworkIdle(page);
        await page.waitForTimeout(300);

        const toc = page.locator('#toc');
        if (await toc.isVisible()) {
          await screenshot(page, `features/${viewportName}/toc-sidebar.png`, {
            fullPage: false,
          });

          results.success.push({
            feature: 'toc-desktop',
            viewport: viewportName,
          });
          log(`  [OK] TOC sidebar`);
        }
      } catch (err) {
        results.errors.push({
          feature: 'toc-desktop',
          viewport: viewportName,
          error: err.message,
        });
        log(`  [ERR] TOC sidebar: ${err.message}`);
      }
    }

    // ===== Mobile TOC (mobile/tablet only) =====
    if (viewport.isMobile) {
      try {
        await page.goto(`${BASE}/writing/circuit-breakers-rust/`, {
          waitUntil: 'domcontentloaded',
        });
        await waitForNetworkIdle(page);
        await page.waitForTimeout(300);

        const tocToggle = page.locator('#mobile-toc-toggle');
        if (await tocToggle.isVisible()) {
          await tocToggle.click();
          await page.waitForTimeout(400);
          await screenshot(
            page,
            `features/${viewportName}/mobile-toc-open.png`
          );

          // Close TOC
          const backdrop = page.locator('#mobile-toc-backdrop');
          await backdrop.click();
          await page.waitForTimeout(300);

          results.success.push({
            feature: 'mobile-toc',
            viewport: viewportName,
          });
          log(`  [OK] Mobile TOC`);
        }
      } catch (err) {
        results.errors.push({
          feature: 'mobile-toc',
          viewport: viewportName,
          error: err.message,
        });
        log(`  [ERR] Mobile TOC: ${err.message}`);
      }
    }

    // ===== Code Copy Button =====
    try {
      await page.goto(`${BASE}/writing/circuit-breakers-rust/`, {
        waitUntil: 'domcontentloaded',
      });
      await waitForNetworkIdle(page);
      await page.waitForTimeout(300);

      const copyBtn = page.locator('.code-copy-btn').first();
      if (await copyBtn.isVisible()) {
        await copyBtn.click();
        await page.waitForTimeout(300);
        await screenshot(
          page,
          `features/${viewportName}/code-copy-feedback.png`,
          { fullPage: false }
        );

        results.success.push({ feature: 'code-copy', viewport: viewportName });
        log(`  [OK] Code copy button`);
      }
    } catch (err) {
      results.errors.push({
        feature: 'code-copy',
        viewport: viewportName,
        error: err.message,
      });
      log(`  [ERR] Code copy button: ${err.message}`);
    }

    // ===== Scroll to Top Button =====
    try {
      await page.goto(`${BASE}/resume/`, { waitUntil: 'domcontentloaded' });
      await waitForNetworkIdle(page);
      await page.waitForTimeout(300);

      // Scroll down
      await page.evaluate(() => window.scrollTo(0, 800));
      await page.waitForTimeout(500);

      const scrollTopBtn = page.locator('#scroll-top');
      if (await scrollTopBtn.isVisible()) {
        await screenshot(
          page,
          `features/${viewportName}/scroll-top-visible.png`,
          { fullPage: false }
        );

        // Click it
        await scrollTopBtn.click();
        await page.waitForTimeout(500);
        await screenshot(
          page,
          `features/${viewportName}/scroll-top-clicked.png`,
          { fullPage: false }
        );

        results.success.push({ feature: 'scroll-top', viewport: viewportName });
        log(`  [OK] Scroll to top`);
      }
    } catch (err) {
      results.errors.push({
        feature: 'scroll-top',
        viewport: viewportName,
        error: err.message,
      });
      log(`  [ERR] Scroll to top: ${err.message}`);
    }

    // ===== Header Scroll State =====
    try {
      await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
      await waitForNetworkIdle(page);
      await page.waitForTimeout(300);

      // Before scroll
      await screenshot(page, `features/${viewportName}/header-top.png`, {
        fullPage: false,
      });

      // After scroll
      await page.evaluate(() => window.scrollTo(0, 150));
      await page.waitForTimeout(300);
      await screenshot(page, `features/${viewportName}/header-scrolled.png`, {
        fullPage: false,
      });

      results.success.push({
        feature: 'header-scroll',
        viewport: viewportName,
      });
      log(`  [OK] Header scroll state`);
    } catch (err) {
      results.errors.push({
        feature: 'header-scroll',
        viewport: viewportName,
        error: err.message,
      });
      log(`  [ERR] Header scroll state: ${err.message}`);
    }

    // ===== Theme Toggle (if present) =====
    try {
      await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
      await waitForNetworkIdle(page);
      await page.waitForTimeout(300);

      const themeToggle = page.locator('#theme-toggle, .theme-toggle');
      if (await themeToggle.isVisible()) {
        await screenshot(page, `features/${viewportName}/theme-dark.png`, {
          fullPage: false,
        });

        await themeToggle.click();
        await page.waitForTimeout(300);
        await screenshot(page, `features/${viewportName}/theme-light.png`, {
          fullPage: false,
        });

        // Reset to dark
        await themeToggle.click();
        await page.waitForTimeout(300);

        results.success.push({
          feature: 'theme-toggle',
          viewport: viewportName,
        });
        log(`  [OK] Theme toggle`);
      }
    } catch {
      // Theme toggle may not exist - that's OK
    }

    // ===== Writing Filters =====
    try {
      await page.goto(`${BASE}/writing/`, { waitUntil: 'domcontentloaded' });
      await waitForNetworkIdle(page);
      await page.waitForTimeout(300);

      const filters = page.locator('.filter-pills button, [role="tab"]');
      if ((await filters.count()) > 1) {
        await screenshot(
          page,
          `features/${viewportName}/writing-filters-default.png`,
          { fullPage: false }
        );

        // Click second filter
        await filters.nth(1).click();
        await page.waitForTimeout(300);
        await screenshot(
          page,
          `features/${viewportName}/writing-filters-active.png`,
          { fullPage: false }
        );

        results.success.push({
          feature: 'writing-filters',
          viewport: viewportName,
        });
        log(`  [OK] Writing filters`);
      }
    } catch (err) {
      results.errors.push({
        feature: 'writing-filters',
        viewport: viewportName,
        error: err.message,
      });
      log(`  [ERR] Writing filters: ${err.message}`);
    }

    // ===== Share Section (Writing articles) =====
    try {
      await page.goto(`${BASE}/writing/anatomy-of-outage/`, {
        waitUntil: 'domcontentloaded',
      });
      await waitForNetworkIdle(page);
      await page.waitForTimeout(300);

      // Scroll to footer
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(300);

      const shareSection = page.locator('.share-section');
      if (await shareSection.isVisible()) {
        await screenshot(page, `features/${viewportName}/share-section.png`, {
          fullPage: false,
        });

        // Click copy link
        const copyLinkBtn = page.locator('#copy-link-btn');
        if (await copyLinkBtn.isVisible()) {
          await copyLinkBtn.click();
          await page.waitForTimeout(300);
          await screenshot(page, `features/${viewportName}/share-copied.png`, {
            fullPage: false,
          });
        }

        results.success.push({
          feature: 'share-section',
          viewport: viewportName,
        });
        log(`  [OK] Share section`);
      }
    } catch (err) {
      results.errors.push({
        feature: 'share-section',
        viewport: viewportName,
        error: err.message,
      });
      log(`  [ERR] Share section: ${err.message}`);
    }

    // ===== Related Articles Section =====
    try {
      await page.goto(`${BASE}/writing/anatomy-of-outage/`, {
        waitUntil: 'domcontentloaded',
      });
      await waitForNetworkIdle(page);
      await page.waitForTimeout(300);

      await page.evaluate(() =>
        window.scrollTo(0, document.body.scrollHeight - 800)
      );
      await page.waitForTimeout(300);

      const relatedSection = page.locator('.related-articles');
      if (await relatedSection.isVisible()) {
        await screenshot(
          page,
          `features/${viewportName}/related-articles.png`,
          { fullPage: false }
        );

        results.success.push({
          feature: 'related-articles',
          viewport: viewportName,
        });
        log(`  [OK] Related articles`);
      }
    } catch (err) {
      results.errors.push({
        feature: 'related-articles',
        viewport: viewportName,
        error: err.message,
      });
      log(`  [ERR] Related articles: ${err.message}`);
    }

    // ===== ADR Status Badge =====
    try {
      await page.goto(`${BASE}/adrs/004-rules-over-ml-fraud-detection/`, {
        waitUntil: 'domcontentloaded',
      });
      await waitForNetworkIdle(page);
      await page.waitForTimeout(300);

      const statusBadge = page.locator('.status-badge');
      if (await statusBadge.isVisible()) {
        await screenshot(
          page,
          `features/${viewportName}/adr-status-badge.png`,
          { fullPage: false }
        );

        results.success.push({ feature: 'adr-status', viewport: viewportName });
        log(`  [OK] ADR status badge`);
      }
    } catch (err) {
      results.errors.push({
        feature: 'adr-status',
        viewport: viewportName,
        error: err.message,
      });
      log(`  [ERR] ADR status badge: ${err.message}`);
    }

    // ===== Case Study TL;DR Box =====
    try {
      await page.goto(`${BASE}/case-studies/fraud-detection-pipeline/`, {
        waitUntil: 'domcontentloaded',
      });
      await waitForNetworkIdle(page);
      await page.waitForTimeout(300);

      const tldrBox = page.locator('.tldr-box');
      if (await tldrBox.isVisible()) {
        await screenshot(page, `features/${viewportName}/case-study-tldr.png`, {
          fullPage: false,
        });

        results.success.push({ feature: 'tldr-box', viewport: viewportName });
        log(`  [OK] TL;DR box`);
      }
    } catch (err) {
      results.errors.push({
        feature: 'tldr-box',
        viewport: viewportName,
        error: err.message,
      });
      log(`  [ERR] TL;DR box: ${err.message}`);
    }

    // ===== Tech Stack Tags =====
    try {
      await page.goto(`${BASE}/case-studies/fraud-detection-pipeline/`, {
        waitUntil: 'domcontentloaded',
      });
      await waitForNetworkIdle(page);
      await page.waitForTimeout(300);

      const techStack = page.locator('.tech-stack');
      if (await techStack.isVisible()) {
        await screenshot(page, `features/${viewportName}/tech-stack.png`, {
          fullPage: false,
        });

        results.success.push({ feature: 'tech-stack', viewport: viewportName });
        log(`  [OK] Tech stack tags`);
      }
    } catch (err) {
      results.errors.push({
        feature: 'tech-stack',
        viewport: viewportName,
        error: err.message,
      });
      log(`  [ERR] Tech stack tags: ${err.message}`);
    }

    // ===== Content Disclaimer =====
    try {
      await page.goto(`${BASE}/writing/circuit-breakers-rust/`, {
        waitUntil: 'domcontentloaded',
      });
      await waitForNetworkIdle(page);
      await page.waitForTimeout(300);

      const disclaimer = page.locator('.content-disclaimer');
      if (await disclaimer.isVisible()) {
        await screenshot(
          page,
          `features/${viewportName}/content-disclaimer.png`,
          { fullPage: false }
        );

        results.success.push({
          feature: 'content-disclaimer',
          viewport: viewportName,
        });
        log(`  [OK] Content disclaimer`);
      }
    } catch (err) {
      results.errors.push({
        feature: 'content-disclaimer',
        viewport: viewportName,
        error: err.message,
      });
      log(`  [ERR] Content disclaimer: ${err.message}`);
    }

    // ===== Footer CTA =====
    try {
      await page.goto(`${BASE}/writing/circuit-breakers-rust/`, {
        waitUntil: 'domcontentloaded',
      });
      await waitForNetworkIdle(page);
      await page.waitForTimeout(300);

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(300);

      const footerCta = page.locator('.footer-cta');
      if (await footerCta.isVisible()) {
        await screenshot(page, `features/${viewportName}/footer-cta.png`, {
          fullPage: false,
        });

        results.success.push({ feature: 'footer-cta', viewport: viewportName });
        log(`  [OK] Footer CTA`);
      }
    } catch (err) {
      results.errors.push({
        feature: 'footer-cta',
        viewport: viewportName,
        error: err.message,
      });
      log(`  [ERR] Footer CTA: ${err.message}`);
    }

    // ===== Home Hero Section =====
    try {
      await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
      await waitForNetworkIdle(page);
      await page.waitForTimeout(300);

      await screenshot(page, `features/${viewportName}/home-hero.png`, {
        fullPage: false,
      });

      results.success.push({ feature: 'home-hero', viewport: viewportName });
      log(`  [OK] Home hero`);
    } catch (err) {
      results.errors.push({
        feature: 'home-hero',
        viewport: viewportName,
        error: err.message,
      });
      log(`  [ERR] Home hero: ${err.message}`);
    }

    // ===== Key Projects Section =====
    try {
      await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
      await waitForNetworkIdle(page);
      await page.waitForTimeout(300);

      const keyProjects = page.getByText('Key Projects', { exact: false });
      if (await keyProjects.isVisible()) {
        await keyProjects.scrollIntoViewIfNeeded();
        await page.waitForTimeout(300);
        await screenshot(page, `features/${viewportName}/key-projects.png`, {
          fullPage: false,
        });

        results.success.push({
          feature: 'key-projects',
          viewport: viewportName,
        });
        log(`  [OK] Key projects`);
      }
    } catch (err) {
      results.errors.push({
        feature: 'key-projects',
        viewport: viewportName,
        error: err.message,
      });
      log(`  [ERR] Key projects: ${err.message}`);
    }

    // ===== Resume Page Sections =====
    try {
      await page.goto(`${BASE}/resume/`, { waitUntil: 'domcontentloaded' });
      await waitForNetworkIdle(page);
      await page.waitForTimeout(300);

      await screenshot(page, `features/${viewportName}/resume-header.png`, {
        fullPage: false,
      });

      results.success.push({ feature: 'resume', viewport: viewportName });
      log(`  [OK] Resume`);
    } catch (err) {
      results.errors.push({
        feature: 'resume',
        viewport: viewportName,
        error: err.message,
      });
      log(`  [ERR] Resume: ${err.message}`);
    }

    await page.close();
    await context.close();
  }

  return results;
}

// ============================================================================
// ACCESSIBILITY CHECKS
// ============================================================================

async function testAccessibility(browser) {
  log('\n=== ACCESSIBILITY CHECKS ===');
  const results = { success: [], warnings: [], errors: [] };

  const context = await browser.newContext(VIEWPORTS.desktop);
  const page = await context.newPage();

  const checkPages = [
    { path: '/', name: 'home' },
    { path: '/writing/', name: 'writing' },
    { path: '/writing/circuit-breakers-rust/', name: 'writing-article' },
    { path: '/case-studies/', name: 'case-studies' },
    {
      path: '/case-studies/fraud-detection-pipeline/',
      name: 'case-study-article',
    },
    { path: '/adrs/', name: 'adrs' },
    { path: '/adrs/004-rules-over-ml-fraud-detection/', name: 'adr-article' },
    { path: '/resume/', name: 'resume' },
  ];

  for (const { path, name } of checkPages) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
    await waitForNetworkIdle(page);
    await page.waitForTimeout(300);

    // Check for single H1
    const h1Count = await page.locator('h1').count();
    if (h1Count === 1) {
      results.success.push({ page: name, check: 'single-h1' });
    } else {
      results.warnings.push({ page: name, check: 'h1-count', value: h1Count });
      log(`  [WARN] ${name}: ${h1Count} H1 elements (expected 1)`);
    }

    // Check for skip link
    const skipLink = await page.locator('a[href="#main"], a.skip-link').count();
    if (skipLink > 0) {
      results.success.push({ page: name, check: 'skip-link' });
    }

    // Check links have accessible names
    const emptyLinks = await page.evaluate(() => {
      const links = document.querySelectorAll('a');
      return Array.from(links).filter((a) => {
        const text = a.textContent?.trim() || '';
        const ariaLabel = a.getAttribute('aria-label');
        const title = a.getAttribute('title');
        const img = a.querySelector('img');
        return !text && !ariaLabel && !title && !img;
      }).length;
    });

    if (emptyLinks === 0) {
      results.success.push({ page: name, check: 'link-names' });
    } else {
      results.warnings.push({
        page: name,
        check: 'empty-links',
        value: emptyLinks,
      });
      log(`  [WARN] ${name}: ${emptyLinks} links without accessible names`);
    }

    // Check images have alt text
    const imgWithoutAlt = await page.evaluate(() => {
      return document.querySelectorAll('img:not([alt])').length;
    });

    if (imgWithoutAlt === 0) {
      results.success.push({ page: name, check: 'img-alt' });
    } else {
      results.warnings.push({
        page: name,
        check: 'img-alt',
        value: imgWithoutAlt,
      });
      log(`  [WARN] ${name}: ${imgWithoutAlt} images without alt text`);
    }

    // Check buttons have accessible names
    const emptyButtons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button')).filter((btn) => {
        const text = btn.textContent?.trim() || '';
        const ariaLabel = btn.getAttribute('aria-label');
        return !text && !ariaLabel;
      }).length;
    });

    if (emptyButtons === 0) {
      results.success.push({ page: name, check: 'button-names' });
    } else {
      results.warnings.push({
        page: name,
        check: 'empty-buttons',
        value: emptyButtons,
      });
      log(`  [WARN] ${name}: ${emptyButtons} buttons without accessible names`);
    }

    // Check for ARIA landmark roles
    const hasMain = (await page.locator('main, [role="main"]').count()) > 0;
    const hasNav = (await page.locator('nav, [role="navigation"]').count()) > 0;

    if (hasMain) {
      results.success.push({ page: name, check: 'main-landmark' });
    } else {
      results.warnings.push({ page: name, check: 'missing-main' });
    }

    if (hasNav) {
      results.success.push({ page: name, check: 'nav-landmark' });
    }

    log(`  [OK] ${name}: accessibility checks complete`);
  }

  await page.close();
  await context.close();

  return results;
}

// ============================================================================
// MAIN
// ============================================================================

async function run() {
  console.log('\n========================================');
  console.log('  PLAYWRIGHT VISUAL AUDIT');
  console.log('========================================\n');

  console.log(`Audit label: ${AUDIT_LABEL}`);
  console.log(`Total pages to capture: ${ALL_PAGES.length}`);
  console.log(`Viewports: ${Object.keys(VIEWPORTS).join(', ')}`);
  console.log(`Full page: ${viewportOnly ? 'No (viewport only)' : 'Yes'}`);
  console.log(`Max dimension: ${MAX_DIMENSION}px`);
  console.log(`Output directory: ${OUT}\n`);

  mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch();
  const allResults = {
    pages: null,
    features: null,
    accessibility: null,
    timestamp: new Date().toISOString(),
    totalPages: ALL_PAGES.length,
    viewports: Object.keys(VIEWPORTS),
  };

  try {
    if (!featuresOnly) {
      allResults.pages = await captureAllPages(browser);
    }

    if (!pagesOnly) {
      allResults.features = await testInteractiveFeatures(browser);
      allResults.accessibility = await testAccessibility(browser);
    }

    // Write results summary
    const summaryPath = join(OUT, 'audit-summary.json');
    writeFileSync(summaryPath, JSON.stringify(allResults, null, 2));

    // Print summary
    console.log('\n========================================');
    console.log('  AUDIT SUMMARY');
    console.log('========================================\n');

    if (allResults.pages) {
      console.log(
        `Pages: ${allResults.pages.success.length} OK, ${allResults.pages.errors.length} errors`
      );
    }
    if (allResults.features) {
      console.log(
        `Features: ${allResults.features.success.length} OK, ${allResults.features.errors.length} errors`
      );
    }
    if (allResults.accessibility) {
      console.log(
        `Accessibility: ${allResults.accessibility.success.length} OK, ${allResults.accessibility.warnings.length} warnings`
      );
    }

    console.log(`\nResults saved to: ${OUT}`);
    console.log(`Summary: ${summaryPath}`);

    // Exit with error code if there were failures
    const hasErrors =
      allResults.pages?.errors?.length > 0 ||
      allResults.features?.errors?.length > 0;

    if (hasErrors) {
      console.log(
        '\n[!] Some tests had errors. Check the summary for details.'
      );
      process.exit(1);
    }
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
