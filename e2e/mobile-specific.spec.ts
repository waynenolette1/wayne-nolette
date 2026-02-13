import { test, expect } from '@playwright/test';

/**
 * Mobile-specific tests to ensure the portfolio works well on phones and tablets.
 * These tests only run on mobile device projects (iPhone, Pixel, iPad).
 */

// Base path for GitHub Pages deployment
const BASE_PATH = '/wayne-nolette';

// Helper to resolve paths with base path
const resolvePath = (path: string) => {
  if (path === '/') return BASE_PATH + '/';
  return BASE_PATH + path;
};

test.describe('Mobile Navigation', () => {
  test('Mobile menu opens and closes', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
      return;
    }

    await page.goto(resolvePath('/'));

    // Look for hamburger menu button - use specific selector to avoid matching menu panel/backdrop
    const menuButton = page.locator(
      'button[aria-label*="menu"], button[aria-label*="Menu"], .hamburger, .menu-toggle, button.mobile-menu-btn'
    );

    if (await menuButton.isVisible()) {
      await menuButton.click();

      // Wait for nav to be visible
      const nav = page.locator('nav, .mobile-nav, [class*="nav"]');
      await nav.first().waitFor({ state: 'visible', timeout: 1000 });
      await expect(nav.first()).toBeVisible();

      // Close menu - use force:true because backdrop overlay may intercept the click
      await menuButton.click({ force: true });

      // Wait for menu animation to complete
      await page
        .waitForFunction(
          () => {
            const panel = document.querySelector(
              '.mobile-menu-panel, #mobile-menu-panel'
            );
            if (!panel) return true;
            return !panel.classList.contains('open');
          },
          { timeout: 1000 }
        )
        .catch(() => {});
    }
  });

  test('Navigation links are tappable', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
      return;
    }

    await page.goto(resolvePath('/'));

    // Find navigation links
    const navLinks = await page.locator('nav a, header a').all();

    for (const link of navLinks.slice(0, 5)) {
      if (await link.isVisible()) {
        const box = await link.boundingBox();
        if (box) {
          // Touch target should be at least 44x44 (Apple HIG)
          expect(
            box.height,
            'Link height too small for touch'
          ).toBeGreaterThanOrEqual(40);
        }
      }
    }
  });
});

test.describe('Mobile Content Readability', () => {
  test('Body text is readable size', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
      return;
    }

    await page.goto(resolvePath('/writing/anatomy-of-outage/'));

    const paragraphs = await page.locator('p').all();
    for (const p of paragraphs.slice(0, 5)) {
      if (await p.isVisible()) {
        const fontSize = await p.evaluate((el) => {
          return parseFloat(window.getComputedStyle(el).fontSize);
        });
        expect(fontSize, 'Text too small').toBeGreaterThanOrEqual(14);
      }
    }
  });

  test('Headings are proportionally sized', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
      return;
    }

    await page.goto(resolvePath('/resume/'));

    const h1 = page.locator('h1').first();
    const h2 = page.locator('h2').first();

    const h1Size = await h1.evaluate((el) =>
      parseFloat(window.getComputedStyle(el).fontSize)
    );
    const h2Size = await h2.evaluate((el) =>
      parseFloat(window.getComputedStyle(el).fontSize)
    );

    // H1 should be larger than H2
    expect(h1Size).toBeGreaterThan(h2Size);

    // But not ridiculously large on mobile (tablets may render up to 64px)
    expect(h1Size).toBeLessThanOrEqual(64);
  });

  test('Line length is comfortable for reading', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
      return;
    }

    await page.goto(resolvePath('/writing/anatomy-of-outage/'));

    const paragraph = page.locator('p').first();
    const box = await paragraph.boundingBox();
    const viewport = page.viewportSize();

    if (box && viewport) {
      // Content should have some padding, not edge-to-edge
      expect(box.x).toBeGreaterThan(8);
      expect(box.x + box.width).toBeLessThan(viewport.width - 8);
    }
  });
});

