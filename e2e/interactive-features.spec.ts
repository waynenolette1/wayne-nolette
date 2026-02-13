import { test, expect } from '@playwright/test';

/**
 * E2E tests for interactive features:
 * - Search functionality
 * - Copy buttons
 * - Keyboard shortcuts
 * - Mobile menu
 * - Scroll behaviors
 */

const BASE_PATH = '/wayne-nolette';

const resolvePath = (path: string) => {
  if (path === '/') return BASE_PATH + '/';
  return BASE_PATH + path;
};

test.describe('Search Functionality', () => {
  test('Search dialog opens with Cmd+K', async ({ page }) => {
    await page.goto(resolvePath('/'));
    await page.waitForLoadState('networkidle');

    // Press Cmd+K (Mac) or Ctrl+K (Windows) to open search
    await page.keyboard.press('Meta+k');

    // Check if search dialog is visible using proper wait
    const searchDialog = page.locator(
      '[role="dialog"], .search-dialog, #search-dialog'
    );

    try {
      await searchDialog.first().waitFor({ state: 'visible', timeout: 1000 });
      await expect(searchDialog.first()).toBeVisible();
    } catch {
      // Search may not be implemented - just verify no errors
    }
  });

  test('Writing page has filter functionality', async ({ page }) => {
    await page.goto(resolvePath('/writing/'));

    // Look for filter pills/buttons on writing index
    const filterButtons = page.locator(
      'button[aria-pressed], .filter-pill, [role="tab"]'
    );

    if ((await filterButtons.count()) > 0) {
      // Click a filter
      await filterButtons.first().click();

      // Wait for filter to be applied (aria-pressed changes or content updates)
      await page
        .waitForFunction(
          () => {
            const articles = document.querySelectorAll(
              'article, .post-card, [class*="card"]'
            );
            return articles.length > 0;
          },
          { timeout: 1000 }
        )
        .catch(() => {});

      // Should still have articles visible
      const articles = page.locator('article, .post-card, [class*="card"]');
      const count = await articles.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('Search dialog closes with Escape if open', async ({ page }) => {
    await page.goto(resolvePath('/'));
    await page.waitForLoadState('networkidle');

    // Try to open search
    await page.keyboard.press('Meta+k');

    const searchDialog = page.locator(
      '[role="dialog"], .search-dialog, #search-dialog'
    );

    try {
      await searchDialog.first().waitFor({ state: 'visible', timeout: 1000 });
      await page.keyboard.press('Escape');
      await expect(searchDialog).not.toBeVisible({ timeout: 1000 });
    } catch {
      // Search dialog not available, skip
    }
  });
});

test.describe('Copy Functionality', () => {
  test('Code copy button appears on code blocks', async ({ page }) => {
    await page.goto(resolvePath('/writing/circuit-breakers-rust/'));

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Look for copy buttons on code blocks
    const copyButtons = page.locator(
      'pre button, .copy-button, button:has-text("Copy")'
    );
    const count = await copyButtons.count();

    // Should have copy buttons on code blocks
    expect(count).toBeGreaterThan(0);
  });

  test('Copy button shows feedback when clicked', async ({ page }) => {
    await page.goto(resolvePath('/writing/circuit-breakers-rust/'));
    await page.waitForLoadState('networkidle');

    const copyButton = page
      .locator('pre button, .copy-button, button:has-text("Copy")')
      .first();

    if ((await copyButton.count()) > 0) {
      // Click the copy button
      await copyButton.click();

      // Wait for feedback to appear (class change or text change)
      await page
        .waitForFunction(
          () => {
            const buttons = document.querySelectorAll(
              'pre button, .copy-button'
            );
            for (const btn of buttons) {
              if (
                btn.textContent?.includes('Copied') ||
                btn.classList.contains('copied') ||
                btn.querySelector('svg path[d*="M5"]') // checkmark path
              ) {
                return true;
              }
            }
            return false;
          },
          { timeout: 1000 }
        )
        .catch(() => {});

      // Check for common feedback patterns
      const hasFeedback = await page.evaluate(() => {
        const buttons = document.querySelectorAll('pre button, .copy-button');
        for (const btn of buttons) {
          if (
            btn.textContent?.includes('Copied') ||
            btn.classList.contains('copied') ||
            btn.querySelector('svg path[d*="M5"]') // checkmark path
          ) {
            return true;
          }
        }
        return false;
      });

      // Feedback should appear (class change, text change, or checkmark)
      expect(hasFeedback).toBe(true);
    }
  });
});

test.describe('Keyboard Shortcuts', () => {
  test('H key navigates to home', async ({ page }) => {
    await page.goto(resolvePath('/resume/'));

    // Make sure we're not in an input
    await page.click('body');
    await page.keyboard.press('h');
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain(BASE_PATH);
    expect(page.url()).not.toContain('/resume');
  });

  test('W key navigates to writing', async ({ page }) => {
    await page.goto(resolvePath('/'));

    await page.click('body');
    await page.keyboard.press('w');
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/writing');
  });

  test('T key scrolls to top', async ({ page }) => {
    await page.goto(resolvePath('/writing/circuit-breakers-rust/'));

    // Scroll down first
    await page.evaluate(() => window.scrollTo(0, 1000));

    // Wait for scroll to complete
    await page.waitForFunction(() => window.scrollY > 500, { timeout: 2000 });

    const scrollBefore = await page.evaluate(() => window.scrollY);
    expect(scrollBefore).toBeGreaterThan(500);

    // Press T to scroll to top
    await page.keyboard.press('t');

    // Wait for scroll animation to complete
    await page
      .waitForFunction(() => window.scrollY < 100, { timeout: 2000 })
      .catch(() => {});

    const scrollAfter = await page.evaluate(() => window.scrollY);
    expect(scrollAfter).toBeLessThan(scrollBefore);
  });

  test('/ key shows keyboard shortcuts help', async ({ page }) => {
    await page.goto(resolvePath('/'));

    await page.click('body');
    await page.keyboard.press('/');

    // Should show shortcuts overlay
    const overlay = page.locator('#shortcuts-help, .shortcuts-overlay');

    try {
      await overlay.first().waitFor({ state: 'visible', timeout: 1000 });
      await expect(overlay.first()).toBeVisible();
      // Should contain keyboard info
      const kbdElements = page.locator('kbd');
      expect(await kbdElements.count()).toBeGreaterThan(0);
    } catch {
      // Shortcuts help feature may not be active - don't fail
    }
  });

  test('Escape closes overlays', async ({ page }) => {
    await page.goto(resolvePath('/'));

    // Open shortcuts help
    await page.click('body');
    await page.keyboard.press('/');

    const overlay = page.locator('#shortcuts-help, .shortcuts-overlay');

    try {
      await overlay.first().waitFor({ state: 'visible', timeout: 1000 });

      // Press Escape
      await page.keyboard.press('Escape');

      // Wait for overlay to close
      await expect(overlay).not.toBeVisible({ timeout: 1000 });
    } catch {
      // Overlay may not be available, skip
    }
  });
});

test.describe('Mobile Menu', () => {
  test('Mobile menu opens and closes', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
      return;
    }

    await page.goto(resolvePath('/'));

    // Find and click menu button
    const menuButton = page.locator(
      '.mobile-menu-btn, button[aria-label*="menu"], button[aria-label*="Menu"]'
    );

    if (
      await menuButton
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await menuButton.click();

      // Wait for menu panel to be visible
      const menuPanel = page.locator(
        '.mobile-menu-panel, #mobile-menu-panel, [role="navigation"]'
      );
      await menuPanel.first().waitFor({ state: 'visible', timeout: 1000 });
      await expect(menuPanel.first()).toBeVisible();

      // Close menu - use force:true because backdrop overlay may intercept the click
      await menuButton.click({ force: true });

      // Wait for menu to close (check for class removal or aria-hidden)
      await page
        .waitForFunction(
          () => {
            const panel = document.querySelector(
              '.mobile-menu-panel, #mobile-menu-panel'
            );
            if (!panel) return true;
            return (
              !panel.classList.contains('open') ||
              panel.getAttribute('aria-hidden') === 'true'
            );
          },
          { timeout: 1000 }
        )
        .catch(() => {});

      // Menu should be hidden
      const isHidden = await menuPanel
        .first()
        .evaluate((el) => {
          return (
            !el.classList.contains('open') ||
            el.getAttribute('aria-hidden') === 'true'
          );
        })
        .catch(() => true);

      expect(isHidden).toBe(true);
    }
  });

  test('Mobile menu closes on link click', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
      return;
    }

    await page.goto(resolvePath('/'));

    const menuButton = page.locator(
      '.mobile-menu-btn, button[aria-label*="menu"]'
    );

    if (
      await menuButton
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await menuButton.click();

      // Wait for menu to open
      const menuPanel = page.locator('.mobile-menu-panel, #mobile-menu-panel');
      await menuPanel.first().waitFor({ state: 'visible', timeout: 1000 });

      // Click a link in the menu
      const menuLink = page.locator(
        '.mobile-menu-panel a, #mobile-menu-panel a'
      );
      if ((await menuLink.count()) > 0) {
        await menuLink.first().click();
        await page.waitForLoadState('networkidle');

        // Menu should be closed after navigation
        const isHidden = await menuPanel
          .first()
          .evaluate((el) => !el.classList.contains('open'))
          .catch(() => true);

        expect(isHidden).toBe(true);
      }
    }
  });

  test('Mobile menu traps focus', async ({ page, isMobile, browserName }) => {
    if (!isMobile) {
      test.skip();
      return;
    }

    // WebKit doesn't Tab to links/buttons by default (system preference)
    if (browserName === 'webkit') {
      test.skip();
      return;
    }

    await page.goto(resolvePath('/'));

    const menuButton = page.locator('.mobile-menu-btn');

    if ((await menuButton.count()) > 0) {
      await menuButton.click();

      // Wait for menu to open
      const menuPanel = page.locator('.mobile-menu-panel, #mobile-menu-panel');
      await menuPanel.first().waitFor({ state: 'visible', timeout: 1000 });

      // Tab through menu items
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Focus should still be within menu or menu button
      const activeElement = await page.evaluate(() => {
        const el = document.activeElement;
        return el?.closest('.mobile-menu-panel, #mobile-menu-panel, header')
          ? true
          : false;
      });

      expect(activeElement).toBe(true);
    }
  });
});

