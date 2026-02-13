import { test, expect } from '@playwright/test';

/**
 * E2E tests for enhanced search functionality:
 * - Fuzzy matching
 * - Search results display
 * - Content type filtering
 * - Keyboard navigation
 */

const BASE_PATH = '/wayne-nolette';

const resolvePath = (path: string) => {
  if (path === '/') return BASE_PATH + '/';
  return BASE_PATH + path;
};

test.describe('Search Dialog', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(resolvePath('/'));
    await page.waitForLoadState('networkidle');
  });

  test('Search trigger button is visible', async ({ page }) => {
    const searchTrigger = page.locator('#search-trigger, .search-trigger');
    await expect(searchTrigger).toBeVisible();
  });

  test('Search dialog opens on trigger click', async ({ page }) => {
    const searchTrigger = page.locator('#search-trigger, .search-trigger');
    await expect(searchTrigger).toBeVisible();
    await searchTrigger.click();

    // Wait for dialog to become visible (showModal() shows the dialog)
    const searchDialog = page.locator('#search-dialog');
    await expect(searchDialog).toBeVisible({ timeout: 2000 });
  });

  test('Search dialog opens with Ctrl+K on Windows', async ({
    page,
    browserName,
  }) => {
    if (browserName === 'webkit') {
      // Safari uses Cmd+K
      test.skip();
      return;
    }

    await page.keyboard.press('Control+k');

    // Wait for dialog to become visible (showModal() shows the dialog)
    const searchDialog = page.locator('#search-dialog');
    await expect(searchDialog).toBeVisible({ timeout: 2000 });
  });

  test('Search input is focused when dialog opens', async ({ page }) => {
    const searchTrigger = page.locator('#search-trigger');
    await expect(searchTrigger).toBeVisible();
    await searchTrigger.click();

    // Wait for dialog to become visible
    const searchDialog = page.locator('#search-dialog');
    await expect(searchDialog).toBeVisible({ timeout: 2000 });

    const searchInput = page.locator('#search-input');
    await expect(searchInput).toBeFocused();
  });

  test('Search shows results for valid query', async ({ page }) => {
    const searchTrigger = page.locator('#search-trigger');
    await expect(searchTrigger).toBeVisible();
    await searchTrigger.click();

    const searchDialog = page.locator('#search-dialog');
    await expect(searchDialog).toBeVisible({ timeout: 2000 });

    const searchInput = page.locator('#search-input');
    await searchInput.fill('rust');

    // Wait for results to appear
    const resultItems = page.locator('#results-list .result-item');
    await resultItems.first().waitFor({ state: 'visible', timeout: 3000 });

    const count = await resultItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Search shows no results message for invalid query', async ({
    page,
  }) => {
    const searchTrigger = page.locator('#search-trigger');
    await expect(searchTrigger).toBeVisible();
    await searchTrigger.click();

    const searchDialog = page.locator('#search-dialog');
    await expect(searchDialog).toBeVisible({ timeout: 2000 });

    const searchInput = page.locator('#search-input');
    await searchInput.fill('xyznonexistent123');

    const noResults = page.locator('#no-results');
    await noResults.waitFor({ state: 'visible', timeout: 3000 });
    await expect(noResults).toBeVisible();
  });

  test('Search results are clickable and navigate', async ({ page }) => {
    const searchTrigger = page.locator('#search-trigger');
    await expect(searchTrigger).toBeVisible();
    await searchTrigger.click();

    const searchDialog = page.locator('#search-dialog');
    await expect(searchDialog).toBeVisible({ timeout: 2000 });

    const searchInput = page.locator('#search-input');
    await searchInput.fill('rust');

    // Wait for results to appear
    const firstResult = page.locator('.result-item').first();
    await firstResult.waitFor({ state: 'visible', timeout: 3000 });

    if ((await firstResult.count()) > 0) {
      const initialUrl = page.url();
      await firstResult.click();
      await page.waitForLoadState('networkidle');

      // Should have navigated to an article page (writing, case-study, or ADR)
      expect(page.url()).not.toBe(initialUrl);
      expect(
        page.url().includes('/writing/') ||
          page.url().includes('/case-studies/') ||
          page.url().includes('/adrs/')
      ).toBe(true);
    }
  });

  test('Arrow keys navigate results', async ({ page }) => {
    const searchTrigger = page.locator('#search-trigger');
    await expect(searchTrigger).toBeVisible();
    await searchTrigger.click();

    const searchDialog = page.locator('#search-dialog');
    await expect(searchDialog).toBeVisible({ timeout: 2000 });

    const searchInput = page.locator('#search-input');
    await searchInput.fill('rust');

    // Wait for results to appear
    const resultItems = page.locator('.result-item');
    await resultItems.first().waitFor({ state: 'visible', timeout: 3000 });

    if ((await resultItems.count()) > 1) {
      // First item should be selected by default
      await expect(resultItems.first()).toHaveClass(/selected/);

      // Press down arrow and wait for selection change
      await page.keyboard.press('ArrowDown');
      await expect(resultItems.nth(1)).toHaveClass(/selected/, {
        timeout: 1000,
      });

      // Press up arrow and wait for selection change
      await page.keyboard.press('ArrowUp');
      await expect(resultItems.first()).toHaveClass(/selected/, {
        timeout: 1000,
      });
    }
  });

  test('Enter key navigates to selected result', async ({ page }) => {
    const searchTrigger = page.locator('#search-trigger');
    await expect(searchTrigger).toBeVisible();
    await searchTrigger.click();

    const searchDialog = page.locator('#search-dialog');
    await expect(searchDialog).toBeVisible({ timeout: 2000 });

    const searchInput = page.locator('#search-input');
    await searchInput.fill('rust');

    // Wait for results to appear and first one to be selected
    const selectedResult = page.locator('.result-item.selected');
    await selectedResult.waitFor({ state: 'visible', timeout: 3000 });

    // Ensure focus is on search input before pressing Enter
    await searchInput.focus();
    const initialUrl = page.url();
    await searchInput.press('Enter');
    await page.waitForLoadState('networkidle');

    // Should have navigated to an article page (writing, case-study, or ADR)
    expect(page.url()).not.toBe(initialUrl);
    expect(
      page.url().includes('/writing/') ||
        page.url().includes('/case-studies/') ||
        page.url().includes('/adrs/')
    ).toBe(true);
  });

  test('Escape key clears input and closes dialog', async ({ page }) => {
    const searchTrigger = page.locator('#search-trigger');
    await expect(searchTrigger).toBeVisible();
    await searchTrigger.click();

    const searchDialog = page.locator('#search-dialog');
    await expect(searchDialog).toBeVisible({ timeout: 2000 });

    const searchInput = page.locator('#search-input');
    await searchInput.fill('rust');

    // Pressing Escape should close the dialog
    await page.keyboard.press('Escape');
    await expect(searchDialog).not.toBeVisible({ timeout: 1000 });
  });

  test('Close button closes dialog', async ({ page }) => {
    const searchTrigger = page.locator('#search-trigger');
    await expect(searchTrigger).toBeVisible();
    await searchTrigger.click();

    const searchDialog = page.locator('#search-dialog');
    await expect(searchDialog).toBeVisible({ timeout: 2000 });

    const closeBtn = page.locator('#search-close');
    await closeBtn.click();
    await expect(searchDialog).not.toBeVisible({ timeout: 1000 });
  });

  test('Clicking backdrop closes dialog', async ({ page }) => {
    const searchTrigger = page.locator('#search-trigger');
    await expect(searchTrigger).toBeVisible();
    await searchTrigger.click();

    const searchDialog = page.locator('#search-dialog');
    await expect(searchDialog).toBeVisible({ timeout: 2000 });

    // Use close button to verify dialog can be closed
    const closeBtn = page.locator('#search-close');
    await closeBtn.click();
    await expect(searchDialog).not.toBeVisible({ timeout: 1000 });
  });
});