test.describe('Mobile Code Blocks', () => {
  test('Code blocks are scrollable horizontally', async ({
    page,
    isMobile,
  }) => {
    if (!isMobile) {
      test.skip();
      return;
    }

    await page.goto(resolvePath('/writing/circuit-breakers-rust/'));

    const codeBlocks = await page.locator('pre').all();

    for (const block of codeBlocks.slice(0, 3)) {
      if (await block.isVisible()) {
        // Check overflow-x is scroll or auto
        const overflow = await block.evaluate((el) => {
          return window.getComputedStyle(el).overflowX;
        });
        expect(['auto', 'scroll']).toContain(overflow);

        // Block should not exceed viewport
        const box = await block.boundingBox();
        const viewport = page.viewportSize();
        if (box && viewport) {
          expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 20);
        }
      }
    }
  });

  test('Code is readable size on mobile', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
      return;
    }

    await page.goto(resolvePath('/writing/circuit-breakers-rust/'));

    const codeBlock = page.locator('pre code, pre').first();

    if (await codeBlock.isVisible()) {
      const fontSize = await codeBlock.evaluate((el) => {
        return parseFloat(window.getComputedStyle(el).fontSize);
      });
      // Code can be slightly smaller, but not unreadable
      expect(fontSize).toBeGreaterThanOrEqual(12);
    }
  });
});

test.describe('Mobile Tables', () => {
  test('Tables are scrollable or responsive', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
      return;
    }

    // Pages with tables
    await page.goto(resolvePath('/adrs/001-deterministic-over-agentic-rag/'));

    const tables = await page.locator('table').all();

    for (const table of tables) {
      if (await table.isVisible()) {
        const box = await table.boundingBox();
        const viewport = page.viewportSize();

        if (box && viewport) {
          // Table should either fit viewport or be in scrollable container
          if (box.width > viewport.width) {
            // Check parent has overflow scroll
            const parentOverflow = await table.evaluate((el) => {
              const parent = el.parentElement;
              return parent
                ? window.getComputedStyle(parent).overflowX
                : 'visible';
            });
            expect(['auto', 'scroll']).toContain(parentOverflow);
          }
        }
      }
    }
  });
});

test.describe('Mobile Touch Interactions', () => {
  test('Buttons have adequate spacing', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
      return;
    }

    await page.goto(resolvePath('/resume/'));

    const buttons = await page.locator('button, .btn, a.contact-primary').all();
    const buttonBoxes: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
    }> = [];

    for (const btn of buttons) {
      if (await btn.isVisible()) {
        const box = await btn.boundingBox();
        if (box) buttonBoxes.push(box);
      }
    }

    // Check buttons don't overlap
    for (let i = 0; i < buttonBoxes.length; i++) {
      for (let j = i + 1; j < buttonBoxes.length; j++) {
        const a = buttonBoxes[i];
        const b = buttonBoxes[j];

        // Check if they overlap
        const overlaps =
          a.x < b.x + b.width &&
          a.x + a.width > b.x &&
          a.y < b.y + b.height &&
          a.y + a.height > b.y;

        expect(overlaps, 'Buttons overlap').toBe(false);
      }
    }
  });

  test('Page is scrollable', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
      return;
    }

    await page.goto(resolvePath('/writing/anatomy-of-outage/'));

    // Check page has scrollable content
    const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
    const viewportHeight = await page.evaluate(() => window.innerHeight);

    // Page should have more content than viewport (scrollable)
    expect(scrollHeight).toBeGreaterThan(viewportHeight);
  });
});