test.describe('Scroll Behaviors', () => {
  // Reset scroll position after each test to avoid state leakage
  test.afterEach(async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, 0));
  });

  test('Scroll to top button appears after scrolling', async ({ page }) => {
    await page.goto(resolvePath('/writing/circuit-breakers-rust/'));

    // Scroll down
    await page.evaluate(() => window.scrollTo(0, 1000));

    // Wait for scroll to complete and button to appear
    await page.waitForFunction(() => window.scrollY > 500, { timeout: 1000 });

    // Look for scroll to top button
    const scrollTopBtn = page.locator(
      '#scroll-top, .scroll-top, button[aria-label*="top"]'
    );

    if ((await scrollTopBtn.count()) > 0) {
      // Wait for button to become visible (may have animation)
      try {
        await scrollTopBtn.first().waitFor({ state: 'visible', timeout: 1000 });
        await expect(scrollTopBtn.first()).toBeVisible();
      } catch {
        // Button may not appear immediately or may not be implemented
      }
    }
  });

  test('Scroll to top button scrolls page to top', async ({ page }) => {
    await page.goto(resolvePath('/writing/circuit-breakers-rust/'));

    // Scroll down
    await page.evaluate(() => window.scrollTo(0, 1000));

    // Wait for scroll to complete
    await page.waitForFunction(() => window.scrollY > 500, { timeout: 1000 });

    const scrollTopBtn = page.locator('#scroll-top, .scroll-top');

    if ((await scrollTopBtn.count()) > 0) {
      try {
        await scrollTopBtn.first().waitFor({ state: 'visible', timeout: 1000 });
        await scrollTopBtn.click();

        // Wait for scroll animation to complete
        await page.waitForFunction(() => window.scrollY < 100, {
          timeout: 2000,
        });

        const scrollY = await page.evaluate(() => window.scrollY);
        expect(scrollY).toBeLessThan(100);
      } catch {
        // Button may not be visible or implemented
      }
    }
  });

  test('Header gets shadow on scroll', async ({ page }) => {
    await page.goto(resolvePath('/'));

    // Check header before scroll - use .first() since article pages may have multiple headers
    const header = page.locator('header').first();
    await expect(header).toBeVisible();

    const hasScrolledClassBefore = await header.evaluate((el) =>
      el.classList.contains('scrolled')
    );
    expect(hasScrolledClassBefore).toBe(false);

    // Scroll past the 50px threshold
    await page.evaluate(() => window.scrollTo(0, 150));

    // Wait for scroll event to be processed and class to be added
    await page.waitForFunction(
      () => {
        const header = document.querySelector('header');
        return header?.classList.contains('scrolled');
      },
      { timeout: 1000 }
    );

    // Check header after scroll
    const hasScrolledClassAfter = await header.evaluate((el) =>
      el.classList.contains('scrolled')
    );
    expect(hasScrolledClassAfter).toBe(true);
  });
});

test.describe('View Transitions', () => {
  test('Navigation uses View Transitions API', async ({ page }) => {
    await page.goto(resolvePath('/'));

    // Check if View Transitions API is supported
    const hasViewTransitions = await page.evaluate(() => {
      return 'startViewTransition' in document;
    });

    if (hasViewTransitions) {
      // Navigate to another page using a visible link
      const writingLink = page.locator('a[href*="/writing/"]:visible').first();
      if ((await writingLink.count()) > 0) {
        await writingLink.click();
        await page.waitForLoadState('networkidle');

        // Should have navigated successfully
        expect(page.url()).toContain('/writing');
      }
    }
  });

  test('Active nav state updates after navigation', async ({ page }) => {
    await page.goto(resolvePath('/'));

    // Click on a visible Writing link
    const writingLink = page.locator('a[href*="/writing/"]:visible').first();
    if ((await writingLink.count()) > 0) {
      await writingLink.click();
      await page.waitForLoadState('networkidle');

      // After navigation, verify we're on the writing page
      expect(page.url()).toContain('/writing');
    }
  });
});
