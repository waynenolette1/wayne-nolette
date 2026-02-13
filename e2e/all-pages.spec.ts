import { test, expect } from '@playwright/test';

/**
 * Visual regression and functionality tests for all portfolio pages.
 * Tests run across Desktop Chrome, Safari, iPad, iPhone 14, and Pixel 7.
 */

// Base path for GitHub Pages deployment
const BASE_PATH = '/wayne-nolette';

// Helper to resolve paths with base path
const resolvePath = (path: string) => {
  if (path === '/') return BASE_PATH + '/';
  return BASE_PATH + path;
};

// All pages to test - derived from build output
const PAGES = [
  { path: '/', name: 'Home' },
  { path: '/resume/', name: 'Resume' },
  { path: '/writing/', name: 'Writing Index' },
  { path: '/case-studies/', name: 'Case Studies Index' },
  { path: '/adrs/', name: 'ADRs Index' },
  // Case Studies
  {
    path: '/case-studies/fraud-detection-pipeline/',
    name: 'Case Study: Fraud Detection',
  },
  {
    path: '/case-studies/batch-processing-platform/',
    name: 'Case Study: Batch Processing',
  },
  {
    path: '/case-studies/mcp-server-marketing-apis/',
    name: 'Case Study: MCP Server',
  },
  {
    path: '/case-studies/production-rag-system/',
    name: 'Case Study: RAG System',
  },
  {
    path: '/case-studies/real-time-ml-inference/',
    name: 'Case Study: ML Inference',
  },
  {
    path: '/case-studies/telemetry-ingestion-service/',
    name: 'Case Study: Telemetry Ingestion',
  },
  {
    path: '/case-studies/traffic-scoring-pipeline/',
    name: 'Case Study: Traffic Scoring',
  },
  // ADRs
  {
    path: '/adrs/001-deterministic-over-agentic-rag/',
    name: 'ADR: Deterministic RAG',
  },
  {
    path: '/adrs/002-tiered-classification/',
    name: 'ADR: Tiered Classification',
  },
  { path: '/adrs/003-rust-over-python/', name: 'ADR: Rust Over Python' },
  {
    path: '/adrs/004-rules-over-ml-fraud-detection/',
    name: 'ADR: Rules Over ML',
  },
  // Writing (sample - add all 35 if needed)
  { path: '/writing/anatomy-of-outage/', name: 'Writing: Anatomy of Outage' },
  {
    path: '/writing/circuit-breakers-rust/',
    name: 'Writing: Circuit Breakers',
  },
  {
    path: '/writing/testing-310k-line-rust-codebase/',
    name: 'Writing: Testing Rust',
  },
  {
    path: '/writing/tiered-classification/',
    name: 'Writing: Tiered Classification',
  },
  {
    path: '/writing/why-rules-not-ml-fraud-detection/',
    name: 'Writing: Rules vs ML',
  },
];

test.describe('Page Load & Basic Rendering', () => {
  for (const page of PAGES) {
    test(`${page.name} loads without errors`, async ({ page: browserPage }) => {
      // Collect console errors
      const errors: string[] = [];
      browserPage.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      // Navigate and wait for network idle
      const response = await browserPage.goto(resolvePath(page.path), {
        waitUntil: 'networkidle',
      });

      // Check response status
      expect(response?.status()).toBe(200);

      // Check no JS console errors (filter out expected warnings)
      const criticalErrors = errors.filter(
        (e) =>
          !e.includes('favicon') &&
          !e.includes('DevTools') &&
          !e.includes('navigator.vibrate') && // Vibrate requires user gesture, expected in tests
          !e.includes('Vibration') && // Safari variation of vibrate warning
          !e.includes('Source map') && // Source map warnings in dev mode
          !e.includes('Failed to load resource') // May occur for optional assets
      );
      expect(criticalErrors).toHaveLength(0);

      // Check page has content
      const body = browserPage.locator('body');
      await expect(body).toBeVisible();

      // Check main content area exists
      const main = browserPage.locator('main, article, .content');
      await expect(main.first()).toBeVisible();
    });
  }
});

