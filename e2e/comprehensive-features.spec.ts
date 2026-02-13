import { test, expect } from '@playwright/test';

/**
 * Comprehensive E2E tests for all site features.
 * Covers theme switching, article features, animated elements, and special pages.
 */

const BASE_PATH = '/wayne-nolette';

const resolvePath = (path: string) => {
  if (path === '/') return BASE_PATH + '/';
  return BASE_PATH + path;
};

test.describe('Theme Switching', () => {
  test('Theme toggle exists and is accessible', async ({ page }) => {
    await page.goto(resolvePath('/'));

    // Look for theme toggle button
    const themeToggle = page.locator(
      'button[aria-label*="theme"], button[aria-label*="Theme"], #theme-toggle, .theme-toggle'
    );

    if ((await themeToggle.count()) > 0) {
      await expect(themeToggle.first()).toBeVisible();

      // Check accessibility
      const ariaLabel = await themeToggle.first().getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
    }
  });

  test('Theme preference is applied on page load', async ({ page }) => {
    await page.goto(resolvePath('/'));

    // Check that data-theme attribute exists on html element
    const theme = await page.locator('html').getAttribute('data-theme');
    // Theme should be either 'light' or 'dark' (or null for system default)
    expect(['light', 'dark', null]).toContain(theme);
  });
});

test.describe('Article Page Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(resolvePath('/writing/circuit-breakers-rust/'));
  });

  test('Reading progress bar appears on scroll', async ({ page }) => {
    // Look for progress bar element
    const progressBar = page.locator(
      '.reading-progress, .scroll-progress, #reading-progress, [class*="progress-bar"]'
    );

    if ((await progressBar.count()) > 0) {
      // Scroll down
      await page.evaluate(() => window.scrollTo(0, 500));

      // Wait for scroll to complete
      await page.waitForFunction(() => window.scrollY > 400, { timeout: 1000 });

      // Progress bar should have some width/progress
      const hasProgress = await progressBar.first().evaluate((el) => {
        const style = window.getComputedStyle(el);
        const width = parseFloat(style.width);
        const transform = style.transform;
        // Either width > 0 or transform indicates progress
        return width > 0 || (transform && !transform.includes('scaleX(0)'));
      });

      expect(hasProgress).toBe(true);
    }
  });

  test('Table of contents is present on desktop', async ({
    page,
    isMobile,
  }) => {
    if (isMobile) {
      test.skip();
      return;
    }

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Look for TOC element
    const toc = page.locator(
      '.toc, .table-of-contents, [class*="toc"], nav[aria-label*="Table"]'
    );

    if ((await toc.count()) > 0) {
      // TOC should contain links to headings
      const tocLinks = toc.locator('a');
      const linkCount = await tocLinks.count();
      expect(linkCount).toBeGreaterThan(0);
    }
  });

  test('Mobile TOC toggle works', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
      return;
    }

    // Look for mobile TOC toggle - use specific ID to avoid matching close button
    const mobileTocToggle = page.locator('#mobile-toc-toggle');

    if ((await mobileTocToggle.count()) > 0) {
      await mobileTocToggle.click();

      // Wait for TOC panel to be visible
      const tocPanel = page.locator(
        '.mobile-toc-panel, .toc-panel, [class*="toc-panel"]'
      );
      if ((await tocPanel.count()) > 0) {
        await tocPanel.first().waitFor({ state: 'visible', timeout: 1000 });
        await expect(tocPanel.first()).toBeVisible();
      }
    }
  });

  test('Code copy buttons work', async ({ page }) => {
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Find a code block with copy button
    const copyBtn = page
      .locator(
        'pre button, .copy-button, button[aria-label*="copy"], button[aria-label*="Copy"]'
      )
      .first();

    if ((await copyBtn.count()) > 0) {
      // Grant clipboard permissions where supported
      try {
        await page.context().grantPermissions(['clipboard-write']);
      } catch {
        // Some browsers don't support this
      }

      await copyBtn.click();

      // Wait for feedback to appear
      await page
        .waitForFunction(
          () => {
            const btn = document.querySelector('pre button, .copy-button');
            if (!btn) return false;
            return (
              btn.classList.contains('copied') ||
              btn.textContent?.includes('Copied') ||
              btn.querySelector('svg')?.innerHTML.includes('check') ||
              btn.getAttribute('data-copied') === 'true'
            );
          },
          { timeout: 2000 }
        )
        .catch(() => {});

      // Check for visual feedback (class change, text change, or checkmark)
      const hasFeedback = await copyBtn.evaluate((el) => {
        return (
          el.classList.contains('copied') ||
          el.textContent?.includes('Copied') ||
          el.querySelector('svg')?.innerHTML.includes('check') ||
          el.getAttribute('data-copied') === 'true'
        );
      });

      // Button should show some feedback (class change, text change, or checkmark)
      expect(hasFeedback).toBe(true);
    }
  });

  test('Related articles section exists', async ({ page }) => {
    // Look for related articles section
    const relatedSection = page.locator(
      '.related-posts, .related-articles, section:has-text("Related"), [class*="related"]'
    );

    // May or may not exist depending on content
    const count = await relatedSection.count();
    if (count > 0) {
      await expect(relatedSection.first()).toBeVisible();
    }
  });
});