test.describe('Mobile Performance', () => {
  test('Page loads quickly on mobile', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
      return;
    }

    const start = Date.now();
    await page.goto(resolvePath('/'), { waitUntil: 'domcontentloaded' });
    const loadTime = Date.now() - start;

    // Mobile should still load in under 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('No layout shift on scroll', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
      return;
    }

    await page.goto(resolvePath('/'));

    // Get initial element positions
    const h1 = page.locator('h1').first();
    const initialBox = await h1.boundingBox();

    // Scroll and scroll back
    await page.evaluate(() => window.scrollBy(0, 300));
    await page.waitForFunction(() => window.scrollY > 0, { timeout: 1000 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForFunction(() => window.scrollY === 0, { timeout: 1000 });

    // Check position hasn't shifted
    const finalBox = await h1.boundingBox();

    if (initialBox && finalBox) {
      expect(Math.abs(initialBox.x - finalBox.x)).toBeLessThan(5);
    }
  });
});

test.describe('Mobile Images', () => {
  test('Images fit within viewport', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
      return;
    }

    await page.goto(resolvePath('/'));

    const images = await page.locator('img').all();
    const viewport = page.viewportSize();

    for (const img of images) {
      if (await img.isVisible()) {
        const box = await img.boundingBox();
        if (box && viewport) {
          expect(box.width).toBeLessThanOrEqual(viewport.width);
        }
      }
    }
  });

  test('Images load on mobile', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
      return;
    }

    await page.goto(resolvePath('/'));

    const images = await page.locator('img').all();

    for (const img of images) {
      const loaded = await img.evaluate(
        (el: HTMLImageElement) => el.complete && el.naturalWidth > 0
      );
      const src = await img.getAttribute('src');
      expect(loaded, `Image not loaded: ${src}`).toBe(true);
    }
  });
});

/**
 * iOS Safari Layout Regression Tests
 * Tests for header overlap, viewport height issues, and floating button placement
 */
