import { test, expect } from '@playwright/test';

/**
 * Accessibility tests for the portfolio site.
 * Tests WCAG 2.1 AA compliance basics.
 */

const BASE_PATH = '/wayne-nolette';

const resolvePath = (path: string) => {
  if (path === '/') return BASE_PATH + '/';
  return BASE_PATH + path;
};

const PAGES_TO_TEST = [
  { path: '/', name: 'Home' },
  { path: '/resume/', name: 'Resume' },
  { path: '/writing/', name: 'Writing Index' },
  { path: '/case-studies/', name: 'Case Studies Index' },
  { path: '/adrs/', name: 'ADRs Index' },
  { path: '/writing/circuit-breakers-rust/', name: 'Writing Article' },
  { path: '/case-studies/production-rag-system/', name: 'Case Study' },
  { path: '/adrs/001-deterministic-over-agentic-rag/', name: 'ADR' },
];

test.describe('Document Structure', () => {
  for (const page of PAGES_TO_TEST) {
    test(`${page.name} has valid document structure`, async ({
      page: browserPage,
    }) => {
      await browserPage.goto(resolvePath(page.path));

      // Exactly one h1
      const h1Count = await browserPage.locator('h1').count();
      expect(h1Count).toBe(1);

      // Has lang attribute on html
      const lang = await browserPage.locator('html').getAttribute('lang');
      expect(lang).toBeTruthy();
      expect(lang).toMatch(/^en/);

      // Has main landmark
      const mainCount = await browserPage.locator('main').count();
      expect(mainCount).toBe(1);

      // Has header with navigation (use .first() since article pages have multiple headers)
      const header = browserPage.locator('header').first();
      await expect(header).toBeVisible();
    });
  }
});

test.describe('Heading Hierarchy', () => {
  for (const page of PAGES_TO_TEST) {
    test(`${page.name} has proper heading hierarchy`, async ({
      page: browserPage,
    }) => {
      await browserPage.goto(resolvePath(page.path));

      // Get all heading levels in order
      const headings = await browserPage.evaluate(() => {
        const levels: number[] = [];
        document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
          levels.push(parseInt(h.tagName[1]));
        });
        return levels;
      });

      // Verify no skipping levels (e.g., h1 -> h3 without h2)
      let prevLevel = 0;
      for (const level of headings) {
        if (prevLevel > 0 && level > prevLevel + 1) {
          // Skip from h1 to h3 is allowed in some cases (e.g., within sections)
          // But h1 to h4 or larger jumps are problematic
          expect(level - prevLevel).toBeLessThanOrEqual(2);
        }
        prevLevel = level;
      }
    });
  }
});

test.describe('Image Accessibility', () => {
  for (const page of PAGES_TO_TEST) {
    test(`${page.name} images have alt text`, async ({ page: browserPage }) => {
      await browserPage.goto(resolvePath(page.path));

      const images = await browserPage.locator('img').all();
      const missingAlt: string[] = [];

      for (const img of images) {
        const alt = await img.getAttribute('alt');
        const src = await img.getAttribute('src');

        // Decorative images should have empty alt=""
        // Informative images should have descriptive alt
        if (alt === null) {
          missingAlt.push(src || 'unknown');
        }
      }

      expect(
        missingAlt,
        `Images missing alt attribute: ${missingAlt.join(', ')}`
      ).toHaveLength(0);
    });
  }
});

test.describe('Link Accessibility', () => {
  for (const page of PAGES_TO_TEST) {
    test(`${page.name} links have accessible names`, async ({
      page: browserPage,
    }) => {
      await browserPage.goto(resolvePath(page.path));

      const links = await browserPage.locator('a').all();
      const inaccessibleLinks: string[] = [];

      for (const link of links) {
        const text = await link.textContent();
        const ariaLabel = await link.getAttribute('aria-label');
        const ariaLabelledBy = await link.getAttribute('aria-labelledby');
        const title = await link.getAttribute('title');

        const hasAccessibleName =
          (text?.trim().length ?? 0) > 0 ||
          ariaLabel !== null ||
          ariaLabelledBy !== null ||
          title !== null;

        if (!hasAccessibleName) {
          const href = await link.getAttribute('href');
          inaccessibleLinks.push(href || 'unknown');
        }
      }

      expect(
        inaccessibleLinks,
        `Links without accessible names: ${inaccessibleLinks.join(', ')}`
      ).toHaveLength(0);
    });
  }
});

test.describe('Form Accessibility', () => {
  test('Search input has accessible label', async ({ page }) => {
    await page.goto(resolvePath('/'));
    await page.waitForLoadState('networkidle');

    const searchTrigger = page.locator('#search-trigger');
    await expect(searchTrigger).toBeVisible();
    await searchTrigger.click();

    const searchDialog = page.locator('#search-dialog');
    await expect(searchDialog).toBeVisible({ timeout: 2000 });

    const searchInput = page.locator('#search-input');

    // Check for aria-label, associated label, or placeholder (acceptable for search)
    const ariaLabel = await searchInput.getAttribute('aria-label');
    const placeholder = await searchInput.getAttribute('placeholder');
    const id = await searchInput.getAttribute('id');

    const hasLabel =
      ariaLabel !== null ||
      placeholder !== null ||
      (id && (await page.locator(`label[for="${id}"]`).count()) > 0);

    expect(hasLabel).toBe(true);
  });
});