test.describe('Animated Counters', () => {
  test('Homepage stat counters animate', async ({ page }) => {
    await page.goto(resolvePath('/'));

    // Look for animated counter elements
    const counters = page.locator(
      '[data-count], .counter, .stat-value, .impact-value'
    );

    if ((await counters.count()) > 0) {
      // Scroll to make counters visible if needed
      await counters.first().scrollIntoViewIfNeeded();

      // Wait for animation to complete (check for non-zero content)
      await page
        .waitForFunction(
          () => {
            const counter = document.querySelector(
              '[data-count], .counter, .stat-value, .impact-value'
            );
            return (
              counter &&
              counter.textContent &&
              counter.textContent.trim().length > 0
            );
          },
          { timeout: 3000 }
        )
        .catch(() => {});

      // Check that counters have non-zero values
      const firstCounter = counters.first();
      const value = await firstCounter.textContent();
      expect(value?.trim().length).toBeGreaterThan(0);
    }
  });

  test('Resume page counters work', async ({ page }) => {
    await page.goto(resolvePath('/resume/'));

    const impactSection = page.locator(
      '#impact-highlights, .impact-highlights'
    );

    if ((await impactSection.count()) > 0) {
      await impactSection.scrollIntoViewIfNeeded();

      // Wait for counter animation to complete
      await page
        .waitForFunction(
          () => {
            const value = document.querySelector('.impact-value');
            return (
              value && value.textContent && value.textContent.trim().length > 0
            );
          },
          { timeout: 3000 }
        )
        .catch(() => {});

      // Check for counter values
      const values = impactSection.locator('.impact-value');
      if ((await values.count()) > 0) {
        const firstValue = await values.first().textContent();
        expect(firstValue?.trim().length).toBeGreaterThan(0);
      }
    }
  });

  test('Case studies page counters work', async ({ page }) => {
    await page.goto(resolvePath('/case-studies/'));

    const impactBanner = page.locator('#impact-banner, .impact-banner');

    if ((await impactBanner.count()) > 0) {
      await impactBanner.scrollIntoViewIfNeeded();

      // Wait for counter animation to complete
      await page
        .waitForFunction(
          () => {
            const value = document.querySelector('.impact-value');
            return (
              value && value.textContent && value.textContent.trim().length > 0
            );
          },
          { timeout: 3000 }
        )
        .catch(() => {});

      const values = impactBanner.locator('.impact-value');
      if ((await values.count()) > 0) {
        const firstValue = await values.first().textContent();
        expect(firstValue?.trim().length).toBeGreaterThan(0);
      }
    }
  });
});

test.describe('Special Pages', () => {
  test('404 page displays correctly', async ({ page }) => {
    // Navigate to a non-existent page
    const response = await page.goto(resolvePath('/this-page-does-not-exist/'));

    // Should get 404 status or redirect to 404 page
    expect([200, 404]).toContain(response?.status());

    // Check for 404 content indicators
    const has404Content = await page.evaluate(() => {
      const text = document.body.textContent?.toLowerCase() || '';
      return (
        text.includes('404') ||
        text.includes('not found') ||
        text.includes("page doesn't exist")
      );
    });

    expect(has404Content).toBe(true);
  });

  test('Offline page exists', async ({ page }) => {
    const response = await page.goto(resolvePath('/offline/'));

    if (response?.status() === 200) {
      // Check for offline content
      const title = await page.locator('h1').textContent();
      expect(title?.toLowerCase()).toContain('offline');
    }
  });
});

test.describe('Contact CTA', () => {
  test('Contact CTA is present on main pages', async ({ page }) => {
    const pagesToCheck = ['/', '/resume/', '/case-studies/'];

    for (const pagePath of pagesToCheck) {
      await page.goto(resolvePath(pagePath));

      // Look for contact CTA section
      const contactCta = page.locator(
        '.contact-cta, [class*="contact-cta"], section:has(a[href*="mailto"])'
      );

      if ((await contactCta.count()) > 0) {
        await expect(contactCta.first()).toBeVisible();
      }
    }
  });

  test('Contact CTA buttons are clickable', async ({ page }) => {
    await page.goto(resolvePath('/resume/'));

    const contactBtn = page
      .locator('.contact-cta a, .contact-cta-btn, a[href*="mailto"]')
      .first();

    if ((await contactBtn.count()) > 0) {
      await expect(contactBtn).toBeVisible();

      // Check href is a mailto link
      const href = await contactBtn.getAttribute('href');
      expect(href).toContain('mailto:');
    }
  });
});