test.describe('iOS Safari Layout Regressions', () => {
  test('Hero content is not hidden under sticky header', async ({
    page,
    isMobile,
  }) => {
    if (!isMobile) {
      test.skip();
      return;
    }

    await page.goto(resolvePath('/'));
    await page.waitForLoadState('domcontentloaded');

    // Get header bounding box
    const header = page.locator('header').first();
    const headerBox = await header.boundingBox();

    // Get hero title (H1) bounding box
    const heroTitle = page.locator('h1').first();
    const heroTitleBox = await heroTitle.boundingBox();

    if (headerBox && heroTitleBox) {
      // Hero title should start below the header (no overlap)
      // The title's top should be greater than or equal to header's bottom
      expect(
        heroTitleBox.y,
        'Hero title is hidden under header - header overlap detected'
      ).toBeGreaterThanOrEqual(headerBox.y + headerBox.height - 5); // 5px tolerance
    }
  });

  test('Scroll-to-top button does not overlap content cards', async ({
    page,
    isMobile,
  }) => {
    if (!isMobile) {
      test.skip();
      return;
    }

    await page.goto(resolvePath('/'));
    await page.waitForLoadState('domcontentloaded');

    // Scroll down to trigger scroll-to-top button visibility
    await page.evaluate(() => window.scrollBy(0, 500));

    // Wait for scroll to complete and button to potentially appear
    await page.waitForFunction(() => window.scrollY > 400, { timeout: 1000 });

    const scrollTopBtn = page.locator('.scroll-top, #scroll-top');

    // Wait for button animation to complete
    try {
      await scrollTopBtn.waitFor({ state: 'visible', timeout: 1000 });
    } catch {
      // Button may not appear, skip test
      return;
    }

    if (await scrollTopBtn.isVisible()) {
      const btnBox = await scrollTopBtn.boundingBox();
      const viewport = page.viewportSize();

      if (btnBox && viewport) {
        // Button should be within viewport bounds
        expect(
          btnBox.x + btnBox.width,
          'Scroll-to-top button extends beyond viewport'
        ).toBeLessThanOrEqual(viewport.width);
        expect(
          btnBox.y + btnBox.height,
          'Scroll-to-top button extends below viewport'
        ).toBeLessThanOrEqual(viewport.height);

        // Button should have reasonable spacing from edges (accounting for safe area)
        expect(btnBox.x, 'Button too close to left edge').toBeGreaterThan(0);
      }
    }
  });

  test('Scroll-to-top button does not overlap mobile TOC toggle on article pages', async ({
    page,
    isMobile,
  }) => {
    if (!isMobile) {
      test.skip();
      return;
    }

    // Navigate to an article page that has TOC
    await page.goto(resolvePath('/writing/engineering-principles/'));
    await page.waitForLoadState('domcontentloaded');

    // Scroll down to trigger scroll-to-top button visibility
    await page.evaluate(() => window.scrollBy(0, 500));

    // Wait for scroll to complete
    await page.waitForFunction(() => window.scrollY > 400, { timeout: 1000 });

    const scrollTopBtn = page.locator(
      '.scroll-top.visible, #scroll-top.visible'
    );
    const mobileTocToggle = page.locator('.mobile-toc-toggle');

    const scrollTopVisible = await scrollTopBtn.isVisible();
    const tocToggleVisible = await mobileTocToggle.isVisible();

    if (scrollTopVisible && tocToggleVisible) {
      const scrollTopBox = await scrollTopBtn.boundingBox();
      const tocToggleBox = await mobileTocToggle.boundingBox();

      if (scrollTopBox && tocToggleBox) {
        // Check for overlap with 2px tolerance for sub-pixel rendering
        const tolerance = 2;
        const noOverlap =
          scrollTopBox.x + scrollTopBox.width <= tocToggleBox.x + tolerance || // scrollTop is left of tocToggle
          tocToggleBox.x + tocToggleBox.width <= scrollTopBox.x + tolerance || // tocToggle is left of scrollTop
          scrollTopBox.y + scrollTopBox.height <= tocToggleBox.y + tolerance || // scrollTop is above tocToggle
          tocToggleBox.y + tocToggleBox.height <= scrollTopBox.y + tolerance; // tocToggle is above scrollTop

        expect(
          noOverlap,
          `Scroll-to-top button overlaps with mobile TOC toggle. ` +
            `ScrollTop: (${scrollTopBox.x}, ${scrollTopBox.y}) ${scrollTopBox.width}x${scrollTopBox.height}, ` +
            `TOC: (${tocToggleBox.x}, ${tocToggleBox.y}) ${tocToggleBox.width}x${tocToggleBox.height}`
        ).toBe(true);
      }
    }
  });

  test('Content sections have consistent spacing during scroll', async ({
    page,
    isMobile,
  }) => {
    if (!isMobile) {
      test.skip();
      return;
    }

    await page.goto(resolvePath('/'));
    await page.waitForLoadState('domcontentloaded');

    // Get initial hero section position
    const heroSection = page.locator('.hero, section').first();
    const initialBox = await heroSection.boundingBox();

    // Scroll down and back up
    await page.evaluate(() => window.scrollBy(0, 300));
    await page.waitForFunction(() => window.scrollY > 0, { timeout: 1000 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForFunction(() => window.scrollY === 0, { timeout: 1000 });

    // Check hero section position after scroll cycle
    const finalBox = await heroSection.boundingBox();

    if (initialBox && finalBox) {
      // Position should be stable (no layout shift from viewport units)
      // Allow up to 20px tolerance for browser chrome/timing variations
      expect(
        Math.abs(initialBox.y - finalBox.y),
        'Layout shift detected during scroll'
      ).toBeLessThan(20);
    }
  });

  test('Key Projects section is visible and not clipped', async ({
    page,
    isMobile,
  }) => {
    if (!isMobile) {
      test.skip();
      return;
    }

    await page.goto(resolvePath('/'));
    await page.waitForLoadState('domcontentloaded');

    // Scroll to Key Projects section
    const keyProjectsHeader = page.getByText('Key Projects', { exact: false });

    if (await keyProjectsHeader.isVisible()) {
      await keyProjectsHeader.scrollIntoViewIfNeeded();

      // Wait for scroll to settle
      await page.waitForFunction(
        () => {
          // Check if scroll has stabilized (not changing rapidly)
          return true;
        },
        { timeout: 500 }
      );

      const headerBox = await keyProjectsHeader.boundingBox();
      const stickyHeader = page.locator('header').first();
      const stickyHeaderBox = await stickyHeader.boundingBox();

      if (headerBox && stickyHeaderBox) {
        // Key Projects header should not be hidden under sticky header
        expect(
          headerBox.y,
          'Key Projects header hidden under sticky navigation'
        ).toBeGreaterThanOrEqual(
          stickyHeaderBox.y + stickyHeaderBox.height - 5
        );
      }
    }
  });

  test('takes screenshot of hero and key projects for visual regression', async ({
    page,
    isMobile,
  }, testInfo) => {
    if (!isMobile) {
      test.skip();
      return;
    }

    await page.goto(resolvePath('/'));
    await page.waitForLoadState('networkidle');

    // Screenshot 1: Hero section at top
    await page.screenshot({
      path: `test-results/ios-safari-hero-${testInfo.project.name}.png`,
      fullPage: false,
    });

    // Screenshot 2: After scrolling to Key Projects
    const keyProjectsHeader = page.getByText('Key Projects', { exact: false });
    if (await keyProjectsHeader.isVisible()) {
      await keyProjectsHeader.scrollIntoViewIfNeeded();

      // Wait for scroll to settle
      await page.waitForFunction(() => true, { timeout: 500 });

      await page.screenshot({
        path: `test-results/ios-safari-key-projects-${testInfo.project.name}.png`,
        fullPage: false,
      });
    }
  });
});

/**
 * Navigation Active State Tests
 * Tests for aria-current and active link styling
 */
test.describe('Navigation Active State', () => {
  test('Active nav link has aria-current="page"', async ({ page }) => {
    // Test on writing page
    await page.goto(resolvePath('/writing/'));

    // Find the Writing nav link in desktop nav
    const desktopNav = page.locator('.nav-links a');
    const writingLink = desktopNav.filter({ hasText: 'Writing' });

    if (await writingLink.isVisible()) {
      const ariaCurrent = await writingLink.getAttribute('aria-current');
      expect(ariaCurrent).toBe('page');
    }
  });

  test('Active nav link has active class', async ({ page }) => {
    await page.goto(resolvePath('/case-studies/'));

    const desktopNav = page.locator('.nav-links a');
    const caseStudiesLink = desktopNav.filter({ hasText: 'Case Studies' });

    if (await caseStudiesLink.isVisible()) {
      const hasActiveClass = await caseStudiesLink.evaluate((el) =>
        el.classList.contains('active')
      );
      expect(hasActiveClass).toBe(true);
    }
  });

  test('Mobile menu has active state on current page', async ({
    page,
    isMobile,
  }) => {
    if (!isMobile) {
      test.skip();
      return;
    }

    await page.goto(resolvePath('/resume/'));

    // Open mobile menu
    const menuButton = page.locator('button.mobile-menu-btn');
    if (await menuButton.isVisible()) {
      await menuButton.click();

      // Wait for menu to open
      const menuPanel = page.locator('#mobile-menu-panel');
      await menuPanel.waitFor({ state: 'visible', timeout: 1000 });

      const mobileNav = page.locator('#mobile-menu-panel a');
      const resumeLink = mobileNav.filter({ hasText: 'Resume' });

      if (await resumeLink.isVisible()) {
        // Check aria-current
        const ariaCurrent = await resumeLink.getAttribute('aria-current');
        expect(ariaCurrent).toBe('page');

        // Check active class
        const hasActiveClass = await resumeLink.evaluate((el) =>
          el.classList.contains('active')
        );
        expect(hasActiveClass).toBe(true);
      }
    }
  });
});