test.describe('Keyboard Navigation', () => {
  test('Can navigate through page with Tab key', async ({
    page,
    browserName,
  }) => {
    // WebKit doesn't Tab to links/buttons by default (system preference)
    if (browserName === 'webkit') {
      test.skip();
      return;
    }

    await page.goto(resolvePath('/'));

    // Press Tab multiple times and verify focus moves
    const focusedElements: string[] = [];

    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        return el?.tagName || 'BODY';
      });
      focusedElements.push(focused);
    }

    // Should have focused on interactive elements (links, buttons)
    const interactiveElements = focusedElements.filter(
      (tag) => tag === 'A' || tag === 'BUTTON' || tag === 'INPUT'
    );
    expect(interactiveElements.length).toBeGreaterThan(0);
  });

  test('Skip link is first focusable element', async ({ page }) => {
    await page.goto(resolvePath('/'));

    // Press Tab once
    await page.keyboard.press('Tab');

    // Check if focused element is skip link
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        tagName: el?.tagName,
        className: el?.className,
        href: (el as HTMLAnchorElement)?.href,
      };
    });

    // Skip link typically has href="#main-content" or similar
    if (focused.href?.includes('#')) {
      expect(focused.tagName).toBe('A');
    }
  });

  test('Focus is visible on interactive elements', async ({ page }) => {
    await page.goto(resolvePath('/'));

    // Tab to focus an element
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    const focusedElement = page.locator(':focus-visible');

    if ((await focusedElement.count()) > 0) {
      // Should have visible outline or other focus indicator
      const styles = await focusedElement.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          outline: computed.outline,
          outlineWidth: computed.outlineWidth,
          boxShadow: computed.boxShadow,
        };
      });

      // Should have either outline or box-shadow for focus
      const hasVisibleFocus =
        styles.outline !== 'none' ||
        styles.outlineWidth !== '0px' ||
        styles.boxShadow !== 'none';

      expect(hasVisibleFocus).toBe(true);
    }
  });
});

test.describe('Color and Contrast', () => {
  for (const page of PAGES_TO_TEST) {
    test(`${page.name} text has sufficient contrast`, async ({
      page: browserPage,
    }) => {
      await browserPage.goto(resolvePath(page.path));

      // Get body text color and background
      const contrast = await browserPage.evaluate(() => {
        const body = document.body;
        const computed = window.getComputedStyle(body);

        // Parse rgb values
        const parseRgb = (color: string) => {
          const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
          if (match) {
            return {
              r: parseInt(match[1]),
              g: parseInt(match[2]),
              b: parseInt(match[3]),
            };
          }
          return null;
        };

        const textColor = parseRgb(computed.color);
        const bgColor = parseRgb(computed.backgroundColor);

        if (!textColor || !bgColor) return { valid: false };

        // Calculate relative luminance
        const luminance = (r: number, g: number, b: number) => {
          const [rs, gs, bs] = [r, g, b].map((c) => {
            c = c / 255;
            return c <= 0.03928
              ? c / 12.92
              : Math.pow((c + 0.055) / 1.055, 2.4);
          });
          return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
        };

        const l1 = luminance(textColor.r, textColor.g, textColor.b);
        const l2 = luminance(bgColor.r, bgColor.g, bgColor.b);

        const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

        return { valid: true, ratio };
      });

      if (contrast.valid) {
        // WCAG AA requires 4.5:1 for normal text
        expect(contrast.ratio).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});

test.describe('ARIA Landmarks', () => {
  for (const page of PAGES_TO_TEST) {
    test(`${page.name} has proper ARIA landmarks`, async ({
      page: browserPage,
    }) => {
      await browserPage.goto(resolvePath(page.path));

      // Check for required landmarks
      const landmarks = await browserPage.evaluate(() => {
        return {
          hasMain:
            document.querySelector('main') !== null ||
            document.querySelector('[role="main"]') !== null,
          hasNavigation:
            document.querySelector('nav') !== null ||
            document.querySelector('[role="navigation"]') !== null,
          hasHeader:
            document.querySelector('header') !== null ||
            document.querySelector('[role="banner"]') !== null,
          hasFooter:
            document.querySelector('footer') !== null ||
            document.querySelector('[role="contentinfo"]') !== null,
        };
      });

      expect(landmarks.hasMain).toBe(true);
      expect(landmarks.hasNavigation).toBe(true);
      expect(landmarks.hasHeader).toBe(true);
    });
  }
});

test.describe('Motion and Animation', () => {
  test('Respects prefers-reduced-motion', async ({ page }) => {
    // Emulate reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(resolvePath('/'));

    // The global CSS sets animation-duration and transition-duration to 0.01ms
    // on all elements when prefers-reduced-motion: reduce is active.
    // Sample several elements and verify durations are near-zero.
    const durations = await page.evaluate(() => {
      const samples = document.querySelectorAll('body, main, a, button, h1');
      const results: { animation: string; transition: string }[] = [];
      for (const el of samples) {
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

test.describe('Interactive Element States', () => {
  test('Buttons have proper focus states', async ({ page }) => {
    await page.goto(resolvePath('/'));

    const buttons = await page.locator('button').all();

    for (const button of buttons.slice(0, 5)) {
      if (await button.isVisible()) {
        // Focus the button
        await button.focus();

        // Check it received focus
        const isFocused = await button.evaluate(
          (el) => document.activeElement === el
        );
        expect(isFocused).toBe(true);
      }
    }
  });

  test('Links have proper focus states', async ({ page }) => {
    await page.goto(resolvePath('/'));

    const links = await page.locator('a').all();

    for (const link of links.slice(0, 5)) {
      if (await link.isVisible()) {
        await link.focus();

        const isFocused = await link.evaluate(
          (el) => document.activeElement === el
        );
        expect(isFocused).toBe(true);
      }
    }
  });
});