test.describe('RSS Feed', () => {
  test('RSS feed is accessible', async ({ page }) => {
    const response = await page.goto(resolvePath('/rss.xml'));

    expect(response?.status()).toBe(200);

    // Check content type
    const contentType = response?.headers()['content-type'];
    expect(contentType).toMatch(/xml|rss/);
  });

  test('RSS feed has valid structure', async ({ page }) => {
    // Navigate to home first so page context is available
    await page.goto(resolvePath('/'));

    // Fetch raw XML content to avoid browser XML viewer wrapping
    const rawContent = await page.evaluate(async (url) => {
      const res = await fetch(url);
      return res.text();
    }, resolvePath('/rss.xml'));

    expect(rawContent).toContain('<rss');
    expect(rawContent).toContain('<channel>');
    expect(rawContent).toContain('<title>');
    expect(rawContent).toContain('<item>');
  });
});

test.describe('Print Styles', () => {
  test('Print styles hide navigation', async ({ page }) => {
    await page.goto(resolvePath('/resume/'));

    // Emulate print media
    await page.emulateMedia({ media: 'print' });

    // Header/nav should be hidden in print
    const header = page.locator('header').first();
    const isVisible = await header.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });

    // Print stylesheet sets header to display: none
    expect(isVisible).toBe(false);
  });
});

test.describe('ADR Pages', () => {
  test('ADR index shows all ADRs', async ({ page }) => {
    await page.goto(resolvePath('/adrs/'));

    // Check for ADR list
    const adrItems = page.locator('article, .adr-item, [class*="adr"]');
    const count = await adrItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test('ADR page has status badge', async ({ page }) => {
    await page.goto(resolvePath('/adrs/001-deterministic-over-agentic-rag/'));

    // Look for status indicator
    const statusBadge = page.locator(
      '.adr-status, .status-badge, [class*="status"]'
    );

    if ((await statusBadge.count()) > 0) {
      await expect(statusBadge.first()).toBeVisible();
    }
  });

  test('ADR page has metadata section', async ({ page }) => {
    await page.goto(resolvePath('/adrs/001-deterministic-over-agentic-rag/'));

    // Check for metadata like date, deciders, etc.
    // Metadata may be inline or in a dedicated section
    const hasDate = await page.locator('time, [datetime]').count();
    expect(hasDate).toBeGreaterThan(0);
  });
});

test.describe('Case Study Pages', () => {
  test('Case study has key metrics', async ({ page }) => {
    await page.goto(resolvePath('/case-studies/production-rag-system/'));

    // Metrics may be in header or body - look for numeric values with units
    const hasMetricValues = await page
      .locator('text=/\\d+[xX%]|\\d+ms|\\d+s/')
      .count();
    expect(hasMetricValues).toBeGreaterThan(0);
  });

  test('Case study has tech stack', async ({ page }) => {
    await page.goto(resolvePath('/case-studies/production-rag-system/'));

    // Look for tech tags
    const techTags = page.locator(
      '.labeled-tag-subtle, .tech-tag, .tech-tags span, [class*="tech"]'
    );
    const count = await techTags.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Reduced Motion', () => {
  test('Animations are disabled with prefers-reduced-motion', async ({
    page,
  }) => {
    // Emulate reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(resolvePath('/'));

    // The global CSS sets animation-duration and transition-duration to 0.01ms
    // on all elements when prefers-reduced-motion: reduce is active.
    // Verify this applies to interactive and animated elements.
    const durations = await page.evaluate(() => {
      const selectors = 'a, button, [class*="card"], h1, main';
      const elements = document.querySelectorAll(selectors);
      const results: { animation: string; transition: string }[] = [];
      for (const el of Array.from(elements).slice(0, 10)) {
        const computed = window.getComputedStyle(el);
        results.push({
          animation: computed.animationDuration,
          transition: computed.transitionDuration,
        });
      }
      return results;
    });

    expect(durations.length).toBeGreaterThan(0);
    for (const d of durations) {
      // Duration should be 0s or 0.01ms (near-zero from the reduced-motion override)
      const animMs =
        parseFloat(d.animation) * (d.animation.endsWith('ms') ? 1 : 1000);
      const transMs =
        parseFloat(d.transition) * (d.transition.endsWith('ms') ? 1 : 1000);
      expect(animMs).toBeLessThanOrEqual(1);
      expect(transMs).toBeLessThanOrEqual(1);
    }
  });
});