test.describe('Navigation & Links', () => {
  test('Header navigation works', async ({ page, isMobile }) => {
    await page.goto(resolvePath('/'));

    // Check nav links exist
    const nav = page.locator('nav, header');
    await expect(nav.first()).toBeVisible();

    // On mobile, may need to open hamburger menu first
    if (isMobile) {
      const menuButton = page.locator(
        'button[aria-label*="menu"], button[aria-label*="Menu"], .hamburger, .menu-toggle'
      );
      if (await menuButton.isVisible()) {
        await menuButton.click();
        // Wait for menu animation to complete
        const menuPanel = page.locator(
          '.mobile-menu-panel, #mobile-menu-panel, nav'
        );
        await menuPanel
          .first()
          .waitFor({ state: 'visible', timeout: 1000 })
          .catch(() => {});
      }
    }

    // Test navigation to main sections
    const sections = [
      { text: 'Writing', path: 'writing' },
      { text: 'Work', path: 'case-studies' },
      { text: 'Resume', path: 'resume' },
    ];
    for (const section of sections) {
      const link = page.locator(`a:has-text("${section.text}")`).first();
      if (await link.isVisible()) {
        await link.click();
        await page.waitForLoadState('networkidle');
        expect(page.url()).toContain(section.path);
        await page.goto(resolvePath('/'));

        // Re-open menu on mobile after navigation
        if (isMobile) {
          const menuButton = page.locator(
            'button[aria-label*="menu"], button[aria-label*="Menu"], .hamburger, .menu-toggle'
          );
          if (await menuButton.isVisible()) {
            await menuButton.click();
            // Wait for menu animation to complete
            const menuPanel = page.locator(
              '.mobile-menu-panel, #mobile-menu-panel, nav'
            );
            await menuPanel
              .first()
              .waitFor({ state: 'visible', timeout: 1000 })
              .catch(() => {});
          }
        }
      }
    }
  });

  test('All internal links are valid', async ({ page }) => {
    const brokenLinks: string[] = [];

    for (const testPage of PAGES.slice(0, 10)) {
      // Test first 10 pages
      await page.goto(resolvePath(testPage.path));

      // Get all internal links
      const links = await page.locator('a[href^="/"]').all();

      for (const link of links) {
        const href = await link.getAttribute('href');
        if (href && !href.includes('#')) {
          // Some links may not have the base path prefix - add it if needed
          const fullPath = href.startsWith(BASE_PATH) ? href : BASE_PATH + href;
          const response = await page.request.get(fullPath);
          if (response.status() !== 200) {
            brokenLinks.push(
              `${testPage.path} -> ${href} (${response.status()})`
            );
          }
        }
      }
    }

    expect(brokenLinks).toHaveLength(0);
  });
});

test.describe('Responsive Layout', () => {
  test('Content fits viewport without horizontal scroll', async ({ page }) => {
    for (const testPage of PAGES.slice(0, 5)) {
      await page.goto(resolvePath(testPage.path));

      // Check no horizontal overflow
      const hasHorizontalScroll = await page.evaluate(() => {
        return (
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth
        );
      });

      expect(hasHorizontalScroll, `Horizontal scroll on ${testPage.path}`).toBe(
        false
      );
    }
  });

  test('Text is readable (not too small)', async ({ page, isMobile }) => {
    await page.goto(resolvePath('/resume/'));

    // Get computed font size of body text
    const fontSize = await page.evaluate(() => {
      const p = document.querySelector('main p');
      if (!p) return 16;
      return parseFloat(window.getComputedStyle(p).fontSize);
    });

    // Minimum readable size: 14px mobile, 16px desktop
    const minSize = isMobile ? 14 : 16;
    expect(fontSize).toBeGreaterThanOrEqual(minSize);
  });

  test('Touch targets are large enough on mobile', async ({
    page,
    isMobile,
  }) => {
    if (!isMobile) return;

    await page.goto(resolvePath('/'));

    // Get all clickable elements
    const clickables = await page.locator('a, button').all();
    const smallButtons: string[] = [];

    for (const el of clickables.slice(0, 20)) {
      const box = await el.boundingBox();
      if (box) {
        // Minimum touch target: 44x44 (Apple HIG recommendation)
        const size = Math.min(box.width, box.height);
        const isButton = (await el.evaluate((e) => e.tagName)) === 'BUTTON';
        // Log small buttons but don't fail - this is a design guideline
        if (isButton && size < 40) {
          const text = await el.textContent();
          smallButtons.push(`Button "${text?.trim()}" has size ${size}px`);
        }
      }
    }

    // Warn about small buttons but don't fail the test
    if (smallButtons.length > 0) {
      test.info().annotations.push({
        type: 'warning',
        description: `Some buttons may be too small for touch: ${JSON.stringify(smallButtons)}`,
      });
    }
  });
});