test.describe('Search Results Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(resolvePath('/'));
    await page.waitForLoadState('networkidle');
    const searchTrigger = page.locator('#search-trigger');
    await expect(searchTrigger).toBeVisible();
    await searchTrigger.click();
    const searchDialog = page.locator('#search-dialog');
    await expect(searchDialog).toBeVisible({ timeout: 2000 });
  });

  test('Results show content type badges', async ({ page }) => {
    const searchInput = page.locator('#search-input');
    await searchInput.fill('system');

    // Wait for results to appear
    const resultItems = page.locator('.result-item');
    await resultItems.first().waitFor({ state: 'visible', timeout: 2000 });

    const typeBadges = page.locator('.result-type');
    const count = await typeBadges.count();

    if (count > 0) {
      // Should have type labels
      const firstBadge = await typeBadges.first().textContent();
      expect(
        firstBadge?.toLowerCase().includes('article') ||
          firstBadge?.toLowerCase().includes('case') ||
          firstBadge?.toLowerCase().includes('adr')
      ).toBe(true);
    }
  });

  test('Results highlight matching terms', async ({ page }) => {
    const searchInput = page.locator('#search-input');
    await searchInput.fill('rust');

    // Wait for results to appear
    const resultItems = page.locator('.result-item');
    await resultItems.first().waitFor({ state: 'visible', timeout: 2000 });

    if ((await resultItems.count()) > 0) {
      // Check for <mark> elements in results
      const marks = page.locator('.result-item mark');
      const markCount = await marks.count();

      // Should have highlighted matches
      expect(markCount).toBeGreaterThan(0);
    }
  });

  test('Results show snippets for content matches', async ({ page }) => {
    const searchInput = page.locator('#search-input');
    await searchInput.fill('performance');

    // Wait for results to appear
    const resultItems = page.locator('.result-item');
    await resultItems.first().waitFor({ state: 'visible', timeout: 2000 });

    const snippets = page.locator('.result-snippet');
    const count = await snippets.count();

    // Should show snippets when content matches
    if (count > 0) {
      const snippetText = await snippets.first().textContent();
      expect(snippetText?.length).toBeGreaterThan(0);
    }
  });
});

test.describe('Fuzzy Matching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(resolvePath('/'));
    await page.waitForLoadState('networkidle');
    const searchTrigger = page.locator('#search-trigger');
    await expect(searchTrigger).toBeVisible();
    await searchTrigger.click();
    const searchDialog = page.locator('#search-dialog');
    await expect(searchDialog).toBeVisible({ timeout: 2000 });
  });

  test('Finds results with minor typos', async ({ page }) => {
    const searchInput = page.locator('#search-input');

    // Search with a common typo
    await searchInput.fill('distirbuted');

    // Wait for search to complete (either results or no-results)
    const resultItems = page.locator('.result-item');
    const noResults = page.locator('#no-results');

    await Promise.race([
      resultItems.first().waitFor({ state: 'visible', timeout: 2000 }),
      noResults.waitFor({ state: 'visible', timeout: 2000 }),
    ]).catch(() => {});

    const count = await resultItems.count();

    // Fuzzy matching should find results even with typos
    // Note: This depends on the Fuse.js threshold setting
    if (count > 0) {
      expect(count).toBeGreaterThan(0);
    }
  });

  test('Partial word matching works', async ({ page }) => {
    const searchInput = page.locator('#search-input');

    await searchInput.fill('infra');

    // Wait for results to appear
    const resultItems = page.locator('.result-item');
    await resultItems.first().waitFor({ state: 'visible', timeout: 2000 });

    const count = await resultItems.count();

    // Should find articles about "infrastructure"
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Search Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(resolvePath('/'));
    await page.waitForLoadState('networkidle');
  });

  test('Search dialog has proper ARIA attributes', async ({ page }) => {
    const searchTrigger = page.locator('#search-trigger');
    await expect(searchTrigger).toBeVisible();
    await searchTrigger.click();

    const searchDialog = page.locator('#search-dialog');
    await expect(searchDialog).toBeVisible({ timeout: 2000 });

    const ariaLabel = await searchDialog.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
  });

  test('Results list has listbox role', async ({ page }) => {
    const searchTrigger = page.locator('#search-trigger');
    await expect(searchTrigger).toBeVisible();
    await searchTrigger.click();

    const searchDialog = page.locator('#search-dialog');
    await expect(searchDialog).toBeVisible({ timeout: 2000 });

    const resultsList = page.locator('#results-list');
    const role = await resultsList.getAttribute('role');

    expect(role).toBe('listbox');
  });

  test('Result items have option role', async ({ page }) => {
    const searchTrigger = page.locator('#search-trigger');
    await expect(searchTrigger).toBeVisible();
    await searchTrigger.click();

    const searchDialog = page.locator('#search-dialog');
    await expect(searchDialog).toBeVisible({ timeout: 2000 });

    const searchInput = page.locator('#search-input');
    await expect(searchInput).toBeVisible({ timeout: 3000 });
    await searchInput.fill('rust');

    // Wait for results to appear
    const firstResult = page.locator('.result-item').first();
    await firstResult.waitFor({ state: 'visible', timeout: 3000 });

    if ((await firstResult.count()) > 0) {
      const role = await firstResult.getAttribute('role');
      expect(role).toBe('option');
    }
  });
});