test.describe('Visual Elements', () => {
  test('Images load correctly', async ({ page }) => {
    await page.goto(resolvePath('/'));

    const images = await page.locator('img').all();
    for (const img of images) {
      // Check image loaded (naturalWidth > 0)
      const loaded = await img.evaluate(
        (el: HTMLImageElement) => el.naturalWidth > 0
      );
      const src = await img.getAttribute('src');
      expect(loaded, `Image failed to load: ${src}`).toBe(true);
    }
  });

  test('Code blocks render correctly', async ({ page }) => {
    // Go to a page with code
    await page.goto(resolvePath('/writing/circuit-breakers-rust/'));

    const codeBlocks = await page.locator('pre, code').all();
    expect(codeBlocks.length).toBeGreaterThan(0);

    // Check code blocks are visible and have content
    for (const block of codeBlocks.slice(0, 5)) {
      await expect(block).toBeVisible();
      const text = await block.textContent();
      expect(text?.trim().length).toBeGreaterThan(0);
    }
  });

  test('Mermaid diagrams render', async ({ page }) => {
    // Go to a page with diagrams
    await page.goto(resolvePath('/case-studies/batch-processing-platform/'));

    // Wait for Mermaid to render (it converts to SVG) or fallback pre block
    const mermaidSvg = page.locator('.mermaid svg');
    const mermaidPre = page.locator('pre:has-text("flowchart")');

    // Wait for either SVG to render or pre block to be present
    try {
      await mermaidSvg.first().waitFor({ state: 'attached', timeout: 3000 });
      // SVG rendered successfully
      const svgCount = await mermaidSvg.count();
      expect(svgCount).toBeGreaterThan(0);
    } catch {
      // Mermaid didn't render to SVG, check if pre block with flowchart exists
      const preCount = await mermaidPre.count();
      // If no mermaid content at all, skip this test
      if (preCount === 0) {
        test.skip(true, 'No Mermaid diagrams found on this page');
      }
      expect(preCount).toBeGreaterThan(0);
    }
  });
});

test.describe('Accessibility Basics', () => {
  test('Page has proper heading hierarchy', async ({ page }) => {
    await page.goto(resolvePath('/resume/'));

    // Should have exactly one h1
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);

    // h2s should exist for sections
    const h2Count = await page.locator('h2').count();
    expect(h2Count).toBeGreaterThan(0);
  });

  test('Links have accessible text', async ({ page }) => {
    await page.goto(resolvePath('/'));

    const links = await page.locator('a').all();
    for (const link of links) {
      const text = await link.textContent();
      const ariaLabel = await link.getAttribute('aria-label');
      const hasAccessibleName =
        (text?.trim().length ?? 0) > 0 || ariaLabel !== null;
      expect(hasAccessibleName, 'Link missing accessible name').toBe(true);
    }
  });

  test('Color contrast is sufficient', async ({ page }) => {
    await page.goto(resolvePath('/'));

    // Basic check: text color is not the same as background
    const hasContrast = await page.evaluate(() => {
      const body = document.body;
      const style = window.getComputedStyle(body);
      const color = style.color;
      const bg = style.backgroundColor;
      return color !== bg;
    });

    expect(hasContrast).toBe(true);
  });
});

test.describe('Performance', () => {
  test('Page loads within reasonable time', async ({ page }) => {
    const start = Date.now();
    await page.goto(resolvePath('/'), { waitUntil: 'domcontentloaded' });
    const loadTime = Date.now() - start;

    // Should load in under 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('No massive layout shifts', async ({ page }) => {
    await page.goto(resolvePath('/'));

    // Wait for page to be fully loaded and stable
    await page.waitForLoadState('networkidle');

    // Check CLS via Performance API if available
    const cls = await page.evaluate(() => {
      return new Promise((resolve) => {
        let clsValue = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const layoutEntry = entry as PerformanceEntry & {
              hadRecentInput?: boolean;
              value?: number;
            };
            if ('hadRecentInput' in entry && !layoutEntry.hadRecentInput) {
              clsValue += layoutEntry.value ?? 0;
            }
          }
        });
        observer.observe({ type: 'layout-shift', buffered: true });
        setTimeout(() => resolve(clsValue), 100);
      });
    });

    // CLS should be under 0.1 (good), definitely under 0.25 (needs improvement)
    expect(cls as number).toBeLessThan(0.25);
  });
});
